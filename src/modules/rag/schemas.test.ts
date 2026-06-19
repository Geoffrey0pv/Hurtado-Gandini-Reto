// src/modules/rag/schemas.test.ts — Doble red de seguridad de la respuesta RAG.
// El LLM puede devolver severidades fuera de rango, confianza invalida o claves
// faltantes. RagResponseSchema debe SANEAR (no descartar) para que la respuesta
// al usuario sea siempre bien tipada. Trazabilidad y robustez para el jurado.
import assert from "node:assert/strict";
import { test } from "node:test";
import { RagResponseSchema, RagRiskItemSchema } from "../../shared/schemas.js";

test("RagResponseSchema: aplica defaults cuando faltan arrays", () => {
  const r = RagResponseSchema.parse({ resumen: "ok", confianza: 0.4 });
  assert.deepEqual(r.riesgos, []);
  assert.deepEqual(r.abstenciones, []);
});

test("RagResponseSchema: confianza fuera de rango cae a 0.5 (catch)", () => {
  const r = RagResponseSchema.parse({ resumen: "ok", confianza: 9 });
  assert.equal(r.confianza, 0.5);
});

test("RagRiskItemSchema: severidad invalida cae a 'media' (catch)", () => {
  const item = RagRiskItemSchema.parse({
    descripcion: "x",
    severidad: "catastrofica",
    recomendacion: "y",
  });
  assert.equal(item.severidad, "media");
  assert.deepEqual(item.fuentesCitadas, []);
});

test("RagResponseSchema: respuesta valida pasa intacta", () => {
  const input = {
    riesgos: [
      {
        descripcion: "Jornada de 48h excede el maximo legal",
        severidad: "alta" as const,
        fuentesCitadas: ["FUENTE 1"],
        recomendacion: "Ajustar a 42h",
      },
    ],
    resumen: "Se detecto 1 riesgo",
    abstenciones: [],
    confianza: 0.8,
  };
  assert.deepEqual(RagResponseSchema.parse(input), input);
});
