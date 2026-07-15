"use client";

import { useState } from "react";
import { BriefForm, type BriefValues } from "@/components/brief-form";
import { DraftView } from "@/components/draft-view";
import { Scorecard } from "@/components/scorecard";
import { Stepper, type Step } from "@/components/stepper";
import type { EvalResult } from "@/lib/ai/schema";

const DEFAULT_BRIEF: BriefValues = {
  topic: "Why eval harnesses beat prompt tinkering for DevRel content",
  audience: "Content engineers and DevRel writers shipping AI demos",
  pov: "Measurable rubrics beat vibe-checks when quality has to ship",
  voice: "Direct, opinionated, lightly wry",
};

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? `Request failed (${res.status})`);
  }
  return data as T;
}

export default function HomePage() {
  const [brief, setBrief] = useState<BriefValues>(DEFAULT_BRIEF);
  const [step, setStep] = useState<Step>("brief");
  const [draft, setDraft] = useState("");
  const [evaluation, setEvaluation] = useState<EvalResult | null>(null);
  const [revisedDraft, setRevisedDraft] = useState("");
  const [revisedEval, setRevisedEval] = useState<EvalResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDraft() {
    setBusy(true);
    setError(null);
    setEvaluation(null);
    setRevisedDraft("");
    setRevisedEval(null);
    setStep("draft");
    try {
      const { draft: next } = await postJson<{ draft: string }>(
        "/api/draft",
        brief,
      );
      setDraft(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Draft failed");
      setStep("brief");
    } finally {
      setBusy(false);
    }
  }

  async function handleEvaluate() {
    if (!draft) return;
    setBusy(true);
    setError(null);
    setStep("evaluate");
    try {
      const { evaluation: next } = await postJson<{ evaluation: EvalResult }>(
        "/api/evaluate",
        { draft },
      );
      setEvaluation(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Evaluate failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleRevise() {
    if (!draft || !evaluation) return;
    setBusy(true);
    setError(null);
    setStep("revise");
    try {
      const { revisedDraft: next } = await postJson<{ revisedDraft: string }>(
        "/api/revise",
        { draft, evaluation },
      );
      setRevisedDraft(next);
      const { evaluation: reEval } = await postJson<{ evaluation: EvalResult }>(
        "/api/evaluate",
        { draft: next },
      );
      setRevisedEval(reEval);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Revise failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
      <header className="mb-10 flex flex-col gap-5 border-b border-[var(--line)] pb-8">
        <p className="font-[family-name:var(--font-mono)] text-xs tracking-[0.18em] text-[var(--accent)] uppercase">
          Portfolio demo
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h1 className="max-w-xl text-4xl font-bold tracking-tight text-[var(--ink)] sm:text-5xl">
            Content Engine
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-[var(--muted)]">
            Draft technical writing, grade it against an editorial rubric, then
            revise from the critique — prompts, harness, and UI kept separate.
          </p>
        </div>
        <Stepper current={step} />
      </header>

      {error && (
        <div
          role="alert"
          className="mb-6 rounded-sm border border-[var(--warn)]/40 bg-[#f8ece8] px-4 py-3 text-sm text-[var(--warn)]"
        >
          {error}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(240px,300px)_1fr]">
        <aside className="flex flex-col gap-4">
          <h2 className="text-xs font-medium tracking-wide text-[var(--muted)] uppercase">
            Brief
          </h2>
          <BriefForm
            values={brief}
            onChange={setBrief}
            onSubmit={handleDraft}
            disabled={busy}
          />
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleEvaluate}
              disabled={busy || !draft}
              className="rounded-sm border border-[var(--line)] bg-[var(--bg-elevated)] px-4 py-2.5 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Evaluate
            </button>
            <button
              type="button"
              onClick={handleRevise}
              disabled={busy || !evaluation}
              className="rounded-sm border border-[var(--line)] bg-[var(--bg-elevated)] px-4 py-2.5 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Revise & re-evaluate
            </button>
          </div>
          {busy && (
            <p className="font-[family-name:var(--font-mono)] text-xs text-[var(--muted)]">
              Working…
            </p>
          )}
        </aside>

        <div className="flex flex-col gap-8">
          <div className="grid gap-6 md:grid-cols-2">
            <DraftView
              title="Draft"
              markdown={draft}
              emptyLabel="Fill the brief and hit Draft"
            />
            <Scorecard
              evaluation={evaluation}
              emptyLabel="Run Evaluate to score the draft"
            />
          </div>

          {(revisedDraft || revisedEval) && (
            <div className="grid gap-6 border-t border-[var(--line)] pt-8 md:grid-cols-2">
              <DraftView
                title="Revised"
                markdown={revisedDraft}
                emptyLabel="Revised draft will appear here"
              />
              <Scorecard
                evaluation={revisedEval}
                previous={evaluation}
                emptyLabel="Re-evaluation scores will appear here"
              />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
