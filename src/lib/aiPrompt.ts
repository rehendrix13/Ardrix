// "Use any AI": Ardrix writes a prompt, the player pastes it into the chatbot of their
// choice, then pastes the answer back. Ardrix itself never contacts an AI service.
import { RANK_BY_POSITION, type DraftBranch } from "./builder";

const MAX_AREAS = 6, MAX_QUESTS = 8;

export function buildPrompt(goal: string, why: string) {
  return [
    "Help me break a big goal into a skill tree for the Ardrix app.",
    "",
    `My goal: ${goal.trim()}`,
    ...(why.trim() ? [`Why it matters to me: ${why.trim()}`] : []),
    "",
    "Break it into 3 to 5 AREAS. In each area, list 2 or 3 SKILLS, ordered from easiest to hardest.",
    "Under each skill, list 3 to 5 small, concrete QUESTS I can actually do and check off (each should take less than a day).",
    "End with one CAPSTONE: a final challenge that proves I reached the goal.",
    "",
    "Keep it beginner-friendly and realistic. For health goals, focus on habits, not diets, weight or calorie targets.",
    "For money goals, keep it educational, not personal financial advice.",
    "",
    "Reply in exactly this format, with no other text:",
    "",
    "AREA: <area name>",
    "SKILL: <easiest skill>",
    "- <quest>",
    "- <quest>",
    "- <quest>",
    "SKILL: <harder skill>",
    "- <quest>",
    "AREA: <next area>",
    "...",
    "CAPSTONE: <final challenge>",
  ].join("\n");
}

export interface ParsedDraft { branches: DraftBranch[]; capstone: string }

/** Strips the markdown and numbering chatbots like to add: **bold**, ## headings, `code`, "1." */
const clean = (line: string) => line.replace(/[*_`#>]+/g, "").replace(/\s+/g, " ").trim();

/** Reads the AI's answer. Forgiving about formatting; returns null if it finds no areas. */
export function parseAnswer(text: string): ParsedDraft | null {
  const branches: DraftBranch[] = [];
  let capstone = "";
  let area: DraftBranch | null = null;
  let quests: string[] | null = null;

  const flush = () => {
    if (area && quests && area.skills.length) area.skills[area.skills.length - 1].quests = quests.join("\n");
    quests = null;
  };

  for (const raw of text.split(/\r?\n/)) {
    const line = clean(raw);
    if (!line) continue;
    const head = line.match(/^(?:\d+[.)]\s*)?(area|skill|capstone)\s*\d*\s*[:\-–—]\s*(.+)$/i);
    if (head) {
      const kind = head[1].toLowerCase(), value = head[2].trim();
      flush();
      if (kind === "area") {
        if (branches.length >= MAX_AREAS) { area = null; continue; }
        area = { name: value.slice(0, 40), skills: [] };
        branches.push(area);
      } else if (kind === "skill") {
        if (!area || area.skills.length >= RANK_BY_POSITION.length) { quests = null; continue; }
        area.skills.push({ name: value.slice(0, 50), quests: "" });
        quests = [];
      } else {
        capstone = value;
        area = null;
      }
      continue;
    }
    // A quest is any bulleted or numbered line under a skill ("*" bullets are stripped by clean()).
    const bulleted = /^\s*(?:[-•–*+]|\d+[.)])\s+/.test(raw);
    const text = line.replace(/^(?:[-•–+]|\d+[.)])\s*/, "").trim();
    if (bulleted && text && quests && (quests as string[]).length < MAX_QUESTS) (quests as string[]).push(text);
  }
  flush();

  const usable = branches
    .map((b) => ({ ...b, skills: b.skills.filter((s) => s.quests.trim()) }))
    .filter((b) => b.skills.length);
  return usable.length ? { branches: usable, capstone } : null;
}
