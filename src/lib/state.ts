// Creating, loading and repairing the player's state.
import type { AppState, Rank, Tree } from "./types";
import { seedDisciplines } from "../content/disciplines";
import { uid } from "./game";

export const STORE_KEY = "ardrix-state-v2";

export function freshState(now = Date.now()): AppState {
  return {
    version: 2,
    profile: { name: "", onboarded: false, createdAt: now },
    trees: [],
    disciplines: seedDisciplines(),
    sideQuests: [],
    events: [],
    updatedAt: 0,
  };
}

const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);

/** Fills in anything missing so older or partial data never crashes the app. */
export function normalize(raw: unknown): AppState {
  const base = freshState();
  if (!isObj(raw)) return base;
  const s = raw as Partial<AppState>;
  const disc = isObj(s.disciplines) && Array.isArray(s.disciplines.areas) ? s.disciplines : base.disciplines;
  return {
    version: 2,
    profile: { ...base.profile, ...(isObj(s.profile) ? s.profile : {}) },
    trees: Array.isArray(s.trees) ? s.trees.filter(isObj).map(fixTree) : [],
    disciplines: { enabled: disc.enabled !== false, areas: disc.areas, log: disc.log || {}, swaps: disc.swaps || {} },
    sideQuests: Array.isArray(s.sideQuests) ? s.sideQuests : [],
    events: Array.isArray(s.events) ? s.events.map((e) => ({ ...e, skips: e.skips || [], done: e.done || {} })) : [],
    updatedAt: typeof s.updatedAt === "number" ? s.updatedAt : 0,
  };
}

function fixTree(t: Tree): Tree {
  return {
    ...t,
    id: t.id || uid(),
    icon: t.icon || "⭐",
    source: t.source || "custom",
    desc: t.desc || "",
    createdAt: t.createdAt || Date.now(),
    capstone: t.capstone || { text: "", done: false },
    branches: (t.branches || []).map((b) => ({
      ...b,
      skills: (b.skills || []).map((s) => ({ ...s, rank: (s.rank || "E") as Rank, quests: s.quests || [] })),
    })),
  };
}

export function loadLocal(): AppState {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return normalize(JSON.parse(raw));
  } catch { /* fall through to a fresh start */ }
  return freshState();
}

export function saveLocal(state: AppState) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch { /* storage full or blocked */ }
}

/** Counts real progress, used to decide whether to ask before replacing data. */
export function progressCount(s: AppState) {
  let n = Object.keys(s.disciplines.log).length + s.sideQuests.filter((q) => q.done).length;
  for (const t of s.trees) for (const b of t.branches) for (const sk of b.skills) n += sk.quests.filter((q) => q.done).length;
  return n;
}
