import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  Briefcase,
  CheckCircle2,
  Filter,
  GripVertical,
  IdCard,
  LayoutList,
  Mail,
  Network,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { useEmployees } from "@/lib/store";
import {
  antiguedad,
  cumplimientoDe,
  cumplimientoLabel,
  jefeDisplay,
  presenciaLabel,
  type Cumplimiento,
  type Employee,
  type Presencia,
} from "@/lib/mock/data";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/organizacion")({
  head: () => ({ meta: [{ title: "Organización · LaborApp" }] }),
  component: OrgPage,
});

const cumplimientoTone: Record<Cumplimiento, "success" | "warning" | "primary"> = {
  al_dia: "success",
  verificar: "warning",
  en_riesgo: "primary",
};
const presenciaTone: Record<Presencia, "muted" | "primary" | "warning"> = {
  en_oficina: "muted",
  vacaciones: "primary",
  permiso: "muted",
  incapacidad: "warning",
};

function OrgPage() {
  const [mode, setMode] = useState<"tree" | "list">("tree");
  const [selected, setSelected] = useState<Employee | null>(null);

  return (
    <div>
      <PageHeader
        eyebrow="Estructura"
        title="Estructura organizacional"
        description="Visualiza, edita y reorganiza la jerarquía. Los cambios disparan una verificación en el perfil."
        actions={
          <div className="inline-flex rounded-full border border-border-strong/60 bg-card p-1">
            <button
              onClick={() => setMode("tree")}
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs",
                mode === "tree" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Network className="h-3.5 w-3.5" />Vista árbol
            </button>
            <button
              onClick={() => setMode("list")}
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs",
                mode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <LayoutList className="h-3.5 w-3.5" />Vista lista
            </button>
          </div>
        }
      />

      <div className="mx-auto max-w-[1440px] px-4 pb-16 sm:px-6 lg:px-10">
        {mode === "tree" ? (
          <TreeView onSelect={setSelected} />
        ) : (
          <ListView />
        )}
      </div>

      <EmployeeGlassDialog employee={selected} onOpenChange={(o) => !o && setSelected(null)} />
    </div>
  );
}

/* ------------------------------ TREE VIEW ------------------------------ */

const TREE_CSS = `
.org-tree, .org-tree ul { list-style: none; margin: 0; padding: 0; }
.org-tree { text-align: center; }
.org-tree ul { display: inline-flex; align-items: flex-start; padding-top: 28px; position: relative; }
.org-tree ul::before {
  content: ''; position: absolute; top: 0; left: 50%;
  width: 0; height: 28px; border-left: 1px solid var(--border);
}
.org-tree li { position: relative; padding: 28px 14px 0; }
.org-tree > li { padding-top: 0; }
.org-tree li::before, .org-tree li::after {
  content: ''; position: absolute; top: 0; right: 50%;
  border-top: 1px solid var(--border); width: 50%; height: 28px;
}
.org-tree li::after { right: auto; left: 50%; border-left: 1px solid var(--border); }
.org-tree li:only-child { padding-top: 28px; }
.org-tree li:only-child::before, .org-tree li:only-child::after { display: none; }
.org-tree li:first-child::before, .org-tree li:last-child::after { border: 0 none; }
.org-tree li:last-child::before { border-right: 1px solid var(--border); }
.org-tree > li > ul::before { display: none; }
.org-tree .node { display: inline-block; vertical-align: top; }
`;

function TreeView({ onSelect }: { onSelect: (e: Employee) => void }) {
  const { employees, areas, moveEmployee, renameArea, removeArea } = useEmployees();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function handleDragEnd(ev: DragEndEvent) {
    const { active, over } = ev;
    if (!over) return;
    const empId = String(active.id);
    const overId = String(over.id);
    if (overId.startsWith("area:")) {
      const area = overId.slice(5);
      const updated = moveEmployee(empId, { area, jefe: "Ricardo Patiño" });
      if (updated) toast.warning("Cambio de jerarquía", {
        description: `${updated.nombre} fue movido a ${area}. Verifica los datos en el perfil.`,
      });
    } else if (overId.startsWith("emp:")) {
      const targetId = overId.slice(4);
      if (targetId === empId) return;
      const target = employees.find((e) => e.id === targetId);
      if (!target) return;
      // Prevent dropping a node on one of its own descendants
      if (isDescendantOf(target, empId, employees)) {
        toast.error("No puedes mover un superior debajo de uno de sus subordinados.");
        return;
      }
      const updated = moveEmployee(empId, { area: target.area, jefe: target.nombre });
      if (updated) toast.warning("Cambio de jerarquía", {
        description: `${updated.nombre} ahora reporta a ${target.nombre}. Verifica los datos en el perfil.`,
      });
    }
  }

  const activos = employees.filter((e) => e.estadoVinculacion === "activo");
  const namesByArea = new Map<string, Set<string>>();
  areas.forEach((a) => namesByArea.set(a, new Set(activos.filter((e) => e.area === a).map((e) => e.nombre))));

  function rootsOf(area: string) {
    const inArea = activos.filter((e) => e.area === area);
    const names = namesByArea.get(area)!;
    return inArea.filter((e) => !names.has(e.jefe));
  }

  return (
    <div className="space-y-6">
      <style>{TREE_CSS}</style>

      <p className="text-xs text-muted-foreground">
        Arrastra una tarjeta para moverla entre áreas o sobre otro colaborador para que pase a reportarle.
        Haz clic en el nombre de un área para renombrarla.
      </p>

      <div className="overflow-x-auto pb-6">
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <ul className="org-tree mx-auto">
            <li>
              <div className="node">
                <CEOCard />
              </div>
              <ul>
                {areas.map((area) => (
                  <li key={area}>
                    <div className="node">
                      <AreaCard
                        area={area}
                        count={activos.filter((e) => e.area === area).length}
                        onRename={(next) => renameArea(area, next)}
                        onRemove={() => removeArea(area)}
                        hasMembers={activos.some((e) => e.area === area)}
                      />
                    </div>
                    {rootsOf(area).length > 0 && (
                      <ul>
                        {rootsOf(area).map((e) => (
                          <EmployeeSubtree key={e.id} employee={e} all={activos} onSelect={onSelect} />
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          </ul>
        </DndContext>
      </div>
    </div>
  );
}

function isDescendantOf(candidate: Employee, ancestorId: string, all: Employee[]): boolean {
  const ancestor = all.find((e) => e.id === ancestorId);
  if (!ancestor) return false;
  let current: Employee | undefined = candidate;
  const seen = new Set<string>();
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    if (current.jefe === ancestor.nombre) return true;
    current = all.find((e) => e.nombre === current!.jefe);
  }
  return false;
}

function CEOCard() {
  return (
    <div className="inline-block min-w-[220px] rounded-2xl border border-primary/30 bg-card px-5 py-3 text-center shadow-[var(--shadow-elegant)]">
      <p className="text-[10px] uppercase tracking-[0.22em] text-primary">Dirección general</p>
      <p className="mt-1 font-display text-base text-foreground">Ricardo Patiño</p>
      <p className="text-[11px] text-muted-foreground">CEO · Logística Andina S.A.</p>
    </div>
  );
}

function AreaCard({
  area,
  count,
  onRename,
  onRemove,
  hasMembers,
}: {
  area: string;
  count: number;
  onRename: (next: string) => void;
  onRemove: () => void;
  hasMembers: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `area:${area}` });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(area);

  function commit() {
    setEditing(false);
    if (draft.trim() && draft !== area) {
      onRename(draft.trim());
      toast.success(`Área renombrada a "${draft.trim()}"`);
    } else setDraft(area);
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "inline-flex min-w-[200px] flex-col items-center gap-1 rounded-2xl border bg-surface-elevated px-4 py-3 transition",
        isOver ? "border-primary/60 bg-primary/5" : "border-border",
      )}
    >
      <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Área</p>
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") { setDraft(area); setEditing(false); }
          }}
          className="w-full bg-transparent text-center font-display text-base text-foreground outline-none"
        />
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="group inline-flex items-center gap-1.5 font-display text-base text-foreground hover:text-primary"
        >
          {area}
          <Pencil className="h-3 w-3 opacity-0 transition group-hover:opacity-60" />
        </button>
      )}
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <span>{count} colaborador{count === 1 ? "" : "es"}</span>
        <button
          onClick={() => {
            if (hasMembers) { toast.error("No puedes eliminar un área con colaboradores asignados."); return; }
            if (confirm(`¿Eliminar el área "${area}"?`)) onRemove();
          }}
          className="grid h-6 w-6 place-items-center rounded-full text-muted-foreground hover:bg-background hover:text-primary"
          aria-label="Eliminar área"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

function EmployeeSubtree({
  employee,
  all,
  onSelect,
}: {
  employee: Employee;
  all: Employee[];
  onSelect: (e: Employee) => void;
}) {
  const children = all.filter((e) => e.jefe === employee.nombre && e.area === employee.area && e.id !== employee.id);
  return (
    <li>
      <div className="node">
        <EmployeeNode employee={employee} onSelect={onSelect} />
      </div>
      {children.length > 0 && (
        <ul>
          {children.map((c) => (
            <EmployeeSubtree key={c.id} employee={c} all={all} onSelect={onSelect} />
          ))}
        </ul>
      )}
    </li>
  );
}

function EmployeeNode({ employee, onSelect }: { employee: Employee; onSelect: (e: Employee) => void }) {
  const { attributes, listeners, setNodeRef: setDrag, transform, isDragging } = useDraggable({ id: employee.id });
  const { setNodeRef: setDrop, isOver } = useDroppable({ id: `emp:${employee.id}` });
  const cumplimiento = cumplimientoDe(employee.riesgo);

  const setRefs = (node: HTMLDivElement | null) => {
    setDrag(node);
    setDrop(node);
  };

  return (
    <div
      ref={setRefs}
      style={{ transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.4 : 1 }}
      className={cn(
        "relative w-[220px] rounded-2xl border bg-card p-3 text-left transition",
        isOver ? "border-primary/60 ring-2 ring-primary/20" : "border-border hover:border-primary/40",
      )}
    >
      <button
        {...listeners}
        {...attributes}
        className="absolute right-2 top-2 cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
        aria-label="Arrastrar"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <button onClick={() => onSelect(employee)} className="block w-full text-left">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/12 text-[11px] font-semibold text-primary">
            {initials(employee.nombre)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm text-foreground">{employee.nombre}</p>
            <p className="truncate text-[11px] text-muted-foreground">{employee.cargo}</p>
          </div>
        </div>
        <p className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground">
          {antiguedad(employee.fechaInicio)} de antigüedad
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1">
          <StatusBadge tone={cumplimientoTone[cumplimiento]}>{cumplimientoLabel[cumplimiento]}</StatusBadge>
          {employee.presencia !== "en_oficina" && (
            <StatusBadge tone={presenciaTone[employee.presencia]}>{presenciaLabel[employee.presencia]}</StatusBadge>
          )}
        </div>
      </button>
    </div>
  );
}


/* ------------------------------ LIST VIEW ------------------------------ */

type ColumnKey =
  | "nombre"
  | "cargo"
  | "area"
  | "estado"
  | "contrato"
  | "antiguedad"
  | "presencia"
  | "correo"
  | "cedula"
  | "alertas"
  | "jefe";

const allColumns: { key: ColumnKey; label: string; default?: boolean }[] = [
  { key: "nombre", label: "Nombre", default: true },
  { key: "cargo", label: "Cargo", default: true },
  { key: "area", label: "Área", default: true },
  { key: "estado", label: "Estado", default: true },
  { key: "contrato", label: "Tipo de contrato" },
  { key: "antiguedad", label: "Antigüedad" },
  { key: "presencia", label: "Presencia" },
  { key: "correo", label: "Correo" },
  { key: "cedula", label: "Cédula" },
  { key: "alertas", label: "Alertas activas" },
  { key: "jefe", label: "Jefe" },
];

function ListView() {
  const { employees, areas } = useEmployees();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"activos" | "historia">("activos");
  const [areaFilter, setAreaFilter] = useState<string[]>([]);
  const [cumpFilter, setCumpFilter] = useState<Cumplimiento[]>([]);
  const [presFilter, setPresFilter] = useState<Presencia[]>([]);
  const [columns, setColumns] = useState<ColumnKey[]>(
    allColumns.filter((c) => c.default).map((c) => c.key),
  );

  function toggle<T>(arr: T[], v: T, setter: (n: T[]) => void) {
    setter(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  }

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return employees.filter((e) => {
      if (tab === "activos" && e.estadoVinculacion !== "activo") return false;
      if (tab === "historia" && e.estadoVinculacion !== "retirado") return false;
      if (term && ![e.nombre, e.cargo, e.cedula, e.correo].some((v) => v.toLowerCase().includes(term))) return false;
      if (areaFilter.length && !areaFilter.includes(e.area)) return false;
      if (cumpFilter.length && !cumpFilter.includes(cumplimientoDe(e.riesgo))) return false;
      if (presFilter.length && !presFilter.includes(e.presencia)) return false;
      return true;
    });
  }, [employees, q, tab, areaFilter, cumpFilter, presFilter]);

  const visibleCols = allColumns.filter((c) => columns.includes(c.key));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-full border border-border-strong/60 bg-card p-1">
          {(["activos", "historia"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs",
                tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t === "activos" ? <Users className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              {t === "activos" ? "Activos" : "Historia"}
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre, cargo, cédula o correo"
            className="h-9 rounded-full border-border-strong/60 bg-card pl-9 text-sm"
          />
        </div>

        <FilterMenu
          label="Área"
          options={areas.map((a) => ({ value: a, label: a }))}
          selected={areaFilter}
          onToggle={(v) => toggle(areaFilter, v, setAreaFilter)}
        />
        <FilterMenu
          label="Estado"
          options={[
            { value: "al_dia", label: cumplimientoLabel.al_dia },
            { value: "verificar", label: cumplimientoLabel.verificar },
            { value: "en_riesgo", label: cumplimientoLabel.en_riesgo },
          ]}
          selected={cumpFilter}
          onToggle={(v) => toggle(cumpFilter, v as Cumplimiento, setCumpFilter)}
        />
        <FilterMenu
          label="Presencia"
          options={(Object.keys(presenciaLabel) as Presencia[]).map((p) => ({ value: p, label: presenciaLabel[p] }))}
          selected={presFilter}
          onToggle={(v) => toggle(presFilter, v as Presencia, setPresFilter)}
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 rounded-full border-border-strong/60 text-xs">
              <Plus className="mr-1 h-3.5 w-3.5" />Columnas
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-xs">Columnas visibles</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {allColumns.map((c) => (
              <DropdownMenuCheckboxItem
                key={c.key}
                checked={columns.includes(c.key)}
                onCheckedChange={() => toggle(columns, c.key, setColumns)}
              >
                {c.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {(areaFilter.length + cumpFilter.length + presFilter.length) > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Filter className="h-3 w-3" />Filtros activos:
          {[...areaFilter, ...cumpFilter.map((c) => cumplimientoLabel[c]), ...presFilter.map((p) => presenciaLabel[p])].map((label) => (
            <span key={label} className="rounded-full border border-border bg-surface px-2 py-0.5">{label}</span>
          ))}
          <button
            onClick={() => { setAreaFilter([]); setCumpFilter([]); setPresFilter([]); }}
            className="ml-1 inline-flex items-center gap-1 text-primary hover:underline"
          >
            <X className="h-3 w-3" />Limpiar
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                {visibleCols.map((c) => (
                  <th key={c.key} className="px-5 py-3 font-medium">{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => {
                const cumpl = cumplimientoDe(e.riesgo);
                return (
                  <tr
                    key={e.id}
                    onClick={() => navigate({ to: "/colaboradores/$id", params: { id: e.id } })}
                    className="cursor-pointer border-b border-border/60 last:border-0 transition hover:bg-surface-elevated/50"
                  >
                    {visibleCols.map((c) => (
                      <td key={c.key} className="px-5 py-4 align-middle">
                        {renderCell(c.key, e, cumpl)}
                      </td>
                    ))}
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={visibleCols.length} className="px-5 py-12 text-center text-sm text-muted-foreground">
                    Sin colaboradores que coincidan con los filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function renderCell(key: ColumnKey, e: Employee, cumpl: Cumplimiento) {
  switch (key) {
    case "nombre": return <span className="font-medium text-foreground">{e.nombre}</span>;
    case "cargo": return <span className="text-muted-foreground">{e.cargo}</span>;
    case "area": return <span className="text-muted-foreground">{e.area}</span>;
    case "estado":
      return <StatusBadge tone={cumplimientoTone[cumpl]}>{cumplimientoLabel[cumpl]}</StatusBadge>;
    case "contrato": return <span className="text-muted-foreground">{e.tipoContrato}</span>;
    case "antiguedad": return <span className="text-muted-foreground">{antiguedad(e.fechaInicio)}</span>;
    case "presencia":
      return e.presencia === "en_oficina"
        ? <span className="text-xs text-muted-foreground">En oficina</span>
        : <StatusBadge tone={presenciaTone[e.presencia]}>{presenciaLabel[e.presencia]}</StatusBadge>;
    case "correo": return <span className="text-muted-foreground">{e.correo}</span>;
    case "cedula": return <span className="text-muted-foreground">{e.cedula}</span>;
    case "alertas":
      return e.alertasActivas > 0
        ? <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">{e.alertasActivas}</span>
        : <span className="text-xs text-muted-foreground">—</span>;
    case "jefe": return <span className="text-muted-foreground">{jefeDisplay(e)}</span>;
  }
}

function FilterMenu({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-9 rounded-full border-border-strong/60 text-xs",
            selected.length > 0 && "border-primary/50 text-primary",
          )}
        >
          {label}{selected.length > 0 && <span className="ml-1 rounded-full bg-primary/15 px-1.5 text-[10px]">{selected.length}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuLabel className="text-xs">Filtrar por {label.toLowerCase()}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((o) => (
          <DropdownMenuCheckboxItem
            key={o.value}
            checked={selected.includes(o.value)}
            onCheckedChange={() => onToggle(o.value)}
          >
            {o.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* --------------------------- GLASS EMPLOYEE DIALOG --------------------------- */

function EmployeeGlassDialog({
  employee,
  onOpenChange,
}: {
  employee: Employee | null;
  onOpenChange: (open: boolean) => void;
}) {
  const e = employee;
  return (
    <Dialog open={!!e} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg overflow-hidden border-white/10 bg-card/55 p-0 shadow-[0_30px_120px_-20px_rgba(0,0,0,0.6)] backdrop-blur-2xl backdrop-saturate-150"
      >
        <DialogTitle className="sr-only">Detalle de colaborador</DialogTitle>
        {e && (
          <div className="flex flex-col">
            <div className="relative px-6 pb-5 pt-7">
              <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/10 via-transparent to-transparent" />
              <div className="flex items-center gap-4">
                <div className="grid h-16 w-16 place-items-center rounded-2xl border border-white/10 bg-primary/15 font-display text-2xl text-primary">
                  {initials(e.nombre)}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-display text-2xl text-foreground">{e.nombre}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {e.cargo} · {e.area} · {antiguedad(e.fechaInicio)}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <StatusBadge tone={cumplimientoTone[cumplimientoDe(e.riesgo)]}>
                      {cumplimientoLabel[cumplimientoDe(e.riesgo)]}
                    </StatusBadge>
                    {e.presencia !== "en_oficina" && (
                      <StatusBadge tone={presenciaTone[e.presencia]}>{presenciaLabel[e.presencia]}</StatusBadge>
                    )}
                    <StatusBadge tone={e.estadoVinculacion === "activo" ? "success" : "muted"}>
                      {e.estadoVinculacion === "activo" ? "Activo" : "Retirado"}
                    </StatusBadge>
                  </div>
                </div>
              </div>
            </div>

            <dl className="grid grid-cols-1 gap-px bg-white/5 px-px sm:grid-cols-2">
              <Field icon={<IdCard className="h-3.5 w-3.5" />} k="Cédula" v={e.cedula} />
              <Field icon={<Phone className="h-3.5 w-3.5" />} k="Teléfono" v={e.telefono} />
              <Field icon={<Mail className="h-3.5 w-3.5" />} k="Correo" v={e.correo} className="sm:col-span-2" />
              <Field icon={<Briefcase className="h-3.5 w-3.5" />} k="Tipo de contrato" v={e.tipoContrato} />
              <Field icon={<Users className="h-3.5 w-3.5" />} k="Jefe" v={jefeDisplay(e)} />
              <Field k="Inicio" v={e.fechaInicio} />
              <Field k="Terminación" v={e.fechaTerminacion ?? "Indefinido"} />
            </dl>

            <div className="flex flex-wrap items-center gap-2 border-t border-white/8 px-6 py-4">
              <Button asChild size="sm" className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
                <Link to="/colaboradores/$id" params={{ id: e.id }}>Ver perfil</Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="rounded-full border-white/15">
                <Link to="/colaboradores/$id" params={{ id: e.id }} search={{ tab: "contrato" } as any}>Ver contrato</Link>
              </Button>
              <Button asChild size="sm" variant="ghost" className="text-muted-foreground hover:text-foreground">
                <Link to="/colaboradores/$id" params={{ id: e.id }} search={{ tab: "alertas" } as any}>
                  Alertas {e.alertasActivas > 0 && `(${e.alertasActivas})`}
                </Link>
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({
  icon,
  k,
  v,
  className,
}: {
  icon?: React.ReactNode;
  k: string;
  v: string;
  className?: string;
}) {
  return (
    <div className={cn("bg-card/70 px-6 py-3", className)}>
      <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}{k}
      </p>
      <p className="mt-1 text-sm text-foreground">{v}</p>
    </div>
  );
}

function initials(n: string) {
  return n.split(" ").slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}
