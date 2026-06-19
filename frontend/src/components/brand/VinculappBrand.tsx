import { cn } from "@/lib/utils";

export function VinculappMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-primary/30 bg-primary/15 text-primary",
        className,
      )}
      aria-label="Vinculapp"
    >
      <span className="font-display text-lg leading-none">V</span>
    </span>
  );
}

export function VinculappBrand({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 text-foreground", className)}>
      <VinculappMark />
      <div className="flex flex-col leading-tight">
        <span className="font-display text-lg tracking-tight text-foreground">
          Vinculapp
        </span>
        <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          By Hurtado Gandini
        </span>
      </div>
    </div>
  );
}
