# LaborApp — SaaS LegalTech (Derecho Laboral y Compliance)

Plataforma B2B multi-tenant para áreas de Talento Humano que centraliza la gestión
de colaboradores, contratos y obligaciones laborales, y aplica IA híbrida local
(Ollama) para extraer datos de contratos en PDF y detectar riesgos legales con
trazabilidad. El cálculo de prestaciones, jornada (Ley 2101/2021) y debido proceso
se hace con reglas deterministas en código; el LLM solo extrae y redacta, nunca
calcula cifras con efecto jurídico.

## Arquitectura

```
                         ┌──────────────────────────┐
                         │  Frontend (React 19)      │
                         │  TanStack Start + Router  │
                         │  TanStack Query + shadcn  │
                         └────────────┬─────────────┘
                                      │ HTTP + JWT (Bearer)
                                      ▼
                         ┌──────────────────────────┐
                         │  Backend API (Fastify)    │   server.ts
                         │  REST + JWT multi-tenant  │
                         └───┬──────────┬────────┬───┘
                             │          │        │
              encola job     │          │ SQL    │ presign / upload
                             ▼          ▼        ▼
        ┌────────────┐  ┌─────────┐ ┌─────────────┐ ┌──────────────┐
        │ Redis      │  │ Postgres│ │   MinIO      │ │   Ollama     │
        │ (BullMQ)   │  │ +pgvector│ │  (S3, PDFs) │ │  (host/GPU)  │
        └─────┬──────┘  └─────────┘ └─────────────┘ └──────┬───────┘
              │                                            │
              ▼ toma el job                                │ inferencia
        ┌──────────────────────────┐                      │
        │  Worker (BullMQ)          │ ─────────────────────┘
        │  worker.ts                │  extrae texto, LLM + embeddings
        └──────────────────────────┘
```

- Monorepo con dos paquetes: [backend/](backend/) (Fastify + Drizzle) y [frontend/](frontend/) (TanStack Start).
- La API nunca espera a la inferencia: encola en Redis y el worker procesa aparte.
- Stack: Node 20+/TypeScript (tsx), Fastify, Drizzle ORM, Postgres 16 + pgvector,
  Redis/BullMQ, MinIO (S3), Ollama (llama3:8b, qwen2.5:14b, bge-m3), Zod.
- Frontend: React 19, TanStack Start/Router/Query, Tailwind, shadcn/ui (Radix).

Documentación detallada del sistema, requerimientos y API en
[DOCUMENTATION.md](DOCUMENTATION.md).

## Requisitos previos

- Node.js 20 o superior
- Docker y Docker Compose
- Ollama instalado en el host (https://ollama.com)

## Cómo ejecutarlo

### 1. Infraestructura (Postgres + pgvector, Redis, MinIO)

```bash
cd backend
docker compose up -d
```

Esto deja Postgres en 5432, Redis en 6379, MinIO en 9000 (consola 9001) y crea el
bucket `contracts` automáticamente.

### 2. Modelos de Ollama (en el host)

```bash
ollama pull llama3:8b-instruct-q4_K_M
ollama pull qwen2.5:14b-instruct-q4_K_M
ollama pull bge-m3
```

Si no quieres descargar modelos, usa `LLM_MODE=mock` en el `.env` para correr el
pipeline completo con extracción y embeddings deterministas.

### 3. Backend

```bash
cd backend
cp ../.env.example .env        # crea backend/.env (dotenv carga desde este directorio)
npm install
npm run db:migrate            # aplica migraciones (incluye CREATE EXTENSION vector)
npm run dev                   # API en http://localhost:3000
npm run worker               # en otra terminal: procesa la cola de ingestión
```

### 4. Frontend

```bash
cd frontend
npm install
# El frontend lee VITE_API_URL (por defecto http://localhost:3000).
# Si el dev server no corre en http://localhost:4000, ajusta FRONTEND_URL en
# backend/.env para que coincida (lista de orígenes permitidos por CORS).
npm run dev
```

### Verificación rápida

```bash
curl http://localhost:3000/health     # { "status": "ok", "db": "up" }
cd backend && npm test               # 40 tests (reglas deterministas + schemas RAG)
```

## Estructura del repositorio

```
.
├─ backend/      API Fastify, worker, reglas deterministas, RAG, Drizzle
├─ frontend/     App React (TanStack Start) con el panel de RRHH
├─ README.md
└─ DOCUMENTATION.md
```
