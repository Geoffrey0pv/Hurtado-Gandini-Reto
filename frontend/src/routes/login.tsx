import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { HGLogo } from "@/components/brand/HGLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Ingreso · LaborApp" },
      { name: "description", content: "Acceso a LaborApp, plataforma de compliance laboral de Hurtado Gandini." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("laborapp-auth", "1");
      }
      navigate({ to: "/dashboard" });
    }, 700);
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(80% 60% at 50% 0%, oklch(0.28 0.05 25 / 25%) 0%, transparent 60%), radial-gradient(60% 40% at 50% 100%, oklch(0.22 0.005 270) 0%, transparent 70%)",
        }}
      />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6">
        <HGLogo className="mb-10" />
        <div className="w-full rounded-3xl border border-border bg-card/80 p-8 shadow-[var(--shadow-elegant)] backdrop-blur-xl">
          <p className="text-[11px] uppercase tracking-[0.28em] text-primary">Plataforma jurídica</p>
          <h1 className="mt-2 font-display text-4xl text-foreground">LaborApp</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Compliance laboral asistido por IA, con revisión jurídica obligatoria.
          </p>

          <form className="mt-8 space-y-5" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs uppercase tracking-wider text-muted-foreground">
                Correo corporativo
              </Label>
              <Input
                id="email"
                type="email"
                defaultValue="margarita.villamil@hurtadogandini.co"
                className="h-11 border-border-strong/60 bg-background/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs uppercase tracking-wider text-muted-foreground">
                Contraseña
              </Label>
              <Input
                id="password"
                type="password"
                defaultValue="••••••••••"
                className="h-11 border-border-strong/60 bg-background/50"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {loading ? "Verificando…" : "Ingresar"}
            </Button>
          </form>

          <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground">
            <button className="hover:text-foreground">¿Olvidó su contraseña?</button>
            <span className="rounded-full border border-border-strong/60 px-2 py-0.5">SSO próximamente</span>
          </div>
        </div>

        <p className="mt-10 max-w-sm text-center text-[11px] leading-relaxed text-muted-foreground">
          Revisión jurídica obligatoria antes de cualquier emisión legal. Ningún resultado de IA
          tiene efecto legal sin aprobación humana documentada.
        </p>
      </div>
    </div>
  );
}
