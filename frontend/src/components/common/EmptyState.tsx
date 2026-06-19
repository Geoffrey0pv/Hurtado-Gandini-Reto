import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-border-strong/50 bg-surface/40 px-6 py-16 text-center",
        className,
      )}
    >
      {icon && (
        <div className="mb-4 grid h-12 w-12 place-items-center rounded-full bg-surface-elevated text-muted-foreground">
          {icon}
        </div>
      )}
      <h3 className="font-display text-xl text-foreground">{title}</h3>
      {description && (
        <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-border bg-surface/40 px-6 py-16 text-center">
      <div className="relative h-10 w-10">
        <span className="absolute inset-0 rounded-full border-2 border-border" />
        <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-primary" />
      </div>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
