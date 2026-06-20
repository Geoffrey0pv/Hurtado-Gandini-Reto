import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, ExternalLink, FileText, Loader2, Pencil, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/common/StatusBadge";
import { RagChat } from "@/components/rag/RagChat";
import { ApiError } from "@/lib/api";
import {
  useContrato,
  useContratos,
  useIngestionJob,
  useUpdateContrato,
  useUploadContrato,
} from "@/hooks/useContratos";
import { useColaboradores } from "@/hooks/useColaboradores";
import type { BackendContrato } from "@/lib/types";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/documentos")({
  head: () => ({ meta: [{ title: "Documentos · VinApp" }] }),
  component: DocumentosPage,
});

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendiente de extracción",
  PROCESSING: "Procesando",
  DONE: "Pendiente de revisión",
  FAILED: "Error",
};

const filters = ["Todos", "Pendiente de extracción", "Procesando", "Pendiente de revisión", "Error"] as const;

// ── Diálogo de carga: sube un PDF de contrato al pipeline de ingestión ──────
// POST /contratos/upload (multipart: colaboradorId + file) → 202 { jobId } →
// se hace polling de GET /contratos/job/:id hasta DONE/FAILED.
function UploadDocumentoDialog() {
  const [open, setOpen] = useState(false);
  const [colaboradorId, setColaboradorId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [complex, setComplex] = useState(false); // false=Llama 3, true=Qwen 2.5

  const { data: colaboradores = [], isLoading: loadingColab } = useColaboradores();
  const upload = useUploadContrato();
  const job = useIngestionJob(jobId);

  // Reacciona al resultado del job (polling cada 2s en el hook).
  useEffect(() => {
    const status = job.data?.status;
    if (!status) return;
    if (status === "DONE") {
      toast.success("Documento procesado", {
        description: "La extracción terminó. El contrato queda pendiente de revisión.",
      });
      close();
    } else if (status === "FAILED") {
      toast.error("Falló el procesamiento", {
        description: job.data?.error ?? "Revisa el archivo e inténtalo de nuevo.",
      });
      setJobId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job.data?.status]);

  function reset() {
    setColaboradorId("");
    setFile(null);
    setJobId(null);
    setComplex(false);
    upload.reset();
  }

  function close() {
    setOpen(false);
    setTimeout(reset, 200); // espera al cierre animado del diálogo
  }

  async function handleSubmit() {
    if (!colaboradorId) {
      toast.error("Selecciona un colaborador");
      return;
    }
    if (!file) {
      toast.error("Selecciona un archivo PDF");
      return;
    }
    if (file.type !== "application/pdf") {
      toast.error("Solo se aceptan archivos PDF");
      return;
    }
    try {
      const res = await upload.mutateAsync({ colaboradorId, file, complex });
      setJobId(res.jobId);
      toast.message("Subida iniciada", {
        description: "Procesando el documento en segundo plano…",
      });
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? ((e.body as { error?: string })?.error ?? `Error ${e.status}`)
          : "Error inesperado al subir";
      toast.error("No se pudo subir", { description: msg });
    }
  }

  const jobStatus = jobId ? job.data?.status : undefined;
  const processing =
    upload.isPending || (jobId != null && jobStatus !== "DONE" && jobStatus !== "FAILED");

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (processing) return; // no cerrar mientras procesa
        if (o) setOpen(true);
        else close();
      }}
    >
      <DialogTrigger asChild>
        <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
          <UploadCloud className="mr-2 h-4 w-4" />Cargar documento
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cargar documento</DialogTitle>
          <DialogDescription>
            Sube el PDF del contrato. Se extraerán los datos y quedarán pendientes de
            revisión humana.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="colaborador">Colaborador</Label>
            <Select value={colaboradorId} onValueChange={setColaboradorId} disabled={processing}>
              <SelectTrigger id="colaborador" className="w-full">
                <SelectValue
                  placeholder={loadingColab ? "Cargando colaboradores…" : "Selecciona un colaborador"}
                />
              </SelectTrigger>
              <SelectContent>
                {colaboradores.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nombre} — {c.cedula}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!loadingColab && colaboradores.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No hay colaboradores. Crea uno antes de cargar un contrato.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="modelo">Modelo de extracción</Label>
            <Select
              value={complex ? "avanzado" : "estandar"}
              onValueChange={(v) => setComplex(v === "avanzado")}
              disabled={processing}
            >
              <SelectTrigger id="modelo" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="estandar">Estándar (Llama 3) — rápido</SelectItem>
                <SelectItem value="avanzado">Avanzado (Qwen 2.5) — contratos complejos</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {complex
                ? "Más preciso en contratos largos o difíciles; tarda más."
                : "Rápido para contratos sencillos. Usa Avanzado si el documento es complejo."}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="file">Archivo PDF</Label>
            <input
              id="file"
              type="file"
              accept="application/pdf"
              disabled={processing}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full cursor-pointer rounded-lg border border-border bg-background/40 text-sm text-muted-foreground file:mr-3 file:cursor-pointer file:border-0 file:bg-primary/15 file:px-4 file:py-2 file:text-sm file:text-foreground hover:file:bg-primary/25"
            />
          </div>

          {jobId && jobStatus && (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-background/40 px-3 py-2 text-sm">
              {jobStatus !== "DONE" && jobStatus !== "FAILED" && (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              )}
              <span className="text-muted-foreground">
                Estado: {STATUS_LABEL[jobStatus] ?? jobStatus}
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={close} disabled={processing}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={processing || !colaboradorId || !file}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {processing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />Procesando…
              </>
            ) : (
              <>
                <UploadCloud className="mr-2 h-4 w-4" />Subir
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Detalle del documento: tarjeta con datos extraídos + visor del PDF ──────
const TIPO_LABEL: Record<string, string> = {
  TERMINO_FIJO: "Término fijo",
  TERMINO_INDEFINIDO: "Término indefinido",
  OBRA_LABOR: "Obra o labor",
  PRESTACION_SERVICIOS: "Prestación de servicios",
  APRENDIZAJE: "Aprendizaje",
  OTRO: "Otro",
};

function formatCOP(n: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);
}

// Forma del JSON `extracted` que el pipeline guarda en la BD (ExtractionSchema).
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

function DataField({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-xl border border-border bg-background/40 px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("mt-0.5 text-sm", value ? "text-foreground" : "text-muted-foreground/60")}>
        {value ?? "No detectado"}
      </p>
    </div>
  );
}

// Tarjeta de variables extraídas con edición manual (post-update del contrato).
function VariablesCard({ contrato, fileUrl }: { contrato: BackendContrato; fileUrl: string | null }) {
  const c = contrato;
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

function EditField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function DocumentoDetail({ contrato }: { contrato: BackendContrato }) {
  // Trae el detalle con la URL prefirmada de MinIO (se genera bajo demanda).
  const { data: detail } = useContrato(contrato.id);
  const c = detail ?? contrato;
  const fileUrl = detail?.fileUrl ?? null;
  const fileName = c.fileKey.split("/").pop();
  const tipo = c.tipoContrato;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Encabezado del documento */}
      <div className="shrink-0">
        <p className="text-[11px] uppercase tracking-[0.22em] text-primary">
          {tipo ? TIPO_LABEL[tipo] ?? tipo : "Contrato"}
        </p>
        <h2 className="mt-2 break-all font-display text-2xl text-foreground">{fileName}</h2>
        <p className="mt-1 text-xs text-muted-foreground">Cargado el {c.createdAt.slice(0, 10)}</p>
      </div>

      {/* Zona desplazable: tarjeta de variables extraídas + chat de revisión */}
      <div className="mt-4 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1">
        {/* Tarjeta del contrato con las variables extraídas (editable) */}
        <VariablesCard contrato={c} fileUrl={fileUrl} />

        {/* Revisión jurídica conversacional (RAG) */}
        <div className="flex min-h-[320px] flex-1 flex-col">
          <h3 className="mb-2 shrink-0 font-display text-base text-foreground">Revisión jurídica</h3>
          {c.status === "DONE" ? (
            <RagChat contratoId={c.id} />
          ) : (
            <p className="rounded-xl border border-border bg-background/40 p-4 text-sm text-muted-foreground">
              {c.status === "FAILED"
                ? "El procesamiento del documento falló; no es posible revisarlo."
                : "El documento sigue en procesamiento. La revisión jurídica estará disponible al terminar."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function DocumentosPage() {
  const { data: contratos = [], isLoading } = useContratos();
  const [filter, setFilter] = useState<(typeof filters)[number]>("Todos");
  const [open, setOpen] = useState<BackendContrato | null>(null);

  const list = contratos.filter((d) => {
    if (filter === "Todos") return true;
    return STATUS_LABEL[d.status] === filter;
  });

  return (
    <div>
      <PageHeader
        eyebrow="Documentación"
        title="Documentos"
        description="Contratos, otrosíes y anexos cargados. Toda extracción se valida humanamente antes de tener efectos jurídicos."
        actions={<UploadDocumentoDialog />}
      />

      <div className="mx-auto max-w-[1440px] px-4 pb-16 sm:px-6 lg:px-10">
        <div className="mb-4 flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs transition",
                filter === f
                  ? "border-primary/60 bg-primary/12 text-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >{f}</button>
          ))}
        </div>

        {isLoading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Cargando contratos…</p>
        ) : list.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card px-6 py-16 text-center">
            <FileText className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No hay documentos con ese filtro.</p>
          </div>
        ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3 font-medium">Documento</th>
                <th className="px-5 py-3 font-medium">Tipo</th>
                <th className="px-5 py-3 font-medium">Carga</th>
                <th className="px-5 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {list.map((d) => (
                <tr key={d.id} onClick={() => setOpen(d)} className="cursor-pointer border-b border-border/60 last:border-0 hover:bg-surface-elevated/40">
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-2 text-foreground"><FileText className="h-4 w-4 text-muted-foreground" />{d.fileKey.split("/").pop()}</span>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">{d.tipoContrato ?? "Contrato"}</td>
                  <td className="px-5 py-4 text-muted-foreground">{d.createdAt.slice(0, 10)}</td>
                  <td className="px-5 py-4">
                    <StatusBadge tone={d.status === "DONE" ? "success" : d.status === "FAILED" ? "muted" : "warning"}>{STATUS_LABEL[d.status]}</StatusBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </div>

      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent className="flex w-full flex-col bg-card sm:max-w-xl">
          <SheetTitle className="sr-only">Detalle de documento</SheetTitle>
          {open && <DocumentoDetail contrato={open} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}
