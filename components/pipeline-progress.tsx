"use client";

export type PipelineStageId =
  | "draft"
  | "critic"
  | "editor"
  | "reeval"
  | "final";

export type StageStatus = "pending" | "running" | "completed" | "skipped";

export type PipelineStage = {
  id: PipelineStageId;
  label: string;
  status: StageStatus;
};

const STAGE_DEFS: { id: PipelineStageId; label: string }[] = [
  { id: "draft", label: "Generate Draft" },
  { id: "critic", label: "Critic Evaluation" },
  { id: "editor", label: "Editor Revision" },
  { id: "reeval", label: "Re-evaluation" },
  { id: "final", label: "Final Output" },
];

type PipelineProgressProps = {
  stages: PipelineStage[];
};

export function buildIdleStages(): PipelineStage[] {
  return STAGE_DEFS.map((stage) => ({ ...stage, status: "pending" as const }));
}

/** Progressive statuses while waiting on the orchestrated API. */
export function buildRunningStages(activeIndex: number): PipelineStage[] {
  return STAGE_DEFS.map((stage, index) => ({
    ...stage,
    status:
      index < activeIndex
        ? "completed"
        : index === activeIndex
          ? "running"
          : "pending",
  }));
}

/** Map a finished pipeline run onto stage statuses. */
export function buildCompletedStages(hadRevision: boolean): PipelineStage[] {
  return STAGE_DEFS.map((stage) => {
    if (!hadRevision && (stage.id === "editor" || stage.id === "reeval")) {
      return { ...stage, status: "skipped" as const };
    }
    return { ...stage, status: "completed" as const };
  });
}

function statusLabel(status: StageStatus): string {
  switch (status) {
    case "completed":
      return "Completed";
    case "running":
      return "Running";
    case "skipped":
      return "Skipped";
    default:
      return "Pending";
  }
}

export function PipelineProgress({ stages }: PipelineProgressProps) {
  return (
    <ol className="grid gap-2 sm:grid-cols-5">
      {stages.map((stage) => {
        const done = stage.status === "completed";
        const running = stage.status === "running";
        const skipped = stage.status === "skipped";
        return (
          <li
            key={stage.id}
            className={[
              "rounded-md border px-3 py-3",
              done
                ? "border-[var(--accent)]/35 bg-[var(--accent-soft)]"
                : running
                  ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--bg-elevated)]"
                  : skipped
                    ? "border-dashed border-[var(--line)] bg-transparent text-[var(--muted)]"
                    : "border-[var(--line)] bg-[var(--bg-elevated)] text-[var(--muted)]",
            ].join(" ")}
          >
            <p className="font-[family-name:var(--font-mono)] text-[10px] tracking-wide uppercase opacity-70">
              {done ? "✓" : running ? "●" : skipped ? "–" : "○"}{" "}
              {statusLabel(stage.status)}
            </p>
            <p
              className={`mt-1 text-sm font-semibold ${running ? "text-[var(--bg-elevated)]" : "text-[var(--ink)]"} ${skipped ? "text-[var(--muted)]" : ""}`}
            >
              {stage.label}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
