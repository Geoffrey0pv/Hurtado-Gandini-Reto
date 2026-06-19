import { Link } from "@tanstack/react-router";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { VinculappBrand } from "@/components/brand/VinculappBrand";

type Link = { to: string; label: string };

export function MobileFullscreenMenu({
  open,
  onOpenChange,
  links,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  links: readonly Link[];
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="top"
        className="h-screen border-0 bg-background p-0"
      >
        <SheetTitle className="sr-only">Menú principal</SheetTitle>
        <div className="flex h-16 items-center justify-between border-b border-border px-6">
          <VinculappBrand />
        </div>
        <nav className="flex flex-col gap-1 px-6 pt-10">
          {links.map((l, i) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => onOpenChange(false)}
              className="group flex items-baseline justify-between border-b border-border/60 py-5 font-display text-3xl tracking-tight text-foreground transition hover:text-primary"
            >
              <span>{l.label}</span>
              <span className="text-xs font-sans tracking-[0.2em] text-muted-foreground">
                {String(i + 1).padStart(2, "0")}
              </span>
            </Link>
          ))}
        </nav>
        <p className="absolute bottom-8 left-6 right-6 text-xs text-muted-foreground">
          Revisión jurídica obligatoria antes de cualquier emisión legal.
        </p>
      </SheetContent>
    </Sheet>
  );
}
