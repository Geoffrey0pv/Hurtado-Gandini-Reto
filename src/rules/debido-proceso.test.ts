import { test } from "node:test";
import assert from "node:assert/strict";
import {
  evaluarDebidoProceso,
  PASOS_DEBIDO_PROCESO,
} from "./debido-proceso.js";

test("debido proceso: todos los pasos cumplidos => cumple 100%", () => {
  const todos = Object.fromEntries(PASOS_DEBIDO_PROCESO.map((p) => [p.clave, true]));
  const r = evaluarDebidoProceso(todos);
  assert.equal(r.cumple, true);
  assert.equal(r.faltantes.length, 0);
  assert.equal(r.porcentaje, 100);
});

test("debido proceso: ninguno => no cumple, 0%", () => {
  const r = evaluarDebidoProceso({});
  assert.equal(r.cumple, false);
  assert.equal(r.completados, 0);
  assert.equal(r.faltantes.length, PASOS_DEBIDO_PROCESO.length);
});

test("debido proceso: faltando un paso clave => no cumple y lo reporta", () => {
  const casi = Object.fromEntries(PASOS_DEBIDO_PROCESO.map((p) => [p.clave, true]));
  casi["derecho_defensa"] = false;
  const r = evaluarDebidoProceso(casi);
  assert.equal(r.cumple, false);
  assert.equal(r.faltantes.length, 1);
  assert.equal(r.faltantes[0].clave, "derecho_defensa");
});

test("debido proceso: porcentaje intermedio correcto", () => {
  const pasos: Record<string, boolean> = {};
  PASOS_DEBIDO_PROCESO.slice(0, 4).forEach((p) => (pasos[p.clave] = true));
  const r = evaluarDebidoProceso(pasos);
  assert.equal(r.completados, 4);
  assert.equal(r.porcentaje, 50); // 4 de 8
});

test("cada paso del checklist incluye base legal", () => {
  for (const p of PASOS_DEBIDO_PROCESO) {
    assert.ok(p.baseLegal.length > 0);
  }
});
