export const DAY_MS = 86_400_000;
export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const pad = (n: number) => String(n).padStart(2, "0");

/** Local calendar date as "YYYY-MM-DD". */
export const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayKey = () => dayKey(new Date());
export const keyToDate = (k: string) => new Date(`${k}T12:00`);
export const keyToUTC = (k: string) => { const [y, m, d] = k.split("-").map(Number); return Date.UTC(y, m - 1, d); };
export const addDays = (k: string, n: number) => { const d = keyToDate(k); d.setDate(d.getDate() + n); return dayKey(d); };

export const toMin = (hhmm: string) => { const [h, m] = (hhmm || "0:0").split(":").map(Number); return h * 60 + m; };
export const fromMin = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;

export const timeStr = (ms: number) => new Date(ms).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
export const fmtHM = (hhmm: string) => { const [h, m] = hhmm.split(":").map(Number); const d = new Date(); d.setHours(h, m, 0, 0); return timeStr(d.getTime()); };
export const durLabel = (min: number) => { const h = Math.floor(min / 60), m = min % 60; return h && m ? `${h}h ${m}m` : h ? `${h}h` : `${m}m`; };

export function fmtDue(ms: number) {
  const d = new Date(ms), k = dayKey(d), t = new Date(), tm = new Date(t);
  tm.setDate(t.getDate() + 1);
  const day = k === dayKey(t) ? "Today" : k === dayKey(tm) ? "Tomorrow"
    : d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  return `${day} · ${timeStr(ms)}`;
}

export function relTime(ms: number, now = Date.now()) {
  const diff = ms - now, a = Math.abs(diff), h = Math.floor(a / 3_600_000), m = Math.floor((a % 3_600_000) / 60_000);
  const str = h >= 48 ? `${Math.floor(h / 24)}d` : h ? `${h}h ${m}m` : `${m}m`;
  return diff >= 0 ? `in ${str}` : `${str} ago`;
}

export const longDate = (k: string) => keyToDate(k).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
