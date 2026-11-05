// Common changes to the player's state, written as functions on a draft copy.
// They return a short message for the toast.
import type { AppState, Tree } from "./types";
import { DISC_XP, RANK_XP, completeSide, disciplineFor, findQuest, skillDone, treeComplete } from "./game";
import { dayKey } from "./dates";

export function toggleQuest(s: AppState, questId: string, now = Date.now()): string {
  const f = findQuest(s, questId);
  if (!f) return "";
  const { quest, skill, tree } = f;
  if (quest.done) {
    quest.done = false; delete quest.completedAt; delete quest.assessed;
    return "Quest unchecked";
  }
  quest.done = true; quest.completedAt = now;
  if (skillDone(skill)) {
    if (treeComplete(tree) && tree.capstone.text && !tree.capstone.done) return `Skill mastered: ${skill.name}. The capstone is unlocked!`;
    return `Skill mastered: ${skill.name} · +${RANK_XP[skill.rank]} XP`;
  }
  return `+${RANK_XP[skill.rank]} XP`;
}

export function toggleCapstone(tree: Tree, now = Date.now()): string {
  if (tree.capstone.done) { tree.capstone.done = false; delete tree.capstone.completedAt; return "Capstone unchecked"; }
  tree.capstone.done = true; tree.capstone.completedAt = now;
  return `Capstone cleared · +100 XP · ${tree.name} is S-rank!`;
}

export function completeDiscipline(s: AppState, now = new Date()): string {
  const d = disciplineFor(s, now);
  if (!d || d.entry) return "";
  s.disciplines.log[d.key] = { areaId: d.area.id, text: d.text, at: now.getTime() };
  return `${d.area.name} complete · +1 ${d.area.stat} · +${DISC_XP} XP`;
}

export function undoDiscipline(s: AppState, now = new Date()) { delete s.disciplines.log[dayKey(now)]; }

export function swapDiscipline(s: AppState, now = new Date()) {
  const d = disciplineFor(s, now);
  if (!d) return;
  s.disciplines.swaps[d.key] = (d.idx + 1) % d.area.tasks.length;
}

export function toggleSide(s: AppState, id: string, now = Date.now()): string {
  const q = s.sideQuests.find((x) => x.id === id);
  if (!q) return "";
  if (q.done) { q.done = false; delete q.completedAt; delete q.xp; return "Marked not done"; }
  const next = completeSide(q, now);
  if (next) s.sideQuests.push(next);
  return q.xp ? `Side quest complete · +${q.xp} XP` : "Done, but late: no XP this time";
}

/** Marks every quest in the chosen skills as already done (the onboarding self-assessment). */
export function assessSkills(tree: Tree, skillIds: string[], now = Date.now()) {
  for (const b of tree.branches) for (const sk of b.skills) if (skillIds.includes(sk.id))
    for (const q of sk.quests) { q.done = true; q.assessed = true; q.completedAt = now; }
}
