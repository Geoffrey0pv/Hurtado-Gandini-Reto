import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function LegalWarningBanner({
  children,
  className,
  tone = "neutral",
  icon,
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "neutral" | "primary" | "warning" | "muted";
  icon?: React.ReactNode;
}) {
  const toneClass =
    tone === "primary"
      ? "border-primary/30 bg-primary/8 text-foreground"
      : tone === "warning"
        ? "border-risk-medium/40 bg-risk-medium/10 text-foreground"
        : tone === "muted"
          ? "border-border bg-surface/40 text-muted-foreground"
          : "border-border-strong/50 bg-surface/60 text-muted-foreground";
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm",
        toneClass,
        className,
      )}
    >
      <span className="mt-0.5 shrink-0 text-primary">
        {icon ?? <ShieldCheck className="h-4 w-4" />}
      </span>
      <p className="leading-relaxed">{children}</p>
    </div>
  );
}

