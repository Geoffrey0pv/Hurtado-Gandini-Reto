// src/lib/storage.ts — MinIO/S3: upload en streaming, download, presign.
import type { Readable } from "node:stream";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../config/env.js";

export const s3 = new S3Client({
  endpoint: env.MINIO_ENDPOINT, // http://localhost:9000
  region: "us-east-1",
  forcePathStyle: true, // requerido por MinIO
  credentials: {
    accessKeyId: env.MINIO_ACCESS_KEY,
    secretAccessKey: env.MINIO_SECRET_KEY,
  },
});

const BUCKET = env.MINIO_BUCKET;

// Sube un stream (p.ej. el archivo del multipart de Fastify) sin bufferizarlo
// entero en memoria. Devuelve la key del objeto.
export async function uploadStream(
  key: string,
  body: Readable,
  contentType = "application/pdf",
): Promise<string> {
  await new Upload({
    client: s3,
    params: { Bucket: BUCKET, Key: key, Body: body, ContentType: contentType },
  }).done();
  return key;
}

// Descarga un objeto a un Buffer (lo consume el worker para parsear el PDF).
export async function downloadBuffer(key: string): Promise<Buffer> {
  const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  const body = res.Body as AsyncIterable<Uint8Array>;
  const chunks: Buffer[] = [];
  for await (const chunk of body) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

// URL prefirmada de lectura (para mostrar/descargar el PDF desde el front).
export async function presignGet(key: string, expiresInSec = 3600): Promise<string> {
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: key }), {
    expiresIn: expiresInSec,
  });
}
