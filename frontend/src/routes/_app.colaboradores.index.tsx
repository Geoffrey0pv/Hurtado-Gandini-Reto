import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/colaboradores/")({
  beforeLoad: () => {
    throw redirect({ to: "/organizacion" });
  },
});
