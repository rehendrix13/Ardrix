// Calendar: a week strip and the selected day's meetings, time blocks and side quests.
import { useState, type CSSProperties } from "react";
import { useStore } from "../lib/store";
import { DAY_NAMES, addDays, dayKey, durLabel, fmtHM, fromMin, keyToDate, longDate, timeStr, toMin, todayKey } from "../lib/dates";
import { MEETING_XP, eventStarted, eventXP, eventsOn, isOverdue, uid } from "../lib/game";
import { toggleSide } from "../lib/actions";
import type { CalEvent, Repeat } from "../lib/types";
import { Dialog, Field } from "../components/ui";
import { REPEATS, SideQuestForm } from "./SideQuests";

const COLORS: [string, string][] = [["#ff8a3d", "Ember"], ["#4fc3ff", "Blue"], ["#5ee6a8", "Green"], ["#f5c451", "Gold"], ["#c58bff", "Purple"], ["#ff8fb1", "Pink"], ["#9fb0c8", "Slate"]];
const TYPES: [string, string][] = [["meeting", `Meeting · ${MEETING_XP} XP`], ["block0", "Time block · no XP"], ["block3", "Time block · 3 XP"], ["block5", "Time block · 5 XP"], ["block10", "Time block · 10 XP"]];

export function Calendar() {
  const { state, update, toast } = useStore();
  const [day, setDay] = useState(todayKey());
  const [editing, setEditing] = useState<{ event?: CalEvent; start?: string } | null>(null);
  const [open, setOpen] = useState<CalEvent | null>(null);
  const [newSide, setNewSide] = useState(false);

  const weekStart = (() => { const d = keyToDate(day); d.setDate(d.getDate() - d.getDay()); return dayKey(d); })();
  const items = [
    ...eventsOn(state.events, day).map((e) => ({ kind: "event" as const, at: toMin(e.start), e })),
    ...state.sideQuests.filter((q) => dayKey(new Date(q.dueAt)) === day)
      .map((q) => ({ kind: "side" as const, at: new Date(q.dueAt).getHours() * 60 + new Date(q.dueAt).getMinutes(), q })),
  ].sort((a, b) => a.at - b.at);

  const toggleEvent = (e: CalEvent) => {
    if (!e.done[day] && !eventStarted(e, day)) { toast(`You can check this off once it starts at ${fmtHM(e.start)}`); return; }
    update((s) => {
      const ev = s.events.find((x) => x.id === e.id); if (!ev) return;
      if (ev.done[day]) delete ev.done[day]; else ev.done[day] = Date.now();
    });
    if (!e.done[day]) toast(eventXP(e) ? `+${eventXP(e)} XP` : "Done");
  };

  return (
    <div className="screen">
      <header className="topbar">
        <h1>Calendar</h1>
        <div className="row">
          <button type="button" className="btn ghost small" onClick={() => setNewSide(true)}>+ Side quest</button>
          <button type="button" className="btn primary small" onClick={() => setEditing({})}>+ Event</button>
        </div>
      </header>

      <div className="week-strip">
        <button type="button" className="icon-btn" aria-label="Previous week" onClick={() => setDay(addDays(day, -7))}>‹</button>
        {Array.from({ length: 7 }, (_, i) => {
          const k = addDays(weekStart, i), d = keyToDate(k);
          const count = eventsOn(state.events, k).length + state.sideQuests.filter((q) => !q.done && dayKey(new Date(q.dueAt)) === k).length;
          return (
            <button key={k} type="button" className={`wk-day ${k === day ? "sel" : ""} ${k === todayKey() ? "today" : ""}`} onClick={() => setDay(k)} aria-pressed={k === day}>
              <small>{DAY_NAMES[d.getDay()].slice(0, 3)}</small>
              <b>{d.getDate()}</b>
              <span className="dots">{count ? "•".repeat(Math.min(count, 3)) : " "}</span>
            </button>
          );
        })}
        <button type="button" className="icon-btn" aria-label="Next week" onClick={() => setDay(addDays(day, 7))}>›</button>
      </div>

      <section className="card">
        <div className="card-head">
          <h2>{longDate(day)}</h2>
          {day !== todayKey() && <button type="button" className="btn link" onClick={() => setDay(todayKey())}>Today</button>}
        </div>
        {items.length === 0 ? (
          <p className="muted">Nothing scheduled. Add meetings and time blocks: repeating ones only need setting up once.</p>
        ) : (
          <ul className="timeline">
            {items.map((it) => it.kind === "event" ? (
              <li key={it.e.id} className={`tl ${it.e.done[day] ? "done" : ""} ${day < todayKey() && !it.e.done[day] && eventXP(it.e) ? "missed" : ""}`} style={{ "--ec": it.e.color } as CSSProperties}>
                <span className="tl-time">{fmtHM(it.e.start)}</span>
                <input type="checkbox" checked={!!it.e.done[day]} onChange={() => toggleEvent(it.e)} aria-label={`Complete ${it.e.title}`} />
                <button type="button" className="row-link" onClick={() => setOpen(it.e)}>
                  <span>{it.e.title}{it.e.repeat && <span className="muted"> ↻</span>}</span>
                  <small>{fmtHM(it.e.start)} – {fmtHM(it.e.end)} ({durLabel(toMin(it.e.end) - toMin(it.e.start))}){eventXP(it.e) ? ` · ${eventXP(it.e)} XP` : ""}</small>
                </button>
              </li>
            ) : (
              <li key={it.q.id} className={`tl side ${it.q.done ? "done" : ""} ${isOverdue(it.q) ? "missed" : ""}`}>
                <span className="tl-time">{timeStr(it.q.dueAt)}</span>
                <input type="checkbox" checked={it.q.done} aria-label={`Complete ${it.q.title}`}
                  onChange={() => { let m = ""; update((s) => { m = toggleSide(s, it.q.id); }); toast(m); }} />
                <span className="row-link static"><span><b className={`mini-rank r-${it.q.rank}`}>{it.q.rank}</b> {it.q.title}</span><small>Side quest due</small></span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {open && (
        <Dialog title={open.title} onClose={() => setOpen(null)}>
          <p>{fmtHM(open.start)} – {fmtHM(open.end)} · {open.kind === "meeting" ? "Meeting" : "Time block"}{eventXP(open) ? ` · ${eventXP(open)} XP` : ""}</p>
          {open.repeat && <p className="muted small">Repeats: {REPEATS.find(([v]) => v === open.repeat)?.[1]}</p>}
          <div className="row wrap">
            <button type="button" className="btn primary" onClick={() => { toggleEvent(open); setOpen(null); }}>{open.done[day] ? "Mark not done" : "Complete"}</button>
            <button type="button" className="btn ghost" onClick={() => { setEditing({ event: open }); setOpen(null); }}>Edit{open.repeat ? " series" : ""}</button>
            {open.repeat && <button type="button" className="btn ghost" onClick={() => { update((s) => { s.events.find((x) => x.id === open.id)?.skips.push(day); }); toast("Skipped for this day"); setOpen(null); }}>Skip this day</button>}
            <button type="button" className="btn danger ghost" onClick={() => { update((s) => { s.events = s.events.filter((x) => x.id !== open.id); }); toast("Deleted"); setOpen(null); }}>Delete{open.repeat ? " series" : ""}</button>
          </div>
        </Dialog>
      )}
      {editing && <EventForm event={editing.event} date={day} onClose={() => setEditing(null)} />}
      {newSide && <SideQuestForm presetDate={day} onClose={() => setNewSide(false)} />}
    </div>
  );
}

function EventForm({ event, date, onClose }: { event?: CalEvent; date: string; onClose: () => void }) {
  const { update, toast } = useStore();
  const defStart = (() => { const d = new Date(); return fromMin(Math.min(23 * 60, Math.ceil((d.getHours() * 60 + d.getMinutes()) / 30) * 30)); })();
  const [title, setTitle] = useState(event?.title ?? "");
  const [type, setType] = useState(event ? (event.kind === "meeting" ? "meeting" : `block${event.xp}`) : "meeting");
  const [day, setDay] = useState(event?.date ?? date);
  const [start, setStart] = useState(event?.start ?? defStart);
  const [end, setEnd] = useState(event?.end ?? fromMin(Math.min(toMin(defStart) + 30, 23 * 60 + 59)));
  const [repeat, setRepeat] = useState<Repeat>(event?.repeat ?? "");
  const [color, setColor] = useState(event?.color ?? COLORS[0][0]);

  const save = () => {
    if (!title.trim()) return;
    const fixedEnd = toMin(end) > toMin(start) ? end : fromMin(Math.min(toMin(start) + 30, 23 * 60 + 59));
    const kind = type === "meeting" ? "meeting" : "block";
    const xp = kind === "meeting" ? MEETING_XP : Number(type.replace("block", "")) || 0;
    const data = { title: title.trim(), kind, xp, date: day, start, end: fixedEnd, repeat, color } as const;
    update((s) => {
      const ev = event && s.events.find((x) => x.id === event.id);
      if (ev) Object.assign(ev, data);
      else s.events.push({ id: uid(), ...data, skips: [], done: {}, createdAt: Date.now() });
    });
    toast(event ? "Event updated" : `Added · ${fmtHM(start)}`);
    onClose();
  };

  return (
    <Dialog title={event ? "Edit event" : "New event"} onClose={onClose}>
      <form className="stack" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <Field label="Title"><input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={60} placeholder="e.g. Team standup, Deep work" /></Field>
        <Field label="Type" hint="Check events off once they start to earn their XP.">
          <select value={type} onChange={(e) => setType(e.target.value)}>{TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        </Field>
        <Field label={event?.repeat ? "Starts on" : "Date"}><input type="date" value={day} onChange={(e) => setDay(e.target.value)} required /></Field>
        <div className="grid2">
          <Field label="Start"><input type="time" value={start} onChange={(e) => setStart(e.target.value)} required /></Field>
          <Field label="End"><input type="time" value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
        </div>
        <Field label="Repeat"><select value={repeat} onChange={(e) => setRepeat(e.target.value as Repeat)}>{REPEATS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
        <div className="color-pick" role="radiogroup" aria-label="Color">
          {COLORS.map(([c, name]) => <button key={c} type="button" role="radio" aria-checked={color === c} aria-label={name} className={color === c ? "on" : ""} style={{ background: c }} onClick={() => setColor(c)} />)}
        </div>
        <button type="submit" className="btn primary">{event ? "Save" : "Add event"}</button>
      </form>
    </Dialog>
  );
}
