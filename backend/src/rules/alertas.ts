// src/rules/alertas.ts — Alertas de vencimiento (deterministas).
// Vencimiento de contrato a termino fijo (con preaviso), vacaciones acumuladas
// y proximo pago de seguridad social.
import { diasCalendario } from "./constants.js";

export type Severidad = "OK" | "INFO" | "ADVERTENCIA" | "CRITICA";

export interface Alerta {
  tipo: string;
  severidad: Severidad;
  diasRestantes: number | null;
  mensaje: string;
  baseLegal?: string;
}

// ── Vencimiento de contrato a termino fijo ──
// Preaviso de 30 dias: si no se avisa la no-renovacion con 30 dias de
// antelacion, el contrato se prorroga automaticamente (Art. 46 CST).
export function alertaVencimientoContrato(
  fechaFin: Date,
  hoy: Date = new Date(),
  preavisoDias = 30,
): Alerta {
  const diasRestantes = diasCalendario(hoy, fechaFin);

  if (diasRestantes < 0) {
    return {
      tipo: "VENCIMIENTO_CONTRATO",
      severidad: "CRITICA",
      diasRestantes,
      mensaje: `El contrato vencio hace ${Math.abs(diasRestantes)} dias. Verifique prorroga o liquidacion.`,
      baseLegal: "Art. 46 CST",
    };
  }
  if (diasRestantes <= preavisoDias) {
    return {
      tipo: "VENCIMIENTO_CONTRATO",
      severidad: "ADVERTENCIA",
      diasRestantes,
      mensaje: `Vence en ${diasRestantes} dias. Dentro del plazo de preaviso (${preavisoDias} dias): decida renovacion o no-renovacion YA.`,
      baseLegal: "Art. 46 CST",
    };
  }
  return {
    tipo: "VENCIMIENTO_CONTRATO",
    severidad: diasRestantes <= preavisoDias * 2 ? "INFO" : "OK",
    diasRestantes,
    mensaje: `Vence en ${diasRestantes} dias.`,
    baseLegal: "Art. 46 CST",
  };
}

// ── Vacaciones acumuladas ──
// Se causan 15 dias habiles por anio. Acumular mas de 1 periodo sin disfrutar
// es una contingencia (Art. 187 CST). Alerta segun antiguedad sin vacaciones.
export function alertaVacaciones(
  fechaInicioOUltimasVacaciones: Date,
  hoy: Date = new Date(),
): Alerta {
  const dias = diasCalendario(fechaInicioOUltimasVacaciones, hoy);
  const periodos = Math.floor(dias / 365);

  if (periodos >= 2) {
    return {
      tipo: "VACACIONES_ACUMULADAS",
      severidad: "CRITICA",
      diasRestantes: null,
      mensaje: `${periodos} periodos de vacaciones acumulados sin disfrutar. Riesgo de acumulacion (Art. 187 CST).`,
      baseLegal: "Art. 187 CST",
    };
  }
  if (periodos >= 1) {
    return {
      tipo: "VACACIONES_ACUMULADAS",
      severidad: "ADVERTENCIA",
      diasRestantes: null,
      mensaje: "Tiene un periodo de vacaciones causado pendiente de programar.",
      baseLegal: "Art. 187 CST",
    };
  }
  return {
    tipo: "VACACIONES_ACUMULADAS",
    severidad: "OK",
    diasRestantes: null,
    mensaje: "Sin vacaciones vencidas.",
    baseLegal: "Art. 187 CST",
  };
}

// ── Proximo pago de seguridad social ──
// Las planillas vencen segun el ultimo digito del NIT; aqui usamos un dia de
// corte simple (parametrizable) para recordar el pago del mes.
export function alertaSeguridadSocial(
  hoy: Date = new Date(),
  diaPago = 10,
): Alerta {
  const dia = hoy.getUTCDate();
  const diasRestantes = diaPago - dia;

  if (diasRestantes < 0) {
    return {
      tipo: "SEGURIDAD_SOCIAL",
      severidad: "CRITICA",
      diasRestantes,
      mensaje: `El pago de seguridad social del mes (dia ${diaPago}) esta vencido por ${Math.abs(diasRestantes)} dias.`,
    };
  }
  return {
    tipo: "SEGURIDAD_SOCIAL",
    severidad: diasRestantes <= 3 ? "ADVERTENCIA" : "OK",
    diasRestantes,
    mensaje: `Faltan ${diasRestantes} dias para el pago de seguridad social (dia ${diaPago}).`,
  };
}
