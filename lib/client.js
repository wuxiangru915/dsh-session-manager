window.__ModuleLoader__.load({
  id: "@dshwp/dsh-session-manager",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    let react = require("react");

    // ---------- i18n ----------
    // The dictionaries are registered with the Harness locale service, so the
    // plugin follows Settings -> General -> Language exactly like the rest of
    // the UI (explicit preference first, browser language as the fallback).
    var NS = "settings.sessionManager";

    var EN = {
      nav: "Session Manager",
      tabArchived: "Archived",
      tabAll: "All Sessions",
      archivedTitle: "Archived Sessions",
      allTitle: "All Sessions",
      sessionsCount: "{count} sessions",
      sessionsCountWithSize: "{count} sessions · {size}",
      loadingSuffix: " · Loading…",
      batchSuffix: " · Batch operation in progress…",
      refresh: "Refresh",
      restoreAll: "Restore All",
      clearArchive: "Clear Archive",
      runningOpenSuffix: " ({count} running/open, handle separately)",
      deleteAll: "Delete All",
      confirmClearText:
        "Confirm clearing all {count} archived session(s)? This deletes them from disk and cannot be undone.",
      confirmClear: "Confirm Clear",
      cancel: "Cancel",
      confirmDeleteAllText:
        "Confirm deleting all {count} session(s){skipping}? This deletes them from disk and cannot be undone.",
      skipping: " (skipping {count} running/open session(s))",
      confirmDeleteAll: "Confirm Delete All",
      confirmDeleteSelectedText: "Confirm deleting the {count} selected session(s)? This cannot be undone.",
      confirmDelete: "Confirm Delete",
      selectedCount: "Selected {count} session(s)",
      restoreSelected: "Restore Selected",
      deleteSelected: "Delete Selected",
      clearSelection: "Clear Selection",
      created: "Created at {time}",
      untitled: "(untitled)",
      clickPreview: "Click to view session content",
      fileMissing: "File Missing",
      archivedBadge: "Archived",
      liveBadge: "Live",
      runningBadge: "Running",
      restore: "Restore",
      archive: "Archive",
      delete: "Delete",
      confirm: "Confirm",
      deleteConfirmTitle: "Click again to confirm delete (auto-cancels after 5s)",
      deleteArmTitle: "Delete (click again to confirm)",
      diskUsage: "Disk Usage",
      session: "Session",
      workspace: "Workspace",
      status: "Status",
      actions: "Actions",
      loading: "Loading…",
      noArchived: "No archived sessions",
      noSessions: "No sessions",
      loadingContent: "Loading session content…",
      noContent: "No content to display",
      sessionContent: "Session Content",
      createdLabel: "Created at {time}",
      eventsMessages: "{events} events, {messages} messages extracted",
      truncated: "(showing first 100 only)",
      roleUser: "User",
      roleAssistant: "Assistant",
      roleTool: "Tool",
      batchComplete: "{action} complete: {count} succeeded",
      batchFailed: "{count} failed",
      batchFailedDetail: "{action} failed for {count} session(s): {details}",
      batchSkipped: "Skipped {count} (running/open sessions)",
      actionDelete: "Delete",
      actionDeleteAll: "Delete All",
      actionRelease: "Release",
      actionRestoreAll: "Restore All",
      actionClearArchive: "Clear Archive",
      actionRestoreSelected: "Restore Selected",
      actionDeleteSelected: "Delete Selected",
      deleteBookkeepingOnly: "The session files were already gone; its archive record was cleaned up."
    };

    var ZH = {
      nav: "会话管理",
      tabArchived: "已归档",
      tabAll: "全部会话",
      archivedTitle: "已归档会话",
      allTitle: "全部会话",
      sessionsCount: "{count} 个会话",
      sessionsCountWithSize: "{count} 个会话 · {size}",
      loadingSuffix: " · 加载中…",
      batchSuffix: " · 批量操作进行中…",
      refresh: "刷新",
      restoreAll: "全部恢复",
      clearArchive: "清空归档",
      runningOpenSuffix: "（{count} 个运行中/已打开，请单独处理）",
      deleteAll: "全部删除",
      confirmClearText: "确定清空全部 {count} 个已归档会话？这将从磁盘删除，且无法撤销。",
      confirmClear: "确认清空",
      cancel: "取消",
      confirmDeleteAllText: "确定删除全部 {count} 个会话{skipping}？这将从磁盘删除，且无法撤销。",
      skipping: "（跳过 {count} 个运行中/已打开的会话）",
      confirmDeleteAll: "确认全部删除",
      confirmDeleteSelectedText: "确定删除选中的 {count} 个会话？此操作无法撤销。",
      confirmDelete: "确认删除",
      selectedCount: "已选择 {count} 个会话",
      restoreSelected: "恢复选中",
      deleteSelected: "删除选中",
      clearSelection: "取消选择",
      created: "创建于 {time}",
      untitled: "(无标题)",
      clickPreview: "点击预览会话内容",
      fileMissing: "文件缺失",
      archivedBadge: "已归档",
      liveBadge: "活跃",
      runningBadge: "运行中",
      restore: "恢复",
      archive: "归档",
      delete: "删除",
      confirm: "确认",
      deleteConfirmTitle: "再次点击确认删除（5 秒后自动取消）",
      deleteArmTitle: "删除（再次点击确认）",
      diskUsage: "磁盘占用",
      session: "会话",
      workspace: "工作区",
      status: "状态",
      actions: "操作",
      loading: "加载中…",
      noArchived: "没有已归档会话",
      noSessions: "没有会话",
      loadingContent: "正在加载会话内容…",
      noContent: "暂无可显示内容",
      sessionContent: "会话内容",
      createdLabel: "创建于 {time}",
      eventsMessages: "{events} 个事件，提取 {messages} 条消息",
      truncated: "（仅显示前 100 条）",
      roleUser: "用户",
      roleAssistant: "助手",
      roleTool: "工具",
      batchComplete: "{action}完成：成功 {count} 个",
      batchFailed: "失败 {count} 个",
      batchFailedDetail: "{action}失败 {count} 个会话：{details}",
      batchSkipped: "跳过 {count} 个（运行中/已打开的会话）",
      actionDelete: "删除",
      actionDeleteAll: "全部删除",
      actionRelease: "恢复",
      actionRestoreAll: "全部恢复",
      actionClearArchive: "清空归档",
      actionRestoreSelected: "恢复选中",
      actionDeleteSelected: "删除选中",
      deleteBookkeepingOnly: "该会话的文件已不存在，仅清理了归档记录。"
    };

    // ---------- styles ----------
    var STYLE_ID = "dsw-sm-style";
    var CSS =
      ".dsw-sm-page{font-size:13px;padding:2px 2px 24px;}" +
      ".dsw-sm-tabs{display:flex;gap:6px;margin-bottom:12px;border-bottom:1px solid var(--dsw-alias-border-l1);}" +
      ".dsw-sm-tab{background:transparent;border:none;color:var(--dsw-alias-label-secondary);font-size:13px;padding:6px 12px;cursor:pointer;border-bottom:2px solid transparent;}" +
      ".dsw-sm-tab-active{color:var(--dsw-alias-label-primary);border-bottom-color:var(--dsw-alias-brand-primary);font-weight:600;}" +
      ".dsw-sm-toolbar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px;}" +
      ".dsw-sm-page-title{display:inline-flex;align-items:center;gap:7px;font-weight:600;color:var(--dsw-alias-label-primary);}" +
      ".dsw-sm-icon{flex:none;color:var(--dsw-alias-brand-primary);}" +
      ".dsw-sm-meta{color:var(--dsw-alias-label-secondary);font-size:12px;}" +
      ".dsw-sm-btn{background:transparent;border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary);border-radius:6px;padding:3px 7px;font-size:12px;cursor:pointer;margin-right:4px;white-space:nowrap;}" +
      ".dsw-sm-btn:hover:not(:disabled){border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary);}" +
      ".dsw-sm-btn-danger{color:var(--dsw-alias-state-error-primary);border-color:var(--dsw-alias-state-error-primary);}" +
      ".dsw-sm-btn:disabled{opacity:0.45;cursor:default;}" +
      ".dsw-sm-table{width:100%;border-collapse:collapse;table-layout:fixed;}" +
      ".dsw-sm-table th{text-align:left;font-weight:600;color:var(--dsw-alias-label-secondary);font-size:12px;padding:6px 8px;border-bottom:1px solid var(--dsw-alias-border-l1);}" +
      ".dsw-sm-table td{padding:8px 8px;border-bottom:1px solid var(--dsw-alias-border-l1);vertical-align:top;}" +
      ".dsw-sm-table tr:last-child td{border-bottom:none;}" +
      ".dsw-sm-table th:nth-child(1),.dsw-sm-table td:nth-child(1){width:32px;text-align:center;padding-left:2px;padding-right:2px;}" +
      ".dsw-sm-table th:nth-child(2),.dsw-sm-table td:nth-child(2){width:auto;}" +
      ".dsw-sm-table th:nth-child(3),.dsw-sm-table td:nth-child(3){width:76px;}" +
      ".dsw-sm-table th:nth-child(4),.dsw-sm-table td:nth-child(4){width:68px;}" +
      ".dsw-sm-table th:nth-child(5),.dsw-sm-table td:nth-child(5){width:116px;}" +
      ".dsw-sm-size{white-space:nowrap;}" +
      ".dsw-sm-actions{white-space:nowrap;}" +
      ".dsw-sm-title-click{cursor:pointer;color:var(--dsw-alias-label-primary);}" +
      ".dsw-sm-title-click:hover{text-decoration:underline;}" +
      ".dsw-sm-id,.dsw-sm-path{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:11px;color:var(--dsw-alias-label-secondary);word-break:break-all;margin-top:2px;}" +
      ".dsw-sm-selectbar{display:flex;align-items:center;gap:8px;padding:6px 10px;margin-bottom:10px;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);border-radius:8px;font-size:12px;flex-wrap:wrap;}" +
      ".dsw-sm-selectbar .dsw-sm-meta{flex:1;}" +
      ".dsw-sm-detail{background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:10px 12px;font-size:12px;text-align:left;}" +
      ".dsw-sm-detail-head{margin-bottom:8px;}" +
      ".dsw-sm-detail-body{max-height:360px;overflow:auto;}" +
      ".dsw-sm-msg{margin-bottom:8px;white-space:pre-wrap;word-break:break-word;}" +
      ".dsw-sm-msg-role{display:inline-block;font-weight:600;margin-right:6px;}" +
      ".dsw-sm-msg-user .dsw-sm-msg-role{color:var(--dsw-alias-label-primary);}" +
      ".dsw-sm-msg-assistant .dsw-sm-msg-role{color:var(--dsw-alias-brand-primary);}" +
      ".dsw-sm-msg-tool .dsw-sm-msg-role{color:var(--dsw-alias-state-warn-primary);}" +
      ".dsw-sm-msg-time{color:var(--dsw-alias-label-secondary);font-size:11px;margin-left:6px;}" +
      ".dsw-sm-detail-note{color:var(--dsw-alias-label-secondary);font-size:11px;margin-bottom:8px;}" +
      ".dsw-sm-error{color:var(--dsw-alias-state-error-primary);font-size:12px;margin-bottom:8px;}" +
      ".dsw-sm-empty{color:var(--dsw-alias-label-secondary);padding:28px 0;text-align:center;}" +
      ".dsw-sm-badge{display:inline-block;border:1px solid var(--dsw-alias-state-warn-primary);color:var(--dsw-alias-state-warn-primary);border-radius:4px;padding:1px 6px;font-size:11px;margin-right:4px;}" +
      ".dsw-sm-badge-ok{border-color:var(--dsw-alias-state-success-primary, #2ea043);color:var(--dsw-alias-state-success-primary, #2ea043);}" +
      ".dsw-sm-badge-run{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary);}";

    function ensureStyle() {
      try {
        if (document.getElementById(STYLE_ID)) return;
        var el = document.createElement("style");
        el.id = STYLE_ID;
        el.textContent = CSS;
        document.head.appendChild(el);
      } catch (e) {
        // ignore
      }
    }

    // ---------- api ----------
    function api(path, args) {
      return fetch("/dsh-sm/" + path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(args || {})
      }).then(function (res) {
        return res.json().catch(function () {
          return null;
        });
      }).then(function (payload) {
        if (payload === null || typeof payload !== "object") {
          var err = new Error("Request failed: the server returned an invalid response");
          throw err;
        }
        if (payload.error) {
          var e2 = new Error(String(payload.error));
          throw e2;
        }
        return payload;
      });
    }

    // ---------- formatting ----------
    function describe(err) {
      if (err === null || err === undefined) return String(err);
      if (typeof err === "object" && typeof err.message === "string") return err.message;
      return String(err);
    }

    function fmtSize(bytes) {
      var n = Number(bytes) || 0;
      if (n <= 0) return "0 B";
      var units = ["B", "KB", "MB", "GB", "TB"];
      var v = n;
      var i = 0;
      while (v >= 1024 && i < units.length - 1) {
        v = v / 1024;
        i = i + 1;
      }
      return (i === 0 ? String(Math.round(v)) : v.toFixed(1)) + " " + units[i];
    }

    function fmtTime(ms, locale) {
      if (!ms) return "—";
      try {
        return new Date(ms).toLocaleString(locale || undefined);
      } catch (e) {
        return String(ms);
      }
    }

    // A compact line-art mark used beside the page title. The package icon in
    // assets/icon.svg is the filled version used by the Plugins inventory.
    function SessionManagerIcon(props) {
      var size = props && props.size ? props.size : 18;
      return react.createElement(
        "svg",
        {
          className: "dsw-sm-icon",
          width: size,
          height: size,
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
          strokeWidth: 1.6,
          strokeLinecap: "round",
          strokeLinejoin: "round",
          "aria-hidden": "true",
          focusable: "false"
        },
        react.createElement("rect", { x: "3.5", y: "4", width: "17", height: "5", rx: "2" }),
        react.createElement("path", { d: "M5.5 9v8.5A2.5 2.5 0 0 0 8 20h8a2.5 2.5 0 0 0 2.5-2.5V9" }),
        react.createElement("path", { d: "M9 13h6M9 16.5h4" })
      );
    }

    var clientCtx = null;

    function activeLocale() {
      try {
        if (clientCtx && clientCtx.locale && typeof clientCtx.locale.getSnapshot === "function") {
          return clientCtx.locale.getSnapshot().active || "en";
        }
      } catch (e) {
        // ignore
      }
      return "en";
    }

    function fallbackT(key) {
      try {
        if (clientCtx && clientCtx.locale && typeof clientCtx.locale.bind === "function") {
          return clientCtx.locale.bind(NS).apply(null, arguments);
        }
      } catch (e) {
        // ignore
      }
      return key;
    }

    /** Re-render the page when the Harness locale changes. */
    function useLocaleRevision() {
      var pair = react.useState(0);
      react.useEffect(function () {
        try {
          if (!clientCtx || !clientCtx.locale || typeof clientCtx.locale.subscribe !== "function") return undefined;
          return clientCtx.locale.subscribe(function () {
            pair[1](function (n) {
              return n + 1;
            });
          });
        } catch (e) {
          return undefined;
        }
      }, []);
    }

    // ---------- page component ----------
    function SessionManagerPage(props) {
      useLocaleRevision();
      var t = props && typeof props.t === "function" ? props.t : fallbackT;
      var locale = activeLocale();

      var _tab = react.useState("archived");
      var tab = _tab[0];
      var setTab = _tab[1];
      var _loading = react.useState(true);
      var loading = _loading[0];
      var setLoading = _loading[1];
      var _error = react.useState(null);
      var error = _error[0];
      var setError = _error[1];
      var _notice = react.useState(null);
      var notice = _notice[0];
      var setNotice = _notice[1];
      var _archived = react.useState([]);
      var archivedItems = _archived[0];
      var setArchivedItems = _archived[1];
      var _all = react.useState([]);
      var allItems = _all[0];
      var setAllItems = _all[1];
      var _total = react.useState(0);
      var totalBytes = _total[0];
      var setTotalBytes = _total[1];
      var _busy = react.useState(null);
      var busy = _busy[0];
      var setBusy = _busy[1];
      var _confirmId = react.useState(null);
      var confirmId = _confirmId[0];
      var setConfirmId = _confirmId[1];
      var _selected = react.useState([]);
      var selected = _selected[0];
      var setSelected = _selected[1];
      var _batchBusy = react.useState(null);
      var batchBusy = _batchBusy[0];
      var setBatchBusy = _batchBusy[1];
      var _batchConfirm = react.useState(null);
      var batchConfirm = _batchConfirm[0];
      var setBatchConfirm = _batchConfirm[1];
      var _expandedId = react.useState(null);
      var expandedId = _expandedId[0];
      var setExpandedId = _expandedId[1];
      var _detail = react.useState(null);
      var detail = _detail[0];
      var setDetail = _detail[1];

      var items = tab === "archived" ? archivedItems : allItems;

      function applyList(res, kind) {
        var next = res && Array.isArray(res.items) ? res.items : [];
        if (kind === "archived") {
          setArchivedItems(next);
          setTotalBytes(res && typeof res.totalBytes === "number" ? res.totalBytes : 0);
        } else {
          setAllItems(next);
        }
        var ids = {};
        for (var i = 0; i < next.length; i++) ids[next[i].id] = true;
        setSelected(function (sel) {
          return sel.filter(function (id) {
            return ids[id];
          });
        });
        if (expandedId && !ids[expandedId]) {
          setExpandedId(null);
          setDetail(null);
        }
      }

      function load(kind) {
        setLoading(true);
        setError(null);
        api(kind === "archived" ? "archived/list" : "sessions/list", {}).then(function (res) {
          applyList(res, kind);
          setLoading(false);
        }).catch(function (err) {
          setError(describe(err));
          setLoading(false);
        });
      }

      react.useEffect(function () {
        load(tab);
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [tab]);

      function refreshViews() {
        var jobs = [];
        try {
          if (clientCtx && clientCtx.workspaces && typeof clientCtx.workspaces.refresh === "function") {
            jobs.push(Promise.resolve(clientCtx.workspaces.refresh()).catch(function () {}));
          }
        } catch (e) {
          // ignore
        }
        try {
          if (clientCtx && clientCtx.sessions && typeof clientCtx.sessions.refresh === "function") {
            jobs.push(Promise.resolve(clientCtx.sessions.refresh()).catch(function () {}));
          }
        } catch (e) {
          // ignore
        }
        return Promise.all(jobs);
      }

      function reloadAfterAction(kind) {
        return refreshViews().then(function () {
          return api(kind === "archived" ? "archived/list" : "sessions/list", {});
        }).then(function (res) {
          applyList(res, kind);
        });
      }

      // ---- row operations ----
      function unarchive(id) {
        setBusy("unarchive:" + id);
        setError(null);
        api("archived/unarchive", { sessionId: id })
          .then(function () { return reloadAfterAction("archived"); })
          .catch(function (err) { setError(describe(err)); })
          .finally(function () { setBusy(null); });
      }

      function archive(id) {
        setBusy("archive:" + id);
        setError(null);
        api("sessions/archive", { sessionId: id })
          .then(function () { return reloadAfterAction("all"); })
          .catch(function (err) { setError(describe(err)); })
          .finally(function () { setBusy(null); });
      }

      // Two-step delete: Delete -> Confirm (auto-reverts after 5s).
      function armDelete(id) {
        setConfirmId(id);
        try {
          if (clientCtx && clientCtx.timer && typeof clientCtx.timer.timeout === "function") {
            clientCtx.timer.timeout(function () {
              setConfirmId(function (cur) { return cur === id ? null : cur; });
            }, 5000);
          }
        } catch (e) {
          // timer unavailable; stay armed until the user acts
        }
      }

      function doDelete(id, kind) {
        setBusy("delete:" + id);
        setError(null);
        setNotice(null);
        api("sessions/delete", { sessionId: id })
          .then(function (res) {
            if (res && res.deleted === false) setNotice(t("deleteBookkeepingOnly"));
            return reloadAfterAction(kind);
          })
          .catch(function (err) { setError(describe(err)); })
          .finally(function () {
            setBusy(null);
            setConfirmId(null);
          });
      }

      // ---- selection ----
      function toggleSelect(id) {
        setSelected(function (sel) {
          return sel.includes(id) ? sel.filter(function (x) { return x !== id; }) : sel.concat([id]);
        });
      }

      function toggleSelectAll() {
        setSelected(function (sel) {
          return sel.length === items.length ? [] : items.map(function (item) { return item.id; });
        });
      }

      // ---- batch operations ----
      // Reload both tab lists (archived + all) after a batch, and report a
      // per-item summary: success count, failure ids, and skipped ids.
      function runBatch(ids, method, kind, actionLabel, skipped) {
        setBatchBusy(method);
        setError(null);
        setNotice(null);
        var results = [];
        var cursor = Promise.resolve();
        for (var i = 0; i < ids.length; i++) {
          (function (id) {
            cursor = cursor.then(function () {
              return api(method, { sessionId: id })
                .then(function () { results.push({ id: id, ok: true }); })
                .catch(function (err) { results.push({ id: id, ok: false, error: describe(err) }); });
            });
          })(ids[i]);
        }
        cursor.then(function () {
          var failed = results.filter(function (r) { return !r.ok; });
          var label = actionLabel || (method === "sessions/delete" ? t("actionDelete") : t("actionRelease"));
          var parts = [t("batchComplete", { action: label, count: ids.length - failed.length })];
          if (failed.length > 0) {
            parts.push(t("batchFailed", { count: failed.length }));
            setError(t("batchFailedDetail", {
              action: label,
              count: failed.length,
              details: failed.map(function (f) { return f.id + " (" + f.error + ")"; }).join("; ")
            }));
          }
          if (skipped && skipped.length > 0) parts.push(t("batchSkipped", { count: skipped.length }));
          setNotice(parts.join(", "));
          return refreshViews().then(function () {
            return Promise.all([api("archived/list", {}), api("sessions/list", {})]);
          });
        }).then(function (both) {
          applyList(both[0], "archived");
          applyList(both[1], "all");
        }).catch(function (err) {
          setError(describe(err));
        }).finally(function () {
          setBatchBusy(null);
          setBatchConfirm(null);
          setSelected([]);
          setConfirmId(null);
        });
      }

      function deletableIds() {
        return items.filter(function (item) { return !item.running && !item.live; }).map(function (item) { return item.id; });
      }

      function releaseAll() {
        runBatch(archivedItems.map(function (item) { return item.id; }), "archived/unarchive", "archived", t("actionRestoreAll"));
      }
      function clearAll() {
        runBatch(archivedItems.map(function (item) { return item.id; }), "sessions/delete", "archived", t("actionClearArchive"));
      }
      function releaseSelected() {
        runBatch(selected, "archived/unarchive", "archived", t("actionRestoreSelected"));
      }
      function deleteSelected(kind) {
        runBatch(selected, "sessions/delete", kind, t("actionDeleteSelected"));
      }
      function deleteAll() {
        var ids = deletableIds();
        var skipped = items.filter(function (item) { return item.running || item.live; }).map(function (item) { return item.id; });
        runBatch(ids, "sessions/delete", "all", t("actionDeleteAll"), skipped);
      }

      // ---- detail ----
      function toggleDetail(id) {
        if (expandedId === id) {
          setExpandedId(null);
          setDetail(null);
          return;
        }
        setExpandedId(id);
        setDetail({ id: id, loading: true, data: null, error: null });
        api("sessions/detail", { sessionId: id }).then(function (data) {
          setDetail({ id: id, loading: false, data: data, error: null });
        }).catch(function (err) {
          setDetail({ id: id, loading: false, data: null, error: describe(err) });
        });
      }

      function detailCell() {
        if (!detail) return null;
        if (detail.loading) {
          return react.createElement("div", { className: "dsw-sm-detail" }, t("loadingContent"));
        }
        if (detail.error) {
          return react.createElement("div", { className: "dsw-sm-detail" }, String(detail.error));
        }
        var d = detail.data;
        if (!d || !Array.isArray(d.messages)) {
          return react.createElement("div", { className: "dsw-sm-detail" }, t("noContent"));
        }
        var headParts = [];
        if (d.createdAt) headParts.push(t("createdLabel", { time: fmtTime(d.createdAt, locale) }));
        if (d.cwd) headParts.push(d.cwd);
        var headEl = react.createElement("div", { className: "dsw-sm-detail-head" },
          react.createElement("span", { className: "dsw-sm-page-title" },
            react.createElement(SessionManagerIcon, { size: 15 }),
            t("sessionContent")
          ),
          react.createElement("span", { className: "dsw-sm-meta" }, " · " + headParts.join(" · "))
        );
        var noteEl = react.createElement("div", { className: "dsw-sm-detail-note" },
          t("eventsMessages", { events: d.totalEvents, messages: d.messageCount }) + (d.truncated ? " " + t("truncated") : "")
        );
        var msgs = d.messages.map(function (m) {
          var roleLabel = m.role === "user" ? t("roleUser") : m.role === "assistant" ? t("roleAssistant") : t("roleTool");
          return react.createElement("div", { className: "dsw-sm-msg dsw-sm-msg-" + m.role },
            react.createElement("span", { className: "dsw-sm-msg-role" }, roleLabel),
            react.createElement("span", { className: "dsw-sm-msg-time" }, fmtTime(m.time, locale)),
            react.createElement("div", null, m.text)
          );
        });
        return react.createElement("div", { className: "dsw-sm-detail" }, headEl, noteEl,
          react.createElement("div", { className: "dsw-sm-detail-body" }, msgs)
        );
      }

      // ---- render ----
      var anyBusy = busy !== null || batchBusy !== null;

      var tabs = react.createElement("div", { className: "dsw-sm-tabs" },
        react.createElement("button", { className: "dsw-sm-tab" + (tab === "archived" ? " dsw-sm-tab-active" : ""), onClick: function () { setTab("archived"); } }, t("tabArchived")),
        react.createElement("button", { className: "dsw-sm-tab" + (tab === "all" ? " dsw-sm-tab-active" : ""), onClick: function () { setTab("all"); } }, t("tabAll"))
      );

      var header = null;
      if (tab === "archived") {
        var archivedMeta = t("sessionsCountWithSize", { count: items.length, size: fmtSize(totalBytes) });
        if (loading) archivedMeta += t("loadingSuffix");
        if (batchBusy) archivedMeta += t("batchSuffix");
        header = react.createElement("div", { className: "dsw-sm-toolbar" },
          react.createElement("span", { className: "dsw-sm-page-title" },
            react.createElement(SessionManagerIcon, { size: 18 }),
            t("archivedTitle")
          ),
          react.createElement("span", { className: "dsw-sm-meta" }, archivedMeta),
          react.createElement("button", { className: "dsw-sm-btn", disabled: anyBusy, onClick: function () { load("archived"); } }, t("refresh")),
          react.createElement("button", { className: "dsw-sm-btn", disabled: anyBusy || items.length === 0, onClick: releaseAll }, t("restoreAll")),
          react.createElement("button", { className: "dsw-sm-btn dsw-sm-btn-danger", disabled: anyBusy || items.length === 0, onClick: function () { setBatchConfirm("clear"); } }, t("clearArchive"))
        );
      } else {
        var allDeletable = items.filter(function (item) { return !item.running && !item.live; }).length;
        var allSkipped = items.length - allDeletable;
        var allMeta = t("sessionsCount", { count: items.length });
        if (allSkipped > 0) allMeta += t("runningOpenSuffix", { count: allSkipped });
        if (loading) allMeta += t("loadingSuffix");
        if (batchBusy) allMeta += t("batchSuffix");
        header = react.createElement("div", { className: "dsw-sm-toolbar" },
          react.createElement("span", { className: "dsw-sm-page-title" },
            react.createElement(SessionManagerIcon, { size: 18 }),
            t("allTitle")
          ),
          react.createElement("span", { className: "dsw-sm-meta" }, allMeta),
          react.createElement("button", { className: "dsw-sm-btn", disabled: anyBusy, onClick: function () { load("all"); } }, t("refresh")),
          react.createElement("button", { className: "dsw-sm-btn dsw-sm-btn-danger", disabled: anyBusy || allDeletable === 0, onClick: function () { setBatchConfirm("deleteAll"); } }, t("deleteAll"))
        );
      }

      var confirmBar = null;
      if (batchConfirm === "clear") {
        confirmBar = react.createElement("div", { className: "dsw-sm-selectbar" },
          react.createElement("span", { className: "dsw-sm-meta", style: { color: "var(--dsw-alias-state-warn-primary)" } }, t("confirmClearText", { count: archivedItems.length })),
          react.createElement("button", { className: "dsw-sm-btn dsw-sm-btn-danger", disabled: anyBusy, onClick: clearAll }, t("confirmClear")),
          react.createElement("button", { className: "dsw-sm-btn", disabled: anyBusy, onClick: function () { setBatchConfirm(null); } }, t("cancel"))
        );
      } else if (batchConfirm === "deleteAll") {
        var delIds = deletableIds();
        var delSkipped = items.length - delIds.length;
        confirmBar = react.createElement("div", { className: "dsw-sm-selectbar" },
          react.createElement("span", { className: "dsw-sm-meta", style: { color: "var(--dsw-alias-state-warn-primary)" } },
            t("confirmDeleteAllText", {
              count: delIds.length,
              skipping: delSkipped > 0 ? t("skipping", { count: delSkipped }) : ""
            })),
          react.createElement("button", { className: "dsw-sm-btn dsw-sm-btn-danger", disabled: anyBusy || delIds.length === 0, onClick: deleteAll }, t("confirmDeleteAll")),
          react.createElement("button", { className: "dsw-sm-btn", disabled: anyBusy, onClick: function () { setBatchConfirm(null); } }, t("cancel"))
        );
      } else if (batchConfirm === "delete") {
        confirmBar = react.createElement("div", { className: "dsw-sm-selectbar" },
          react.createElement("span", { className: "dsw-sm-meta", style: { color: "var(--dsw-alias-state-warn-primary)" } }, t("confirmDeleteSelectedText", { count: selected.length })),
          react.createElement("button", { className: "dsw-sm-btn dsw-sm-btn-danger", disabled: anyBusy, onClick: function () { deleteSelected(tab); } }, t("confirmDelete")),
          react.createElement("button", { className: "dsw-sm-btn", disabled: anyBusy, onClick: function () { setBatchConfirm(null); } }, t("cancel"))
        );
      } else if (selected.length > 0) {
        var selectActions = [react.createElement("span", { className: "dsw-sm-meta" }, t("selectedCount", { count: selected.length }))];
        if (tab === "archived") {
          selectActions.push(react.createElement("button", { className: "dsw-sm-btn", disabled: anyBusy, onClick: releaseSelected }, t("restoreSelected")));
        }
        selectActions.push(react.createElement("button", { className: "dsw-sm-btn dsw-sm-btn-danger", disabled: anyBusy, onClick: function () { setBatchConfirm("delete"); } }, t("deleteSelected")));
        selectActions.push(react.createElement("button", { className: "dsw-sm-btn", disabled: anyBusy, onClick: function () { setSelected([]); } }, t("clearSelection")));
        confirmBar = react.createElement("div", { className: "dsw-sm-selectbar" }, selectActions);
      }

      var body;
      if (loading && items.length === 0) {
        body = react.createElement("div", { className: "dsw-sm-empty" }, t("loading"));
      } else if (items.length === 0) {
        body = react.createElement("div", { className: "dsw-sm-empty" },
          tab === "archived" ? t("noArchived") : t("noSessions")
        );
      } else {
        var allSelected = selected.length === items.length;
        var rows = [];
        for (var i = 0; i < items.length; i++) {
          (function (item) {
            var confirming = confirmId === item.id;
            var metaParts = [];
            if (item.createdAt) metaParts.push(t("created", { time: fmtTime(item.createdAt, locale) }));
            if (item.cwd) metaParts.push(item.cwd);

            var checkEl = react.createElement("input", {
              type: "checkbox",
              checked: selected.includes(item.id),
              disabled: anyBusy,
              onChange: function () { toggleSelect(item.id); }
            });

            var chevron = expandedId === item.id ? "▾ " : "▸ ";
            var titleEl = react.createElement("div", {
              className: "dsw-sm-title-click",
              title: t("clickPreview"),
              onClick: function () { toggleDetail(item.id); }
            }, chevron + (item.title || t("untitled")));
            var idEl = react.createElement("div", { className: "dsw-sm-id" }, item.id);
            var metaEl = react.createElement("div", { className: "dsw-sm-meta" }, metaParts.join(" · "));
            var pathEl = item.path
              ? react.createElement("div", { className: "dsw-sm-path" }, item.path)
              : null;

            var badges = [];
            if (tab === "archived") {
              if (item.missing) badges.push(react.createElement("span", { className: "dsw-sm-badge" }, t("fileMissing")));
            } else {
              if (item.archived) badges.push(react.createElement("span", { className: "dsw-sm-badge" }, t("archivedBadge")));
              if (item.live) badges.push(react.createElement("span", { className: "dsw-sm-badge dsw-sm-badge-ok" }, t("liveBadge")));
            }
            if (item.running) badges.push(react.createElement("span", { className: "dsw-sm-badge dsw-sm-badge-run" }, t("runningBadge")));

            var sizeEl = item.missing && tab === "archived"
              ? null
              : react.createElement("span", { className: "dsw-sm-size" }, fmtSize(item.sizeBytes));

            var actionBtns = [];
            if (tab === "archived") {
              actionBtns.push(react.createElement("button", {
                className: "dsw-sm-btn",
                disabled: anyBusy || item.missing,
                onClick: function () { unarchive(item.id); }
              }, t("restore")));
            } else {
              actionBtns.push(react.createElement("button", {
                className: "dsw-sm-btn",
                disabled: anyBusy || item.archived || item.running,
                onClick: function () { archive(item.id); }
              }, t("archive")));
            }
            actionBtns.push(react.createElement("button", {
              className: "dsw-sm-btn dsw-sm-btn-danger",
              disabled: anyBusy || item.running,
              title: confirming ? t("deleteConfirmTitle") : t("deleteArmTitle"),
              onClick: function () { confirming ? doDelete(item.id, tab) : armDelete(item.id); }
            }, confirming ? t("confirm") : t("delete")));

            var firstCell = react.createElement("td", null, checkEl);
            var titleCell = react.createElement("td", null, titleEl, idEl, metaEl, pathEl);
            var statusCell = react.createElement("td", null, badges);
            var sizeCell = react.createElement("td", null, sizeEl);
            var actionCell = react.createElement("td", { className: "dsw-sm-actions" }, actionBtns);

            if (tab === "archived") {
              rows.push(react.createElement("tr", { key: item.id }, firstCell, titleCell, sizeCell, statusCell, actionCell));
            } else {
              var wsCell = react.createElement("td", null,
                item.workspaceTitle ? react.createElement("span", { className: "dsw-sm-meta" }, item.workspaceTitle) : react.createElement("span", { className: "dsw-sm-meta" }, "—")
              );
              rows.push(react.createElement("tr", { key: item.id }, firstCell, titleCell, wsCell, statusCell, actionCell));
            }

            if (expandedId === item.id) {
              rows.push(react.createElement("tr", { key: item.id + "-detail" },
                react.createElement("td", { colSpan: 5, style: { padding: "4px 10px 10px" } }, detailCell())
              ));
            }
          })(items[i]);
        }

        var headCheck = react.createElement("input", {
          type: "checkbox",
          checked: allSelected,
          disabled: anyBusy,
          onChange: function () { toggleSelectAll(); }
        });

        var headCols = [
          react.createElement("th", null, headCheck),
          react.createElement("th", null, t("session"))
        ];
        if (tab === "archived") {
          headCols.push(react.createElement("th", null, t("diskUsage")));
          headCols.push(react.createElement("th", null, t("status")));
        } else {
          headCols.push(react.createElement("th", null, t("workspace")));
          headCols.push(react.createElement("th", null, t("status")));
        }
        headCols.push(react.createElement("th", null, t("actions")));

        body = react.createElement("table", { className: "dsw-sm-table" },
          react.createElement("thead", null, react.createElement("tr", null, headCols)),
          react.createElement("tbody", null, rows)
        );
      }

      var errorEl = error
        ? react.createElement("div", { className: "dsw-sm-error" }, String(error))
        : null;
      var noticeEl = notice
        ? react.createElement("div", { className: "dsw-sm-meta", style: { marginBottom: "8px" } }, String(notice))
        : null;

      return react.createElement("div", { className: "dsw-sm-page" }, errorEl, noticeEl, tabs, header, confirmBar, body);
    }

    // ---------- plugin body ----------
    var inject = ["slots", "workspaces", "sessions", "timer", "locale"];

    function apply(ctx) {
      clientCtx = ctx;
      ensureStyle();
      ctx.effect(function () {
        return function () {
          try {
            var el = document.getElementById(STYLE_ID);
            if (el) el.remove();
          } catch (e) {
            // ignore
          }
        };
      }, "ui-session-manager: style cleanup");

      ctx.effect(function () {
        var offEn = ctx.locale.register(NS, "en", EN);
        var offZh = ctx.locale.register(NS, "zh", ZH);
        return function () {
          offEn();
          offZh();
        };
      }, "ui-session-manager: locale dictionaries");

      var t = ctx.locale.bind(NS);

      ctx.slots.inject("settings.section", function () {
        return ctx.slots.register(
          {
            name: "settings.section",
            // The stock settings shell maps this id to its archive glyph, so
            // the entry no longer falls back to the generic gear icon.
            id: "archived-sessions",
            order: 30,
            label: function () { return t("nav"); },
            locale: NS
          },
          function (slotProps) { return react.createElement(SessionManagerPage, slotProps); }
        );
      });
    }

    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  }
});
