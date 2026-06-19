// src/worker.ts — Bootstrap del worker BullMQ (proceso separado de la API).
import { env } from "./config/env.js";
import { startWorkers } from "./workers/ingestion.worker.js";

console.log("[worker] arrancando workers de ingestion...");
console.log(`[worker] Redis: ${env.REDIS_URL} | Ollama: ${env.OLLAMA_HOST} | LLM_MODE: ${env.LLM_MODE}`);

const { extractWorker, embedWorker } = startWorkers();
console.log("[worker] listo. Colas: extract (concurrency 1), embed (concurrency 3).");

// Shutdown limpio para no dejar jobs a medias.
async function shutdown(signal: string) {
  console.log(`[worker] ${signal} recibido, cerrando workers...`);
  await Promise.allSettled([extractWorker.close(), embedWorker.close()]);
  process.exit(0);
}
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
