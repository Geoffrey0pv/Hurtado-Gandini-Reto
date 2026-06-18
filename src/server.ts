// src/server.ts — Bootstrap de Fastify (proceso API)
import Fastify from "fastify";
import { sql } from "drizzle-orm";
import { env } from "./config/env.js";
import { db } from "./db/index.js";

const app = Fastify({
  logger: {
    transport: env.NODE_ENV === "development"
      ? { target: "pino-pretty", options: { translateTime: "HH:MM:ss", ignore: "pid,hostname" } }
      : undefined,
  },
});

// Health check: confirma que la API arranca y conecta a Postgres.
app.get("/health", async () => {
  let dbOk = false;
  try {
    await db.execute(sql`select 1`);
    dbOk = true;
  } catch (err) {
    app.log.error({ err }, "DB health check failed");
  }
  return { status: "ok", db: dbOk ? "up" : "down", ts: new Date().toISOString() };
});

async function start() {
  try {
    await app.listen({ port: env.PORT, host: "0.0.0.0" });
    app.log.info(`API escuchando en http://localhost:${env.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();

export { app };
