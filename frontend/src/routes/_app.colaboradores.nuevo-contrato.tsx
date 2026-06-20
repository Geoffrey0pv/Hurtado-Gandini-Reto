import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, FileText, Loader2, ShieldCheck, Sparkles, UploadCloud } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ContextualSubnav } from "@/components/layout/ContextualSubnav";
import { LegalWarningBanner } from "@/components/common/LegalWarningBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useCreateColaborador } from "@/hooks/useColaboradores";
import { useUploadContrato, useIngestionJob } from "@/hooks/useContratos";
import { apiGet, apiPatch } from "@/lib/api";
import type { BackendContrato } from "@/lib/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const TIPO_LABEL: Record<string, string> = {
  TERMINO_INDEFINIDO: "Contrato a término indefinido",
  TERMINO_FIJO: "Contrato a término fijo",
  OBRA_LABOR: "Obra o labor",
  PRESTACION_SERVICIOS: "Prestación de servicios",
  APRENDIZAJE: "Contrato de aprendizaje",
  OTRO: "Otrosí",
};

export const Route = createFileRoute("/_app/colaboradores/nuevo-contrato")({
  head: () => ({ meta: [{ title: "Crear desde contrato · VinApp" }] }),
  component: WizardPage,
});

const steps = ["Carga", "Clasificación", "Extracción", "Validación humana"] as const;

type EditableField = {
  key: string;
  label: string;
  value: string;
  confianza: number;
  fragmento: string;
};

function extractionToFields(extracted: Record<string, unknown>): EditableField[] {
  const map: Record<string, string> = {
    tipoContrato: "Tipo de contrato",
    nombreColaborador: "Nombre del colaborador",
    cedula: "Cédula",
    cargo: "Cargo",
    fechaInicio: "Fecha de inicio",
    fechaFin: "Fecha de terminación",
    salario: "Salario (COP)",
    jornadaHorasSemana: "Jornada (h/semana)",
  };
  return Object.entries(map).map(([key, label]) => ({
    key,
    label,
    value: extracted[key] != null ? String(extracted[key]) : "",
    confianza: typeof extracted.confianza === "number" ? Math.round(extracted.confianza * 100) : 50,
    fragmento: "",
  }));
}

function WizardPage() {
  const [step, setStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState("Contrato a término indefinido");
  const [fields, setFields] = useState<EditableField[]>([]);
  const [validated, setValidated] = useState(false);
  const [colaboradorId, setColaboradorId] = useState<string | null>(null);
  const [contratoId, setContratoId] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createColaborador = useCreateColaborador();
  const uploadContrato = useUploadContrato();
  const navigate = useNavigate();

  // Polling the ingestion job
  const { data: jobData } = useIngestionJob(jobId);

  useEffect(() => {
    if (!jobData || !contratoId) return;
    if (jobData.status === "DONE") {
      // Lee el contrato ya procesado y usa la extracción REAL de la IA para
      // poblar los campos de validación humana (no valores fijos).
      let cancelled = false;
      apiGet<BackendContrato>(`/contratos/${contratoId}`)
        .then((contrato) => {
          if (cancelled) return;
          const extracted = (contrato.extracted ?? {}) as Record<string, unknown>;
          setFields(extractionToFields(extracted));
          const tipo = contrato.tipoContrato ?? (extracted.tipoContrato as string | undefined);
          if (tipo && TIPO_LABEL[tipo]) setDocType(TIPO_LABEL[tipo]);
          setStep(1);
        })
        .catch(() => {
          if (cancelled) return;
          toast.error("No se pudo leer la extracción del contrato");
        });
      return () => {
        cancelled = true;
      };
    } else if (jobData.status === "FAILED") {
      toast.error("Error al procesar el contrato", { description: jobData.error ?? undefined });
      setJobId(null);
    }
  }, [jobData, contratoId]);

  async function startProcessing() {
    if (!file) return;
    try {
      // Step 1: Create a placeholder colaborador
      const colab = await createColaborador.mutateAsync({
        nombre: "Por definir",
        cedula: `TEMP-${Date.now()}`,
        origen: "contrato",
      });
      setColaboradorId(colab.id);

      // Step 2: Upload the PDF
      const result = await uploadContrato.mutateAsync({ colaboradorId: colab.id, file });
      setContratoId(result.contratoId);
      setJobId(result.jobId);
      toast.info("Contrato en cola de procesamiento…");
    } catch {
      toast.error("Error al subir el contrato");
    }
  }

  const get = (k: string) => fields.find((f) => f.key === k)?.value ?? "";

  async function commit() {
    if (!colaboradorId) return;
    const num = (v: string) => (v.trim() === "" ? null : Number(v.replace(/[^\d.]/g, "")));
    try {
      // 1) Persistir los datos validados del colaborador.
      await apiPatch(`/colaboradores/${colaboradorId}`, {
        nombre: get("nombreColaborador") || "Colaborador",
        cedula: get("cedula") || `TEMP-${Date.now()}`,
        cargo: get("cargo") || undefined,
        origen: "contrato",
      });
      // 2) Persistir las variables validadas del contrato (corrección humana),
      //    que queda trazada en auditoría (CONTRACT_MANUAL_FIX).
      if (contratoId) {
        await apiPatch(`/contratos/${contratoId}`, {
          tipoContrato: get("tipoContrato") || null,
          nombreColaborador: get("nombreColaborador") || null,
          cedula: get("cedula") || null,
          cargo: get("cargo") || null,
          fechaInicio: get("fechaInicio") || null,
          fechaFin: get("fechaFin") || null,
          salario: num(get("salario")),
          jornadaHorasSemana: num(get("jornadaHorasSemana")),
        });
      }
      toast.success("Perfil creado", { description: "El colaborador fue registrado tras tu validación." });
      navigate({ to: "/colaboradores/$id", params: { id: colaboradorId } });
    } catch {
      toast.error("Error al guardar el colaborador");
    }
  }

  // El colaborador y el contrato ya existen en el backend; "Guardar como
  // borrador" simplemente abre el perfil para continuar después sin marcar la
  // validación humana como completada.
  function saveDraft() {
    if (!colaboradorId) return;
    toast.message("Guardado como borrador", { description: "Puedes retomar la validación desde el perfil." });
    navigate({ to: "/colaboradores/$id", params: { id: colaboradorId } });
  }

  const isProcessing = uploadContrato.isPending || (jobId !== null && jobData?.status !== "DONE" && jobData?.status !== "FAILED");

  return (
    <div>
      <PageHeader
        eyebrow="Nuevo perfil"
        title="Crear colaborador desde contrato"
        description="La IA clasifica y extrae los datos. Tú validas y dejas constancia del registro."
      />
      <ContextualSubnav
        items={steps.map((s, i) => ({ to: "/colaboradores/nuevo-contrato", label: `${i + 1}. ${s}` }))}
      />

      <div className="mx-auto max-w-[1100px] px-4 py-10 sm:px-6 lg:px-10">
        <div className="mb-8 flex items-center gap-3">
          <Progress value={((step + 1) / steps.length) * 100} className="h-1 bg-surface-elevated" />
          <span className="text-xs text-muted-foreground whitespace-nowrap">{step + 1} de {steps.length}</span>
        </div>

        {step === 0 && (
          <div className="space-y-6">
            <LegalWarningBanner>
              La clasificación y extracción son asistidas por IA y requieren validación humana
              antes de generar cualquier registro oficial.
            </LegalWarningBanner>
            {isProcessing ? (
              <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-border bg-card px-6 py-20">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  {uploadContrato.isPending ? "Subiendo contrato…" : `Procesando con IA… estado: ${jobData?.status ?? "PENDING"}`}
                </p>
              </div>
            ) : (
              <label
                className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-border-strong/60 bg-surface/50 px-6 py-16 text-center transition hover:border-primary/50 cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/12 text-primary">
                  <UploadCloud className="h-6 w-6" />
                </span>
                <div>
                  <p className="font-display text-xl text-foreground">Arrastra el contrato aquí</p>
                  <p className="mt-1 text-sm text-muted-foreground">PDF. La IA procesará una copia de trabajo.</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  className="sr-only"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                <Button type="button" variant="outline" className="rounded-full border-border-strong/60">
                  Seleccionar archivo
                </Button>
                {file && (
                  <p className="text-xs text-muted-foreground"><FileText className="mr-1 inline h-3.5 w-3.5" />{file.name}</p>
                )}
              </label>
            )}
            <div className="flex justify-end">
              <Button
                onClick={startProcessing}
                disabled={!file || isProcessing}
                className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Sparkles className="mr-2 h-4 w-4" />Procesar contrato con IA
              </Button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-card p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Clasificación sugerida</p>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
                <h2 className="font-display text-2xl text-foreground">{docType}</h2>
                <StatusBadge tone="success">Extracción completada</StatusBadge>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Basado en cláusulas detectadas. Puedes corregir el tipo si la clasificación no es precisa.
              </p>
              <div className="mt-6 max-w-sm">
                <Label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">Tipo de documento</Label>
                <Select value={docType} onValueChange={setDocType}>
                  <SelectTrigger className="border-border-strong/60 bg-background/40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Contrato a término indefinido","Contrato a término fijo","Obra o labor","Prestación de servicios","Otrosí"].map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <NavButtons step={step} setStep={setStep} />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <LegalWarningBanner>
              Revisa cada campo extraído. Las celdas con baja confianza requieren atención prioritaria.
            </LegalWarningBanner>
            <div className="grid gap-3 md:grid-cols-2">
              {fields.map((f, i) => (
                <FieldEditor key={f.key} field={f} onChange={(v) => setFields((arr) => arr.map((x, j) => (j === i ? { ...x, value: v } : x)))} />
              ))}
            </div>
            <NavButtons step={step} setStep={setStep} />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="font-display text-2xl text-foreground">Perfil preliminar listo para validar</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Confirma los datos clave antes de crear el registro oficial.
              </p>
              <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                {fields.slice(0, 8).map((f) => (
                  <div key={f.key} className="rounded-xl border border-border bg-background/40 p-4">
                    <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{f.label}</dt>
                    <dd className="mt-1 text-sm text-foreground">{f.value}</dd>
                    {f.confianza < 75 && (
                      <span className="mt-2 inline-flex items-center gap-1 text-[11px] text-risk-medium">
                        <ShieldCheck className="h-3 w-3" /> Verifica manualmente · {f.confianza}%
                      </span>
                    )}
                  </div>
                ))}
              </dl>
            </div>

            <label className="flex items-start gap-3 rounded-2xl border border-border bg-surface/40 p-4 text-sm text-foreground cursor-pointer">
              <Checkbox checked={validated} onCheckedChange={(v) => setValidated(Boolean(v))} className="mt-0.5" />
              <span>
                He revisado y valido la información extraída. Asumo la responsabilidad de la creación del registro oficial.
              </span>
            </label>

            <div className="flex flex-wrap justify-end gap-3">
              <Button variant="outline" className="rounded-full border-border-strong/60" onClick={saveDraft}>Guardar como borrador</Button>
              <Button disabled={!validated} onClick={commit} className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
                Crear perfil laboral
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function NavButtons({ step, setStep }: { step: number; setStep: (n: number) => void }) {
  return (
    <div className="flex justify-between">
      <Button variant="ghost" onClick={() => setStep(Math.max(0, step - 1))} className="text-muted-foreground hover:text-foreground">
        <ChevronLeft className="mr-1 h-4 w-4" />Atrás
      </Button>
      <Button onClick={() => setStep(step + 1)} className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
        Continuar<ChevronRight className="ml-1 h-4 w-4" />
      </Button>
    </div>
  );
}

function FieldEditor({ field, onChange }: { field: EditableField; onChange: (v: string) => void }) {
  const tone: "success" | "warning" | "muted" =
    field.confianza >= 85 ? "success" : field.confianza >= 70 ? "warning" : "muted";
  const label = field.confianza >= 85 ? "Alta confianza" : field.confianza >= 70 ? "Media confianza" : "Baja confianza";
  return (
    <div className={cn(
      "rounded-2xl border bg-card p-4 transition",
      field.confianza < 70 ? "border-risk-medium/40" : "border-border",
    )}>
      <div className="flex items-center justify-between">
        <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">{field.label}</Label>
        <StatusBadge tone={tone}>{label} · {field.confianza}%</StatusBadge>
      </div>
      <Input
        value={field.value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 h-10 border-border-strong/40 bg-background/40 text-foreground"
      />
    </div>
  );
}
