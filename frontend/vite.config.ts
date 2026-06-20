// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  // Forzar nitro con preset Vercel para que el build genere la funcion SSR en
  // `.vercel/output` (Build Output API). Necesario para desplegar a Vercel por
  // CLI/remoto; sin esto el plugin omite nitro y las rutas dan 404.
  // En el sandbox de Lovable este preset se sobreescribe a cloudflare-module.
  nitro: { preset: "vercel" },
});
