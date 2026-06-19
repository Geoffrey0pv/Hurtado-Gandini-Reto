// src/lib/queue.ts — Colas BullMQ + conexion Redis (compartida API/worker).
import { Queue, type ConnectionOptions } from "bullmq";
import { Redis } from "ioredis";
import { env } from "../config/env.js";

// BullMQ exige maxRetriesPerRequest: null en la conexion del worker.
export const connection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

// BullMQ empaqueta su propia copia de ioredis; el tipo de nuestra instancia
// no coincide con el suyo aunque en runtime es 100% compatible. Casteamos.
// TODO: fix for production — alinear versiones de ioredis (npm dedupe).
export const queueConnection = connection as unknown as ConnectionOptions;

// Nombres de cola (separadas por carga: LLM serie vs embeddings livianos).
export const QUEUE_EXTRACT = "extract";
export const QUEUE_EMBED = "embed";
export const QUEUE_ANALYSIS = "analysis";

// Payloads de los jobs.
export interface ExtractJobData {
  ingestionJobId: string;
  contratoId: string;
  colaboradorId: string;
  organizationId: string;
  fileKey: string;
  complex?: boolean; // bandera para usar el modelo de razonamiento (qwen)
}

export interface EmbedJobData {
  contratoId: string;
  organizationId: string;
}

// Analisis determinista (reglas en codigo, sin IA) que corre tras la extraccion.
export interface AnalysisJobData {
  contratoId: string;
  organizationId: string;
}

// Opciones por defecto: reintentos con backoff exponencial.
const defaultJobOpts = {
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 3000 },
  removeOnComplete: 100,
  removeOnFail: 500,
};

export const extractQueue = new Queue<ExtractJobData>(QUEUE_EXTRACT, {
  connection: queueConnection,
  defaultJobOptions: defaultJobOpts,
});

export const embedQueue = new Queue<EmbedJobData>(QUEUE_EMBED, {
  connection: queueConnection,
  defaultJobOptions: defaultJobOpts,
});

export const analysisQueue = new Queue<AnalysisJobData>(QUEUE_ANALYSIS, {
  connection: queueConnection,
  defaultJobOptions: defaultJobOpts,
});
