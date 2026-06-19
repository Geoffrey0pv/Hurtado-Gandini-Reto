// src/modules/organizations/service.ts
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { organizations } from "../../db/schema.js";
import type { UpdateOrgInput } from "../../shared/schemas.js";

export async function getOrganization(orgId: string) {
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);
  return org ?? null;
}

export async function updateOrganization(orgId: string, data: UpdateOrgInput) {
  const [org] = await db
    .update(organizations)
    .set({ name: data.name })
    .where(eq(organizations.id, orgId))
    .returning();
  return org ?? null;
}
