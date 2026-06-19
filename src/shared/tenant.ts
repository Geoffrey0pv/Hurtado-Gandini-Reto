// src/shared/tenant.ts — Helper de scoping multi-tenant.
// REGLA DE ORO: ninguna query a tablas de negocio debe ejecutarse sin
// filtrar por organizationId. Este helper extrae el tenant del JWT ya
// verificado (req.user) para que los services lo apliquen en cada WHERE.
import type { FastifyRequest } from "fastify";
import type { AuthPayload } from "./types.js";

export function getTenant(req: FastifyRequest): AuthPayload {
  // req.user lo puebla jwtVerify (preHandler app.authenticate). Si llega
  // aqui sin user es un bug de wiring: fallamos ruidosamente.
  if (!req.user?.organizationId) {
    throw Object.assign(new Error("Contexto de tenant ausente"), { statusCode: 401 });
  }
  return req.user;
}
