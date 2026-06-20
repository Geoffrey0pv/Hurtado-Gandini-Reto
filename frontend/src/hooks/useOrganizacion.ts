import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPatch } from "@/lib/api";

export interface BackendOrganizacion {
  id: string;
  name: string;
  nit: string;
  createdAt: string;
}

const KEY = ["organizacion"] as const;

// GET /organizations/me — datos de la organización (tenant) del usuario actual.
export function useOrganizacion() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => apiGet<BackendOrganizacion>("/organizations/me"),
    staleTime: 5 * 60 * 1000,
  });
}

// PATCH /organizations/me — actualizar el nombre de la organización (solo admin).
export function useUpdateOrganizacion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string }) =>
      apiPatch<BackendOrganizacion>("/organizations/me", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
