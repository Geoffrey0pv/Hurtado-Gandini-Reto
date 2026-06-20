// Mock data for VinApp prototype. All Spanish, Colombian context.

export type RiskLevel = "alto" | "medio" | "bajo";
export type EmployeeStatus = "activo" | "inactivo";
export type EstadoVinculacion = "activo" | "retirado";
export type Presencia = "en_oficina" | "vacaciones" | "permiso" | "incapacidad";
export type Cumplimiento = "al_dia" | "verificar" | "en_riesgo";
export type ContractType =
  | "Término indefinido"
  | "Término fijo"
  | "Obra o labor"
  | "Prestación de servicios";

export type Employee = {
  id: string;
  nombre: string;
  cedula: string;
  correo: string;
  telefono: string;
  cargo: string;
  area: string;
  jefe: string;
  tipoContrato: ContractType;
  fechaInicio: string;
  fechaTerminacion?: string | null;
  fechaRetiro?: string | null;
  salario: number;
  jornada: string;
  estado: EmployeeStatus;
  estadoVinculacion: EstadoVinculacion;
  presencia: Presencia;
  riesgo: RiskLevel;
  fueros: string[];
  obligaciones: string[];
  manualFunciones?: { cargado: boolean; fecha?: string };
  alertasActivas: number;
  origen: "manual" | "contrato";
};

// SMMLV 2025 referencia (COP)
export const SMMLV_2025 = 1423500;

export function auxilioTransporte(salario: number): { aplica: boolean; texto: string } {
  const aplica = salario <= 2 * SMMLV_2025;
  return { aplica, texto: aplica ? "Sí" : "No (>2 SMMLV)" };
}

// Factores de horas extra y recargos (Ley 2466/2025).
// extra=true → se paga el factor completo. extra=false → solo el sobrecosto (factor - 1).
export const FACTORES_HORA = {
  extra_diurna: { label: "Extra diurna ×1.25", factor: 1.25, extra: true, family: "extra" },
  extra_nocturna: { label: "Extra nocturna ×1.75", factor: 1.75, extra: true, family: "extra" },
  recargo_nocturno: { label: "Recargo nocturno +35%", factor: 1.35, extra: false, family: "recargo" },
  recargo_dom_fest: { label: "Recargo dom./festivo +75%", factor: 1.75, extra: false, family: "recargo" },
  recargo_dom_fest_nocturno: { label: "Recargo dom./festivo nocturno +110%", factor: 2.10, extra: false, family: "recargo" },
  extra_dom_fest_diurna: { label: "Extra dom./festivo diurna ×2.00", factor: 2.0, extra: true, family: "dom" },
  extra_dom_fest_nocturna: { label: "Extra dom./festivo nocturna ×2.50", factor: 2.5, extra: true, family: "dom" },
  ordinaria: { label: "Ordinaria", factor: 1, extra: false, family: "ord" },
  pto: { label: "PTO / Vacaciones", factor: 0, extra: false, family: "pto" },
  permiso: { label: "Permiso", factor: 0, extra: false, family: "pto" },
  incapacidad: { label: "Incapacidad", factor: 0, extra: false, family: "pto" },
} as const;

export type TipoHora = keyof typeof FACTORES_HORA;

export function valorHoraOrdinaria(salario: number): number {
  return Math.round(salario / 240);
}

export function calcularValorEntrada(salario: number, horas: number, tipo: TipoHora): number {
  const f = FACTORES_HORA[tipo];
  const base = salario / 240;
  if (f.factor === 0) return 0;
  const efectivo = f.extra ? f.factor : f.factor - 1;
  return Math.round(base * horas * efectivo);
}

export function aportesMensuales(salario: number, arlNivel: 1 | 2 | 3 | 4 | 5 = 2) {
  const arlPct = { 1: 0.00522, 2: 0.01044, 3: 0.02436, 4: 0.04350, 5: 0.06960 }[arlNivel];
  const salud = Math.round(salario * 0.085);
  const pension = Math.round(salario * 0.12);
  const arl = Math.round(salario * arlPct);
  const caja = Math.round(salario * 0.04);
  const deduccionEmpleado = Math.round(salario * 0.08);
  const aux = auxilioTransporte(salario).aplica ? Math.round(SMMLV_2025 * 0.142) : 0;
  const neto = salario + aux - deduccionEmpleado;
  return { salud, pension, arl, caja, neto, aux, arlPct };
}

export function proximaPrima(ref: Date = new Date()): { label: string; fecha: string } {
  const y = ref.getFullYear();
  const jun30 = new Date(y, 5, 30);
  return ref <= jun30
    ? { label: "Prima primer semestre", fecha: `30 jun ${y}` }
    : { label: "Prima segundo semestre", fecha: `20 dic ${y}` };
}

export function aplicaDotacion(e: Pick<Employee, "tipoContrato" | "salario">): boolean {
  const esLaboral = e.tipoContrato === "Término indefinido" || e.tipoContrato === "Término fijo" || e.tipoContrato === "Obra o labor";
  return esLaboral && e.salario < 2 * SMMLV_2025;
}

export function proximaDotacion(ref: Date = new Date()): string {
  const y = ref.getFullYear();
  const fechas = [new Date(y, 3, 30), new Date(y, 7, 31), new Date(y, 11, 20)];
  const labels = [`30 abr ${y}`, `31 ago ${y}`, `20 dic ${y}`];
  for (let i = 0; i < fechas.length; i++) if (ref <= fechas[i]) return labels[i];
  return `30 abr ${y + 1}`;
}

// ─── Liquidación (cálculo determinista año comercial 360) ──────────────────

export type LiquidacionInput = Pick<Employee, "salario" | "fechaInicio" | "tipoContrato" | "fechaTerminacion">;

export function diasComerciales(desde: string, hastaRef: Date = new Date()): number {
  const a = new Date(desde);
  const y = hastaRef.getFullYear() - a.getFullYear();
  const m = hastaRef.getMonth() - a.getMonth();
  const d = hastaRef.getDate() - a.getDate();
  return Math.max(0, y * 360 + m * 30 + d);
}

export function liquidacion(e: LiquidacionInput, ref: Date = new Date()) {
  const auxAplica = auxilioTransporte(e.salario).aplica;
  const aux = auxAplica ? Math.round(SMMLV_2025 * 0.142) : 0;
  const base = e.salario + aux;
  const dias = diasComerciales(e.fechaInicio, ref);

  // Semestre actual (1 ene–30 jun o 1 jul–31 dic)
  const yr = ref.getFullYear();
  const inicioSem = ref.getMonth() < 6 ? new Date(yr, 0, 1) : new Date(yr, 6, 1);
  const inicioPrima = new Date(e.fechaInicio) > inicioSem ? new Date(e.fechaInicio) : inicioSem;
  const diasPrima = diasComerciales(inicioPrima.toISOString().slice(0, 10), ref);

  // Vacaciones pendientes: 15 días hábiles ≈ salario * dias/720
  const cesantias = Math.round((base * dias) / 360);
  const intereses = Math.round((cesantias * dias * 0.12) / 360);
  const prima = Math.round((base * diasPrima) / 360);
  const vacaciones = Math.round((e.salario * dias) / 720);

  // Indemnización sin justa causa
  let indemDias = 0;
  let indemDetalle = "";
  if (e.tipoContrato === "Término indefinido") {
    const smmlv10 = 10 * SMMLV_2025;
    const aniosCompletos = Math.floor(dias / 360);
    const aniosAdicionales = Math.max(0, aniosCompletos - 1);
    if (e.salario < smmlv10) {
      indemDias = 30 + 20 * aniosAdicionales;
      indemDetalle = `30 días primer año + 20 días por cada año adicional`;
    } else {
      indemDias = 20 + 15 * aniosAdicionales;
      indemDetalle = `20 días primer año + 15 días por cada año adicional (salario ≥ 10 SMMLV)`;
    }
  } else if (e.tipoContrato === "Término fijo") {
    // Salarios faltantes hasta terminación
    const fin = e.fechaTerminacion ? new Date(e.fechaTerminacion) : null;
    const diasFalt = fin ? Math.max(0, Math.round((fin.getTime() - ref.getTime()) / (1000 * 60 * 60 * 24))) : 0;
    indemDias = diasFalt;
    indemDetalle = `Salarios faltantes hasta terminación pactada (${diasFalt} días)`;
  } else if (e.tipoContrato === "Obra o labor") {
    indemDias = 15;
    indemDetalle = `Salarios del tiempo faltante o mínimo 15 días`;
  }
  const indemnizacion = Math.round((e.salario * indemDias) / 30);

  const totalSinJusta = cesantias + intereses + prima + vacaciones + indemnizacion;
  const totalConJusta = cesantias + intereses + prima + vacaciones; // sin indemnización

  return {
    cesantias, intereses, prima, vacaciones,
    indemnizacion, indemDias, indemDetalle,
    totalSinJusta, totalConJusta,
    dias, diasPrima,
  };
}

export function riesgoDespido(e: Pick<Employee, "fueros" | "tipoContrato">): {
  nivel: "alto" | "medio" | "bajo";
  motivo: string;
  detalle?: string;
} {
  if (e.fueros.length > 0) {
    return { nivel: "alto", motivo: e.fueros[0], detalle: "Prohibición o restricción de despido sin autorización judicial." };
  }
  if (e.tipoContrato === "Prestación de servicios") {
    return { nivel: "bajo", motivo: "Contrato civil", detalle: "No aplica indemnización laboral; verificar terminación pactada." };
  }
  return { nivel: "medio", motivo: "Sin fueros declarados", detalle: "Sin restricciones especiales; surtir debido proceso si es con justa causa." };
}


export function cumplimientoDe(r: RiskLevel): Cumplimiento {
  return r === "bajo" ? "al_dia" : r === "medio" ? "verificar" : "en_riesgo";
}

export const cumplimientoLabel: Record<Cumplimiento, string> = {
  al_dia: "Al día",
  verificar: "Por verificar",
  en_riesgo: "En riesgo",
};

export const presenciaLabel: Record<Presencia, string> = {
  en_oficina: "En oficina",
  vacaciones: "En vacaciones",
  permiso: "Con permiso",
  incapacidad: "Incapacitado",
};

export function antiguedad(fechaInicio: string, ref: Date = new Date()): string {
  const start = new Date(fechaInicio);
  let years = ref.getFullYear() - start.getFullYear();
  let months = ref.getMonth() - start.getMonth();
  if (months < 0) { years -= 1; months += 12; }
  if (years <= 0) return `${months} m`;
  if (months === 0) return `${years} a`;
  return `${years} a · ${months} m`;
}

export function jefeDisplay(e: Pick<Employee, "tipoContrato" | "jefe">): string {
  return e.tipoContrato === "Prestación de servicios" ? "Prestación de servicios" : e.jefe;
}

export const areas = [
  "Operaciones",
  "Talento Humano",
  "Legal",
  "Comercial",
  "Tecnología",
  "Finanzas",
];

export const cargos = [
  "Analista",
  "Coordinador",
  "Jefe de área",
  "Gerente",
  "Director",
  "Asesor externo",
];

export const employeesSeed: Employee[] = [
  {
    id: "emp-001",
    nombre: "Ana María Restrepo",
    cedula: "1.020.345.678",
    correo: "ana.restrepo@cliente.co",
    telefono: "+57 310 555 0142",
    cargo: "Coordinadora de Talento",
    area: "Talento Humano",
    jefe: "Margarita Villamil",
    tipoContrato: "Término indefinido",
    fechaInicio: "2022-03-14",
    fechaTerminacion: null,
    salario: 6800000,
    jornada: "40h/semana",
    estado: "activo",
    estadoVinculacion: "activo",
    presencia: "en_oficina",
    riesgo: "bajo",
    fueros: [],
    obligaciones: [
      "Selección y vinculación de personal",
      "Seguimiento de procesos disciplinarios",
      "Reporte mensual a gerencia",
    ],
    alertasActivas: 0,
    origen: "manual",
  },
  {
    id: "emp-002",
    nombre: "Carlos Andrés Gómez",
    cedula: "1.013.876.221",
    correo: "carlos.gomez@cliente.co",
    telefono: "+57 311 555 0902",
    cargo: "Analista Comercial",
    area: "Comercial",
    jefe: "Daniel Herrera",
    tipoContrato: "Término fijo",
    fechaInicio: "2024-06-01",
    fechaTerminacion: "2026-07-06",
    salario: 4200000,
    jornada: "43h/semana",
    estado: "activo",
    estadoVinculacion: "activo",
    presencia: "vacaciones",
    riesgo: "medio",
    fueros: [],
    obligaciones: [
      "Atención de cuentas estratégicas",
      "Elaboración de cotizaciones",
    ],
    alertasActivas: 2,
    origen: "contrato",
  },
  {
    id: "emp-003",
    nombre: "Laura Mejía Sánchez",
    cedula: "52.998.114",
    correo: "laura.mejia@cliente.co",
    telefono: "+57 318 555 0411",
    cargo: "Jefa de Operaciones",
    area: "Operaciones",
    jefe: "Ricardo Patiño",
    tipoContrato: "Término indefinido",
    fechaInicio: "2019-09-23",
    fechaTerminacion: null,
    salario: 9500000,
    jornada: "42h/semana",
    estado: "activo",
    estadoVinculacion: "activo",
    presencia: "incapacidad",
    riesgo: "alto",
    fueros: ["Estabilidad reforzada por salud"],
    obligaciones: [
      "Dirección operativa nacional",
      "Indicadores de cumplimiento",
      "Relación con proveedores logísticos",
    ],
    alertasActivas: 3,
    origen: "manual",
  },
  {
    id: "emp-004",
    nombre: "Juan Felipe Ortiz",
    cedula: "80.445.221",
    correo: "juan.ortiz@externo.co",
    telefono: "+57 320 555 0188",
    cargo: "Asesor de Producto",
    area: "Tecnología",
    jefe: "Mariana Quintero",
    tipoContrato: "Prestación de servicios",
    fechaInicio: "2024-01-15",
    fechaTerminacion: "2026-12-31",
    salario: 7500000,
    jornada: "Flexible",
    estado: "activo",
    estadoVinculacion: "activo",
    presencia: "en_oficina",
    riesgo: "alto",
    fueros: [],
    obligaciones: [
      "Asesoría en arquitectura de producto",
      "Entrega quincenal de avances",
    ],
    alertasActivas: 1,
    origen: "contrato",
  },
  {
    id: "emp-005",
    nombre: "Sofía Castaño Bernal",
    cedula: "1.032.554.890",
    correo: "sofia.castano@cliente.co",
    telefono: "+57 313 555 0233",
    cargo: "Analista de Nómina",
    area: "Talento Humano",
    jefe: "Ana María Restrepo",
    tipoContrato: "Término indefinido",
    fechaInicio: "2023-08-01",
    fechaTerminacion: null,
    salario: 3900000,
    jornada: "40h/semana",
    estado: "activo",
    estadoVinculacion: "activo",
    presencia: "permiso",
    riesgo: "bajo",
    fueros: [],
    obligaciones: ["Cálculo y dispersión de nómina", "Reportes a seguridad social"],
    alertasActivas: 0,
    origen: "manual",
  },
  {
    id: "emp-006",
    nombre: "Diego Rincón Pardo",
    cedula: "79.554.221",
    correo: "diego.rincon@cliente.co",
    telefono: "+57 312 555 0345",
    cargo: "Coordinador Logístico",
    area: "Operaciones",
    jefe: "Laura Mejía Sánchez",
    tipoContrato: "Término indefinido",
    fechaInicio: "2021-02-10",
    fechaTerminacion: null,
    salario: 5400000,
    jornada: "48h/semana",
    estado: "activo",
    estadoVinculacion: "activo",
    presencia: "en_oficina",
    riesgo: "medio",
    fueros: [],
    obligaciones: ["Ruteo de flota", "Cumplimiento de SLA con clientes"],
    alertasActivas: 1,
    origen: "manual",
  },
  {
    id: "emp-007",
    nombre: "Valeria Ospina León",
    cedula: "1.045.998.221",
    correo: "valeria.ospina@cliente.co",
    telefono: "+57 314 555 0411",
    cargo: "Abogada laboral",
    area: "Legal",
    jefe: "Margarita Villamil",
    tipoContrato: "Término indefinido",
    fechaInicio: "2020-11-05",
    fechaTerminacion: null,
    salario: 8200000,
    jornada: "40h/semana",
    estado: "activo",
    estadoVinculacion: "activo",
    presencia: "en_oficina",
    riesgo: "bajo",
    fueros: [],
    obligaciones: ["Revisión de contratos", "Acompañamiento disciplinario"],
    alertasActivas: 0,
    origen: "manual",
  },
  {
    id: "emp-008",
    nombre: "Mateo Salazar Vega",
    cedula: "1.018.221.554",
    correo: "mateo.salazar@cliente.co",
    telefono: "+57 315 555 0782",
    cargo: "Desarrollador Backend",
    area: "Tecnología",
    jefe: "Mariana Quintero",
    tipoContrato: "Término fijo",
    fechaInicio: "2022-07-18",
    fechaTerminacion: "2025-12-31",
    fechaRetiro: "2025-12-31",
    salario: 6100000,
    jornada: "40h/semana",
    estado: "inactivo",
    estadoVinculacion: "retirado",
    presencia: "en_oficina",
    riesgo: "bajo",
    fueros: [],
    obligaciones: [],
    manualFunciones: { cargado: false },
    alertasActivas: 0,
    origen: "manual",
  },
  {
    id: "emp-009",
    nombre: "Camila Arteaga Ruiz",
    cedula: "52.776.114",
    correo: "camila.arteaga@cliente.co",
    telefono: "+57 317 555 0098",
    cargo: "Analista Financiera",
    area: "Finanzas",
    jefe: "Ricardo Patiño",
    tipoContrato: "Término indefinido",
    fechaInicio: "2023-04-03",
    fechaTerminacion: null,
    salario: 5200000,
    jornada: "40h/semana",
    estado: "activo",
    estadoVinculacion: "activo",
    presencia: "en_oficina",
    riesgo: "bajo",
    fueros: [],
    obligaciones: ["Conciliaciones bancarias", "Flujo de caja semanal"],
    alertasActivas: 0,
    origen: "manual",
  },
];

export type DocumentItem = {
  id: string;
  nombre: string;
  tipo: string;
  empleado: string;
  empleadoId: string;
  fechaCarga: string;
  confianza: number;
  estado: "Pendiente de extracción" | "Pendiente de revisión" | "Aprobado" | "Rechazado";
};

export const documentsSeed: DocumentItem[] = [
  { id: "doc-1", nombre: "Contrato_Ana_Restrepo.pdf", tipo: "Contrato a término indefinido", empleado: "Ana María Restrepo", empleadoId: "emp-001", fechaCarga: "2024-03-14", confianza: 96, estado: "Aprobado" },
  { id: "doc-2", nombre: "Contrato_Carlos_Gomez.pdf", tipo: "Contrato a término fijo", empleado: "Carlos Andrés Gómez", empleadoId: "emp-002", fechaCarga: "2024-06-02", confianza: 88, estado: "Pendiente de revisión" },
  { id: "doc-3", nombre: "Otrosi_Laura_Mejia.docx", tipo: "Otrosí", empleado: "Laura Mejía Sánchez", empleadoId: "emp-003", fechaCarga: "2026-05-30", confianza: 74, estado: "Pendiente de revisión" },
  { id: "doc-4", nombre: "PrestacionServicios_Juan_Ortiz.pdf", tipo: "Prestación de servicios", empleado: "Juan Felipe Ortiz", empleadoId: "emp-004", fechaCarga: "2024-01-16", confianza: 62, estado: "Pendiente de revisión" },
  { id: "doc-5", nombre: "Acuerdo_Confidencialidad.pdf", tipo: "Anexo confidencialidad", empleado: "Ana María Restrepo", empleadoId: "emp-001", fechaCarga: "2025-11-02", confianza: 91, estado: "Aprobado" },
];

export type AlertItem = {
  id: string;
  empleado: string;
  empleadoId: string;
  motivo: string;
  detalle: string;
  fechaLimite: string;
  accionSugerida: string;
  severidad: "alta" | "media" | "baja";
  estado: "abierta" | "atendida";
  norma?: string;
};

export const alertsSeed: AlertItem[] = [
  { id: "al-1", empleado: "Carlos Andrés Gómez", empleadoId: "emp-002", motivo: "Contrato próximo a vencer", detalle: "Vence en 18 días. Requiere preaviso de no prórroga.", fechaLimite: "2026-07-06", accionSugerida: "Emitir preaviso por escrito", severidad: "alta", estado: "abierta", norma: "Art. 46 CST" },
  { id: "al-2", empleado: "Laura Mejía Sánchez", empleadoId: "emp-003", motivo: "Estabilidad reforzada activa", detalle: "Colaboradora con condición de salud reportada en marzo de 2026.", fechaLimite: "2026-07-15", accionSugerida: "Confirmar acompañamiento ocupacional", severidad: "alta", estado: "abierta", norma: "Ley 361 de 1997" },
  { id: "al-3", empleado: "Juan Felipe Ortiz", empleadoId: "emp-004", motivo: "Posible reclasificación contractual", detalle: "Indicios de subordinación detectados en su rutina semanal.", fechaLimite: "2026-08-01", accionSugerida: "Revisión jurídica de relación laboral", severidad: "alta", estado: "abierta", norma: "Art. 23 CST" },
  { id: "al-4", empleado: "Ana María Restrepo", empleadoId: "emp-001", motivo: "Vacaciones acumuladas", detalle: "18 días disponibles desde 2024.", fechaLimite: "2026-09-30", accionSugerida: "Agendar disfrute en próximo trimestre", severidad: "media", estado: "abierta" },
  { id: "al-5", empleado: "Laura Mejía Sánchez", empleadoId: "emp-003", motivo: "Documento pendiente de revisión", detalle: "Otrosí cargado el 30 de mayo aún sin validar.", fechaLimite: "2026-06-25", accionSugerida: "Asignar revisor jurídico", severidad: "media", estado: "abierta" },
  { id: "al-6", empleado: "Carlos Andrés Gómez", empleadoId: "emp-002", motivo: "Liquidación pendiente", detalle: "Liquidación parcial de prestaciones del semestre.", fechaLimite: "2026-07-10", accionSugerida: "Generar borrador deterministra", severidad: "media", estado: "abierta" },
];

export type ReviewItem = {
  id: string;
  tipo: "Extracción documental" | "Explicación de liquidación" | "Análisis de reclasificación" | "Borrador disciplinario" | "Borrador de otrosí";
  empleado: string;
  empleadoId: string;
  fecha: string;
  confianza: number;
  estado: "En cola" | "En revisión" | "Aprobado" | "Rechazado";
  resumenIA: string;
  fuentes: string[];
};

export const reviewSeed: ReviewItem[] = [
  { id: "rv-1", tipo: "Análisis de reclasificación", empleado: "Juan Felipe Ortiz", empleadoId: "emp-004", fecha: "2026-06-15", confianza: 78, estado: "En cola", resumenIA: "Se identifican elementos compatibles con contrato realidad: horarios fijos, herramientas suministradas y subordinación operativa.", fuentes: ["Contrato vigente", "Bitácora semanal abril–mayo", "Correos del 02/05/2026"] },
  { id: "rv-2", tipo: "Borrador disciplinario", empleado: "Carlos Andrés Gómez", empleadoId: "emp-002", fecha: "2026-06-14", confianza: 84, estado: "En revisión", resumenIA: "Propuesta de citación a descargos por incumplimiento reiterado del cierre de cuentas estratégicas.", fuentes: ["Reportes comerciales mayo 2026", "Política comercial 2025"] },
  { id: "rv-3", tipo: "Explicación de liquidación", empleado: "Carlos Andrés Gómez", empleadoId: "emp-002", fecha: "2026-06-13", confianza: 92, estado: "En cola", resumenIA: "Explicación narrativa de la liquidación calculada por el motor determinístico, incluyendo cesantías e intereses.", fuentes: ["Motor de liquidación v2.4", "Art. 249 CST"] },
  { id: "rv-4", tipo: "Extracción documental", empleado: "Laura Mejía Sánchez", empleadoId: "emp-003", fecha: "2026-06-12", confianza: 74, estado: "En cola", resumenIA: "Extracción de cláusulas del otrosí: ajuste salarial y nuevas funciones operativas.", fuentes: ["Otrosi_Laura_Mejia.docx, p. 1–2"] },
];

export type AuditEvent = {
  id: string;
  fecha: string;
  usuario: string;
  rol: string;
  accion: string;
  modulo: string;
  empleado?: string;
  fuente: string;
  modelo: string;
  version: string;
  estado: "Aprobado" | "Rechazado" | "Informativo";
};

export const auditSeed: AuditEvent[] = [
  { id: "au-1", fecha: "2026-06-15 09:42", usuario: "M. Villamil", rol: "Abogada laboral", accion: "Aprobó análisis de reclasificación", modulo: "Revisión jurídica", empleado: "Juan Felipe Ortiz", fuente: "Documento + bitácora", modelo: "labor-extract", version: "v2.4", estado: "Aprobado" },
  { id: "au-2", fecha: "2026-06-15 08:10", usuario: "A. Restrepo", rol: "HR", accion: "Cargó contrato", modulo: "Documentos", empleado: "Carlos Andrés Gómez", fuente: "PDF", modelo: "—", version: "—", estado: "Informativo" },
  { id: "au-3", fecha: "2026-06-14 17:28", usuario: "M. Villamil", rol: "Abogada laboral", accion: "Editó borrador disciplinario", modulo: "Revisión jurídica", empleado: "Carlos Andrés Gómez", fuente: "Sugerencia IA", modelo: "labor-draft", version: "v1.9", estado: "Informativo" },
  { id: "au-4", fecha: "2026-06-14 11:03", usuario: "Sistema", rol: "Motor determinístico", accion: "Generó alerta de preaviso", modulo: "Alertas", empleado: "Carlos Andrés Gómez", fuente: "Regla CST Art. 46", modelo: "rules-engine", version: "v3.1", estado: "Informativo" },
  { id: "au-5", fecha: "2026-06-13 15:46", usuario: "R. Patiño", rol: "Gerente", accion: "Consultó perfil", modulo: "Colaboradores", empleado: "Laura Mejía Sánchez", fuente: "—", modelo: "—", version: "—", estado: "Informativo" },
];

export type ExtractedField = {
  key: string;
  label: string;
  value: string;
  confianza: number;
  fragmento: string;
};

export const sampleExtraction: ExtractedField[] = [
  { key: "nombre", label: "Nombre completo", value: "María Fernanda López Cárdenas", confianza: 96, fragmento: "“…entre el EMPLEADOR y MARÍA FERNANDA LÓPEZ CÁRDENAS, mayor de edad…”" },
  { key: "cedula", label: "Cédula", value: "1.026.554.901", confianza: 94, fragmento: "“…identificada con CC No. 1.026.554.901 de Bogotá…”" },
  { key: "cargo", label: "Cargo", value: "Coordinadora de Cumplimiento", confianza: 88, fragmento: "“…desempeñará el cargo de Coordinadora de Cumplimiento…”" },
  { key: "area", label: "Área", value: "Legal", confianza: 71, fragmento: "“…adscrita al área Legal y de Control Interno…”" },
  { key: "jefe", label: "Jefe inmediato", value: "Margarita Villamil", confianza: 65, fragmento: "“…reportará a la Dirección Jurídica…”" },
  { key: "tipoContrato", label: "Tipo de contrato", value: "Término indefinido", confianza: 93, fragmento: "“…contrato individual de trabajo a término indefinido…”" },
  { key: "fechaInicio", label: "Fecha de inicio", value: "2026-07-01", confianza: 95, fragmento: "“…iniciará labores el primero (1) de julio de 2026…”" },
  { key: "fechaTerminacion", label: "Fecha de terminación", value: "—", confianza: 90, fragmento: "“…contrato a término indefinido, sin fecha de terminación…”" },
  { key: "salario", label: "Salario mensual", value: "$ 7.200.000", confianza: 89, fragmento: "“…asignación básica mensual de SIETE MILLONES DOSCIENTOS MIL PESOS…”" },
  { key: "jornada", label: "Jornada", value: "Lunes a viernes, 8:00 a 17:00", confianza: 82, fragmento: "“…jornada ordinaria de lunes a viernes…”" },
  { key: "prueba", label: "Periodo de prueba", value: "2 meses", confianza: 80, fragmento: "“…periodo de prueba de dos (2) meses…”" },
  { key: "obligaciones", label: "Obligaciones principales", value: "Cumplimiento normativo, reportes a junta, auditorías internas", confianza: 70, fragmento: "“…velar por el cumplimiento normativo y presentar reportes…”" },
  { key: "clausulas", label: "Cláusulas relevantes", value: "Confidencialidad, exclusividad, propiedad intelectual", confianza: 76, fragmento: "“…cláusulas de confidencialidad y exclusividad…”" },
  { key: "riesgo", label: "Nivel de riesgo inicial", value: "Bajo", confianza: 68, fragmento: "Estimado por el modelo a partir de tipo de contrato y cláusulas." },
];

export const fuerosOptions = [
  "Estabilidad reforzada por salud",
  "Fuero de maternidad o lactancia",
  "Fuero sindical",
  "Pre-pensionado",
  "Denunciante o testigo de acoso laboral",
];
