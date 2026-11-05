// First run: welcome -> name -> pick a goal -> optional self-assessment -> first quest.
import { useState } from "react";
import { useStore } from "../lib/store";
import { navigate } from "../lib/router";
import { TEMPLATES, instantiate, type Template } from "../content/templates";
import { assessSkills } from "../lib/actions";
import { syncConfigured } from "../lib/supabase";
import { AccountPanel } from "../components/Account";
import { Field, RankBadge } from "../components/ui";
import { Logo } from "../components/Logo";

type Step = "hello" | "signin" | "name" | "pick" | "assess";

export function Welcome() {
  const { state, update } = useStore();
  const [step, setStep] = useState<Step>("hello");
  const [name, setName] = useState(state.profile.name);
  const [treeId, setTreeId] = useState<string | null>(null);
  const [known, setKnown] = useState<string[]>([]);
  const tree = state.trees.find((t) => t.id === treeId);

  const pick = (t: Template) => {
    const nt = instantiate(t);
    update((s) => { s.trees.push(nt); });
    setTreeId(nt.id);
    setStep("assess");
  };

  const finish = () => {
    navigate(`/tree/${treeId}?first=1`);
    update((s) => {
      const t = s.trees.find((x) => x.id === treeId);
      if (t && known.length) assessSkills(t, known);
      s.profile.onboarded = true;
    });
  };

  return (
    <div className="welcome">
      {step === "hello" && (
        <section className="hero">
          <Logo size={88} />
          <h1>Ardrix</h1>
          <p className="lead">Turn big goals into skill trees you can level up.</p>
          <ul className="how">
            <li><b>Pick a goal.</b> Fitness, money, mood, learning, or build your own.</li>
            <li><b>Clear small quests.</b> Each one earns XP and unlocks the next skill.</li>
            <li><b>Rank up.</b> Watch yourself climb from E-rank to S-rank.</li>
          </ul>
          <button type="button" className="btn primary big" onClick={() => setStep("name")}>Start free</button>
          {syncConfigured() && <button type="button" className="btn link" onClick={() => setStep("signin")}>I already have an account</button>}
        </section>
      )}

      {step === "signin" && (
        <section className="card">
          <h2>Welcome back</h2>
          <AccountPanel compact />
          <button type="button" className="btn link" onClick={() => setStep("hello")}>Back</button>
        </section>
      )}

      {step === "name" && (
        <form className="card" onSubmit={(e) => { e.preventDefault(); update((s) => { s.profile.name = name.trim(); }); setStep("pick"); }}>
          <p className="step">Step 1 of 3</p>
          <h2>What should we call you?</h2>
          <Field label="Your first name or a nickname">
            <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" maxLength={40} placeholder="e.g. Sam" />
          </Field>
          <button type="submit" className="btn primary big">{name.trim() ? "Continue" : "Skip"}</button>
        </form>
      )}

      {step === "pick" && (
        <section>
          <p className="step">Step 2 of 3</p>
          <h2>What do you want to level up{name.trim() ? `, ${name.trim()}` : ""}?</h2>
          <p className="muted">Pick one to start. You can add more trees any time.</p>
          <div className="template-grid">
            {TEMPLATES.map((t) => (
              <button key={t.id} type="button" className="template-card" onClick={() => pick(t)}>
                <span className="t-icon" aria-hidden="true">{t.icon}</span>
                <b>{t.name}</b>
                <span>{t.tagline}</span>
                {t.category === "career" && <em>Career</em>}
              </button>
            ))}
            <button type="button" className="template-card custom" onClick={() => navigate("/build?onboarding=1")}>
              <span className="t-icon" aria-hidden="true">🛠️</span>
              <b>Build my own</b>
              <span>Break any goal into steps with a guided builder.</span>
            </button>
          </div>
        </section>
      )}

      {step === "assess" && tree && (
        <section className="card">
          <p className="step">Step 3 of 3</p>
          <h2>Already good at any of these?</h2>
          <p className="muted">Tick the skills you already have so you don't start from zero. Not sure? Skip it.</p>
          <div className="stack">
            {tree.branches.map((b) => {
              const s = b.skills[0];
              const on = known.includes(s.id);
              return (
                <label key={s.id} className={`assess ${on ? "on" : ""}`}>
                  <input type="checkbox" checked={on} onChange={() => setKnown(on ? known.filter((x) => x !== s.id) : [...known, s.id])} />
                  <RankBadge rank={s.rank} size={32} state={on ? "done" : "open"} />
                  <span><b>{s.name}</b><small>{b.name} · {s.quests[0]?.text}</small></span>
                </label>
              );
            })}
          </div>
          <button type="button" className="btn primary big" onClick={finish}>{known.length ? "Continue" : "Skip, start from the beginning"}</button>
        </section>
      )}
    </div>
  );
}
