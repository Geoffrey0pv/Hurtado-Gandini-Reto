import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuditoria } from "@/hooks/useAuditoria";
import type { BackendAuditLog } from "@/lib/types";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

export const Route = createFileRoute("/_app/auditoria")({
  head: () => ({ meta: [{ title: "Auditoría · VinApp" }] }),
  component: AuditoriaPage,
});

function AuditoriaPage() {
  const [open, setOpen] = useState<BackendAuditLog | null>(null);
  const { data: logs = [], isLoading } = useAuditoria();

  return (
    <div>
      <PageHeader
        eyebrow="Trazabilidad"
        title="Auditoría"
        description="Registro inmutable de acciones humanas y asistidas por IA. Cada entrada es firmada y consultable."
      />
      <div className="mx-auto max-w-[1440px] px-4 pb-16 sm:px-6 lg:px-10">
        {isLoading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Cargando registros…</p>
        ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3 font-medium">Fecha</th>
                <th className="px-5 py-3 font-medium">Acción</th>
                <th className="px-5 py-3 font-medium">Entidad</th>
                <th className="px-5 py-3 font-medium">Modelo IA</th>
                <th className="px-5 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((a) => (
                <tr key={a.id} onClick={() => setOpen(a)} className="cursor-pointer border-b border-border/60 last:border-0 hover:bg-surface-elevated/40">
                  <td className="px-5 py-4 font-mono text-xs text-muted-foreground">{a.createdAt.slice(0, 16).replace("T", " ")}</td>
                  <td className="px-5 py-4 text-foreground">{a.action}</td>
                  <td className="px-5 py-4 text-muted-foreground">{a.entity ?? "—"}</td>
                  <td className="px-5 py-4 text-muted-foreground">{a.aiModel ?? "Regla determinista"}</td>
                  <td className="px-5 py-4"><StatusBadge tone="muted">Registrado</StatusBadge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </div>

      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent className="w-full bg-card sm:max-w-xl">
          <SheetTitle className="sr-only">Detalle de evento</SheetTitle>
          {open && (
            <div>
              <p className="text-[11px] uppercase tracking-wider text-primary">{open.entity ?? "sistema"}</p>
              <h2 className="mt-1 font-display text-2xl text-foreground">{open.action}</h2>
              <p className="mt-1 font-mono text-xs text-muted-foreground">{open.createdAt.slice(0, 16).replace("T", " ")}</p>
              <dl className="mt-6 space-y-3 text-sm">
                <Row k="Entidad ID" v={open.entityId ?? "—"} />
                <Row k="Modelo IA" v={open.aiModel ?? "Regla determinista"} />
              </dl>
              {open.payload != null && (
                <div className="mt-6 rounded-xl border border-border bg-background/40 p-4">
                  <p className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">Payload</p>
                  <pre className="overflow-auto text-xs text-muted-foreground">{JSON.stringify(open.payload, null, 2)}</pre>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{k}</dt><dd className="text-foreground">{v}</dd></div>;
}
