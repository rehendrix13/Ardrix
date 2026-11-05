import { useEffect, useState } from "react";
import { useStore } from "../lib/store";
import { DAY_NAMES, dayKey } from "../lib/dates";
import { levelFor, statPoints, streak, titleFor, totalXP, treeRank, treeStats, xpBreakdown } from "../lib/game";
import { deleteAccount, friendlyError, sendTestReminder, syncConfigured } from "../lib/supabase";
import { currentSubscription, disableReminders, enableReminders, isStandalone, pushSupported } from "../lib/push";
import { normalize } from "../lib/state";
import { config } from "../config";
import { AccountPanel } from "../components/Account";
import { Dialog, Field } from "../components/ui";
import type { DisciplineArea } from "../lib/types";

export function Settings() {
  const { state, update, toast, session, resetAll } = useStore();
  const [name, setName] = useState(state.profile.name);
  const [editArea, setEditArea] = useState<DisciplineArea | null>(null);
  const [danger, setDanger] = useState<"reset" | "delete" | null>(null);
  const xp = totalXP(state);

  return (
    <div className="screen">
      <header className="topbar"><h1>You</h1></header>

      <section className="card profile">
        <div>
          <p className="eyebrow">Level {levelFor(xp)} · {titleFor(levelFor(xp))}</p>
          <form className="row" onSubmit={(e) => { e.preventDefault(); update((s) => { s.profile.name = name.trim(); }); toast("Saved"); }}>
            <input aria-label="Your name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" maxLength={40} />
            {name !== state.profile.name && <button type="submit" className="btn ghost small">Save</button>}
          </form>
        </div>
        <XpBreakdown />
      </section>

      <section className="card">
        <h2>Account &amp; backup</h2>
        <AccountPanel />
      </section>

      <Reminders />

      <section className="card">
        <div className="card-head">
          <h2>Daily disciplines</h2>
          <label className="switch">
            <input type="checkbox" checked={state.disciplines.enabled} onChange={(e) => { const on = e.target.checked; update((s) => { s.disciplines.enabled = on; }); }} />
            <span>{state.disciplines.enabled ? "On" : "Off"}</span>
          </label>
        </div>
        <p className="muted small">One focus area per weekday, worth {15} XP and a stat point. Tasks rotate weekly.</p>
        {state.disciplines.enabled && (
          <ul className="area-list">
            {[...state.disciplines.areas].sort((a, b) => ((a.day + 6) % 7) - ((b.day + 6) % 7)).map((a) => (
              <li key={a.id}>
                <button type="button" className="row-link" onClick={() => setEditArea(a)}>
                  <span><b>{DAY_NAMES[a.day]}</b> · {a.name} <span className="stat-chip">{a.stat} {statPoints(state)[a.id]}</span></span>
                  <small>{a.tasks.length} tasks · tap to edit</small>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2>Your progress &amp; data</h2>
        <div className="row wrap">
          <button type="button" className="btn ghost" onClick={() => shareSummary()}>Share my progress</button>
          <button type="button" className="btn ghost" onClick={() => exportData()}>Download my data</button>
          <label className="btn ghost file-btn">Import data<input type="file" accept="application/json" onChange={(e) => importData(e.target.files?.[0])} /></label>
        </div>
      </section>

      <section className="card danger-zone">
        <h2>Danger zone</h2>
        <div className="row wrap">
          <button type="button" className="btn danger ghost" onClick={() => setDanger("reset")}>Start over</button>
          {session && <button type="button" className="btn danger ghost" onClick={() => setDanger("delete")}>Delete my account</button>}
        </div>
      </section>

      <p className="muted small center">Ardrix 0.1 · <a href="./privacy.html">Privacy</a></p>

      {editArea && <AreaEditor area={editArea} onClose={() => setEditArea(null)} />}
      {danger && <DangerDialog kind={danger} onClose={() => setDanger(null)} onReset={resetAll} />}
    </div>
  );

  function shareSummary() {
    const lvl = levelFor(xp);
    const lines = [
      `My Ardrix progress · ${new Date().toLocaleDateString()}`,
      `Level ${lvl} ${titleFor(lvl)} · ${xp} XP · ${streak(state)}-day streak`,
      ...state.trees.map((t) => { const st = treeStats(t); return `${t.icon} ${t.name}: ${treeRank(t).rank}-rank, ${st.done}/${st.total} quests (${Math.round(st.pct * 100)}%)`; }),
    ];
    const text = lines.join("\n");
    if (navigator.share) navigator.share({ title: "My Ardrix progress", text }).catch(() => {});
    else navigator.clipboard?.writeText(text).then(() => toast("Progress summary copied"), () => toast("Couldn't copy"));
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ardrix-${dayKey(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function importData(file?: File) {
    if (!file) return;
    try {
      const data = normalize(JSON.parse(await file.text()));
      if (!window.confirm(`Replace your current progress with this file (${data.trees.length} trees)?`)) return;
      update((s) => { Object.assign(s, data, { profile: { ...data.profile, onboarded: true } }); });
      toast("Data imported");
    } catch { toast("That file isn't Ardrix data"); }
  }
}

function XpBreakdown() {
  const { state } = useStore();
  const b = xpBreakdown(state);
  return (
    <dl className="xp-grid">
      <div><dt>Skill trees</dt><dd>{b.trees}</dd></div>
      <div><dt>Disciplines</dt><dd>{b.disciplines}</dd></div>
      <div><dt>Side quests</dt><dd>{b.side}</dd></div>
      <div><dt>Calendar</dt><dd>{b.events}</dd></div>
    </dl>
  );
}

const HOURS = [7, 8, 9, 12, 15, 18, 20];
const hourLabel = (h: number) => new Date(2000, 0, 1, h).toLocaleTimeString(undefined, { hour: "numeric" });

function Reminders() {
  const { session, toast } = useStore();
  const [on, setOn] = useState(false);
  const [hours, setHours] = useState<number[]>(() => { try { return JSON.parse(localStorage.getItem("ardrix-reminder-hours") || "[8,12,18]"); } catch { return [8, 12, 18]; } });
  const [busy, setBusy] = useState(false);
  useEffect(() => { currentSubscription().then((s) => setOn(!!s)).catch(() => {}); }, []);

  if (!syncConfigured()) return null;
  const ready = !!session && !!config.vapidPublicKey && pushSupported();
  const run = async (fn: () => Promise<void>, ok: string) => {
    setBusy(true);
    try { await fn(); toast(ok); } catch (e) { toast(friendlyError(e)); }
    setBusy(false);
  };

  return (
    <section className="card">
      <h2>Reminders</h2>
      {!session ? <p className="muted">Sign in above to get reminders for your daily discipline, side quests and meetings.</p>
        : !config.vapidPublicKey ? <p className="muted">Reminders aren't switched on for this app yet.</p>
        : !pushSupported() ? <p className="muted">{/iphone|ipad/i.test(navigator.userAgent) && !isStandalone() ? "On iPhone, add Ardrix to your home screen first, then open it from there to turn on reminders." : "This browser can't show reminders."}</p>
        : (
          <div className="stack">
            <p className="muted small">Pick when you'd like a nudge. You'll also get alerts before side quests are due and 10 minutes before meetings.</p>
            <div className="chips">
              {HOURS.map((h) => (
                <button key={h} type="button" className={`chip ${hours.includes(h) ? "on" : ""}`} aria-pressed={hours.includes(h)}
                  onClick={() => { const n = hours.includes(h) ? hours.filter((x) => x !== h) : [...hours, h].sort((a, b) => a - b); setHours(n); localStorage.setItem("ardrix-reminder-hours", JSON.stringify(n)); }}>{hourLabel(h)}</button>
              ))}
            </div>
            <div className="row wrap">
              <button type="button" className="btn primary" disabled={busy || !ready || !hours.length}
                onClick={() => run(async () => { await enableReminders(hours); setOn(true); }, on ? "Reminder times saved" : "Reminders on")}>{on ? "Save times" : "Turn on reminders"}</button>
              {on && <button type="button" className="btn ghost" disabled={busy} onClick={() => run(sendTestReminder, "Test sent. It should arrive in a few seconds.")}>Send a test</button>}
              {on && <button type="button" className="btn ghost" disabled={busy} onClick={() => run(async () => { await disableReminders(); setOn(false); }, "Reminders off")}>Turn off</button>}
            </div>
          </div>
        )}
    </section>
  );
}

function AreaEditor({ area, onClose }: { area: DisciplineArea; onClose: () => void }) {
  const { update, toast } = useStore();
  const [name, setName] = useState(area.name);
  const [stat, setStat] = useState(area.stat);
  const [tasks, setTasks] = useState(area.tasks.join("\n"));
  return (
    <Dialog title={`${DAY_NAMES[area.day]} discipline`} onClose={onClose}>
      <form className="stack" onSubmit={(e) => {
        e.preventDefault();
        const list = tasks.split("\n").map((t) => t.trim()).filter(Boolean);
        update((s) => { const a = s.disciplines.areas.find((x) => x.id === area.id); if (a) { a.name = name.trim() || a.name; a.stat = (stat.trim() || a.stat).toUpperCase().slice(0, 4); a.tasks = list.length ? list : a.tasks; } });
        toast("Saved"); onClose();
      }}>
        <div className="grid2">
          <Field label="Area"><input value={name} onChange={(e) => setName(e.target.value)} maxLength={24} /></Field>
          <Field label="Stat (short)"><input value={stat} onChange={(e) => setStat(e.target.value)} maxLength={4} /></Field>
        </div>
        <Field label="Tasks, one per line" hint="One task shows each week, in order. You can swap it on the day.">
          <textarea rows={6} value={tasks} onChange={(e) => setTasks(e.target.value)} />
        </Field>
        <button type="submit" className="btn primary">Save</button>
      </form>
    </Dialog>
  );
}

function DangerDialog({ kind, onClose, onReset }: { kind: "reset" | "delete"; onClose: () => void; onReset: () => void }) {
  const { toast } = useStore();
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const word = kind === "delete" ? "DELETE" : "RESET";
  return (
    <Dialog title={kind === "delete" ? "Delete your account?" : "Start over?"} onClose={onClose}>
      <p>{kind === "delete"
        ? "This permanently deletes your account and every tree, quest and setting in it from our servers. It can't be undone."
        : "This erases all your trees and progress and takes you back to the beginning. If you're signed in, your account is cleared too."}</p>
      <Field label={`Type ${word} to confirm`}><input value={typed} onChange={(e) => setTyped(e.target.value)} autoCapitalize="characters" /></Field>
      <div className="row">
        <button type="button" className="btn danger" disabled={typed.trim().toUpperCase() !== word || busy} onClick={async () => {
          setBusy(true);
          try {
            if (kind === "delete") await deleteAccount();
            onReset();
            toast(kind === "delete" ? "Account deleted" : "Fresh start");
            onClose();
          } catch (e) { toast(friendlyError(e)); setBusy(false); }
        }}>{kind === "delete" ? "Delete forever" : "Erase everything"}</button>
        <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
      </div>
    </Dialog>
  );
}
