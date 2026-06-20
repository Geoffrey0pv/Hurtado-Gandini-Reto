// VariablesCard — Variables extraídas de un contrato, con edición manual.
// Lectura: muestra los campos extraídos. Edición: PATCH /contratos/:id para
// corregir lo que la IA extrajo mal (post-update). Reutilizable en Documentos y
// en el perfil del colaborador. Trae su propia URL prefirmada de MinIO.
import { useState } from "react";
import { Check, ExternalLink, Loader2, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ApiError } from "@/lib/api";
import { useContrato, useUpdateContrato } from "@/hooks/useContratos";
import type { BackendContrato } from "@/lib/types";

export const TIPO_LABEL: Record<string, string> = {
  TERMINO_FIJO: "Término fijo",
  TERMINO_INDEFINIDO: "Término indefinido",
  OBRA_LABOR: "Obra o labor",
  PRESTACION_SERVICIOS: "Prestación de servicios",
  APRENDIZAJE: "Aprendizaje",
  OTRO: "Otro",
};

interface ExtractedData {
  tipoContrato?: string | null;
  nombreColaborador?: string | null;
  cedula?: string | null;
  cargo?: string | null;
  fechaInicio?: string | null;
  fechaFin?: string | null;
  salario?: number | null;
  jornadaHorasSemana?: number | null;
  confianza?: number | null;
}

function formatCOP(n: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);
}

function DataField({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-xl border border-border bg-background/40 px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={value ? "mt-0.5 text-sm text-foreground" : "mt-0.5 text-sm text-muted-foreground/60"}>
        {value ?? "No detectado"}
      </p>
    </div>
  );
}

function EditField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

export function VariablesCard({ contrato }: { contrato: BackendContrato }) {
  // Detalle con la URL prefirmada de MinIO (cacheada por React Query).
  const { data: detail } = useContrato(contrato.id);
  const c = detail ?? contrato;
  const fileUrl = detail?.fileUrl ?? null;

  const ex = (c.extracted ?? {}) as ExtractedData;
  const salarioNum = c.salario != null ? Number(c.salario) : ex.salario ?? null;
  const jornada = c.jornadaHorasSemana ?? ex.jornadaHorasSemana ?? null;
  const confianza = typeof ex.confianza === "number" ? Math.round(ex.confianza * 100) : null;
  const tipo = c.tipoContrato ?? (typeof ex.tipoContrato === "string" ? ex.tipoContrato : null);

  const update = useUpdateContrato();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(blank);

  function blank() {
    return {
      tipoContrato: tipo ?? "",
      nombreColaborador: ex.nombreColaborador ?? "",
      cedula: ex.cedula ?? "",
      cargo: ex.cargo ?? "",
      fechaInicio: c.fechaInicio ?? ex.fechaInicio ?? "",
      fechaFin: c.fechaFin ?? ex.fechaFin ?? "",
      salario: salarioNum != null ? String(salarioNum) : "",
      jornadaHorasSemana: jornada != null ? String(jornada) : "",
    };
  }
  function setF(k: keyof ReturnType<typeof blank>, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save() {
    const s = (v: string) => (v.trim() === "" ? null : v.trim());
    const n = (v: string) => (v.trim() === "" ? null : Number(v));
    try {
      await update.mutateAsync({
        id: c.id,
        data: {
          tipoContrato: form.tipoContrato || null,
          nombreColaborador: s(form.nombreColaborador),
          cedula: s(form.cedula),
          cargo: s(form.cargo),
          fechaInicio: s(form.fechaInicio),
          fechaFin: s(form.fechaFin),
          salario: n(form.salario),
          jornadaHorasSemana: n(form.jornadaHorasSemana),
        },
      });
      toast.success("Variables actualizadas", { description: "El contrato se actualizó y queda en auditoría." });
      setEditing(false);
    } catch (e) {
      const msg =
        e instanceof ApiError ? ((e.body as { error?: string })?.error ?? `Error ${e.status}`) : "No se pudo actualizar";
      toast.error("Error al guardar", { description: msg });
    }
  }

  const yaExtraido = c.status === "DONE" || c.extracted != null;
  const campos: { label: string; value: string | null }[] = [
    { label: "Tipo de contrato", value: tipo ? TIPO_LABEL[tipo] ?? tipo : null },
    { label: "Colaborador", value: ex.nombreColaborador ?? null },
    { label: "Cédula", value: ex.cedula ?? null },
    { label: "Cargo", value: ex.cargo ?? null },
    { label: "Fecha de inicio", value: c.fechaInicio ?? ex.fechaInicio ?? null },
    { label: "Fecha de terminación", value: c.fechaFin ?? ex.fechaFin ?? null },
    { label: "Salario", value: salarioNum != null ? formatCOP(salarioNum) : null },
    { label: "Jornada", value: jornada != null ? `${jornada} h/semana` : null },
  ];

  return (
    <section className="rounded-2xl border border-border bg-card/60 p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-base text-foreground">Variables extraídas</h3>
        <div className="flex items-center gap-2">
          {!editing && confianza != null && (
            <StatusBadge tone={confianza >= 75 ? "success" : confianza >= 50 ? "warning" : "muted"}>
              Confianza IA {confianza}%
            </StatusBadge>
          )}
          {yaExtraido && !editing && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 rounded-full text-xs text-muted-foreground hover:text-foreground"
              onClick={() => {
                setForm(blank());
                setEditing(true);
              }}
            >
              <Pencil className="mr-1 h-3.5 w-3.5" />Editar
            </Button>
          )}
        </div>
      </div>

      {editing ? (
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <EditField label="Tipo de contrato">
              <Select value={form.tipoContrato} onValueChange={(v) => setF("tipoContrato", v)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TIPO_LABEL).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </EditField>
            <EditField label="Colaborador">
              <Input value={form.nombreColaborador} onChange={(e) => setF("nombreColaborador", e.target.value)} />
            </EditField>
            <EditField label="Cédula">
              <Input value={form.cedula} onChange={(e) => setF("cedula", e.target.value)} />
            </EditField>
            <EditField label="Cargo">
              <Input value={form.cargo} onChange={(e) => setF("cargo", e.target.value)} />
            </EditField>
            <EditField label="Fecha de inicio">
              <Input type="date" value={form.fechaInicio} onChange={(e) => setF("fechaInicio", e.target.value)} />
            </EditField>
            <EditField label="Fecha de terminación">
              <Input type="date" value={form.fechaFin} onChange={(e) => setF("fechaFin", e.target.value)} />
            </EditField>
            <EditField label="Salario (COP)">
              <Input type="number" min={0} value={form.salario} onChange={(e) => setF("salario", e.target.value)} />
            </EditField>
            <EditField label="Jornada (h/semana)">
              <Input type="number" min={0} value={form.jornadaHorasSemana} onChange={(e) => setF("jornadaHorasSemana", e.target.value)} />
            </EditField>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" disabled={update.isPending} onClick={() => setEditing(false)}>
              <X className="mr-1 h-4 w-4" />Cancelar
            </Button>
            <Button
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={update.isPending}
              onClick={save}
            >
              {update.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />}
              Guardar
            </Button>
          </div>
        </div>
      ) : yaExtraido ? (
        <>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {campos.map((f) => (
              <DataField key={f.label} label={f.label} value={f.value} />
            ))}
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Requieren validación humana antes de tener efectos jurídicos. Usa “Editar” si algo se extrajo mal.
          </p>
        </>
      ) : (
        <p className="mt-3 rounded-xl border border-border bg-background/40 p-4 text-sm text-muted-foreground">
          {c.status === "FAILED"
            ? "La extracción del documento falló; no hay variables disponibles."
            : "El documento sigue en procesamiento. Las variables aparecerán al terminar la extracción."}
        </p>
      )}

      {/* Visor del archivo en MinIO */}
      <div className="mt-4">
        {fileUrl ? (
          <a href={fileUrl} target="_blank" rel="noreferrer">
            <Button variant="outline" className="w-full rounded-full">
              <ExternalLink className="mr-2 h-4 w-4" />Ver archivo (PDF)
            </Button>
          </a>
        ) : (
          <Button variant="outline" className="w-full rounded-full" disabled>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />Generando enlace…
          </Button>
        )}
      </div>
    </section>
  );
}
