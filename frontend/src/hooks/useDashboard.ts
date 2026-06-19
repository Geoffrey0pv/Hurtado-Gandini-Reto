import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import type { DashboardSummary } from "@/lib/types";

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => apiGet<DashboardSummary>("/dashboard/summary"),
    staleTime: 60 * 1000, // 1 min
  });
}
