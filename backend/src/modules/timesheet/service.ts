import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { timesheetEntries } from "../../db/schema.js";
import type { CreateTimesheetInput } from "../../shared/schemas.js";

export async function listTimesheet(orgId: string, colaboradorId: string) {
  return db
    .select()
    .from(timesheetEntries)
    .where(
      and(
        eq(timesheetEntries.organizationId, orgId),
        eq(timesheetEntries.colaboradorId, colaboradorId),
      ),
    )
    .orderBy(desc(timesheetEntries.fecha));
}

export async function createTimesheetEntry(orgId: string, data: CreateTimesheetInput) {
  const [row] = await db
    .insert(timesheetEntries)
    .values({
      organizationId: orgId,
      colaboradorId: data.colaboradorId,
      fecha: data.fecha,
      horas: String(data.horas),
      tipo: data.tipo,
      notas: data.notas ?? null,
    })
    .returning();
  return row;
}

export async function deleteTimesheetEntry(orgId: string, id: string) {
  const [row] = await db
    .delete(timesheetEntries)
    .where(and(eq(timesheetEntries.organizationId, orgId), eq(timesheetEntries.id, id)))
    .returning({ id: timesheetEntries.id });
  return row ?? null;
}
