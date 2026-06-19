import { test } from "node:test";
import assert from "node:assert/strict";
import {
  alertaVencimientoContrato,
  alertaVacaciones,
  alertaSeguridadSocial,
} from "./alertas.js";

const d = (s: string) => new Date(`${s}T00:00:00.000Z`);

test("vencimiento contrato: vencido => CRITICA y dias negativos", () => {
  const r = alertaVencimientoContrato(d("2026-06-01"), d("2026-06-18"));
  assert.equal(r.severidad, "CRITICA");
  assert.ok(r.diasRestantes !== null && r.diasRestantes < 0);
});

test("vencimiento contrato: dentro del preaviso (<=30 dias) => ADVERTENCIA", () => {
  const r = alertaVencimientoContrato(d("2026-07-10"), d("2026-06-18"));
  assert.equal(r.severidad, "ADVERTENCIA");
  assert.equal(r.diasRestantes, 22);
});

test("vencimiento contrato: lejano => OK", () => {
  const r = alertaVencimientoContrato(d("2026-12-31"), d("2026-06-18"));
  assert.equal(r.severidad, "OK");
});

test("vacaciones: 2+ periodos sin disfrutar => CRITICA", () => {
  const r = alertaVacaciones(d("2024-01-01"), d("2026-06-18"));
  assert.equal(r.severidad, "CRITICA");
});

test("vacaciones: 1 periodo => ADVERTENCIA", () => {
  const r = alertaVacaciones(d("2025-01-01"), d("2026-06-18"));
  assert.equal(r.severidad, "ADVERTENCIA");
});

test("vacaciones: menos de un anio => OK", () => {
  const r = alertaVacaciones(d("2026-01-01"), d("2026-06-18"));
  assert.equal(r.severidad, "OK");
});

test("seguridad social: pago vencido => CRITICA", () => {
  const r = alertaSeguridadSocial(d("2026-06-18"), 10);
  assert.equal(r.severidad, "CRITICA");
});

test("seguridad social: faltan pocos dias => ADVERTENCIA", () => {
  const r = alertaSeguridadSocial(d("2026-06-08"), 10);
  assert.equal(r.severidad, "ADVERTENCIA");
  assert.equal(r.diasRestantes, 2);
});
