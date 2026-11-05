import { useState } from "react";
import { useStore, SYNC_TEXT } from "../lib/store";
import { navigate } from "../lib/router";
import {
  DAY_MS, longDate, todayKey, fmtHM, relTime, fmtDue,
} from "../lib/dates";
import {
  XP_PER_LEVEL, disciplineFor, disciplineStreak, eventsOn, isOverdue, levelFor, levelProgress, nextQuests,
  statPoints, streak, titleFor, totalXP, treeRank, treeStats, DISC_XP,
} from "../lib/game";
import { completeDiscipline, swapDiscipline, toggleQuest, toggleSide, undoDiscipline } from "../lib/actions";
import { progressCount } from "../lib/state";
import { syncConfigured } from "../lib/supabase";
import { isStandalone } from "../lib/push";
import { Bar, RankBadge } from "../components/ui";
import { Logo } from "../components/Logo";

export function Home() {
  const { state, update, toast, session, syncStatus } = useStore();
  const xp = totalXP(state), level = levelFor(xp);
  const name = state.profile.name;
  const today = todayKey();
  const next = nextQuests(state, 3);
  const dueSoon = state.sideQuests
    .filter((q) => !q.done && (isOverdue(q) || q.dueAt - Date.now() < DAY_MS))
    .sort((a, b) => a.dueAt - b.dueAt).slice(0, 3);
  const events = eventsOn(state.events, today);
  const showBackup = syncConfigured() && !session && progressCount(state) >= 3;

  return (
    <div className="screen">
      <header className="topbar">
        <div className="brand"><Logo size={28} /><span>Ardrix</span></div>
        {syncConfigured() && (
          <button type="button" className={`sync-pill s-${syncStatus}`} onClick={() => navigate("/settings")}>{SYNC_TEXT[syncStatus]}</button>
        )}
      </header>

      <section className="status card glow">
        <div className="status-level">
          <span className="lvl-num">{level}</span>
          <small>Level</small>
        </div>
        <div className="status-main">
          <p className="hi">{name ? `Keep going, ${name}.` : "Keep going."}</p>
          <h1>{titleFor(level)}</h1>
          <Bar value={levelProgress(xp)} label="Progress to next level" />
          <div className="meta">
            <span>{xp % XP_PER_LEVEL} / {XP_PER_LEVEL} XP to level {level + 1}</span>
            <span>🔥 {streak(state)} day streak</span>
          </div>
        </div>
      </section>

      {showBackup && <BackupNudge />}
      {!isStandalone() && <InstallTip />}

      <DisciplineCard />

      {next.length > 0 && (
        <section className="card">
          <div className="card-head"><h2>Next up</h2><small>{longDate(today)}</small></div>
          <ul className="quest-list">
            {next.map((n) => (
              <li key={n.questId} className="quest">
                <input type="checkbox" id={`h-${n.questId}`} checked={false}
                  onChange={() => { let m = ""; update((s) => { m = toggleQuest(s, n.questId); }); toast(m); }} />
                <label htmlFor={`h-${n.questId}`}>
                  <span>{n.text}</span>
                  <small>{n.tree.icon} {n.tree.name} · {n.skill.name}</small>
                </label>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(dueSoon.length > 0 || events.length > 0) && (
        <section className="card">
          <div className="card-head"><h2>Today's schedule</h2><button type="button" className="btn link" onClick={() => navigate("/calendar")}>Calendar ›</button></div>
          <ul className="quest-list">
            {dueSoon.map((q) => (
              <li key={q.id} className={`quest side ${isOverdue(q) ? "overdue" : ""}`}>
                <input type="checkbox" id={`hs-${q.id}`} checked={false}
                  onChange={() => { let m = ""; update((s) => { m = toggleSide(s, q.id); }); toast(m); }} />
                <label htmlFor={`hs-${q.id}`}>
                  <span><b className={`mini-rank r-${q.rank}`}>{q.rank}</b> {q.title}</span>
                  <small>{isOverdue(q) ? `Overdue · was due ${relTime(q.dueAt)}` : `Due ${fmtDue(q.dueAt)}`}</small>
                </label>
              </li>
            ))}
            {events.map((e) => (
              <li key={e.id} className="quest event">
                <span className="ev-dot" style={{ background: e.color }} aria-hidden="true" />
                <button type="button" className="row-link" onClick={() => navigate("/calendar")}>
                  <span>{e.title}</span>
                  <small>{fmtHM(e.start)} – {fmtHM(e.end)}{e.done[today] ? " · done" : ""}</small>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card">
        <div className="card-head"><h2>Your skill trees</h2><button type="button" className="btn link" onClick={() => navigate("/add")}>+ Add</button></div>
        {state.trees.length === 0 ? (
          <div className="empty-inline">
            <p>You don't have a skill tree yet.</p>
            <button type="button" className="btn primary" onClick={() => navigate("/add")}>Pick a goal</button>
          </div>
        ) : (
          <ul className="tree-list">
            {state.trees.map((t) => {
              const st = treeStats(t), r = treeRank(t);
              return (
                <li key={t.id}>
                  <button type="button" className="tree-row" onClick={() => navigate(`/tree/${t.id}`)}>
                    <span className="t-icon" aria-hidden="true">{t.icon}</span>
                    <span className="tree-row-main">
                      <b>{t.name}</b>
                      <Bar value={st.pct} label={`${t.name} progress`} />
                      <small>{st.done} of {st.total} quests · {r.line}</small>
                    </span>
                    <RankBadge rank={r.rank} size={38} state={r.rank === "S" ? "done" : "open"} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );

  function DisciplineCard() {
    const d = disciplineFor(state);
    if (!d) return null;
    const pts = statPoints(state)[d.area.id] ?? 0;
    const done = !!d.entry;
    return (
      <section className={`card discipline ${done ? "done" : ""}`}>
        <div className="card-head">
          <div>
            <p className="eyebrow">Daily discipline · {new Date().toLocaleDateString(undefined, { weekday: "long" })}</p>
            <h2>{d.area.name} <span className="stat-chip">{d.area.stat} {pts}</span></h2>
          </div>
          <span className="streak-chip" title="Discipline streak">🔥 {disciplineStreak(state)}</span>
        </div>
        <p className="disc-task">{done ? d.entry!.text : d.text}</p>
        <div className="row">
          {done ? (
            <>
              <span className="done-chip">Complete · +{DISC_XP} XP</span>
              <button type="button" className="btn link" onClick={() => update((s) => undoDiscipline(s))}>Undo</button>
            </>
          ) : (
            <>
              <button type="button" className="btn primary" onClick={() => { let m = ""; update((s) => { m = completeDiscipline(s); }); toast(m); }}>Complete · +{DISC_XP} XP</button>
              {d.area.tasks.length > 1 && <button type="button" className="btn ghost" onClick={() => update((s) => swapDiscipline(s))}>Swap task</button>}
            </>
          )}
        </div>
      </section>
    );
  }
}

function BackupNudge() {
  return (
    <section className="card nudge">
      <div>
        <h2>Back up your progress</h2>
        <p className="muted">It's only saved on this device right now. Create a free account so you never lose it.</p>
      </div>
      <button type="button" className="btn primary" onClick={() => navigate("/settings")}>Back up</button>
    </section>
  );
}

function InstallTip() {
  const [hidden, setHidden] = useState(() => localStorage.getItem("ardrix-install-tip") === "hidden");
  if (hidden) return null;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  return (
    <section className="card nudge subtle">
      <div>
        <h2>Add Ardrix to your home screen</h2>
        <p className="muted">{ios ? "In Safari, tap Share, then \"Add to Home Screen.\" It opens like a real app and can send reminders."
          : "Use your browser's \"Install app\" or \"Add to Home screen\" option so Ardrix opens like a real app."}</p>
      </div>
      <button type="button" className="btn ghost" onClick={() => { localStorage.setItem("ardrix-install-tip", "hidden"); setHidden(true); }}>Got it</button>
    </section>
  );
}
