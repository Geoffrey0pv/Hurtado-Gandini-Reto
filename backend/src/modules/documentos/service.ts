import { randomUUID } from "node:crypto";
import type { Readable } from "node:stream";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { documentosSlots } from "../../db/schema.js";
import { presignGet, uploadStream } from "../../lib/storage.js";

export async function listDocumentos(orgId: string, colaboradorId: string) {
  const rows = await db
    .select()
    .from(documentosSlots)
    .where(
      and(
        eq(documentosSlots.organizationId, orgId),
        eq(documentosSlots.colaboradorId, colaboradorId),
      ),
    );

  return Promise.all(
    rows.map(async (r) => ({
      ...r,
      fileUrl: await presignGet(r.fileKey).catch(() => null),
    })),
  );
}

export async function upsertDocumento(
  orgId: string,
  colaboradorId: string,
  slotKey: string,
  fileStream: Readable,
  nombre: string,
  size: number,
  contentType: string,
) {
  const fileKey = `${orgId}/docs/${colaboradorId}/${slotKey}-${randomUUID()}`;
  await uploadStream(fileKey, fileStream, contentType);

  // Upsert: si ya existe el slot, reemplaza el file_key
  await db
    .delete(documentosSlots)
    .where(
      and(
        eq(documentosSlots.colaboradorId, colaboradorId),
        eq(documentosSlots.slotKey, slotKey),
      ),
    );

  const [row] = await db
    .insert(documentosSlots)
    .values({ organizationId: orgId, colaboradorId, slotKey, fileKey, nombre, size })
    .returning();
  return row;
}

export async function deleteDocumento(orgId: string, id: string) {
  const [row] = await db
    .delete(documentosSlots)
    .where(and(eq(documentosSlots.organizationId, orgId), eq(documentosSlots.id, id)))
    .returning({ id: documentosSlots.id });
  return row ?? null;
}
