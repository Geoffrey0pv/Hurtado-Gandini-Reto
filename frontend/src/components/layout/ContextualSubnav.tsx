import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export type ContextualLink = { to: string; label: string; search?: Record<string, string> };

export function ContextualSubnav({ items }: { items: ContextualLink[] }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const search = useRouterState({ select: (s) => s.location.search }) as unknown as Record<string, string>;

  return (
    <div className="border-b border-border">
      <div className="mx-auto flex max-w-[1440px] gap-1 overflow-x-auto px-4 sm:px-6 lg:px-10">
        {items.map((it) => {
          const active = it.search
            ? Object.entries(it.search).every(([k, v]) => (search?.[k] ?? "resumen") === v) && pathname === it.to
            : pathname === it.to;
          return (
            <Link
              key={it.label}
              to={it.to}
              search={it.search as any}
              className={cn(
                "relative shrink-0 px-3 py-3 text-sm transition-colors",
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {it.label}
              {active && (
                <span className="absolute inset-x-3 -bottom-px h-[2px] rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
