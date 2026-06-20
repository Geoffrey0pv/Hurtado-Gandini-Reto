import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { EmployeesProvider } from "@/lib/store";
import { LiquidacionProvider } from "@/lib/liquidacion-store";
import { ObligacionesProvider } from "@/lib/obligaciones-store";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-primary">Error 404</p>
        <h1 className="mt-4 font-display text-4xl">Página no encontrada</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          La ruta solicitada no existe o fue movida.
        </p>
        <Link
          to="/dashboard"
          className="mt-8 inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          Volver al panel
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-2xl">No pudimos cargar esta vista</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Ocurrió un error inesperado. Puedes reintentar o volver al panel principal.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Reintentar
          </button>
          <a
            href="/dashboard"
            className="inline-flex items-center rounded-full border border-border-strong px-5 py-2 text-sm font-medium text-foreground hover:bg-surface-elevated"
          >
            Ir al panel
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "VinApp · Hurtado Gandini" },
      { name: "description", content: "Compliance laboral asistido por IA, con revisión jurídica obligatoria." },
      { name: "author", content: "Hurtado Gandini" },
      { property: "og:title", content: "VinApp · Hurtado Gandini" },
      { property: "og:description", content: "Compliance laboral asistido por IA, con revisión jurídica obligatoria." },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Taviraj:wght@400;500;600;700&family=Open+Sans:wght@400;500;600;700&family=Mukta+Vaani:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className="dark">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <EmployeesProvider>
        <LiquidacionProvider>
          <ObligacionesProvider>
            <TooltipProvider delayDuration={150}>
              <Outlet />
              <Toaster position="top-right" theme="dark" richColors closeButton />
            </TooltipProvider>
          </ObligacionesProvider>
        </LiquidacionProvider>
      </EmployeesProvider>
    </QueryClientProvider>
  );
}

