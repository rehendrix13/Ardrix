// Sign in with an emailed 6-digit code. Codes work inside the installed iPhone app,
// where magic links would open Safari instead and lose the session.
import { useState } from "react";
import { friendlyError, sendCode, signOut, syncConfigured, verifyCode } from "../lib/supabase";
import { SYNC_TEXT, useStore } from "../lib/store";
import { Field } from "./ui";

export function AccountPanel({ compact }: { compact?: boolean }) {
  const { session, syncStatus, syncNow, toast } = useStore();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  if (!syncConfigured()) {
    return <p className="muted">Accounts aren't switched on yet. Your progress is saved on this device.</p>;
  }

  if (session) {
    return (
      <div className="stack">
        <p>Signed in as <b>{session.user.email}</b></p>
        <p className={`sync-line s-${syncStatus}`}>{SYNC_TEXT[syncStatus]}</p>
        <div className="row">
          <button type="button" className="btn ghost" onClick={syncNow}>Sync now</button>
          <button type="button" className="btn ghost" onClick={async () => { await signOut(); toast("Signed out. Your progress stays on this device."); }}>Sign out</button>
        </div>
      </div>
    );
  }

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setMsg("");
    try { await fn(); } catch (e) { setMsg(friendlyError(e)); }
    setBusy(false);
  };

  if (step === "code") {
    return (
      <form className="stack" onSubmit={(e) => { e.preventDefault(); run(async () => { await verifyCode(email.trim(), code.trim()); toast("Signed in. Your progress is backed up."); }); }}>
        <p>We emailed a code to <b>{email}</b>. Enter it below.</p>
        <Field label="Code">
          <input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,8}" maxLength={8} required value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="123456" />
        </Field>
        {msg && <p className="error" role="alert">{msg}</p>}
        <div className="row">
          <button type="submit" className="btn primary" disabled={busy || code.length < 6}>{busy ? "Checking…" : "Sign in"}</button>
          <button type="button" className="btn ghost" onClick={() => { setStep("email"); setCode(""); setMsg(""); }}>Use a different email</button>
        </div>
      </form>
    );
  }

  return (
    <form className="stack" onSubmit={(e) => { e.preventDefault(); run(async () => { await sendCode(email.trim()); setStep("code"); }); }}>
      {!compact && <p className="muted">Back up your progress and use Ardrix on all your devices. No password needed: we'll email you a code.</p>}
      <Field label="Email">
        <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
      </Field>
      {msg && <p className="error" role="alert">{msg}</p>}
      <button type="submit" className="btn primary" disabled={busy || !email.includes("@")}>{busy ? "Sending…" : "Email me a code"}</button>
    </form>
  );
}
