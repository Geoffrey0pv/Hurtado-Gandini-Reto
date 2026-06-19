import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import type { BackendAlerta } from "@/lib/types";

export function useAlertas() {
  return useQuery({
    queryKey: ["alertas"],
    queryFn: () => apiGet<BackendAlerta[]>("/alertas"),
    staleTime: 5 * 60 * 1000, // 5 min
  });
}
