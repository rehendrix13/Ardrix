// The "break down my goal" builder: turns a guided draft into a skill tree.
import type { Rank, Tree } from "./types";
import { uid } from "./game";

export interface DraftSkill { name: string; quests: string }
export interface DraftBranch { name: string; skills: DraftSkill[] }
export interface Draft { goal: string; why: string; icon: string; branches: DraftBranch[]; capstone: string }

/** Skills rank up in order within a branch: first is E, then C, then A, then S. */
export const RANK_BY_POSITION: Rank[] = ["E", "C", "A", "S"];

export const emptyDraft = (): Draft => ({
  goal: "", why: "", icon: "🎯", capstone: "",
  branches: [{ name: "", skills: [{ name: "", quests: "" }] }],
});

export const splitLines = (s: string) => s.split("\n").map((x) => x.replace(/^[-•*\d.)\s]+/, "").trim()).filter(Boolean);

/** Problems that stop the draft from becoming a playable tree. Empty list = ready. */
export function draftProblems(d: Draft): string[] {
  const out: string[] = [];
  if (!d.goal.trim()) out.push("Give your goal a name.");
  const branches = d.branches.filter((b) => b.name.trim());
  if (!branches.length) out.push("Add at least one area to work on.");
  branches.forEach((b) => {
    const skills = b.skills.filter((s) => s.name.trim());
    if (!skills.length) out.push(`Add a skill to "${b.name.trim()}".`);
    skills.forEach((s) => { if (!splitLines(s.quests).length) out.push(`Add at least one quest to "${s.name.trim()}".`); });
  });
  return out;
}

export function draftToTree(d: Draft, now = Date.now()): Tree {
  return {
    id: uid(), name: d.goal.trim(), desc: d.why.trim(), icon: d.icon || "🎯", source: "custom", createdAt: now,
    capstone: { text: d.capstone.trim(), done: false },
    branches: d.branches.filter((b) => b.name.trim()).map((b) => ({
      id: uid(), name: b.name.trim(), desc: "",
      skills: b.skills.filter((s) => s.name.trim() && splitLines(s.quests).length).slice(0, RANK_BY_POSITION.length).map((s, i) => ({
        id: uid(), rank: RANK_BY_POSITION[i], name: s.name.trim(),
        quests: splitLines(s.quests).map((text) => ({ id: uid(), text, done: false })),
      })),
    })),
  };
}

/** Starter ideas shown in the builder so a blank page never stops anyone. */
export const AREA_IDEAS = ["Learn the basics", "Practice", "Build the habit", "Get support", "Track progress", "Show your work"];
