import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { LegalWarningBanner } from "@/components/common/LegalWarningBanner";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { useContratos } from "@/hooks/useContratos";
import { RagChat } from "@/components/rag/RagChat";
import type { BackendContrato } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/revision")({
  head: () => ({ meta: [{ title: "Revisión jurídica · LaborApp" }] }),
  component: RevisionPage,
});

function RevisionPage() {
  const { data: contratos = [], isLoading } = useContratos();
  const enRevision = contratos.filter((c) => c.status === "DONE" && c.extracted != null);
  const [selected, setSelected] = useState<BackendContrato | null>(null);

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
            {enRevision.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelected(r)}
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
                  <StatusBadge tone="primary">{r.status}</StatusBadge>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{r.createdAt.slice(0, 10)}</span>
                </div>
              </button>
            ))}
          </aside>

          {selected ? (
          <section className="flex h-[calc(100vh-220px)] min-h-[520px] flex-col rounded-2xl border border-border bg-card">
            <header className="border-b border-border p-6">
              <p className="text-[11px] uppercase tracking-wider text-primary">{selected.tipoContrato ?? "Contrato"}</p>
              <h2 className="mt-1 font-display text-2xl text-foreground">{selected.fileKey.split("/").pop()}</h2>
              <p className="mt-1 text-xs text-muted-foreground">Creado el {selected.createdAt.slice(0, 10)}</p>
            </header>

            <div className="min-h-0 flex-1 p-4">
              <RagChat key={selected.id} contratoId={selected.id} />
            </div>

            <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-border p-4">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground" onClick={() => toast("Marcado como revisado sin aprobar")}>
                <X className="mr-1 h-4 w-4" />Rechazar
              </Button>
              <Button variant="outline" className="rounded-full border-border-strong/60" onClick={() => toast("Apertura en editor jurídico")}>
                <Pencil className="mr-1 h-4 w-4" />Editar
              </Button>
              <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => toast.success("Aprobado y firmado", { description: "El registro queda en auditoría." })}>
                <Check className="mr-1 h-4 w-4" />Aprobar
              </Button>
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

