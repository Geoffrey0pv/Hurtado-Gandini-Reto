import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiGet, apiUpload } from "@/lib/api";
import type { BackendDocumentoSlot } from "@/lib/types";

const key = (colaboradorId: string) => ["documentos", colaboradorId] as const;

export function useDocumentos(colaboradorId: string) {
  return useQuery({
    queryKey: key(colaboradorId),
    queryFn: () =>
      apiGet<BackendDocumentoSlot[]>(`/documentos?colaboradorId=${colaboradorId}`),
    enabled: !!colaboradorId,
  });
}

export function useUploadDocumento(colaboradorId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ slotKey, file }: { slotKey: string; file: File }) => {
      const form = new FormData();
      form.append("colaboradorId", colaboradorId);
      form.append("slotKey", slotKey);
      form.append("file", file);
      return apiUpload<BackendDocumentoSlot>("/documentos/upload", form);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key(colaboradorId) }),
  });
}

export function useDeleteDocumento(colaboradorId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/documentos/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(colaboradorId) }),
  });
}
