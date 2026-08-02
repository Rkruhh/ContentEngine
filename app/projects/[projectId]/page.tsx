"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CriticFeedback } from "@/components/critic-feedback";
import { DraftView } from "@/components/draft-view";
import { MemoryPanel } from "@/components/memory-panel";
import {
  buildCompletedStages,
  buildIdleStages,
  buildRunningStages,
  PipelineProgress,
  type PipelineStage,
} from "@/components/pipeline-progress";
import { StopReasonBanner } from "@/components/stop-reason-banner";
import { CreateDocumentForm } from "@/components/workspace/create-document-form";
import { SectionCard } from "@/components/ui/section-card";
import { apiGet, apiSend } from "@/lib/api-client";
import type { UserMemory } from "@/lib/memory";
import type { QualityPipelineResult } from "@/lib/pipeline/run-pipeline";
import type {
  Document,
  DocumentType,
  ProjectSummary,
} from "@/lib/workspace";
import { DOCUMENT_TYPE_LABELS } from "@/lib/workspace";
import { formatScore } from "@/lib/ui/metrics";

export default function ProjectWorkspacePage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;

  const [project, setProject] = useState<ProjectSummary | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [memory, setMemory] = useState<UserMemory | null>(null);
  const [memoryLoading, setMemoryLoading] = useState(true);
  const [pipeline, setPipeline] = useState<QualityPipelineResult | null>(null);
  const [stages, setStages] = useState<PipelineStage[]>(buildIdleStages);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const selected = useMemo(
    () => documents.find((doc) => doc.id === selectedId) ?? null,
    [documents, selectedId],
  );

  const currentVersion = useMemo(() => {
    if (!selected || selected.currentVersion === 0) return null;
    return (
      selected.versionHistory.find(
        (v) => v.versionNumber === selected.currentVersion,
      ) ?? null
    );
  }, [selected]);

  const loadMemory = useCallback(async () => {
    setMemoryLoading(true);
    try {
      const data = await apiGet<{ memory: UserMemory }>("/api/memory");
      setMemory(data.memory);
    } catch {
      /* non-blocking */
    } finally {
      setMemoryLoading(false);
    }
  }, []);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [projectData, docsData] = await Promise.all([
        apiGet<{ project: ProjectSummary }>(`/api/projects/${projectId}`),
        apiGet<{ documents: Document[] }>(
          `/api/projects/${projectId}/documents`,
        ),
      ]);
      setProject(projectData.project);
      setDocuments(docsData.documents);
      setSelectedId((current) => {
        if (current && docsData.documents.some((d) => d.id === current)) {
          return current;
        }
        return docsData.documents[0]?.id ?? null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load project");
    }
  }, [projectId]);

  useEffect(() => {
    void load();
    void loadMemory();
  }, [load, loadMemory]);

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

  async function handleCreateDocument(input: {
    title: string;
    documentType: DocumentType;
    brief: {
      topic: string;
      audience: string;
      pov: string;
      voice: string;
    };
  }) {
    setBusy(true);
    setError(null);
    try {
      const data = await apiSend<{ document: Document }>(
        `/api/projects/${projectId}/documents`,
        "POST",
        input,
      );
      setShowCreate(false);
      await load();
      setSelectedId(data.document.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create document");
    } finally {
      setBusy(false);
    }
  }

  async function handleRunPipeline() {
    if (!selected) return;
    setBusy(true);
    setError(null);
    setPipeline(null);
    try {
      const data = await apiSend<{
        document: Document;
        pipeline: QualityPipelineResult;
      }>(
        `/api/projects/${projectId}/documents/${selected.id}/run`,
        "POST",
        { threshold: 7, maxIterations: 3 },
      );
      setDocuments((prev) =>
        prev.map((doc) => (doc.id === data.document.id ? data.document : doc)),
      );
      setPipeline(data.pipeline);
      setStages(buildCompletedStages(data.pipeline.iterations.length > 1));
      await loadMemory();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pipeline failed");
      setStages(buildIdleStages());
    } finally {
      setBusy(false);
    }
  }

  async function handleSelectVersion(versionNumber: number) {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      const data = await apiSend<{ document: Document }>(
        `/api/projects/${projectId}/documents/${selected.id}`,
        "PATCH",
        { currentVersion: versionNumber },
      );
      setDocuments((prev) =>
        prev.map((doc) => (doc.id === data.document.id ? data.document : doc)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to switch version");
    } finally {
      setBusy(false);
    }
  }

  async function handleResetMemory() {
    try {
      const data = await apiSend<{ memory: UserMemory }>("/api/memory", "DELETE");
      setMemory(data.memory);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset memory");
    }
  }

  if (!project && !error) {
    return (
      <main className="mx-auto max-w-6xl px-5 py-14 text-sm text-[var(--muted)]">
        Loading project…
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1400px] px-4 py-8 sm:px-6">
      <header className="mb-6 flex flex-col gap-3 border-b border-[var(--line)] pb-6">
        <Link
          href="/projects"
          className="text-xs font-medium text-[var(--accent)] hover:underline"
        >
          ← All projects
        </Link>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[var(--ink)]">
              {project?.name ?? "Project"}
            </h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {project?.description || "No description"}
            </p>
          </div>
          <div className="font-[family-name:var(--font-mono)] text-xs text-[var(--muted)]">
            {project?.documentCount ?? 0} documents
            {project?.averageQuality != null
              ? ` · avg quality ${formatScore(project.averageQuality)}`
              : ""}
          </div>
        </div>
        <PipelineProgress stages={stages} />
      </header>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-md border border-[var(--warn)]/40 bg-[#f8ece8] px-4 py-3 text-sm text-[var(--warn)]"
        >
          {error}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)_300px]">
        {/* Left: documents */}
        <aside className="flex flex-col gap-3 rounded-md border border-[var(--line)] bg-[var(--bg-elevated)] p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-medium tracking-wide text-[var(--muted)] uppercase">
              Documents
            </h2>
            <button
              type="button"
              onClick={() => setShowCreate((v) => !v)}
              className="text-xs font-medium text-[var(--accent)]"
            >
              {showCreate ? "Close" : "+ New"}
            </button>
          </div>

          {showCreate && (
            <CreateDocumentForm
              onCreate={handleCreateDocument}
              busy={busy}
              defaultAudience={project?.preferredAudience ?? ""}
              defaultVoice={project?.preferredWritingStyle ?? ""}
            />
          )}

          <ul className="flex flex-col gap-1">
            {documents.map((doc) => {
              const active = doc.id === selectedId;
              return (
                <li key={doc.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(doc.id);
                      setPipeline(null);
                      setStages(buildIdleStages());
                    }}
                    className={[
                      "w-full rounded-sm px-3 py-2 text-left text-sm transition",
                      active
                        ? "bg-[var(--ink)] text-[var(--bg-elevated)]"
                        : "hover:bg-[var(--bg)]",
                    ].join(" ")}
                  >
                    <span className="block font-medium">{doc.title}</span>
                    <span
                      className={`mt-0.5 block text-xs ${active ? "opacity-70" : "text-[var(--muted)]"}`}
                    >
                      {DOCUMENT_TYPE_LABELS[doc.documentType]}
                      {doc.currentVersion > 0
                        ? ` · v${doc.currentVersion}`
                        : " · draft"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {documents.length === 0 && !showCreate && (
            <p className="text-sm text-[var(--muted)]">
              Add a document to start generating.
            </p>
          )}
        </aside>

        {/* Main: current document */}
        <section className="flex min-w-0 flex-col gap-4">
          {!selected ? (
            <SectionCard title="Document">
              <p className="text-sm text-[var(--muted)]">
                Select or create a document.
              </p>
            </SectionCard>
          ) : (
            <>
              <SectionCard
                title={selected.title}
                description={DOCUMENT_TYPE_LABELS[selected.documentType]}
                actions={
                  <button
                    type="button"
                    onClick={handleRunPipeline}
                    disabled={busy}
                    className="rounded-sm bg-[var(--ink)] px-3 py-2 text-xs font-semibold text-[var(--bg-elevated)] hover:bg-[var(--accent)] disabled:opacity-50"
                  >
                    {busy ? "Running…" : "Run pipeline"}
                  </button>
                }
              >
                <DraftView
                  title={
                    currentVersion
                      ? `Version ${currentVersion.versionNumber}`
                      : "Content"
                  }
                  markdown={currentVersion?.content ?? ""}
                  emptyLabel="No versions yet — run the pipeline to generate content"
                />
              </SectionCard>

              <SectionCard title="Version history">
                {selected.versionHistory.length === 0 ? (
                  <p className="text-sm text-[var(--muted)]">
                    Versions appear after each successful generation.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {[...selected.versionHistory].reverse().map((version) => {
                      const active =
                        version.versionNumber === selected.currentVersion;
                      return (
                        <li key={version.id}>
                          <button
                            type="button"
                            onClick={() =>
                              handleSelectVersion(version.versionNumber)
                            }
                            disabled={busy || active}
                            className={[
                              "flex w-full items-center justify-between rounded-sm border px-3 py-2 text-left text-sm",
                              active
                                ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                                : "border-[var(--line)] bg-[var(--bg)] hover:border-[var(--accent)]",
                            ].join(" ")}
                          >
                            <span>
                              v{version.versionNumber}
                              <span className="ml-2 text-[var(--muted)]">
                                {new Date(version.createdAt).toLocaleString()}
                              </span>
                            </span>
                            <span className="font-[family-name:var(--font-mono)] text-xs">
                              score {formatScore(version.finalScore)} ·{" "}
                              {version.iterationCount} iter
                              {active ? " · current" : ""}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </SectionCard>

              {pipeline && (
                <StopReasonBanner
                  reason={pipeline.stopReason}
                  threshold={pipeline.threshold}
                  maxIterations={pipeline.maxIterations}
                />
              )}
            </>
          )}
        </section>

        {/* Right: evaluation, memory, summary */}
        <aside className="flex flex-col gap-4">
          {currentVersion ? (
            <CriticFeedback
              evaluation={currentVersion.evaluation}
              title="Evaluation"
            />
          ) : (
            <SectionCard title="Evaluation">
              <p className="text-sm text-[var(--muted)]">
                Scores appear after generation.
              </p>
            </SectionCard>
          )}

          <MemoryPanel
            memory={memory}
            loading={memoryLoading}
            onReset={handleResetMemory}
          />

          <SectionCard title="Pipeline summary">
            {pipeline ? (
              <ul className="space-y-2 text-sm text-[var(--ink)]">
                <li>
                  Stop: <strong>{pipeline.stopReason}</strong>
                </li>
                <li>
                  Final score:{" "}
                  <strong>{formatScore(pipeline.finalOverallScore)}</strong>
                </li>
                <li>
                  Iterations: <strong>{pipeline.iterations.length}</strong>
                </li>
                <li>
                  Threshold: <strong>{pipeline.threshold}</strong>
                </li>
              </ul>
            ) : currentVersion ? (
              <ul className="space-y-2 text-sm text-[var(--ink)]">
                <li>
                  Current score:{" "}
                  <strong>{formatScore(currentVersion.finalScore)}</strong>
                </li>
                <li>
                  Iterations:{" "}
                  <strong>{currentVersion.iterationCount}</strong>
                </li>
                {currentVersion.stopReason && (
                  <li>
                    Stop: <strong>{currentVersion.stopReason}</strong>
                  </li>
                )}
              </ul>
            ) : (
              <p className="text-sm text-[var(--muted)]">
                Run the pipeline to see a summary.
              </p>
            )}
          </SectionCard>
        </aside>
      </div>
    </main>
  );
}
