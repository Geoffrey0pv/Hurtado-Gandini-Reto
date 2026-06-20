// lib/types.ts — Tipos que reflejan las respuestas del backend.
// Se usan en hooks y se mapean al tipo Employee del UI cuando es necesario.
import type { Employee, ContractType } from "./mock/data";

// ── Backend response types ─────────────────────────────────────────────

export interface BackendColaborador {
  id: string;
  organizationId: string;
  nombre: string;
  cedula: string;
  fechaNacimiento: string | null;
  cargo: string | null;
  email: string | null;
  telefono: string | null;
  area: string | null;
  jefeId: string | null;
  estado: "activo" | "inactivo";
  estadoVinculacion: "activo" | "retirado";
  presencia: "en_oficina" | "vacaciones" | "permiso" | "incapacidad";
  riesgo: "alto" | "medio" | "bajo";
  fueros: string[] | null;
  arlNivel: number | null;
  origen: "manual" | "contrato";
  createdAt: string;
}

export interface BackendContrato {
  id: string;
  organizationId: string;
  colaboradorId: string;
  tipoContrato:
    | "TERMINO_FIJO"
    | "TERMINO_INDEFINIDO"
    | "OBRA_LABOR"
    | "PRESTACION_SERVICIOS"
    | "APRENDIZAJE"
    | "OTRO"
    | null;
  fechaInicio: string | null;
  fechaFin: string | null;
  salario: string | null;
  jornadaHorasSemana: number | null;
  fileKey: string;
  fileUrl: string | null;
  rawText: string | null;
  extracted: unknown | null;
  status: "PENDING" | "PROCESSING" | "DONE" | "FAILED";
  createdAt: string;
}

export interface BackendArea {
  id: string;
  organizationId: string;
  nombre: string;
  orden: number;
  createdAt: string;
}

export interface BackendTimesheetEntry {
  id: string;
  organizationId: string;
  colaboradorId: string;
  fecha: string;
  horas: string;
  tipo: string;
  notas: string | null;
  createdAt: string;
}

export interface BackendDocumentoSlot {
  id: string;
  organizationId: string;
  colaboradorId: string;
  slotKey: string;
  fileKey: string;
  fileUrl: string | null;
  nombre: string;
  size: number;
  subidoEn: string;
}

export interface BackendExpediente {
  id: string;
  organizationId: string;
  colaboradorId: string;
  hechos: string;
  fechaHechos: string;
  gravedad: "leve" | "grave" | "gravisima";
  normaVulnerada: string | null;
  fechaDiligencia: string | null;
  hora: string | null;
  modalidad: "Presencial" | "Virtual" | null;
  lugar: string | null;
  asistentes: string | null;
  ciudad: string | null;
  estado: "abierto" | "cerrado";
  cartaTexto: string | null;
  etapas: Record<string, boolean> | null;
  notificado: Array<{ canal: string; fecha: string }> | null;
  createdAt: string;
}

export interface BackendNovedad {
  id: string;
  organizationId: string;
  colaboradorId: string;
  tipo: string;
  descripcion: string | null;
  fecha: string;
  monto: string | null;
  origen: string | null;
  createdAt: string;
}

export interface BackendAlerta {
  contratoId: string;
  colaboradorId: string;
  nombre: string;
  cedula: string;
  cargo: string | null;
  severidad: "alta" | "media" | "baja";
  motivo: string;
  tipo: string;
  plazo?: string;
}

// Resultado del analisis determinista por contrato (GET /contratos/:id/analisis).
export interface ConceptoLiquidacion {
  concepto: string;
  valor: number;
  formula: string;
  baseLegal: string;
}

export interface AnalisisJornada {
  aplica?: false;
  motivo?: string;
  horasSemana?: number;
  maxLegal?: number;
  cumple?: boolean;
  baseLegal?: string;
  mensaje?: string;
}

export interface AnalisisLiquidacion {
  aplica?: false;
  motivo?: string;
  diasTrabajados?: number;
  conceptos?: ConceptoLiquidacion[];
  total?: number;
  indemnizacionEstimada?: ConceptoLiquidacion;
}

export interface AnalisisAlerta {
  tipo: string;
  severidad: "OK" | "INFO" | "ADVERTENCIA" | "CRITICA";
  diasRestantes: number | null;
  mensaje: string;
  baseLegal?: string;
}

export interface AnalisisContrato {
  generadoEn: string;
  metodo: string; // "REGLA_DETERMINISTA"
  jornada: AnalisisJornada;
  liquidacion: AnalisisLiquidacion;
  alertas: AnalisisAlerta[];
}

export interface BackendAuditLog {
  id: string;
  organizationId: string;
  userId: string | null;
  action: string;
  entity: string | null;
  entityId: string | null;
  aiModel: string | null;
  payload: unknown | null;
  createdAt: string;
}

export interface DashboardSummary {
  colaboradores: number;
  contratosPorVencer: number;
  disciplinariosAbiertos: number;
  docsPendientesRevision: number;
}

// ── Mapper: BackendColaborador + BackendContrato? → Employee ──────────

const CONTRACT_TYPE_MAP: Record<string, ContractType> = {
  TERMINO_INDEFINIDO: "Término indefinido",
  TERMINO_FIJO: "Término fijo",
  OBRA_LABOR: "Obra o labor",
  PRESTACION_SERVICIOS: "Prestación de servicios",
  APRENDIZAJE: "Término indefinido",
  OTRO: "Término indefinido",
};

export function backendToEmployee(
  colab: BackendColaborador,
  contrato?: BackendContrato,
  jefe?: BackendColaborador,
): Employee {
  const tipoContrato: ContractType = contrato?.tipoContrato
    ? (CONTRACT_TYPE_MAP[contrato.tipoContrato] ?? "Término indefinido")
    : "Término indefinido";

  return {
    id: colab.id,
    nombre: colab.nombre,
    cedula: colab.cedula,
    correo: colab.email ?? "—",
    telefono: colab.telefono ?? "—",
    cargo: colab.cargo ?? "—",
    area: colab.area ?? "Sin área",
    jefe: jefe ? jefe.nombre : "—",
    tipoContrato,
    fechaInicio: contrato?.fechaInicio ?? colab.createdAt.slice(0, 10),
    fechaTerminacion: contrato?.fechaFin ?? null,
    fechaRetiro: colab.estadoVinculacion === "retirado" ? colab.createdAt.slice(0, 10) : null,
    salario: contrato?.salario != null ? Number(contrato.salario) : 0,
    jornada: contrato?.jornadaHorasSemana
      ? `${contrato.jornadaHorasSemana} h/semana`
      : "No especificada",
    estado: colab.estado,
    estadoVinculacion: colab.estadoVinculacion,
    presencia: colab.presencia,
    riesgo: colab.riesgo,
    fueros: colab.fueros ?? [],
    obligaciones: [],
    alertasActivas: 0,
    origen: colab.origen,
    contratoId: contrato?.id ?? null,
  };
}

export function employeeToCreatePayload(
  data: Partial<Employee> & { cedula: string; nombre: string },
): Record<string, unknown> {
  const CONTRACT_TYPE_REVERSE: Record<string, string> = {
    "Término indefinido": "TERMINO_INDEFINIDO",
    "Término fijo": "TERMINO_FIJO",
    "Obra o labor": "OBRA_LABOR",
    "Prestación de servicios": "PRESTACION_SERVICIOS",
  };

  return {
    nombre: data.nombre,
    cedula: data.cedula,
    cargo: data.cargo ?? undefined,
    email: data.correo !== "—" ? data.correo : undefined,
    telefono: data.telefono !== "—" ? data.telefono : undefined,
    area: data.area ?? undefined,
    estado: data.estado ?? "activo",
    estadoVinculacion: data.estadoVinculacion ?? "activo",
    presencia: data.presencia ?? "en_oficina",
    riesgo: data.riesgo ?? "bajo",
    fueros: data.fueros ?? [],
    origen: data.origen ?? "manual",
  };
}
