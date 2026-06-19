import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiGet, apiPost } from "@/lib/api";
import type { BackendTimesheetEntry } from "@/lib/types";
import type { TipoHora } from "@/lib/mock/data";

const key = (colaboradorId: string) => ["timesheet", colaboradorId] as const;

export function useTimesheetEntries(colaboradorId: string) {
  return useQuery({
    queryKey: key(colaboradorId),
    queryFn: () =>
      apiGet<BackendTimesheetEntry[]>(`/timesheet?colaboradorId=${colaboradorId}`),
    enabled: !!colaboradorId,
  });
}

export function useAddTimesheetEntry(colaboradorId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { fecha: string; horas: number; tipo: TipoHora; notas?: string }) =>
      apiPost<BackendTimesheetEntry>("/timesheet", { colaboradorId, ...data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(colaboradorId) }),
  });
}

export function useDeleteTimesheetEntry(colaboradorId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/timesheet/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(colaboradorId) }),
  });
}
