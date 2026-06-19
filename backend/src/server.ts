// src/server.ts — Bootstrap de Fastify (proceso API).
import { buildApp } from "./app.js";
import { env } from "./config/env.js";

async function start() {
  const app = await buildApp();
  try {
    await app.listen({ port: env.PORT, host: "0.0.0.0" });
    app.log.info(`API escuchando en http://localhost:${env.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
