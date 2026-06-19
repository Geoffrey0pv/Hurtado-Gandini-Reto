// src/modules/users/routes.ts — Endpoints de autenticacion.
import type { FastifyInstance } from "fastify";
import { LoginSchema, RegisterSchema } from "../../shared/schemas.js";
import { httpError, isUniqueViolation } from "../../shared/errors.js";
import { getTenant } from "../../shared/tenant.js";
import {
  findUserByEmail,
  findUserById,
  registerOrgWithAdmin,
  verifyPassword,
} from "./service.js";

export async function authRoutes(app: FastifyInstance) {
  // POST /auth/register — crea organizacion + usuario admin, devuelve token.
  app.post("/register", async (req, reply) => {
    const body = RegisterSchema.parse(req.body);
    try {
      const { org, user } = await registerOrgWithAdmin(body);
      const token = app.jwt.sign({
        userId: user.id,
        organizationId: org.id,
        role: user.role,
      });
      return reply.code(201).send({
        token,
        organization: { id: org.id, name: org.name, nit: org.nit },
        user: { id: user.id, email: user.email, role: user.role },
      });
    } catch (e) {
      if (isUniqueViolation(e)) {
        throw httpError(409, "El NIT o el email ya estan registrados");
      }
      throw e;
    }
  });

  // POST /auth/login — valida credenciales, devuelve token.
  app.post("/login", async (req, reply) => {
    const body = LoginSchema.parse(req.body);
    const user = await findUserByEmail(body.email);
    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      throw httpError(401, "Credenciales invalidas");
    }
    const token = app.jwt.sign({
      userId: user.id,
      organizationId: user.organizationId,
      role: user.role,
    });
    return reply.send({
      token,
      user: { id: user.id, email: user.email, role: user.role },
    });
  });

  // GET /auth/me — perfil del usuario autenticado (verifica el token).
  app.get("/me", { preHandler: [app.authenticate] }, async (req) => {
    const { userId } = getTenant(req);
    const user = await findUserById(userId);
    if (!user) throw httpError(404, "Usuario no encontrado");
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    };
  });
}
