import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, ChevronDown, Menu, Search, UserRound } from "lucide-react";
import { useState } from "react";
import { VinAppBrand } from "@/components/brand/VinAppBrand";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { MobileFullscreenMenu } from "./MobileFullscreenMenu";

const links = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/organizacion", label: "Organización" },
  { to: "/obligaciones", label: "Obligaciones" },
  { to: "/documentos", label: "Documentos" },
  { to: "/alertas", label: "Alertas" },
  { to: "/revision", label: "Revisión jurídica" },
  { to: "/auditoria", label: "Auditoría" },
] as const;

export function InstitutionalTopbar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-4 px-4 sm:px-6 lg:px-10">
          <Link to="/dashboard" className="shrink-0">
            <VinAppBrand />
          </Link>

          <nav className="ml-8 hidden flex-1 items-center gap-1 lg:flex">
            {links.map((l) => {
              const active = pathname.startsWith(l.to);
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  className={cn(
                    "relative rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {l.label}
                  {active && (
                    <span className="absolute inset-x-3 -bottom-[17px] h-[2px] rounded-full bg-primary" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <div className="hidden items-center gap-2 rounded-full border border-border-strong/60 px-3 py-1.5 text-xs text-muted-foreground md:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Logística Andina S.A.
            </div>

            <button className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-surface-elevated hover:text-foreground">
              <Search className="h-4 w-4" />
              <span className="sr-only">Buscar</span>
            </button>
            <button className="relative grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-surface-elevated hover:text-foreground">
              <Bell className="h-4 w-4" />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary" />
              <span className="sr-only">Notificaciones</span>
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger className="ml-1 flex items-center gap-2 rounded-full border border-border-strong/60 py-1 pl-1 pr-3 text-sm text-foreground hover:bg-surface-elevated">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">
                  MV
                </span>
                <span className="hidden sm:inline">M. Villamil</span>
                <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground sm:inline" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="text-sm">Margarita Villamil</div>
                  <div className="text-xs text-muted-foreground">Abogada laboral senior</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem><UserRound className="mr-2 h-4 w-4" />Mi perfil</DropdownMenuItem>
                <DropdownMenuItem>Preferencias</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-primary">Cerrar sesión</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <button
              onClick={() => setMobileOpen(true)}
              className="ml-1 grid h-9 w-9 place-items-center rounded-full border border-border-strong/60 text-foreground lg:hidden"
              aria-label="Abrir menú"
            >
              <Menu className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>
      <MobileFullscreenMenu open={mobileOpen} onOpenChange={setMobileOpen} links={links as any} />
    </>
  );
}
