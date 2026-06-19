// src/lib/llm.ts — Ollama: extract(), generate(), embed().
// Doble red de seguridad: se pasa el JSON Schema (derivado de Zod) al
// parametro `format` de Ollama y luego se VUELVE a validar con Zod.
//
// LLM_MODE=mock produce salidas deterministas (regex + vector pseudo-aleatorio)
// para correr el pipeline end-to-end sin modelos descargados. Cuando hay
// modelos (`ollama pull ...`), LLM_MODE=ollama usa inferencia real.
import { Ollama } from "ollama";
import { z } from "zod";
import { env } from "../config/env.js";
import { ExtractionSchema, type Extraction } from "../shared/schemas.js";

const ollama = new Ollama({ host: env.OLLAMA_HOST });

// Zod v4 trae conversion nativa a JSON Schema (reemplaza a zod-to-json-schema,
// que no es compatible con Zod v4). Misma intencion del spec.
const extractionJsonSchema = z.toJSONSchema(ExtractionSchema);

const SYSTEM_PROMPT =
  "Eres un asistente juridico experto en derecho laboral colombiano. " +
  "Extrae EXACTAMENTE los campos del contrato laboral. Responde SOLO el JSON " +
  "del schema. Si un dato no aparece en el texto, ponlo en null; NUNCA lo inventes. " +
  "Las fechas en formato YYYY-MM-DD. El salario como numero sin separadores.";

export interface ExtractionResult {
  data: Extraction;
  model: string;
}

// ── Extraccion estructurada ───────────────────────────────────────────
export async function extractContract(
  text: string,
  complex = false,
): Promise<ExtractionResult> {
  const model = complex ? env.OLLAMA_MODEL_COMPLEX : env.OLLAMA_MODEL;

  if (env.LLM_MODE === "mock") {
    return { data: mockExtraction(text), model: `mock:${model}` };
  }

  const res = await ollama.chat({
    model,
    format: extractionJsonSchema as Record<string, unknown>,
    options: { temperature: 0 }, // determinismo
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: text.slice(0, 12000) }, // recorte defensivo de contexto
    ],
  });
  // Validacion dura: si el modelo se sale del schema, ZodError -> el worker
  // marca FAILED y NO persiste basura.
  const data = ExtractionSchema.parse(JSON.parse(res.message.content));
  return { data, model };
}

// ── Embeddings ────────────────────────────────────────────────────────
export async function embed(text: string): Promise<number[]> {
  if (env.LLM_MODE === "mock") {
    return mockEmbedding(text);
  }
  const res = await ollama.embeddings({ model: env.EMBED_MODEL, prompt: text });
  return res.embedding;
}

// ── Generacion libre (para RAG de la Hora 18-22) ──────────────────────
export async function generate(prompt: string, complex = true): Promise<string> {
  const model = complex ? env.OLLAMA_MODEL_COMPLEX : env.OLLAMA_MODEL;
  if (env.LLM_MODE === "mock") {
    return `(mock) respuesta generada para: ${prompt.slice(0, 80)}...`;
  }
  const res = await ollama.generate({ model, prompt, options: { temperature: 0 } });
  return res.response;
}

// ── Mocks deterministas ───────────────────────────────────────────────
function mockExtraction(text: string): Extraction {
  const t = text.toLowerCase();
  const pick = (re: RegExp): string | null => text.match(re)?.[1]?.trim() ?? null;

  const cedula = pick(/c[eé]dula[:\s]*([0-9.]{5,})/i)?.replace(/\./g, "") ?? null;
  const nombre = pick(/(?:trabajador|colaborador|empleado)[:\s]+([A-Za-zÁÉÍÓÚÑáéíóúñ ]{3,40})/i);
  const salarioRaw = pick(/salario[:\s]*\$?\s*([0-9.,]{4,})/i);
  const salario = salarioRaw ? Number(salarioRaw.replace(/[.,]/g, "")) : null;

  let tipoContrato: Extraction["tipoContrato"] = null;
  if (t.includes("t[eé]rmino fijo") || t.includes("termino fijo")) tipoContrato = "TERMINO_FIJO";
  else if (t.includes("indefinido")) tipoContrato = "TERMINO_INDEFINIDO";
  else if (t.includes("obra") || t.includes("labor")) tipoContrato = "OBRA_LABOR";
  else if (t.includes("prestaci")) tipoContrato = "PRESTACION_SERVICIOS";
  else if (t.includes("aprendiz")) tipoContrato = "APRENDIZAJE";

  return {
    tipoContrato,
    nombreColaborador: nombre,
    cedula,
    cargo: pick(/cargo[:\s]+([A-Za-zÁÉÍÓÚÑáéíóúñ ]{2,40})/i),
    fechaInicio: pick(/(\d{4}-\d{2}-\d{2})/),
    fechaFin: null,
    salario,
    jornadaHorasSemana: /42\s*horas/.test(t) ? 42 : /48\s*horas/.test(t) ? 48 : null,
    confianza: 0.5, // mock: confianza media fija
  };
}

// Vector pseudo-aleatorio pero DETERMINISTA por texto (mismo texto -> mismo
// vector), normalizado. Suficiente para probar el flujo de pgvector.
function mockEmbedding(text: string): number[] {
  let seed = 0;
  for (let i = 0; i < text.length; i++) seed = (seed * 31 + text.charCodeAt(i)) >>> 0;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const v = Array.from({ length: env.EMBED_DIM }, () => rand() * 2 - 1);
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / norm);
}
