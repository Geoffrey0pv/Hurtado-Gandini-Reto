import { Outlet, redirect, createFileRoute } from "@tanstack/react-router";
import { InstitutionalTopbar } from "@/components/layout/InstitutionalTopbar";
import { isAuthenticated } from "@/lib/auth";

export const Route = createFileRoute("/_app")({
  beforeLoad: ({ location }) => {
    if (typeof window !== "undefined") {
      if (!isAuthenticated() && location.pathname !== "/login") {
        throw redirect({ to: "/login" });
      }
    }
  },
  component: AppLayout,
});

function AppLayout() {
  return (
    <div className="relative min-h-screen bg-background">
      <InstitutionalTopbar />
      <main>
        <Outlet />
      </main>
      <footer className="mt-16 border-t border-border bg-background/60">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 py-6 text-[11px] text-muted-foreground sm:px-6 lg:px-10">
          <span>© Hurtado Gandini · VinApp · Uso interno autorizado.</span>
          <span className="uppercase tracking-[0.22em]">Revisión jurídica obligatoria</span>
        </div>
      </footer>
    </div>
  );
}
