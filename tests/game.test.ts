import { test } from "node:test";
import assert from "node:assert/strict";
import {
  completeSide, disciplineFor, disciplineStreak, levelFor, nextDue, nextQuests, occursOn, sidePenalty,
  skillOpen, streak, titleFor, totalXP, treeRank, treeStats,
} from "../src/lib/game.ts";
import { freshState, normalize, progressCount } from "../src/lib/state.ts";
import { TEMPLATES, instantiate } from "../src/content/templates.ts";
import { draftProblems, draftToTree, emptyDraft, splitLines } from "../src/lib/builder.ts";
import { dayKey } from "../src/lib/dates.ts";
import type { CalEvent, SideQuest } from "../src/lib/types.ts";

const HOUR = 3_600_000, DAY = 86_400_000;

test("levels and titles", () => {
  assert.equal(levelFor(0), 1);
  assert.equal(levelFor(49), 1);
  assert.equal(levelFor(50), 2);
  assert.equal(levelFor(-30), 1);
  assert.equal(titleFor(1), "Novice");
  assert.equal(titleFor(12), "Adept");
  assert.equal(titleFor(99), "Legend");
});

test("every template is playable", () => {
  assert.ok(TEMPLATES.filter((t) => t.category === "everyday").length >= 5);
  for (const t of TEMPLATES) {
    const tree = instantiate(t);
    assert.ok(tree.branches.length >= 4, `${t.id} has branches`);
    for (const b of tree.branches) {
      assert.ok(b.skills.length >= 1);
      for (const s of b.skills) assert.ok(s.quests.length >= 1, `${t.id}/${s.name} has quests`);
    }
    const ids = new Set<string>();
    tree.branches.forEach((b) => b.skills.forEach((s) => s.quests.forEach((q) => ids.add(q.id))));
    const count = tree.branches.reduce((a, b) => a + b.skills.reduce((c, s) => c + s.quests.length, 0), 0);
    assert.equal(ids.size, count, "quest ids are unique");
  }
});

test("instantiating twice gives independent copies", () => {
  const a = instantiate(TEMPLATES[0]), b = instantiate(TEMPLATES[0]);
  a.branches[0].skills[0].quests[0].done = true;
  assert.equal(b.branches[0].skills[0].quests[0].done, false);
  assert.notEqual(a.id, b.id);
});

test("skills unlock in order and tree rank climbs", () => {
  const tree = instantiate(TEMPLATES[0]);
  const b = tree.branches[0];
  assert.equal(skillOpen(b, 0), true);
  assert.equal(skillOpen(b, 1), false);
  b.skills[0].quests.forEach((q) => (q.done = true));
  assert.equal(skillOpen(b, 1), true);
  assert.equal(treeRank(tree).rank, "E");
  tree.branches.forEach((br) => br.skills.forEach((s) => s.quests.forEach((q) => (q.done = true))));
  assert.equal(treeRank(tree).rank, "A");
  tree.capstone.done = true;
  assert.equal(treeRank(tree).rank, "S");
  const st = treeStats(tree);
  assert.equal(st.xp, st.max);
});

test("next quests only come from unlocked skills", () => {
  const s = freshState();
  s.trees.push(instantiate(TEMPLATES[1]));
  const next = nextQuests(s, 10);
  assert.equal(next.length, 4);
  for (const n of next) assert.equal(n.skill.rank, "E");
});

test("side quests: early bonus, late gets nothing, penalty after a day", () => {
  const now = Date.UTC(2026, 10, 5, 15);
  const q: SideQuest = { id: "a", title: "Pay bill", desc: "", rank: "C", repeat: "", dueAt: now + HOUR, createdAt: now - HOUR, done: false };
  assert.equal(completeSide(q, now), null);
  assert.equal(q.xp, 22);
  const late: SideQuest = { ...q, id: "b", done: false, dueAt: now - 2.5 * DAY };
  assert.equal(sidePenalty(late, now), 20);
  completeSide(late, now);
  assert.equal(late.xp, 0);
});

test("repeating side quests spawn the next future occurrence", () => {
  const now = new Date(2026, 10, 5, 9).getTime();
  const q: SideQuest = { id: "a", title: "Water plants", desc: "", rank: "E", repeat: "weekly", dueAt: now - 15 * DAY, createdAt: 0, done: false };
  const next = completeSide(q, now)!;
  assert.ok(next.dueAt > now);
  assert.ok(next.dueAt - now <= 7 * DAY);
  const fri = new Date(2026, 10, 6, 9).getTime();
  assert.equal(new Date(nextDue(fri, "weekdays")).getDay(), 1);
  const jan31 = new Date(2026, 0, 31, 9).getTime();
  assert.equal(new Date(nextDue(jan31, "monthly")).getDate(), 28);
});

test("calendar events repeat correctly", () => {
  const e: CalEvent = { id: "e", title: "Standup", kind: "meeting", xp: 3, date: "2026-11-02", start: "09:00", end: "09:15", repeat: "weekdays", color: "#fff", skips: ["2026-11-04"], done: {}, createdAt: 0 };
  assert.equal(occursOn(e, "2026-11-01"), false);
  assert.equal(occursOn(e, "2026-11-03"), true);
  assert.equal(occursOn(e, "2026-11-04"), false);
  assert.equal(occursOn(e, "2026-11-07"), false);
  assert.equal(occursOn({ ...e, repeat: "biweekly" }, "2026-11-16"), true);
  assert.equal(occursOn({ ...e, repeat: "biweekly" }, "2026-11-09"), false);
});

test("disciplines: weekday area, completion, streak, XP", () => {
  const s = freshState();
  const wed = new Date(2026, 10, 4, 10);
  const d = disciplineFor(s, wed)!;
  assert.equal(d.area.name, "Physical");
  s.disciplines.log[dayKey(wed)] = { areaId: d.area.id, text: d.text, at: wed.getTime() };
  const tue = new Date(2026, 10, 3, 10);
  s.disciplines.log[dayKey(tue)] = { areaId: disciplineFor(s, tue)!.area.id, text: "x", at: tue.getTime() };
  assert.equal(disciplineStreak(s, wed), 2);
  assert.equal(streak(s, wed), 2);
  assert.equal(totalXP(s), 30);
  s.disciplines.enabled = false;
  assert.equal(disciplineFor(s, wed), null);
});

test("goal builder turns a draft into a ranked tree", () => {
  const d = emptyDraft();
  assert.ok(draftProblems(d).length > 0);
  d.goal = "Learn guitar";
  d.branches = [{ name: "Chords", skills: [
    { name: "Open chords", quests: "- Learn G, C, D\n- Switch between them for 5 minutes\n\n" },
    { name: "Barre chords", quests: "1. Learn an F barre chord" },
  ] }];
  assert.deepEqual(draftProblems(d), []);
  const tree = draftToTree(d);
  assert.equal(tree.source, "custom");
  assert.deepEqual(tree.branches[0].skills.map((s) => s.rank), ["E", "C"]);
  assert.deepEqual(tree.branches[0].skills[0].quests.map((q) => q.text), ["Learn G, C, D", "Switch between them for 5 minutes"]);
  assert.deepEqual(splitLines("• one\n* two\n3) three"), ["one", "two", "three"]);
});

test("normalize repairs partial or junk data", () => {
  assert.equal(normalize(null).version, 2);
  const s = normalize({ trees: [{ name: "Old", branches: [{ name: "B", skills: [{ name: "S", quests: [{ id: "q", text: "t", done: true }] }] }] }] });
  assert.equal(s.trees[0].icon, "⭐");
  assert.equal(s.trees[0].branches[0].skills[0].rank, "E");
  assert.equal(progressCount(s), 1);
  assert.ok(s.disciplines.areas.length === 7);
});
