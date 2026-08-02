"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CreateProjectForm } from "@/components/workspace/create-project-form";
import { ProjectCard } from "@/components/workspace/project-card";
import { apiGet, apiSend } from "@/lib/api-client";
import type { ProjectSummary } from "@/lib/workspace";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<{ projects: ProjectSummary[] }>("/api/projects");
      setProjects(data.projects);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate(input: {
    name: string;
    description: string;
    preferredWritingStyle: string;
    preferredAudience: string;
  }) {
    setBusy(true);
    setError(null);
    try {
      await apiSend("/api/projects", "POST", {
        name: input.name,
        description: input.description,
        preferredWritingStyle: input.preferredWritingStyle || null,
        preferredAudience: input.preferredAudience || null,
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
      <header className="mb-10 flex flex-col gap-4 border-b border-[var(--line)] pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-[family-name:var(--font-mono)] text-xs tracking-[0.18em] text-[var(--accent)] uppercase">
            Writing workspace
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-[var(--ink)]">
            Projects
          </h1>
          <p className="mt-2 max-w-lg text-sm text-[var(--muted)]">
            Organize drafts, versions, and evaluations by writing initiative.
          </p>
        </div>
        <Link
          href="/playground"
          className="text-sm font-medium text-[var(--accent)] hover:underline"
        >
          Open classic playground →
        </Link>
      </header>

      {error && (
        <div
          role="alert"
          className="mb-6 rounded-md border border-[var(--warn)]/40 bg-[#f8ece8] px-4 py-3 text-sm text-[var(--warn)]"
        >
          {error}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
        <CreateProjectForm onCreate={handleCreate} busy={busy} />

        <section>
          <h2 className="mb-4 text-xs font-medium tracking-wide text-[var(--muted)] uppercase">
            Your projects
          </h2>
          {loading ? (
            <p className="text-sm text-[var(--muted)]">Loading…</p>
          ) : projects.length === 0 ? (
            <div className="rounded-md border border-dashed border-[var(--line)] bg-[var(--bg-elevated)]/60 px-5 py-10 text-sm text-[var(--muted)]">
              No projects yet. Create one to start a writing initiative.
            </div>
          ) : (
            <div className="grid gap-4">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
