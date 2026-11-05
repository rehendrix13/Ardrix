// Launch templates. Each is plain data: branches -> skills (ranked E, C, A) -> quests.
// Picking a template copies it into the player's account, so edits never change the master.
import type { Rank, Tree } from "../lib/types";
import { uid } from "../lib/game";

type SkillSpec = [Rank, string, string[]];
type BranchSpec = [string, string, SkillSpec[]];

export interface Template {
  id: string;
  name: string;
  icon: string;
  tagline: string;
  desc: string;
  note?: string;
  category: "everyday" | "career";
  capstone: string;
  branches: BranchSpec[];
}

export const TEMPLATES: Template[] = [
  {
    id: "get-fit", name: "Get Fit", icon: "💪", category: "everyday",
    tagline: "Build a body that keeps up with your life.",
    desc: "Cardio, strength, mobility and the consistency that ties them together. Starts easy, whatever your fitness level.",
    note: "Check with a doctor before starting if you have health concerns.",
    capstone: "Train consistently for 8 weeks, then complete a personal challenge you set at the start: a 5K, a hike, or a strength goal.",
    branches: [
      ["Move Daily", "Build your engine, one walk at a time.", [
        ["E", "Walk It Out", ["Take a 10-minute walk today", "Walk 20 minutes on 3 different days this week", "Find a walking route you enjoy and save it"]],
        ["C", "Build Your Engine", ["Try a run-walk: 1 minute jogging, 2 minutes walking, 6 rounds", "Do 3 cardio sessions of 20+ minutes in one week", "Try a new kind of cardio: bike, swim, dance or hike"]],
        ["A", "Go the Distance", ["Complete a 5K, walking or running", "Do 3+ cardio sessions a week for 4 weeks in a row", "Sign up for an event or a group activity"]],
      ]],
      ["Get Stronger", "Strength that makes everyday life easier.", [
        ["E", "Bodyweight Basics", ["Learn good form for a squat, a push-up (wall or knees is fine) and a plank", "Do a 10-minute bodyweight circuit", "Do 2 strength sessions this week"]],
        ["C", "Progressive Strength", ["Follow a beginner strength plan for 2 weeks", "Add one rep or a little weight to an exercise from last week", "Learn a hip hinge, like a glute bridge or deadlift, with good form"]],
        ["A", "Strength Habit", ["Strength train twice a week for 6 weeks", "Write your own 3-exercise routine and do it", "Hit a personal best on one lift or hold"]],
      ]],
      ["Mobility & Recovery", "Move well, rest well, come back stronger.", [
        ["E", "Stretch It", ["Stretch for 5 minutes after waking up", "Try a 10-minute beginner yoga video", "Pick one tight spot and stretch it daily for a week"]],
        ["C", "Rest Like an Athlete", ["Go to bed at the same time 5 nights in a row", "Take a full rest day and notice how you feel", "On a sore day, walk or stretch instead of skipping movement"]],
        ["A", "Body Awareness", ["Do a 20-minute mobility session every week for a month", "Learn a warm-up you'll use before every workout", "Track energy and soreness for 2 weeks and adjust your plan"]],
      ]],
      ["Consistency", "The skill behind every other skill.", [
        ["E", "Show Up", ["Pick 3 workout days and put them on your calendar", "Lay out workout clothes the night before", "Do a 2-minute workout on a day you don't feel like it"]],
        ["C", "Make It Stick", ["Complete every planned workout for 2 weeks", "Find a workout buddy or a class", "Write down why getting fit matters to you"]],
        ["A", "Identity Shift", ["Move in some way every day for 30 days", "Plan a week of workouts around a busy schedule", "Teach someone one exercise you've learned"]],
      ]],
    ],
  },
  {
    id: "mind-mood", name: "Mind and Mood", icon: "🧠", category: "everyday",
    tagline: "A calmer mind, steadier mood, more good days.",
    desc: "Calm, sleep, a brighter outlook and the people who lift you up.",
    note: "Not a substitute for professional care. If you're struggling, please reach out to a doctor or counselor.",
    capstone: "Keep a daily calm, sleep or journaling practice for 30 days, then write a reflection on what changed.",
    branches: [
      ["Calm", "Turn down the noise.", [
        ["E", "Breathe", ["Try box breathing for 2 minutes: in 4, hold 4, out 4, hold 4", "Take 3 slow breaths before checking your phone in the morning", "Use one breathing break during a stressful moment"]],
        ["C", "Mindfulness", ["Meditate for 5 minutes on 4 days this week", "Eat one meal without screens", "Take a 10-minute walk paying attention to what you see and hear"]],
        ["A", "Steady Practice", ["Meditate 10 minutes a day for 3 weeks", "Notice a stress reaction as it happens and name it", "Build a 15-minute wind-down routine and use it for a week"]],
      ]],
      ["Sleep", "Everything gets easier when you're rested.", [
        ["E", "Sleep Basics", ["Choose a consistent bedtime and wake time", "Put your phone away 30 minutes before bed", "Make your bedroom darker, cooler or quieter"]],
        ["C", "Sleep Routine", ["Keep the same wake time 6 days in a row", "Skip caffeine after 2 p.m. for a week", "Write tomorrow's to-do list before bed to clear your head"]],
        ["A", "Well Rested", ["Follow your sleep routine for 30 days", "Track how sleep affects your mood for 2 weeks", "Change one habit based on what you learned"]],
      ]],
      ["Outlook", "Train your mind to notice the good.", [
        ["E", "Notice the Good", ["Write down 3 good things that happened today", "Send one thank-you message", "Catch one harsh thought about yourself and rewrite it kindly"]],
        ["C", "Journal", ["Journal for 10 minutes on 4 days this week", "Write a letter to your future self", "List 5 things you're proud of from the past year"]],
        ["A", "Resilience", ["Reflect on a past hard time and what got you through it", "Keep a gratitude habit for 30 days", "Write your personal values and check one decision against them"]],
      ]],
      ["Connection", "Good days are better shared.", [
        ["E", "Reach Out", ["Text a friend just to check in", "Have one phone-free conversation", "Say yes to one social invite"]],
        ["C", "Go Deeper", ["Plan a coffee or a walk with someone you miss", "Ask someone a deeper question and really listen", "Join a group, class or community around an interest"]],
        ["A", "Support Network", ["Tell 3 people you lean on that they matter to you", "Help someone through something hard", "Ask for help with something you've been carrying alone"]],
      ]],
    ],
  },
  {
    id: "eat-healthier", name: "Eat Healthier", icon: "🥗", category: "everyday",
    tagline: "Habits, not diets.",
    desc: "Cooking skills, planning, better choices and mindful eating. No calorie counting.",
    note: "For medical or dietary needs, follow your doctor's advice.",
    capstone: "For 4 weeks, cook at home most nights and follow your meal plan, then share one recipe you've mastered.",
    branches: [
      ["Kitchen Basics", "Cooking is a superpower.", [
        ["E", "First Meals", ["Cook one simple meal at home", "Learn to cook eggs three different ways", "Stock your kitchen with 5 healthy staples"]],
        ["C", "Home Cook", ["Cook dinner at home 3 nights this week", "Learn one sheet-pan or one-pot recipe", "Make a meal using only what's already in your fridge"]],
        ["A", "Confident Cook", ["Cook 5 different recipes in 2 weeks", "Cook a meal for someone else", "Create your own go-to recipe"]],
      ]],
      ["Plan Ahead", "Decide once, eat well all week.", [
        ["E", "Plan", ["Plan 3 dinners for the week", "Make a grocery list before you shop", "Pack a healthy snack for work or school"]],
        ["C", "Prep", ["Prep lunches for 3 days on the weekend", "Batch-cook a grain or protein for the week", "Write a list of 10 easy meals you like"]],
        ["A", "Systems", ["Meal plan every week for a month", "Build a rotating 2-week menu", "Keep takeout to your planned amount for a month"]],
      ]],
      ["Better Choices", "Add more good stuff instead of banning things.", [
        ["E", "Add More", ["Add a fruit or vegetable to 2 meals today", "Swap one sugary drink for water", "Try a vegetable you haven't had in a while"]],
        ["C", "Balanced Plates", ["Fill half your plate with vegetables at 5 meals this week", "Read the labels on 5 foods you buy often", "Eat breakfast 5 days this week"]],
        ["A", "Eating Well", ["Eat vegetables at most meals for 2 weeks", "Find healthier versions of 2 favorite comfort foods", "Write down which foods give you steady energy"]],
      ]],
      ["Mindful Eating", "Slow down and listen to your body.", [
        ["E", "Drink Up", ["Carry a water bottle all day", "Drink a glass of water with every meal for 3 days", "Notice whether you're eating from hunger or boredom"]],
        ["C", "Slow Down", ["Eat one meal a day at a table, with no screens", "Put your fork down between bites at one meal", "Stop when you feel comfortably full at 3 meals"]],
        ["A", "Mindful Habit", ["Keep your water habit for 30 days", "Plan treats instead of banning them, and enjoy them fully", "Write what eating well means to you, in your own words"]],
      ]],
    ],
  },
  {
    id: "money-basics", name: "Money Basics", icon: "💰", category: "everyday",
    tagline: "Take control of your money, one step at a time.",
    desc: "Budgeting, saving, paying down debt and your first investments.",
    note: "Educational only, not financial advice.",
    capstone: "Build an emergency fund of one month's expenses and automate both your saving and your investing.",
    branches: [
      ["Know Your Money", "You can't steer what you can't see.", [
        ["E", "Track It", ["List every account you have and its balance", "Track every purchase for one week", "Find your 3 biggest spending categories from last month"]],
        ["C", "Budget", ["Write a simple monthly budget", "Try the 50/30/20 split on last month's spending", "Set up a budget app or spreadsheet"]],
        ["A", "Own It", ["Stick to your budget for a full month", "Review your budget every week for a month", "Cancel or renegotiate one bill or subscription"]],
      ]],
      ["Save", "Pay yourself first.", [
        ["E", "Start Saving", ["Open a separate savings account, high-yield if you can", "Save $20 this week", "Set up an automatic transfer on payday, any amount"]],
        ["C", "Emergency Fund", ["Set an emergency fund goal: one month of expenses to start", "Save toward it every paycheck for a month", "Put one bit of unexpected money straight into savings"]],
        ["A", "Safety Net", ["Reach your first emergency fund goal", "Raise your automatic savings amount", "Name 2 future goals and open a savings bucket for each"]],
      ]],
      ["Debt", "Face it, then beat it.", [
        ["E", "Face It", ["List every debt with its balance, interest rate and minimum payment", "Set up autopay for at least the minimum on each", "Check your credit report for free"]],
        ["C", "Pay It Down", ["Choose the avalanche or snowball method and write your payoff order", "Pay extra on one debt this month", "Call one lender and ask about a lower rate"]],
        ["A", "Debt-Free Path", ["Pay off one debt completely", "Make a payoff timeline for the rest", "Go 3 months without adding new credit card debt"]],
      ]],
      ["Grow", "Let your money work for you.", [
        ["E", "Learn the Basics", ["Learn what an index fund is", "Find out whether your employer matches retirement contributions", "Learn the difference between a 401(k), an IRA and a Roth IRA"]],
        ["C", "First Steps", ["Contribute enough to get any employer match", "Open a retirement account if you don't have one", "Read one beginner investing book"]],
        ["A", "The Long Game", ["Set up automatic monthly investing", "Write a one-page plan for your money goals", "Review your accounts once a quarter"]],
      ]],
    ],
  },
  {
    id: "learn-new", name: "Learn Something New", icon: "📚", category: "everyday",
    tagline: "Any skill, from first try to proud of it.",
    desc: "A path for any skill: a language, an instrument, coding, art. Pick it, practice it, prove it.",
    capstone: "Spend 60 days learning one skill, then finish and share a project that proves it.",
    branches: [
      ["Pick Your Path", "Choose what to learn and why.", [
        ["E", "Choose", ["Write down 3 skills you'd love to learn", "Pick one and write why it matters to you", "Find 3 free resources for it: videos, courses or books"]],
        ["C", "Plan", ["Set a 30-day learning goal you can measure", "Block 3 study sessions on your calendar this week", "Find someone who has this skill and follow their work"]],
        ["A", "Commit", ["Finish one full course, book or tutorial series", "Track your learning hours for a month", "Set your next 90-day goal"]],
      ]],
      ["Practice", "Reps make the difference.", [
        ["E", "Daily Reps", ["Practice for 15 minutes today", "Practice on 5 days this week", "Keep a short practice log"]],
        ["C", "Deliberate Practice", ["Find your weakest area and practice only that for a week", "Record yourself or your work and review it", "Try something slightly too hard for you"]],
        ["A", "Mastery Habit", ["Practice 30 days in a row", "Get feedback from someone more skilled", "Teach one thing you've learned to someone else"]],
      ]],
      ["Go Deeper", "Understand it, not just do it.", [
        ["E", "Read Up", ["Read 10 pages a day for a week", "Pick a book about your skill", "Write down 3 takeaways from what you read"]],
        ["C", "Study", ["Finish a book in your skill area", "Watch a talk or lecture and take notes", "Explain one concept in your own words in 5 sentences"]],
        ["A", "Lifelong Learner", ["Read 3 books in 3 months", "Keep a running note of what you've learned", "Join a community and answer someone's question"]],
      ]],
      ["Make Something", "Proof that you can.", [
        ["E", "Start Small", ["Make one small thing with your new skill", "Share it with one person", "Save your first attempt so you can compare later"]],
        ["C", "Project", ["Pick a small project and finish it", "Show it to someone and ask for feedback", "Improve it based on that feedback"]],
        ["A", "Show Your Work", ["Finish a project you're proud of", "Compare it to your first attempt", "Share it publicly or with a group"]],
      ]],
    ],
  },
];

export const getTemplate = (id: string) => TEMPLATES.find((t) => t.id === id);

/** Copies a template into a fresh tree with new ids. */
export function instantiate(t: Template, now = Date.now()): Tree {
  return {
    id: uid(), name: t.name, desc: t.tagline, icon: t.icon, source: t.id, createdAt: now,
    capstone: { text: t.capstone, done: false },
    branches: t.branches.map(([name, desc, skills]) => ({
      id: uid(), name, desc,
      skills: skills.map(([rank, sName, quests]) => ({
        id: uid(), rank, name: sName,
        quests: quests.map((text) => ({ id: uid(), text, done: false })),
      })),
    })),
  };
}
