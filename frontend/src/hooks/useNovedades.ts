import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiGet, apiPost } from "@/lib/api";
import type { BackendNovedad } from "@/lib/types";

const key = (colaboradorId?: string) =>
  colaboradorId ? ["novedades", colaboradorId] : ["novedades"];

export function useNovedades(colaboradorId?: string) {
  return useQuery({
    queryKey: key(colaboradorId),
    queryFn: () =>
      apiGet<BackendNovedad[]>(
        `/novedades${colaboradorId ? `?colaboradorId=${colaboradorId}` : ""}`,
      ),
  });
}

export function useCreateNovedad(colaboradorId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiPost<BackendNovedad>("/novedades", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key(colaboradorId) });
      qc.invalidateQueries({ queryKey: ["novedades"] });
    },
  });
}

export function useDeleteNovedad(colaboradorId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/novedades/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key(colaboradorId) });
      qc.invalidateQueries({ queryKey: ["novedades"] });
    },
  });
}
