// src/worker.ts — Bootstrap del worker BullMQ (proceso separado)
// Hora 0-1: solo arranca y confirma conexion. La logica de ingestion
// (PDF -> texto -> extraccion -> embeddings) se implementa en la Hora 4-8.
import { env } from "./config/env.js";

async function start() {
  console.log("[worker] arrancando worker de ingestion...");
  console.log(`[worker] Redis: ${env.REDIS_URL}`);
  console.log(`[worker] Ollama: ${env.OLLAMA_HOST}`);
  // TODO (Hora 4-8): registrar el Worker de BullMQ para la cola "ingest".
  console.log("[worker] listo (placeholder, sin colas registradas todavia).");
}

start();
