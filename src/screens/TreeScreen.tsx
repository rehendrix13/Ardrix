import { useState } from "react";
import { useStore } from "../lib/store";
import { navigate } from "../lib/router";
import { RANK_XP, skillDone, skillOpen, treeComplete, treeRank, treeStats, uid } from "../lib/game";
import { toggleCapstone, toggleQuest } from "../lib/actions";
import type { Branch, Skill, Tree } from "../lib/types";
import { Bar, Dialog, Empty, Field, RankBadge } from "../components/ui";

export function TreeScreen({ id, first }: { id: string; first: boolean }) {
  const { state, update, toast } = useStore();
  const tree = state.trees.find((t) => t.id === id);
  const [coach, setCoach] = useState(first);
  const [editing, setEditing] = useState(false);

  if (!tree) {
    return (
      <div className="screen">
        <Empty title="Skill tree not found">
          <button type="button" className="btn primary" onClick={() => navigate("/")}>Go home</button>
        </Empty>
      </div>
    );
  }

  const st = treeStats(tree), r = treeRank(tree), complete = treeComplete(tree);
  const firstOpenQuest = (() => {
    for (const b of tree.branches) {
      const i = b.skills.findIndex((s) => !skillDone(s));
      if (i >= 0 && skillOpen(b, i)) return b.skills[i].quests.find((q) => !q.done)?.id;
    }
    return undefined;
  })();

  const onQuest = (qid: string) => {
    let m = "";
    update((s) => { m = toggleQuest(s, qid); });
    toast(m);
    setCoach(false);
  };

  return (
    <div className="screen">
      <header className="topbar">
        <button type="button" className="btn link back" onClick={() => navigate("/")}>‹ Today</button>
        <button type="button" className="btn ghost small" onClick={() => setEditing(true)}>Edit</button>
      </header>

      <section className="card glow tree-hero">
        <div className="tree-hero-top">
          <span className="t-icon big" aria-hidden="true">{tree.icon}</span>
          <div>
            <h1>{tree.name}</h1>
            {tree.desc && <p className="muted">{tree.desc}</p>}
          </div>
          <RankBadge rank={r.rank} size={52} state={r.rank === "S" ? "done" : "open"} label={`Tree rank ${r.rank}`} />
        </div>
        <Bar value={st.pct} label="Tree progress" />
        <div className="meta"><span>{st.xp} / {st.max} XP · {st.done} of {st.total} quests</span><span>{r.line}</span></div>
      </section>

      {coach && (
        <div className="coach" role="note">
          <b>Your first quest is waiting.</b> Do it in real life, then tick it here to earn XP. Finish a skill's quests to unlock the next skill.
          <button type="button" className="btn link" onClick={() => setCoach(false)}>Got it</button>
        </div>
      )}

      {tree.branches.map((b) => (
        <BranchPanel key={b.id} branch={b} onQuest={onQuest} highlight={coach ? firstOpenQuest : undefined}
          onAddQuest={(skillId, text) => update((s) => {
            const sk = s.trees.find((t) => t.id === tree.id)?.branches.flatMap((x) => x.skills).find((x) => x.id === skillId);
            sk?.quests.push({ id: uid(), text, done: false });
          })} />
      ))}

      {tree.capstone.text && (
        <section className={`card capstone ${tree.capstone.done ? "done" : complete ? "open" : "locked"}`}>
          <p className="eyebrow">Capstone · 100 XP · Reach S-rank</p>
          <p className="capstone-text">{tree.capstone.text}</p>
          {complete || tree.capstone.done ? (
            <label className="quest">
              <input type="checkbox" checked={tree.capstone.done}
                onChange={() => { let m = ""; update((s) => { const t = s.trees.find((x) => x.id === tree.id); if (t) m = toggleCapstone(t); }); toast(m); }} />
              <span>{tree.capstone.done ? "Cleared. You've mastered this tree." : "Mark the capstone complete"}</span>
            </label>
          ) : <p className="muted small">Unlocks when every skill in this tree is complete.</p>}
        </section>
      )}

      {editing && <EditTree tree={tree} onClose={() => setEditing(false)} />}
    </div>
  );
}

function BranchPanel({ branch, onQuest, onAddQuest, highlight }: {
  branch: Branch; onQuest: (id: string) => void; onAddQuest: (skillId: string, text: string) => void; highlight?: string;
}) {
  const doneCount = branch.skills.filter(skillDone).length;
  return (
    <section className="card branch">
      <div className="card-head">
        <div><h2>{branch.name}</h2>{branch.desc && <p className="muted small">{branch.desc}</p>}</div>
        <small>{doneCount}/{branch.skills.length} skills</small>
      </div>
      <ol className="skill-path">
        {branch.skills.map((sk, i) => (
          <SkillRow key={sk.id} skill={sk} open={skillOpen(branch, i)} prev={branch.skills[i - 1]}
            onQuest={onQuest} onAddQuest={onAddQuest} highlight={highlight} />
        ))}
      </ol>
    </section>
  );
}

function SkillRow({ skill, open, prev, onQuest, onAddQuest, highlight }: {
  skill: Skill; open: boolean; prev?: Skill; onQuest: (id: string) => void; onAddQuest: (skillId: string, text: string) => void; highlight?: string;
}) {
  const done = skillDone(skill);
  const [expanded, setExpanded] = useState(false);
  const [adding, setAdding] = useState("");
  const showQuests = open && (!done || expanded);
  const left = skill.quests.filter((q) => !q.done).length;
  return (
    <li className={`skill ${done ? "done" : open ? "open" : "locked"}`}>
      <button type="button" className="skill-head" onClick={() => done && setExpanded(!expanded)} aria-expanded={done ? expanded : undefined} disabled={!done}>
        <RankBadge rank={skill.rank} size={40} state={done ? "done" : open ? "open" : "locked"} />
        <span className="skill-name">
          <b>{skill.name}</b>
          <small>
            {done ? `Mastered · ${skill.quests.length} quests` : open ? `${left} quest${left === 1 ? "" : "s"} left · ${RANK_XP[skill.rank]} XP each`
              : `Finish ${prev?.name ?? "the previous skill"} to unlock`}
          </small>
        </span>
        {done && <span className="chev" aria-hidden="true">{expanded ? "▴" : "▾"}</span>}
      </button>
      {showQuests && (
        <ul className="quest-list">
          {skill.quests.map((q) => (
            <li key={q.id} className={`quest ${q.done ? "done" : ""} ${highlight === q.id ? "pulse" : ""}`}>
              <input type="checkbox" id={`q-${q.id}`} checked={q.done} onChange={() => onQuest(q.id)} />
              <label htmlFor={`q-${q.id}`}><span>{q.text}</span>{q.assessed && <small>Already had this skill</small>}</label>
            </li>
          ))}
          <li className="add-quest">
            <form onSubmit={(e) => { e.preventDefault(); if (adding.trim()) { onAddQuest(skill.id, adding.trim()); setAdding(""); } }}>
              <input value={adding} onChange={(e) => setAdding(e.target.value)} placeholder="+ Add your own quest" aria-label={`Add a quest to ${skill.name}`} />
              {adding.trim() && <button type="submit" className="btn ghost small">Add</button>}
            </form>
          </li>
        </ul>
      )}
    </li>
  );
}

function EditTree({ tree, onClose }: { tree: Tree; onClose: () => void }) {
  const { update, toast } = useStore();
  const [name, setName] = useState(tree.name);
  const [icon, setIcon] = useState(tree.icon);
  const [confirmDel, setConfirmDel] = useState(false);
  return (
    <Dialog title="Edit skill tree" onClose={onClose}>
      <form className="stack" onSubmit={(e) => {
        e.preventDefault();
        update((s) => { const t = s.trees.find((x) => x.id === tree.id); if (t) { t.name = name.trim() || t.name; t.icon = icon.trim() || t.icon; } });
        toast("Saved"); onClose();
      }}>
        <Field label="Name"><input value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} /></Field>
        <Field label="Icon (an emoji)"><input value={icon} onChange={(e) => setIcon(e.target.value)} maxLength={4} /></Field>
        <button type="submit" className="btn primary">Save</button>
      </form>
      <hr />
      {!confirmDel ? (
        <button type="button" className="btn danger ghost" onClick={() => setConfirmDel(true)}>Delete this tree</button>
      ) : (
        <div className="stack">
          <p>Delete <b>{tree.name}</b> and all its progress? This can't be undone.</p>
          <div className="row">
            <button type="button" className="btn danger" onClick={() => { update((s) => { s.trees = s.trees.filter((t) => t.id !== tree.id); }); toast("Tree deleted"); navigate("/"); }}>Delete</button>
            <button type="button" className="btn ghost" onClick={() => setConfirmDel(false)}>Keep it</button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
