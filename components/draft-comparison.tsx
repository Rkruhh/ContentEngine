"use client";

import { useCallback, useRef, useState, type RefObject } from "react";
import { renderMarkdown } from "@/lib/markdown";
import { SectionCard } from "@/components/ui/section-card";

type DraftComparisonProps = {
  original: string;
  improved: string;
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="rounded-sm border border-[var(--line)] px-2 py-1 text-xs font-medium text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--ink)]"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function Panel({
  title,
  markdown,
  expanded,
  scrollRef,
  onScroll,
}: {
  title: string;
  markdown: string;
  expanded: boolean;
  scrollRef: RefObject<HTMLDivElement | null>;
  onScroll: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-medium tracking-wide text-[var(--muted)] uppercase">
          {title}
        </h3>
        <CopyButton text={markdown} />
      </div>
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className={[
          "prose-draft overflow-y-auto rounded-sm border border-[var(--line)] bg-[var(--bg)] p-4",
          expanded ? "max-h-[40rem]" : "max-h-72",
        ].join(" ")}
        // biome-ignore lint/security/noDangerouslySetInnerHtml: controlled markdown renderer
        dangerouslySetInnerHTML={{ __html: renderMarkdown(markdown) }}
      />
    </div>
  );
}

export function DraftComparison({ original, improved }: DraftComparisonProps) {
  const [expanded, setExpanded] = useState(false);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const syncing = useRef(false);

  const syncScroll = useCallback((source: "left" | "right") => {
    if (syncing.current) return;
    const a = source === "left" ? leftRef.current : rightRef.current;
    const b = source === "left" ? rightRef.current : leftRef.current;
    if (!a || !b) return;
    syncing.current = true;
    const maxA = a.scrollHeight - a.clientHeight;
    const maxB = b.scrollHeight - b.clientHeight;
    if (maxA > 0 && maxB > 0) {
      b.scrollTop = (a.scrollTop / maxA) * maxB;
    }
    requestAnimationFrame(() => {
      syncing.current = false;
    });
  }, []);

  return (
    <SectionCard
      title="Side-by-side comparison"
      description="Original draft vs final improved output"
      actions={
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="rounded-sm border border-[var(--line)] px-2.5 py-1 text-xs font-medium text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--ink)]"
        >
          {expanded ? "Collapse" : "Expand"}
        </button>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Original Draft"
          markdown={original}
          expanded={expanded}
          scrollRef={leftRef}
          onScroll={() => syncScroll("left")}
        />
        <Panel
          title="Final Improved Draft"
          markdown={improved}
          expanded={expanded}
          scrollRef={rightRef}
          onScroll={() => syncScroll("right")}
        />
      </div>
    </SectionCard>
  );
}
