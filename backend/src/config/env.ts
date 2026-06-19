import "dotenv/config";
import { z } from "zod";

// Variables de entorno validadas con Zod. Si falta algo critico, el proceso
// falla al arrancar (fail-fast) en vez de explotar en runtime.
const EnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().default("redis://localhost:6379"),
  FRONTEND_URL: z.string().url().default("http://localhost:4000"),
  MINIO_ENDPOINT: z.string().url().default("http://localhost:9000"),
  MINIO_ACCESS_KEY: z.string().default("minioadmin"),
  MINIO_SECRET_KEY: z.string().default("minioadmin"),
  OLLAMA_HOST: z.string().url().default("http://localhost:11434"),
  JWT_SECRET: z.string().min(8),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // ── Storage (MinIO) ──
  MINIO_BUCKET: z.string().default("contracts"),

  // ── LLM (Ollama) ──
  // "ollama" = inferencia real; "mock" = extraccion/embeddings deterministas
  // para correr el pipeline end-to-end sin modelos descargados.
  LLM_MODE: z.enum(["ollama", "mock"]).default("ollama"),
  OLLAMA_MODEL: z.string().default("llama3:8b-instruct-q4_K_M"),
  OLLAMA_MODEL_COMPLEX: z.string().default("qwen2.5:14b-instruct-q4_K_M"),
  EMBED_MODEL: z.string().default("bge-m3"),
  // Dimension del vector. bge-m3=1024 (debe coincidir con el schema de la tabla).
  EMBED_DIM: z.coerce.number().default(1024),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Configuracion de entorno invalida:");
  console.error(z.treeifyError(parsed.error));
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
