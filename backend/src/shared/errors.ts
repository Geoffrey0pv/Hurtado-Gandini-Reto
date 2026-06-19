// src/shared/errors.ts — utilidades de errores HTTP/DB.

// Error con statusCode para que el error handler de Fastify lo mapee.
export function httpError(statusCode: number, message: string): Error {
  return Object.assign(new Error(message), { statusCode });
}

// postgres-js expone el SQLSTATE en `.code`. 23505 = unique_violation.
// Drizzle envuelve el PostgresError en un DrizzleQueryError, asi que el
// code real queda en `.cause` (o mas abajo). Recorremos la cadena.
export function isUniqueViolation(e: unknown): boolean {
  let cur: unknown = e;
  for (let i = 0; i < 5 && cur; i++) {
    if (typeof cur === "object" && (cur as { code?: string }).code === "23505") return true;
    cur = (cur as { cause?: unknown }).cause;
  }
  return false;
}
