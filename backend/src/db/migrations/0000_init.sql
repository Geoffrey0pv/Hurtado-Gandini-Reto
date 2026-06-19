CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE TYPE "public"."contract_type" AS ENUM('TERMINO_FIJO', 'TERMINO_INDEFINIDO', 'OBRA_LABOR', 'PRESTACION_SERVICIOS', 'APRENDIZAJE', 'OTRO');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('PENDING', 'PROCESSING', 'DONE', 'FAILED');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid,
	"action" text NOT NULL,
	"entity" text,
	"entity_id" uuid,
	"ai_model" text,
	"payload" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "colaboradores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"cedula" text NOT NULL,
	"fecha_nacimiento" date,
	"cargo" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contratos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"colaborador_id" uuid NOT NULL,
	"tipo_contrato" "contract_type",
	"fecha_inicio" date,
	"fecha_fin" date,
	"salario" numeric(14, 2),
	"jornada_horas_semana" integer,
	"file_key" text NOT NULL,
	"file_url" text,
	"raw_text" text,
	"extracted" jsonb,
	"status" "job_status" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"contrato_id" uuid,
	"source" text NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(1024),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingestion_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"contrato_id" uuid,
	"file_key" text NOT NULL,
	"status" "job_status" DEFAULT 'PENDING' NOT NULL,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"nit" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_nit_unique" UNIQUE("nit")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'hr' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "colaboradores" ADD CONSTRAINT "colaboradores_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_colaborador_id_colaboradores_id_fk" FOREIGN KEY ("colaborador_id") REFERENCES "public"."colaboradores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_contrato_id_contratos_id_fk" FOREIGN KEY ("contrato_id") REFERENCES "public"."contratos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_cedula_org" ON "colaboradores" USING btree ("organization_id","cedula");--> statement-breakpoint
CREATE INDEX "emb_idx" ON "document_chunks" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "chunks_org_idx" ON "document_chunks" USING btree ("organization_id");