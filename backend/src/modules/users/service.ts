// src/modules/users/service.ts — Auth: alta de tenant + usuario, login.
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { organizations, users } from "../../db/schema.js";
import type { RegisterInput } from "../../shared/schemas.js";

const SALT_ROUNDS = 10;

// Signup: crea la organizacion (tenant) y su primer usuario admin en una
// transaccion. Si algo falla, no queda una org huerfana sin usuario.
export async function registerOrgWithAdmin(input: RegisterInput) {
  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  return db.transaction(async (tx) => {
    const [org] = await tx
      .insert(organizations)
      .values({ name: input.orgName, nit: input.nit })
      .returning();
    const [user] = await tx
      .insert(users)
      .values({
        organizationId: org.id,
        email: input.email,
        passwordHash,
        role: "admin", // el primer usuario del tenant es admin
      })
      .returning();
    return { org, user };
  });
}

export async function findUserByEmail(email: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return user ?? null;
}

export async function findUserById(id: string) {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return user ?? null;
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
