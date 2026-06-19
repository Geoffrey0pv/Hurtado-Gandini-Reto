// src/workers/ingestion.worker.ts — Crea los Workers BullMQ.
// Concurrencia (spec): extract = 1 (Ollama sirve casi en serie),
// embed = 3 (mas liviano).
import { Worker } from "bullmq";
import {
  queueConnection,
  QUEUE_EMBED,
  QUEUE_EXTRACT,
  type EmbedJobData,
  type ExtractJobData,
} from "../lib/queue.js";
import { runIngestion } from "./processors/extract.js";
import { runEmbedding } from "./processors/embed.js";

export function startWorkers() {
  const extractWorker = new Worker<ExtractJobData>(
    QUEUE_EXTRACT,
    async (job) => runIngestion(job.data),
    { connection: queueConnection, concurrency: 1 },
  );

  const embedWorker = new Worker<EmbedJobData>(
    QUEUE_EMBED,
    async (job) => runEmbedding(job.data),
    { connection: queueConnection, concurrency: 3 },
  );

  for (const [name, w] of [["extract", extractWorker], ["embed", embedWorker]] as const) {
    w.on("completed", (job) => console.log(`[${name}] job ${job.id} OK`));
    w.on("failed", (job, err) =>
      console.error(`[${name}] job ${job?.id} FAILED: ${err?.message}`),
    );
    w.on("error", (err) => console.error(`[${name}] worker error:`, err.message));
  }

  return { extractWorker, embedWorker };
}
