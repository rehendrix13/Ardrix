import { useState } from "react";
import { useStore } from "../lib/store";
import { navigate } from "../lib/router";
import { TEMPLATES, instantiate, type Template } from "../content/templates";
import { treeRank, treeStats } from "../lib/game";
import { Bar, Dialog, RankBadge } from "../components/ui";

export function AddTree() {
  const { state, update, toast } = useStore();
  const [preview, setPreview] = useState<Template | null>(null);
  const has = (id: string) => state.trees.some((t) => t.source === id);

  const start = (t: Template) => {
    const nt = instantiate(t);
    update((s) => { s.trees.push(nt); });
    toast(`${t.name} added`);
    navigate(`/tree/${nt.id}?first=1`);
  };

  return (
    <div className="screen">
      <header className="topbar"><h1>Skill trees</h1></header>

      {state.trees.length > 0 && (
        <section className="card">
          <h2>Yours</h2>
          <ul className="tree-list">
            {state.trees.map((t) => {
              const st = treeStats(t), r = treeRank(t);
              return (
                <li key={t.id}>
                  <button type="button" className="tree-row" onClick={() => navigate(`/tree/${t.id}`)}>
                    <span className="t-icon" aria-hidden="true">{t.icon}</span>
                    <span className="tree-row-main"><b>{t.name}</b><Bar value={st.pct} /><small>{Math.round(st.pct * 100)}% complete</small></span>
                    <RankBadge rank={r.rank} size={36} />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section>
        <h2 className="section-title">Add a goal</h2>
        <div className="template-grid">
          <button type="button" className="template-card custom" onClick={() => navigate("/build")}>
            <span className="t-icon" aria-hidden="true">🛠️</span>
            <b>Build my own</b>
            <span>Any goal, broken into steps with a guided builder.</span>
          </button>
          {TEMPLATES.map((t) => (
            <button key={t.id} type="button" className="template-card" onClick={() => setPreview(t)}>
              <span className="t-icon" aria-hidden="true">{t.icon}</span>
              <b>{t.name}</b>
              <span>{t.tagline}</span>
              {has(t.id) ? <em>Added</em> : t.category === "career" ? <em>Career</em> : null}
            </button>
          ))}
        </div>
      </section>

      {preview && (
        <Dialog title={`${preview.icon} ${preview.name}`} onClose={() => setPreview(null)} wide>
          <p>{preview.desc}</p>
          {preview.note && <p className="note">{preview.note}</p>}
          <ul className="preview-branches">
            {preview.branches.map(([name, desc, skills]) => (
              <li key={name}><b>{name}</b> <span className="muted">{desc}</span>
                <div className="chips">{skills.map(([rank, sName]) => <span key={sName} className={`chip r-${rank}`}>{rank} · {sName}</span>)}</div>
              </li>
            ))}
          </ul>
          <p className="muted small"><b>Capstone:</b> {preview.capstone}</p>
          {has(preview.id) && <p className="note">You already have this tree. Starting it again adds a fresh copy.</p>}
          <button type="button" className="btn primary big" onClick={() => start(preview)}>Start this tree</button>
        </Dialog>
      )}
    </div>
  );
}
