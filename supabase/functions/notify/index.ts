// Ardrix reminders. Runs every 5 minutes (see supabase/reminders.sql) and sends:
//  - daily nudges at each player's chosen hours, based on their progress
//  - side quest alerts 4 hours before, 1 hour before, and at the deadline
//  - meeting alerts 10 minutes before they start
// Deploy as an Edge Function named "notify" with "Verify JWT" turned OFF.
// Secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:you@example.com), CRON_SECRET, APP_URL.
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const APP_URL = Deno.env.get("APP_URL") ?? "https://example.com/ardrix/";
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

webpush.setVapidDetails(Deno.env.get("VAPID_SUBJECT") ?? "mailto:hello@ardrix.app", Deno.env.get("VAPID_PUBLIC_KEY") ?? "", Deno.env.get("VAPID_PRIVATE_KEY") ?? "");

// deno-lint-ignore no-explicit-any
type State = any;
interface Local { tz: string; y: number; m: number; d: number; h: number; min: number; dow: number; key: string }

/* ---------- time helpers ---------- */
export function localParts(date: Date, tz: string): Local {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", weekday: "short", hourCycle: "h23",
  }).formatToParts(date).map((x) => [x.type, x.value]));
  const y = +p.year, m = +p.month, d = +p.day;
  return { tz, y, m, d, h: +p.hour % 24, min: +p.minute, dow: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday), key: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}` };
}
const localKey = (ms: number, tz: string) => localParts(new Date(ms), tz).key;
const keyFromUTC = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const keyUTC = (k: string) => { const [y, m, d] = k.split("-").map(Number); return Date.UTC(y, m - 1, d); };
const fmtTime = (ms: number, tz: string) => new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" }).format(new Date(ms));

/* ---------- daily nudge (mirrors the app's discipline rules) ---------- */
export function dailyMessage(st: State, L: Local, slot: number | "test", hours: number[]) {
  if (slot === "test") return { title: "Ardrix reminders are on", body: "You'll get a nudge at the times you picked.", tag: "ardrix-test" };
  if (!st) return { title: "Your quests are waiting", body: "Open Ardrix to see what's next.", tag: "ardrix-daily" };
  const disc = st.disciplines || {};
  const area = disc.enabled !== false ? (disc.areas || []).find((a: { day: number }) => a.day === L.dow) : null;
  let task = "";
  if (area?.tasks?.length) {
    const wk = Math.floor((keyUTC(L.key) / 86400000 + 3) / 7);
    task = area.tasks[((disc.swaps || {})[L.key] ?? wk) % area.tasks.length];
  }
  const discDone = !area || !!(disc.log || {})[L.key];
  let streak = 0, cur = keyUTC(L.key) - 86400000;
  while ((disc.log || {})[keyFromUTC(cur)]) { streak++; cur -= 86400000; }

  const sideToday = (st.sideQuests || []).filter((q: { done: boolean; dueAt: number }) => !q.done && q.dueAt && localKey(q.dueAt, L.tz) === L.key).length;
  const sideNote = sideToday ? ` ${sideToday} side quest${sideToday === 1 ? "" : "s"} due today.` : "";
  const sorted = [...hours].sort((a, b) => a - b);
  const first = slot === sorted[0], last = slot === sorted[sorted.length - 1];

  if (discDone) {
    return first && sideToday ? { title: "Side quests due today", body: `You have ${sideToday} side quest${sideToday === 1 ? "" : "s"} due today. Finish early for bonus XP.`, tag: "ardrix-daily" } : null;
  }
  const risk = streak > 0 ? ` Your ${streak}-day streak is on the line.` : "";
  if (first) return { title: `Today's discipline: ${area.name}`, body: `${task}${sideNote}`, tag: "ardrix-daily" };
  if (last) return { title: "Last call for today's discipline", body: `${area.name}: ${task}.${risk || " Finish it to start a streak."}`, tag: "ardrix-daily" };
  return { title: `${area.name} is still open`, body: `${task}.${risk}${sideNote}`, tag: "ardrix-daily" };
}

/* ---------- side quest deadline alerts ---------- */
const ALERTS: [string, number][] = [["4h", 4 * 3600000], ["1h", 3600000], ["due", 0]];
const WINDOW = 20 * 60000;
const RANK_XP: Record<string, number> = { E: 10, C: 20, A: 30, S: 50 };
export function sideAlerts(st: State, nowMs: number, tz: string) {
  const out: { itemId: string; kind: string; msg: { title: string; body: string; tag: string } }[] = [];
  for (const q of (st && st.sideQuests) || []) {
    if (q.done || !q.dueAt) continue;
    for (const [kind, off] of ALERTS) {
      const fireAt = q.dueAt - off;
      if (off && q.createdAt && q.createdAt > fireAt) continue;
      if (nowMs < fireAt || nowMs >= fireAt + WINDOW) continue;
      const time = fmtTime(q.dueAt, tz), xp = Math.round((RANK_XP[q.rank] ?? 20) * 1.1);
      const msg = kind === "4h" ? { title: "Side quest due in 4 hours", body: `${q.title} · due ${time}. Finish early for ${xp} XP.` }
        : kind === "1h" ? { title: "Side quest due in 1 hour", body: `${q.title} · due ${time}. ${xp} XP is still on the table.` }
        : { title: "Side quest deadline", body: `${q.title} is due now. Late quests earn no XP.` };
      out.push({ itemId: q.id, kind, msg: { ...msg, tag: `side-${q.id}-${kind}` } });
    }
  }
  return out;
}

/* ---------- meeting alerts, 10 minutes before ---------- */
function occursOn(e: State, k: string) {
  if (k < e.date || (e.skips || []).includes(k)) return false;
  if (!e.repeat) return k === e.date;
  const a = keyUTC(e.date), b = keyUTC(k), dow = new Date(b).getUTCDay(), diff = Math.round((b - a) / 86400000);
  if (e.repeat === "daily") return true;
  if (e.repeat === "weekdays") return dow >= 1 && dow <= 5;
  if (e.repeat === "weekly") return diff % 7 === 0;
  if (e.repeat === "biweekly") return diff % 14 === 0;
  if (e.repeat === "monthly") return new Date(a).getUTCDate() === new Date(b).getUTCDate();
  return false;
}
export function meetingAlerts(st: State, L: Local) {
  const out: { itemId: string; kind: string; msg: { title: string; body: string; tag: string } }[] = [];
  const nowM = L.h * 60 + L.min;
  for (const e of (st && st.events) || []) {
    if (e.kind !== "meeting" || !occursOn(e, L.key) || (e.done || {})[L.key]) continue;
    const [h, m] = e.start.split(":").map(Number), startM = h * 60 + m;
    if (nowM < startM - 10 || nowM >= startM) continue;
    const mins = startM - nowM;
    out.push({ itemId: `${e.id}:${L.key}`, kind: "meet10", msg: { title: `${e.title} in ${mins} minute${mins === 1 ? "" : "s"}`, body: "Check it off once it starts for 3 XP.", tag: `meet-${e.id}-${L.key}` } });
  }
  return out;
}

/* ---------- handler ---------- */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const db = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
  const body = await req.json().catch(() => ({}));
  const secret = Deno.env.get("CRON_SECRET");
  const isCron = !!secret && req.headers.get("x-cron-secret") === secret;

  // Players can trigger a test notification for their own devices.
  let testUser: string | null = null;
  if (!isCron) {
    const jwt = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    const { data } = await db.auth.getUser(jwt);
    if (!body.test || !data?.user) return json({ error: "forbidden" }, 403);
    testUser = data.user.id;
  }

  let q = db.from("push_subs").select("*").eq("enabled", true);
  if (testUser) q = q.eq("user_id", testUser);
  const { data: subs, error } = await q;
  if (error) return json({ error: error.message }, 500);

  const states = new Map<string, State>();
  const loadState = async (uid: string) => {
    if (!states.has(uid)) {
      const { data } = await db.from("user_state").select("data").eq("user_id", uid).maybeSingle();
      states.set(uid, data?.data ?? null);
    }
    return states.get(uid);
  };
  const send = async (s: State, msg: object) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify({ ...msg, url: APP_URL }), { TTL: 3600 });
      return true;
    } catch (e) {
      const code = (e as { statusCode?: number })?.statusCode;
      if (code === 404 || code === 410) await db.from("push_subs").delete().eq("id", s.id);
      return false;
    }
  };

  const now = new Date();
  let sent = 0, alerts = 0;
  for (const s of subs ?? []) {
    const L = localParts(now, s.tz || "America/Chicago");
    const hours: number[] = (s.times?.length ? s.times : [8, 12, 18]).map(Number);
    const slot = testUser ? "test" : hours.find((h) => h === L.h && L.min < 15);
    if (slot === undefined) continue;
    const slotKey = `${L.key}-${slot}`;
    if (!testUser) {
      if (s.last_slot === slotKey) continue;
      await db.from("push_subs").update({ last_slot: slotKey }).eq("id", s.id);
    }
    const msg = dailyMessage(await loadState(s.user_id), L, slot, hours);
    if (msg && (await send(s, msg))) sent++;
  }

  if (!testUser) {
    const byUser = new Map<string, State[]>();
    for (const s of subs ?? []) byUser.set(s.user_id, [...(byUser.get(s.user_id) ?? []), s]);
    for (const [uid, list] of byUser) {
      const st = await loadState(uid), tz = list[0].tz || "America/Chicago";
      for (const a of [...sideAlerts(st, now.getTime(), tz), ...meetingAlerts(st, localParts(now, tz))]) {
        const { error: dup } = await db.from("sent_alerts").insert({ user_id: uid, item_id: a.itemId, kind: a.kind });
        if (dup) continue; // already sent
        for (const s of list) if (await send(s, a.msg)) alerts++;
      }
    }
  }
  return json({ sent, alerts });
});
