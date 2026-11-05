import { test } from "node:test";
import assert from "node:assert/strict";

// Minimal browser stand-ins, set before the client module loads.
const store = new Map<string, string>();
(globalThis as Record<string, unknown>).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
};
(globalThis as Record<string, unknown>).window = { ARDRIX_CONFIG: { supabaseUrl: "https://proj.supabase.co/", supabaseKey: "sb_publishable_test" } };

interface Call { url: string; init: RequestInit }
const calls: Call[] = [];
let responses: { status: number; body: unknown }[] = [];
globalThis.fetch = (async (url: string, init: RequestInit) => {
  calls.push({ url, init });
  const r = responses.shift() ?? { status: 200, body: null };
  return new Response(r.body === null ? "" : JSON.stringify(r.body), { status: r.status });
}) as typeof fetch;

const sb = await import("../src/lib/supabase.ts");
const hdr = (c: Call) => c.init.headers as Record<string, string>;

test("email code sign-in stores a session", async () => {
  responses = [{ status: 200, body: {} }];
  await sb.sendCode("a@b.co");
  assert.equal(calls[0].url, "https://proj.supabase.co/auth/v1/otp");
  assert.equal(hdr(calls[0]).apikey, "sb_publishable_test");
  assert.equal(hdr(calls[0]).Authorization, undefined);

  responses = [{ status: 200, body: { access_token: "t1", refresh_token: "r1", expires_in: 3600, user: { id: "u1", email: "a@b.co" } } }];
  await sb.verifyCode("a@b.co", "123456");
  assert.deepEqual(JSON.parse(calls[1].init.body as string), { type: "email", email: "a@b.co", token: "123456" });
  assert.equal(sb.getSession()?.user.id, "u1");
});

test("state push upserts with the user's token", async () => {
  calls.length = 0;
  responses = [{ status: 201, body: null }];
  await sb.pushState({ hello: 1 });
  assert.equal(calls[0].url, "https://proj.supabase.co/rest/v1/user_state");
  assert.equal(hdr(calls[0]).Authorization, "Bearer t1");
  assert.match(hdr(calls[0]).Prefer, /merge-duplicates/);
  assert.equal(JSON.parse(calls[0].init.body as string).user_id, "u1");
});

test("pull returns null when there's no saved state", async () => {
  calls.length = 0;
  responses = [{ status: 200, body: [] }];
  assert.equal(await sb.pullState(), null);
  assert.match(calls[0].url, /user_state\?select=data,updated_at&user_id=eq\.u1$/);
});

test("expired tokens refresh before the next request", async () => {
  responses = [{ status: 200, body: { access_token: "old", refresh_token: "r-old", expires_in: 0, user: { id: "u1" } } }];
  await sb.verifyCode("a@b.co", "111111");
  calls.length = 0;
  responses = [{ status: 200, body: { access_token: "new", refresh_token: "r-new", expires_in: 3600, user: { id: "u1" } } }, { status: 200, body: [] }];
  await sb.pullState();
  assert.equal(calls[0].url, "https://proj.supabase.co/auth/v1/token?grant_type=refresh_token");
  assert.deepEqual(JSON.parse(calls[0].init.body as string), { refresh_token: "r-old" });
  assert.equal(hdr(calls[1]).Authorization, "Bearer new");
});

test("errors become readable messages", async () => {
  responses = [{ status: 403, body: { msg: "Token has expired or is invalid" } }];
  await assert.rejects(sb.verifyCode("a@b.co", "000000"), (e: Error) => sb.friendlyError(e).startsWith("That code didn't work"));
});

test("sign out clears the session", async () => {
  responses = [{ status: 204, body: null }];
  await sb.signOut();
  assert.equal(sb.getSession(), null);
  assert.equal(store.get("ardrix-session"), undefined);
});
