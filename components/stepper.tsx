"use client";

export type Step = "brief" | "draft" | "evaluate" | "revise";

const STEPS: { id: Step; label: string }[] = [
  { id: "brief", label: "Brief" },
  { id: "draft", label: "Draft" },
  { id: "evaluate", label: "Evaluate" },
  { id: "revise", label: "Revise" },
];

type StepperProps = {
  current: Step;
};

export function Stepper({ current }: StepperProps) {
  const currentIndex = STEPS.findIndex((s) => s.id === current);

  return (
    <ol className="flex flex-wrap items-center gap-2 text-sm">
      {STEPS.map((step, index) => {
        const done = index < currentIndex;
        const active = index === currentIndex;
        return (
          <li key={step.id} className="flex items-center gap-2">
            {index > 0 && (
              <span
                aria-hidden
                className="h-px w-4 bg-[var(--line)] sm:w-8"
              />
            )}
            <span
              className={[
                "inline-flex items-center gap-2 rounded-sm px-2.5 py-1 font-medium transition",
                active
                  ? "bg-[var(--ink)] text-[var(--bg-elevated)]"
                  : done
                    ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "text-[var(--muted)]",
              ].join(" ")}
            >
              <span className="font-[family-name:var(--font-mono)] text-xs opacity-70">
                {String(index + 1).padStart(2, "0")}
              </span>
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
