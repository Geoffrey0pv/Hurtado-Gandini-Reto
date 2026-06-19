import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { z } from "zod";
import { AlertTriangle, Briefcase, CalendarDays, Check, ChevronLeft, ChevronRight, CircleDollarSign, Clock, Download, FileText, FilePlus2, Flag, IdCard, Mail, MessageSquare, Paperclip, Phone, Plus, Scale, Send, Shirt, ShieldAlert, ShieldCheck, Timer, Trash2, Umbrella, Wallet } from "lucide-react";
import { toast } from "sonner";
import { ContextualSubnav } from "@/components/layout/ContextualSubnav";
import { useEmployees } from "@/lib/store";
import { useLiquidaciones, calcularMora } from "@/lib/liquidacion-store";
import { diasEntre, NOVEDAD_LABEL, NOVEDAD_TONE, type NovedadTipo } from "@/lib/novedades-store";
import { useObligaciones } from "@/lib/obligaciones-store";
import { DOC_SLOTS } from "@/lib/documentos-store";
import { ETAPAS, GRAVEDAD_LABEL, GRAVEDAD_TONE, type EtapaKey, type Gravedad } from "@/lib/disciplinario-store";
import { obligacionesEnRango, proximasObligaciones, diasHabilesHasta, nivelAviso, avisosFrecuencia, type ObligacionEvento, type NivelAviso } from "@/lib/obligaciones";
import { useTimesheetEntries, useAddTimesheetEntry, useDeleteTimesheetEntry } from "@/hooks/useTimesheet";
import { useDocumentos as useDocumentosAPI, useUploadDocumento, useDeleteDocumento } from "@/hooks/useDocumentos";
import { useExpedientes, useCreateExpediente, useUpdateExpediente, useDebidoProceso } from "@/hooks/useDisciplinario";
import { useNovedades as useNovedadesAPI, useCreateNovedad, useDeleteNovedad } from "@/hooks/useNovedades";
import { useAlertas } from "@/hooks/useAlertas";
import { StatusBadge } from "@/components/common/StatusBadge";
import { LegalWarningBanner } from "@/components/common/LegalWarningBanner";
import {
  antiguedad, aplicaDotacion, aportesMensuales, auxilioTransporte,
  calcularValorEntrada, cumplimientoDe, cumplimientoLabel, diasComerciales,
  FACTORES_HORA, jefeDisplay, liquidacion, presenciaLabel,
  riesgoDespido, valorHoraOrdinaria, type Employee, type TipoHora,
} from "@/lib/mock/data";
import type { BackendTimesheetEntry } from "@/lib/types";
import { EmptyState } from "@/components/common/EmptyState";

const tabSchema = z.object({
  tab: z
    .enum(["resumen", "obligaciones", "timesheet", "riesgo", "pago", "calendario", "documentos", "alertas", "disciplinario"])
    .catch("resumen"),
});

export const Route = createFileRoute("/_app/colaboradores/$id")({
  validateSearch: tabSchema,
  head: () => ({ meta: [{ title: "Perfil · LaborApp" }] }),
  component: ProfilePage,
});

const tabs = [
  { key: "resumen", label: "Resumen" },
  { key: "obligaciones", label: "Obligaciones" },
  { key: "timesheet", label: "Timesheet" },
  { key: "riesgo", label: "Riesgo & liquidación" },
  { key: "calendario", label: "Calendario" },
  { key: "documentos", label: "Documentos" },
  { key: "alertas", label: "Alertas" },
  { key: "disciplinario", label: "Disciplinario" },
  
] as const;


function ProfilePage() {
  const { id } = useParams({ from: "/_app/colaboradores/$id" });
  const { tab } = Route.useSearch();
  const { getEmployee, pendingChecks, clearPendingCheck } = useEmployees();
  const e = getEmployee(id);

  if (!e) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <EmptyState title="Colaborador no encontrado" description="El registro pudo haber sido eliminado o el enlace es incorrecto." />
      </div>
    );
  }

  const { data: allAlertas = [] } = useAlertas();
  const empAlerts = allAlertas.filter((a) => a.colaboradorId === e.id);
  const empChecks = pendingChecks.filter((c) => c.empleadoId === e.id);
  const cumplimiento = cumplimientoDe(e.riesgo);
  const presenciaTone: Record<typeof e.presencia, "muted" | "warning" | "primary"> = {
    en_oficina: "muted",
    vacaciones: "primary",
    permiso: "muted",
    incapacidad: "warning",
  };

  return (
    <div>
      <div className="border-b border-border bg-card/40">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 pb-8 pt-12 sm:px-6 lg:px-10">
          <Link to="/organizacion" className="text-xs text-muted-foreground hover:text-foreground">← Organización</Link>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl border border-primary/30 bg-primary/10 font-display text-2xl text-primary">
              {initials(e.nombre)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h1 className="font-display text-3xl text-foreground sm:text-4xl">{e.nombre}</h1>
                <div className="flex flex-wrap items-center gap-2 whitespace-nowrap">
                  <StatusBadge tone={e.estadoVinculacion === "activo" ? "success" : "muted"}>
                    {e.estadoVinculacion === "activo" ? "Activo" : "Retirado"}
                  </StatusBadge>
                  <StatusBadge tone={cumplimiento === "al_dia" ? "success" : cumplimiento === "verificar" ? "warning" : "primary"}>
                    {cumplimientoLabel[cumplimiento]}
                  </StatusBadge>
                </div>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {e.cargo} · {e.area} · Reporta a {jefeDisplay(e)}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
                <a href={`mailto:${e.correo}`} className="inline-flex items-center gap-1.5 hover:text-foreground">
                  <Mail className="h-3.5 w-3.5" />{e.correo}
                </a>
                <a href={`tel:${e.telefono.replace(/\s/g, "")}`} className="inline-flex items-center gap-1.5 hover:text-foreground">
                  <Phone className="h-3.5 w-3.5" />{e.telefono}
                </a>
                <span className="text-xs text-muted-foreground/80">{antiguedad(e.fechaInicio)} de antigüedad</span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <StatusBadge tone="muted"><IdCard className="mr-1 h-3 w-3" />{e.cedula}</StatusBadge>
                <StatusBadge tone="muted"><Briefcase className="mr-1 h-3 w-3" />{e.tipoContrato}</StatusBadge>
                {e.presencia !== "en_oficina" && (
                  <StatusBadge tone={presenciaTone[e.presencia]}>{presenciaLabel[e.presencia]}</StatusBadge>
                )}
              </div>
            </div>
          </div>
          {e.estadoVinculacion === "retirado" && (
            <LegalWarningBanner tone="muted">
              Este colaborador está retirado. Su información se conserva en la sub-pestaña <strong>Historia</strong> de Organización.
            </LegalWarningBanner>
          )}
          {empChecks.length > 0 && (
            <LegalWarningBanner tone="warning">
              Se actualizó la jerarquía. Verifica los datos de jefe y área antes de continuar.
              <button
                onClick={() => empChecks.forEach((c) => clearPendingCheck(c.id))}
                className="ml-3 underline underline-offset-2 hover:text-foreground"
              >
                Marcar como verificado
              </button>
            </LegalWarningBanner>
          )}
        </div>
      </div>

        <ContextualSubnav items={(useLiquidaciones().get(id)
          ? [...tabs.slice(0, 4), { key: "pago" as const, label: "Pago liquidación" }, ...tabs.slice(4)]
          : tabs
        ).map((t) => ({ to: `/colaboradores/${id}`, label: t.label, search: { tab: t.key } }))} />

      <div className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:px-10">
        {tab === "resumen" && (
          <div className="grid gap-5 lg:grid-cols-2">
            <DossierCard title="Datos del contrato" icon={<FileText className="h-4 w-4" />}>
              <Row k="Modalidad" v={e.tipoContrato} dot="ok" />
              <Row k="Documento" v={`C.C. ${e.cedula}`} dot="ok" />
              <Row k="Salario mensual" v={formatCOP(e.salario)} dot="warn" />
              <Row k="Inicio" v={formatDate(e.fechaInicio)} icon={<CalendarDays className="h-3 w-3" />} dot="ok" />
              <Row k="Terminación" v={e.fechaTerminacion ? formatDate(e.fechaTerminacion) : "Indefinida"} icon={<CalendarDays className="h-3 w-3" />} dot="ok" />
              <Row k="Jornada" v={e.jornada} dot="ok" />
              <Row k="Aux. transporte" v={auxilioTransporte(e.salario).texto} icon={<Wallet className="h-3 w-3" />} dot="ok" />
            </DossierCard>
            <DossierCard title="Cargo & jerarquía" icon={<Briefcase className="h-4 w-4" />}>
              <Row k="Cargo" v={e.cargo} dot="ok" />
              <Row k="Área" v={e.area} dot="ok" />
              <Row k="Jefe inmediato" v={jefeDisplay(e)} dot="warn" />
              <div className="mt-4 border-t border-border pt-4">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Funciones</p>
                {e.obligaciones.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-sm text-foreground">
                    {e.obligaciones.map((o) => (<li key={o}>· {o}</li>))}
                  </ul>
                ) : (
                  <ManualFuncionesEmpty nombre={e.nombre} />
                )}
              </div>
            </DossierCard>
            <DossierCard title="Fueros y estabilidad" icon={<ShieldAlert className="h-4 w-4" />}>
              {e.fueros.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin fueros declarados.</p>
              ) : e.fueros.map((f) => (<p key={f} className="text-sm text-foreground">· {f}</p>))}
            </DossierCard>
            <DossierCard title="Alertas activas" icon={<ShieldCheck className="h-4 w-4" />}>
              {empAlerts.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin alertas abiertas para este colaborador.</p>
              ) : (
                <ul className="space-y-3">
                  {empAlerts.map((a, i) => (
                    <li key={i} className="rounded-xl border border-border bg-background/40 p-3">
                      <p className="text-sm text-foreground">{a.motivo}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{a.tipo}</p>
                    </li>
                  ))}
                </ul>
              )}
            </DossierCard>
          </div>
        )}

        {tab === "obligaciones" && <ObligacionesTab empleado={e} />}

        {tab === "timesheet" && <TimesheetTab empleadoId={e.id} salario={e.salario} jornada={e.jornada} />}

        {tab === "riesgo" && <RiesgoTab empleado={e} />}

        {tab === "pago" && <PagoLiquidacionTab empleado={e} />}

        {tab === "calendario" && <CalendarioTab empleado={e} />}





        {tab === "documentos" && <DocumentosTab empleado={e} />}

        {tab === "alertas" && (
          <ul className="space-y-3">
            {empAlerts.length === 0 ? (
              <EmptyState title="Sin alertas" description="Este colaborador no tiene alertas abiertas en este momento." />
            ) : empAlerts.map((a, i) => (
              <li key={i} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-foreground">{a.motivo}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{a.tipo}</p>
                  </div>
                  <StatusBadge tone={a.severidad === "alta" ? "warning" : "muted"}>{a.severidad}</StatusBadge>
                </div>
              </li>
            ))}
          </ul>
        )}

        {tab === "disciplinario" && <DisciplinarioTab empleado={e} />}

      </div>
    </div>
  );
}

// ─── Obligaciones tab ───────────────────────────────────────────────────────

type EmpForObligaciones = ReturnType<ReturnType<typeof useEmployees>["getEmployee"]> & {};

function ObligacionesTab({ empleado: e }: { empleado: NonNullable<EmpForObligaciones> }) {
  const proximas = useMemo(() => proximasObligaciones(e, 24), [e]);
  const mensuales = proximas.filter((x) => x.frecuencia === "mensual").slice(0, 6);
  const anuales = proximas.filter((x) => x.frecuencia === "anual").slice(0, 8);

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="space-y-5">
        <ChecklistObligaciones
          title="Aportes mensuales"
          icon={<CalendarDays className="h-4 w-4" />}
          items={mensuales}
          hintAvisos="Avisos automáticos 5, 3 y 1 día hábil antes."
        />
        <ChecklistObligaciones
          title="Obligaciones anuales / periódicas"
          icon={<Wallet className="h-4 w-4" />}
          items={anuales}
          hintAvisos="Avisos automáticos 30, 15 y 7 días hábiles antes."
        />
      </div>

      <CompliancePanel empleadoId={e.id} salario={e.salario} />
    </div>
  );
}

// ─── Checklist de obligaciones ───────────────────────────────────────────────

function ChecklistObligaciones({
  title, icon, items, hintAvisos,
}: {
  title: string;
  icon: React.ReactNode;
  items: ObligacionEvento[];
  hintAvisos: string;
}) {
  const { isDone, toggle } = useObligaciones();
  const hoy = new Date();
  const total = items.length;
  const hechos = items.filter((x) => isDone(x.id)).length;

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <header className="mb-1 flex items-center justify-between gap-2 text-foreground">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{icon}</span>
          <h3 className="text-sm font-medium">{title}</h3>
        </div>
        <StatusBadge tone={hechos === total && total > 0 ? "success" : "muted"}>
          {hechos}/{total}
        </StatusBadge>
      </header>
      <p className="mb-4 text-[11px] text-muted-foreground">{hintAvisos}</p>

      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Sin obligaciones próximas.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((o) => {
            const target = new Date(o.fecha + "T00:00:00");
            const dh = diasHabilesHasta(target, hoy);
            const nivel = nivelAviso(dh, o.frecuencia);
            const done = isDone(o.id);
            return (
              <ChecklistRow key={o.id} item={o} done={done} dh={dh} nivel={nivel} onToggle={() => toggle(o.id)} />
            );
          })}
        </ul>
      )}
    </section>
  );
}

function ChecklistRow({
  item, done, dh, nivel, onToggle,
}: {
  item: ObligacionEvento;
  done: boolean;
  dh: number;
  nivel: NivelAviso;
  onToggle: () => void;
}) {
  const tone = nivel === "vencido" ? "warning"
    : nivel === "urgente" ? "warning"
    : nivel === "advertencia" ? "primary"
    : "muted";
  const cuenta = dh < 0 ? `vencido hace ${Math.abs(dh)}d hábiles`
    : dh === 0 ? "vence hoy"
    : `en ${dh}d hábiles`;
  const avisos = avisosFrecuencia(item.frecuencia);
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={done}
        className={`flex w-full items-start justify-between gap-3 rounded-xl border bg-background/40 px-3 py-3 text-left transition hover:border-primary/40 ${
          done ? "border-emerald-400/40 bg-emerald-400/5" : "border-border"
        }`}
      >
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border ${
              done ? "border-emerald-400 bg-emerald-400/20 text-emerald-300" : "border-border bg-background"
            }`}
          >
            {done && <Check className="h-3 w-3" />}
          </span>
          <div className="min-w-0">
            <p className={`truncate text-sm ${done ? "text-muted-foreground line-through" : "text-foreground"}`}>
              {item.label}
            </p>
            {item.detalle && <p className="truncate text-[11px] text-muted-foreground">{item.detalle}</p>}
            <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              Avisos: {avisos.join(" · ")} días hábiles antes
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 whitespace-nowrap">
          <p className="text-xs text-foreground">{formatShortDate(item.fecha)}</p>
          {item.monto != null && (
            <p className="text-[11px] text-muted-foreground">{formatCOP(item.monto)}</p>
          )}
          {done ? (
            <StatusBadge tone="success">hecho</StatusBadge>
          ) : (
            <StatusBadge tone={tone}>{cuenta}</StatusBadge>
          )}
        </div>
      </button>
    </li>
  );
}

function formatShortDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

// ─── Compliance panel (Ley 2101) ────────────────────────────────────────────

function CompliancePanel({ empleadoId, salario }: { empleadoId: string; salario: number }) {
  const { data: entries = [] } = useTimesheetEntries(empleadoId);
  const ordinaria = valorHoraOrdinaria(salario);
  const totales = entries.reduce((acc, x) => {
    acc.horas += Number(x.horas);
    acc.valor += calcularValorEntrada(salario, Number(x.horas), x.tipo as TipoHora);
    return acc;
  }, { horas: 0, valor: 0 });

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Compliance de jornada · Ley 2101/2021</p>

      <div className="mt-4 space-y-1">
        <div className="flex items-center justify-between border-b border-dashed border-border/60 py-2 text-sm">
          <span className="text-muted-foreground">Jornada máxima legal 2026</span>
          <StatusBadge tone="primary">42 h/sem · Ley 2101</StatusBadge>
        </div>
        <div className="flex items-center justify-between border-b border-dashed border-border/60 py-2 text-sm">
          <span className="text-muted-foreground">Valor hora ordinaria</span>
          <span className="font-display text-base text-foreground">{formatCOP(ordinaria)}</span>
        </div>
      </div>

      <RegistrarHorasForm empleadoId={empleadoId} salario={salario} onAdd={addEntry} />

      <div className="mt-6 flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Registro de horas (bitácora)</p>
        <p className="text-xs text-muted-foreground">{totales.horas} h · {formatCOP(totales.valor)}</p>
      </div>

      <ul className="mt-3 space-y-2">
        {empEntries.length === 0 && (
          <li className="rounded-xl border border-dashed border-border bg-background/30 px-4 py-6 text-center text-sm text-muted-foreground">
            Aún no hay horas registradas.
          </li>
        )}
        {empEntries.map((x) => (
          <BitacoraRow key={x.id} entry={x} salario={salario} onRemove={() => removeEntry(x.id)} />
        ))}
      </ul>

      <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
        Las horas extra se pagan completas con su factor; los recargos (nocturno/dominical) pagan solo el sobrecosto. Base: salario ÷ 240. Factores según Ley 2466/2025.
      </p>
    </section>
  );
}

function RegistrarHorasForm({
  empleadoId, salario, onAdd, includePto = false,
}: {
  empleadoId: string;
  salario: number;
  onAdd: ReturnType<typeof useTimesheet>["addEntry"];
  includePto?: boolean;
}) {
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [horas, setHoras] = useState<number>(1);
  const [tipo, setTipo] = useState<TipoHora>("extra_diurna");

  const tipos = (Object.keys(FACTORES_HORA) as TipoHora[]).filter((t) => includePto || (t !== "pto" && t !== "permiso" && t !== "incapacidad" && t !== "ordinaria"));
  const valor = calcularValorEntrada(salario, horas, tipo);

  function submit() {
    if (!fecha || !horas || horas <= 0) {
      toast.error("Ingresa fecha y horas válidas.");
      return;
    }
    const res = onAdd({ empleadoId, fecha, horas, tipo });
    if (!res.ok) toast.error(res.reason);
    else {
      toast.success(`Hora registrada · ${formatCOP(valor)}`);
      setHoras(1);
    }
  }

  return (
    <div className="mt-5 rounded-xl border border-border bg-background/40 p-4">
      <p className="text-sm font-medium text-foreground">Registrar horas extra</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-[140px_100px_1fr_auto]">
        <Field label="Día">
          <input type="date" value={fecha} onChange={(ev) => setFecha(ev.target.value)} className={inputCls} />
        </Field>
        <Field label="Horas">
          <input type="number" min={0.5} max={8} step={0.5} value={horas} onChange={(ev) => setHoras(Number(ev.target.value))} className={inputCls} />
        </Field>
        <Field label="Tipo de hora">
          <select value={tipo} onChange={(ev) => setTipo(ev.target.value as TipoHora)} className={inputCls}>
            {tipos.map((t) => (
              <option key={t} value={t}>{FACTORES_HORA[t].label}</option>
            ))}
          </select>
        </Field>
        <div className="flex items-end">
          <button
            type="button"
            onClick={submit}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/15 px-4 text-sm font-medium text-primary hover:bg-primary/25"
          >
            <Plus className="h-4 w-4" /> Registrar
          </button>
        </div>
      </div>
      {horas > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">Valor estimado: <span className="text-foreground">{formatCOP(valor)}</span></p>
      )}
    </div>
  );
}

function BitacoraRow({ entry, salario, onRemove }: { entry: TimesheetEntry; salario: number; onRemove: () => void }) {
  const f = FACTORES_HORA[entry.tipo];
  const valor = calcularValorEntrada(salario, entry.horas, entry.tipo);
  const tone = f.family === "extra" ? "primary" : f.family === "recargo" ? "warning" : f.family === "dom" ? "warning" : "muted";
  const d = new Date(entry.fecha + "T00:00:00");
  const dayLabel = d.toLocaleDateString("es-CO", { day: "2-digit", month: "short" });
  return (
    <li className="grid grid-cols-[64px_1fr_60px_120px_28px] items-center gap-3 rounded-xl border border-border bg-background/40 px-4 py-3 text-sm">
      <span className="font-display text-base text-foreground">{dayLabel}</span>
      <div className="min-w-0">
        <StatusBadge tone={tone}>{f.label}</StatusBadge>
        <p className="mt-1 text-[11px] text-muted-foreground">registrado {entry.fecha}</p>
      </div>
      <span className="text-right text-muted-foreground">{entry.horas} h</span>
      <span className="text-right font-medium text-foreground">{formatCOP(valor)}</span>
      <button onClick={onRemove} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground" aria-label="Eliminar">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </li>
  );
}

// ─── Timesheet tab ──────────────────────────────────────────────────────────

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] as const;

function parseJornadaSemanal(jornada: string): number {
  const m = jornada.match(/(\d+(?:[.,]\d+)?)\s*h\s*\/\s*sem/i);
  if (m) return Number(m[1].replace(",", "."));
  return 42;
}

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const dow = (x.getDay() + 6) % 7; // lun=0
  x.setDate(x.getDate() - dow);
  return x;
}

function fmtFecha(d: Date) {
  return d.toISOString().slice(0, 10);
}

function fmtRango(monday: Date) {
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  const f = (x: Date) => x.toLocaleDateString("es-CO", { day: "2-digit", month: "short" });
  return `${f(monday)} – ${f(sunday)}`;
}

function TimesheetTab({ empleadoId, salario, jornada }: { empleadoId: string; salario: number; jornada: string }) {
  const { data: backendEntries = [] } = useTimesheetEntries(empleadoId);
  const addEntryMut = useAddTimesheetEntry(empleadoId);
  const deleteEntryMut = useDeleteTimesheetEntry(empleadoId);

  // Adapt backend entries to the local TimesheetEntry shape
  const entries: BackendTimesheetEntry[] = backendEntries;

  function addEntry(e: { empleadoId: string; fecha: string; horas: number; tipo: TipoHora; notas?: string }) {
    addEntryMut.mutate({ fecha: e.fecha, horas: e.horas, tipo: e.tipo, notas: e.notas });
    return { ok: true } as { ok: true };
  }
  function removeEntry(id: string) {
    deleteEntryMut.mutate(id);
  }
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()));

  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStart]);

  const weekDateStrings = weekDates.map(fmtFecha);
  const horasSemanales = parseJornadaSemanal(jornada);
  const ordinariaPorDia = horasSemanales / 5; // L–V

  // Entradas registradas en esta semana (backend entries are already filtered by colaboradorId)
  const semana = useMemo(
    () => entries.filter((x) => weekDateStrings.includes(x.fecha)),
    [entries, weekDateStrings.join(",")],
  );

  // Tipos visibles en la grilla: ordinaria siempre + cualquier tipo con entradas esta semana
  const tiposPresentes = Array.from(new Set(semana.map((x) => x.tipo as TipoHora))) as TipoHora[];
  const tiposGrilla = ["ordinaria" as TipoHora, ...tiposPresentes.filter((t) => t !== "ordinaria")];

  function horasCell(tipo: TipoHora, fecha: string): number {
    if (tipo === "ordinaria") {
      const idx = weekDateStrings.indexOf(fecha);
      const override = semana.find((x) => x.tipo === "ordinaria" && x.fecha === fecha);
      if (override) return Number(override.horas);
      // distribución automática L–V
      return idx >= 0 && idx <= 4 ? ordinariaPorDia : 0;
    }
    return semana
      .filter((x) => x.tipo === tipo && x.fecha === fecha)
      .reduce((s, x) => s + Number(x.horas), 0);
  }

  const totalSemana = tiposGrilla.reduce(
    (s, t) => s + weekDateStrings.reduce((ss, f) => ss + horasCell(t, f), 0),
    0,
  );
  const totalOrdinaria = weekDateStrings.reduce((s, f) => s + horasCell("ordinaria", f), 0);
  const totalExtras = semana.filter((x) => x.tipo.startsWith("extra_") || x.tipo.startsWith("recargo")).reduce((s, x) => s + Number(x.horas), 0);
  const totalPto = semana.filter((x) => ["pto", "permiso", "incapacidad"].includes(x.tipo)).reduce((s, x) => s + Number(x.horas), 0);

  function shiftWeek(delta: number) {
    const next = new Date(weekStart);
    next.setDate(next.getDate() + delta * 7);
    setWeekStart(next);
  }

  function exportCsv() {
    const header = "fecha,tipo,horas,valor\n";
    const rows: string[] = [];
    for (const fecha of weekDateStrings) {
      for (const t of tiposGrilla) {
        const h = horasCell(t, fecha);
        if (h > 0) rows.push(`${fecha},${t},${h},${calcularValorEntrada(salario, h, t)}`);
      }
    }
    const blob = new Blob([header + rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `timesheet-${empleadoId}-${fmtFecha(weekStart)}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado");
  }

  function deleteEntriesOfCell(tipo: TipoHora, fecha: string) {
    if (tipo === "ordinaria") return;
    semana.filter((x) => x.tipo === tipo && x.fecha === fecha).forEach((x) => removeEntry(x.id));
  }

  const cumple = totalOrdinaria + totalExtras <= horasSemanales + 12; // L2101 + tope extra semanal
  const isCurrentWeek = fmtFecha(weekStart) === fmtFecha(startOfWeek(new Date()));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => shiftWeek(-1)} className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground" aria-label="Semana anterior">‹</button>
          <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground">
            <span className="font-medium">Semana</span>
            <span className="ml-2 text-muted-foreground">{fmtRango(weekStart)}</span>
          </div>
          <button onClick={() => shiftWeek(1)} className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground" aria-label="Semana siguiente">›</button>
          {!isCurrentWeek && (
            <button onClick={() => setWeekStart(startOfWeek(new Date()))} className="rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground hover:text-foreground">Hoy</button>
          )}
        </div>
        <button onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground hover:bg-background">
          <Download className="h-3.5 w-3.5" /> Exportar CSV
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Kpi label="Ordinaria" value={`${totalOrdinaria.toFixed(1)} h`} icon={<Clock className="h-4 w-4" />} />
        <Kpi label="Extras / recargos" value={`${totalExtras.toFixed(1)} h`} icon={<Clock className="h-4 w-4" />} />
        <Kpi label="PTO / ausencias" value={`${totalPto.toFixed(1)} h`} icon={<CalendarDays className="h-4 w-4" />} />
        <Kpi label="Total semana" value={`${totalSemana.toFixed(1)} / ${horasSemanales} h`} icon={<Clock className="h-4 w-4" />} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="grid grid-cols-[180px_repeat(7,1fr)_90px] gap-px bg-border text-[11px] uppercase tracking-wider text-muted-foreground">
          <div className="bg-background/60 px-4 py-3">Concepto</div>
          {weekDates.map((d, i) => (
            <div key={i} className="bg-background/60 px-2 py-3 text-center">
              <div>{DIAS[i]}</div>
              <div className="mt-0.5 font-mono text-[10px] normal-case tracking-normal text-muted-foreground/70">{d.getDate()}</div>
            </div>
          ))}
          <div className="bg-background/60 px-2 py-3 text-right">Total</div>
        </div>
        <div className="divide-y divide-border">
          {tiposGrilla.map((t) => {
            const rowTotal = weekDateStrings.reduce((s, f) => s + horasCell(t, f), 0);
            const isOrd = t === "ordinaria";
            return (
              <div key={t} className="grid grid-cols-[180px_repeat(7,1fr)_90px] items-center gap-px bg-border">
                <div className="bg-card px-4 py-3 text-sm">
                  <p className="text-foreground">{FACTORES_HORA[t].label}</p>
                  {isOrd && <p className="text-[10px] text-muted-foreground">auto · {ordinariaPorDia.toFixed(1)} h/día L–V</p>}
                </div>
                {weekDateStrings.map((f, i) => {
                  const h = horasCell(t, f);
                  const isWeekend = i >= 5;
                  return (
                    <button
                      key={f}
                      onClick={() => deleteEntriesOfCell(t, f)}
                      disabled={isOrd || h === 0}
                      className={`group bg-card px-2 py-3 text-center font-mono text-sm transition ${h > 0 ? (isOrd ? "text-foreground" : "text-primary") : isWeekend ? "text-muted-foreground/30" : "text-muted-foreground/60"} ${!isOrd && h > 0 ? "hover:bg-destructive/10 hover:text-destructive" : ""}`}
                      title={!isOrd && h > 0 ? "Eliminar registros de esta celda" : undefined}
                    >
                      {h > 0 ? h.toFixed(1) : "—"}
                    </button>
                  );
                })}
                <div className="bg-card px-2 py-3 text-right font-mono text-sm text-foreground">{rowTotal.toFixed(1)}</div>
              </div>
            );
          })}
          <div className="grid grid-cols-[180px_repeat(7,1fr)_90px] items-center gap-px bg-border">
            <div className="bg-background/40 px-4 py-3 text-[11px] uppercase tracking-wider text-muted-foreground">Total día</div>
            {weekDateStrings.map((f) => {
              const total = tiposGrilla.reduce((s, t) => s + horasCell(t, f), 0);
              return (
                <div key={f} className="bg-background/40 px-2 py-3 text-center font-mono text-sm text-foreground">
                  {total > 0 ? total.toFixed(1) : "—"}
                </div>
              );
            })}
            <div className="bg-background/40 px-2 py-3 text-right font-mono text-sm font-medium text-foreground">{totalSemana.toFixed(1)}</div>
          </div>
        </div>
      </div>

      {!cumple && (
        <LegalWarningBanner tone="warning">
          La suma de horas ordinarias + extras supera el tope semanal sugerido (Ley 2101/2021 · 42 h + máx. 12 h extra).
        </LegalWarningBanner>
      )}

      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="text-sm font-medium text-foreground">Registrar horas extra o ausencias</p>
        <p className="mt-1 text-xs text-muted-foreground">Las horas ordinarias se distribuyen automáticamente según la jornada ({horasSemanales} h/semana). Registra aquí solo lo que se sale de la jornada base.</p>
        <RegistrarHorasForm empleadoId={empleadoId} salario={salario} onAdd={addEntry} includePto />
      </div>
    </div>
  );
}

// ─── Riesgo & liquidación ───────────────────────────────────────────────────

const debidoProcesoChecklist = [
  { key: "causal", label: "Causal objetiva documentada", ref: "art. 62 CST" },
  { key: "citacion", label: "Citación a descargos por escrito", ref: "art. 115 CST" },
  { key: "defensa", label: "Oportunidad real de defensa", ref: "art. 29 CN" },
  { key: "acta", label: "Acta de descargos firmada", ref: "SL1706-2024" },
  { key: "sancion", label: "Sanción dentro de términos", ref: "art. 115 CST" },
] as const;

function RiesgoTab({ empleado: e }: { empleado: Employee }) {
  const [escenario, setEscenario] = useState<"sin" | "con">("sin");
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const liq = useMemo(() => liquidacion(e), [e]);
  const riesgo = useMemo(() => riesgoDespido(e), [e]);
  const { generar, get } = useLiquidaciones();
  const navigate = useNavigate();
  const yaGenerada = !!get(e.id);

  const costo = escenario === "sin" ? liq.totalSinJusta : liq.totalConJusta;
  const cumplidos = debidoProcesoChecklist.filter((i) => checked[i.key]).length;
  const procesoOk = cumplidos === debidoProcesoChecklist.length;

  const nivelTone = riesgo.nivel === "alto" ? "warning" : riesgo.nivel === "medio" ? "primary" : "muted";
  const barWidth = riesgo.nivel === "alto" ? "100%" : riesgo.nivel === "medio" ? "55%" : "20%";
  const barColor = riesgo.nivel === "alto" ? "bg-rose-400" : riesgo.nivel === "medio" ? "bg-amber-400" : "bg-emerald-400";

  const descargarCSV = () => {
    const csv = liquidacionCSV(e, liq, escenario);
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `liquidacion-${e.id}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast.success("CSV con cálculos descargado");
  };

  const generarLiq = () => {
    generar({
      empleadoId: e.id,
      salario: e.salario,
      totalEstimado: costo,
      escenario,
    });
    toast.warning("Liquidación generada. El conteo de mora (art. 65 CST) inicia hoy.", {
      description: "Costo diario por mora: 1 día de salario por día hábil de retraso.",
    });
    navigate({ to: "/colaboradores/$id", params: { id: e.id }, search: { tab: "pago" } });
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-5">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Estimación de liquidación (si se desvincula hoy)</p>
          <div className="mt-4 space-y-1">
            <LiqRow k="Cesantías" sub="art. 249 CST" v={liq.cesantias} />
            <LiqRow k="Intereses a cesantías" sub="Ley 50/90" v={liq.intereses} />
            <LiqRow k="Prima de servicios" sub="art. 306 CST" v={liq.prima} />
            <LiqRow k="Vacaciones acumuladas" sub="art. 186 CST" v={liq.vacaciones} />
            <LiqRow
              k="Indemnización (sin justa causa)"
              sub={liq.indemDetalle || "—"}
              v={liq.indemnizacion}
              accent
            />
          </div>
          <div className="mt-4 border-t border-border pt-4">
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-medium text-foreground">Total (sin justa causa)</p>
              <p className="font-display text-xl text-foreground">{formatCOP(liq.totalSinJusta)}</p>
            </div>
            <div className="mt-1 flex items-baseline justify-between text-sm">
              <p className="text-muted-foreground">Total con justa causa</p>
              <p className="text-foreground">{formatCOP(liq.totalConJusta)}</p>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">Cálculo determinista (año comercial 360 días).</p>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={descargarCSV}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background/40 px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/40 hover:text-primary"
            >
              <Download className="h-3.5 w-3.5" /> Descargar CSV (cálculos explicados)
            </button>
            <button
              type="button"
              onClick={generarLiq}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              <CircleDollarSign className="h-3.5 w-3.5" /> {yaGenerada ? "Regenerar liquidación" : "Generar liquidación"}
            </button>
          </div>
          {yaGenerada && (
            <p className="mt-2 text-[11px] text-amber-300">
              Liquidación ya generada. Ver pestaña <strong>Pago liquidación</strong> para el conteo de mora.
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Semáforo de riesgo de despido</p>

          <div className="mt-4 inline-flex rounded-lg border border-border bg-background/40 p-1 text-xs">
            <button
              onClick={() => setEscenario("sin")}
              className={`rounded-md px-3 py-1.5 transition ${escenario === "sin" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              Sin justa causa
            </button>
            <button
              onClick={() => setEscenario("con")}
              className={`rounded-md px-3 py-1.5 transition ${escenario === "con" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              Con justa causa
            </button>
          </div>

          <div className="mt-4 rounded-xl border border-border bg-background/40 p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Costo económico</p>
            <p className="mt-1 font-display text-3xl text-foreground">{formatCOP(costo)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {escenario === "sin"
                ? "Incluye indemnización por terminación unilateral."
                : "Con justa causa probada no hay indemnización."}
            </p>
          </div>

          <div className="mt-4 rounded-xl border border-border bg-background/40 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">Riesgo de nulidad / reintegro</p>
              <StatusBadge tone={nivelTone}>{riesgo.nivel.toUpperCase()}</StatusBadge>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border/60">
              <div className={`h-full ${barColor}`} style={{ width: barWidth }} />
            </div>
            <div className="mt-3 flex items-start gap-2 text-sm">
              <Flag className="mt-0.5 h-3.5 w-3.5 text-rose-400" />
              <div>
                <p className="text-foreground">{riesgo.motivo}</p>
                {riesgo.detalle && <p className="text-xs text-muted-foreground">{riesgo.detalle}</p>}
              </div>
            </div>
          </div>
        </section>
      </div>

      {escenario === "con" && (
        <section className="rounded-2xl border border-border bg-card p-5">
          <header className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">Debido proceso disciplinario</p>
              <span className="text-xs text-muted-foreground">(art. 115 CST · SL1706-2024)</span>
            </div>
            <StatusBadge tone={procesoOk ? "success" : "warning"}>
              {cumplidos}/{debidoProcesoChecklist.length} pasos
            </StatusBadge>
          </header>

          <ul className="mt-4 space-y-2">
            {debidoProcesoChecklist.map((i) => {
              const on = !!checked[i.key];
              return (
                <li key={i.key}>
                  <button
                    type="button"
                    onClick={() => setChecked((s) => ({ ...s, [i.key]: !s[i.key] }))}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-background/40 px-4 py-3 text-left hover:border-primary/40"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`grid h-5 w-5 place-items-center rounded-full border ${on ? "border-emerald-400 bg-emerald-400/20 text-emerald-300" : "border-border bg-background"}`}>
                        {on && <Check className="h-3 w-3" />}
                      </span>
                      <div>
                        <p className="text-sm text-foreground">{i.label}</p>
                        <p className="text-[11px] text-muted-foreground">{i.ref}</p>
                      </div>
                    </div>
                    <StatusBadge tone={on ? "success" : "muted"}>{on ? "OK" : "sin dato"}</StatusBadge>
                  </button>
                </li>
              );
            })}
          </ul>

          <p className="mt-4 text-xs text-muted-foreground">
            {procesoOk
              ? "Debido proceso documentado: la justa causa es defendible."
              : "Sin debido proceso completo, una justa causa puede ser declarada ineficaz."}
          </p>
        </section>
      )}
    </div>
  );
}

function LiqRow({ k, sub, v, accent }: { k: string; sub: string; v: number; accent?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-dashed border-border/40 py-2 text-sm last:border-b-0">
      <div>
        <p className="text-foreground">{k}</p>
        <p className="text-[11px] text-muted-foreground">{sub}</p>
      </div>
      <p className={accent ? "font-medium text-amber-300" : "text-foreground"}>{formatCOP(v)}</p>
    </div>
  );
}

// ─── Disciplinario tab ─────────────────────────────────────────────────────

function fmtFechaLarga(iso: string) {
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
}

function buildCartaTexto(input: {
  ciudad: string;
  hoy: string;
  nombre: string;
  cargo: string;
  area: string;
  cedula: string;
  fechaHechos: string;
  hechos: string;
  gravedad: Gravedad;
  norma: string;
  fechaDiligencia: string;
  hora: string;
  modalidad: string;
  lugar: string;
  asistentes: string;
}) {
  const g = GRAVEDAD_LABEL[input.gravedad].toUpperCase();
  return [
    `${input.ciudad}, ${fmtFechaLarga(input.hoy)}`,
    ``,
    `Señor(a)`,
    `${input.nombre}`,
    `${input.cargo} — ${input.area}`,
    `C.C. ${input.cedula}`,
    ``,
    `Asunto: Citación a diligencia de descargos`,
    ``,
    `Por medio de la presente, la Empresa lo(a) cita a rendir DESCARGOS por los siguientes hechos, presuntamente ocurridos el ${fmtFechaLarga(input.fechaHechos)}:`,
    ``,
    `"${input.hechos}"`,
    ``,
    `Dichos hechos podrían constituir una infracción de carácter ${g} a ${input.norma}.`,
    ``,
    `La diligencia se realizará el ${fmtFechaLarga(input.fechaDiligencia)} a las ${input.hora}, en modalidad ${input.modalidad} (${input.lugar}).`,
    ``,
    `Asistentes convocados: ${input.asistentes}.`,
    ``,
    `Usted tiene derecho a ser escuchado(a), a presentar y controvertir pruebas, y a estar acompañado(a) por dos (2) representantes del sindicato o dos (2) compañeros, en garantía del debido proceso (art. 115 CST y art. 29 C.N.).`,
    ``,
    `⚠ REVISIÓN OBLIGATORIA DEL ABOGADO ANTES DE NOTIFICAR — verificar tipificación en el Reglamento Interno y proporcionalidad de la sanción`,
    ``,
    `Atentamente,`,
    ``,
    `__________________________`,
    `Representante del empleador`,
  ].join("\n");
}

function descargarCartaDoc(carta: string, filename: string) {
  // Word abre HTML con extensión .doc y MIME application/msword
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${filename}</title></head><body><pre style="font-family: 'Times New Roman', serif; font-size: 12pt; white-space: pre-wrap;">${carta.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</pre></body></html>`;
  const blob = new Blob(["\ufeff", html], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${filename}.doc`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function DisciplinarioTab({ empleado: e }: { empleado: Employee }) {
  const { data: expedientes = [] } = useExpedientes(e.id);
  const createExpediente = useCreateExpediente();
  const updateExpediente = useUpdateExpediente();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = expedientes.find((x) => x.id === selectedId) ?? expedientes[0] ?? null;

  function toggleEtapa(id: string, key: string, val: boolean) {
    const exp = expedientes.find((x) => x.id === id);
    if (!exp) return;
    const etapas = { ...(exp.etapas ?? {}), [key]: val };
    updateExpediente.mutate({ id, data: { etapas } });
  }
  function setEstado(id: string, estado: "abierto" | "cerrado") {
    updateExpediente.mutate({ id, data: { estado } });
  }
  function registrarNotificacion(id: string, canal: "email" | "telefono") {
    const exp = expedientes.find((x) => x.id === id);
    const notificado = [...(exp?.notificado ?? []), { canal, fecha: new Date().toISOString().slice(0, 10) }];
    updateExpediente.mutate({ id, data: { notificado } });
  }
  function remove(_id: string) {
    // delete not wired yet
  }

  // Form state
  const hoy = new Date().toISOString().slice(0, 10);
  const [hechos, setHechos] = useState("Abandono del puesto de trabajo por 2 horas sin autorización durante el turno.");
  const [fechaHechos, setFechaHechos] = useState(hoy);
  const [gravedad, setGravedad] = useState<Gravedad>("leve");
  const [norma, setNorma] = useState("Art. 7, lit. b, Reglamento Interno · art. 60 CST");
  const [fechaDiligencia, setFechaDiligencia] = useState(hoy);
  const [hora, setHora] = useState("10:00 a.m.");
  const [modalidad, setModalidad] = useState<"Presencial" | "Virtual">("Presencial");
  const [lugar, setLugar] = useState("Sala de juntas");
  const [asistentes, setAsistentes] = useState("Trabajador, Jefe inmediato, RRHH, Testigo");
  const [ciudad, setCiudad] = useState("Medellín");
  const [crearTeams, setCrearTeams] = useState(false);

  const cartaPreview = useMemo(() => buildCartaTexto({
    ciudad, hoy, nombre: e.nombre, cargo: e.cargo, area: e.area, cedula: e.cedula,
    fechaHechos, hechos, gravedad, norma, fechaDiligencia, hora, modalidad, lugar, asistentes,
  }), [ciudad, hoy, e, fechaHechos, hechos, gravedad, norma, fechaDiligencia, hora, modalidad, lugar, asistentes]);

  const generar = async () => {
    if (!hechos.trim()) { toast.error("Describe los hechos antes de generar la carta."); return; }
    try {
      const item = await createExpediente.mutateAsync({
        colaboradorId: e.id, hechos, fechaHechos, gravedad, normaVulnerada: norma,
        fechaDiligencia, hora, modalidad, lugar, asistentes, ciudad,
        cartaTexto: cartaPreview,
      });
      setSelectedId(item.id);
      toast.success("Expediente creado y carta registrada");
    } catch {
      toast.error("Error al crear el expediente");
    }
  };

  const reincidencia = expedientes.length;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      {/* Columna izquierda: lista + timeline */}
      <div className="space-y-6">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Expediente disciplinario</p>
            {reincidencia >= 2 && (
              <span className="inline-flex items-center gap-1 text-[11px] text-amber-300"><AlertTriangle className="h-3 w-3" />Reincidencia ({reincidencia} faltas) — relevante para la proporcionalidad.</span>
            )}
          </div>
          {expedientes.length === 0 ? (
            <EmptyState title="Sin procesos disciplinarios" description="Genera la primera carta de descargos para abrir un expediente." />
          ) : (
            <ul className="space-y-2">
              {expedientes.map((x) => {
                const isSel = selected?.id === x.id;
                return (
                  <li key={x.id}>
                    <button
                      onClick={() => setSelectedId(x.id)}
                      className={`w-full rounded-2xl border bg-card p-4 text-left transition ${isSel ? "border-primary/60 ring-1 ring-primary/40" : "border-border hover:border-border-strong"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <StatusBadge tone={GRAVEDAD_TONE[x.gravedad]}>{GRAVEDAD_LABEL[x.gravedad].toUpperCase()}</StatusBadge>
                          <div>
                            <p className="text-sm text-foreground">{x.hechos}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{fmtFechaLarga(x.fechaHechos)} · {x.estado === "abierto" ? "En proceso" : "Cerrado"}</p>
                          </div>
                        </div>
                        <StatusBadge tone={x.estado === "abierto" ? "warning" : "muted"}>{x.estado === "abierto" ? "Abierto" : "Cerrado"}</StatusBadge>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {selected && (
          <section className="rounded-2xl border border-border bg-card p-5">
            <header className="mb-4 flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Línea de tiempo</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEstado(selected.id, selected.estado === "abierto" ? "cerrado" : "abierto")}
                  className="rounded-full border border-border-strong px-3 py-1 text-xs text-foreground hover:bg-surface-elevated"
                >
                  Marcar como {selected.estado === "abierto" ? "cerrado" : "abierto"}
                </button>
                <button
                  onClick={() => { if (confirm("¿Eliminar expediente?")) { remove(selected.id); setSelectedId(null); } }}
                  className="rounded-full border border-border-strong px-2 py-1 text-xs text-muted-foreground hover:text-rose-300"
                  aria-label="Eliminar"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </header>
            <ol className="space-y-3">
              {ETAPAS.map((et, idx) => {
                const done = selected.etapas[et.key];
                return (
                  <li key={et.key}>
                    <button
                      onClick={() => toggleEtapa(selected.id, et.key)}
                      className="flex w-full items-center gap-3 rounded-lg px-2 py-1 text-left hover:bg-background/40"
                    >
                      <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${done ? "border-emerald-400 bg-emerald-400/20 text-emerald-300" : "border-border text-muted-foreground"}`}>
                        {done && <Check className="h-3 w-3" />}
                      </span>
                      <div className="flex-1">
                        <p className={`text-sm ${done ? "text-foreground line-through decoration-emerald-400/60" : "text-foreground"}`}>{idx + 1}. {et.label}</p>
                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{done ? "Cumplida" : idx === ETAPAS.findIndex((e) => !selected.etapas[e.key]) ? "En curso" : "Pendiente"}</p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ol>

            <div className="mt-5 border-t border-border pt-4">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Notificar al colaborador</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <a
                  href={`mailto:${e.correo}?subject=${encodeURIComponent("Citación a diligencia de descargos")}&body=${encodeURIComponent(selected.cartaTexto)}`}
                  onClick={() => registrarNotificacion(selected.id, "email")}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                >
                  <Mail className="h-3.5 w-3.5" />Enviar por correo ({e.correo})
                </a>
                <a
                  href={`sms:${e.telefono.replace(/\s/g, "")}?&body=${encodeURIComponent(`Citación a descargos: diligencia el ${fmtFechaLarga(selected.fechaDiligencia)} a las ${selected.hora} (${selected.modalidad}, ${selected.lugar}). Carta formal enviada al correo registrado.`)}`}
                  onClick={() => registrarNotificacion(selected.id, "telefono")}
                  className="inline-flex items-center gap-2 rounded-full border border-border-strong px-4 py-2 text-xs font-medium text-foreground hover:bg-surface-elevated"
                >
                  <MessageSquare className="h-3.5 w-3.5" />Enviar SMS ({e.telefono})
                </a>
                <button
                  onClick={() => descargarCartaDoc(selected.cartaTexto, `carta-descargos-${e.id}-${selected.id}`)}
                  className="inline-flex items-center gap-2 rounded-full border border-border-strong px-4 py-2 text-xs font-medium text-foreground hover:bg-surface-elevated"
                >
                  <Download className="h-3.5 w-3.5" />Exportar a Word
                </button>
              </div>
              {selected.notificado && selected.notificado.length > 0 && (
                <ul className="mt-3 space-y-1 text-[11px] text-muted-foreground">
                  {selected.notificado.map((n, i) => (
                    <li key={i}>· Notificado vía {n.canal === "email" ? "correo" : "SMS"} · {new Date(n.fecha).toLocaleString("es-CO")}</li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}
      </div>

      {/* Columna derecha: generador de carta */}
      <div className="space-y-4">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Generar carta de descargos</p>

        <Field label="Hechos / infracción">
          <textarea
            value={hechos}
            onChange={(ev) => setHechos(ev.target.value)}
            rows={3}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Fecha hechos">
            <input type="date" value={fechaHechos} onChange={(ev) => setFechaHechos(ev.target.value)} className={inputCls} />
          </Field>
          <Field label="Gravedad">
            <select value={gravedad} onChange={(ev) => setGravedad(ev.target.value as Gravedad)} className={inputCls}>
              <option value="leve">Leve</option>
              <option value="grave">Grave</option>
              <option value="gravisima">Gravísima</option>
            </select>
          </Field>
        </div>

        <Field label="Norma vulnerada">
          <input value={norma} onChange={(ev) => setNorma(ev.target.value)} className={inputCls} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Fecha diligencia">
            <input type="date" value={fechaDiligencia} onChange={(ev) => setFechaDiligencia(ev.target.value)} className={inputCls} />
          </Field>
          <Field label="Hora">
            <input value={hora} onChange={(ev) => setHora(ev.target.value)} className={inputCls} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Modalidad">
            <select value={modalidad} onChange={(ev) => setModalidad(ev.target.value as "Presencial" | "Virtual")} className={inputCls}>
              <option value="Presencial">Presencial</option>
              <option value="Virtual">Virtual</option>
            </select>
          </Field>
          <Field label="Lugar / enlace">
            <input value={lugar} onChange={(ev) => setLugar(ev.target.value)} className={inputCls} />
          </Field>
        </div>

        <Field label="Asistentes">
          <input value={asistentes} onChange={(ev) => setAsistentes(ev.target.value)} className={inputCls} />
        </Field>

        <Field label="Ciudad">
          <input value={ciudad} onChange={(ev) => setCiudad(ev.target.value)} className={inputCls} />
        </Field>

        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" checked={crearTeams} onChange={(ev) => setCrearTeams(ev.target.checked)} />
          Crear reunión en Microsoft Teams
        </label>

        <button
          onClick={generar}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Scale className="h-4 w-4" />Generar carta y registrar
        </button>

        <div className="rounded-2xl border border-border bg-background/40 p-4">
          <pre className="whitespace-pre-wrap font-serif text-[13px] leading-relaxed text-foreground">{cartaPreview}</pre>
        </div>
      </div>
    </div>
  );
}

// ─── helpers visuales ───────────────────────────────────────────────────────



const inputCls = "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function DossierCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <header className="mb-4 flex items-center gap-2 text-foreground">
        <span className="text-muted-foreground">{icon}</span>
        <h3 className="text-sm font-medium">{title}</h3>
      </header>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
function Row({ k, v, icon, dot }: { k: string; v: string; icon?: React.ReactNode; dot?: "ok" | "warn" | "risk" }) {
  const dotClass = dot === "warn" ? "bg-amber-400" : dot === "risk" ? "bg-rose-400" : dot === "ok" ? "bg-emerald-400" : "";
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/40 py-2 text-sm last:border-b-0">
      <span className="text-muted-foreground">{k}</span>
      <span className="inline-flex items-center gap-2 text-right text-foreground">
        {dot && <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} aria-hidden />}
        {icon}{v}
      </span>
    </div>
  );
}
function Kpi({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
        {icon}{label}
      </p>
      <p className="mt-2 font-display text-2xl text-foreground">{value}</p>
    </div>
  );
}
function ManualFuncionesEmpty({ nombre }: { nombre: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="mt-2 rounded-xl border border-dashed border-border bg-background/40 p-4">
      <p className="text-sm text-muted-foreground">
        Sin manual de funciones cargado para {nombre.split(" ")[0]}. Las funciones se extraen automáticamente al subirlo.
      </p>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="mt-3 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20"
      >
        <FilePlus2 className="h-3.5 w-3.5" /> Añadir manual de funciones
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        className="hidden"
        onChange={(ev) => {
          const f = ev.target.files?.[0];
          if (f) toast.success(`Manual recibido: ${f.name}`, { description: "Las funciones se extraerán y aparecerán aquí." });
          ev.target.value = "";
        }}
      />
    </div>
  );
}
function initials(n: string) { return n.split(" ").slice(0, 2).map((p) => p[0]).join("").toUpperCase(); }
function formatCOP(n: number) {
  return n.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
}
function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

// ─── CSV con cálculos explicados ───────────────────────────────────────────

function liquidacionCSV(e: Employee, liq: ReturnType<typeof liquidacion>, escenario: "sin" | "con") {
  
  const auxApl = e.salario <= 2 * 1423500;
  const auxV = auxApl ? Math.round(1423500 * 0.142) : 0;
  const base = e.salario + auxV;
  const rows: string[][] = [
    ["Concepto", "Fórmula", "Variables", "Cálculo numérico", "Valor (COP)"],
    [
      "Auxilio de transporte",
      "Aplica si salario ≤ 2 SMMLV → 14.2% SMMLV",
      `SMMLV=1.423.500; Salario=${e.salario}; ¿≤2 SMMLV?=${auxApl ? "Sí" : "No"}`,
      auxApl ? `1.423.500 × 0,142 = ${auxV}` : "0",
      String(auxV),
    ],
    [
      "Base salarial (cesantías/prima)",
      "Salario + Aux. transporte",
      `Salario=${e.salario}; Aux=${auxV}`,
      `${e.salario} + ${auxV} = ${base}`,
      String(base),
    ],
    [
      "Días laborados (año comercial)",
      "(Año−Año₀)×360 + (Mes−Mes₀)×30 + (Día−Día₀)",
      `Inicio=${e.fechaInicio}; Hoy=${new Date().toISOString().slice(0, 10)}`,
      `Total días = ${liq.dias}`,
      String(liq.dias),
    ],
    [
      "Cesantías (art. 249 CST)",
      "Base × Días / 360",
      `Base=${base}; Días=${liq.dias}`,
      `${base} × ${liq.dias} / 360 = ${liq.cesantias}`,
      String(liq.cesantias),
    ],
    [
      "Intereses a cesantías (Ley 50/90)",
      "Cesantías × Días × 12% / 360",
      `Cesantías=${liq.cesantias}; Días=${liq.dias}`,
      `${liq.cesantias} × ${liq.dias} × 0,12 / 360 = ${liq.intereses}`,
      String(liq.intereses),
    ],
    [
      "Prima de servicios (art. 306 CST)",
      "Base × Días del semestre / 360",
      `Base=${base}; Días semestre=${liq.diasPrima}`,
      `${base} × ${liq.diasPrima} / 360 = ${liq.prima}`,
      String(liq.prima),
    ],
    [
      "Vacaciones acumuladas (art. 186 CST)",
      "Salario × Días / 720  (15 días hábiles por año)",
      `Salario=${e.salario}; Días=${liq.dias}`,
      `${e.salario} × ${liq.dias} / 720 = ${liq.vacaciones}`,
      String(liq.vacaciones),
    ],
    [
      "Indemnización sin justa causa (art. 64 CST)",
      liq.indemDetalle || "—",
      `Tipo contrato=${e.tipoContrato}; Días indem.=${liq.indemDias}`,
      `${e.salario} × ${liq.indemDias} / 30 = ${liq.indemnizacion}`,
      String(liq.indemnizacion),
    ],
    [],
    [
      "TOTAL con justa causa",
      "Cesantías + Intereses + Prima + Vacaciones",
      "",
      `${liq.cesantias} + ${liq.intereses} + ${liq.prima} + ${liq.vacaciones} = ${liq.totalConJusta}`,
      String(liq.totalConJusta),
    ],
    [
      "TOTAL sin justa causa",
      "TOTAL con justa causa + Indemnización",
      "",
      `${liq.totalConJusta} + ${liq.indemnizacion} = ${liq.totalSinJusta}`,
      String(liq.totalSinJusta),
    ],
    [],
    [
      "Escenario seleccionado",
      escenario === "sin" ? "Terminación sin justa causa" : "Terminación con justa causa",
      "",
      "",
      escenario === "sin" ? String(liq.totalSinJusta) : String(liq.totalConJusta),
    ],
    [
      "Aviso – Sanción moratoria (art. 65 CST)",
      "Si no se paga al terminar: 1 día de salario × cada día de mora (primeros 24 meses)",
      `Día de salario = ${e.salario} / 30 = ${Math.round(e.salario / 30)}`,
      "",
      "",
    ],
  ];
  return rows
    .map((r) => r.map((c) => `"${(c ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

// ─── Pago liquidación: conteo de mora (art. 65 CST) ─────────────────────────

function PagoLiquidacionTab({ empleado: e }: { empleado: Employee }) {
  const { get, marcarPagada, registrarAviso, reset } = useLiquidaciones();
  const reg = get(e.id);
  const [, force] = useState(0);

  // Re-render cada minuto para mantener el contador vivo
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  // Generar avisos diarios faltantes
  useEffect(() => {
    if (!reg || reg.pagada) return;
    const inicio = new Date(reg.fechaTerminacion + "T00:00:00");
    const hoy = new Date();
    const diasTrans = Math.floor((hoy.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
    for (let d = 1; d <= diasTrans; d++) {
      const fecha = new Date(inicio.getTime() + d * 24 * 60 * 60 * 1000);
      const fechaISO = fecha.toISOString();
      const yaExiste = reg.avisos.some((a) => a.diasMora === d);
      if (yaExiste) continue;
      const mora = calcularMora(reg.salario, reg.fechaTerminacion, fecha);
      registrarAviso(e.id, {
        fecha: fechaISO,
        diasMora: d,
        costoAcumulado: mora.total,
        mensaje: `Día ${d} de mora: +${Math.round(reg.salario / 30).toLocaleString("es-CO")} COP de sanción. Acumulado: ${mora.total.toLocaleString("es-CO")} COP.`,
      });
    }
  }, [reg, e.id, registrarAviso]);

  if (!reg) {
    return (
      <EmptyState
        title="Sin liquidación generada"
        description="Genera la liquidación desde la pestaña Riesgo & liquidación para iniciar el conteo de mora."
      />
    );
  }

  const mora = calcularMora(reg.salario, reg.fechaTerminacion);
  const totalAdeudado = reg.totalEstimado + mora.total;
  const pagada = !!reg.pagada;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-4">
        <Kpi label="Liquidación estimada" value={formatCOP(reg.totalEstimado)} icon={<CircleDollarSign className="h-3.5 w-3.5" />} />
        <Kpi label="Días de mora" value={`${mora.dias} días`} icon={<Timer className="h-3.5 w-3.5" />} />
        <Kpi label="Sanción acumulada (art. 65)" value={formatCOP(mora.total)} icon={<AlertTriangle className="h-3.5 w-3.5" />} />
        <Kpi label="Total adeudado hoy" value={formatCOP(totalAdeudado)} icon={<Scale className="h-3.5 w-3.5" />} />
      </div>

      <section className={`rounded-2xl border p-5 ${pagada ? "border-emerald-400/40 bg-emerald-400/5" : mora.dias > 0 ? "border-rose-400/40 bg-rose-400/5" : "border-border bg-card"}`}>
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Estado del pago</p>
            <p className="mt-1 font-display text-2xl text-foreground">
              {pagada ? "Liquidación pagada" : mora.dias === 0 ? "Plazo vigente (pago inmediato)" : `En mora · ${mora.dias} días`}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Terminación: {formatDate(reg.fechaTerminacion)} · Generada {formatDate(reg.fechaGeneracion)}
              {pagada && reg.pagada && ` · Pagada el ${formatDate(reg.pagada.fecha)}`}
            </p>
          </div>
          {!pagada && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { marcarPagada(e.id, totalAdeudado); toast.success("Liquidación marcada como pagada"); }}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/30"
              >
                <Check className="h-3.5 w-3.5" /> Marcar como pagada
              </button>
              <button
                type="button"
                onClick={() => { reset(e.id); toast.message("Liquidación anulada"); }}
                className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <Trash2 className="h-3.5 w-3.5" /> Anular
              </button>
            </div>
          )}
        </header>

        {!pagada && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-background/40 p-4">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Costo diario actual</p>
              <p className="mt-1 font-display text-xl text-rose-300">{formatCOP(mora.diaSalario)} / día</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Art. 65 CST: 1 día de salario por cada día de mora (primeros 24 meses).
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background/40 p-4">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Fase 2 (tras mes 24)</p>
              <p className="mt-1 font-display text-xl text-foreground">{formatCOP(mora.fase2)}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Intereses moratorios a la tasa máxima legal (~25% E.A.).
              </p>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-300" />
            <p className="text-sm font-medium text-foreground">Avisos diarios</p>
          </div>
          <StatusBadge tone={reg.avisos.length > 1 ? "warning" : "muted"}>
            {reg.avisos.length} {reg.avisos.length === 1 ? "aviso" : "avisos"}
          </StatusBadge>
        </header>
        <ul className="mt-4 max-h-96 space-y-2 overflow-y-auto pr-1">
          {reg.avisos.map((a, i) => (
            <li key={`${a.fecha}-${i}`} className="flex items-start justify-between gap-3 rounded-xl border border-border bg-background/40 px-4 py-3">
              <div className="flex items-start gap-3">
                <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${a.diasMora === 0 ? "bg-emerald-400" : a.diasMora >= 30 ? "bg-rose-400" : "bg-amber-400"}`} />
                <div>
                  <p className="text-sm text-foreground">{a.mensaje}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{formatDate(a.fecha)} · día {a.diasMora}</p>
                </div>
              </div>
              <p className="whitespace-nowrap text-xs text-muted-foreground">{formatCOP(a.costoAcumulado)}</p>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-[11px] text-muted-foreground">
        Referencia legal: art. 65 CST · Corte Suprema SL2723-2024. El cálculo asume mora de mala fe; un juez puede graduarla.
      </p>
    </div>
  );
}


// ─── Calendario & novedades ─────────────────────────────────────────────────

type CalEvent = {
  fecha: string; // YYYY-MM-DD
  fechaFin?: string;
  tipo: "obligacion" | "novedad";
  subtipo?: NovedadTipo;
  label: string;
  detalle?: string;
  tone: "primary" | "warning" | "muted" | "success";
  novedadId?: string;
  eventId?: string; // id de obligación (para checklist sincronizada)
  frecuencia?: "mensual" | "anual";
};

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const DOW = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"] as const;

function pad(n: number) { return n.toString().padStart(2, "0"); }
function isoOf(y: number, m: number, d: number) { return `${y}-${pad(m + 1)}-${pad(d)}`; }
function parseISO(s: string) { return new Date(s + "T00:00:00"); }
function diffDays(a: Date, b: Date) {
  return Math.floor((b.getTime() - a.getTime()) / 86_400_000);
}

// obligacionesEnRango ahora vive en @/lib/obligaciones (compartido con la tab Obligaciones).

function CalendarioTab({ empleado: e }: { empleado: Employee }) {
  const { data: novedades = [] } = useNovedadesAPI(e.id);
  const createNovedad = useCreateNovedad(e.id);
  const deleteNovedad = useDeleteNovedad(e.id);
  const { isDone, toggle: toggleObl } = useObligaciones();
  const empNov = novedades;
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<string>(isoOf(today.getFullYear(), today.getMonth(), today.getDate()));

  // Vacaciones: 15 días hábiles / año causados proporcional a antigüedad
  const diasAntig = diasComerciales(e.fechaInicio);
  const vacCausadas = Math.floor((diasAntig / 360) * 15);
  const vacUsadas = empNov
    .filter((n) => n.tipo === "vacaciones")
    .reduce((s, _n) => s + 0, 0); // novedades no tienen rango de fechas todavía
  const vacDisponibles = Math.max(0, vacCausadas - vacUsadas);

  // Eventos del mes visible
  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
  const obligacionesEv: CalEvent[] = useMemo(() => {
    return obligacionesEnRango(e, monthStart, monthEnd).map((o) => ({
      fecha: o.fecha,
      tipo: "obligacion",
      label: o.label,
      detalle: o.detalle,
      tone: o.tone,
      eventId: o.id,
      frecuencia: o.frecuencia,
    }));
  }, [e, monthStart.getTime(), monthEnd.getTime()]);

  const novedadEventos: CalEvent[] = empNov.flatMap((n) => {
    const ini = parseISO(n.fecha);
    if (ini < monthStart || ini > monthEnd) return [];
    return [{
      fecha: isoOf(ini.getFullYear(), ini.getMonth(), ini.getDate()),
      tipo: "novedad" as const,
      subtipo: n.tipo as NovedadTipo,
      label: (NOVEDAD_LABEL as Record<string, string>)[n.tipo] ?? n.tipo,
      detalle: n.descripcion ?? undefined,
      tone: ((NOVEDAD_TONE as Record<string, "muted" | "warning" | "primary">)[n.tipo] ?? "muted") as CalEvent["tone"],
      novedadId: n.id,
    }];
  });
  const eventos: CalEvent[] = [...obligacionesEv, ...novedadEventos];

  const eventosDelDia = (iso: string) => eventos.filter((x) => x.fecha === iso);

  // Próximos términos (siguientes 6 meses) — usa la misma fuente que la checklist
  const horizonte = new Date(today.getFullYear(), today.getMonth() + 6, 0);
  const proximos = useMemo(() => {
    const allObl = obligacionesEnRango(e, today, horizonte);
    return allObl
      .map((o) => ({ ...o, dist: diffDays(today, parseISO(o.fecha)) }))
      .filter((o) => o.dist >= 0)
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 6);
  }, [e, today.getTime(), horizonte.getTime()]);

  // Grilla del calendario
  const firstDow = (monthStart.getDay() + 6) % 7; // lun=0
  const dim = monthEnd.getDate();
  const cells: Array<{ iso: string; day: number; muted: boolean }> = [];
  // padding prev
  for (let i = 0; i < firstDow; i++) {
    const d = new Date(monthStart);
    d.setDate(d.getDate() - (firstDow - i));
    cells.push({ iso: isoOf(d.getFullYear(), d.getMonth(), d.getDate()), day: d.getDate(), muted: true });
  }
  for (let d = 1; d <= dim; d++) cells.push({ iso: isoOf(cursor.getFullYear(), cursor.getMonth(), d), day: d, muted: false });
  while (cells.length % 7 !== 0) {
    const last = parseISO(cells[cells.length - 1].iso);
    last.setDate(last.getDate() + 1);
    cells.push({ iso: isoOf(last.getFullYear(), last.getMonth(), last.getDate()), day: last.getDate(), muted: true });
  }

  function shift(delta: number) {
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1));
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Vacaciones causadas" value={`${vacCausadas} días`} icon={<Umbrella className="h-3.5 w-3.5" />} />
        <Kpi label="Vacaciones tomadas" value={`${vacUsadas} días`} icon={<CalendarDays className="h-3.5 w-3.5" />} />
        <Kpi label="Vacaciones disponibles" value={`${vacDisponibles} días`} icon={<Check className="h-3.5 w-3.5" />} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-2xl border border-border bg-card p-5">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Calendario de novedades</p>
          <div className="mt-4 flex items-center justify-between">
            <button onClick={() => shift(-1)} className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-background/40 text-muted-foreground hover:text-foreground" aria-label="Mes anterior">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="font-display text-lg text-foreground">{MESES[cursor.getMonth()]} {cursor.getFullYear()}</p>
            <button onClick={() => shift(1)} className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-background/40 text-muted-foreground hover:text-foreground" aria-label="Mes siguiente">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-border bg-border">
            {DOW.map((d) => (
              <div key={d} className="bg-background/60 px-2 py-2 text-center text-[10px] uppercase tracking-wider text-muted-foreground">{d}</div>
            ))}
            {cells.map((c, i) => {
              const ev = eventosDelDia(c.iso);
              const isToday = c.iso === isoOf(today.getFullYear(), today.getMonth(), today.getDate());
              const isSelected = c.iso === selected;
              return (
                <button
                  key={i}
                  onClick={() => setSelected(c.iso)}
                  className={`relative min-h-[64px] bg-card px-2 py-2 text-left transition hover:bg-background/40 ${c.muted ? "opacity-40" : ""} ${isSelected ? "ring-2 ring-primary/60" : ""}`}
                >
                  <span className={`text-xs font-mono ${isToday ? "text-primary" : "text-foreground"}`}>{c.day}</span>
                  {ev.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {ev.slice(0, 3).map((x, k) => {
                        const done = x.eventId ? isDone(x.eventId) : false;
                        return (
                          <span
                            key={k}
                            className={`h-1.5 w-1.5 rounded-full ${done ? "bg-emerald-400/50 ring-1 ring-emerald-400" : toneDotClass(x.tone)}`}
                            title={`${x.label}${done ? " · hecho" : ""}`}
                          />
                        );
                      })}
                      {ev.length > 3 && <span className="text-[9px] text-muted-foreground">+{ev.length - 3}</span>}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-4 rounded-xl border border-border bg-background/40 p-4">
            <p className="text-sm font-medium text-foreground">{formatDate(selected)}</p>
            {eventosDelDia(selected).length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Sin novedades este día.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {eventosDelDia(selected).map((ev, i) => {
                  const done = ev.eventId ? isDone(ev.eventId) : false;
                  return (
                    <li key={i} className={`flex items-start justify-between gap-3 rounded-lg border px-3 py-2 text-sm ${done ? "border-emerald-400/40 bg-emerald-400/5" : "border-border bg-card"}`}>
                      <div className="flex items-start gap-2">
                        {ev.eventId ? (
                          <button
                            type="button"
                            onClick={() => toggleObl(ev.eventId!)}
                            className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border ${done ? "border-emerald-400 bg-emerald-400/20 text-emerald-300" : "border-border bg-background"}`}
                            aria-label={done ? "Desmarcar" : "Marcar como hecho"}
                          >
                            {done && <Check className="h-3 w-3" />}
                          </button>
                        ) : (
                          <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${toneDotClass(ev.tone)}`} />
                        )}
                        <div>
                          <p className={`${done ? "text-muted-foreground line-through" : "text-foreground"}`}>{ev.label}</p>
                          {ev.detalle && <p className="text-[11px] text-muted-foreground">{ev.detalle}</p>}
                        </div>
                      </div>
                      {ev.tipo === "novedad" && ev.novedadId && (
                        <button
                          onClick={() => { remove(ev.novedadId!); toast.message("Novedad eliminada"); }}
                          className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          aria-label="Eliminar novedad"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        <div className="space-y-5">
          <section className="rounded-2xl border border-border bg-card p-5">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Próximos términos</p>
            <ul className="mt-4 space-y-2">
              {proximos.length === 0 && <li className="text-sm text-muted-foreground">Sin términos próximos.</li>}
              {proximos.map((p, i) => {
                const d = parseISO(p.fecha);
                const done = isDone(p.id);
                const dh = diasHabilesHasta(d, today);
                const nivel = nivelAviso(dh, p.frecuencia);
                const cuenta = dh === 0 ? "hoy" : `en ${dh}d hábiles`;
                const badgeTone = done ? "success"
                  : nivel === "urgente" ? "warning"
                  : nivel === "advertencia" ? "primary"
                  : "muted";
                return (
                  <li key={i} className={`flex items-center gap-3 rounded-xl border-l-2 border bg-background/40 px-3 py-3 ${done ? "border-emerald-400/50 border-l-emerald-400" : `border-border ${toneBorderClass(p.tone)}`}`}>
                    <button
                      type="button"
                      onClick={() => toggleObl(p.id)}
                      className={`grid h-5 w-5 shrink-0 place-items-center rounded border ${done ? "border-emerald-400 bg-emerald-400/20 text-emerald-300" : "border-border bg-background hover:border-primary/40"}`}
                      aria-label={done ? "Desmarcar" : "Marcar como hecho"}
                    >
                      {done && <Check className="h-3 w-3" />}
                    </button>
                    <div className="text-center">
                      <p className={`font-display text-lg leading-none ${done ? "text-muted-foreground line-through" : "text-foreground"}`}>{d.getDate()}</p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{MESES[d.getMonth()].slice(0, 3)}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm ${done ? "text-muted-foreground line-through" : "text-foreground"}`}>{p.label}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{p.detalle}</p>
                    </div>
                    <StatusBadge tone={badgeTone}>{done ? "hecho" : cuenta}</StatusBadge>
                  </li>
                );
              })}
            </ul>
          </section>

          <RegistrarNovedadForm
            empleadoId={e.id}
            vacDisponibles={vacDisponibles}
            onAdd={add}
          />
        </div>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5">
        <header className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">Historial de novedades</p>
          <StatusBadge tone="muted">{empNov.length}</StatusBadge>
        </header>
        {empNov.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Aún no se han registrado novedades.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {empNov.map((n) => (
              <li key={n.id} className="grid grid-cols-[1fr_auto] items-center gap-3 py-3 text-sm">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone={NOVEDAD_TONE[n.tipo]}>{NOVEDAD_LABEL[n.tipo]}</StatusBadge>
                    <span className="text-foreground">{formatDate(n.desde)} → {formatDate(n.hasta)}</span>
                    <span className="text-xs text-muted-foreground">({diasEntre(n.desde, n.hasta)} días)</span>
                  </div>
                  {n.nota && <p className="mt-1 text-xs text-muted-foreground">{n.nota}</p>}
                  {n.documento && (
                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-primary">
                      <Paperclip className="h-3 w-3" /> {n.documento.nombre}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => { remove(n.id); toast.message("Novedad eliminada"); }}
                  className="grid h-7 w-7 place-items-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Eliminar"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function RegistrarNovedadForm({
  empleadoId, vacDisponibles, onAdd,
}: {
  empleadoId: string;
  vacDisponibles: number;
  onAdd: ReturnType<typeof useNovedades>["add"];
}) {
  const hoy = new Date().toISOString().slice(0, 10);
  const [tipo, setTipo] = useState<NovedadTipo>("incapacidad");
  const [desde, setDesde] = useState(hoy);
  const [hasta, setHasta] = useState(hoy);
  const [nota, setNota] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const dias = diasEntre(desde, hasta);
  const exigeDoc = tipo === "incapacidad";

  function submit() {
    if (!desde || !hasta || dias <= 0) {
      toast.error("Rango de fechas inválido.");
      return;
    }
    if (tipo === "vacaciones" && dias > vacDisponibles) {
      toast.error(`Solo hay ${vacDisponibles} días de vacaciones disponibles.`);
      return;
    }
    if (exigeDoc && !archivo) {
      toast.error("La incapacidad requiere documento soporte (EPS/ARL).");
      return;
    }
    onAdd({
      empleadoId,
      tipo,
      desde,
      hasta,
      nota: nota.trim() || undefined,
      documento: archivo ? { nombre: archivo.name, size: archivo.size } : undefined,
    });
    toast.success(`${NOVEDAD_LABEL[tipo]} registrada · ${dias} días`);
    setNota("");
    setArchivo(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Agregar novedad (con soporte)</p>

      <div className="mt-4 space-y-3">
        <Field label="Tipo">
          <select value={tipo} onChange={(ev) => setTipo(ev.target.value as NovedadTipo)} className={inputCls}>
            <option value="incapacidad">Incapacidad</option>
            <option value="vacaciones">Vacaciones</option>
            <option value="licencia">Licencia</option>
            <option value="permiso_remunerado">Permiso remunerado</option>
            <option value="suspension">Suspensión</option>
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Desde">
            <input type="date" value={desde} onChange={(ev) => setDesde(ev.target.value)} className={inputCls} />
          </Field>
          <Field label="Hasta">
            <input type="date" value={hasta} onChange={(ev) => setHasta(ev.target.value)} className={inputCls} />
          </Field>
        </div>
        {dias > 0 && (
          <p className="text-[11px] text-muted-foreground">
            Duración: <span className="text-foreground">{dias} {dias === 1 ? "día" : "días"}</span>
            {tipo === "vacaciones" && ` · Disponibles tras descuento: ${Math.max(0, vacDisponibles - dias)} días`}
          </p>
        )}
        <Field label="Nota">
          <input
            type="text"
            value={nota}
            onChange={(ev) => setNota(ev.target.value)}
            placeholder={tipo === "incapacidad" ? "Ej. incapacidad origen común EPS" : "Detalle opcional"}
            className={inputCls}
          />
        </Field>
        <div>
          <p className="mb-1 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
            <Paperclip className="h-3 w-3" /> Documento soporte {exigeDoc && <span className="text-rose-300">*</span>}
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={(ev) => setArchivo(ev.target.files?.[0] ?? null)}
            className="block w-full text-xs text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-background/40 file:px-3 file:py-1.5 file:text-xs file:text-foreground hover:file:bg-background"
          />
        </div>
        <button
          type="button"
          onClick={submit}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Agregar
        </button>
      </div>
    </section>
  );
}

function toneDotClass(t: CalEvent["tone"]) {
  return t === "warning" ? "bg-amber-400"
    : t === "primary" ? "bg-primary"
    : t === "success" ? "bg-emerald-400"
    : "bg-muted-foreground";
}
function toneBorderClass(t: CalEvent["tone"]) {
  return t === "warning" ? "border-l-amber-400"
    : t === "primary" ? "border-l-primary"
    : t === "success" ? "border-l-emerald-400"
    : "border-l-muted-foreground";
}

// ============================================================
// Documentos tab — repositorio legal, comprobantes y bitácora
// ============================================================
function DocumentosTab({ empleado: e }: { empleado: Employee }) {
  const { data: apiDocs = [] } = useDocumentosAPI(e.id);
  const uploadDoc = useUploadDocumento(e.id);
  const deleteDoc = useDeleteDocumento(e.id);
  const { data: novedades = [] } = useNovedadesAPI(e.id);
  const [note, setNoteLocal] = useState("");

  const getFile = (empId: string, slotKey: string) =>
    apiDocs.find((d) => d.slotKey === slotKey);
  const completos = DOC_SLOTS.filter((s) => getFile(e.id, s.key)).length;

  const onPick = (slot: typeof DOC_SLOTS[number]) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,.png,.jpg,.jpeg,.doc,.docx";
    input.onchange = () => {
      const f = input.files?.[0];
      if (!f) return;
      uploadDoc.mutate({ slotKey: slot.key, file: f });
      toast.success(`${slot.label} en carga…`);
    };
    input.click();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      <section className="rounded-2xl border border-border bg-card">
        <header className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Repositorio de documentos</p>
            <p className="mt-1 text-xs text-muted-foreground">Soportes exigidos por la legislación laboral colombiana.</p>
          </div>
          <span className={`text-xs ${completos === DOC_SLOTS.length ? "text-emerald-400" : "text-muted-foreground"}`}>
            {completos}/{DOC_SLOTS.length} completos
          </span>
        </header>
        <ul className="divide-y divide-border">
          {DOC_SLOTS.map((slot) => {
            const file = getFile(e.id, slot.key);
            return (
              <li key={slot.key} className="flex items-center gap-3 px-6 py-3.5">
                <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border ${file ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-border bg-background/40 text-muted-foreground"}`}>
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">{slot.label}</p>
                  <p className="truncate text-xs text-muted-foreground">{file ? file.nombre : slot.descripcion}</p>
                </div>
                {file && (
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-500/15 text-emerald-300">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                )}
                <button
                  onClick={() => onPick(slot)}
                  className="inline-flex items-center rounded-md border border-border-strong bg-background/40 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-elevated"
                >
                  {file ? "Reemplazar" : "Cargar"}
                </button>
                {file && (
                  <button
                    onClick={() => { deleteDoc.mutate(file.id); toast.message("Documento eliminado"); }}
                    className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-surface-elevated hover:text-foreground"
                    aria-label="Eliminar documento"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <div className="space-y-6">
        <section className="rounded-2xl border border-border bg-card">
          <header className="border-b border-border px-5 py-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Comprobantes de novedades</p>
            <p className="mt-1 text-xs text-muted-foreground">Soportes cargados desde la pestaña Calendario.</p>
          </header>
          {novedades.length === 0 ? (
            <p className="px-5 py-8 text-center text-xs text-muted-foreground">Sin novedades registradas.</p>
          ) : (
            <ul className="divide-y divide-border">
              {novedades.map((n) => (
                <li key={n.id} className="flex items-center gap-3 px-5 py-3">
                  <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground">{n.descripcion ?? n.tipo}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {n.tipo} · {formatDate(n.fecha)}
                    </p>
                  </div>
                  <StatusBadge tone="muted">{n.tipo}</StatusBadge>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card">
          <header className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Bitácora del trabajador</p>
              <p className="mt-1 text-xs text-muted-foreground">Notas internas del perfil.</p>
            </div>
            {note.trim().length > 0 && <span className="text-[10px] text-muted-foreground">{note.length} car.</span>}
          </header>
          <div className="p-4">
            <textarea
              value={note}
              onChange={(ev) => setNoteLocal(ev.target.value)}
              placeholder="Escribe observaciones, acuerdos verbales, llamados de atención informales, recordatorios…"
              className="min-h-[220px] w-full resize-y rounded-xl border border-border bg-background/40 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none"
            />
          </div>
        </section>
      </div>
    </div>
  );
}
