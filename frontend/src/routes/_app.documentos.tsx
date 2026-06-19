import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FileText, UploadCloud } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";
import { documentsSeed, type DocumentItem, sampleExtraction } from "@/lib/mock/data";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/documentos")({
  head: () => ({ meta: [{ title: "Documentos · LaborApp" }] }),
  component: DocumentosPage,
});

const filters = ["Todos", "Pendiente de extracción", "Pendiente de revisión", "Aprobado", "Rechazado"] as const;

function DocumentosPage() {
  const [filter, setFilter] = useState<(typeof filters)[number]>("Todos");
  const [open, setOpen] = useState<DocumentItem | null>(null);
  const list = documentsSeed.filter((d) => filter === "Todos" || d.estado === filter);

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

        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3 font-medium">Documento</th>
                <th className="px-5 py-3 font-medium">Tipo</th>
                <th className="px-5 py-3 font-medium">Colaborador</th>
                <th className="px-5 py-3 font-medium">Carga</th>
                <th className="px-5 py-3 font-medium">Confianza IA</th>
                <th className="px-5 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {list.map((d) => (
                <tr key={d.id} onClick={() => setOpen(d)} className="cursor-pointer border-b border-border/60 last:border-0 hover:bg-surface-elevated/40">
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-2 text-foreground"><FileText className="h-4 w-4 text-muted-foreground" />{d.nombre}</span>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">{d.tipo}</td>
                  <td className="px-5 py-4 text-foreground">{d.empleado}</td>
                  <td className="px-5 py-4 text-muted-foreground">{d.fechaCarga}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-elevated">
                        <span className="block h-full bg-primary" style={{ width: `${d.confianza}%` }} />
                      </span>
                      <span className="text-xs text-muted-foreground">{d.confianza}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge tone={d.estado === "Aprobado" ? "success" : d.estado === "Rechazado" ? "muted" : "warning"}>{d.estado}</StatusBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent className="w-full bg-card sm:max-w-xl">
          <SheetTitle className="sr-only">Detalle de documento</SheetTitle>
          {open && (
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-primary">{open.tipo}</p>
              <h2 className="mt-2 font-display text-2xl text-foreground">{open.nombre}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{open.empleado} · Carga {open.fechaCarga}</p>
              <div className="mt-6 space-y-3">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Campos extraídos por IA</p>
                {sampleExtraction.slice(0, 6).map((f) => (
                  <div key={f.key} className="rounded-xl border border-border bg-background/40 p-3 text-sm">
                    <div className="flex items-center justify-between"><span className="text-muted-foreground">{f.label}</span><span className="text-xs text-muted-foreground">{f.confianza}%</span></div>
                    <p className="mt-1 text-foreground">{f.value}</p>
                    <p className="mt-1 text-xs italic text-muted-foreground">{f.fragmento}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
