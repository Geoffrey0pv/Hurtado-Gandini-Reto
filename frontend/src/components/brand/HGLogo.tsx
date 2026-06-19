import { cn } from "@/lib/utils";

export function HGMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 40"
      className={cn("h-9 w-auto", className)}
      aria-label="Hurtado Gandini"
    >
      <g fill="currentColor">
        <rect x="2" y="4" width="3" height="32" />
        <rect x="5" y="18" width="14" height="3" />
        <rect x="19" y="4" width="3" height="32" />
        <rect x="32" y="4" width="3" height="32" />
        <rect x="35" y="18" width="14" height="3" />
        <rect x="46" y="4" width="3" height="14" />
        <rect x="46" y="21" width="3" height="15" />
      </g>
      <rect x="22" y="14" width="10" height="3" fill="oklch(0.55 0.20 25)" />
      <rect x="22" y="23" width="10" height="3" fill="oklch(0.55 0.20 25)" />
    </svg>
  );
}

export function HGLogo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 text-foreground", className)}>
      <HGMark />
      <div className="flex flex-col leading-tight">
        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-foreground">
          Hurtado
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-foreground">
          Gandini
        </span>
      </div>
    </div>
  );
}
