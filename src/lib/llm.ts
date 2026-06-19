// src/lib/llm.ts — Ollama: extract(), generate(), embed().
// Doble red de seguridad: se pasa el JSON Schema (derivado de Zod) al
// parametro `format` de Ollama y luego se VUELVE a validar con Zod.
//
// LLM_MODE=mock produce salidas deterministas (regex + vector pseudo-aleatorio)
// para correr el pipeline end-to-end sin modelos descargados. Cuando hay
// modelos (`ollama pull ...`), LLM_MODE=ollama usa inferencia real.
import { Ollama } from "ollama";
import { env } from "../config/env.js";
import { ExtractionSchema, type Extraction } from "../shared/schemas.js";

const ollama = new Ollama({ host: env.OLLAMA_HOST });

// NOTA: el servidor de Ollama de esta maquina ignora el JSON Schema en `format`
// (solo respeta format:"json" => "JSON valido", no la estructura). Por eso
// fijamos las claves EXACTAS en el prompt y revalidamos con Zod (red dura).
const SYSTEM_PROMPT = `Eres un asistente juridico experto en derecho laboral colombiano.
Extrae los datos del contrato y responde EXCLUSIVAMENTE un objeto JSON valido,
sin texto adicional, sin markdown, con EXACTAMENTE estas claves planas (sin anidar):

{
  "tipoContrato": uno de ["TERMINO_FIJO","TERMINO_INDEFINIDO","OBRA_LABOR","PRESTACION_SERVICIOS","APRENDIZAJE","OTRO"] o null,
  "nombreColaborador": string o null,
  "cedula": string con solo digitos (sin puntos ni comas) o null,
  "cargo": string o null,
  "fechaInicio": string "YYYY-MM-DD" o null,
  "fechaFin": string "YYYY-MM-DD" o null,
  "salario": numero sin separadores de miles o null,
  "jornadaHorasSemana": numero entero o null,
  "confianza": numero entre 0 y 1 que refleje tu seguridad global
}

Reglas estrictas:
- Si un dato NO aparece en el texto, su valor es null. NUNCA inventes.
- No anides objetos. No agregues claves extra.
- Responde unicamente el JSON.`;

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
    format: "json", // garantiza JSON parseable; la forma la fija el prompt + Zod
    options: { temperature: 0 }, // determinismo
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: text.slice(0, 12000) }, // recorte defensivo de contexto
    ],
  });
  // Validacion dura: si el modelo se sale del contrato, ZodError -> el worker
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
