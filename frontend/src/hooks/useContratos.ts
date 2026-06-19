import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiUpload } from "@/lib/api";
import type { BackendContrato } from "@/lib/types";

const KEY = ["contratos"] as const;

export interface IngestionJob {
  id: string;
  status: "PENDING" | "PROCESSING" | "DONE" | "FAILED";
  error: string | null;
}

export interface UploadContratoResult {
  jobId: string;
  contratoId: string;
  status: string;
}

export function useContratos() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => apiGet<BackendContrato[]>("/contratos"),
  });
}

export function useContrato(id: string) {
  return useQuery({
    queryKey: [...KEY, id],
    queryFn: () => apiGet<BackendContrato>(`/contratos/${id}`),
    enabled: !!id,
  });
}

export function useContratoAnalisis(id: string, enabled = false) {
  return useQuery({
    queryKey: [...KEY, id, "analisis"],
    queryFn: () => apiGet<unknown>(`/contratos/${id}/analisis`),
    enabled: enabled && !!id,
  });
}

export function useUploadContrato() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ colaboradorId, file }: { colaboradorId: string; file: File }) => {
      const form = new FormData();
      form.append("colaboradorId", colaboradorId);
      form.append("file", file);
      return apiUpload<UploadContratoResult>("/contratos/upload", form);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useIngestionJob(jobId: string | null) {
  return useQuery({
    queryKey: ["ingestion-job", jobId],
    queryFn: () => apiGet<IngestionJob>(`/contratos/job/${jobId}`),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "DONE" || status === "FAILED") return false;
      return 2000;
    },
  });
}
