// Ardrix data model. Everything a player owns lives in one AppState object,
// saved on the device and synced to their account as a single JSON document.

export type Rank = "E" | "D" | "C" | "B" | "A" | "S";

export interface Note { id: string; text: string; at: number }

export interface Quest {
  id: string;
  text: string;
  done: boolean;
  completedAt?: number;
  /** Marked done during the self-assessment instead of by completing it. */
  assessed?: boolean;
  notes?: Note[];
}

export interface Skill {
  id: string;
  rank: Rank;
  name: string;
  /** Short "how to start" pointer shown under the skill. */
  tip?: string;
  quests: Quest[];
}

export interface Branch { id: string; name: string; desc: string; skills: Skill[] }

export interface Tree {
  id: string;
  name: string;
  desc: string;
  icon: string;
  /** Which template it came from, or "custom" for the goal builder. */
  source: string;
  capstone: { text: string; done: boolean; completedAt?: number };
  branches: Branch[];
  createdAt: number;
}

export interface DisciplineArea { id: string; day: number; name: string; stat: string; tasks: string[] }
export interface DisciplineEntry { areaId: string; text: string; at: number; note?: string }
export interface Disciplines {
  enabled: boolean;
  areas: DisciplineArea[];
  /** Keyed by local date, e.g. "2026-11-05". */
  log: Record<string, DisciplineEntry>;
  /** Which task index was swapped in for a given date. */
  swaps: Record<string, number>;
}

export type Repeat = "" | "daily" | "weekdays" | "weekly" | "biweekly" | "monthly";
export type SideRank = "E" | "C" | "A" | "S";

export interface SideQuest {
  id: string;
  title: string;
  desc: string;
  rank: SideRank;
  repeat: Repeat;
  dueAt: number;
  createdAt: number;
  done: boolean;
  completedAt?: number;
  xp?: number;
}

export interface CalEvent {
  id: string;
  title: string;
  kind: "meeting" | "block";
  xp: number;
  date: string;
  start: string;
  end: string;
  repeat: Repeat;
  color: string;
  skips: string[];
  done: Record<string, number>;
  createdAt: number;
}

export interface Profile {
  name: string;
  onboarded: boolean;
  createdAt: number;
  /** Show the optional "Use any AI" helper in the goal builder. Missing means on. */
  aiHelper?: boolean;
}

export interface AppState {
  version: 2;
  profile: Profile;
  trees: Tree[];
  disciplines: Disciplines;
  sideQuests: SideQuest[];
  events: CalEvent[];
  /** 0 means untouched starter data, so account data always wins over it. */
  updatedAt: number;
}
