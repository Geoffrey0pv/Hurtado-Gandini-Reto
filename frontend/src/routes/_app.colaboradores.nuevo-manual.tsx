import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, ChevronLeft, ChevronRight, ChevronsUpDown, ShieldCheck, UserPlus } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ContextualSubnav } from "@/components/layout/ContextualSubnav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { fuerosOptions } from "@/lib/mock/data";
import { useAreas } from "@/hooks/useAreas";
import { useColaboradores, useCreateColaborador } from "@/hooks/useColaboradores";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/colaboradores/nuevo-manual")({
  head: () => ({ meta: [{ title: "Crear manualmente · VinApp" }] }),
  component: ManualWizard,
});

const sections = [
  "Datos personales",
  "Datos contractuales",
  "Cargo y área",
  "Jefatura y organigrama",
  "Salario y jornada",
  "Obligaciones",
  "Fueros y protección",
  "Confirmación",
] as const;

function ManualWizard() {
  const [step, setStep] = useState(0);
  const { data: areasData = [] } = useAreas();
  const { data: colaboradoresData = [] } = useColaboradores();
  const areaNames = areasData.map((a) => a.nombre);
  const firstArea = areaNames[0] ?? "";
  const [data, setData] = useState({
    nombre: "", cedula: "", correo: "", telefono: "",
    tipoContrato: "Término indefinido", fechaInicio: "", fechaTerminacion: "",
    cargo: "", area: firstArea, jefe: "", jefeId: "",
    salario: "", jornada: "Lunes a viernes, 8:00 a 17:00",
    obligaciones: "",
    fueros: [] as string[],
    estado: "activo" as "activo" | "inactivo",
  });
  const createColaborador = useCreateColaborador();
  const navigate = useNavigate();

  function set<K extends keyof typeof data>(k: K, v: (typeof data)[K]) {
    setData((d) => ({ ...d, [k]: v }));
  }
  function toggleFuero(f: string) {
    setData((d) => ({ ...d, fueros: d.fueros.includes(f) ? d.fueros.filter((x) => x !== f) : [...d.fueros, f] }));
  }

  async function commit() {
    try {
      const row = await createColaborador.mutateAsync({
        nombre: data.nombre,
        cedula: data.cedula,
        cargo: data.cargo || undefined,
        email: data.correo || undefined,
        telefono: data.telefono || undefined,
        area: data.area || undefined,
        // Solo persistimos el jefe si se eligió uno ya registrado (tiene id).
        // Si se escribió un nombre nuevo (aún sin registrar) queda informativo.
        jefeId: data.jefeId || undefined,
        fueros: data.fueros,
        estado: data.estado,
        estadoVinculacion: "activo",
        presencia: "en_oficina",
        riesgo: "bajo",
        origen: "manual",
      });
      toast.success("Colaborador creado", { description: `${data.nombre || "Registro"} agregado al organigrama.` });
      navigate({ to: "/colaboradores/$id", params: { id: row.id } });
    } catch {
      toast.error("Error al crear el colaborador");
    }
  }

  return (
    <div>
      <PageHeader eyebrow="Nuevo perfil" title="Crear colaborador manualmente" description="Un formulario por pasos, pensado para equipos de talento humano." />
      <ContextualSubnav items={sections.map((s, i) => ({ to: "/colaboradores/nuevo-manual", label: `${i + 1}. ${s}` }))} />

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-10">
        <div className="mb-8 flex items-center gap-3">
          <Progress value={((step + 1) / sections.length) * 100} className="h-1 bg-surface-elevated" />
          <span className="whitespace-nowrap text-xs text-muted-foreground">{step + 1} de {sections.length}</span>
        </div>

        <div className="rounded-3xl border border-border bg-card p-8">
          <h2 className="font-display text-2xl text-foreground">{sections[step]}</h2>

          <div className="mt-6 space-y-5">
            {step === 0 && (
              <Grid>
                <Field label="Nombre completo"><Input value={data.nombre} onChange={(e) => set("nombre", e.target.value)} /></Field>
                <Field label="Cédula"><Input value={data.cedula} onChange={(e) => set("cedula", e.target.value)} /></Field>
                <Field label="Correo"><Input type="email" value={data.correo} onChange={(e) => set("correo", e.target.value)} /></Field>
                <Field label="Teléfono"><Input value={data.telefono} onChange={(e) => set("telefono", e.target.value)} /></Field>
              </Grid>
            )}
            {step === 1 && (
              <Grid>
                <Field label="Tipo de contrato">
                  <Select
                    value={data.tipoContrato}
                    onValueChange={(v) => {
                      set("tipoContrato", v);
                      // Un contrato a término indefinido no tiene fecha de
                      // terminación: la limpiamos al seleccionarlo.
                      if (v === "Término indefinido") set("fechaTerminacion", "");
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Término indefinido", "Término fijo", "Obra o labor", "Prestación de servicios"].map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Estado">
                  <Select value={data.estado} onValueChange={(v) => set("estado", v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="activo">Activo</SelectItem>
                      <SelectItem value="inactivo">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Fecha de inicio"><Input type="date" value={data.fechaInicio} onChange={(e) => set("fechaInicio", e.target.value)} /></Field>
                <Field label="Fecha de terminación">
                  {data.tipoContrato === "Término indefinido" ? (
                    <div className="flex h-9 w-full items-center rounded-md border border-dashed border-border bg-background/40 px-3 text-sm text-muted-foreground">
                      Término indefinido · sin fecha de terminación
                    </div>
                  ) : (
                    <Input type="date" value={data.fechaTerminacion} onChange={(e) => set("fechaTerminacion", e.target.value)} />
                  )}
                </Field>
              </Grid>
            )}
            {step === 2 && (
              <Grid>
                <Field label="Cargo"><Input value={data.cargo} onChange={(e) => set("cargo", e.target.value)} /></Field>
                <Field label="Área">
                  <Select value={data.area} onValueChange={(v) => set("area", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{areaNames.map((a) => (<SelectItem key={a} value={a}>{a}</SelectItem>))}</SelectContent>
                  </Select>
                </Field>
              </Grid>
            )}
            {step === 3 && (
              <Field label="Jefe inmediato">
                <JefeCombobox
                  value={data.jefe}
                  options={colaboradoresData.map((c) => ({ id: c.id, nombre: c.nombre, cargo: c.cargo }))}
                  onPick={({ nombre, id }) => {
                    set("jefe", nombre);
                    set("jefeId", id ?? "");
                  }}
                />
                <p className="text-[11px] text-muted-foreground">
                  Elige un colaborador ya registrado (posible jefe) o escribe un nombre si aún no está en el sistema.
                </p>
              </Field>
            )}
            {step === 4 && (
              <Grid>
                <Field label="Salario mensual (COP)"><Input value={data.salario} onChange={(e) => set("salario", e.target.value)} placeholder="$ 5.500.000" /></Field>
                <Field label="Jornada"><Input value={data.jornada} onChange={(e) => set("jornada", e.target.value)} /></Field>
              </Grid>
            )}
            {step === 5 && (
              <Field label="Funciones u obligaciones (una por línea)">
                <Textarea rows={6} value={data.obligaciones} onChange={(e) => set("obligaciones", e.target.value)} />
              </Field>
            )}
            {step === 6 && (
              <div>
                <p className="mb-4 text-sm text-muted-foreground">Marca las protecciones laborales aplicables. Esto activa alertas específicas en el motor determinístico.</p>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {fuerosOptions.map((f) => (
                    <li key={f}>
                      <label className="flex items-start gap-3 rounded-xl border border-border bg-background/40 p-3 text-sm text-foreground">
                        <Checkbox checked={data.fueros.includes(f)} onCheckedChange={() => toggleFuero(f)} className="mt-0.5" />
                        <span>{f}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {step === 7 && (
              <div>
                <p className="mb-4 text-sm text-muted-foreground">Revisa el resumen y confirma. El registro queda trazable en auditoría.</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {Object.entries({
                    Nombre: data.nombre, Cédula: data.cedula, Cargo: data.cargo, Área: data.area,
                    "Jefe inmediato": data.jefe ? `${data.jefe}${data.jefeId ? "" : " (sin registrar)"}` : "—",
                    Contrato: data.tipoContrato, Inicio: data.fechaInicio || "—",
                    Terminación: data.tipoContrato === "Término indefinido"
                      ? "Sin fecha (indefinido)"
                      : data.fechaTerminacion || "—",
                    Salario: data.salario || "—", Jornada: data.jornada,
                  }).map(([k, v]) => (
                    <div key={k} className="rounded-xl border border-border bg-background/40 p-4">
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{k}</p>
                      <p className="mt-1 text-sm text-foreground">{v as string}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />Decreto 1072/2015 · Ley 1581/2012 aplicable al tratamiento de datos.
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 flex items-center justify-between">
            <Button variant="ghost" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="text-muted-foreground hover:text-foreground">
              <ChevronLeft className="mr-1 h-4 w-4" />Atrás
            </Button>
            {step < sections.length - 1 ? (
              <Button onClick={() => setStep(step + 1)} className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
                Continuar<ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={commit} className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
                Confirmar y crear
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function JefeCombobox({
  value,
  options,
  onPick,
}: {
  value: string;
  options: { id: string; nombre: string; cargo: string | null }[];
  onPick: (sel: { nombre: string; id: string | null }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  // ¿El texto escrito coincide exactamente con algún colaborador? Si no, y hay
  // texto, ofrecemos la opción de usarlo como nombre nuevo (sin registrar).
  const exactMatch = options.some((o) => o.nombre.toLowerCase() === search.trim().toLowerCase());
  const showCustom = search.trim().length > 0 && !exactMatch;

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearch(""); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            value ? "text-foreground" : "text-muted-foreground",
          )}
        >
          <span className="truncate">{value || "Selecciona o escribe un jefe"}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command>
          <CommandInput
            value={search}
            onValueChange={setSearch}
            placeholder="Buscar colaborador o escribir nombre…"
          />
          <CommandList>
            {!showCustom && <CommandEmpty>Sin colaboradores. Escribe un nombre para usarlo.</CommandEmpty>}
            {showCustom && (
              <CommandGroup heading="Nuevo">
                <CommandItem
                  value={search}
                  onSelect={() => {
                    onPick({ nombre: search.trim(), id: null });
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <UserPlus className="mr-2 h-4 w-4 text-primary" />
                  Usar “{search.trim()}” (sin registrar)
                </CommandItem>
              </CommandGroup>
            )}
            {options.length > 0 && (
              <CommandGroup heading="Colaboradores registrados">
                {options.map((o) => (
                  <CommandItem
                    key={o.id}
                    value={o.nombre}
                    onSelect={() => {
                      onPick({ nombre: o.nombre, id: o.id });
                      setOpen(false);
                      setSearch("");
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4", value === o.nombre ? "opacity-100" : "opacity-0")} />
                    <span className="truncate">
                      {o.nombre}
                      {o.cargo ? <span className="text-muted-foreground"> · {o.cargo}</span> : null}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function Grid({ children }: { children: React.ReactNode }) { return <div className="grid gap-5 sm:grid-cols-2">{children}</div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
