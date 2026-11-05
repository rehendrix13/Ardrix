// Side quests: real-life to-dos with due dates. Early = bonus XP, late = none, very late = penalty.
import { useState } from "react";
import { useStore } from "../lib/store";
import { dayKey, fmtDue, relTime, todayKey } from "../lib/dates";
import { RANK_XP, SIDE_RANKS, isOverdue, nextDue, sideBonusXP, sidePenalty, uid } from "../lib/game";
import { toggleSide } from "../lib/actions";
import type { Repeat, SideQuest, SideRank } from "../lib/types";
import { Dialog, Empty, Field } from "../components/ui";

export const REPEATS: [Repeat, string][] = [["", "Doesn't repeat"], ["daily", "Every day"], ["weekdays", "Every weekday"], ["weekly", "Every week"], ["biweekly", "Every 2 weeks"], ["monthly", "Every month"]];

export function SideQuests() {
  const { state } = useStore();
  const [editing, setEditing] = useState<SideQuest | "new" | null>(null);
  const now = Date.now(), today = todayKey();
  const open = state.sideQuests.filter((q) => !q.done).sort((a, b) => a.dueAt - b.dueAt);
  const overdue = open.filter((q) => isOverdue(q, now));
  const todays = open.filter((q) => !isOverdue(q, now) && dayKey(new Date(q.dueAt)) === today);
  const later = open.filter((q) => !isOverdue(q, now) && dayKey(new Date(q.dueAt)) !== today);
  const done = state.sideQuests.filter((q) => q.done).sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0)).slice(0, 8);

  return (
    <div className="screen">
      <header className="topbar">
        <h1>Side quests</h1>
        <button type="button" className="btn primary" onClick={() => setEditing("new")}>+ New</button>
      </header>
      <p className="muted">Real-life to-dos with a deadline. Finish early for +10% XP. Late ones earn nothing, and after a day overdue you lose 10 XP a day.</p>

      {open.length === 0 && done.length === 0 && (
        <Empty title="No side quests yet">
          <p className="muted">Add errands, bills, appointments, anything with a due date.</p>
          <button type="button" className="btn primary" onClick={() => setEditing("new")}>Add your first</button>
        </Empty>
      )}
      <Group title="Overdue" items={overdue} onOpen={setEditing} />
      <Group title="Today" items={todays} onOpen={setEditing} />
      <Group title="Coming up" items={later} onOpen={setEditing} />
      <Group title="Recently done" items={done} onOpen={setEditing} />

      {editing && <SideQuestForm quest={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function Group({ title, items, onOpen }: { title: string; items: SideQuest[]; onOpen: (q: SideQuest) => void }) {
  const { update, toast } = useStore();
  if (!items.length) return null;
  return (
    <section className="card">
      <h2>{title}</h2>
      <ul className="quest-list">
        {items.map((q) => {
          const over = isOverdue(q), pen = sidePenalty(q);
          const status = q.done ? (q.xp ? `+${q.xp} XP` : "Late · 0 XP") : over ? `Overdue${pen ? ` · −${pen} XP` : ""}` : `+${sideBonusXP(q)} XP if on time`;
          return (
            <li key={q.id} className={`quest side ${q.done ? "done" : ""} ${over ? "overdue" : ""}`}>
              <input type="checkbox" checked={q.done} aria-label={`Complete ${q.title}`}
                onChange={() => { let m = ""; update((s) => { m = toggleSide(s, q.id); }); toast(m); }} />
              <button type="button" className="row-link" onClick={() => onOpen(q)}>
                <span><b className={`mini-rank r-${q.rank}`}>{q.rank}</b> {q.title}{q.repeat && <span className="muted"> ↻</span>}</span>
                <small>{q.done ? "Done" : `${fmtDue(q.dueAt)} · ${relTime(q.dueAt)}`} · {status}</small>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const pad = (n: number) => String(n).padStart(2, "0");

export function SideQuestForm({ quest, presetDate, onClose }: { quest?: SideQuest; presetDate?: string; onClose: () => void }) {
  const { update, toast } = useStore();
  const base = quest ? new Date(quest.dueAt) : (() => { const d = new Date(); d.setMinutes(0, 0, 0); d.setHours(d.getHours() + 2); return d; })();
  const [title, setTitle] = useState(quest?.title ?? "");
  const [desc, setDesc] = useState(quest?.desc ?? "");
  const [date, setDate] = useState(presetDate ?? dayKey(base));
  const [time, setTime] = useState(`${pad(base.getHours())}:${pad(base.getMinutes())}`);
  const [rank, setRank] = useState<SideRank>(quest?.rank ?? "C");
  const [repeat, setRepeat] = useState<Repeat>(quest?.repeat ?? "");

  const save = () => {
    const due = new Date(`${date}T${time || "09:00"}`).getTime();
    if (!title.trim() || isNaN(due)) return;
    update((s) => {
      if (quest) {
        const q = s.sideQuests.find((x) => x.id === quest.id);
        if (q) Object.assign(q, { title: title.trim(), desc: desc.trim(), rank, repeat, dueAt: due });
      } else {
        s.sideQuests.push({ id: uid(), title: title.trim(), desc: desc.trim(), rank, repeat, dueAt: due, createdAt: Date.now(), done: false });
      }
    });
    toast(quest ? "Side quest updated" : `Side quest added · due ${fmtDue(due)}`);
    onClose();
  };

  return (
    <Dialog title={quest ? "Edit side quest" : "New side quest"} onClose={onClose}>
      <form className="stack" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <Field label="What needs doing?"><input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={80} placeholder="e.g. Renew car registration" /></Field>
        <div className="grid2">
          <Field label="Due date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></Field>
          <Field label="Due time"><input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
        </div>
        <Field label="Difficulty">
          <select value={rank} onChange={(e) => setRank(e.target.value as SideRank)}>
            {SIDE_RANKS.map((r) => <option key={r} value={r}>{r}-rank · {RANK_XP[r]} XP ({sideBonusXP({ rank: r })} if early)</option>)}
          </select>
        </Field>
        <Field label="Repeat">
          <select value={repeat} onChange={(e) => setRepeat(e.target.value as Repeat)}>
            {REPEATS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
        <Field label="Notes (optional)"><textarea rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} /></Field>
        <button type="submit" className="btn primary">{quest ? "Save" : "Add side quest"}</button>
      </form>
      {quest && (
        <div className="row wrap">
          {quest.repeat && !quest.done && (
            <button type="button" className="btn ghost small" onClick={() => {
              update((s) => { const q = s.sideQuests.find((x) => x.id === quest.id); if (q) q.dueAt = nextAfter(q); });
              toast("Skipped to the next one"); onClose();
            }}>Skip this one</button>
          )}
          <button type="button" className="btn danger ghost small" onClick={() => { update((s) => { s.sideQuests = s.sideQuests.filter((x) => x.id !== quest.id); }); toast("Deleted"); onClose(); }}>Delete</button>
        </div>
      )}
    </Dialog>
  );
}

const nextAfter = (q: SideQuest) => { let due = nextDue(q.dueAt, q.repeat); while (due <= Date.now()) due = nextDue(due, q.repeat); return due; };
