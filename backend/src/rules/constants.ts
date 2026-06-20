// src/rules/constants.ts — Constantes legales (Colombia) y utilidades de fechas.
// Centralizadas para trazabilidad: si cambia la ley/anio, se ajusta aqui.

// Salario minimo mensual legal vigente. Default 2025; pasarlo como parametro
// para periodos distintos. (2025 = 1.423.500)
export const SMMLV_2025 = 1_423_500;

// Auxilio de transporte 2025. Aplica a salarios <= 2 SMMLV.
export const AUXILIO_TRANSPORTE_2025 = 200_000;

// Valores 2026 (Decretos 1469 y 1470 de 2025). El auxilio de transporte aplica a
// salarios <= 2 SMMLV y ENTRA en la base de cesantias y prima (no en vacaciones).
export const SMMLV_2026 = 1_750_905;
export const AUXILIO_TRANSPORTE_2026 = 249_095;

// Devuelve el auxilio de transporte aplicable a un salario (0 si lo supera el tope).
export function auxilioTransporteAplicable(
  salarioMensual: number,
  smmlv: number = SMMLV_2026,
  auxilio: number = AUXILIO_TRANSPORTE_2026,
): number {
  return salarioMensual > 0 && salarioMensual <= 2 * smmlv ? auxilio : 0;
}

// Tasas de prestaciones sociales.
export const TASA_INTERESES_CESANTIAS = 0.12; // 12% anual sobre cesantias
export const DIAS_ANIO_COMERCIAL = 360; // convencion 360 dias / mes de 30

// Umbral art. 64 CST para la indemnizacion por despido sin justa causa.
export const UMBRAL_INDEMNIZACION_SMMLV = 10;

const MS_DIA = 1000 * 60 * 60 * 24;

// Dias calendario entre dos fechas (para alertas de vencimiento).
export function diasCalendario(desde: Date, hasta: Date): number {
  return Math.floor((hasta.getTime() - desde.getTime()) / MS_DIA);
}

// Dias por convencion 30/360 (la que usa la liquidacion laboral colombiana:
// meses de 30 dias, anio de 360), variante US/NASD: el dia 31 del fin SOLO se topa
// a 30 cuando el dia de inicio tambien es 30/31. Asi, del 1-ene al 31-dic da 360
// (un anio completo), igual que el calculo manual de liquidacion.
export function dias360(desde: Date, hasta: Date): number {
  let d1 = desde.getUTCDate();
  let d2 = hasta.getUTCDate();
  if (d1 === 31) d1 = 30;
  if (d2 === 31 && d1 === 30) d2 = 30;
  return (
    (hasta.getUTCFullYear() - desde.getUTCFullYear()) * 360 +
    (hasta.getUTCMonth() - desde.getUTCMonth()) * 30 +
    (d2 - d1)
  );
}

// Parseo seguro de fecha 'YYYY-MM-DD' a Date UTC.
export function parseISODate(s: string): Date {
  return new Date(`${s}T00:00:00.000Z`);
}
