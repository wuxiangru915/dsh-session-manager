/**
 * Client-half smoke test for @dshwp/dsh-session-manager.
 *
 * Loads lib/client.js in a vm with a tiny window/document/react/cordis stub,
 * then verifies that the Settings section registers with the archive glyph id
 * and that both locale dictionaries are complete and drive the entry label.
 *
 * Run: node test/client.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../lib/client.js", import.meta.url), "utf8");

let definition = null;
const dictionaries = new Map();
const registrations = [];
const effects = [];
let active = "zh";

function translate(key, params) {
  const dict = dictionaries.get(active) || dictionaries.get("en") || {};
  const template = Object.prototype.hasOwnProperty.call(dict, key) ? dict[key] : key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match
  );
}

const locale = {
  register(namespace, language, dict) {
    dictionaries.set(language, dict);
    return () => {};
  },
  bind() {
    return translate;
  },
  subscribe() {
    return () => {};
  },
  getSnapshot() {
    return { active, locales: [{ id: "en", label: "English" }, { id: "zh", label: "中文" }], revision: 1 };
  }
};

const slots = {
  inject(_name, cb) {
    effects.push(cb);
    return cb();
  },
  register(options, component) {
    registrations.push({ options, component });
    return { dispose() {} };
  }
};

const ctx = {
  locale,
  slots,
  workspaces: { refresh() {} },
  sessions: { refresh() {} },
  timer: { timeout() {} },
  effect(cb) {
    effects.push(cb);
    const disposer = cb();
    return () => {
      if (typeof disposer === "function") disposer();
    };
  }
};

const react = {
  createElement(type, props, ...children) {
    return { type, props, children };
  },
  useState(initial) {
    let value = typeof initial === "function" ? initial() : initial;
    return [
      value,
      (next) => {
        value = typeof next === "function" ? next(value) : next;
      }
    ];
  },
  useEffect() {}
};

const sandbox = {
  window: {
    __ModuleLoader__: {
      load(def) {
        definition = def;
      }
    }
  },
  document: {
    getElementById() {
      return null;
    },
    createElement() {
      return {};
    },
    head: { appendChild() {} }
  },
  console,
  fetch: () => Promise.reject(new Error("network disabled in test")),
  setTimeout,
  clearTimeout,
  URL
};
sandbox.globalThis = sandbox;
vm.runInNewContext(source, sandbox, { filename: "lib/client.js" });

assert.ok(definition, "client bundle calls window.__ModuleLoader__.load");
assert.equal(definition.id, "@dshwp/dsh-session-manager");

const module = definition.factory((name) => {
  assert.equal(name, "react");
  return react;
});
assert.equal(typeof module.apply, "function");
assert.deepEqual([...module.inject], ["slots", "workspaces", "sessions", "timer", "locale"]);

module.apply(ctx);

assert.equal(dictionaries.size, 2, "registers both English and Chinese dictionaries");
const enKeys = Object.keys(dictionaries.get("en")).sort();
const zhKeys = Object.keys(dictionaries.get("zh")).sort();
assert.deepEqual(zhKeys, enKeys, "English and Chinese dictionaries carry the same keys");
assert.ok(enKeys.length >= 60, "dictionary covers the page copy (" + enKeys.length + " keys)");

assert.equal(registrations.length, 1, "registers exactly one settings section");
const { options } = registrations[0];
assert.equal(options.name, "settings.section");
assert.equal(options.id, "archived-sessions", "uses the settings shell's archive glyph id");
assert.equal(options.locale, "settings.sessionManager");
assert.equal(typeof options.label, "function");
assert.equal(options.label(), "会话管理");
active = "en";
assert.equal(options.label(), "Session Manager");

console.log("ok - client bundle loads and exposes apply/inject");
console.log("ok - locale dictionaries are complete (" + enKeys.length + " keys) and bilingual");
console.log("ok - settings section uses id 'archived-sessions' and follows the active locale");
console.log("\n3 checks passed");
