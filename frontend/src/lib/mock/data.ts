// Tipos y calculadoras de dominio de VinApp (contexto laboral colombiano).
// NOTA: este archivo ya NO contiene datos "seed" mock; toda la data viene de la
// API real. Solo permanecen tipos compartidos (Employee, etc.) y las funciones
// de cálculo determinista usadas por la UI.

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
  // Id del contrato "vigente" (DONE más reciente) si existe. Permite consultar
  // el análisis determinista del backend (GET /contratos/:id/analisis).
  contratoId?: string | null;
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
