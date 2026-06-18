// src/db/schema.ts
import {
  pgTable, uuid, text, integer, numeric, date, timestamp, jsonb,
  vector, index, uniqueIndex, pgEnum,
} from "drizzle-orm/pg-core";

export const contractType = pgEnum("contract_type", [
  "TERMINO_FIJO", "TERMINO_INDEFINIDO", "OBRA_LABOR",
  "PRESTACION_SERVICIOS", "APRENDIZAJE", "OTRO",
]);

export const jobStatus = pgEnum("job_status", [
  "PENDING", "PROCESSING", "DONE", "FAILED",
]);

// 1) Organizacion (empresa cliente / tenant)
export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  nit: text("nit").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 2) Usuario (personal de Talento Humano de una organizacion)
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("hr"),     // hr | abogado | admin
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 3) Colaborador (trabajador de la empresa)
export const colaboradores = pgTable("colaboradores", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  nombre: text("nombre").notNull(),
  cedula: text("cedula").notNull(),
  fechaNacimiento: date("fecha_nacimiento"),       // 'edad' se deriva de aqui
  cargo: text("cargo"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  // un colaborador es unico por cedula DENTRO de su organizacion
  uniqCedulaOrg: uniqueIndex("uniq_cedula_org").on(t.organizationId, t.cedula),
}));

// 4) Contrato (1 colaborador -> N contratos). fileKey -> objeto en MinIO
export const contratos = pgTable("contratos", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  colaboradorId: uuid("colaborador_id").notNull()
    .references(() => colaboradores.id, { onDelete: "cascade" }),
  tipoContrato: contractType("tipo_contrato"),
  fechaInicio: date("fecha_inicio"),
  fechaFin: date("fecha_fin"),                      // null si indefinido
  salario: numeric("salario", { precision: 14, scale: 2 }),
  jornadaHorasSemana: integer("jornada_horas_semana"),
  fileKey: text("file_key").notNull(),              // clave del objeto en MinIO
  fileUrl: text("file_url"),                        // URL prefirmada (opcional)
  rawText: text("raw_text"),                        // texto extraido del PDF
  extracted: jsonb("extracted"),                    // extraccion completa + confianzas
  status: jobStatus("status").notNull().default("PENDING"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// RAG: trozos de texto (clausulas de contratos, politicas internas, normativa)
export const documentChunks = pgTable("document_chunks", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  contratoId: uuid("contrato_id")
    .references(() => contratos.id, { onDelete: "cascade" }),
  source: text("source").notNull(),                 // contrato | politica | normativa
  content: text("content").notNull(),
  embedding: vector("embedding", { dimensions: 1024 }), // bge-m3 = 1024 (nomic = 768)
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  // indice HNSW para busqueda por coseno (rapida en miles/millones de filas)
  embIdx: index("emb_idx").using("hnsw", t.embedding.op("vector_cosine_ops")),
  orgIdx: index("chunks_org_idx").on(t.organizationId),
}));

// Seguimiento del trabajo asincrono de ingestion
export const ingestionJobs = pgTable("ingestion_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull(),
  contratoId: uuid("contrato_id"),
  fileKey: text("file_key").notNull(),
  status: jobStatus("status").notNull().default("PENDING"),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Trazabilidad: que sugirio la IA, con que modelo y fuentes (requisito clave)
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull(),
  userId: uuid("user_id"),
  action: text("action").notNull(),                 // p.ej. EXTRACT_CONTRACT, RAG_RISK
  entity: text("entity"),
  entityId: uuid("entity_id"),
  aiModel: text("ai_model"),                         // modelo y version usados
  payload: jsonb("payload"),                         // sugerencia IA + fuentes citadas
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
