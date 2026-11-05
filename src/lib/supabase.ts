// A small Supabase client built on fetch: email-code sign-in, session refresh,
// the player's state document, push subscriptions and account deletion.
// Uses Supabase's standard REST endpoints, so it needs no extra libraries.
import { config } from "../config";

export interface Session { access_token: string; refresh_token: string; expires_at: number; user: { id: string; email?: string } }

const SESSION_KEY = "ardrix-session";
const base = () => config.supabaseUrl.replace(/\/+$/, "");
export const syncConfigured = () => !!(config.supabaseUrl && config.supabaseKey);

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

async function call<T>(path: string, init: RequestInit & { token?: string } = {}): Promise<T> {
  const headers: Record<string, string> = { apikey: config.supabaseKey, "Content-Type": "application/json", ...(init.headers as Record<string, string>) };
  if (init.token) headers.Authorization = `Bearer ${init.token}`;
  const res = await fetch(`${base()}${path}`, { ...init, headers });
  const text = await res.text();
  const body = text ? safeJson(text) : null;
  if (!res.ok) {
    const b = (body || {}) as Record<string, string>;
    throw new ApiError(b.msg || b.message || b.error_description || b.error || `Request failed (${res.status})`, res.status);
  }
  return body as T;
}
const safeJson = (t: string) => { try { return JSON.parse(t); } catch { return t; } };

/* ---------- session storage ---------- */
let current: Session | null = (() => { try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch { return null; } })();
const listeners = new Set<(s: Session | null) => void>();
function setSession(s: Session | null) {
  current = s;
  try { if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s)); else localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
  listeners.forEach((fn) => fn(s));
}
export const getSession = () => current;
export const onSessionChange = (fn: (s: Session | null) => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };

interface TokenResponse { access_token: string; refresh_token: string; expires_in: number; expires_at?: number; user: { id: string; email?: string } }
const toSession = (r: TokenResponse): Session => ({
  access_token: r.access_token, refresh_token: r.refresh_token, user: { id: r.user.id, email: r.user.email },
  expires_at: r.expires_at ?? Math.floor(Date.now() / 1000) + r.expires_in,
});

let refreshing: Promise<Session | null> | null = null;
/** Returns a session with a fresh access token, refreshing it when it's about to expire. */
export async function validSession(): Promise<Session | null> {
  const s = current;
  if (!s) return null;
  if (s.expires_at - 60 > Date.now() / 1000) return s;
  refreshing ||= call<TokenResponse>("/auth/v1/token?grant_type=refresh_token", { method: "POST", body: JSON.stringify({ refresh_token: s.refresh_token }) })
    .then((r) => { const ns = toSession(r); setSession(ns); return ns; })
    .catch((e) => { if (e instanceof ApiError && e.status >= 400 && e.status < 500) setSession(null); throw e; })
    .finally(() => { refreshing = null; });
  return refreshing;
}

/* ---------- sign in with an emailed code ---------- */
export async function sendCode(email: string) {
  await call("/auth/v1/otp", { method: "POST", body: JSON.stringify({ email, create_user: true }) });
}
export async function verifyCode(email: string, token: string) {
  const r = await call<TokenResponse>("/auth/v1/verify", { method: "POST", body: JSON.stringify({ type: "email", email, token }) });
  setSession(toSession(r));
}
export async function signOut() {
  const s = current;
  setSession(null);
  if (s) await call("/auth/v1/logout", { method: "POST", token: s.access_token }).catch(() => {});
}

/* ---------- the player's state document ---------- */
async function authed() {
  const s = await validSession();
  if (!s) throw new ApiError("Not signed in", 401);
  return s;
}
export async function pullState(): Promise<{ data: unknown; updated_at: string } | null> {
  const s = await authed();
  const rows = await call<{ data: unknown; updated_at: string }[]>(`/rest/v1/user_state?select=data,updated_at&user_id=eq.${s.user.id}`, { token: s.access_token });
  return rows[0] ?? null;
}
export async function pushState(data: unknown) {
  const s = await authed();
  await call("/rest/v1/user_state", {
    method: "POST", token: s.access_token,
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ user_id: s.user.id, data, updated_at: new Date().toISOString() }),
  });
}

/** Permanently deletes the account and all its data (see delete_my_account in schema.sql). */
export async function deleteAccount() {
  const s = await authed();
  await call("/rest/v1/rpc/delete_my_account", { method: "POST", token: s.access_token, body: "{}" });
  setSession(null);
}

/* ---------- reminders ---------- */
export async function savePushSub(sub: PushSubscriptionJSON, tz: string, hours: number[]) {
  const s = await authed();
  await call("/rest/v1/push_subs?on_conflict=endpoint", {
    method: "POST", token: s.access_token,
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ user_id: s.user.id, endpoint: sub.endpoint, p256dh: sub.keys?.p256dh, auth: sub.keys?.auth, tz, times: hours, enabled: true }),
  });
}
export async function removePushSub(endpoint: string) {
  const s = await authed();
  await call(`/rest/v1/push_subs?endpoint=eq.${encodeURIComponent(endpoint)}`, { method: "DELETE", token: s.access_token });
}
export async function sendTestReminder() {
  const s = await authed();
  await call("/functions/v1/notify", { method: "POST", token: s.access_token, body: JSON.stringify({ test: true }) });
}

/** Turns technical errors into something a player can act on. */
export function friendlyError(e: unknown) {
  const m = e instanceof Error ? e.message : String(e);
  if (/token has expired|invalid/i.test(m) && /otp|token/i.test(m)) return "That code didn't work. Check it, or send a new one.";
  if (/rate limit|too many/i.test(m)) return "Too many tries. Wait a minute, then try again.";
  if (/failed to fetch|network/i.test(m)) return "Can't reach the server. Check your connection.";
  return m;
}
