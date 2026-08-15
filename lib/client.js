window.__ModuleLoader__.load({
  id: "@dshwp/dsh-session-manager",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    let react = require("react");

    // ---------- styles ----------
    var STYLE_ID = "dsw-sm-style";
    var CSS =
      ".dsw-sm-page{font-size:13px;padding:2px 2px 24px;}" +
      ".dsw-sm-tabs{display:flex;gap:6px;margin-bottom:12px;border-bottom:1px solid var(--dsw-alias-border-l1);}" +
      ".dsw-sm-tab{background:transparent;border:none;color:var(--dsw-alias-label-secondary);font-size:13px;padding:6px 12px;cursor:pointer;border-bottom:2px solid transparent;}" +
      ".dsw-sm-tab-active{color:var(--dsw-alias-label-primary);border-bottom-color:var(--dsw-alias-brand-primary);font-weight:600;}" +
      ".dsw-sm-toolbar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px;}" +
      ".dsw-sm-page-title{font-weight:600;color:var(--dsw-alias-label-primary);}" +
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
          var err = new Error("请求失败：服务返回了无效响应");
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

    function fmtTime(ms) {
      if (!ms) return "—";
      try {
        return new Date(ms).toLocaleString();
      } catch (e) {
        return String(ms);
      }
    }

    // ---------- page component ----------
    function SessionManagerPage() {
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
          return sel.filter(function (id) { return ids[id]; });
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
        try {
          if (ctx.workspaces && typeof ctx.workspaces.refresh === "function") {
            var p = ctx.workspaces.refresh();
            if (p && typeof p.catch === "function") p.catch(function () {});
          }
        } catch (e) {
          // ignore
        }
        try {
          if (ctx.sessions && typeof ctx.sessions.refresh === "function") {
            var p2 = ctx.sessions.refresh();
            if (p2 && typeof p2.catch === "function") p2.catch(function () {});
          }
        } catch (e) {
          // ignore
        }
      }

      function reloadAfterAction(kind) {
        refreshViews();
        return api(kind === "archived" ? "archived/list" : "sessions/list", {}).then(function (res) {
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

      // Two-step delete: 删除 -> 确认 (auto-reverts after 5s).
      function armDelete(id) {
        setConfirmId(id);
        try {
          if (ctx.timer && typeof ctx.timer.timeout === "function") {
            ctx.timer.timeout(function () {
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
        api("sessions/delete", { sessionId: id })
          .then(function () { return reloadAfterAction(kind); })
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
          var label = actionLabel || (method === "sessions/delete" ? "删除" : "释放");
          var parts = [label + "完成：" + String(ids.length - failed.length) + " 个成功"];
          if (failed.length > 0) {
            parts.push(String(failed.length) + " 个失败");
            setError((method === "sessions/delete" ? "删除" : "释放") + "失败 " + failed.length + " 个会话：" + failed.map(function (f) { return f.id + "（" + f.error + "）"; }).join("；"));
          }
          if (skipped && skipped.length > 0) parts.push("跳过 " + String(skipped.length) + " 个（运行中/打开的会话）");
          setNotice(parts.join("，"));
          refreshViews();
          return Promise.all([api("archived/list", {}), api("sessions/list", {})]);
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

      function releaseAll() { runBatch(archivedItems.map(function (item) { return item.id; }), "archived/unarchive", "archived", "一键恢复"); }
      function clearAll() { runBatch(archivedItems.map(function (item) { return item.id; }), "sessions/delete", "archived", "清空归档"); }
      function releaseSelected() { runBatch(selected, "archived/unarchive", "archived", "恢复选中"); }
      function deleteSelected(kind) { runBatch(selected, "sessions/delete", kind, "删除选中"); }
      function deleteAll() {
        var ids = deletableIds();
        var skipped = items.filter(function (item) { return item.running || item.live; }).map(function (item) { return item.id; });
        runBatch(ids, "sessions/delete", "all", "删除全部", skipped);
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
          return react.createElement("div", { className: "dsw-sm-detail" }, "加载会话内容中…");
        }
        if (detail.error) {
          return react.createElement("div", { className: "dsw-sm-detail" }, String(detail.error));
        }
        var d = detail.data;
        if (!d || !Array.isArray(d.messages)) {
          return react.createElement("div", { className: "dsw-sm-detail" }, "没有可显示的内容");
        }
        var headParts = [];
        if (d.createdAt) headParts.push("创建于 " + fmtTime(d.createdAt));
        if (d.cwd) headParts.push(d.cwd);
        var headEl = react.createElement("div", { className: "dsw-sm-detail-head" },
          react.createElement("span", { className: "dsw-sm-page-title" }, "会话内容"),
          react.createElement("span", { className: "dsw-sm-meta" }, " · " + headParts.join(" · "))
        );
        var noteEl = react.createElement("div", { className: "dsw-sm-detail-note" },
          "共 " + String(d.totalEvents) + " 条事件，提取 " + String(d.messageCount) + " 条消息" + (d.truncated ? "（仅显示前 100 条）" : "")
        );
        var msgs = d.messages.map(function (m) {
          var roleLabel = m.role === "user" ? "用户" : m.role === "assistant" ? "助手" : "工具";
          return react.createElement("div", { className: "dsw-sm-msg dsw-sm-msg-" + m.role },
            react.createElement("span", { className: "dsw-sm-msg-role" }, roleLabel),
            react.createElement("span", { className: "dsw-sm-msg-time" }, fmtTime(m.time)),
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
        react.createElement("button", { className: "dsw-sm-tab" + (tab === "archived" ? " dsw-sm-tab-active" : ""), onClick: function () { setTab("archived"); } }, "归档会话"),
        react.createElement("button", { className: "dsw-sm-tab" + (tab === "all" ? " dsw-sm-tab-active" : ""), onClick: function () { setTab("all"); } }, "全部会话")
      );

      var header = null;
      if (tab === "archived") {
        header = react.createElement("div", { className: "dsw-sm-toolbar" },
          react.createElement("span", { className: "dsw-sm-page-title" }, "归档会话"),
          react.createElement("span", { className: "dsw-sm-meta" },
            String(items.length) + " 个会话 · 共 " + fmtSize(totalBytes) + (loading ? " · 加载中…" : "") + (batchBusy ? " · 批量操作中…" : "")),
          react.createElement("button", { className: "dsw-sm-btn", disabled: anyBusy, onClick: function () { load("archived"); } }, "刷新"),
          react.createElement("button", { className: "dsw-sm-btn", disabled: anyBusy || items.length === 0, onClick: releaseAll }, "一键恢复"),
          react.createElement("button", { className: "dsw-sm-btn dsw-sm-btn-danger", disabled: anyBusy || items.length === 0, onClick: function () { setBatchConfirm("clear"); } }, "清空归档")
        );
      } else {
        var allDeletable = items.filter(function (item) { return !item.running && !item.live; }).length;
        var allSkipped = items.length - allDeletable;
        header = react.createElement("div", { className: "dsw-sm-toolbar" },
          react.createElement("span", { className: "dsw-sm-page-title" }, "全部会话"),
          react.createElement("span", { className: "dsw-sm-meta" },
            String(items.length) + " 个会话" + (allSkipped > 0 ? "（其中 " + String(allSkipped) + " 个运行中/已打开，需单独处理）" : "") + (loading ? " · 加载中…" : "") + (batchBusy ? " · 批量操作中…" : "")),
          react.createElement("button", { className: "dsw-sm-btn", disabled: anyBusy, onClick: function () { load("all"); } }, "刷新"),
          react.createElement("button", { className: "dsw-sm-btn dsw-sm-btn-danger", disabled: anyBusy || allDeletable === 0, onClick: function () { setBatchConfirm("deleteAll"); } }, "删除全部")
        );
      }

      var confirmBar = null;
      if (batchConfirm === "clear") {
        confirmBar = react.createElement("div", { className: "dsw-sm-selectbar" },
          react.createElement("span", { className: "dsw-sm-meta", style: { color: "var(--dsw-alias-state-warn-primary)" } }, "确认清空全部 " + String(archivedItems.length) + " 个归档会话？此操作会从硬盘删除且不可恢复。"),
          react.createElement("button", { className: "dsw-sm-btn dsw-sm-btn-danger", disabled: anyBusy, onClick: clearAll }, "确认清空"),
          react.createElement("button", { className: "dsw-sm-btn", disabled: anyBusy, onClick: function () { setBatchConfirm(null); } }, "取消")
        );
      } else if (batchConfirm === "deleteAll") {
        var delIds = deletableIds();
        var delSkipped = items.length - delIds.length;
        confirmBar = react.createElement("div", { className: "dsw-sm-selectbar" },
          react.createElement("span", { className: "dsw-sm-meta", style: { color: "var(--dsw-alias-state-warn-primary)" } },
            "确认删除全部 " + String(delIds.length) + " 个会话" + (delSkipped > 0 ? "（跳过 " + String(delSkipped) + " 个运行中/已打开的会话）" : "") + "？此操作会从硬盘删除且不可恢复。"),
          react.createElement("button", { className: "dsw-sm-btn dsw-sm-btn-danger", disabled: anyBusy || delIds.length === 0, onClick: deleteAll }, "确认删除全部"),
          react.createElement("button", { className: "dsw-sm-btn", disabled: anyBusy, onClick: function () { setBatchConfirm(null); } }, "取消")
        );
      } else if (batchConfirm === "delete") {
        confirmBar = react.createElement("div", { className: "dsw-sm-selectbar" },
          react.createElement("span", { className: "dsw-sm-meta", style: { color: "var(--dsw-alias-state-warn-primary)" } }, "确认删除选中的 " + String(selected.length) + " 个会话？此操作不可恢复。"),
          react.createElement("button", { className: "dsw-sm-btn dsw-sm-btn-danger", disabled: anyBusy, onClick: function () { deleteSelected(tab); } }, "确认删除"),
          react.createElement("button", { className: "dsw-sm-btn", disabled: anyBusy, onClick: function () { setBatchConfirm(null); } }, "取消")
        );
      } else if (selected.length > 0) {
        var selectActions = [react.createElement("span", { className: "dsw-sm-meta" }, "已选择 " + String(selected.length) + " 个会话")];
        if (tab === "archived") {
          selectActions.push(react.createElement("button", { className: "dsw-sm-btn", disabled: anyBusy, onClick: releaseSelected }, "恢复选中"));
        }
        selectActions.push(react.createElement("button", { className: "dsw-sm-btn dsw-sm-btn-danger", disabled: anyBusy, onClick: function () { setBatchConfirm("delete"); } }, "删除选中"));
        selectActions.push(react.createElement("button", { className: "dsw-sm-btn", disabled: anyBusy, onClick: function () { setSelected([]); } }, "取消选择"));
        confirmBar = react.createElement("div", { className: "dsw-sm-selectbar" }, selectActions);
      }

      var body;
      if (loading && items.length === 0) {
        body = react.createElement("div", { className: "dsw-sm-empty" }, "加载中…");
      } else if (items.length === 0) {
        body = react.createElement("div", { className: "dsw-sm-empty" },
          tab === "archived" ? "没有已归档的会话" : "没有任何会话"
        );
      } else {
        var allSelected = selected.length === items.length;
        var rows = [];
        for (var i = 0; i < items.length; i++) {
          (function (item) {
            var isBusy = busy === "delete:" + item.id || busy === "unarchive:" + item.id || busy === "archive:" + item.id;
            var confirming = confirmId === item.id;
            var metaParts = [];
            if (item.createdAt) metaParts.push("创建于 " + fmtTime(item.createdAt));
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
              title: "点击查看会话内容",
              onClick: function () { toggleDetail(item.id); }
            }, chevron + (item.title || "(无标题)"));
            var idEl = react.createElement("div", { className: "dsw-sm-id" }, item.id);
            var metaEl = react.createElement("div", { className: "dsw-sm-meta" }, metaParts.join(" · "));
            var pathEl = item.path
              ? react.createElement("div", { className: "dsw-sm-path" }, item.path)
              : null;

            var badges = [];
            if (tab === "archived") {
              if (item.missing) badges.push(react.createElement("span", { className: "dsw-sm-badge" }, "文件缺失"));
            } else {
              if (item.archived) badges.push(react.createElement("span", { className: "dsw-sm-badge" }, "已归档"));
              if (item.live) badges.push(react.createElement("span", { className: "dsw-sm-badge dsw-sm-badge-ok" }, "活跃"));
            }
            if (item.running) badges.push(react.createElement("span", { className: "dsw-sm-badge dsw-sm-badge-run" }, "运行中"));

            var sizeEl = item.missing && tab === "archived"
              ? null
              : react.createElement("span", { className: "dsw-sm-size" }, fmtSize(item.sizeBytes));

            var actionBtns = [];
            if (tab === "archived") {
              actionBtns.push(react.createElement("button", {
                className: "dsw-sm-btn",
                disabled: anyBusy || item.missing,
                onClick: function () { unarchive(item.id); }
              }, "恢复"));
            } else {
              actionBtns.push(react.createElement("button", {
                className: "dsw-sm-btn",
                disabled: anyBusy || item.archived || item.running,
                onClick: function () { archive(item.id); }
              }, "归档"));
            }
            actionBtns.push(react.createElement("button", {
              className: "dsw-sm-btn dsw-sm-btn-danger",
              disabled: anyBusy || item.running,
              title: confirming ? "再次点击确认删除（5 秒后自动取消）" : "删除（需再次点击确认）",
              onClick: function () { confirming ? doDelete(item.id, tab) : armDelete(item.id); }
            }, confirming ? "确认" : "删除"));

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
          react.createElement("th", null, "会话")
        ];
        if (tab === "archived") {
          headCols.push(react.createElement("th", null, "磁盘占用"));
          headCols.push(react.createElement("th", null, "状态"));
        } else {
          headCols.push(react.createElement("th", null, "工作区"));
          headCols.push(react.createElement("th", null, "状态"));
        }
        headCols.push(react.createElement("th", null, "操作"));

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
    var inject = ["slots", "workspaces", "sessions", "timer"];

    function apply(ctx) {
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

      ctx.slots.inject("settings.section", function () {
        return ctx.slots.register(
          { name: "settings.section", id: "session-manager", order: 30, label: function () { return "会话管理"; } },
          function () { return react.createElement(SessionManagerPage); }
        );
      });
    }

    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  }
});
