"use client";

import type { LearnedPreference, UserMemory } from "@/lib/memory";
import { BadgeList } from "@/components/ui/badge-list";
import { SectionCard } from "@/components/ui/section-card";

type MemoryPanelProps = {
  memory: UserMemory | null;
  loading?: boolean;
  onReset: () => void;
  resetting?: boolean;
  onDeleteLearnedPreference?: (preferenceId: string) => void;
  onResetLearnedPreferences?: () => void;
  projectLearnedPreferences?: LearnedPreference[];
};

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-xs tracking-wide text-[var(--muted)] uppercase">
        {label}
      </p>
      <p className="mt-1 text-sm text-[var(--ink)]">
        {value?.trim() ? value : "Not learned yet"}
      </p>
    </div>
  );
}

function confidenceLabel(level: LearnedPreference["confidence"]): string {
  if (level === "high") return "High confidence";
  if (level === "medium") return "Medium confidence";
  return "Low confidence";
}

function LearnedList({
  title,
  items,
  onDelete,
}: {
  title: string;
  items: LearnedPreference[];
  onDelete?: (id: string) => void;
}) {
  return (
    <div>
      {title ? (
        <p className="mb-2 text-xs tracking-wide text-[var(--muted)] uppercase">
          {title}
        </p>
      ) : null}
      {items.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">
          None yet — meaningful edits teach preferences over time
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((pref) => (
            <li
              key={pref.id}
              className="rounded-sm border border-[var(--line)] bg-[var(--bg)] px-3 py-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm text-[var(--ink)]">
                    ✓ {pref.preference}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">
                    {pref.category} · {confidenceLabel(pref.confidence)} ·{" "}
                    {pref.occurrences} observation
                    {pref.occurrences === 1 ? "" : "s"}
                  </p>
                </div>
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => onDelete(pref.id)}
                    className="shrink-0 text-xs text-[var(--muted)] hover:text-[var(--warn)]"
                  >
                    Delete
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function MemoryPanel({
  memory,
  loading,
  onReset,
  resetting,
  onDeleteLearnedPreference,
  onResetLearnedPreferences,
  projectLearnedPreferences = [],
}: MemoryPanelProps) {
  const learned = memory?.learnedPreferences ?? [];

  return (
    <SectionCard
      title="Memory"
      description="Structured writing preferences (personalization — not document storage)"
      actions={
        <button
          type="button"
          onClick={onReset}
          disabled={resetting || loading}
          className="rounded-sm border border-[var(--line)] px-2.5 py-1 text-xs font-medium text-[var(--muted)] hover:border-[var(--warn)] hover:text-[var(--warn)] disabled:opacity-50"
        >
          {resetting ? "Resetting…" : "Reset memory"}
        </button>
      }
    >
      {loading || !memory ? (
        <p className="text-sm text-[var(--muted)]">Loading memory…</p>
      ) : (
        <div className="flex flex-col gap-4">
          <Field
            label="Current writing style"
            value={memory.preferredWritingStyle}
          />
          <Field label="Preferred tone" value={memory.preferredTone} />
          <Field label="Audience" value={memory.audience} />
          <Field
            label="Paragraph length"
            value={memory.preferredParagraphLength}
          />
          <Field
            label="Document structure"
            value={memory.preferredDocumentStructure}
          />

          <div>
            <p className="mb-2 text-xs tracking-wide text-[var(--muted)] uppercase">
              Known preferences
            </p>
            <BadgeList
              items={memory.knownPreferences}
              tone="accent"
              emptyLabel="None yet — run the pipeline to teach it"
            />
          </div>

          <div>
            <p className="mb-2 text-xs tracking-wide text-[var(--muted)] uppercase">
              Terminology
            </p>
            <BadgeList
              items={memory.frequentlyUsedTerminology}
              tone="neutral"
              emptyLabel="None yet"
            />
          </div>

          <div>
            <p className="mb-2 text-xs tracking-wide text-[var(--muted)] uppercase">
              Writing goals
            </p>
            <BadgeList
              items={memory.writingGoals}
              tone="neutral"
              emptyLabel="None yet"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs tracking-wide text-[var(--muted)] uppercase">
                Learned Preferences
              </p>
              {onResetLearnedPreferences && learned.length > 0 && (
                <button
                  type="button"
                  onClick={onResetLearnedPreferences}
                  className="text-xs text-[var(--muted)] hover:text-[var(--warn)]"
                >
                  Reset learned
                </button>
              )}
            </div>
            <LearnedList
              title=""
              items={learned}
              onDelete={onDeleteLearnedPreference}
            />
          </div>

          {projectLearnedPreferences.length > 0 && (
            <LearnedList
              title="Project learned preferences"
              items={projectLearnedPreferences}
            />
          )}

          <div>
            <p className="mb-2 text-xs tracking-wide text-[var(--muted)] uppercase">
              Recently learned
            </p>
            {memory.recentLearnings.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No learnings yet</p>
            ) : (
              <ul className="space-y-2 text-sm text-[var(--ink)]">
                {memory.recentLearnings.slice(0, 5).map((item) => (
                  <li
                    key={`${item.at}-${item.summary}`}
                    className="rounded-sm border border-[var(--line)] bg-[var(--bg)] px-3 py-2"
                  >
                    {item.summary}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </SectionCard>
  );
}
