import { test } from "node:test";
import assert from "node:assert/strict";
import { analizarContrato } from "./analisis.js";

const HOY = new Date("2026-06-18T00:00:00.000Z");

test("analisis completo: termino fijo con todos los datos", () => {
  const r = analizarContrato(
    {
      tipoContrato: "TERMINO_FIJO",
      salario: 3_000_000,
      fechaInicio: "2024-01-15",
      fechaFin: "2026-07-10",
      jornadaHorasSemana: 48,
    },
    HOY,
  );
  assert.equal(r.metodo, "REGLA_DETERMINISTA");
  // jornada 48h excede el max 2026 (44h)
  assert.equal("cumple" in r.jornada && r.jornada.cumple, false);
  // liquidacion aplica
  assert.ok("total" in r.liquidacion && r.liquidacion.total > 0);
  // tres alertas (fechaFin presente): vencimiento + liquidacion pendiente + vacaciones
  assert.equal(r.alertas.length, 3);
});

test("analisis: sin datos suficientes marca aplica:false", () => {
  const r = analizarContrato({ salario: null, fechaInicio: null, jornadaHorasSemana: null }, HOY);
  assert.equal("aplica" in r.jornada && r.jornada.aplica, false);
  assert.equal("aplica" in r.liquidacion && r.liquidacion.aplica, false);
  assert.equal(r.alertas.length, 0);
});

test("caso ideal: termino fijo 2026 completo (1-ene a 31-dic), salario minimo + auxilio", () => {
  const r = analizarContrato(
    {
      tipoContrato: "TERMINO_FIJO",
      salario: 1_750_905, // SMMLV 2026
      fechaInicio: "2026-01-01",
      fechaFin: "2026-12-31",
      jornadaHorasSemana: 44,
    },
    new Date("2026-12-31T00:00:00.000Z"), // se liquida al terminar el contrato
  );
  const liq = r.liquidacion;
  if (!("conceptos" in liq)) throw new Error("la liquidacion deberia aplicar");
  const conceptos = liq.conceptos;
  const get = (n: string) => conceptos.find((c) => c.concepto === n)?.valor;
  // base = salario + auxilio = 1.750.905 + 249.095 = 2.000.000 ; dias = 360 (anio completo)
  assert.equal(liq.diasTrabajados, 360);
  assert.equal(get("Cesantias"), 2_000_000);
  assert.equal(get("Intereses sobre cesantias"), 240_000);
  assert.equal(get("Prima de servicios"), 2_000_000);
  assert.equal(get("Vacaciones"), 875_452.5); // (1.750.905 * 360) / 720, sin auxilio
  assert.equal(liq.total, 5_115_452.5);
});

test("analisis: indefinido calcula indemnizacion estimada", () => {
  const r = analizarContrato(
    { tipoContrato: "TERMINO_INDEFINIDO", salario: 3_000_000, fechaInicio: "2024-06-18" },
    HOY,
  );
  assert.ok("indemnizacionEstimada" in r.liquidacion && r.liquidacion.indemnizacionEstimada);
});
