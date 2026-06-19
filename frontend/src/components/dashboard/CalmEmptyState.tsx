import { Link } from "@tanstack/react-router";
import { FileSearch, UserPlus } from "lucide-react";

const QUOTES = [
  "Hoy no hay fuegos que apagar. Buen momento para construir.",
  "La calma también es cumplimiento.",
  "Cuando todo está al día, el derecho laboral respira.",
  "Sin alertas pendientes: tu equipo está protegido.",
  "Un día tranquilo es la mejor evidencia de buen gobierno.",
];

export function CalmEmptyState() {
  const quote = QUOTES[new Date().getDate() % QUOTES.length];

  return (
    <section className="group relative overflow-hidden rounded-3xl border border-border bg-card px-6 py-16 text-center md:py-24">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />

      <div className="relative mx-auto max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">
          Nada pendiente
        </p>
        <blockquote className="mt-6 font-display text-3xl leading-snug text-foreground transition-opacity duration-300 md:text-4xl md:group-hover:opacity-40">
          “{quote}”
        </blockquote>
        <p className="mt-4 text-xs uppercase tracking-[0.22em] text-muted-foreground">
          — Vinculapp
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 opacity-100 transition-all duration-300 sm:flex-row md:translate-y-2 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100">
          <Link
            to="/colaboradores/nuevo-contrato"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            <FileSearch className="h-4 w-4" />
            Subir un contrato
          </Link>
          <Link
            to="/colaboradores/nuevo-manual"
            className="inline-flex items-center gap-2 rounded-full border border-border-strong/60 px-5 py-2.5 text-sm text-foreground transition hover:border-primary/40 hover:bg-surface-elevated"
          >
            <UserPlus className="h-4 w-4" />
            Registrar un colaborador
          </Link>
        </div>
      </div>
    </section>
  );
}
