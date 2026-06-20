import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, Loader2, Pencil, X } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { LegalWarningBanner } from "@/components/common/LegalWarningBanner";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useContratos, useRevisarContrato } from "@/hooks/useContratos";
import { RagChat } from "@/components/rag/RagChat";
import { VariablesCard } from "@/components/contratos/VariablesCard";
import type { BackendContrato } from "@/lib/types";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/revision")({
  head: () => ({ meta: [{ title: "Revisión jurídica · VinApp" }] }),
  component: RevisionPage,
});

type Revision = { decision: "aprobado" | "rechazado"; decididoEn?: string } | null;

function getRevision(c: BackendContrato): Revision {
  const ex = (c.extracted ?? null) as { revision?: Revision } | null;
  return ex?.revision ?? null;
}

function RevisionPage() {
  const { data: contratos = [], isLoading } = useContratos();
  const revisar = useRevisarContrato();
  const enRevision = contratos.filter((c) => c.status === "DONE" && c.extracted != null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [nota, setNota] = useState("");

  // Trabajamos siempre con la versión fresca de la lista (tras aprobar/rechazar).
  const selected = useMemo(
    () => enRevision.find((c) => c.id === selectedId) ?? null,
    [enRevision, selectedId],
  );
  const revision = selected ? getRevision(selected) : null;

  function pick(c: BackendContrato) {
    setSelectedId(c.id);
    setEditing(false);
    setNota("");
  }

  async function decidir(decision: "aprobado" | "rechazado") {
    if (!selected) return;
    if (decision === "rechazado" && !nota.trim()) {
      toast.error("Indica el motivo del rechazo antes de continuar.");
      return;
    }
    try {
      await revisar.mutateAsync({ id: selected.id, decision, nota: nota.trim() || undefined });
      if (decision === "aprobado") {
        toast.success("Aprobado y firmado", { description: "La decisión queda registrada en auditoría." });
      } else {
        toast("Contrato rechazado", { description: "El motivo queda registrado en auditoría." });
      }
      setNota("");
    } catch (e) {
      const msg =
        e instanceof ApiError ? ((e.body as { error?: string })?.error ?? `Error ${e.status}`) : "No se pudo registrar la decisión";
      toast.error("Error al registrar la revisión", { description: msg });
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Human-in-the-loop"
        title="Revisión jurídica"
        description="Revisión jurídica de contratos con detección de riesgos y aprobación humana documentada."
      />

      <div className="mx-auto max-w-[1440px] space-y-6 px-4 pb-16 sm:px-6 lg:px-10">
        <LegalWarningBanner tone="primary">
          Ninguna salida con efecto jurídico es válida sin aprobación humana. Cada decisión queda
          firmada y trazable en auditoría.
        </LegalWarningBanner>

        {isLoading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Cargando contratos…</p>
        ) : enRevision.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card px-6 py-16 text-center">
            <Check className="mx-auto mb-4 h-10 w-10 text-risk-low" />
            <p className="text-sm text-muted-foreground">No hay contratos pendientes de revisión.</p>
          </div>
        ) : (
        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <aside className="space-y-2">
            {enRevision.map((r) => {
              const rev = getRevision(r);
              return (
              <button
                key={r.id}
                onClick={() => pick(r)}
                className={cn(
                  "block w-full rounded-2xl border bg-card p-4 text-left transition",
                  selected?.id === r.id ? "border-primary/60 bg-surface-elevated" : "border-border hover:border-border-strong",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{r.tipoContrato ?? "Contrato"}</p>
                    <p className="mt-1 truncate text-sm text-foreground">{r.fileKey.split("/").pop()}</p>
                  </div>
                  {rev ? (
                    <StatusBadge tone={rev.decision === "aprobado" ? "success" : "warning"}>
                      {rev.decision === "aprobado" ? "Aprobado" : "Rechazado"}
                    </StatusBadge>
                  ) : (
                    <StatusBadge tone="primary">Pendiente</StatusBadge>
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{r.createdAt.slice(0, 10)}</span>
                </div>
              </button>
              );
            })}
          </aside>

          {selected ? (
          <section className="flex h-[calc(100vh-220px)] min-h-[520px] flex-col rounded-2xl border border-border bg-card">
            <header className="border-b border-border p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wider text-primary">{selected.tipoContrato ?? "Contrato"}</p>
                  <h2 className="mt-1 truncate font-display text-2xl text-foreground">{selected.fileKey.split("/").pop()}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Creado el {selected.createdAt.slice(0, 10)}</p>
                </div>
                {revision && (
                  <StatusBadge tone={revision.decision === "aprobado" ? "success" : "warning"}>
                    {revision.decision === "aprobado" ? "Aprobado" : "Rechazado"}
                  </StatusBadge>
                )}
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {editing ? (
                <VariablesCard contrato={selected} />
              ) : (
                <RagChat key={selected.id} contratoId={selected.id} />
              )}
            </div>

            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-4">
              <div className="flex-1 min-w-[200px]">
                <Textarea
                  value={nota}
                  onChange={(ev) => setNota(ev.target.value)}
                  placeholder="Motivo del rechazo u observaciones de la revisión (obligatorio para rechazar)…"
                  className="min-h-[40px] resize-y text-sm"
                  rows={1}
                />
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button
                  variant="ghost"
                  className="text-muted-foreground hover:text-foreground"
                  disabled={revisar.isPending}
                  onClick={() => decidir("rechazado")}
                >
                  <X className="mr-1 h-4 w-4" />Rechazar
                </Button>
                <Button
                  variant="outline"
                  className="rounded-full border-border-strong/60"
                  onClick={() => setEditing((v) => !v)}
                >
                  <Pencil className="mr-1 h-4 w-4" />{editing ? "Ver análisis" : "Editar"}
                </Button>
                <Button
                  className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={revisar.isPending}
                  onClick={() => decidir("aprobado")}
                >
                  {revisar.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />}
                  Aprobar
                </Button>
              </div>
            </footer>
          </section>
          ) : (
            <section className="rounded-2xl border border-border bg-card flex items-center justify-center p-10 text-sm text-muted-foreground">
              Selecciona un contrato para revisar
            </section>
          )}
        </div>
        )}
      </div>
    </div>
  );
}
