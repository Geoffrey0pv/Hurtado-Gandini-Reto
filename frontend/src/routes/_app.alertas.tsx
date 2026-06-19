import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarClock, CheckCircle2, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useAlertas } from "@/hooks/useAlertas";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/alertas")({
  head: () => ({ meta: [{ title: "Alertas · LaborApp" }] }),
  component: AlertasPage,
});

function AlertasPage() {
  const { data: alertas = [], isLoading } = useAlertas();

  const criticas = alertas.filter((a) => a.severidad === "alta").length;
  const medias = alertas.filter((a) => a.severidad === "media").length;
  const bajas = alertas.filter((a) => a.severidad === "baja").length;

  const summary = [
    { label: "Críticas", count: criticas, tone: "high" as const },
    { label: "Medias", count: medias, tone: "medium" as const },
    { label: "Bajas", count: bajas, tone: "low" as const },
    { label: "Total", count: alertas.length, tone: "low" as const },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Compliance"
        title="Alertas"
        description="Eventos detectados por el motor determinístico. Toda acción legal debe documentarse en auditoría."
      />

      <div className="mx-auto max-w-[1440px] space-y-8 px-4 pb-16 sm:px-6 lg:px-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {summary.map((s) => (
            <div key={s.label} className={cn("rounded-2xl border bg-card p-5",
              s.tone === "high" ? "border-risk-high/30" : s.tone === "medium" ? "border-risk-medium/30" : "border-risk-low/30")}>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</p>
              <p className="mt-2 font-display text-3xl text-foreground">{s.count}</p>
            </div>
          ))}
        </div>

        {isLoading ? (
          <p className="text-center text-sm text-muted-foreground py-10">Cargando alertas…</p>
        ) : alertas.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card px-6 py-16 text-center">
            <CheckCircle2 className="mx-auto mb-4 h-10 w-10 text-risk-low" />
            <p className="text-sm text-muted-foreground">No hay alertas activas. El compliance está al día.</p>
          </div>
        ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3 font-medium">Severidad</th>
                <th className="px-5 py-3 font-medium">Motivo</th>
                <th className="px-5 py-3 font-medium">Colaborador</th>
                <th className="px-5 py-3 font-medium">Tipo</th>
                <th className="px-5 py-3 font-medium">Días restantes</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {alertas.map((a, i) => (
                <tr key={i} className="border-b border-border/60 last:border-0 align-top">
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-2 text-foreground">
                      <span className={cn("h-2 w-2 rounded-full",
                        a.severidad === "alta" ? "bg-risk-high" : a.severidad === "media" ? "bg-risk-medium" : "bg-risk-low")} />
                      {a.severidad}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-foreground">{a.motivo}</p>
                  </td>
                  <td className="px-5 py-4">
                    <Link to="/colaboradores/$id" params={{ id: a.colaboradorId }} className="text-foreground hover:underline">{a.nombre}</Link>
                    <p className="text-xs text-muted-foreground">{a.cargo ?? ""}</p>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">
                    <StatusBadge tone="muted"><ShieldAlert className="mr-1 h-3 w-3" />{a.tipo}</StatusBadge>
                  </td>
                  <td className="px-5 py-4">
                    {a.plazo && <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><CalendarClock className="h-3.5 w-3.5" />{a.plazo} días</span>}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Button size="sm" variant="ghost" className="h-8 rounded-full text-xs text-muted-foreground hover:text-foreground">
                      <CheckCircle2 className="mr-1 h-3.5 w-3.5" />Ver detalle
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </div>
    </div>
  );
}
