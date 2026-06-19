// src/shared/types.ts — Augmentaciones de tipos para Fastify + JWT.
// El payload del JWT lleva el contexto multi-tenant (organizationId) que
// usan todos los handlers protegidos via shared/tenant.ts.
import type { FastifyReply, FastifyRequest } from "fastify";

export interface AuthPayload {
  userId: string;
  organizationId: string;
  role: string;
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: AuthPayload; // lo que se firma
    user: AuthPayload;    // lo que aparece en req.user tras jwtVerify
  }
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export {};
