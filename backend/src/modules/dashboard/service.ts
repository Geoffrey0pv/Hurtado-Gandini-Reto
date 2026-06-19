import { count, eq, and, lte, gte, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { colaboradores, contratos, expedientes } from "../../db/schema.js";

export async function getDashboardSummary(orgId: string) {
  const hoy = new Date();
  const en30Dias = new Date(hoy);
  en30Dias.setDate(en30Dias.getDate() + 30);
  const en30DiasStr = en30Dias.toISOString().slice(0, 10);
  const hoyStr = hoy.toISOString().slice(0, 10);

  const [totalColab] = await db
    .select({ count: count() })
    .from(colaboradores)
    .where(and(eq(colaboradores.organizationId, orgId), eq(colaboradores.estado, "activo")));

  const [contratasPorVencer] = await db
    .select({ count: count() })
    .from(contratos)
    .where(
      and(
        eq(contratos.organizationId, orgId),
        eq(contratos.status, "DONE"),
        gte(contratos.fechaFin, hoyStr),
        lte(contratos.fechaFin, en30DiasStr),
      ),
    );

  const [disciplinariosAbiertos] = await db
    .select({ count: count() })
    .from(expedientes)
    .where(
      and(eq(expedientes.organizationId, orgId), eq(expedientes.estado, "abierto")),
    );

  const [docsPendientes] = await db
    .select({ count: count() })
    .from(contratos)
    .where(
      and(
        eq(contratos.organizationId, orgId),
        sql`${contratos.status} IN ('PENDING','PROCESSING')`,
      ),
    );

  return {
    colaboradores: totalColab?.count ?? 0,
    contratosPorVencer: contratasPorVencer?.count ?? 0,
    disciplinariosAbiertos: disciplinariosAbiertos?.count ?? 0,
    docsPendientesRevision: docsPendientes?.count ?? 0,
  };
}
