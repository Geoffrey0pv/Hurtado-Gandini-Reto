// src/scripts/seed-normativa.ts — Indexa la base de conocimiento legal (normativa,
// jurisprudencia, etc.) en la base vectorial para que el RAG la consulte.
//
// Coloca tus archivos .md (en subcarpetas) bajo  backend/seed/normativa/  y ejecuta:
//   cd backend && npm run seed:normativa
//
// Recorre RECURSIVAMENTE el directorio, trocea cada .md, genera embeddings con
// bge-m3 y los inserta en document_chunks. El `source` se deriva de la carpeta de
// primer nivel (normativa | jurisprudencia | reglamento | plantilla). Es
// idempotente: borra el conocimiento legal previo de cada organización (todo lo
// que no es source="contrato") antes de reinsertar.
//
// Multi-tenant: la tabla exige organizationId, así que se siembra para TODAS las
// organizaciones (la ley aplica a todas) y el RAG la recupera por organización.
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { and, eq, ne } from "drizzle-orm";
import { db, queryClient } from "../db/index.js";
import { documentChunks, organizations } from "../db/schema.js";
import { embed } from "../lib/llm.js";
import { env } from "../config/env.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const NORMATIVA_DIR = join(__dirname, "../../seed/normativa");

// Recorre recursivamente y devuelve rutas absolutas de los .md indexables.
function walk(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith(".") || e.name.startsWith("_")) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(full));
    else if (e.name.toLowerCase().endsWith(".md")) out.push(full);
  }
  return out;
}

// El source se deriva de la carpeta de primer nivel.
function sourceFromRel(rel: string): string {
  const top = rel.split(sep)[0].toLowerCase();
  if (top.includes("jurisprudencia")) return "jurisprudencia";
  if (top.includes("reglamento")) return "reglamento";
  if (top.includes("plantilla")) return "plantilla";
  return "normativa";
}

// Trocea texto/markdown en bloques de ~900 chars respetando párrafos y títulos.
function chunkMarkdown(text: string, maxChars = 900): string[] {
  const blocks = text
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const chunks: string[] = [];
  let buf = "";
  for (const b of blocks) {
    if (buf && (buf + "\n\n" + b).length > maxChars) {
      chunks.push(buf);
      buf = b;
    } else {
      buf = buf ? `${buf}\n\n${b}` : b;
    }
    while (buf.length > maxChars * 1.6) {
      chunks.push(buf.slice(0, maxChars));
      buf = buf.slice(maxChars);
    }
  }
  if (buf.trim()) chunks.push(buf.trim());
  return chunks;
}

async function main() {
  console.log(`\n=== SEED CONOCIMIENTO LEGAL (LLM_MODE=${env.LLM_MODE}, embeddings=${env.EMBED_MODEL}) ===`);
  console.log(`Directorio: ${NORMATIVA_DIR}`);

  let files: string[];
  try {
    files = walk(NORMATIVA_DIR);
  } catch {
    console.error("No existe backend/seed/normativa/. Crea la carpeta y pon ahí los .md.");
    process.exit(1);
  }
  if (files.length === 0) {
    console.error("No hay archivos .md (busqué recursivamente). Agrega la normativa y reintenta.");
    process.exit(1);
  }
  console.log(`Archivos .md encontrados: ${files.length}`);

  // Trocear todos los archivos; cada chunk lleva su ruta como contexto de cita y
  // su source según la carpeta de primer nivel.
  const docs: Array<{ content: string; source: string }> = [];
  const porSource: Record<string, number> = {};
  for (const full of files) {
    const rel = relative(NORMATIVA_DIR, full);
    const fuente = rel.replace(/\.md$/i, "").split(sep).join(" / ");
    const source = sourceFromRel(rel);
    const raw = readFileSync(full, "utf8");
    for (const chunk of chunkMarkdown(raw)) {
      docs.push({ content: `[${fuente}]\n${chunk}`, source });
      porSource[source] = (porSource[source] ?? 0) + 1;
    }
  }
  console.log(`Chunks por source: ${JSON.stringify(porSource)} (total ${docs.length})`);

  console.log("Generando embeddings con bge-m3 (puede tardar)...");
  const embedded: Array<{ content: string; source: string; embedding: number[] }> = [];
  let done = 0;
  for (const d of docs) {
    embedded.push({ ...d, embedding: await embed(d.content) });
    if (++done % 25 === 0) console.log(`  embeddings: ${done}/${docs.length}`);
  }

  const orgs = await db.select({ id: organizations.id, name: organizations.name }).from(organizations);
  if (orgs.length === 0) {
    console.error("No hay organizaciones. Registra un usuario primero (POST /auth/register).");
    process.exit(1);
  }

  for (const org of orgs) {
    // Idempotente: borra el conocimiento legal previo (todo lo que NO es contrato).
    await db
      .delete(documentChunks)
      .where(and(eq(documentChunks.organizationId, org.id), ne(documentChunks.source, "contrato")));

    await db.insert(documentChunks).values(
      embedded.map((e) => ({
        organizationId: org.id,
        contratoId: null,
        source: e.source,
        content: e.content,
        embedding: e.embedding,
      })),
    );
    console.log(`  ✓ ${org.name}: ${embedded.length} chunks de conocimiento legal indexados.`);
  }

  console.log("\nListo. El RAG ahora consulta normativa y jurisprudencia además del contrato.\n");
}

main()
  .catch((err) => {
    console.error("\nFALLO el seed:", err);
    process.exitCode = 1;
  })
  .finally(() => queryClient.end());
