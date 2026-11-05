// "Build my own": a guided, four-step goal breakdown for goals no template covers.
import { useState } from "react";
import { useStore } from "../lib/store";
import { navigate, useRoute } from "../lib/router";
import { AREA_IDEAS, RANK_BY_POSITION, draftProblems, draftToTree, emptyDraft, splitLines, type Draft } from "../lib/builder";
import { RANK_XP } from "../lib/game";
import { Field, RankBadge } from "../components/ui";
import { AiHelperCard, AiHelperDialog } from "../components/AiHelper";

const ICONS = ["🎯", "🎸", "🏃", "🗣️", "🎨", "💻", "🧘", "📈", "🏡", "✍️", "🌱", "⚡"];
const STEPS = ["Goal", "Areas", "Steps", "Finish"];

export function Builder() {
  const { state, update, toast } = useStore();
  const route = useRoute();
  const [aiOpen, setAiOpen] = useState(false);
  const aiOn = state.profile.aiHelper !== false;
  const onboarding = route.query.get("onboarding") === "1";
  const [d, setD] = useState<Draft>(emptyDraft);
  const [step, setStep] = useState(0);
  const set = (fn: (x: Draft) => void) => setD((prev) => { const n = structuredClone(prev); fn(n); return n; });
  const areas = d.branches.filter((b) => b.name.trim());
  const problems = draftProblems(d);

  const canNext = step === 0 ? !!d.goal.trim() : step === 1 ? areas.length > 0 : true;

  const create = () => {
    const tree = draftToTree(d);
    update((s) => { s.trees.push(tree); if (onboarding) s.profile.onboarded = true; });
    toast(`${tree.name} is ready`);
    navigate(`/tree/${tree.id}?first=1`);
  };

  return (
    <div className="screen builder">
      <header className="topbar">
        <button type="button" className="btn link back" onClick={() => (step ? setStep(step - 1) : navigate(onboarding ? "/welcome" : "/add"))}>‹ Back</button>
        <span className="muted small">Build my own</span>
      </header>
      <ol className="stepper" aria-label="Progress">
        {STEPS.map((s, i) => <li key={s} className={i === step ? "on" : i < step ? "done" : ""}>{s}</li>)}
      </ol>

      {step === 0 && (
        <section className="card stack">
          <h2>What's the big goal?</h2>
          <p className="muted">Name it the way you'd say it out loud. Big is fine. We'll break it down next.</p>
          <Field label="Your goal"><input value={d.goal} onChange={(e) => set((x) => { x.goal = e.target.value; })} placeholder="e.g. Learn guitar, Run a half marathon, Start a business" maxLength={60} /></Field>
          <Field label="Why does it matter to you? (optional)" hint="On hard days, this is what you'll read.">
            <textarea rows={2} value={d.why} onChange={(e) => set((x) => { x.why = e.target.value; })} placeholder="e.g. I want to play songs with my kids" />
          </Field>
          <div className="icon-pick" role="radiogroup" aria-label="Icon">
            {ICONS.map((ic) => (
              <button key={ic} type="button" role="radio" aria-checked={d.icon === ic} className={d.icon === ic ? "on" : ""} onClick={() => set((x) => { x.icon = ic; })}>{ic}</button>
            ))}
          </div>
          {aiOn && <AiHelperCard goal={d.goal} onOpen={() => setAiOpen(true)} />}
        </section>
      )}

      {aiOpen && (
        <AiHelperDialog goal={d.goal} why={d.why} onClose={() => setAiOpen(false)} onDraft={(p) => {
          set((x) => { x.branches = p.branches; if (p.capstone) x.capstone = p.capstone; });
          setAiOpen(false);
          setStep(2);
          toast("Draft loaded. Review and edit anything before you create it.");
        }} />
      )}

      {step === 1 && (
        <section className="card stack">
          <h2>What areas does it take?</h2>
          <p className="muted">Think of 2 to 5 parts of <b>{d.goal}</b>. Each becomes a branch of your tree.</p>
          {d.branches.map((b, i) => (
            <div key={i} className="row">
              <input aria-label={`Area ${i + 1}`} value={b.name} onChange={(e) => set((x) => { x.branches[i].name = e.target.value; })} placeholder={`Area ${i + 1}, e.g. ${AREA_IDEAS[i % AREA_IDEAS.length]}`} maxLength={40} />
              {d.branches.length > 1 && <button type="button" className="icon-btn" aria-label="Remove area" onClick={() => set((x) => { x.branches.splice(i, 1); })}>✕</button>}
            </div>
          ))}
          {d.branches.length < 6 && <button type="button" className="btn ghost" onClick={() => set((x) => { x.branches.push({ name: "", skills: [{ name: "", quests: "" }] }); })}>+ Add an area</button>}
          <div className="chips">
            <span className="muted small">Ideas:</span>
            {AREA_IDEAS.map((idea) => (
              <button key={idea} type="button" className="chip" onClick={() => set((x) => {
                const empty = x.branches.find((b) => !b.name.trim());
                if (empty) empty.name = idea; else if (x.branches.length < 6) x.branches.push({ name: idea, skills: [{ name: "", quests: "" }] });
              })}>{idea}</button>
            ))}
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="stack">
          <div className="card">
            <h2>Break each area into skills and quests</h2>
            <p className="muted">A <b>skill</b> is something you get good at. <b>Quests</b> are small actions that build it, one per line. Skills unlock in order and rank up: E, then C, then A.</p>
          </div>
          {d.branches.map((b, bi) => b.name.trim() && (
            <div key={bi} className="card stack">
              <h3>{b.name}</h3>
              {b.skills.map((s, si) => (
                <div key={si} className="builder-skill">
                  <div className="row">
                    <RankBadge rank={RANK_BY_POSITION[si]} size={34} />
                    <input aria-label={`Skill ${si + 1} in ${b.name}`} value={s.name} maxLength={50}
                      onChange={(e) => set((x) => { x.branches[bi].skills[si].name = e.target.value; })}
                      placeholder={si === 0 ? "First skill, the easiest one" : "Next skill, a step harder"} />
                    {b.skills.length > 1 && <button type="button" className="icon-btn" aria-label="Remove skill" onClick={() => set((x) => { x.branches[bi].skills.splice(si, 1); })}>✕</button>}
                  </div>
                  <textarea rows={3} aria-label={`Quests for skill ${si + 1}`} value={s.quests}
                    onChange={(e) => set((x) => { x.branches[bi].skills[si].quests = e.target.value; })}
                    placeholder={"One quest per line, e.g.\nPractice for 15 minutes\nWatch one beginner lesson"} />
                  <small className="muted">{splitLines(s.quests).length} quest{splitLines(s.quests).length === 1 ? "" : "s"} · {RANK_XP[RANK_BY_POSITION[si]]} XP each</small>
                </div>
              ))}
              {b.skills.length < RANK_BY_POSITION.length && (
                <button type="button" className="btn ghost small" onClick={() => set((x) => { x.branches[bi].skills.push({ name: "", quests: "" }); })}>+ Add a harder skill</button>
              )}
            </div>
          ))}
        </section>
      )}

      {step === 3 && (
        <section className="card stack">
          <h2>What does "done" look like?</h2>
          <Field label="Capstone challenge (optional)" hint="One big final challenge worth 100 XP that proves you made it. Clearing it makes the tree S-rank.">
            <textarea rows={2} value={d.capstone} onChange={(e) => set((x) => { x.capstone = e.target.value; })} placeholder="e.g. Play three full songs for friends" />
          </Field>
          <div className="summary">
            <p><b>{d.icon} {d.goal || "Your goal"}</b></p>
            <p className="muted small">{areas.length} area{areas.length === 1 ? "" : "s"} · {areas.reduce((a, b) => a + b.skills.filter((s) => s.name.trim()).length, 0)} skills · {areas.reduce((a, b) => a + b.skills.reduce((c, s) => c + splitLines(s.quests).length, 0), 0)} quests</p>
          </div>
          {problems.length > 0 && (
            <ul className="problems" role="alert">{problems.map((p) => <li key={p}>{p}</li>)}</ul>
          )}
          <button type="button" className="btn primary big" disabled={problems.length > 0} onClick={create}>Create my skill tree</button>
        </section>
      )}

      {step < 3 && (
        <div className="builder-nav">
          <button type="button" className="btn primary big" disabled={!canNext} onClick={() => setStep(step + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}
