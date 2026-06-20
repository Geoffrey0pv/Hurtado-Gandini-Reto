import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import type { BackendExpediente } from "@/lib/types";

const KEY = ["disciplinario"] as const;
const colabKey = (id: string) => [...KEY, "colab", id] as const;

export function useExpedientes(colaboradorId?: string) {
  return useQuery({
    queryKey: colaboradorId ? colabKey(colaboradorId) : KEY,
    queryFn: () =>
      apiGet<BackendExpediente[]>(
        `/disciplinario${colaboradorId ? `?colaboradorId=${colaboradorId}` : ""}`,
      ),
  });
}

export function useDebidoProceso(id: string, enabled = true) {
  return useQuery({
    queryKey: [...KEY, id, "debido-proceso"],
    queryFn: () => apiGet<unknown>(`/disciplinario/${id}/debido-proceso`),
    enabled: enabled && !!id,
  });
}

export function useCreateExpediente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiPost<BackendExpediente>("/disciplinario", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateExpediente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      apiPatch<BackendExpediente>(`/disciplinario/${id}`, data),
    onSuccess: (_r, { id }) => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: [...KEY, id] });
      qc.invalidateQueries({ queryKey: [...KEY, id, "debido-proceso"] });
    },
  });
}
