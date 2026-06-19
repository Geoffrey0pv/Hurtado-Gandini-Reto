import { useMutation } from "@tanstack/react-query";
import { apiPost } from "@/lib/api";

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
