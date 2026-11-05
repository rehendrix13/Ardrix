// The optional "Use any AI" helper. Ardrix never talks to an AI itself: the player copies
// a prompt into the chatbot they choose, then pastes the answer back here.
import { useState } from "react";
import { buildPrompt, parseAnswer, type ParsedDraft } from "../lib/aiPrompt";
import { Dialog } from "./ui";

export function AiHelperCard({ goal, onOpen }: { goal: string; onOpen: () => void }) {
  return (
    <div className="ai-card">
      <div>
        <b>Want a head start?</b>
        <p className="muted small">Get a first draft from any AI chatbot you like, then edit it here. Optional.</p>
      </div>
      <button type="button" className="btn ghost small" onClick={onOpen} disabled={!goal.trim()} title={goal.trim() ? undefined : "Name your goal first"}>
        Use any AI
      </button>
    </div>
  );
}

export function AiHelperDialog({ goal, why, onClose, onDraft }: {
  goal: string; why: string; onClose: () => void; onDraft: (d: ParsedDraft) => void;
}) {
  const prompt = buildPrompt(goal, why);
  const [copied, setCopied] = useState(false);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");

  const copy = async () => {
    try { await navigator.clipboard.writeText(prompt); setCopied(true); }
    catch { setError("Couldn't copy automatically. Press and hold the text above to copy it."); }
  };

  const load = () => {
    const parsed = parseAnswer(answer);
    if (!parsed) { setError("Ardrix couldn't find any areas, skills and quests in that answer. Make sure you pasted the whole reply, or ask the AI to use the exact format from the prompt."); return; }
    onDraft(parsed);
  };

  return (
    <Dialog title="Use any AI" onClose={onClose} wide>
      <ol className="ai-steps">
        <li>
          <b>Copy this prompt</b>
          <textarea className="prompt-box" readOnly rows={7} value={prompt} onFocus={(e) => e.currentTarget.select()} aria-label="Prompt to copy" />
          <button type="button" className="btn primary small" onClick={copy}>{copied ? "Copied ✓" : "Copy prompt"}</button>
        </li>
        <li>
          <b>Paste it into the AI of your choice</b>
          <p className="muted small">ChatGPT, Claude, Gemini, Copilot or any other chatbot. A free account works.</p>
        </li>
        <li>
          <b>Paste the whole answer here</b>
          <textarea rows={6} value={answer} onChange={(e) => { setAnswer(e.target.value); setError(""); }} placeholder={"AREA: …\nSKILL: …\n- …"} aria-label="AI answer" />
        </li>
      </ol>
      {error && <p className="error" role="alert">{error}</p>}
      <button type="button" className="btn primary big" disabled={!answer.trim()} onClick={load}>Build my draft</button>
      <p className="muted small">You'll be able to review and edit everything before your tree is created.</p>
    </Dialog>
  );
}
