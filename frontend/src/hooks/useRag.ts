import { useMutation, useQuery } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api";

export interface RagRiesgo {
  descripcion: string;
  severidad: "alta" | "media" | "baja";
  fuentesCitadas: string[];
  recomendacion: string;
}

export interface RagResult {
  contratoId: string;
  query: string;
  model: string;
  chunksUsed: number;
  abstained: boolean;
  riesgos: RagRiesgo[];
  resumen: string;
  abstenciones: string[];
  confianza: number;
}

// Revisión jurídica RAG: POST /rag/analyze (retrieve + reason con cita o abstención).
export function useRagAnalyze() {
  return useMutation({
    mutationFn: ({ contratoId, query }: { contratoId: string; query: string }) =>
      apiPost<RagResult>("/rag/analyze", { contratoId, query }),
  });
}

export interface RagSimilarChunk {
  rank: number;
  similarity: number;
  source: string;
  contratoId: string | null;
  content: string;
}

export interface RagSimilarResult {
  query: string;
  count: number;
  chunks: RagSimilarChunk[];
}

// Búsqueda semántica de cláusulas/fragmentos por similitud: GET /rag/similar?q&k.
export function useRagSimilar(query: string, k = 5, enabled = true) {
  return useQuery({
    queryKey: ["rag", "similar", query, k],
    queryFn: () => apiGet<RagSimilarResult>(`/rag/similar?q=${encodeURIComponent(query)}&k=${k}`),
    enabled: enabled && query.trim().length > 0,
    staleTime: 60 * 1000,
  });
}
