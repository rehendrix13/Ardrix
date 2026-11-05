import type { Disciplines } from "../lib/types";
import { uid } from "../lib/game";

// One focus area per weekday. Each area's task rotates weekly; players can swap or edit them.
const DEFAULTS: [number, string, string, string[]][] = [
  [1, "Leadership", "LDR", ["Write down the one outcome that would make this week a win", "Give one person specific, genuine recognition", "Ask someone, \"What's one thing I could do better?\" and just listen", "Make one decision you've been putting off"]],
  [2, "Intellect", "INT", ["Read 20 pages of a nonfiction book", "Learn one new concept and explain it in 3 sentences", "Watch one talk or lecture and take notes", "Spend 15 minutes researching a question you're curious about"]],
  [3, "Physical", "STR", ["Take a 20-minute walk with no phone", "Stretch for 10 minutes", "Do a bodyweight circuit: squats, push-ups, planks", "Drink water with every meal and get to bed 30 minutes earlier"]],
  [4, "Communication", "CHA", ["Rewrite one email or message to be half as long", "In one conversation, ask a follow-up question before giving your opinion", "Explain something complicated to someone in plain words", "Reach out to someone you haven't talked to in a while"]],
  [5, "Creativity", "CRE", ["Write 300 words of anything, even bad ones", "Sketch, journal or work on a craft for 15 minutes", "Collect 3 ideas from your day", "Make something with your hands"]],
  [6, "Wisdom", "WIS", ["Write down one mistake from this week and what it taught you", "Read one chapter of philosophy or a biography", "Spend 10 minutes in silence or meditation", "Ask yourself what the person you want to be would do differently"]],
  [0, "Emotional", "EQ", ["Journal for 10 minutes: what drained you this week, and what filled you up", "Write down 3 specific things you're grateful for", "Name one feeling you avoided this week and why", "Plan one thing next week just for joy"]],
];

export const seedDisciplines = (): Disciplines => ({
  enabled: true,
  areas: DEFAULTS.map(([day, name, stat, tasks]) => ({ id: uid(), day, name, stat, tasks: [...tasks] })),
  log: {},
  swaps: {},
});
