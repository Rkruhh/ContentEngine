"use client";

import { useState, type FormEvent } from "react";
import { SectionCard } from "@/components/ui/section-card";

type CreateProjectFormProps = {
  onCreate: (input: {
    name: string;
    description: string;
    preferredWritingStyle: string;
    preferredAudience: string;
  }) => Promise<void>;
  busy?: boolean;
};

export function CreateProjectForm({ onCreate, busy }: CreateProjectFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [preferredWritingStyle, setPreferredWritingStyle] = useState("");
  const [preferredAudience, setPreferredAudience] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await onCreate({
      name,
      description,
      preferredWritingStyle,
      preferredAudience,
    });
    setName("");
    setDescription("");
    setPreferredWritingStyle("");
    setPreferredAudience("");
  }

  return (
    <SectionCard title="New project" description="One writing initiative">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase text-[var(--muted)]">Name</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={busy}
            placeholder="React Documentation"
            className="rounded-sm border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase text-[var(--muted)]">
            Description
          </span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={busy}
            rows={2}
            placeholder="Docs and guides for the React learning path"
            className="rounded-sm border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase text-[var(--muted)]">
            Preferred writing style (optional)
          </span>
          <input
            value={preferredWritingStyle}
            onChange={(e) => setPreferredWritingStyle(e.target.value)}
            disabled={busy}
            placeholder="Clear, example-driven"
            className="rounded-sm border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase text-[var(--muted)]">
            Preferred audience (optional)
          </span>
          <input
            value={preferredAudience}
            onChange={(e) => setPreferredAudience(e.target.value)}
            disabled={busy}
            placeholder="Intermediate React developers"
            className="rounded-sm border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
        </label>
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="rounded-sm bg-[var(--ink)] px-4 py-2.5 text-sm font-semibold text-[var(--bg-elevated)] hover:bg-[var(--accent)] disabled:opacity-50"
        >
          {busy ? "Creating…" : "Create project"}
        </button>
      </form>
    </SectionCard>
  );
}
