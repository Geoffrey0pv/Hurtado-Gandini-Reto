import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  hint,
  tone = "neutral",
  caption,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "neutral" | "primary" | "high" | "medium" | "low";
  caption?: string;
}) {
  const toneRing: Record<string, string> = {
    neutral: "before:bg-border-strong/60",
    primary: "before:bg-primary",
    high: "before:bg-risk-high",
    medium: "before:bg-risk-medium",
    low: "before:bg-risk-low",
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition hover:border-border-strong",
        "before:absolute before:left-0 before:top-5 before:h-8 before:w-[2px] before:rounded-r-full",
        toneRing[tone],
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
        {hint && (
          <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground">
            {hint} <ArrowUpRight className="h-3 w-3" />
          </span>
        )}
      </div>
      <div className="mt-4 font-display text-4xl text-foreground">{value}</div>
      {caption && <p className="mt-2 text-xs text-muted-foreground">{caption}</p>}
    </div>
  );
}
