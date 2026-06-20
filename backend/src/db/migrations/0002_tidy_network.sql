ALTER TABLE "colaboradores" ADD COLUMN "tipo_contrato" "contract_type";--> statement-breakpoint
ALTER TABLE "colaboradores" ADD COLUMN "fecha_inicio" date;--> statement-breakpoint
ALTER TABLE "colaboradores" ADD COLUMN "fecha_fin" date;--> statement-breakpoint
ALTER TABLE "colaboradores" ADD COLUMN "salario" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "colaboradores" ADD COLUMN "jornada_horas_semana" integer;