# Documentación del Sistema — LaborApp (SaaS LegalTech)

Documento técnico del backend y frontend desarrollados. Cubre la descripción del
sistema, los requerimientos implementados, la arquitectura, el modelo de datos, el
pipeline de IA, las reglas deterministas y la documentación completa de la API.

---

## 1. Descripción del sistema

LaborApp es un SaaS B2B multi-tenant orientado a equipos de Talento Humano y
abogados laboralistas en Colombia. Permite:

- Gestionar organizaciones (tenants), usuarios, áreas y colaboradores.
- Subir contratos en PDF, extraer sus datos con IA y persistirlos validados.
- Calcular prestaciones, validar la jornada legal y revisar el debido proceso
  disciplinario mediante reglas deterministas (sin IA), con trazabilidad.
- Analizar riesgos legales de un contrato con RAG (recuperación + razonamiento)
  citando las fuentes documentales o absteniéndose cuando no hay evidencia.
- Registrar la trazabilidad de toda sugerencia de IA en `audit_logs`.

### Filosofía de diseño

El valor no está en el modelo más grande, sino en combinar modelos modestos con
validaciones duras (Zod + reglas en código) y trazabilidad (audit log). El LLM
extrae y redacta; el código calcula y decide. Nada con efecto jurídico se persiste
como verdad sin pasar validación. La API y el worker son procesos separados para
que la inferencia nunca afecte la latencia de las peticiones.

---

## 2. Stack tecnológico

### Backend

| Capa | Tecnología |
|---|---|
| Runtime | Node.js 20+ con TypeScript, ejecutado con `tsx` (sin build en dev) |
| Framework web | Fastify 5 + `@fastify/jwt` + `@fastify/multipart` + `@fastify/cors` |
| ORM | Drizzle ORM + driver `postgres` (postgres-js) + `drizzle-kit` |
| Base de datos | Postgres 16 con extensión `pgvector` (índice HNSW por coseno) |
| Cola asíncrona | BullMQ sobre Redis (`ioredis`) |
| Almacenamiento | MinIO (compatible S3) vía `@aws-sdk/client-s3` + `lib-storage` |
| IA local | Ollama: `llama3:8b` y `qwen2.5:14b` (texto), `bge-m3` (embeddings, 1024d) |
| Validación | Zod (requests HTTP y salida del LLM) + `zod-to-json-schema` |
| OCR / parsing | `pdf-parse` con fallback OCR `tesseract.js` (idioma `spa`) |
| Auth | JWT con `@fastify/jwt`; hash con `bcryptjs` |

### Frontend

| Capa | Tecnología |
|---|---|
| Framework | React 19 + TanStack Start (SSR) |
| Routing | TanStack Router (rutas basadas en archivos) |
| Datos | TanStack Query (un hook por módulo del backend) |
| UI | Tailwind CSS 4 + shadcn/ui (Radix UI) + lucide-react |
| Build | Vite |

---

## 3. Arquitectura

### 3.1 Procesos

Dos procesos comparten Postgres, Redis y MinIO:

- `server.ts` — API Fastify. Atiende HTTP, encola jobs, nunca espera inferencia.
- `worker.ts` — Worker BullMQ. Descarga el PDF, extrae texto, llama al LLM,
  genera embeddings y persiste resultados.

### 3.2 Flujo de ingestión de un contrato

```
1. POST /contratos/upload (multipart, JWT)
2. La API sube el PDF a MinIO (bucket "contracts") en streaming -> fileKey
3. INSERT contrato(status=PENDING) + ingestion_job
4. queue.add("extract", { contratoId, fileKey, orgId })  -> 202 Accepted { jobId }
   ── proceso separado ──
5. Worker toma el job y descarga el PDF de MinIO
6. pdf-parse -> ¿texto suficiente? NO -> OCR tesseract.js (spa)
7. llm.extractContract(texto) -> Ollama (format = JSON Schema de Zod)
8. Zod.parse(salida) -> si falla: status=FAILED + audit, no se persiste basura
9. upsert Colaborador (por cédula + orgId) -> update Contrato con campos tipados
10. cola "embed": trocea cláusulas -> embed(chunk) con bge-m3 -> document_chunks
11. writeAuditLog(modelo, entrada, salida)
12. UPDATE contrato.status=DONE
```

Concurrencia: la cola `extract` (LLM) corre en serie (Ollama atiende casi
secuencialmente); la cola `embed` puede ir con mayor concurrencia.

### 3.3 Multi-tenancy

Cada tabla de negocio tiene `organizationId`. El JWT lleva el tenant; el helper
`shared/tenant.ts` lo extrae de `req.user` y todos los services filtran cada query
por `organizationId`. Regla de oro: ninguna consulta de negocio se ejecuta sin ese
filtro.

---

## 4. Modelo de datos

Esquema Drizzle en [backend/src/db/schema.ts](backend/src/db/schema.ts). 12 tablas:

| Tabla | Propósito |
|---|---|
| `organizations` | Tenant (empresa cliente). NIT único. |
| `users` | Usuarios de RRHH/abogado/admin de una organización. |
| `areas` | Áreas de la organización (organigrama). |
| `colaboradores` | Trabajadores. Único por (organización, cédula). Incluye estado, presencia, riesgo, fueros, nivel ARL. |
| `contratos` | 1 colaborador → N contratos. `fileKey` apunta a MinIO; `extracted` guarda la extracción IA completa; `status` sigue el job. |
| `document_chunks` | Trozos de texto (contrato/política/normativa) con `embedding` vector(1024) e índice HNSW para búsqueda por coseno. |
| `ingestion_jobs` | Seguimiento del trabajo asíncrono de ingestión. |
| `audit_logs` | Trazabilidad de IA: acción, entidad, modelo usado y payload (sugerencia + fuentes). |
| `timesheet_entries` | Horas registradas por colaborador, tipificadas (extras, recargos, PTO, etc.). |
| `documentos_slots` | Documentos por colaborador y slot (contrato, EPS, ARL...), almacenados en MinIO. |
| `expedientes` | Expedientes disciplinarios: hechos, gravedad, etapas, notificaciones, carta. |
| `novedades` | Novedades de nómina por colaborador. |

Enums principales: `contract_type`, `job_status`, `estado_colaborador`,
`estado_vinculacion`, `presencia`, `riesgo`, `gravedad`, `estado_expediente`,
`modalidad`, `tipo_hora`.

Migraciones: `0000_init.sql` (tablas base + `CREATE EXTENSION vector` + índice
HNSW) y `0001_yielding_miracleman.sql` (módulos ampliados).

---

## 5. Requerimientos implementados

### 5.1 Núcleo (gestión)

- Registro y login de usuarios con JWT; aislamiento multi-tenant en todas las rutas.
- CRUD de organización, áreas, colaboradores y sus documentos.
- Subida de contratos PDF a MinIO con procesamiento asíncrono.
- Timesheet, novedades de nómina y expedientes disciplinarios.
- Dashboard con resumen agregado por tenant.

### 5.2 IA híbrida (Ollama)

- Extracción estructurada de contratos: se pasa el JSON Schema derivado de Zod al
  parámetro `format` de Ollama y se vuelve a validar la respuesta con Zod (doble
  red de seguridad). Modo `mock` para correr sin modelos.
- Embeddings multilingües con `bge-m3` (1024d) para poblar `document_chunks`.
- RAG de riesgo: recuperación por similitud (pgvector) + razonamiento con
  qwen2.5:14b, citando fuentes `[FUENTE N]` o absteniéndose explícitamente.

### 5.3 Reglas deterministas (sin IA, con tests)

En [backend/src/rules/](backend/src/rules/), 100% probadas (40 tests):

- `prestaciones.ts` — cesantías (8,33%), intereses (12%), prima, vacaciones,
  indemnización art. 64, liquidación definitiva. Cada concepto incluye fórmula y
  base legal.
- `jornada.ts` — validación de jornada máxima según Ley 2101/2021 (reducción
  gradual hasta 42h en julio de 2026).
- `alertas.ts` — vencimientos (contrato a término fijo, vacaciones, seguridad
  social).
- `debido-proceso.ts` — checklist disciplinario.
- `analisis.ts` — análisis determinista consolidado de un contrato.

### 5.4 Trazabilidad

Toda sugerencia de IA queda en `audit_logs` con la acción (`EXTRACT_CONTRACT`,
`RAG_RISK`, `RAG_RISK_ABSTENTION`), el modelo y versión, y el payload con las
fuentes citadas. Consultable vía API.

---

## 6. Pipeline RAG de riesgo (detalle)

Implementado en [backend/src/modules/rag/service.ts](backend/src/modules/rag/service.ts).
Patrón: **retrieve → ground → generate con cita o abstención**.

1. **Validación**: el contrato debe existir, pertenecer al tenant y estar en
   estado `DONE` (si no, 404 o 409).
2. **Retrieve** (`retrieveSimilar`): se genera el embedding de la consulta con
   bge-m3 y se buscan los `k` chunks más similares con `cosineDistance` de Drizzle
   sobre pgvector, filtrando por `organizationId` y umbral de similitud. En
   `LLM_MODE=mock` el umbral se relaja porque los embeddings mock son
   pseudo-aleatorios.
3. **Abstención**: si no hay chunks relevantes, retorna una respuesta de abstención
   explícita (no inventa) y la registra en `audit_logs`.
4. **Ground**: se arma un prompt que lista cada chunk como `[FUENTE N]` con su
   similitud y exige citar las fuentes y abstenerse si la evidencia es insuficiente.
5. **Generate** (`generateStructured`): qwen2.5:14b con `format` = JSON Schema de
   Zod; la respuesta se valida con `RagResponseSchema` (riesgos con severidad y
   fuentes citadas, resumen, abstenciones, confianza 0–1).
6. **Audit**: se guarda en `audit_logs` (`RAG_RISK`) el modelo, la consulta, los
   chunks recuperados (id, fuente, similitud, preview) y la respuesta.

Prueba de humo reproducible: `npx tsx src/scripts/rag-smoke.ts` (siembra un
contrato con cláusulas riesgosas, genera embeddings y ejecuta el análisis con
inferencia real).

---

## 7. Documentación de la API

Base URL por defecto: `http://localhost:3000`. Salvo `/health`, `/auth/register` y
`/auth/login`, todas las rutas requieren `Authorization: Bearer <JWT>`. El tenant
se deriva del token. Errores: 400 (validación Zod), 401 (sin token/ inválido),
404/409 (negocio), 500 (interno). Cuerpos en JSON salvo subidas multipart.

### Salud

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/health` | Estado del servicio y conexión a la base de datos. |

### Autenticación — `/auth`

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/auth/register` | No | Crea organización + primer usuario. Devuelve token. |
| POST | `/auth/login` | No | Login con email y contraseña. Devuelve token. |
| GET | `/auth/me` | Sí | Datos del usuario autenticado. |

### Organización — `/organizations`

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/organizations/me` | Organización del tenant actual. |
| PATCH | `/organizations/me` | Actualiza datos de la organización. |

### Áreas — `/areas`

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/areas` | Lista las áreas del tenant. |
| POST | `/areas` | Crea un área. |
| PATCH | `/areas/:id` | Actualiza un área. |
| DELETE | `/areas/:id` | Elimina un área. |

### Colaboradores — `/colaboradores`

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/colaboradores` | Lista colaboradores del tenant. |
| GET | `/colaboradores/:id` | Detalle de un colaborador. |
| POST | `/colaboradores` | Crea un colaborador (único por cédula). |
| PATCH | `/colaboradores/:id` | Actualiza un colaborador. |
| DELETE | `/colaboradores/:id` | Elimina un colaborador. |

### Contratos — `/contratos`

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/contratos/upload` | Sube un PDF (multipart), lo almacena en MinIO y encola la ingestión. Responde 202 con el job. |
| GET | `/contratos` | Lista contratos del tenant. |
| GET | `/contratos/:id` | Detalle de un contrato (incluye `extracted` y `status`). |
| GET | `/contratos/:id/analisis` | Análisis determinista (prestaciones, jornada, alertas) calculado con reglas en código. |
| GET | `/contratos/job/:id` | Estado del job de ingestión. |

### Timesheet — `/timesheet`

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/timesheet` | Lista registros de horas. |
| POST | `/timesheet` | Crea un registro de horas (tipificado). |
| DELETE | `/timesheet/:id` | Elimina un registro. |

### Documentos — `/documentos`

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/documentos` | Lista documentos por colaborador/slot. |
| POST | `/documentos/upload` | Sube un documento (multipart) a un slot en MinIO. |
| DELETE | `/documentos/:id` | Elimina un documento. |

### Disciplinario — `/disciplinario`

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/disciplinario` | Lista expedientes disciplinarios. |
| GET | `/disciplinario/:id` | Detalle de un expediente. |
| POST | `/disciplinario` | Crea un expediente. |
| PATCH | `/disciplinario/:id` | Actualiza un expediente. |
| GET | `/disciplinario/:id/debido-proceso` | Checklist determinista de debido proceso. |

### Novedades — `/novedades`

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/novedades` | Lista novedades de nómina. |
| POST | `/novedades` | Crea una novedad. |
| DELETE | `/novedades/:id` | Elimina una novedad. |

### Alertas — `/alertas`

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/alertas` | Alertas de vencimientos del tenant (calculadas con reglas). |

### Dashboard — `/dashboard`

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/dashboard/summary` | Resumen agregado del tenant para el panel. |

### RAG — `/rag`

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/rag/analyze` | Análisis de riesgo de un contrato. Body: `{ contratoId, query }`. Retrieve + reason con cita o abstención; registra audit log. |
| GET | `/rag/similar` | Búsqueda de chunks similares (debug/exploración). Query: `?q=...&k=5`. |

Respuesta de `/rag/analyze`:

```json
{
  "contratoId": "uuid",
  "query": "texto",
  "model": "qwen2.5:14b-instruct-q4_K_M",
  "chunksUsed": 8,
  "abstained": false,
  "riesgos": [
    {
      "descripcion": "...",
      "severidad": "alta",
      "fuentesCitadas": ["FUENTE 1"],
      "recomendacion": "..."
    }
  ],
  "resumen": "...",
  "abstenciones": [],
  "confianza": 1
}
```

### Audit logs — `/audit-logs`

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/audit-logs` | Lista de trazabilidad del tenant. Query opcional: `?desde=&hasta=&action=`. |

---

## 8. Frontend

App React (TanStack Start) en [frontend/](frontend/). El cliente HTTP central
([frontend/src/lib/api.ts](frontend/src/lib/api.ts)) inyecta el JWT desde
`localStorage` y apunta a `VITE_API_URL` (por defecto `http://localhost:3000`).

Rutas principales (en `frontend/src/routes/`): `login`, `dashboard`,
`colaboradores` (lista, detalle, alta manual y por contrato), `documentos`,
`alertas`, `auditoria`, `organizacion`, `revision`.

Cada módulo del backend tiene su hook de TanStack Query en `frontend/src/hooks/`
(`useColaboradores`, `useContratos`, `useDocumentos`, `useDisciplinario`,
`useTimesheet`, `useNovedades`, `useAlertas`, `useAuditoria`, `useAreas`,
`useDashboard`), lo que mantiene la capa de datos alineada con la API REST.

---

## 9. Variables de entorno (backend)

Definidas y validadas con Zod en [backend/src/config/env.ts](backend/src/config/env.ts).
Crear `backend/.env` (plantilla en `.env.example` de la raíz):

| Variable | Por defecto | Descripción |
|---|---|---|
| `DATABASE_URL` | — | Conexión a Postgres (obligatoria). |
| `REDIS_URL` | `redis://localhost:6379` | Conexión a Redis (BullMQ). |
| `FRONTEND_URL` | `http://localhost:4000` | Origen permitido por CORS. |
| `MINIO_ENDPOINT` | `http://localhost:9000` | Endpoint S3 de MinIO. |
| `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` | `minioadmin` | Credenciales MinIO. |
| `MINIO_BUCKET` | `contracts` | Bucket de contratos. |
| `OLLAMA_HOST` | `http://localhost:11434` | Host de Ollama. |
| `LLM_MODE` | `ollama` | `ollama` (real) o `mock` (sin modelos). |
| `OLLAMA_MODEL` | `llama3:8b-instruct-q4_K_M` | Modelo de extracción/redacción. |
| `OLLAMA_MODEL_COMPLEX` | `qwen2.5:14b-instruct-q4_K_M` | Modelo de razonamiento (RAG). |
| `EMBED_MODEL` | `bge-m3` | Modelo de embeddings. |
| `EMBED_DIM` | `1024` | Dimensión del vector (debe coincidir con el esquema). |
| `JWT_SECRET` | — | Secreto JWT (mín. 8 caracteres, obligatorio). |
| `PORT` | `3000` | Puerto de la API. |
| `NODE_ENV` | `development` | Entorno. |

---

## 10. Pruebas y verificación

```bash
cd backend
npm run typecheck      # tsc --noEmit, sin errores
npm test               # 40 tests: reglas deterministas + schemas RAG
```

Las reglas de derecho laboral (prestaciones, jornada, debido proceso) están
cubiertas por tests unitarios porque son funciones puras y deterministas: es la
parte de mayor valor jurídico y la más demostrable.
