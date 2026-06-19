import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { LegalWarningBanner } from "@/components/common/LegalWarningBanner";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { reviewSeed, type ReviewItem } from "@/lib/mock/data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/revision")({
  head: () => ({ meta: [{ title: "Revisión jurídica · LaborApp" }] }),
  component: RevisionPage,
});

function RevisionPage() {
  const [selected, setSelected] = useState<ReviewItem>(reviewSeed[0]);

  return (
    <div>
      <PageHeader
        eyebrow="Human-in-the-loop"
        title="Revisión jurídica"
        description="Cola de salidas asistidas por IA pendientes de aprobación humana documentada."
      />

      <div className="mx-auto max-w-[1440px] space-y-6 px-4 pb-16 sm:px-6 lg:px-10">
        <LegalWarningBanner tone="primary">
          Ninguna salida con efecto jurídico es válida sin aprobación humana. Cada decisión queda
          firmada y trazable en auditoría.
        </LegalWarningBanner>

        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <aside className="space-y-2">
            {reviewSeed.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelected(r)}
                className={cn(
                  "block w-full rounded-2xl border bg-card p-4 text-left transition",
                  selected.id === r.id ? "border-primary/60 bg-surface-elevated" : "border-border hover:border-border-strong",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{r.tipo}</p>
                    <p className="mt-1 truncate text-sm text-foreground">{r.empleado}</p>
                  </div>
                  <StatusBadge tone={r.estado === "En cola" ? "warning" : "primary"}>{r.estado}</StatusBadge>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{r.fecha}</span>
                  <span>Confianza {r.confianza}%</span>
                </div>
              </button>
            ))}
          </aside>

          <section className="rounded-2xl border border-border bg-card">
            <header className="border-b border-border p-6">
              <p className="text-[11px] uppercase tracking-wider text-primary">{selected.tipo}</p>
              <h2 className="mt-1 font-display text-2xl text-foreground">{selected.empleado}</h2>
              <p className="mt-1 text-xs text-muted-foreground">Generado el {selected.fecha} · Confianza {selected.confianza}%</p>
            </header>

            <div className="grid gap-4 p-6 md:grid-cols-2">
              <Pane title="Sugerencia IA" tone="muted">
                <p className="text-sm leading-relaxed text-foreground">{selected.resumenIA}</p>
                <div className="mt-4">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Fuentes citadas</p>
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {selected.fuentes.map((f) => (<li key={f}>· {f}</li>))}
                  </ul>
                </div>
              </Pane>
              <Pane title="Versión aprobada por abogado" tone="primary">
                <p className="text-sm leading-relaxed text-foreground">
                  Aquí el abogado revisa, edita y firma la versión final. La aprobación es lo único
                  que produce efectos jurídicos sobre el caso.
                </p>
                <div className="mt-4 rounded-xl border border-dashed border-border-strong/60 bg-background/40 p-3 text-xs text-muted-foreground">
                  Pendiente de aprobación por M. Villamil
                </div>
              </Pane>
            </div>

            <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-border p-6">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground" onClick={() => toast("Rechazado")}>
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
        </div>
      </div>
    </div>
  );
}

function Pane({ title, tone, children }: { title: string; tone: "muted" | "primary"; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-2xl border p-5",
      tone === "primary" ? "border-primary/30 bg-primary/8" : "border-border bg-background/40")}>
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{title}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}
