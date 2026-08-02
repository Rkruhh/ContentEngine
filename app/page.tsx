"use client";

import { useEffect, useMemo, useState } from "react";
import { BriefForm, type BriefValues } from "@/components/brief-form";
import { CriticFeedback } from "@/components/critic-feedback";
import { DraftComparison } from "@/components/draft-comparison";
import { DraftView } from "@/components/draft-view";
import { EmptyWorkflow } from "@/components/empty-workflow";
import { IterationTimeline } from "@/components/iteration-timeline";
import { MemoryPanel } from "@/components/memory-panel";
import {
  buildCompletedStages,
  buildIdleStages,
  buildRunningStages,
  PipelineProgress,
  type PipelineStage,
} from "@/components/pipeline-progress";
import { QualityDashboard } from "@/components/quality-dashboard";
import { ReasoningSummary } from "@/components/reasoning-summary";
import { Scorecard } from "@/components/scorecard";
import { Stepper, type Step } from "@/components/stepper";
import { StopReasonBanner } from "@/components/stop-reason-banner";
import type { EvalResult } from "@/lib/ai/schema";
import type { UserMemory } from "@/lib/memory";
import type { QualityPipelineResult } from "@/lib/pipeline/run-pipeline";
import { buildReasoningSummary } from "@/lib/ui/reasoning";

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
  const [result, setResult] = useState<QualityPipelineResult | null>(null);
  const [selectedIteration, setSelectedIteration] = useState(0);
  const [stages, setStages] = useState<PipelineStage[]>(buildIdleStages);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [memory, setMemory] = useState<UserMemory | null>(null);
  const [memoryLoading, setMemoryLoading] = useState(true);
  const [memoryResetting, setMemoryResetting] = useState(false);

  // Legacy manual path (kept working).
  const [step, setStep] = useState<Step>("brief");
  const [draft, setDraft] = useState("");
  const [evaluation, setEvaluation] = useState<EvalResult | null>(null);
  const [revisedDraft, setRevisedDraft] = useState("");
  const [revisedEval, setRevisedEval] = useState<EvalResult | null>(null);

  async function loadMemory() {
    setMemoryLoading(true);
    try {
      const res = await fetch("/api/memory");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load memory");
      setMemory(data.memory as UserMemory);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load memory");
    } finally {
      setMemoryLoading(false);
    }
  }

  useEffect(() => {
    void loadMemory();
  }, []);

  useEffect(() => {
    if (!busy) return;
    let active = 0;
    setStages(buildRunningStages(0));
    const id = window.setInterval(() => {
      active = Math.min(active + 1, 4);
      setStages(buildRunningStages(active));
    }, 2200);
    return () => window.clearInterval(id);
  }, [busy]);

  async function handleRunPipeline() {
    setBusy(true);
    setError(null);
    setResult(null);
    setSelectedIteration(0);
    try {
      const next = await postJson<QualityPipelineResult>("/api/pipeline", {
        ...brief,
        threshold: 7,
        maxIterations: 3,
      });
      setResult(next);
      setStages(buildCompletedStages(next.iterations.length > 1));
      setSelectedIteration(next.iterations.length - 1);
      await loadMemory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pipeline failed");
      setStages(buildIdleStages());
    } finally {
      setBusy(false);
    }
  }

  async function handleResetMemory() {
    setMemoryResetting(true);
    setError(null);
    try {
      const res = await fetch("/api/memory", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to reset memory");
      setMemory(data.memory as UserMemory);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset memory");
    } finally {
      setMemoryResetting(false);
    }
  }

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
      await loadMemory();
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

  const initial = result?.iterations[0];
  const finalEval = result?.finalEvaluation;
  const reasoning = useMemo(() => {
    if (!result) return "";
    return buildReasoningSummary(result.revisionHistory, result.stopReason);
  }, [result]);

  const selectedEval =
    result?.iterations[selectedIteration]?.evaluation ?? finalEval ?? null;

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
      <header className="mb-8 flex flex-col gap-5 border-b border-[var(--line)] pb-8">
        <p className="font-[family-name:var(--font-mono)] text-xs tracking-[0.18em] text-[var(--accent)] uppercase">
          AI content pipeline
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h1 className="max-w-xl text-4xl font-bold tracking-tight text-[var(--ink)] sm:text-5xl">
            Content Engine
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-[var(--muted)]">
            Draft, critique, revise, and keep only score-improving edits — a
            closed quality loop for technical writing.
          </p>
        </div>
        <PipelineProgress stages={stages} />
      </header>

      {error && (
        <div
          role="alert"
          className="mb-6 rounded-md border border-[var(--warn)]/40 bg-[#f8ece8] px-4 py-3 text-sm text-[var(--warn)]"
        >
          {error}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(260px,320px)_1fr]">
        <aside className="flex flex-col gap-4">
          <div className="rounded-md border border-[var(--line)] bg-[var(--bg-elevated)] p-5">
            <h2 className="mb-4 text-xs font-medium tracking-wide text-[var(--muted)] uppercase">
              Brief
            </h2>
            <BriefForm
              values={brief}
              onChange={setBrief}
              onSubmit={handleRunPipeline}
              disabled={busy}
              submitLabel={busy ? "Running pipeline…" : "Run pipeline"}
            />
          </div>

          <MemoryPanel
            memory={memory}
            loading={memoryLoading}
            onReset={handleResetMemory}
            resetting={memoryResetting}
          />

          <button
            type="button"
            onClick={() => setShowAdvanced((value) => !value)}
            className="text-left text-xs font-medium tracking-wide text-[var(--muted)] uppercase hover:text-[var(--ink)]"
          >
            {showAdvanced ? "Hide" : "Show"} advanced manual steps
          </button>

          {showAdvanced && (
            <div className="flex flex-col gap-3 rounded-md border border-dashed border-[var(--line)] p-4">
              <Stepper current={step} />
              <button
                type="button"
                onClick={handleDraft}
                disabled={busy}
                className="rounded-sm border border-[var(--line)] bg-[var(--bg-elevated)] px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
              >
                Draft only
              </button>
              <button
                type="button"
                onClick={handleEvaluate}
                disabled={busy || !draft}
                className="rounded-sm border border-[var(--line)] bg-[var(--bg-elevated)] px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
              >
                Evaluate
              </button>
              <button
                type="button"
                onClick={handleRevise}
                disabled={busy || !evaluation}
                className="rounded-sm border border-[var(--line)] bg-[var(--bg-elevated)] px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
              >
                Revise & re-evaluate
              </button>
            </div>
          )}
        </aside>

        <div className="flex flex-col gap-6">
          {!result && !busy && !showAdvanced && <EmptyWorkflow />}

          {busy && !result && (
            <div className="rounded-md border border-dashed border-[var(--line)] bg-[var(--bg-elevated)]/70 px-5 py-10 text-center">
              <p className="text-sm font-medium text-[var(--ink)]">
                Pipeline running
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Draft → critic → editor → re-evaluate until the threshold or
                stop condition.
              </p>
            </div>
          )}

          {result && initial && finalEval && (
            <>
              <StopReasonBanner
                reason={result.stopReason}
                threshold={result.threshold}
                maxIterations={result.maxIterations}
              />
              <QualityDashboard
                original={initial.evaluation}
                final={finalEval}
                originalOverall={initial.overallScore}
                finalOverall={result.finalOverallScore}
              />
              <ReasoningSummary summary={reasoning} />
              <DraftComparison
                original={initial.draft}
                improved={result.finalDraft}
              />
              {selectedEval && (
                <CriticFeedback
                  evaluation={selectedEval}
                  title={
                    selectedIteration === result.iterations.length - 1
                      ? "Critic feedback · selected / final"
                      : `Critic feedback · iteration ${result.iterations[selectedIteration]?.iteration}`
                  }
                />
              )}
              <IterationTimeline
                iterations={result.iterations}
                selectedIndex={selectedIteration}
                onSelect={setSelectedIteration}
              />
            </>
          )}

          {showAdvanced && (
            <div className="flex flex-col gap-6 border-t border-[var(--line)] pt-6">
              <p className="text-xs font-medium tracking-wide text-[var(--muted)] uppercase">
                Advanced manual workspace
              </p>
              <div className="grid gap-6 md:grid-cols-2">
                <DraftView
                  title="Draft"
                  markdown={draft}
                  emptyLabel="Use Draft only in the sidebar"
                />
                <Scorecard
                  evaluation={evaluation}
                  emptyLabel="Run Evaluate to score the draft"
                />
              </div>
              {(revisedDraft || revisedEval) && (
                <div className="grid gap-6 md:grid-cols-2">
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
          )}
        </div>
      </div>
    </main>
  );
}
