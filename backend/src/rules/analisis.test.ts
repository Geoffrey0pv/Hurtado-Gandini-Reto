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

test("analisis: indefinido calcula indemnizacion estimada", () => {
  const r = analizarContrato(
    { tipoContrato: "TERMINO_INDEFINIDO", salario: 3_000_000, fechaInicio: "2024-06-18" },
    HOY,
  );
  assert.ok("indemnizacionEstimada" in r.liquidacion && r.liquidacion.indemnizacionEstimada);
});
