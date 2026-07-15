"use client";

import type { FormEvent } from "react";

export type BriefValues = {
  topic: string;
  audience: string;
  pov: string;
  voice: string;
};

type BriefFormProps = {
  values: BriefValues;
  onChange: (values: BriefValues) => void;
  onSubmit: () => void;
  disabled?: boolean;
};

export function BriefForm({
  values,
  onChange,
  onSubmit,
  disabled,
}: BriefFormProps) {
  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit();
  }

  function update(field: keyof BriefValues, value: string) {
    onChange({ ...values, [field]: value });
  }

  const fields: { key: keyof BriefValues; label: string; placeholder: string }[] =
    [
      {
        key: "topic",
        label: "Topic",
        placeholder: "Why eval harnesses beat prompt tinkering",
      },
      {
        key: "audience",
        label: "Audience",
        placeholder: "DevRel engineers building AI demos",
      },
      {
        key: "pov",
        label: "Point of view",
        placeholder: "Rubrics beat vibes for shipping content quality",
      },
      {
        key: "voice",
        label: "Voice",
        placeholder: "Direct, opinionated, lightly wry",
      },
    ];

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {fields.map((field) => (
        <label key={field.key} className="flex flex-col gap-1.5">
          <span className="text-xs font-medium tracking-wide text-[var(--muted)] uppercase">
            {field.label}
          </span>
          <input
            type="text"
            value={values[field.key]}
            onChange={(e) => update(field.key, e.target.value)}
            placeholder={field.placeholder}
            disabled={disabled}
            required
            className="rounded-sm border border-[var(--line)] bg-[var(--bg-elevated)] px-3 py-2.5 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--accent)] disabled:opacity-60"
          />
        </label>
      ))}
      <button
        type="submit"
        disabled={disabled}
        className="mt-1 rounded-sm bg-[var(--ink)] px-4 py-2.5 text-sm font-semibold text-[var(--bg-elevated)] transition hover:bg-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        Draft
      </button>
    </form>
  );
}
