// src/app.ts — Construccion de la instancia Fastify (compartible por tests).
import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import { sql } from "drizzle-orm";
import { ZodError } from "zod";
import { env } from "./config/env.js";
import { db } from "./db/index.js";
import "./shared/types.js"; // augmentaciones (authenticate, payload JWT)
import { authRoutes } from "./modules/users/routes.js";
import { organizationRoutes } from "./modules/organizations/routes.js";
import { colaboradoresRoutes } from "./modules/colaboradores/routes.js";
import { contratosRoutes } from "./modules/contratos/routes.js";
import { areasRoutes } from "./modules/areas/routes.js";
import { timesheetRoutes } from "./modules/timesheet/routes.js";
import { documentosRoutes } from "./modules/documentos/routes.js";
import { disciplinarioRoutes } from "./modules/disciplinario/routes.js";
import { novedadesRoutes } from "./modules/novedades/routes.js";
import { alertasRoutes } from "./modules/alertas/routes.js";
import { auditLogsRoutes } from "./modules/audit-logs/routes.js";
import { dashboardRoutes } from "./modules/dashboard/routes.js";
import { ragRoutes } from "./modules/rag/routes.js";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      transport:
        env.NODE_ENV === "development"
          ? { target: "pino-pretty", options: { translateTime: "HH:MM:ss", ignore: "pid,hostname" } }
          : undefined,
    },
  });

  // ── CORS ────────────────────────────────────────────────────────────
  await app.register(cors, {
    // En desarrollo aceptamos cualquier puerto de localhost (Vite puede elegir
    // 8080/8081/5173 segun disponibilidad). Tambien permitimos despliegues de
    // Vercel (*.vercel.app) y tuneles Cloudflare (*.trycloudflare.com) para
    // poder probar el frontend desplegado contra el backend local via tunel.
    // En produccion solo FRONTEND_URL.
    origin:
      env.NODE_ENV === "development"
        ? [
            /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,
            /\.vercel\.app$/,
            /\.trycloudflare\.com$/,
          ]
        : [env.FRONTEND_URL],
    credentials: true,
  });

  // ── Subida de archivos (streaming) ──────────────────────────────────
  await app.register(multipart, {
    limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB por PDF
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
  await app.register(contratosRoutes, { prefix: "/contratos" });
  await app.register(areasRoutes, { prefix: "/areas" });
  await app.register(timesheetRoutes, { prefix: "/timesheet" });
  await app.register(documentosRoutes, { prefix: "/documentos" });
  await app.register(disciplinarioRoutes, { prefix: "/disciplinario" });
  await app.register(novedadesRoutes, { prefix: "/novedades" });
  await app.register(alertasRoutes, { prefix: "/alertas" });
  await app.register(auditLogsRoutes, { prefix: "/audit-logs" });
  await app.register(dashboardRoutes, { prefix: "/dashboard" });
  await app.register(ragRoutes, { prefix: "/rag" });

  return app;
}
