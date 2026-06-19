// RagChat — Revisión jurídica conversacional sobre un contrato (RAG).
// Ejecuta POST /rag/analyze: recupera cláusulas del contrato y razona los
// riesgos citando fuentes [FUENTE N] o absteniéndose si no hay evidencia.
import { useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Scale, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ApiError } from "@/lib/api";
import { useRagAnalyze, type RagResult } from "@/hooks/useRag";
import { cn } from "@/lib/utils";

type ChatMsg =
  | { role: "user"; text: string }
  | { role: "assistant"; result: RagResult }
  | { role: "error"; text: string };

const DEFAULT_QUERY =
  "Analiza los riesgos legales y de cumplimiento de este contrato: tipo de vínculo, jornada legal, periodo de prueba, salario, prestaciones y terminación.";

const SUGERENCIAS = [
  "¿La jornada laboral cumple la Ley 2101 de 2021?",
  "¿El periodo de prueba y la duración son válidos?",
  "¿Hay indicios de reclasificación a contrato laboral?",
  "¿El salario y las prestaciones están bien pactados?",
];

function sevTone(sev: "alta" | "media" | "baja"): "warning" | "primary" | "muted" {
  if (sev === "alta") return "warning";
  if (sev === "media") return "primary";
  return "muted";
}

export function RagChat({ contratoId }: { contratoId: string }) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const rag = useRagAnalyze();
  const scrollRef = useRef<HTMLDivElement>(null);

  async function run(query: string) {
    const q = query.trim();
    if (q.length < 10) return; // el backend exige >= 10 caracteres
    setInput("");
    setMessages((m) => [...m, { role: "user", text: q }]);
    try {
      const result = await rag.mutateAsync({ contratoId, query: q });
      setMessages((m) => [...m, { role: "assistant", result }]);
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? ((e.body as { error?: string })?.error ?? `Error ${e.status}`)
          : "No se pudo completar la revisión.";
      setMessages((m) => [...m, { role: "error", text: msg }]);
    } finally {
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 1e9, behavior: "smooth" }));
    }
  }

  const empty = messages.length === 0;

  return (
    <div className="flex h-full min-h-[420px] flex-col rounded-2xl border border-border bg-background/40">
      {/* Mensajes */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
        {empty && !rag.isPending && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/15 text-primary">
              <Scale className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Revisión jurídica del contrato</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Detecta riesgos citando las cláusulas del documento. Si no hay evidencia, se abstiene.
              </p>
            </div>
            <Button
              onClick={() => run(DEFAULT_QUERY)}
              className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Sparkles className="mr-2 h-4 w-4" />Ejecutar revisión jurídica
            </Button>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGERENCIAS.map((s) => (
                <button
                  key={s}
                  onClick={() => run(s)}
                  className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => {
          if (m.role === "user") {
            return (
              <div key={i} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary/15 px-4 py-2 text-sm text-foreground">
                  {m.text}
                </div>
              </div>
            );
          }
          if (m.role === "error") {
            return (
              <div key={i} className="rounded-xl border border-risk-high/40 bg-risk-high/5 px-4 py-3 text-sm text-foreground">
                {m.text}
              </div>
            );
          }
          return <AssistantMessage key={i} result={m.result} />;
        })}

        {rag.isPending && (
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Analizando el contrato… el razonamiento jurídico puede tardar un momento.
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(input);
        }}
        className="flex items-center gap-2 border-t border-border p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={rag.isPending}
          placeholder="Pregunta sobre riesgos, jornada, terminación…"
          className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/60"
        />
        <Button
          type="submit"
          disabled={rag.isPending || input.trim().length < 10}
          className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}

function AssistantMessage({ result }: { result: RagResult }) {
  const confianza = Math.round(result.confianza * 100);
  return (
    <div className="space-y-3 rounded-2xl rounded-bl-sm border border-border bg-card px-4 py-3">
      {/* Resumen */}
      <div className="flex items-start gap-2">
        <Scale className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p className="text-sm text-foreground">{result.resumen}</p>
      </div>

      {/* Riesgos */}
      {result.riesgos.length > 0 && (
        <div className="space-y-2">
          {result.riesgos.map((r, i) => (
            <div key={i} className="rounded-xl border border-border bg-background/40 p-3">
              <div className="mb-1 flex items-center gap-2">
                <StatusBadge tone={sevTone(r.severidad)}>
                  <AlertTriangle className="mr-1 h-3 w-3" />
                  {r.severidad}
                </StatusBadge>
                {r.fuentesCitadas.length > 0 && (
                  <span className="text-[11px] text-muted-foreground">{r.fuentesCitadas.join(" · ")}</span>
                )}
              </div>
              <p className="text-sm text-foreground">{r.descripcion}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Recomendación: </span>
                {r.recomendacion}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Abstenciones */}
      {result.abstenciones.length > 0 && (
        <div className="rounded-xl border border-dashed border-border-strong/60 bg-background/40 p-3">
          <p className="mb-1 text-[11px] uppercase tracking-wider text-muted-foreground">Sin evidencia suficiente</p>
          <ul className="space-y-1">
            {result.abstenciones.map((a, i) => (
              <li key={i} className="text-xs text-muted-foreground">· {a}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Metadatos / trazabilidad */}
      <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
        <span
          className={cn(
            "inline-flex items-center gap-1",
            confianza >= 70 ? "text-risk-low" : "text-risk-medium",
          )}
        >
          <CheckCircle2 className="h-3 w-3" />Confianza {confianza}%
        </span>
        <span>·</span>
        <span>{result.chunksUsed} fuentes</span>
        <span>·</span>
        <span>{result.model}</span>
      </div>
    </div>
  );
}
