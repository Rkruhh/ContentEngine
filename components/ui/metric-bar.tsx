type MetricBarProps = {
  label: string;
  value: number;
  max?: number;
  hint?: string;
  delta?: number | null;
};

export function MetricBar({
  label,
  value,
  max = 10,
  hint,
  delta,
}: MetricBarProps) {
  const pct = `${Math.max(0, Math.min(100, (value / max) * 100))}%`;
  const deltaLabel =
    delta === null || delta === undefined
      ? null
      : delta === 0
        ? "±0"
        : delta > 0
          ? `+${delta.toFixed(1)}`
          : delta.toFixed(1);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--ink)]">{label}</p>
          {hint && <p className="text-xs text-[var(--muted)]">{hint}</p>}
        </div>
        <div className="flex items-baseline gap-2 font-[family-name:var(--font-mono)] text-sm">
          <span className="font-medium tabular-nums">{value.toFixed(1)}</span>
          {deltaLabel && (
            <span
              className={
                deltaLabel.startsWith("+")
                  ? "text-[var(--ok)]"
                  : deltaLabel.startsWith("-")
                    ? "text-[var(--warn)]"
                    : "text-[var(--muted)]"
              }
            >
              {deltaLabel}
            </span>
          )}
        </div>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--line)]">
        <div
          className="h-full rounded-full bg-[var(--accent)]"
          style={{ width: pct }}
        />
      </div>
    </div>
  );
}
