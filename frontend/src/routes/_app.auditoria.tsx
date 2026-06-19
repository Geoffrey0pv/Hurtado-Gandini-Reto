import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { auditSeed, type AuditEvent } from "@/lib/mock/data";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

export const Route = createFileRoute("/_app/auditoria")({
  head: () => ({ meta: [{ title: "Auditoría · LaborApp" }] }),
  component: AuditoriaPage,
});

function AuditoriaPage() {
  const [open, setOpen] = useState<AuditEvent | null>(null);
  return (
    <div>
      <PageHeader
        eyebrow="Trazabilidad"
        title="Auditoría"
        description="Registro inmutable de acciones humanas y asistidas por IA. Cada entrada es firmada y consultable."
      />
      <div className="mx-auto max-w-[1440px] px-4 pb-16 sm:px-6 lg:px-10">
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3 font-medium">Fecha</th>
                <th className="px-5 py-3 font-medium">Usuario</th>
                <th className="px-5 py-3 font-medium">Rol</th>
                <th className="px-5 py-3 font-medium">Acción</th>
                <th className="px-5 py-3 font-medium">Módulo</th>
                <th className="px-5 py-3 font-medium">Colaborador</th>
                <th className="px-5 py-3 font-medium">Modelo IA</th>
                <th className="px-5 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {auditSeed.map((a) => (
                <tr key={a.id} onClick={() => setOpen(a)} className="cursor-pointer border-b border-border/60 last:border-0 hover:bg-surface-elevated/40">
                  <td className="px-5 py-4 font-mono text-xs text-muted-foreground">{a.fecha}</td>
                  <td className="px-5 py-4 text-foreground">{a.usuario}</td>
                  <td className="px-5 py-4 text-muted-foreground">{a.rol}</td>
                  <td className="px-5 py-4 text-foreground">{a.accion}</td>
                  <td className="px-5 py-4 text-muted-foreground">{a.modulo}</td>
                  <td className="px-5 py-4 text-muted-foreground">{a.empleado ?? "—"}</td>
                  <td className="px-5 py-4 text-muted-foreground">{a.modelo} {a.version !== "—" && a.version}</td>
                  <td className="px-5 py-4"><StatusBadge tone={a.estado === "Aprobado" ? "success" : a.estado === "Rechazado" ? "muted" : "muted"}>{a.estado}</StatusBadge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent className="w-full bg-card sm:max-w-xl">
          <SheetTitle className="sr-only">Detalle de evento</SheetTitle>
          {open && (
            <div>
              <p className="text-[11px] uppercase tracking-wider text-primary">{open.modulo}</p>
              <h2 className="mt-1 font-display text-2xl text-foreground">{open.accion}</h2>
              <p className="mt-1 font-mono text-xs text-muted-foreground">{open.fecha}</p>
              <dl className="mt-6 space-y-3 text-sm">
                <Row k="Usuario" v={`${open.usuario} · ${open.rol}`} />
                <Row k="Colaborador" v={open.empleado ?? "—"} />
                <Row k="Fuente" v={open.fuente} />
                <Row k="Modelo IA" v={`${open.modelo} ${open.version}`} />
              </dl>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-background/40 p-4">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Sugerencia IA</p>
                  <p className="mt-2 text-sm text-foreground">Borrador generado por modelo {open.modelo}. Disponible en historial.</p>
                </div>
                <div className="rounded-xl border border-primary/30 bg-primary/8 p-4">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Versión aprobada</p>
                  <p className="mt-2 text-sm text-foreground">Aprobada y firmada por {open.usuario}.</p>
                </div>
              </div>
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
