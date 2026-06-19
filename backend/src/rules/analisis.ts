// src/rules/analisis.ts — Agrega las reglas deterministas sobre los datos de
// un contrato ya extraidos. Funcion pura (sin IA, sin DB) => facil de testear.
import { dias360, parseISODate } from "./constants.js";
import { validarJornada, type JornadaResult } from "./jornada.js";
import {
  alertaVacaciones,
  alertaVencimientoContrato,
  type Alerta,
} from "./alertas.js";
import {
  indemnizacionIndefinido,
  indemnizacionTerminoFijo,
  liquidacionDefinitiva,
  type ConceptoLiquidacion,
  type LiquidacionResult,
} from "./prestaciones.js";

export interface DatosContrato {
  tipoContrato?: string | null;
  salario?: number | null;
  fechaInicio?: string | null; // YYYY-MM-DD
  fechaFin?: string | null;
  jornadaHorasSemana?: number | null;
}

export interface AnalisisContrato {
  generadoEn: string;
  metodo: "REGLA_DETERMINISTA"; // explicito: NO es IA
  jornada: JornadaResult | { aplica: false; motivo: string };
  liquidacion:
    | (LiquidacionResult & { indemnizacionEstimada?: ConceptoLiquidacion })
    | { aplica: false; motivo: string };
  alertas: Alerta[];
}

export function analizarContrato(
  datos: DatosContrato,
  hoy: Date = new Date(),
): AnalisisContrato {
  const alertas: Alerta[] = [];

  // ── Jornada ──
  const jornada =
    datos.jornadaHorasSemana != null
      ? validarJornada(datos.jornadaHorasSemana, hoy)
      : { aplica: false as const, motivo: "Sin dato de jornada en el contrato." };

  // ── Liquidacion estimada ──
  let liquidacion: AnalisisContrato["liquidacion"];
  if (datos.salario != null && datos.fechaInicio) {
    const inicio = parseISODate(datos.fechaInicio);
    const fin = datos.fechaFin ? parseISODate(datos.fechaFin) : hoy;
    const diasTrabajados = Math.max(0, dias360(inicio, fin));
    const base = liquidacionDefinitiva({ salarioMensual: datos.salario, diasTrabajados });

    // Indemnizacion estimada segun tipo de contrato.
    let indemnizacionEstimada: ConceptoLiquidacion | undefined;
    if (datos.tipoContrato === "TERMINO_INDEFINIDO") {
      indemnizacionEstimada = indemnizacionIndefinido(datos.salario, diasTrabajados);
    } else if (datos.tipoContrato === "TERMINO_FIJO" && datos.fechaFin) {
      const diasFaltantes = dias360(hoy, parseISODate(datos.fechaFin));
      indemnizacionEstimada = indemnizacionTerminoFijo(datos.salario, diasFaltantes);
    }
    liquidacion = { ...base, indemnizacionEstimada };
  } else {
    liquidacion = { aplica: false, motivo: "Falta salario o fecha de inicio." };
  }

  // ── Alertas ──
  if (datos.fechaFin) {
    alertas.push(alertaVencimientoContrato(parseISODate(datos.fechaFin), hoy));
  }
  if (datos.fechaInicio) {
    alertas.push(alertaVacaciones(parseISODate(datos.fechaInicio), hoy));
  }

  return {
    generadoEn: hoy.toISOString(),
    metodo: "REGLA_DETERMINISTA",
    jornada,
    liquidacion,
    alertas,
  };
}
