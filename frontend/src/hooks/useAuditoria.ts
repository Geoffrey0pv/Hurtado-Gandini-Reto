import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import type { BackendAuditLog } from "@/lib/types";

export function useAuditoria(filters?: { desde?: string; hasta?: string; action?: string }) {
  const params = new URLSearchParams();
  if (filters?.desde) params.set("desde", filters.desde);
  if (filters?.hasta) params.set("hasta", filters.hasta);
  if (filters?.action) params.set("action", filters.action);
  const qs = params.toString();

  return useQuery({
    queryKey: ["audit-logs", filters],
    queryFn: () => apiGet<BackendAuditLog[]>(`/audit-logs${qs ? `?${qs}` : ""}`),
    staleTime: 30 * 1000,
  });
}
