# dsh-session-manager

面向 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的会话管理插件。

[English](README.md) · [MIT License](LICENSE)

`dsh-session-manager` 给 DSH Web 界面补上完整的会话管理能力：查看**全部**会话与**已归档**会话、把归档会话**恢复**回原工作区、归档任意会话、两步确认**删除**会话、以及**会话内容预览**——全部在设置页完成，**不改任何官方包**。界面跟随 DSH 语言设置（中文 / English），并带有专门的插件图标。

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

### 0.2.0：修复「删除了归档会话，它却又出现在侧边栏」

新版 DSH 的 `sessionPersistence.list()` 返回的是**列表快照**（`{ header, revision, ... }`），不再是裸 header。旧版插件直接读 `snapshot.id`（永远是 `undefined`），删除时根本找不到会话：它清掉了归档集合与工作区账目，却**没有删掉磁盘文件**。归档集合一移除，仍存在于磁盘的会话就重新出现在侧边栏——这正是你看到的“幽灵会话”。

0.2.0 同时兼容当前快照形状与旧版裸 header 形状，真正定位并删除 JSONL 会话目录，并且**只在目录已删除（或确认不存在）之后**才清理账目。若列表里仍有该会话却定位不到目录，删除会直接报错并保留全部记录，绝不留下孤立文件。

## 特性

- **恢复归档会话**：归档会话保留工作区账目槽位，恢复后精确回到原位置——单个、批量、一键全部均可。
- **安全的两步确认删除**：删除按钮先进入待确认状态，5 秒内需再次点击才执行。服务端先删除会话目录，再清理归档集合、置顶集合与工作区槽位；若定位不到目录则拒绝删除，避免留下孤立文件。
- **活跃会话保护**：运行中的 agent 会被拒绝；未归档且当前打开的会话也会被拒绝（它可能重新写回日志）；已归档但仍活跃的会话会先 flush 再 evict，然后删除。
- **删除全部**：一次确认清掉所有可删会话（含已归档、未分组、工作区内的），跳过运行中/当前打开的会话，并逐项报告成功 / 失败 / 跳过。
- **全部会话总览**：持久化层能读到的每个会话——标题、ID、创建时间、所属工作区（未分组显示 `—`）、状态徽标（已归档 / 活跃 / 运行中），支持归档与删除操作。
- **内容预览**：点击会话标题即可展开前 100 条用户 / 助手 / 工具消息，无需打开会话。
- **磁盘占用**：每个会话的占用大小与完整磁盘路径，帮你找到空间被谁吃掉了。
- **跟随 DSH 语言设置**：设置页入口与整个页面都通过 `ctx.locale` 注册中英文字典；在「设置 → 通用设置 → 语言」切换后立即生效，无需刷新页面，日期格式也跟随语言。
- **专门图标**：`assets/icon.svg` 是插件列表里使用的归档/会话图标；设置页导航则使用 DSH 内置的归档图标，不再显示默认齿轮。
- **零核心修改**：纯 bundle 插件（`dsh.bundle` patch 层），所有操作走官方服务（`workspaceRegistry`、`sessionQuery`、`sessionPersistence`、`sessions`、`agents`、`dshHomePath`）——不打补丁、不改官方包。
- **仅本机可访问**：`/dsh-sm/*` 路由拒绝非 loopback 的 Host 与跨源请求（Host + Origin / Sec-Fetch-Site 双重栅栏）。

## 安装

```sh
# 一行安装（git 源）
dsh plugin --profile web add github:wuxiangru915/dsh-session-manager

# 重启 web 服务，然后强制刷新页面
```

本地开发：

```sh
dsh plugin --profile web add /path/to/dsh-session-manager

# 重启 web 服务，然后强制刷新页面
```

仓库随附纯 JS 的 `lib/` 产物，无构建步骤，git 源安装无需在用户机器上执行任何构建。

## 用法

### Web UI

![会话管理（设置页）](assets/session-manager.zh.png)

打开 **设置 → 会话管理**：

- **已归档**页签（默认）：列出所有已归档会话——标题、ID、创建时间、工作目录、磁盘占用与完整磁盘路径；运行中 / 文件缺失有状态徽标。操作：**恢复**（单个 / 批量 / 全部）、**清空归档**（删除全部已归档，两步确认）、行内**删除**（两步确认）。
- **全部会话**页签：持久化层能读到的每个会话按工作区分组（未分组会话显示 `—`），带已归档 / 活跃 / 运行中徽标。操作：**归档**、**删除**、**删除全部**（两步确认；跳过运行中/已打开的会话）。
- 点击任意会话标题即可就地预览内容（用户 / 助手 / 工具消息，前 100 条）。
- 在 **设置 → 通用设置 → 语言** 切换中文 / English，插件入口与页面文案立即同步，无需刷新。

![英文界面](assets/session-manager.png)

## 架构

```
lib/
├── index.js   宿主端：cordis 插件（注入 webServer），挂载 POST /dsh-sm/* 路由
└── client.js  浏览器端：__ModuleLoader__ bundle，注册设置页 section
cordis.patch.yml   dsh.bundle patch 层——一行 insert 同时驱动宿主端与浏览器端
assets/icon.svg    专门的插件图标（manifest 相对路径，≤256 KiB）
locale/en.json     插件列表元数据（英文）
locale/zh.json     插件列表元数据（中文）
```

```
浏览器（设置页） --POST /dsh-sm/*--> 宿主端 handler
   archived/list · archived/unarchive · sessions/list · sessions/archive
   · sessions/delete · sessions/detail
   sessionQuery（列表 / 标题 / 内容）+ sessionPersistence（header / 旧版 locate）
   + workspaceRegistry（归档 / 置顶 / 工作区账目）+ sessions（evict / flush）
   + dshHomePath + node:fs（定位、统计、删除 JSONL 会话目录）
   + agents（运行中拦截）
```

宿主端路由：

| 路由 | 请求体 | 返回 |
|---|---|---|
| `POST /dsh-sm/archived/list` | `{}` | `{ items, totalBytes }` |
| `POST /dsh-sm/archived/unarchive` | `{ sessionId }` | `{ ok, changed, archivedSessionIds }` |
| `POST /dsh-sm/sessions/list` | `{}` | `{ items }` |
| `POST /dsh-sm/sessions/archive` | `{ sessionId }` | `{ ok, archivedSessionIds }` |
| `POST /dsh-sm/sessions/delete` | `{ sessionId }` | `{ ok, deleted, sessionId, path?, sizeBytes?, reason? }` |
| `POST /dsh-sm/sessions/detail` | `{ sessionId }` | `{ id, createdAt, cwd, totalEvents, messageCount, truncated, messages }` |

恢复 / 删除通过注册表公开的 `unarchiveSession` / `unpinSession` 路径完成（旧版注册表回退到持久化状态重写），保证注册表内存态、磁盘上的 `global.archivedSessionIds` 与 workspace 推送一致；客户端随后刷新 workspace / sessions 存储，侧边栏立即更新。

会话目录通过 `ctx.dshHomePath("sessions")` 定位为 `<home>/sessions/<project>/<sessionId>/`；如果旧版 persistence 暴露了 `locate(header)`，会优先使用。

## 测试

```sh
npm test                # 19 项宿主检查 + 3 项客户端检查
node test/smoke.mjs     # 仅宿主：stub 服务 + 真实临时 Harness home
node test/client.mjs    # 仅客户端：语言字典 + section 注册
```

宿主冒烟测试用 stub 服务驱动 `apply(ctx)`，并在临时 Harness home 中创建真实会话目录。覆盖路由挂载、loopback/Origin 栅栏、归档集合读写、当前快照 `list()` 形状、旧版裸 header 形状、真实磁盘删除、活跃会话 flush/拒绝、孤儿目录清理、「定位不到目录 ⇒ 拒绝清理账目」保护、路径穿越拒绝与内容提取。客户端测试在 vm 中加载 `lib/client.js`，验证中英文字典键完整，以及设置入口使用 `archived-sessions` id 并实时读取当前语言。

端到端验证在真实第二 profile 上完成：归档 → 归档列表 → 两步删除 → 侧边栏 / 列表均不再出现该会话，并用浏览器走查了 English ↔ 中文切换与插件列表图标。

## 兼容性

- DSH 0.2.x（`sessionPersistence.list()` 返回快照）。
- `sessionPersistence.list()` 返回裸 header 的旧版 DSH 仍然可用。
- 默认 JSONL 后端可直接定位；提供 `locate()` 的其他后端也支持。两者都没有时，删除会安全失败，而不是冒险留下孤立文件。

## Roadmap

- [x] 归档会话列表 / 恢复 / 删除（两步确认）
- [x] 全部会话总览 + 归档任意会话
- [x] 删除全部（跳过运行中/已打开）并逐项报告结果
- [x] 会话内容就地预览
- [x] 跟随 DSH 语言设置
- [x] 专门的插件图标
- [x] 安全删除真实磁盘文件（0.2.0）
- [ ] 回收站（软删除 + 撤销窗口）
- [ ] 设置页之外的侧边栏入口
- [ ] 发布到 npm
