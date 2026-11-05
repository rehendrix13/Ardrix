// Shared building blocks: rank badges, progress bars, dialogs, toasts and the tab bar.
import { useEffect, useRef, type ReactNode } from "react";
import type { Rank } from "../lib/types";
import { useStore } from "../lib/store";
import { navigate, type RouteName } from "../lib/router";
import { titleFor } from "../lib/game";

const hexPoints = (cx: number, cy: number, r: number) =>
  Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(" ");

export function RankBadge({ rank, state = "open", size = 40, label }: { rank: Rank; state?: "open" | "done" | "locked"; size?: number; label?: string }) {
  return (
    <svg className={`rank-badge r-${rank} ${state}`} width={size} height={size} viewBox="0 0 40 40" role="img" aria-label={label ?? `${rank}-rank`}>
      <polygon points={hexPoints(20, 20, 18)} />
      <text x="20" y="25.5" textAnchor="middle">{state === "locked" ? "🔒" : rank}</text>
    </svg>
  );
}

export function Bar({ value, label }: { value: number; label?: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={label}>
      <i style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Dialog({ title, children, onClose, wide }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const first = ref.current?.querySelector<HTMLElement>("input, textarea, select, button.primary");
    window.setTimeout(() => first?.focus(), 30);
    document.body.classList.add("locked");
    return () => { document.removeEventListener("keydown", onKey); document.body.classList.remove("locked"); };
  }, [onClose]);
  return (
    <div className="dialog-bg" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`dialog ${wide ? "wide" : ""}`} role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <div className="dialog-head">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

export function Toast() {
  const { toastMsg } = useStore();
  return <div className={`toast ${toastMsg ? "show" : ""}`} role="status" aria-live="polite">{toastMsg}</div>;
}

export function LevelUp() {
  const { levelUp, dismissLevelUp } = useStore();
  useEffect(() => {
    if (!levelUp) return;
    const t = window.setTimeout(dismissLevelUp, 3200);
    return () => window.clearTimeout(t);
  }, [levelUp, dismissLevelUp]);
  if (!levelUp) return null;
  return (
    <button type="button" className="levelup" onClick={dismissLevelUp} aria-live="assertive">
      <span className="levelup-ring" aria-hidden="true" />
      <small>Level up</small>
      <b>{levelUp}</b>
      <span>{titleFor(levelUp)}</span>
    </button>
  );
}

const TABS: [RouteName, string, string][] = [
  ["home", "Today", "M3 11 12 3l9 8v10h-6v-6H9v6H3z"],
  ["add", "Trees", "M12 2 3 7v10l9 5 9-5V7zm0 3.2 5.9 3.3L12 11.8 6.1 8.5zM5 10.2l6 3.3v6.4l-6-3.3zm8 9.7v-6.4l6-3.3v6.4z"],
  ["quests", "Quests", "M5 3h11l3 3v15H5zm3 6h8M8 13h8M8 17h5"],
  ["calendar", "Calendar", "M4 5h16v16H4zM4 10h16M8 3v4M16 3v4"],
  ["settings", "You", "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-8 9c0-4 4-6 8-6s8 2 8 6"],
];

export function TabBar({ current }: { current: RouteName }) {
  const active = current === "tree" || current === "build" ? "add" : current;
  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.map(([name, label, d]) => (
        <button key={name} type="button" className={active === name ? "on" : ""} aria-current={active === name ? "page" : undefined}
          onClick={() => navigate(name === "home" ? "/" : `/${name}`)}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d={d} /></svg>
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="empty"><h3>{title}</h3>{children}</div>;
}
