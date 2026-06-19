import { cn } from "@/lib/utils";
import type { RiskLevel } from "@/lib/mock/data";

const map: Record<RiskLevel, { label: string; cls: string; dot: string }> = {
  alto: { label: "Riesgo alto", cls: "border-risk-high/40 bg-risk-high/10 text-risk-high", dot: "bg-risk-high" },
  medio: { label: "Riesgo medio", cls: "border-risk-medium/40 bg-risk-medium/10 text-risk-medium", dot: "bg-risk-medium" },
  bajo: { label: "Riesgo bajo", cls: "border-risk-low/40 bg-risk-low/10 text-risk-low", dot: "bg-risk-low" },
};

export function RiskBadge({ level, className }: { level: RiskLevel; className?: string }) {
  const m = map[level];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
        m.cls,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", m.dot)} />
      {m.label}
    </span>
  );
}
