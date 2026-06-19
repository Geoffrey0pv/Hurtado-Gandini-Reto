// src/rules/prestaciones.ts — Calculo DETERMINISTA de prestaciones sociales.
// Sin IA: el LLM extrae salario/fechas; AQUI se calcula con formula y se cita
// la base legal. Cada resultado lleva su formula para trazabilidad ante el jurado.
import {
  DIAS_ANIO_COMERCIAL,
  SMMLV_2025,
  TASA_INTERESES_CESANTIAS,
  UMBRAL_INDEMNIZACION_SMMLV,
} from "./constants.js";

const redondear = (n: number) => Math.round(n * 100) / 100;

export interface ConceptoLiquidacion {
  concepto: string;
  valor: number;
  formula: string;
  baseLegal: string;
}

// ── Cesantias: 1 mes de salario por anio = salarioBase * dias / 360 ──
export function cesantias(salarioBase: number, dias: number): ConceptoLiquidacion {
  const valor = redondear((salarioBase * dias) / DIAS_ANIO_COMERCIAL);
  return {
    concepto: "Cesantias",
    valor,
    formula: `(${salarioBase} * ${dias}) / 360`,
    baseLegal: "Art. 249 CST (equivale a 8,33% mensual)",
  };
}

// ── Intereses sobre cesantias: 12% anual proporcional a los dias ──
export function interesesCesantias(valorCesantias: number, dias: number): ConceptoLiquidacion {
  const valor = redondear((valorCesantias * dias * TASA_INTERESES_CESANTIAS) / DIAS_ANIO_COMERCIAL);
  return {
    concepto: "Intereses sobre cesantias",
    valor,
    formula: `(${valorCesantias} * ${dias} * 0.12) / 360`,
    baseLegal: "Ley 52 de 1975 (12% anual)",
  };
}

// ── Prima de servicios: 1 mes de salario por anio (igual base que cesantias) ──
export function prima(salarioBase: number, dias: number): ConceptoLiquidacion {
  const valor = redondear((salarioBase * dias) / DIAS_ANIO_COMERCIAL);
  return {
    concepto: "Prima de servicios",
    valor,
    formula: `(${salarioBase} * ${dias}) / 360`,
    baseLegal: "Art. 306 CST",
  };
}

// ── Vacaciones: 15 dias de salario por anio = salario * dias / 720 ──
// (No incluye auxilio de transporte en la base.)
export function vacaciones(salarioSinAuxilio: number, dias: number): ConceptoLiquidacion {
  const valor = redondear((salarioSinAuxilio * dias) / (DIAS_ANIO_COMERCIAL * 2));
  return {
    concepto: "Vacaciones",
    valor,
    formula: `(${salarioSinAuxilio} * ${dias}) / 720`,
    baseLegal: "Art. 186 CST (15 dias habiles por anio)",
  };
}

// ── Indemnizacion por despido sin justa causa, contrato a TERMINO INDEFINIDO ──
// Art. 64 CST: salario < 10 SMMLV -> 30 dias primer anio + 20 por anio adicional.
//              salario >= 10 SMMLV -> 20 dias primer anio + 15 por anio adicional.
export function indemnizacionIndefinido(
  salarioMensual: number,
  diasTrabajados: number,
  smmlv: number = SMMLV_2025,
): ConceptoLiquidacion {
  const anios = diasTrabajados / DIAS_ANIO_COMERCIAL;
  const bajoUmbral = salarioMensual < UMBRAL_INDEMNIZACION_SMMLV * smmlv;
  const diasPrimerAnio = bajoUmbral ? 30 : 20;
  const diasAdicional = bajoUmbral ? 20 : 15;

  // Primer anio (o su fraccion proporcional) + adicionales proporcionales.
  const diasIndem =
    anios <= 1 ? diasPrimerAnio * anios : diasPrimerAnio + diasAdicional * (anios - 1);

  const salarioDiario = salarioMensual / 30;
  const valor = redondear(salarioDiario * diasIndem);
  return {
    concepto: "Indemnizacion despido sin justa causa (indefinido)",
    valor,
    formula: `(${salarioMensual}/30) * ${redondear(diasIndem)} dias [${bajoUmbral ? "<" : ">="}10 SMMLV]`,
    baseLegal: "Art. 64 CST",
  };
}

// ── Indemnizacion contrato a TERMINO FIJO: salarios del tiempo faltante ──
export function indemnizacionTerminoFijo(
  salarioMensual: number,
  diasFaltantes: number,
): ConceptoLiquidacion {
  const valor = redondear((salarioMensual / 30) * Math.max(0, diasFaltantes));
  return {
    concepto: "Indemnizacion despido sin justa causa (termino fijo)",
    valor,
    formula: `(${salarioMensual}/30) * ${Math.max(0, diasFaltantes)} dias faltantes`,
    baseLegal: "Art. 64 CST (valor de los salarios del tiempo faltante)",
  };
}

export interface LiquidacionResult {
  diasTrabajados: number;
  salarioBase: number;
  conceptos: ConceptoLiquidacion[];
  total: number;
}

// Liquidacion definitiva (sin indemnizacion: esa depende del motivo de retiro).
// salarioBase = salario + auxilio de transporte (si aplica) para cesantias/prima.
export function liquidacionDefinitiva(params: {
  salarioMensual: number;
  diasTrabajados: number;
  auxilioTransporte?: number;
}): LiquidacionResult {
  const { salarioMensual, diasTrabajados, auxilioTransporte = 0 } = params;
  const salarioBase = salarioMensual + auxilioTransporte;

  const c = cesantias(salarioBase, diasTrabajados);
  const i = interesesCesantias(c.valor, diasTrabajados);
  const p = prima(salarioBase, diasTrabajados);
  const v = vacaciones(salarioMensual, diasTrabajados); // sin auxilio

  const conceptos = [c, i, p, v];
  const total = redondear(conceptos.reduce((s, x) => s + x.valor, 0));
  return { diasTrabajados, salarioBase, conceptos, total };
}
