// What a terminal is on, one rule for Inbox cards, the agents list, tabs and pane headers:
// its Pi session while Pi runs, then (agents only) a tab someone named, then a telling terminal title, else the program.
// A tab's name is its one agent's: with two in the tab, or for a sub-agent, it would name them alike, as Herdr's agents list stopped doing.
// A terminal with no title of its own reports its address (t9) as one: that tells nothing.
// An agent's own title, read in Korean: t3-tabs translates the titles in view and keeps them in shared("t3-korean.names").
import { terminals, spaces, shared, agents } from "herdr";

const clean = (s) => (s ?? "").replace(/^[^\p{L}\p{N}]+/u, "").trim();
const HANGUL = /\p{Script=Hangul}/u;
// Agents' own title marks, by program (the key their status report names): Pi's "π - <session> - <folder>",
// OpenCode's "OC | <session>". Only theirs come off: another agent's title that happens to look alike stays.
// omp (Pi's fork) leads with "π", its state glyph and the session's icon ("π > 󰐱 EXT: …", "π :. 👥 HERDR: …"): all of it is the mark.
const MARK = { pi: /^π[^\p{L}\p{N}]*/u, opencode: /^OC \| / };
const OWN = {
  pi: (s, folder) => { s = s.replace(MARK.pi, ""); return folder && s.endsWith(` - ${folder}`) ? s.slice(0, -folder.length - 3) : s; },
  opencode: (s) => s.replace(MARK.opencode, ""),
};

// What a pane runs, for its icon: its program, or for a mod pane what its mod gives in shared("<mod>.program") ({ icon, tint }).
export const programOf = (x) => x.mod ? shared(`${x.mod}.program`) ?? null : x.program;

// What a mod pane reports of its tab in shared("<mod>.status"), as the word an agent would.
export const modStatus = (x) => shared(`${x.mod}.status`)?.[x.tab] ?? null;

// An agent's own words in Korean once t3-tabs has them; until then, and for a title already in Korean, as it came.
const inKorean = (s) => HANGUL.test(s) ? s : shared("t3-korean.names")?.[s] ?? s;

// One snapshot's rule. `say` takes the agent's own words (a Pi session, a terminal title) and returns what to show.
function rule(say) {
  const term = new Map(terminals().map((k) => [k.address, k]));
  const tabs = new Map(spaces().flatMap((s) => s.tabs.map((c) => [c.id, { ...c, space: s.name }])));
  const sub = (address) => term.get(term.get(address)?.parent)?.state === "live";
  const leads = new Map();
  for (const a of agents()) if (!sub(a.address)) leads.set(a.tab, (leads.get(a.tab) ?? 0) + 1);
  return (x) => {
    // A mod pane goes by the title its mod gives it in shared("<mod>.titles"), keyed by its tab; else its folder name.
    if (x.mod) return shared(`${x.mod}.titles`)?.[x.tab] || x.title;
    const address = x.address ?? x.terminal;
    const tab = tabs.get(x.tab);
    // A title that only names the folder (Codex's project, Pi with no session) says what the space already does.
    const folder = (term.get(address)?.cwd ?? x.cwd ?? "").split(/[\\/]/).pop();
    // omp's program key isn't Pi's, but its title wears Pi's mark.
    const own = OWN[x.program?.key] ?? (x.program?.agent && MARK.pi.test(clean(x.title)) ? OWN.pi : undefined);
    // An agent's session and title outlive it: lazygit, started after Pi in the same shell, sets no title and
    // would read as Pi's session. Not an agent and in an agent's marks, the title is one left behind.
    const left = !x.program?.agent && Object.values(MARK).some((m) => m.test(clean(x.title)));
    const live = left ? "" : own ? own(clean(x.title), folder) : clean(x.title);
    const telling = live && live !== x.program?.name && live.toLowerCase() !== x.program?.key
      && !/^[~/]|^[A-Za-z]:\\/.test(live) && !live.includes("@") && live !== address
      && live !== folder && live !== (x.space_name ?? tab?.space);
    const session = x.program?.key === "pi" && term.get(address)?.labels?.["pi.session"];
    return (session && say(session)) || (x.status != null && tab?.named && !sub(address) && (leads.get(x.tab) ?? 0) < 2 && tab.name)
      || (telling && say(live)) || x.program?.name || address || "shell";
  };
}

// Snapshot once per render; the returned function takes an agent or a pane (status set = an agent).
export function namer() {
  return rule(inKorean);
}

// The agents' own words the list shows right now that aren't Korean yet: what t3-tabs has translated.
export function untranslated() {
  const words = new Set();
  const name = rule((s) => { if (!HANGUL.test(s)) words.add(s); return s; });
  for (const a of agents()) name(a);
  return [...words].filter((s) => shared("t3-korean.names")?.[s] == null);
}
