import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "../../db/index.js";
import { auditLogs } from "../../db/schema.js";

export async function listAuditLogs(
  orgId: string,
  filters: { desde?: string; hasta?: string; action?: string } = {},
) {
  const conditions = [eq(auditLogs.organizationId, orgId)];
  if (filters.desde) conditions.push(gte(auditLogs.createdAt, new Date(filters.desde)));
  if (filters.hasta) conditions.push(lte(auditLogs.createdAt, new Date(filters.hasta)));
  if (filters.action) conditions.push(eq(auditLogs.action, filters.action));

  return db
    .select()
    .from(auditLogs)
    .where(and(...conditions))
    .orderBy(desc(auditLogs.createdAt))
    .limit(500);
}
