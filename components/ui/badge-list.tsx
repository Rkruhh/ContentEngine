type BadgeListProps = {
  items: string[];
  tone?: "neutral" | "ok" | "warn" | "accent";
  emptyLabel?: string;
};

const TONE_CLASS: Record<NonNullable<BadgeListProps["tone"]>, string> = {
  neutral: "border-[var(--line)] bg-[var(--bg)] text-[var(--ink)]",
  ok: "border-[var(--ok)]/25 bg-[#e8f3ec] text-[var(--ok)]",
  warn: "border-[var(--warn)]/25 bg-[#f8ece8] text-[var(--warn)]",
  accent: "border-[var(--accent)]/30 bg-[var(--accent-soft)] text-[var(--accent)]",
};

export function BadgeList({
  items,
  tone = "neutral",
  emptyLabel = "None noted",
}: BadgeListProps) {
  if (items.length === 0) {
    return <p className="text-sm text-[var(--muted)]">{emptyLabel}</p>;
  }

  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item) => (
        <li
          key={item}
          className={`rounded-sm border px-2.5 py-1 text-sm ${TONE_CLASS[tone]}`}
        >
          {item}
        </li>
      ))}
    </ul>
  );
}
