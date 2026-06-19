import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 pb-8 pt-10 sm:px-6 lg:px-10">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-6">
        <div className="min-w-0">
          {eyebrow && (
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">
              {eyebrow}
            </p>
          )}
          <h1 className="font-display text-4xl text-foreground sm:text-5xl">{title}</h1>
          {description && (
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
