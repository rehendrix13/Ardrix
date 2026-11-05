// Ardrix game rules: XP, levels, ranks, unlocking, side quests, calendar events and
// daily disciplines. Everything here is pure (no React, no storage) so it can be tested.
import type { AppState, Branch, CalEvent, DisciplineArea, Rank, Repeat, SideQuest, SideRank, Skill, Tree } from "./types";
import { DAY_MS, dayKey, keyToUTC, toMin } from "./dates";

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export const RANKS: Rank[] = ["E", "D", "C", "B", "A", "S"];
export const RANK_XP: Record<Rank, number> = { E: 10, D: 15, C: 20, B: 25, A: 30, S: 50 };
export const CAPSTONE_XP = 100;
export const XP_PER_LEVEL = 50;
export const DISC_XP = 15;
export const MEETING_XP = 3;

/* ---------- levels & titles ---------- */
export const levelFor = (xp: number) => 1 + Math.floor(Math.max(0, xp) / XP_PER_LEVEL);
export const levelProgress = (xp: number) => (Math.max(0, xp) % XP_PER_LEVEL) / XP_PER_LEVEL;
const TITLES: [number, string][] = [[50, "Legend"], [35, "Master"], [20, "Expert"], [10, "Adept"], [5, "Apprentice"], [1, "Novice"]];
export const titleFor = (level: number) => (TITLES.find(([min]) => level >= min) ?? TITLES[TITLES.length - 1])[1];

/* ---------- skill trees ---------- */
export const skillDone = (s: Skill) => s.quests.length > 0 && s.quests.every((q) => q.done);
/** Skills unlock in order inside a branch: the first is always open. */
export const skillOpen = (b: Branch, i: number) => i === 0 || skillDone(b.skills[i - 1]);
export const treeComplete = (t: Tree) =>
  t.branches.some((b) => b.skills.length) && t.branches.every((b) => b.skills.every(skillDone));

export function treeStats(t: Tree) {
  let xp = 0, max = 0, done = 0, total = 0;
  for (const b of t.branches) for (const s of b.skills) for (const q of s.quests) {
    total++; max += RANK_XP[s.rank];
    if (q.done) { done++; xp += RANK_XP[s.rank]; }
  }
  if (t.capstone.text) { total++; max += CAPSTONE_XP; if (t.capstone.done) { done++; xp += CAPSTONE_XP; } }
  return { xp, max, done, total, pct: max ? xp / max : 0 };
}

export function treeRank(t: Tree): { rank: Rank; line: string } {
  const { pct } = treeStats(t);
  if (t.capstone.done) return { rank: "S", line: "Capstone cleared. Mastery." };
  if (pct >= 0.75) return { rank: "A", line: "Elite. The capstone awaits." };
  if (pct >= 0.5) return { rank: "B", line: "Halfway up the mountain." };
  if (pct >= 0.3) return { rank: "C", line: "Solid fundamentals, growing fast." };
  if (pct >= 0.12) return { rank: "D", line: "The fire is lit." };
  return { rank: "E", line: "Clear quests to rank up." };
}

/** The next quests you can do right now: first unfinished quest of each open skill. */
export function nextQuests(state: AppState, limit = 3) {
  const out: { tree: Tree; skill: Skill; questId: string; text: string }[] = [];
  for (const tree of state.trees) for (const b of tree.branches) {
    const i = b.skills.findIndex((s) => !skillDone(s));
    if (i < 0 || !skillOpen(b, i)) continue;
    const skill = b.skills[i], q = skill.quests.find((x) => !x.done);
    if (q) out.push({ tree, skill, questId: q.id, text: q.text });
  }
  return out.slice(0, limit);
}

export function findQuest(state: AppState, questId: string) {
  for (const tree of state.trees) for (const branch of tree.branches) for (const skill of branch.skills) {
    const quest = skill.quests.find((q) => q.id === questId);
    if (quest) return { tree, branch, skill, quest };
  }
  return null;
}

/* ---------- side quests ---------- */
export const SIDE_RANKS: SideRank[] = ["E", "C", "A", "S"];
export const sideBonusXP = (q: Pick<SideQuest, "rank">) => Math.round(RANK_XP[q.rank] * 1.1);
/** After 24 hours overdue and still not done: lose 10 XP per day. */
export function sidePenalty(q: SideQuest, now = Date.now()) {
  const end = q.done ? q.completedAt ?? now : now, over = end - q.dueAt;
  return over >= DAY_MS ? Math.floor(over / DAY_MS) * 10 : 0;
}
export const isOverdue = (q: SideQuest, now = Date.now()) => !q.done && q.dueAt < now;

export function nextDue(ms: number, rep: Repeat) {
  const d = new Date(ms);
  if (rep === "daily") d.setDate(d.getDate() + 1);
  else if (rep === "weekdays") { do d.setDate(d.getDate() + 1); while (d.getDay() === 0 || d.getDay() === 6); }
  else if (rep === "weekly") d.setDate(d.getDate() + 7);
  else if (rep === "biweekly") d.setDate(d.getDate() + 14);
  else if (rep === "monthly") {
    const day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + 1);
    d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
  }
  return d.getTime();
}

/** Completes a side quest in place. Returns the next occurrence if it repeats. */
export function completeSide(q: SideQuest, now = Date.now()): SideQuest | null {
  q.done = true; q.completedAt = now;
  q.xp = now <= q.dueAt ? sideBonusXP(q) : 0;
  if (!q.repeat) return null;
  let due = nextDue(q.dueAt, q.repeat);
  while (due <= now) due = nextDue(due, q.repeat);
  return { id: uid(), title: q.title, desc: q.desc, rank: q.rank, repeat: q.repeat, dueAt: due, createdAt: now, done: false };
}

/* ---------- calendar events ---------- */
export function occursOn(e: CalEvent, k: string) {
  if (k < e.date || e.skips.includes(k)) return false;
  if (!e.repeat) return k === e.date;
  const a = keyToUTC(e.date), b = keyToUTC(k), dow = new Date(b).getUTCDay(), diff = Math.round((b - a) / DAY_MS);
  if (e.repeat === "daily") return true;
  if (e.repeat === "weekdays") return dow >= 1 && dow <= 5;
  if (e.repeat === "weekly") return diff % 7 === 0;
  if (e.repeat === "biweekly") return diff % 14 === 0;
  if (e.repeat === "monthly") return new Date(a).getUTCDate() === new Date(b).getUTCDate();
  return false;
}
export const eventXP = (e: CalEvent) => (e.kind === "meeting" ? MEETING_XP : e.xp);
export const eventsOn = (events: CalEvent[], k: string) =>
  events.filter((e) => occursOn(e, k)).sort((x, y) => toMin(x.start) - toMin(y.start));
export const eventStarted = (e: CalEvent, k: string, now = Date.now()) => now >= new Date(`${k}T${e.start}`).getTime();

/* ---------- daily disciplines ---------- */
const weekIndex = (d: Date) => Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY_MS + 3) / 7);
export const areaForDay = (areas: DisciplineArea[], dow: number) => areas.find((a) => a.day === dow);

/** Today's discipline: the weekday's area, with its task rotating weekly (or swapped). */
export function disciplineFor(state: AppState, d = new Date()) {
  const { disciplines } = state;
  if (!disciplines.enabled) return null;
  const area = areaForDay(disciplines.areas, d.getDay());
  if (!area || !area.tasks.length) return null;
  const key = dayKey(d), idx = (disciplines.swaps[key] ?? weekIndex(d)) % area.tasks.length;
  return { area, idx, text: area.tasks[idx], key, entry: disciplines.log[key] };
}

export function statPoints(state: AppState) {
  const pts: Record<string, number> = {};
  for (const a of state.disciplines.areas) pts[a.id] = 0;
  for (const e of Object.values(state.disciplines.log)) if (e.areaId in pts) pts[e.areaId]++;
  return pts;
}

export function disciplineStreak(state: AppState, from = new Date()) {
  const log = state.disciplines.log; let s = 0; const d = new Date(from);
  if (!log[dayKey(d)]) d.setDate(d.getDate() - 1);
  while (log[dayKey(d)]) { s++; d.setDate(d.getDate() - 1); }
  return s;
}

/* ---------- totals ---------- */
export function xpBreakdown(state: AppState, now = Date.now()) {
  const trees = state.trees.reduce((a, t) => a + treeStats(t).xp, 0);
  const disciplines = Object.keys(state.disciplines.log).length * DISC_XP;
  const side = state.sideQuests.reduce((a, q) => a + (q.done ? q.xp ?? 0 : 0) - sidePenalty(q, now), 0);
  const events = state.events.reduce((a, e) => a + Object.keys(e.done).length * eventXP(e), 0);
  return { trees, disciplines, side, events, total: Math.max(0, trees + disciplines + side + events) };
}
export const totalXP = (state: AppState, now = Date.now()) => xpBreakdown(state, now).total;

/** Days with any completed activity, for the overall streak. */
export function activeDays(state: AppState) {
  const days = new Set<string>(Object.keys(state.disciplines.log));
  for (const t of state.trees) for (const b of t.branches) for (const s of b.skills) for (const q of s.quests)
    if (q.done && q.completedAt && !q.assessed) days.add(dayKey(new Date(q.completedAt)));
  for (const q of state.sideQuests) if (q.done && q.completedAt) days.add(dayKey(new Date(q.completedAt)));
  for (const e of state.events) for (const k of Object.keys(e.done)) days.add(k);
  return days;
}
export function streak(state: AppState, from = new Date()) {
  const days = activeDays(state); let s = 0; const d = new Date(from);
  if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1);
  while (days.has(dayKey(d))) { s++; d.setDate(d.getDate() - 1); }
  return s;
}
