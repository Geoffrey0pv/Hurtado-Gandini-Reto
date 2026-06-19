import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { CalendarDays, Check, CheckCheck, RotateCcw, Wallet } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { useEmployees } from "@/lib/store";
import { useObligaciones } from "@/lib/obligaciones-store";
import {
  avisosFrecuencia,
  diasHabilesHasta,
  nivelAviso,
  proximasObligaciones,
  type Frecuencia,
  type NivelAviso,
} from "@/lib/obligaciones";

export const Route = createFileRoute("/_app/obligaciones")({
  head: () => ({ meta: [{ title: "Obligaciones · LaborApp" }] }),
  component: ObligacionesCompaniaPage,
});

type TareaCompania = {
  key: string; // `${tipo}:${fecha}`
  tipo: string;
  fecha: string;
  label: string;
  detalle?: string;
  frecuencia: Frecuencia;
  ids: string[]; // ids por colaborador
  colaboradores: number;
  montoTotal: number;
  conMonto: boolean;
};

function formatCOP(n: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatFecha(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function agrupar(tareas: ReturnType<typeof proximasObligaciones>): Map<string, TareaCompania> {
  const map = new Map<string, TareaCompania>();
  for (const o of tareas) {
    const key = `${o.tipo}:${o.fecha}`;
    const prev = map.get(key);
    if (prev) {
      prev.ids.push(o.id);
      prev.colaboradores += 1;
      if (o.monto != null) {
        prev.montoTotal += o.monto;
        prev.conMonto = true;
      }
    } else {
      map.set(key, {
        key,
        tipo: o.tipo,
        fecha: o.fecha,
        label: o.label,
        detalle: o.detalle,
        frecuencia: o.frecuencia,
        ids: [o.id],
        colaboradores: 1,
        montoTotal: o.monto ?? 0,
        conMonto: o.monto != null,
      });
    }
  }
  return map;
}

function ObligacionesCompaniaPage() {
  const { employees, isLoading } = useEmployees();

  const { mensuales, anuales } = useMemo(() => {
    const activos = employees.filter((e) => e.estadoVinculacion === "activo");
    const todas = activos.flatMap((e) => proximasObligaciones(e, 24));
    const grupos = [...agrupar(todas).values()].sort((a, b) => a.fecha.localeCompare(b.fecha));
    return {
      mensuales: grupos.filter((g) => g.frecuencia === "mensual").slice(0, 12),
      anuales: grupos.filter((g) => g.frecuencia === "anual").slice(0, 16),
    };
  }, [employees]);

  if (!isLoading && employees.length === 0) {
    return (
      <div>
        <PageHeader
          eyebrow="Cumplimiento"
          title="Obligaciones de la compañía"
          description="Marca como completadas las obligaciones recurrentes para todos los colaboradores a la vez."
        />
        <div className="mx-auto max-w-[1440px] px-4 pb-16 sm:px-6 lg:px-10">
          <EmptyState title="Sin colaboradores" description="Aún no hay colaboradores activos para generar obligaciones." />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Cumplimiento"
        title="Obligaciones de la compañía"
        description="Cada tarea recurrente aparece una sola vez. Márcala como completada para todos los colaboradores en un solo clic."
      />

      <div className="mx-auto grid max-w-[1440px] gap-5 px-4 pb-16 sm:px-6 lg:grid-cols-2 lg:px-10">
        <TareaSection
          title="Obligaciones mensuales"
          icon={<CalendarDays className="h-4 w-4" />}
          tareas={mensuales}
          hint="Avisos automáticos 5, 3 y 1 día hábil antes."
        />
        <TareaSection
          title="Obligaciones anuales / periódicas"
          icon={<Wallet className="h-4 w-4" />}
          tareas={anuales}
          hint="Avisos automáticos 30, 15 y 7 días hábiles antes."
        />
      </div>
    </div>
  );
}

function TareaSection({
  title,
  icon,
  tareas,
  hint,
}: {
  title: string;
  icon: React.ReactNode;
  tareas: TareaCompania[];
  hint: string;
}) {
  const { isDone, setManyDone } = useObligaciones();
  const hoy = new Date();

  const hechas = tareas.filter((t) => t.ids.every((id) => isDone(id))).length;

  function completarTodo() {
    const ids = tareas.flatMap((t) => t.ids);
    setManyDone(ids, true);
    toast.success(`${tareas.length} obligaciones marcadas como completadas para toda la compañía.`);
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <header className="mb-1 flex items-center justify-between gap-2 text-foreground">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{icon}</span>
          <h3 className="text-sm font-medium">{title}</h3>
        </div>
        <StatusBadge tone={hechas === tareas.length && tareas.length > 0 ? "success" : "muted"}>
          {hechas}/{tareas.length}
        </StatusBadge>
      </header>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-muted-foreground">{hint}</p>
        {tareas.length > 0 && (
          <button
            type="button"
            onClick={completarTodo}
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/15 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/25"
          >
            <CheckCheck className="h-3.5 w-3.5" /> Completar todas
          </button>
        )}
      </div>

      {tareas.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Sin obligaciones próximas.</p>
      ) : (
        <ul className="space-y-2">
          {tareas.map((t) => {
            const dh = diasHabilesHasta(new Date(t.fecha + "T00:00:00"), hoy);
            const nivel = nivelAviso(dh, t.frecuencia);
            const done = t.ids.every((id) => isDone(id));
            return (
              <TareaRow
                key={t.key}
                tarea={t}
                dh={dh}
                nivel={nivel}
                done={done}
                onToggle={() => setManyDone(t.ids, !done)}
              />
            );
          })}
        </ul>
      )}
    </section>
  );
}

function TareaRow({
  tarea,
  dh,
  nivel,
  done,
  onToggle,
}: {
  tarea: TareaCompania;
  dh: number;
  nivel: NivelAviso;
  done: boolean;
  onToggle: () => void;
}) {
  const tone = nivel === "vencido" || nivel === "urgente" ? "warning" : nivel === "advertencia" ? "primary" : "muted";
  const cuenta = dh < 0 ? `vencido hace ${Math.abs(dh)}d hábiles` : dh === 0 ? "vence hoy" : `en ${dh}d hábiles`;
  const avisos = avisosFrecuencia(tarea.frecuencia);

  return (
    <li
      className={`flex items-start justify-between gap-3 rounded-xl border bg-background/40 px-3 py-3 ${
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
            {tarea.label}
          </p>
          {tarea.detalle && <p className="truncate text-[11px] text-muted-foreground">{tarea.detalle}</p>}
          <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            {tarea.colaboradores} colaborador{tarea.colaboradores === 1 ? "" : "es"} · avisos {avisos.join(" · ")} días hábiles antes
          </p>
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1 whitespace-nowrap">
        <p className="text-xs text-foreground">{formatFecha(tarea.fecha)}</p>
        {tarea.conMonto && <p className="text-[11px] text-muted-foreground">{formatCOP(tarea.montoTotal)}</p>}
        {done ? <StatusBadge tone="success">hecho</StatusBadge> : <StatusBadge tone={tone}>{cuenta}</StatusBadge>}
        <button
          type="button"
          onClick={onToggle}
          className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
        >
          {done ? (
            <>
              <RotateCcw className="h-3 w-3" /> Reabrir
            </>
          ) : (
            <>
              <Check className="h-3 w-3" /> Completar para todos
            </>
          )}
        </button>
      </div>
    </li>
  );
}
