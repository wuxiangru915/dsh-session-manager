# dsh-session-manager

面向 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的会话管理插件。

[English](README.md) · [MIT License](LICENSE)

`dsh-session-manager` 给 DSH Web 界面补上完整的会话管理能力：查看**全部**会话与**已归档**会话、把归档会话**恢复**回原工作区、归档任意会话、两步确认**删除**会话、以及**会话内容预览**——全部在设置页完成，**不改任何官方包**。

## 解决什么问题

DSH 的「归档会话」是单向操作：侧边栏右键归档后，会话从所有视图（工作区分组、未分组、搜索、扁平列表）消失，官方既没有查看归档的入口，也没有恢复的 API——不手动改 `~/.dsh/storages/workspace.json` 的话，归档的会话就等于丢了。本插件把归档变成可逆、可管理的状态，并补上磁盘上所有会话的总览：

```
侧边栏右键 -> 归档（DSH 原生）
  -> 会话从侧边栏消失（再也看不到）
  -> 本插件：设置 -> 会话管理 -> 归档页签
       预览会话内容、恢复（回到原工作区原位置）、
       或从硬盘删除（两步确认）
  -> 「全部会话」页签列出持久化层能读到的每个会话
     （按工作区分组，未分组的也包含在内），不会遗漏任何会话
```

## 特性

- **恢复归档会话**：归档会话保留工作区账目槽位，恢复后精确回到原位置——单个、批量、一键全部均可。
- **两步确认删除**：删除按钮先进入待确认状态，5 秒内需再次点击才执行；运行中的会话（agent 正在跑）由服务端直接拒绝。
- **删除全部**：一次确认清掉所有可删会话（含已归档、未分组、工作区内的），跳过运行中/当前打开的会话，并逐项报告成功 / 失败 / 跳过。
- **全部会话总览**：持久化层能读到的每个会话——标题、ID、创建时间、所属工作区（未分组显示 `—`）、状态徽标（已归档 / 活跃 / 运行中），支持归档与删除操作。
- **内容预览**：点击会话标题即可展开前 100 条用户 / 助手 / 工具消息，无需打开会话。
- **磁盘占用**：每个会话的占用大小与完整磁盘路径，帮你找到空间被谁吃掉了。
- **零核心修改**：纯 bundle 插件（`dsh.bundle` patch 层），所有操作走官方服务（`workspaceRegistry`、`sessionPersistence`、`sessionQuery`、`fs`、`shell` 等）——不打补丁、不改官方包。
- **仅本机可访问**：`/dsh-sm/*` 路由拒绝非 loopback 的 Host 与跨源请求（Host + Origin / Sec-Fetch-Site 双重栅栏）。

## 安装

```sh
# 一行安装（git 源）
dsh plugin --profile web add github:omdsh-dev/dsh-session-manager

# 重启 web 服务，然后强制刷新页面
```

本地开发：

```sh
dsh plugin --profile web add /path/to/dsh-session-manager
```

仓库随附纯 JS 的 `lib/` 产物，无构建步骤，git 源安装无需在用户机器上执行任何构建。

## 用法

### Web UI

![会话管理（设置页）](assets/session-manager.png)

打开 **设置 → 会话管理**：

- **归档会话**页签（默认）：列出所有已归档会话——标题、ID、创建时间、工作目录、磁盘占用与完整磁盘路径；运行中 / 文件缺失有状态徽标。操作：**恢复**（单个 / 批量 / 全部）、**清空归档**（删除全部已归档，两步确认）、行内**删除**（两步确认）。
- **全部会话**页签：持久化层能读到的每个会话按工作区分组（未分组会话显示 `—`），带已归档 / 活跃 / 运行中徽标。操作：**归档**、**删除**、**删除全部**（两步确认；跳过运行中/已打开的会话）。
- 点击任意会话标题即可就地预览内容（用户 / 助手 / 工具消息，前 100 条）。

## 架构

```
lib/
├── index.js   宿主端：cordis 插件（注入 webServer），挂载 POST /dsh-sm/* 路由
└── client.js  浏览器端：__ModuleLoader__ bundle，注册设置页 section
cordis.patch.yml   dsh.bundle patch 层——一行 insert 同时驱动宿主端与浏览器端
```

```
浏览器（设置页） --POST /dsh-sm/*--> 宿主端 handler
   archived/list · archived/unarchive · sessions/list · sessions/archive
   · sessions/delete · sessions/detail
   workspaceRegistry（归档集合读写）+ sessionPersistence（header/定位）
   + sessionQuery（标题/内容）+ fs/shell（大小/删除）+ agents（运行中拦截）
```

宿主端路由：

| 路由 | 请求体 | 返回 |
|---|---|---|
| `POST /dsh-sm/archived/list` | `{}` | `{ items, totalBytes }` |
| `POST /dsh-sm/archived/unarchive` | `{ sessionId }` | `{ ok, changed, archivedSessionIds }` |
| `POST /dsh-sm/sessions/list` | `{}` | `{ items }` |
| `POST /dsh-sm/sessions/archive` | `{ sessionId }` | `{ ok, archivedSessionIds }` |
| `POST /dsh-sm/sessions/delete` | `{ sessionId }` | `{ ok, deleted, sessionId, path?, reason? }` |
| `POST /dsh-sm/sessions/detail` | `{ sessionId }` | `{ id, createdAt, cwd, totalEvents, messageCount, truncated, messages }` |

恢复路径通过 `workspaceRegistry.setState`（回退到 `workspace` 存储域）重写持久化归档集合，保证注册表内存态与磁盘上的 `global.archivedSessionIds` 一致；客户端随后刷新 workspace / sessions 存储，侧边栏立即更新。

## 测试

```sh
node test/smoke.mjs   # 10 项宿主逻辑检查（stub 服务）
```

冒烟测试用 stub 服务驱动 `apply(ctx)`，覆盖路由挂载、loopback/Origin 栅栏、归档集合读写、删除账目清理与内容提取。端到端验证在真实 profile 上进行过（另起端口跑第二实例 + 浏览器走查恢复 / 归档 / 删除全部全流程）。

## Roadmap

- [x] 归档会话列表 / 恢复 / 删除（两步确认）
- [x] 全部会话总览 + 归档任意会话
- [x] 删除全部（跳过运行中/已打开）并逐项报告结果
- [x] 会话内容就地预览
- [ ] 回收站（软删除 + 撤销窗口）
- [ ] 设置页之外的侧边栏入口
- [ ] 发布到 npm
