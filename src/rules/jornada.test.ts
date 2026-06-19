import { test } from "node:test";
import assert from "node:assert/strict";
import { maxJornadaSemanal, validarJornada } from "./jornada.js";

const d = (s: string) => new Date(`${s}T00:00:00.000Z`);

test("maxJornada: antes de la reforma = 48h", () => {
  assert.equal(maxJornadaSemanal(d("2023-01-01")), 48);
});

test("maxJornada: 2024 (entre hitos) = 46h", () => {
  assert.equal(maxJornadaSemanal(d("2024-08-01")), 46);
});

test("maxJornada: junio 2026 (antes del 15-jul) = 44h", () => {
  assert.equal(maxJornadaSemanal(d("2026-06-18")), 44);
});

test("maxJornada: desde 15-jul-2026 = 42h", () => {
  assert.equal(maxJornadaSemanal(d("2026-07-15")), 42);
});

test("validarJornada: 48h en 2026 excede el maximo (44h)", () => {
  const r = validarJornada(48, d("2026-06-18"));
  assert.equal(r.cumple, false);
  assert.equal(r.maxLegal, 44);
  assert.equal(r.excesoHoras, 4);
});

test("validarJornada: 42h cumple a partir de jul-2026", () => {
  const r = validarJornada(42, d("2026-08-01"));
  assert.equal(r.cumple, true);
  assert.equal(r.excesoHoras, 0);
});

test("validarJornada: incluye base legal Ley 2101/2021", () => {
  assert.match(validarJornada(40).baseLegal, /2101/);
});
