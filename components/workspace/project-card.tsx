"use client";

import Link from "next/link";
import type { ProjectSummary } from "@/lib/workspace";

type ProjectCardProps = {
  project: ProjectSummary;
};

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="block rounded-md border border-[var(--line)] bg-[var(--bg-elevated)] p-5 transition hover:border-[var(--accent)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--ink)]">
            {project.name}
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {project.description || "No description"}
          </p>
        </div>
        <div className="text-right font-[family-name:var(--font-mono)] text-xs text-[var(--muted)]">
          <p>{project.documentCount} docs</p>
          <p className="mt-1">
            {project.averageQuality != null
              ? `avg ${project.averageQuality.toFixed(1)}`
              : "no scores"}
          </p>
        </div>
      </div>
      <p className="mt-4 text-xs text-[var(--muted)]">
        Updated {new Date(project.lastUpdated).toLocaleString()}
      </p>
    </Link>
  );
}
