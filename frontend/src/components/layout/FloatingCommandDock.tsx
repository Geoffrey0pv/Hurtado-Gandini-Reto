import { Link, useRouterState } from "@tanstack/react-router";
import {
  ClipboardCheck,
  FileUp,
  Network,
  ScrollText,
  ShieldAlert,
  UserPlus,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const items = [
  { to: "/colaboradores/nuevo-manual", icon: UserPlus, label: "Nuevo perfil" },
  { to: "/colaboradores/nuevo-contrato", icon: FileUp, label: "Cargar contrato" },
  { to: "/organizacion", icon: Network, label: "Ver organigrama" },
  { to: "/alertas", icon: ShieldAlert, label: "Crear alerta" },
  { to: "/revision", icon: ClipboardCheck, label: "Revisiones pendientes" },
  { to: "/auditoria", icon: ScrollText, label: "Auditoría" },
];

export function FloatingCommandDock() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside
      className="pointer-events-none fixed left-4 top-1/2 z-30 hidden -translate-y-1/2 lg:block"
      aria-label="Acciones rápidas"
    >
      <div className="glass pointer-events-auto flex flex-col gap-1 rounded-2xl border border-border-strong/40 p-2 shadow-[var(--shadow-elegant)]">
        <div className="mx-auto mb-1 h-1 w-6 rounded-full bg-border-strong/60" />
        {items.map(({ to, icon: Icon, label }) => {
          const active = pathname === to || (to !== "/organizacion" && pathname.startsWith(to));
          return (
            <Tooltip key={to}>
              <TooltipTrigger asChild>
                <Link
                  to={to}
                  className={cn(
                    "group relative grid h-11 w-11 place-items-center rounded-xl text-muted-foreground transition",
                    "hover:bg-surface-elevated hover:text-foreground",
                    active && "bg-surface-elevated text-foreground",
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.6} />
                  {active && (
                    <span className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-r-full bg-primary" />
                  )}
                  <span className="sr-only">{label}</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                {label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </aside>
  );
}
