import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import type { BackendColaborador } from "@/lib/types";

const KEY = ["colaboradores"] as const;

export function useColaboradores() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => apiGet<BackendColaborador[]>("/colaboradores"),
  });
}

export function useColaborador(id: string) {
  return useQuery({
    queryKey: [...KEY, id],
    queryFn: () => apiGet<BackendColaborador>(`/colaboradores/${id}`),
    enabled: !!id,
  });
}

export function useCreateColaborador() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiPost<BackendColaborador>("/colaboradores", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateColaborador() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      apiPatch<BackendColaborador>(`/colaboradores/${id}`, data),
    onSuccess: (_r, { id }) => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: [...KEY, id] });
    },
  });
}

export function useDeleteColaborador() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/colaboradores/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
