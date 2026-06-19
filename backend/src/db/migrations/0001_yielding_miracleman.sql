CREATE TYPE "public"."estado_colaborador" AS ENUM('activo', 'inactivo');--> statement-breakpoint
CREATE TYPE "public"."estado_expediente" AS ENUM('abierto', 'cerrado');--> statement-breakpoint
CREATE TYPE "public"."estado_vinculacion" AS ENUM('activo', 'retirado');--> statement-breakpoint
CREATE TYPE "public"."gravedad" AS ENUM('leve', 'grave', 'gravisima');--> statement-breakpoint
CREATE TYPE "public"."modalidad" AS ENUM('Presencial', 'Virtual');--> statement-breakpoint
CREATE TYPE "public"."presencia" AS ENUM('en_oficina', 'vacaciones', 'permiso', 'incapacidad');--> statement-breakpoint
CREATE TYPE "public"."riesgo" AS ENUM('alto', 'medio', 'bajo');--> statement-breakpoint
CREATE TYPE "public"."tipo_hora" AS ENUM('extra_diurna', 'extra_nocturna', 'recargo_nocturno', 'recargo_dom_fest', 'recargo_dom_fest_nocturno', 'extra_dom_fest_diurna', 'extra_dom_fest_nocturna', 'pto', 'permiso', 'incapacidad', 'ordinaria');--> statement-breakpoint
CREATE TABLE "areas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documentos_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"colaborador_id" uuid NOT NULL,
	"slot_key" text NOT NULL,
	"file_key" text NOT NULL,
	"nombre" text NOT NULL,
	"size" integer DEFAULT 0 NOT NULL,
	"subido_en" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expedientes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"colaborador_id" uuid NOT NULL,
	"hechos" text NOT NULL,
	"fecha_hechos" date NOT NULL,
	"gravedad" "gravedad" NOT NULL,
	"norma_vulnerada" text,
	"fecha_diligencia" date,
	"hora" text,
	"modalidad" "modalidad" DEFAULT 'Presencial',
	"lugar" text,
	"asistentes" text,
	"ciudad" text,
	"estado" "estado_expediente" DEFAULT 'abierto' NOT NULL,
	"carta_texto" text,
	"etapas" jsonb DEFAULT '{}'::jsonb,
	"notificado" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "novedades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"colaborador_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"descripcion" text,
	"fecha" date NOT NULL,
	"monto" numeric(14, 2),
	"origen" text DEFAULT 'manual',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "timesheet_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"colaborador_id" uuid NOT NULL,
	"fecha" date NOT NULL,
	"horas" numeric(4, 1) NOT NULL,
	"tipo" "tipo_hora" NOT NULL,
	"notas" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "colaboradores" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "colaboradores" ADD COLUMN "telefono" text;--> statement-breakpoint
ALTER TABLE "colaboradores" ADD COLUMN "area" text;--> statement-breakpoint
ALTER TABLE "colaboradores" ADD COLUMN "jefe_id" uuid;--> statement-breakpoint
ALTER TABLE "colaboradores" ADD COLUMN "estado" "estado_colaborador" DEFAULT 'activo' NOT NULL;--> statement-breakpoint
ALTER TABLE "colaboradores" ADD COLUMN "estado_vinculacion" "estado_vinculacion" DEFAULT 'activo' NOT NULL;--> statement-breakpoint
ALTER TABLE "colaboradores" ADD COLUMN "presencia" "presencia" DEFAULT 'en_oficina' NOT NULL;--> statement-breakpoint
ALTER TABLE "colaboradores" ADD COLUMN "riesgo" "riesgo" DEFAULT 'bajo' NOT NULL;--> statement-breakpoint
ALTER TABLE "colaboradores" ADD COLUMN "fueros" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "colaboradores" ADD COLUMN "arl_nivel" integer DEFAULT 2;--> statement-breakpoint
ALTER TABLE "colaboradores" ADD COLUMN "origen" text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "areas" ADD CONSTRAINT "areas_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documentos_slots" ADD CONSTRAINT "documentos_slots_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documentos_slots" ADD CONSTRAINT "documentos_slots_colaborador_id_colaboradores_id_fk" FOREIGN KEY ("colaborador_id") REFERENCES "public"."colaboradores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expedientes" ADD CONSTRAINT "expedientes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expedientes" ADD CONSTRAINT "expedientes_colaborador_id_colaboradores_id_fk" FOREIGN KEY ("colaborador_id") REFERENCES "public"."colaboradores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "novedades" ADD CONSTRAINT "novedades_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "novedades" ADD CONSTRAINT "novedades_colaborador_id_colaboradores_id_fk" FOREIGN KEY ("colaborador_id") REFERENCES "public"."colaboradores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timesheet_entries" ADD CONSTRAINT "timesheet_entries_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timesheet_entries" ADD CONSTRAINT "timesheet_entries_colaborador_id_colaboradores_id_fk" FOREIGN KEY ("colaborador_id") REFERENCES "public"."colaboradores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_area_org" ON "areas" USING btree ("organization_id","nombre");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_slot_colab" ON "documentos_slots" USING btree ("colaborador_id","slot_key");--> statement-breakpoint
CREATE INDEX "doc_org_idx" ON "documentos_slots" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "exp_org_idx" ON "expedientes" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "nov_org_idx" ON "novedades" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "ts_org_idx" ON "timesheet_entries" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "ts_colab_idx" ON "timesheet_entries" USING btree ("colaborador_id");