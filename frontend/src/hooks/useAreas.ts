import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import type { BackendArea } from "@/lib/types";

const KEY = ["areas"] as const;

export function useAreas() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => apiGet<BackendArea[]>("/areas"),
  });
}

export function useCreateArea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { nombre: string; orden?: number }) =>
      apiPost<BackendArea>("/areas", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateArea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { nombre?: string; orden?: number } }) =>
      apiPatch<BackendArea>(`/areas/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteArea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/areas/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
