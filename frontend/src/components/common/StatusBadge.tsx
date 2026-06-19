import { cn } from "@/lib/utils";

type Tone = "neutral" | "primary" | "success" | "warning" | "muted";

const tones: Record<Tone, string> = {
  neutral: "border-border-strong/60 bg-surface-elevated text-foreground",
  primary: "border-primary/40 bg-primary/10 text-primary",
  success: "border-risk-low/40 bg-risk-low/10 text-risk-low",
  warning: "border-risk-medium/40 bg-risk-medium/10 text-risk-medium",
  muted: "border-border bg-surface text-muted-foreground",
};

export function StatusBadge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
