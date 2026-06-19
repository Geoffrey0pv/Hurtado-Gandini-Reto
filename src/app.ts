// src/app.ts — Construccion de la instancia Fastify (compartible por tests).
import Fastify, { type FastifyInstance } from "fastify";
import jwt from "@fastify/jwt";
import { sql } from "drizzle-orm";
import { ZodError } from "zod";
import { env } from "./config/env.js";
import { db } from "./db/index.js";
import "./shared/types.js"; // augmentaciones (authenticate, payload JWT)
import { authRoutes } from "./modules/users/routes.js";
import { organizationRoutes } from "./modules/organizations/routes.js";
import { colaboradoresRoutes } from "./modules/colaboradores/routes.js";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      transport:
        env.NODE_ENV === "development"
          ? { target: "pino-pretty", options: { translateTime: "HH:MM:ss", ignore: "pid,hostname" } }
          : undefined,
    },
  });

  // ── Auth (JWT) ──────────────────────────────────────────────────────
  await app.register(jwt, { secret: env.JWT_SECRET });

  // preHandler reutilizable: verifica el token y puebla req.user.
  app.decorate("authenticate", async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.code(401).send({ error: "No autorizado: token ausente o invalido" });
    }
  });

  // ── Error handler global ────────────────────────────────────────────
  app.setErrorHandler((err, req, reply) => {
    if (err instanceof ZodError) {
      return reply.code(400).send({ error: "Validacion fallida", issues: err.issues });
    }
    const e = err as { statusCode?: number; message?: string };
    const statusCode = e.statusCode ?? 500;
    if (statusCode >= 500) req.log.error({ err }, "Error no controlado");
    return reply.code(statusCode).send({ error: e.message || "Error interno" });
  });

  // ── Health ──────────────────────────────────────────────────────────
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

  // ── Modulos de dominio ──────────────────────────────────────────────
  await app.register(authRoutes, { prefix: "/auth" });
  await app.register(organizationRoutes, { prefix: "/organizations" });
  await app.register(colaboradoresRoutes, { prefix: "/colaboradores" });

  return app;
}
