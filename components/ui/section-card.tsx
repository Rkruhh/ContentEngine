import type { ReactNode } from "react";

type SectionCardProps = {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
};

export function SectionCard({
  title,
  description,
  children,
  className = "",
  actions,
}: SectionCardProps) {
  return (
    <section
      className={`rounded-md border border-[var(--line)] bg-[var(--bg-elevated)] p-5 ${className}`}
    >
      {(title || actions) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && (
              <h2 className="text-xs font-medium tracking-wide text-[var(--muted)] uppercase">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>
            )}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}
