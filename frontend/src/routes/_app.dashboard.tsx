import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import {
  Activity,
  AlertOctagon,
  CalendarClock,
  FileSearch,
  Gavel,
  HeartHandshake,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { MetricCard } from "@/components/common/MetricCard";
import { LegalWarningBanner } from "@/components/common/LegalWarningBanner";
import { AISummaryCard } from "@/components/dashboard/AISummaryCard";
import { CalmEmptyState } from "@/components/dashboard/CalmEmptyState";
import { useEmployees } from "@/lib/store";
import { useDashboard } from "@/hooks/useDashboard";
import { useAlertas } from "@/hooks/useAlertas";
import { useAuditoria } from "@/hooks/useAuditoria";
import { StatusBadge } from "@/components/common/StatusBadge";

type DashSearch = { vacio?: string };

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({
    meta: [{ title: "Panel · Vinculapp" }],
  }),
  validateSearch: (s: Record<string, unknown>): DashSearch => ({
    vacio: typeof s.vacio === "string" ? s.vacio : undefined,
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { employees } = useEmployees();
  const search = useSearch({ from: "/_app/dashboard" });
  const { data: summary } = useDashboard();
  const { data: alertas = [] } = useAlertas();
  const { data: auditLogs = [] } = useAuditoria();

  const proximos = employees.filter((e) => e.tipoContrato === "Término fijo");
  const criticas = alertas.filter((a) => a.severidad === "alta");
  const pendientes = criticas.length + proximos.length;
  const isEmpty = search.vacio === "1" || pendientes === 0;

  return (
    <div>
      <PageHeader
        eyebrow="Panel ejecutivo"
        title="Buenos días, Margarita"
        description="Una vista calmada y trazable del estado laboral de Logística Andina S.A."
      />

      <div className="mx-auto max-w-[1440px] space-y-10 px-4 pb-16 sm:px-6 lg:px-10">
        <AISummaryCard employees={employees} />

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          <MetricCard label="Colaboradores" value={summary?.colaboradores ?? employees.length} tone="neutral" caption="Activos en la nómina vigente" />
          <MetricCard label="Por vencer" value={summary?.contratosPorVencer ?? proximos.length} tone="medium" caption="Contratos en próximos 30 días" />
          <MetricCard label="Alertas críticas" value={criticas.length} tone="high" caption="Requieren acción jurídica" />
          <MetricCard label="Disciplinarios" value={summary?.disciplinariosAbiertos ?? 0} tone="medium" caption="Procesos activos en curso" />
          <MetricCard label="Docs por revisar" value={summary?.docsPendientesRevision ?? 0} tone="neutral" caption="Extracciones pendientes de validación" />
          <MetricCard label="Total alertas" value={alertas.length} tone="primary" caption="Alertas activas del sistema" />
        </div>

        {isEmpty ? (
          <CalmEmptyState />
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            <Panel title="Próximos vencimientos" icon={<CalendarClock className="h-4 w-4" />} action={<Link to="/colaboradores" className="text-xs text-primary hover:underline">Ver todos</Link>}>
              {proximos.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-muted-foreground">Sin vencimientos próximos.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {proximos.map((e) => (
                    <li key={e.id} className="flex items-center justify-between gap-3 px-5 py-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-foreground">{e.nombre}</p>
                        <p className="text-xs text-muted-foreground">{e.cargo} · {e.area}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-foreground">{e.fechaTerminacion}</p>
                        <p className="text-[11px] text-muted-foreground">Preaviso CST Art. 46</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Alertas de compliance" icon={<AlertOctagon className="h-4 w-4" />} action={<Link to="/alertas" className="text-xs text-primary hover:underline">Ver alertas</Link>}>
              {alertas.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-muted-foreground">Sin alertas activas.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {alertas.slice(0, 4).map((a, i) => (
                    <li key={i} className="px-5 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm text-foreground">{a.motivo}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{a.nombre}</p>
                        </div>
                        <StatusBadge tone={a.severidad === "alta" ? "warning" : "muted"} className={a.severidad === "alta" ? "border-risk-high/40 bg-risk-high/10 text-risk-high" : ""}>
                          {a.severidad}
                        </StatusBadge>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Actividad reciente" icon={<Activity className="h-4 w-4" />} action={<Link to="/auditoria" className="text-xs text-primary hover:underline">Auditoría</Link>}>
              {auditLogs.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-muted-foreground">Sin actividad registrada.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {auditLogs.slice(0, 5).map((a) => (
                    <li key={a.id} className="px-5 py-4">
                      <p className="text-sm text-foreground">{a.action}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{a.createdAt.slice(0, 16).replace("T", " ")}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <QuickAction to="/colaboradores/nuevo-contrato" icon={<FileSearch className="h-5 w-5" />} title="Crear perfil desde contrato" desc="La IA clasifica y extrae los datos. Tú validas y apruebas." />
          <QuickAction to="/revision" icon={<Gavel className="h-5 w-5" />} title="Revisar salidas de IA" desc="Cola de borradores pendientes de aprobación jurídica." />
        </div>

        <LegalWarningBanner tone="primary" icon={<HeartHandshake className="h-4 w-4" />}>
          La IA hace el trabajo pesado para que tú tomes las decisiones que importan.
          Cada revisión tuya es la que le da valor jurídico al sistema — gracias por estar al frente.
        </LegalWarningBanner>
      </div>
    </div>
  );
}

function Panel({ title, icon, action, children }: { title: string; icon: React.ReactNode; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <header className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2 text-foreground">
          <span className="text-muted-foreground">{icon}</span>
          <h2 className="text-sm font-medium">{title}</h2>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

function QuickAction({ to, icon, title, desc }: { to: any; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <Link
      to={to}
      className="group flex items-start gap-4 rounded-2xl border border-border bg-card p-5 transition hover:border-primary/40 hover:bg-surface-elevated"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="font-display text-lg text-foreground">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
      </div>
      <Sparkles className="ml-auto h-4 w-4 text-muted-foreground transition group-hover:text-primary" />
    </Link>
  );
}
