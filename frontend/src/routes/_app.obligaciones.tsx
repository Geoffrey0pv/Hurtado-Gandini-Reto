import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock,
  Loader2,
  Scale,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { useContratos, useContratoAnalisis } from "@/hooks/useContratos";
import { useColaboradores } from "@/hooks/useColaboradores";
import { useAlertas } from "@/hooks/useAlertas";
import type { AnalisisAlerta, BackendColaborador, BackendContrato } from "@/lib/types";

export const Route = createFileRoute("/_app/obligaciones")({
  head: () => ({ meta: [{ title: "Obligaciones · LaborApp" }] }),
  component: ObligacionesCompaniaPage,
});

const TIPO_LABEL: Record<string, string> = {
  TERMINO_FIJO: "Término fijo",
  TERMINO_INDEFINIDO: "Término indefinido",
  OBRA_LABOR: "Obra o labor",
  PRESTACION_SERVICIOS: "Prestación de servicios",
  APRENDIZAJE: "Aprendizaje",
  OTRO: "Otro",
};

function formatCOP(n: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);
}

function sevTone(sev: AnalisisAlerta["severidad"]): "warning" | "primary" | "muted" {
  if (sev === "CRITICA") return "warning";
  if (sev === "ADVERTENCIA") return "primary";
  return "muted";
}

function ObligacionesCompaniaPage() {
  const { data: contratos = [], isLoading } = useContratos();
  const { data: colaboradores = [] } = useColaboradores();
  const { data: alertas = [] } = useAlertas();

  const colMap = useMemo(() => {
    const m = new Map<string, BackendColaborador>();
    for (const c of colaboradores) m.set(c.id, c);
    return m;
  }, [colaboradores]);

  const procesados = contratos.filter((c) => c.status === "DONE");

  const criticas = alertas.filter((a) => a.severidad === "alta").length;
  const medias = alertas.filter((a) => a.severidad === "media").length;

  return (
    <div>
      <PageHeader
        eyebrow="Cumplimiento"
        title="Obligaciones de la compañía"
        description="Cálculo determinista (sin IA) sobre los contratos cargados: prestaciones, jornada legal y alertas. Cada cifra cita su base legal y queda trazada en auditoría."
      />

      <div className="mx-auto max-w-[1440px] space-y-6 px-4 pb-16 sm:px-6 lg:px-10">
        {/* Resumen de alertas de cumplimiento */}
        <div className="grid gap-4 sm:grid-cols-3">
          <SummaryCard label="Alertas críticas" value={criticas} icon={<AlertTriangle className="h-4 w-4" />} tone="high" />
          <SummaryCard label="Alertas medias" value={medias} icon={<CalendarClock className="h-4 w-4" />} tone="medium" />
          <SummaryCard label="Contratos analizados" value={procesados.length} icon={<ShieldCheck className="h-4 w-4" />} tone="low" />
        </div>

        {isLoading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Cargando contratos…</p>
        ) : procesados.length === 0 ? (
          <EmptyState
            title="Sin contratos procesados"
            description="Carga un contrato en la sección Documentos. Al terminar la extracción, aquí verás el cálculo determinista de obligaciones."
          />
        ) : (
          <div className="space-y-4">
            {procesados.map((c) => (
              <ContratoCompliance key={c.id} contrato={c} colaborador={colMap.get(c.colaboradorId)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: "high" | "medium" | "low";
}) {
  const border =
    tone === "high" ? "border-risk-high/30" : tone === "medium" ? "border-risk-medium/30" : "border-risk-low/30";
  return (
    <div className={`rounded-2xl border bg-card p-5 ${border}`}>
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-2 font-display text-3xl text-foreground">{value}</p>
    </div>
  );
}

function ContratoCompliance({
  contrato,
  colaborador,
}: {
  contrato: BackendContrato;
  colaborador?: BackendColaborador;
}) {
  const { data: analisis, isLoading } = useContratoAnalisis(contrato.id, true);

  const nombre = colaborador?.nombre ?? "Colaborador";
  const tipo = contrato.tipoContrato ? (TIPO_LABEL[contrato.tipoContrato] ?? contrato.tipoContrato) : "Contrato";

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          {colaborador ? (
            <Link to="/colaboradores/$id" params={{ id: colaborador.id }} className="font-display text-lg text-foreground hover:underline">
              {nombre}
            </Link>
          ) : (
            <span className="font-display text-lg text-foreground">{nombre}</span>
          )}
          <p className="text-xs text-muted-foreground">
            {tipo}
            {colaborador?.cargo ? ` · ${colaborador.cargo}` : ""}
          </p>
        </div>
        <StatusBadge tone="muted">Cálculo determinista · sin IA</StatusBadge>
      </header>

      {isLoading || !analisis ? (
        <p className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />Calculando obligaciones…
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Jornada */}
          <div className="rounded-xl border border-border bg-background/40 p-4">
            <div className="mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />Jornada legal
            </div>
            {analisis.jornada.aplica === false ? (
              <p className="text-sm text-muted-foreground">{analisis.jornada.motivo}</p>
            ) : (
              <>
                <StatusBadge tone={analisis.jornada.cumple ? "success" : "warning"}>
                  {analisis.jornada.cumple ? (
                    <><CheckCircle2 className="mr-1 h-3 w-3" />Conforme</>
                  ) : (
                    <><AlertTriangle className="mr-1 h-3 w-3" />No conforme</>
                  )}
                </StatusBadge>
                <p className="mt-2 text-sm text-foreground">{analisis.jornada.mensaje}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{analisis.jornada.baseLegal}</p>
              </>
            )}
          </div>

          {/* Liquidación / prestaciones */}
          <div className="rounded-xl border border-border bg-background/40 p-4">
            <div className="mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
              <Wallet className="h-3.5 w-3.5" />Liquidación estimada
            </div>
            {analisis.liquidacion.aplica === false ? (
              <p className="text-sm text-muted-foreground">{analisis.liquidacion.motivo}</p>
            ) : (
              <>
                <p className="font-display text-xl text-foreground">
                  {formatCOP(analisis.liquidacion.total ?? 0)}
                </p>
                <ul className="mt-2 space-y-1">
                  {(analisis.liquidacion.conceptos ?? []).map((co) => (
                    <li key={co.concepto} className="flex justify-between gap-2 text-xs">
                      <span className="text-muted-foreground">{co.concepto}</span>
                      <span className="text-foreground">{formatCOP(co.valor)}</span>
                    </li>
                  ))}
                  {analisis.liquidacion.indemnizacionEstimada && (
                    <li className="flex justify-between gap-2 border-t border-border/60 pt-1 text-xs">
                      <span className="text-muted-foreground">
                        {analisis.liquidacion.indemnizacionEstimada.concepto} (estimada)
                      </span>
                      <span className="text-foreground">
                        {formatCOP(analisis.liquidacion.indemnizacionEstimada.valor)}
                      </span>
                    </li>
                  )}
                </ul>
                <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Scale className="h-3 w-3" />Cada concepto cita su base legal (ver auditoría).
                </p>
              </>
            )}
          </div>

          {/* Alertas accionables */}
          <div className="rounded-xl border border-border bg-background/40 p-4">
            <div className="mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
              <AlertTriangle className="h-3.5 w-3.5" />Alertas
            </div>
            {(() => {
              const accionables = analisis.alertas.filter((a) => a.severidad !== "OK");
              if (accionables.length === 0) {
                return (
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-risk-low" />Sin alertas activas.
                  </p>
                );
              }
              return (
                <ul className="space-y-2">
                  {accionables.map((a, i) => (
                    <li key={`${a.tipo}-${i}`} className="text-sm">
                      <StatusBadge tone={sevTone(a.severidad)}>{a.tipo}</StatusBadge>
                      <p className="mt-1 text-foreground">{a.mensaje}</p>
                      {a.baseLegal && <p className="text-[11px] text-muted-foreground">{a.baseLegal}</p>}
                    </li>
                  ))}
                </ul>
              );
            })()}
          </div>
        </div>
      )}
    </section>
  );
}
