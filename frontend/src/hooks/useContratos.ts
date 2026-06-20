import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPatch, apiPost, apiUpload } from "@/lib/api";
import type { AnalisisContrato, BackendContrato } from "@/lib/types";
import type { ObligacionEvento } from "@/lib/obligaciones";

export interface UpdateContratoInput {
  tipoContrato?: string | null;
  nombreColaborador?: string | null;
  cedula?: string | null;
  cargo?: string | null;
  fechaInicio?: string | null;
  fechaFin?: string | null;
  salario?: number | null;
  jornadaHorasSemana?: number | null;
}

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
    queryFn: () => apiGet<AnalisisContrato>(`/contratos/${id}/analisis`),
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000, // el endpoint deja audit log: evitamos refetch por montaje
  });
}

// Calendario determinista de obligaciones recurrentes (PILA, nómina, prima,
// cesantías, dotación) calculado por el backend a partir del contrato.
export function useContratoObligaciones(
  id: string | null | undefined,
  desde?: string,
  hasta?: string,
) {
  return useQuery({
    queryKey: [...KEY, id, "obligaciones", desde ?? null, hasta ?? null],
    queryFn: () => {
      const qs = new URLSearchParams();
      if (desde) qs.set("desde", desde);
      if (hasta) qs.set("hasta", hasta);
      const suffix = qs.toString() ? `?${qs.toString()}` : "";
      return apiGet<ObligacionEvento[]>(`/contratos/${id}/obligaciones${suffix}`);
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUploadContrato() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      colaboradorId,
      file,
      complex = false,
    }: {
      colaboradorId: string;
      file: File;
      complex?: boolean;
    }) => {
      const form = new FormData();
      // Los campos de texto van ANTES del archivo para que el backend los lea.
      form.append("colaboradorId", colaboradorId);
      form.append("complex", String(complex));
      form.append("file", file);
      return apiUpload<UploadContratoResult>("/contratos/upload", form);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

// Corrección manual de las variables extraídas (post-update humano).
export function useUpdateContrato() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateContratoInput }) =>
      apiPatch<BackendContrato>(`/contratos/${id}`, data),
    onSuccess: (_r, { id }) => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: [...KEY, id] });
    },
  });
}

// Revisión jurídica humana (aprobar/rechazar). Persiste la decisión en el
// contrato y deja traza en auditoría (backend: POST /contratos/:id/revision).
export function useRevisarContrato() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      decision,
      nota,
    }: {
      id: string;
      decision: "aprobado" | "rechazado";
      nota?: string;
    }) => apiPost<BackendContrato>(`/contratos/${id}/revision`, { decision, nota }),
    onSuccess: (_r, { id }) => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: [...KEY, id] });
      qc.invalidateQueries({ queryKey: ["audit-logs"] });
    },
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
