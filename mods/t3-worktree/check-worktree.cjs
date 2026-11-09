// Loads the dialog in a fake `herdr`: a new worktree opens with a branch name filled in and lit, and nothing else does.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

// Every element method returns the same chain: only what the dialog keeps in its fields is looked at.
const chain = new Proxy(function () {}, { get: () => chain, apply: () => chain });
let openProps = {};
const selections = [], timers = [], pending = [];
const cx = { notify() {}, spawn: (f) => { pending.push(f(cx)); }, focus_handle: () => ({ focus() {} }), timer: { after: (_ms, f) => { timers.push(f); } } };
const context = vm.createContext({
  View: class {}, div: () => chain, v_flex: () => chain, h_flex: () => chain, Input: { new: () => chain }, Scrollbar: chain,
  InputState: { new: ({ value = "" } = {}) => { let text = value; return { on() {}, value: () => text, set_value(v) { text = v; }, focus() {}, set_selected_range(r) { selections.push(r); } }; } },
  run() {}, closeOverlay() {}, props: () => openProps, theme: () => ({}), spaces: () => [], panes: () => [], home: () => "/home/me",
  exec: async () => ({ code: 1, stdout: "", stderr: "" }),
});
const src = fs.readFileSync(path.join(__dirname, "main.js"), "utf8").replace(/^import .*;\r?\n/gm, "").replace("export default class", "globalThis.Mod = class");
vm.runInContext(src, context);
const open = (p) => { openProps = p; selections.length = 0; timers.length = 0; const m = new context.Mod(); m.init({}, cx); return m; };

(async () => {
  // A new worktree: herdr-MMDD-xxxx is in the field, what follows `herdr-` lit, and lit again once the dialog has the keyboard for good.
  let m = open({ space: "s", action: "new" });
  const name = m.input.value();
  assert.match(name, /^herdr-\d{4}-[a-z0-9]{4}$/);
  assert.equal(m.text, name, "what Enter creates is what the field shows");
  assert.deepEqual(JSON.parse(JSON.stringify(selections)), [{ start: "herdr-".length, end: name.length }], "typing keeps the prefix");
  timers.splice(0).forEach((f) => f());
  assert.equal(selections.length, 2);
  // Typed since: the late focus doesn't select what they wrote.
  m = open({ space: "s", action: "new" });
  m.input.set_value("mine");
  timers.splice(0).forEach((f) => f());
  assert.equal(selections.length, 1);
  // Two dialogs differ.
  assert.notEqual(open({ space: "s", action: "new" }).input.value(), open({ space: "s", action: "new" }).input.value());
  // Open and Remove take no name; a caller's branch is kept as given.
  assert.equal(open({ space: "s", action: "open" }).input.value(), "");
  assert.equal(open({ space: "s", action: "remove" }).input.value(), "");
  m = open({ space: "s", action: "new", branch: "fix-it" });
  assert.equal(m.input.value(), "fix-it");
  assert.deepEqual(selections, []);
  await Promise.all(pending.splice(0));
  console.log("ok worktree");
})().catch((e) => { console.error(e); process.exit(1); });
