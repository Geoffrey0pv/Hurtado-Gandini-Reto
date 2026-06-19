import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FileText, UploadCloud } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useContratos } from "@/hooks/useContratos";
import type { BackendContrato } from "@/lib/types";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/documentos")({
  head: () => ({ meta: [{ title: "Documentos · LaborApp" }] }),
  component: DocumentosPage,
});

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendiente de extracción",
  PROCESSING: "Procesando",
  DONE: "Pendiente de revisión",
  FAILED: "Error",
};

const filters = ["Todos", "Pendiente de extracción", "Procesando", "Pendiente de revisión", "Error"] as const;

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
        description="Contratos, otrosíes y anexos cargados. La extracción asistida por IA siempre se valida humanamente."
        actions={
          <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"><UploadCloud className="mr-2 h-4 w-4" />Cargar documento</Button>
        }
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
        <SheetContent className="w-full bg-card sm:max-w-xl">
          <SheetTitle className="sr-only">Detalle de documento</SheetTitle>
          {open && (
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-primary">{open.tipoContrato ?? "Contrato"}</p>
              <h2 className="mt-2 font-display text-2xl text-foreground">{open.fileKey.split("/").pop()}</h2>
              <p className="mt-1 text-xs text-muted-foreground">Cargado el {open.createdAt.slice(0, 10)}</p>
              {open.extracted != null && (
                <div className="mt-6">
                  <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Datos extraídos</p>
                  <pre className="overflow-auto rounded-xl border border-border bg-background/40 p-3 text-xs text-muted-foreground">{JSON.stringify(open.extracted, null, 2)}</pre>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
