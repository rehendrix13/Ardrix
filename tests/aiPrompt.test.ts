import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPrompt, parseAnswer } from "../src/lib/aiPrompt.ts";
import { draftProblems, draftToTree, emptyDraft } from "../src/lib/builder.ts";

test("prompt includes the goal, the why, and the format", () => {
  const p = buildPrompt("Learn guitar", "Play songs with my kids");
  assert.match(p, /My goal: Learn guitar/);
  assert.match(p, /Why it matters to me: Play songs with my kids/);
  assert.match(p, /CAPSTONE:/);
  assert.doesNotMatch(buildPrompt("Run a 5K", ""), /Why it matters/);
});

test("parses a clean answer into a playable draft", () => {
  const answer = `AREA: Chords
SKILL: Open chords
- Learn G, C and D
- Switch between them for 5 minutes
SKILL: Barre chords
- Learn an F barre chord
AREA: Rhythm
SKILL: Strumming
- Practice down-up strumming with a metronome
CAPSTONE: Play three full songs for my kids`;
  const r = parseAnswer(answer)!;
  assert.equal(r.branches.length, 2);
  assert.deepEqual(r.branches[0].skills.map((s) => s.name), ["Open chords", "Barre chords"]);
  assert.equal(r.branches[0].skills[0].quests, "Learn G, C and D\nSwitch between them for 5 minutes");
  assert.equal(r.capstone, "Play three full songs for my kids");
  const d = { ...emptyDraft(), goal: "Learn guitar", ...r };
  assert.deepEqual(draftProblems(d), []);
  assert.deepEqual(draftToTree(d).branches[0].skills.map((s) => s.rank), ["E", "C"]);
});

test("tolerates chatbot formatting and chatter", () => {
  const answer = `Sure! Here's your skill tree:

## **AREA: Form**
**SKILL 1: Easy runs**
1. Run for 10 minutes
2. Run for 15 minutes
* Run for 20 minutes

**Skill 2 - Longer runs**
- Run 3 miles

AREA — Recovery
SKILL: Sleep
• Sleep 8 hours

**CAPSTONE:** Finish a 5K race

Good luck!`;
  const r = parseAnswer(answer)!;
  assert.deepEqual(r.branches.map((b) => b.name), ["Form", "Recovery"]);
  assert.deepEqual(r.branches[0].skills[0].quests.split("\n"), ["Run for 10 minutes", "Run for 15 minutes", "Run for 20 minutes"]);
  assert.equal(r.branches[0].skills[1].quests, "Run 3 miles");
  assert.equal(r.branches[1].skills[0].quests, "Sleep 8 hours");
  assert.equal(r.capstone, "Finish a 5K race");
});

test("drops empty skills and returns null for unusable answers", () => {
  assert.equal(parseAnswer("I can't help with that."), null);
  assert.equal(parseAnswer("AREA: Only a name\nSKILL: No quests"), null);
  const r = parseAnswer("AREA: A\nSKILL: Empty\nSKILL: Full\n- do it")!;
  assert.deepEqual(r.branches[0].skills.map((s) => s.name), ["Full"]);
});
