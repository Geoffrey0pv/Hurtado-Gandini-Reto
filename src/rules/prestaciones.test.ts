import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cesantias,
  interesesCesantias,
  prima,
  vacaciones,
  indemnizacionIndefinido,
  indemnizacionTerminoFijo,
  liquidacionDefinitiva,
} from "./prestaciones.js";

// Salario 3.000.000, 1 anio completo (360 dias) => numeros redondos.
const SAL = 3_000_000;

test("cesantias: 1 mes de salario por anio completo", () => {
  assert.equal(cesantias(SAL, 360).valor, 3_000_000);
});

test("cesantias: medio anio = mitad", () => {
  assert.equal(cesantias(SAL, 180).valor, 1_500_000);
});

test("intereses cesantias: 12% anual sobre cesantias", () => {
  const c = cesantias(SAL, 360).valor; // 3.000.000
  assert.equal(interesesCesantias(c, 360).valor, 360_000); // 12%
});

test("prima de servicios: 1 mes por anio", () => {
  assert.equal(prima(SAL, 360).valor, 3_000_000);
});

test("vacaciones: 15 dias de salario por anio = salario/2", () => {
  assert.equal(vacaciones(SAL, 360).valor, 1_500_000);
});

test("indemnizacion indefinido < 10 SMMLV, 2 anios: 30 + 20 = 50 dias", () => {
  // salarioDiario = 100.000 ; 50 dias => 5.000.000
  const r = indemnizacionIndefinido(SAL, 720);
  assert.equal(r.valor, 5_000_000);
});

test("indemnizacion indefinido < 10 SMMLV, 1 anio: 30 dias", () => {
  const r = indemnizacionIndefinido(SAL, 360);
  assert.equal(r.valor, 3_000_000); // 100.000 * 30
});

test("indemnizacion indefinido >= 10 SMMLV usa 20 dias primer anio", () => {
  const salarioAlto = 20_000_000; // > 10 * 1.423.500
  const r = indemnizacionIndefinido(salarioAlto, 360);
  // salarioDiario = 666.666,67 ; 20 dias => 13.333.333,33
  assert.equal(r.valor, Math.round((salarioAlto / 30) * 20 * 100) / 100);
});

test("indemnizacion termino fijo: salarios del tiempo faltante", () => {
  // 90 dias faltantes, salarioDiario 100.000 => 9.000.000
  assert.equal(indemnizacionTerminoFijo(SAL, 90).valor, 9_000_000);
});

test("indemnizacion termino fijo: dias negativos => 0", () => {
  assert.equal(indemnizacionTerminoFijo(SAL, -10).valor, 0);
});

test("liquidacion definitiva: suma de conceptos (1 anio, sin auxilio)", () => {
  const r = liquidacionDefinitiva({ salarioMensual: SAL, diasTrabajados: 360 });
  // cesantias 3M + intereses 360k + prima 3M + vacaciones 1.5M = 7.860.000
  assert.equal(r.total, 7_860_000);
  assert.equal(r.conceptos.length, 4);
});

test("liquidacion: auxilio de transporte entra en la base de cesantias/prima pero no en vacaciones", () => {
  const r = liquidacionDefinitiva({
    salarioMensual: SAL,
    diasTrabajados: 360,
    auxilioTransporte: 200_000,
  });
  const ces = r.conceptos.find((c) => c.concepto === "Cesantias");
  const vac = r.conceptos.find((c) => c.concepto === "Vacaciones");
  assert.equal(ces?.valor, 3_200_000); // (3.2M * 360)/360
  assert.equal(vac?.valor, 1_500_000); // sin auxilio
});

test("cada concepto incluye formula y base legal (trazabilidad)", () => {
  const c = cesantias(SAL, 360);
  assert.ok(c.formula.length > 0);
  assert.match(c.baseLegal, /CST|Ley/);
});
