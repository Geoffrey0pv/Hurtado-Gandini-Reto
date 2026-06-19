// src/rules/jornada.ts — Validacion de jornada maxima (Ley 2101 de 2021).
// Reduccion gradual de 48h a 42h semanales. Sin IA: regla pura por fecha.

// Hitos de la reduccion (cada uno entra en vigor el 15 de julio del anio).
function hito(anio: number): Date {
  return new Date(`${anio}-07-15T00:00:00.000Z`);
}

// Jornada maxima legal vigente en una fecha dada.
export function maxJornadaSemanal(fecha: Date = new Date()): number {
  if (fecha < hito(2023)) return 48;
  if (fecha < hito(2024)) return 47;
  if (fecha < hito(2025)) return 46;
  if (fecha < hito(2026)) return 44;
  return 42; // desde el 15-jul-2026
}

export interface JornadaResult {
  horasSemana: number;
  maxLegal: number;
  cumple: boolean;
  excesoHoras: number;
  baseLegal: string;
  mensaje: string;
}

export function validarJornada(horasSemana: number, fecha: Date = new Date()): JornadaResult {
  const maxLegal = maxJornadaSemanal(fecha);
  const excesoHoras = Math.max(0, horasSemana - maxLegal);
  const cumple = excesoHoras === 0;
  return {
    horasSemana,
    maxLegal,
    cumple,
    excesoHoras,
    baseLegal: "Ley 2101 de 2021",
    mensaje: cumple
      ? `Jornada conforme: ${horasSemana}h <= ${maxLegal}h vigentes.`
      : `Jornada excede el maximo legal en ${excesoHoras}h (pactadas ${horasSemana}h, maximo ${maxLegal}h).`,
  };
}
