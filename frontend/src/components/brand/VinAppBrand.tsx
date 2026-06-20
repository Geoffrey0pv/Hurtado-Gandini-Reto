import { cn } from "@/lib/utils";

export function VinAppMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-primary/30 bg-primary/15 text-primary",
        className,
      )}
      aria-label="VinApp"
    >
      <span className="font-display text-lg leading-none">V</span>
    </span>
  );
}

export function VinAppBrand({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <VinAppMark />
      <div className="flex flex-col leading-tight">
        <span className="font-display text-lg tracking-tight">
          <span className="text-foreground">Vin</span>
          <span className="text-primary">App</span>
        </span>
        <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          By Hurtado Gandini
        </span>
      </div>
    </div>
  );
}
