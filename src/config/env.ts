import "dotenv/config";
import { z } from "zod";

// Variables de entorno validadas con Zod. Si falta algo critico, el proceso
// falla al arrancar (fail-fast) en vez de explotar en runtime.
const EnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().default("redis://localhost:6379"),
  MINIO_ENDPOINT: z.string().url().default("http://localhost:9000"),
  MINIO_ACCESS_KEY: z.string().default("minioadmin"),
  MINIO_SECRET_KEY: z.string().default("minioadmin"),
  OLLAMA_HOST: z.string().url().default("http://localhost:11434"),
  JWT_SECRET: z.string().min(8),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Configuracion de entorno invalida:");
  console.error(z.treeifyError(parsed.error));
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
