# Spec Kit — Backend SaaS LegalTech (Derecho Laboral & Compliance)
### Arquitectura técnica para Hackathon de 24h · Node.js + TypeScript · IA híbrida local (Ollama)

> **Filosofía de diseño.** El valor no está en usar el LLM más grande, sino en **combinar modelos modestos con validaciones duras (Zod + reglas en código) y trazabilidad (audit log)**. El LLM extrae y redacta; el código calcula y decide; nada con efecto jurídico se persiste como "verdad" sin validación. Para 24h: pragmatismo, un solo proceso de build (`tsx`, sin compilar), y separar la API del worker para que la inferencia nunca toque la latencia de las peticiones.

---

## 0. Decisiones críticas (elige en la hora 0)

El usuario pidió que, donde haya un camino más simple, se ofrezcan dos opciones. Estas son las que importan; en negrita la recomendación para *este* proyecto y plazo:

| Decisión | **Opción A (recomendada)** | Opción B | Elige B si… |
|---|---|---|---|
| Framework web | **Fastify** (schema validation nativa, TS de primera, rápido) | Express | El equipo domina más Express. A escala de hackathon la diferencia de rendimiento es irrelevante; manda la fluidez del equipo. |
| ORM | **Drizzle** (tipo `vector` y `cosineDistance` nativos para pgvector, migraciones rápidas con drizzle-kit) | Prisma | Priorizan DX de CRUD/migraciones y aceptan escribir `$queryRaw` para las consultas vectoriales. |
| Vector DB | **pgvector** dentro del mismo Postgres (una sola pieza de infra, transaccional con tus datos) | Qdrant (servicio aparte) | Esperaran >1M de vectores o filtrado muy complejo. **No es este caso** (miles de cláusulas). |
| OCR | **`pdf-parse` + `tesseract.js` como fallback** (cero dependencias de sistema) | `poppler` (`pdftoppm`) + `tesseract` de sistema | Hay muchos PDF escaneados y quieren más precisión/velocidad. |
| Estrategia RAG | **Pipeline determinista** (retrieve → ground → generate con cita) | Agente con herramientas | Solo como *stretch goal* si sobra tiempo. Un agente añade latencia e impredecibilidad que no quieres depurar a las 3 a.m. |
| Ollama | **Nativo en el host** (acceso a GPU directo, obligatorio en macOS) | Contenedor `ollama/ollama` | Linux + NVIDIA con `nvidia-container-toolkit` ya configurado. |

> **Razón clave del ORM:** Drizzle tiene helpers nativos de pgvector (`vector`, `cosineDistance`, índices HNSW), mientras que Prisma todavía requiere `$queryRaw` para los vectores. Como el RAG es núcleo del producto, Drizzle reduce fricción justo en lo más importante.

---

## 1. Stack tecnológico definitivo

**Núcleo del servidor**
- **Lenguaje/runtime:** Node.js 20+ con TypeScript, ejecutado con **`tsx`** (sin paso de build en dev).
- **Framework web:** **Fastify** + `@fastify/multipart` (subida de archivos en streaming) + `@fastify/jwt` (auth multi-tenant).
- **ORM:** **Drizzle ORM** + driver **`postgres`** (postgres-js) + **`drizzle-kit`** (migraciones).
- **Validación:** **Zod** (peticiones HTTP **y** salida del LLM).

**Almacenamiento de archivos (MinIO, compatible S3)**
- **`@aws-sdk/client-s3`** + **`@aws-sdk/lib-storage`** (subida en streaming desde el multipart de Fastify; también genera URLs prefirmadas).

**Cola asíncrona**
- **BullMQ** + **`ioredis`** sobre Redis. La API encola; el **worker** (proceso separado) procesa.

**IA híbrida local (Ollama)**
- Cliente **`ollama`** (npm) apuntando a `http://localhost:11434`.
- **Modelo principal (extracción y redacción):** `llama3:8b-instruct-q4_K_M` (sube a `q5_K_M` si hay VRAM).
- **Modelo secundario (razonamiento en contratos complejos):** `qwen2.5:14b-instruct-q4_K_M`, si el hardware lo permite. El gateway de modelos decide cuál usar según una bandera de complejidad.
- **Embeddings (multilingüe, importante porque los contratos están en español):** **`bge-m3`** (1024 dim) como principal; **`nomic-embed-text`** (768 dim) como alternativa más liviana y en inglés. **Define la dimensión del vector según el modelo que elijas** (afecta el esquema).
- **Salida estructurada:** se pasa el **JSON Schema** derivado de Zod (`zod-to-json-schema`) al parámetro `format` de Ollama, y luego se **valida la respuesta otra vez con Zod**. Doble red de seguridad.

**Reglas en código (sin IA, deterministas)**
- Cálculo de prestaciones (cesantías 8,33 %, intereses 12 %, prima, vacaciones, indemnización art. 64), verificación de jornada de 42 h (Ley 2101/2021), alertas de vencimiento y checklist de debido proceso. Todo con pruebas unitarias.

**OCR / parsing**
- `pdf-parse` para PDF nativos; si el texto extraído es escaso → fallback OCR con `tesseract.js` (idioma `spa`).

**Auth/seguridad**
- JWT con `@fastify/jwt`; hash de contraseña con `bcryptjs` (puro JS, sin compilación nativa — mejor para hackathon).

---

## 2. Estructura de carpetas

```
legaltech-backend/
├─ docker-compose.yml
├─ .env
├─ drizzle.config.ts
├─ package.json
├─ tsconfig.json
└─ src/
   ├─ server.ts                 # Bootstrap de Fastify (proceso API)
   ├─ worker.ts                 # Bootstrap del worker BullMQ (proceso separado)
   │
   ├─ config/
   │  └─ env.ts                 # Variables de entorno validadas con Zod
   │
   ├─ db/
   │  ├─ index.ts               # Cliente Drizzle
   │  ├─ schema.ts              # Definición de tablas (sección 3)
   │  └─ migrations/            # Generadas por drizzle-kit
   │
   ├─ lib/
   │  ├─ storage.ts             # MinIO/S3: upload, download, presign
   │  ├─ queue.ts               # Colas BullMQ + conexión Redis
   │  ├─ llm.ts                 # Ollama: extract(), generate(), embed()
   │  └─ ocr.ts                 # Texto de PDF + fallback OCR
   │
   ├─ rules/                    # ── DETERMINISTA (sin IA) ──
   │  ├─ prestaciones.ts        # cesantías, intereses, prima, vacaciones
   │  ├─ jornada.ts             # validación 42h
   │  ├─ alertas.ts             # vencimientos (fijo, vacaciones, seg. social)
   │  └─ debido-proceso.ts      # checklist disciplinario
   │
   ├─ modules/                  # ── Lógica de dominio (CRUD + features) ──
   │  ├─ organizations/         # routes.ts + service.ts
   │  ├─ users/
   │  ├─ colaboradores/
   │  ├─ contratos/             # aquí vive el endpoint de subida de PDF
   │  └─ rag/                   # endpoint de análisis: retrieve + reason
   │
   ├─ workers/
   │  ├─ ingestion.worker.ts    # PDF → texto → extracción → persistencia → embeddings
   │  └─ processors/
   │     ├─ extract.ts          # llama al LLM y valida con Zod
   │     └─ embed.ts            # trocea cláusulas y genera embeddings
   │
   └─ shared/
      ├─ schemas.ts             # Esquemas Zod (salida de extracción, requests)
      ├─ audit.ts               # writeAuditLog()
      └─ tenant.ts              # helper de scoping multi-tenant
```

---

## 3. Esquema de base de datos (Drizzle)

Multi-tenant por **`organizationId`** en cada tabla (filtrado obligatorio en cada query — ver `shared/tenant.ts`). Relación clave: **Colaborador 1 → N Contratos**, con `fileKey` apuntando al objeto en MinIO.

```ts
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

// 1) Organización (empresa cliente / tenant)
export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  nit: text("nit").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 2) Usuario (personal de Talento Humano de una organización)
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
  fechaNacimiento: date("fecha_nacimiento"),       // 'edad' se deriva de aquí
  cargo: text("cargo"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  // un colaborador es único por cédula DENTRO de su organización
  uniqCedulaOrg: uniqueIndex("uniq_cedula_org").on(t.organizationId, t.cedula),
}));

// 4) Contrato (1 colaborador → N contratos). fileKey → objeto en MinIO
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
  rawText: text("raw_text"),                        // texto extraído del PDF
  extracted: jsonb("extracted"),                    // extracción completa + confianzas
  status: jobStatus("status").notNull().default("PENDING"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// RAG: trozos de texto (cláusulas de contratos, políticas internas, normativa)
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
  // índice HNSW para búsqueda por coseno (rápida en miles/millones de filas)
  embIdx: index("emb_idx").using("hnsw", t.embedding.op("vector_cosine_ops")),
  orgIdx: index("chunks_org_idx").on(t.organizationId),
}));

// Seguimiento del trabajo asíncrono de ingestión
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

// Trazabilidad: qué sugirió la IA, con qué modelo y fuentes (requisito clave)
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull(),
  userId: uuid("user_id"),
  action: text("action").notNull(),                 // p.ej. EXTRACT_CONTRACT, RAG_RISK
  entity: text("entity"),
  entityId: uuid("entity_id"),
  aiModel: text("ai_model"),                         // modelo y versión usados
  payload: jsonb("payload"),                         // sugerencia IA + fuentes citadas
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

**Notas de esquema**
- La extracción del LLM se guarda **completa** en `contratos.extracted` (con confianzas y orígenes), pero las columnas tipadas (`salario`, `fechaInicio`, etc.) solo se llenan tras pasar la validación Zod.
- Si eliges `nomic-embed-text`, cambia `dimensions: 1024` → `768` (y vuelve a generar embeddings).
- Si optas por **Prisma** en vez de Drizzle: modela igual, pero declara el vector como `Unsupported("vector(1024)")`, habilita el preview `postgresqlExtensions`, y haz la búsqueda por similitud con `$queryRaw` usando el operador `<=>`.

---

## 4. Flujo de arquitectura: Storage + Worker de IA

Dos procesos (`server.ts` y `worker.ts`) que comparten Postgres, Redis y MinIO. La API **nunca** espera a la inferencia.

```
   ┌─────────┐   1. POST /contratos/upload (multipart, JWT)
   │ Cliente │ ───────────────────────────────────────────────►┌──────────────┐
   │  (RRHH) │                                                  │  Fastify API │
   └─────────┘   ◄──── 5. 202 Accepted { jobId }  ──────────────│  (server.ts) │
                                                                └──────┬───────┘
        2. stream del PDF → MinIO (bucket "contracts") ────────────────┤
           ◄── fileKey ──                                              │
        3. INSERT contrato(status=PENDING) + ingestion_job ────────────┤  (Postgres)
        4. queue.add("ingest", { jobId, fileKey, orgId }) ─────────────┤  (Redis/BullMQ)
                                                                       │
   ════════════════════════ proceso separado ═══════════════════════════════════
                                                                       │
   ┌──────────────┐  6. toma el job de la cola                         │
   │ BullMQ Worker │ ◄──────────────────────────────────────────────────┘
   │ (worker.ts)  │
   └──────┬───────┘
          │ 7.  download(fileKey) desde MinIO
          │ 8.  pdf-parse → ¿texto suficiente? NO → OCR tesseract.js (spa)
          │ 9.  llm.extract(texto)  → Ollama llama3:8b (format = JSON schema)
          │ 10. Zod.parse(salida)   → si falla: status=FAILED + audit, no se persiste basura
          │ 11. upsert Colaborador (por cédula + orgId) → create/update Contrato
          │ 12. trocear cláusulas → llm.embed(chunk) (bge-m3) → INSERT document_chunks(+vector)
          │ 13. reglas en código: verificar liquidación / jornada / alertas (sin IA)
          │ 14. (opcional) RAG de riesgo: detectar reclasificación
          │ 15. writeAuditLog(modelo, entrada, salida, fuentes)
          └►16. UPDATE contrato.status=DONE  |  ingestion_job.status=DONE
```

**Por qué no bloquea el Event Loop.** La inferencia pesada ocurre **dentro de Ollama** (proceso aparte, en GPU/CPU); para Node es solo una llamada HTTP asíncrona (I/O), que no consume el hilo. Además, al ejecutarse en el **worker** y limitar la concurrencia, ni la API ni Ollama se saturan.

**Concurrencia recomendada.** Ollama sirve peticiones prácticamente en serie, así que **`concurrency: 1` (máx. 2)** en el worker de extracción. Conviene **separar dos colas**: `extract` (LLM, concurrency 1) y `embed` (más liviana, concurrency 2–4). Activa `attempts` con backoff para reintentos.

### Snippets de referencia (no es toda la implementación)

```ts
// src/lib/storage.ts — subir en streaming a MinIO
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

export const s3 = new S3Client({
  endpoint: process.env.MINIO_ENDPOINT,         // http://localhost:9000
  region: "us-east-1",
  forcePathStyle: true,                         // requerido por MinIO
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY!,
    secretAccessKey: process.env.MINIO_SECRET_KEY!,
  },
});

export async function uploadStream(key: string, body: NodeJS.ReadableStream) {
  await new Upload({
    client: s3,
    params: { Bucket: "contracts", Key: key, Body: body },
  }).done();
  return key;
}
```

```ts
// src/lib/llm.ts — extracción estructurada y embeddings con Ollama
import ollama from "ollama";
import { zodToJsonSchema } from "zod-to-json-schema";
import { ExtractionSchema } from "../shared/schemas";   // tu schema Zod

export async function extractContract(text: string, complex = false) {
  const model = complex ? "qwen2.5:14b-instruct-q4_K_M" : "llama3:8b-instruct-q4_K_M";
  const res = await ollama.chat({
    model,
    format: zodToJsonSchema(ExtractionSchema) as any,    // salida estructurada
    options: { temperature: 0 },                          // determinismo
    messages: [
      { role: "system", content: "Extrae los campos del contrato. Responde SOLO el JSON del schema." },
      { role: "user", content: text },
    ],
  });
  return ExtractionSchema.parse(JSON.parse(res.message.content)); // validación dura
}

export async function embed(text: string): Promise<number[]> {
  const res = await ollama.embeddings({ model: "bge-m3", prompt: text });
  return res.embedding;
}
```

```ts
// src/modules/rag/service.ts — búsqueda por similitud con Drizzle + pgvector
import { cosineDistance, sql, and, eq, desc, gt } from "drizzle-orm";
import { db } from "../../db";
import { documentChunks } from "../../db/schema";
import { embed } from "../../lib/llm";

export async function retrieveSimilar(orgId: string, query: string, k = 5) {
  const q = await embed(query);
  const similarity = sql<number>`1 - (${cosineDistance(documentChunks.embedding, q)})`;
  return db.select({ content: documentChunks.content, source: documentChunks.source, similarity })
    .from(documentChunks)
    .where(and(eq(documentChunks.organizationId, orgId), gt(similarity, 0.5))) // tenant + umbral
    .orderBy((t) => desc(t.similarity))
    .limit(k);
}
```

> **RAG con cita o abstención.** Tras `retrieveSimilar`, arma el prompt con los trozos recuperados y pide a Qwen que **fundamente cada afirmación en un trozo citado y se abstenga si no hay soporte**. Guarda en `audit_logs` los trozos usados. Esto es lo que hace defendible el análisis de riesgo.

---

## 5. Comandos de inicialización y `docker-compose.yml`

### 5.1 Levantar la infraestructura

```bash
# 1) Carpeta del proyecto
mkdir legaltech-backend && cd legaltech-backend
npm init -y

# 2) Dependencias de runtime
npm i fastify @fastify/multipart @fastify/jwt bcryptjs
npm i drizzle-orm postgres
npm i bullmq ioredis
npm i @aws-sdk/client-s3 @aws-sdk/lib-storage
npm i ollama zod zod-to-json-schema
npm i pdf-parse tesseract.js

# 3) Dependencias de desarrollo
npm i -D typescript tsx drizzle-kit @types/node @types/bcryptjs
npx tsc --init

# 4) Infra local (Postgres+pgvector, Redis, MinIO)
docker compose up -d

# 5) Modelos locales en Ollama (host). Ajusta q4_K_M → q5_K_M si hay VRAM
ollama pull llama3:8b-instruct-q4_K_M
ollama pull qwen2.5:14b-instruct-q4_K_M     # solo si el hardware lo permite
ollama pull bge-m3                          # embeddings multilingües (español)

# 6) Migraciones de base de datos
npx drizzle-kit generate
npx drizzle-kit migrate
```

`package.json` (scripts sugeridos):

```json
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "worker": "tsx watch src/worker.ts",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio"
  }
}
```

> Corre **dos terminales**: `npm run dev` (API) y `npm run worker` (procesamiento). Ollama corriendo nativo en el host.

### 5.2 `docker-compose.yml` (exacto)

```yaml
services:
  postgres:
    image: pgvector/pgvector:pg16        # Postgres 16 con pgvector ya incluido
    container_name: legaltech-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: legaltech
      POSTGRES_PASSWORD: legaltech
      POSTGRES_DB: legaltech
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U legaltech"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: legaltech-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data

  minio:
    image: minio/minio:latest
    container_name: legaltech-minio
    restart: unless-stopped
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"     # API S3
      - "9001:9001"     # Consola web (http://localhost:9001)
    volumes:
      - miniodata:/data
    healthcheck:
      test: ["CMD", "mc", "ready", "local"]
      interval: 5s
      timeout: 5s
      retries: 5

  # Crea el bucket "contracts" automáticamente al levantar
  createbuckets:
    image: minio/mc:latest
    depends_on:
      - minio
    entrypoint: >
      /bin/sh -c "
      until (/usr/bin/mc alias set local http://minio:9000 minioadmin minioadmin) do echo 'esperando minio...' && sleep 2; done;
      /usr/bin/mc mb --ignore-existing local/contracts;
      /usr/bin/mc anonymous set none local/contracts;
      exit 0;
      "

volumes:
  pgdata:
  redisdata:
  miniodata:
```

### 5.3 `.env`

```bash
DATABASE_URL=postgres://legaltech:legaltech@localhost:5432/legaltech
REDIS_URL=redis://localhost:6379
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
OLLAMA_HOST=http://localhost:11434
JWT_SECRET=cambia-esto-en-el-hackathon
```

### 5.4 `drizzle.config.ts`

```ts
import { defineConfig } from "drizzle-kit";
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```

> **Opción Ollama en Docker (solo Linux + NVIDIA):** añade un servicio `ollama` con imagen `ollama/ollama`, mapea `11434:11434`, monta un volumen para los modelos y agrega `deploy.resources.reservations.devices` con el driver `nvidia`. En **macOS no funciona** (Docker no accede a la GPU Metal): usa Ollama nativo.

---

## 6. Plan de ataque para 24h (orden sugerido)

1. **Hora 0–1:** `docker compose up`, `ollama pull`, esqueleto Fastify + Drizzle + migraciones. Que arranque y conecte.
2. **Hora 1–4:** CRUD de Organización/Usuario/Colaborador + JWT + scoping multi-tenant. *(Esto da puntos seguros y no depende de IA.)*
3. **Hora 4–8:** Subida a MinIO + cola BullMQ + worker que extrae texto y persiste. Sin LLM todavía (mockea la extracción).
4. **Hora 8–14:** Conecta Ollama (extracción estructurada + Zod) y los **embeddings**. Llena `document_chunks`.
5. **Hora 14–18:** **Reglas en código** (liquidación, jornada, alertas, checklist). Es donde está la mayor relación valor/riesgo y es 100 % demostrable.
6. **Hora 18–22:** RAG de detección de riesgo (retrieve + reason con cita) y `audit_logs`.
7. **Hora 22–24:** Pulir demo, datos de prueba, y preparar respuestas a las preguntas del jurado (trazabilidad, qué hace la IA vs. el código, qué pasa si se equivoca).

> **Si el tiempo aprieta, sacrifica el RAG agente y la OCR robusta antes que las reglas en código.** Un cálculo determinista correcto con trazabilidad impresiona más a un jurado jurídico que un agente vistoso que alucina cifras.
