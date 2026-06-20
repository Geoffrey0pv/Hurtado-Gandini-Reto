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

export const estadoColaborador = pgEnum("estado_colaborador", ["activo", "inactivo"]);
export const estadoVinculacion = pgEnum("estado_vinculacion", ["activo", "retirado"]);
export const presenciaEnum = pgEnum("presencia", ["en_oficina", "vacaciones", "permiso", "incapacidad"]);
export const riesgoEnum = pgEnum("riesgo", ["alto", "medio", "bajo"]);
export const gravedadEnum = pgEnum("gravedad", ["leve", "grave", "gravisima"]);
export const estadoExpediente = pgEnum("estado_expediente", ["abierto", "cerrado"]);
export const modalidadEnum = pgEnum("modalidad", ["Presencial", "Virtual"]);
export const tipoHoraEnum = pgEnum("tipo_hora", [
  "extra_diurna", "extra_nocturna", "recargo_nocturno",
  "recargo_dom_fest", "recargo_dom_fest_nocturno",
  "extra_dom_fest_diurna", "extra_dom_fest_nocturna",
  "pto", "permiso", "incapacidad", "ordinaria",
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

// 5) Areas de la organizacion (para organigrama)
export const areas = pgTable("areas", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  nombre: text("nombre").notNull(),
  orden: integer("orden").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  uniqAreaOrg: uniqueIndex("uniq_area_org").on(t.organizationId, t.nombre),
}));

// 3) Colaborador (trabajador de la empresa)
export const colaboradores = pgTable("colaboradores", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  nombre: text("nombre").notNull(),
  cedula: text("cedula").notNull(),
  fechaNacimiento: date("fecha_nacimiento"),
  cargo: text("cargo"),
  // campos ampliados para el UI
  email: text("email"),
  telefono: text("telefono"),
  area: text("area"),
  jefeId: uuid("jefe_id"),                        // FK auto-referenciada (nullable)
  estado: estadoColaborador("estado").notNull().default("activo"),
  estadoVinculacion: estadoVinculacion("estado_vinculacion").notNull().default("activo"),
  presencia: presenciaEnum("presencia").notNull().default("en_oficina"),
  riesgo: riesgoEnum("riesgo").notNull().default("bajo"),
  fueros: jsonb("fueros").$type<string[]>().default([]),
  arlNivel: integer("arl_nivel").default(2),      // 1-5
  origen: text("origen").notNull().default("manual"), // manual | contrato
  // Datos laborales ingresados a mano en el perfil (sin crear fila en contratos).
  tipoContrato: contractType("tipo_contrato"),
  fechaInicio: date("fecha_inicio"),
  fechaFin: date("fecha_fin"),
  salario: numeric("salario", { precision: 14, scale: 2 }),
  jornadaHorasSemana: integer("jornada_horas_semana"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
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
  action: text("action").notNull(),
  entity: text("entity"),
  entityId: uuid("entity_id"),
  aiModel: text("ai_model"),
  payload: jsonb("payload"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 6) Timesheet: horas registradas por colaborador
export const timesheetEntries = pgTable("timesheet_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  colaboradorId: uuid("colaborador_id").notNull()
    .references(() => colaboradores.id, { onDelete: "cascade" }),
  fecha: date("fecha").notNull(),
  horas: numeric("horas", { precision: 4, scale: 1 }).notNull(),
  tipo: tipoHoraEnum("tipo").notNull(),
  notas: text("notas"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  tsOrgIdx: index("ts_org_idx").on(t.organizationId),
  tsColabIdx: index("ts_colab_idx").on(t.colaboradorId),
}));

// 7) Documentos por slot (EPS, ARL, contrato firmado, etc.)
export const documentosSlots = pgTable("documentos_slots", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  colaboradorId: uuid("colaborador_id").notNull()
    .references(() => colaboradores.id, { onDelete: "cascade" }),
  slotKey: text("slot_key").notNull(),              // contrato | afiliacion_eps | ...
  fileKey: text("file_key").notNull(),              // objeto en MinIO
  nombre: text("nombre").notNull(),
  size: integer("size").notNull().default(0),
  subidoEn: timestamp("subido_en").defaultNow().notNull(),
}, (t) => ({
  uniqSlotColab: uniqueIndex("uniq_slot_colab").on(t.colaboradorId, t.slotKey),
  docOrgIdx: index("doc_org_idx").on(t.organizationId),
}));

// 8) Expedientes disciplinarios
export const expedientes = pgTable("expedientes", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  colaboradorId: uuid("colaborador_id").notNull()
    .references(() => colaboradores.id, { onDelete: "cascade" }),
  hechos: text("hechos").notNull(),
  fechaHechos: date("fecha_hechos").notNull(),
  gravedad: gravedadEnum("gravedad").notNull(),
  normaVulnerada: text("norma_vulnerada"),
  fechaDiligencia: date("fecha_diligencia"),
  hora: text("hora"),
  modalidad: modalidadEnum("modalidad").default("Presencial"),
  lugar: text("lugar"),
  asistentes: text("asistentes"),
  ciudad: text("ciudad"),
  estado: estadoExpediente("estado").notNull().default("abierto"),
  cartaTexto: text("carta_texto"),
  etapas: jsonb("etapas").$type<Record<string, boolean>>().default({}),
  notificado: jsonb("notificado").$type<Array<{ canal: string; fecha: string }>>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  expOrgIdx: index("exp_org_idx").on(t.organizationId),
}));

// 9) Novedades de nomina
export const novedades = pgTable("novedades", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  colaboradorId: uuid("colaborador_id").notNull()
    .references(() => colaboradores.id, { onDelete: "cascade" }),
  tipo: text("tipo").notNull(),
  descripcion: text("descripcion"),
  fecha: date("fecha").notNull(),
  monto: numeric("monto", { precision: 14, scale: 2 }),
  origen: text("origen").default("manual"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  novOrgIdx: index("nov_org_idx").on(t.organizationId),
}));
