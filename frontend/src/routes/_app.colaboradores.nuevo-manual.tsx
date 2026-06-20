import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, UserPlus } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateColaborador } from "@/hooks/useColaboradores";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/colaboradores/nuevo-manual")({
  head: () => ({ meta: [{ title: "Nuevo colaborador · VinApp" }] }),
  component: NuevoColaborador,
});

// Creación mínima: solo datos personales. El resto (contrato, salario, jornada,
// cargo, área, fueros…) se completa en el perfil, manualmente o extrayéndolo de
// un contrato cargado.
function NuevoColaborador() {
  const [data, setData] = useState({ nombre: "", cedula: "", correo: "", telefono: "" });
  const createColaborador = useCreateColaborador();
  const navigate = useNavigate();

  function set<K extends keyof typeof data>(k: K, v: string) {
    setData((d) => ({ ...d, [k]: v }));
  }

  const valido = data.nombre.trim().length > 0 && data.cedula.trim().length > 0;

  async function commit() {
    if (!valido) {
      toast.error("Nombre y cédula son obligatorios");
      return;
    }
    try {
      const row = await createColaborador.mutateAsync({
        nombre: data.nombre.trim(),
        cedula: data.cedula.trim(),
        email: data.correo.trim() || undefined,
        telefono: data.telefono.trim() || undefined,
        origen: "manual",
      });
      toast.success("Colaborador creado", {
        description: "Completa el contrato y los demás datos en su perfil.",
      });
      navigate({ to: "/colaboradores/$id", params: { id: row.id } });
    } catch {
      toast.error("Error al crear el colaborador");
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Nuevo perfil"
        title="Crear colaborador"
        description="Registra los datos personales. El contrato y el resto de la información se completan en el perfil."
      />

      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-10">
        <div className="rounded-3xl border border-border bg-card p-8">
          <h2 className="font-display text-2xl text-foreground">Datos personales</h2>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <Field label="Nombre completo">
              <Input value={data.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Nombre y apellidos" />
            </Field>
            <Field label="Cédula">
              <Input value={data.cedula} onChange={(e) => set("cedula", e.target.value)} placeholder="Solo dígitos" />
            </Field>
            <Field label="Correo">
              <Input type="email" value={data.correo} onChange={(e) => set("correo", e.target.value)} />
            </Field>
            <Field label="Teléfono">
              <Input value={data.telefono} onChange={(e) => set("telefono", e.target.value)} />
            </Field>
          </div>

          <p className="mt-5 text-xs text-muted-foreground">
            Luego, en el perfil, podrás cargar el contrato (los datos se extraen automáticamente) o
            completarlos a mano.
          </p>

          <div className="mt-8 flex justify-end">
            <Button
              onClick={commit}
              disabled={!valido || createColaborador.isPending}
              className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {createColaborador.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creando…</>
              ) : (
                <><UserPlus className="mr-2 h-4 w-4" />Crear colaborador</>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
