import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertOctagon,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ClipboardCopy,
  Download,
  Gavel,
  History,
  Loader2,
  Mic2,
  RefreshCw,
  Send,
  Sparkles,
  Square,
  Volume2,
} from "lucide-react";
import { toast } from "sonner";
import { alertsSeed, auditSeed, reviewSeed, type Employee } from "@/lib/mock/data";
import { streamSpeech, type TtsHandle } from "@/lib/tts-player";
import { cn } from "@/lib/utils";

type Section = {
  key: string;
  title: string;
  icon: React.ReactNode;
  lines: string[];
};

type Summary = {
  narrative: string;
  sections: Section[];
};

function buildSummary(employees: Employee[]): Summary {
  const proximos = employees
    .filter((e) => e.tipoContrato === "Término fijo" && e.fechaTerminacion)
    .slice(0, 2);
  const criticas = alertsSeed.filter((a) => a.severidad === "alta").slice(0, 2);
  const recientes = auditSeed.slice(0, 2);
  const enCola = reviewSeed.filter((r) => r.estado === "En cola");

  const today = new Date().toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const partes: string[] = [];
  partes.push(
    `Buenos días. Hoy, ${today}, tu organización mantiene ${employees.length} colaboradores activos en nómina.`,
  );
  if (criticas.length) {
    const nombres = criticas.map((a) => a.empleado).join(" y ");
    partes.push(
      `Hay ${alertsSeed.length} alertas abiertas, de las cuales ${criticas.length} son de severidad alta y requieren atención prioritaria: principalmente las de ${nombres}.`,
    );
  } else {
    partes.push(
      `No hay alertas críticas abiertas: el panorama de cumplimiento luce tranquilo.`,
    );
  }
  if (proximos.length) {
    partes.push(
      `En las próximas semanas vencen ${proximos.length} contratos a término fijo —entre ellos el de ${proximos[0].nombre} (${proximos[0].cargo})— por lo que conviene decidir renovación o liquidación con tiempo.`,
    );
  } else {
    partes.push(
      `Ningún contrato a término fijo vence en los próximos treinta días, así que la planeación de renovaciones puede esperar.`,
    );
  }
  if (enCola.length) {
    partes.push(
      `En la bandeja jurídica hay ${enCola.length} documentos esperando tu visto bueno; la IA ya hizo el borrador y la confianza promedio es alta.`,
    );
  } else {
    partes.push(`La cola de revisión jurídica está al día, sin pendientes.`);
  }
  partes.push(
    `Como referencia rápida, lo último que se movió fue: ${recientes
      .map((a) => `${a.usuario} ${a.accion.toLowerCase()}`)
      .join(", y ")}.`,
  );

  const sections: Section[] = [
    {
      key: "alertas",
      title: "Alertas críticas",
      icon: <AlertOctagon className="h-4 w-4" />,
      lines: criticas.length
        ? criticas.map((a) => `${a.empleado}: ${a.motivo} (límite ${a.fechaLimite}).`)
        : ["Ninguna alerta crítica abierta hoy."],
    },
    {
      key: "vencimientos",
      title: "Próximos vencimientos",
      icon: <CalendarClock className="h-4 w-4" />,
      lines: proximos.length
        ? proximos.map((e) => `${e.nombre} (${e.cargo}) vence el ${e.fechaTerminacion}.`)
        : ["Sin contratos por vencer en los próximos 30 días."],
    },
    {
      key: "aprobaciones",
      title: "Aprobaciones pendientes",
      icon: <Gavel className="h-4 w-4" />,
      lines: enCola.length
        ? enCola
            .slice(0, 3)
            .map((r) => `${r.tipo} de ${r.empleado} (confianza ${r.confianza}%).`)
        : ["Cola de revisión jurídica al día."],
    },
    {
      key: "recientes",
      title: "Hecho recientemente",
      icon: <History className="h-4 w-4" />,
      lines: recientes.map((a) => `${a.usuario} ${a.accion.toLowerCase()} · ${a.fecha}.`),
    },
  ];

  return { narrative: partes.join(" "), sections };
}

function summaryToText({ narrative, sections }: Summary) {
  const today = new Date().toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const head = `Vinculapp — Resumen ejecutivo\n${today}\n\n`;
  const body = `${narrative}\n\n— Detalle —\n\n`;
  const detail = sections
    .map((s) => `${s.title}\n${s.lines.map((l) => `  • ${l}`).join("\n")}`)
    .join("\n\n");
  const foot = `\n\nGenerado por Vinculapp · Borrador IA, revisar antes de compartir.`;
  return head + body + detail + foot;
}

export function AISummaryCard({ employees }: { employees: Employee[] }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [speaking, setSpeaking] = useState<"idle" | "loading" | "playing">("idle");
  const [voice, setVoice] = useState("alloy");
  const ttsRef = useRef<TtsHandle | null>(null);

  const summary = useMemo(() => buildSummary(employees), [employees, refreshKey]);
  const plainText = useMemo(() => summaryToText(summary), [summary]);

  useEffect(() => {
    return () => {
      ttsRef.current?.stop();
    };
  }, []);

  const stopSpeech = () => {
    ttsRef.current?.stop();
    ttsRef.current = null;
    setSpeaking("idle");
  };

  const speak = async () => {
    if (speaking !== "idle") {
      stopSpeech();
      return;
    }
    setSpeaking("loading");
    try {
      const handle = streamSpeech(summary.narrative, voice);
      ttsRef.current = handle;
      setSpeaking("playing");
      await handle.done;
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo reproducir el audio";
      if (!message.includes("aborted")) toast.error(message);
    } finally {
      ttsRef.current = null;
      setSpeaking("idle");
    }
  };

  const regenerate = () => {
    setLoading(true);
    setTimeout(() => {
      setRefreshKey((k) => k + 1);
      setLoading(false);
      toast.success("Resumen actualizado");
    }, 600);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(plainText);
      toast.success("Resumen copiado al portapapeles");
    } catch {
      toast.error("No se pudo copiar el resumen");
    }
  };

  const download = () => {
    const blob = new Blob([plainText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `vinculapp-resumen-${stamp}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success("Resumen descargado");
  };

  const sendToTeams = () => {
    toast.success("Enviado al canal #laboral de Teams", {
      description: "Demo · la integración con Microsoft Teams se conectará próximamente.",
    });
  };

  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card via-card to-surface-elevated/40">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 px-6 py-5">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-display text-2xl text-foreground">Resumen de hoy</h2>
            <p className="font-ui text-xs text-muted-foreground">
              Generado por Vinculapp · revisado por ti
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <select
              value={voice}
              onChange={(e) => setVoice(e.target.value)}
              disabled={speaking !== "idle"}
              className="appearance-none rounded-full border border-border-strong/60 bg-background py-1.5 pl-8 pr-6 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-foreground focus:border-primary focus:outline-none disabled:opacity-60"
              aria-label="Voz del lector"
            >
              {[
                "alloy",
                "ash",
                "ballad",
                "coral",
                "echo",
                "sage",
                "shimmer",
                "verse",
                "marin",
                "cedar",
              ].map((v) => (
                <option key={v} value={v}>
                  {v[0].toUpperCase() + v.slice(1)}
                </option>
              ))}
            </select>
            <Mic2 className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
          </div>
          <button
            onClick={speak}
            disabled={loading}
            aria-pressed={speaking !== "idle"}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition disabled:opacity-60",
              speaking !== "idle"
                ? "border-primary/50 bg-primary/10 text-primary"
                : "border-border-strong/60 text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
          >
            {speaking === "loading" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : speaking === "playing" ? (
              <Square className="h-3.5 w-3.5" />
            ) : (
              <Volume2 className="h-3.5 w-3.5" />
            )}
            {speaking === "idle"
              ? "Escuchar"
              : speaking === "loading"
                ? "Preparando…"
                : "Detener"}
          </button>
          <button
            onClick={regenerate}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-full border border-border-strong/60 px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-foreground disabled:opacity-60"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            Regenerar
          </button>
        </div>
      </header>

      <div className={cn("px-6 py-6", loading && "animate-pulse")}>
        <p className="max-w-3xl text-[15px] leading-relaxed text-foreground/90">
          {summary.narrative}
        </p>

        <button
          onClick={() => setOpen((v) => !v)}
          className="mt-5 inline-flex items-center gap-1.5 font-ui text-xs text-muted-foreground transition hover:text-foreground"
          aria-expanded={open}
        >
          <ChevronDown
            className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
          />
          {open ? "Ocultar detalle" : "Ver detalle por categoría"}
        </button>

        {open && (
          <div className="mt-5 grid gap-x-8 gap-y-5 border-t border-border/60 pt-5 md:grid-cols-2">
            {summary.sections.map((s) => (
              <div key={s.key} className="space-y-2">
                <div className="flex items-center gap-2 text-foreground">
                  <span className="text-primary">{s.icon}</span>
                  <h3 className="font-ui text-sm font-semibold text-foreground">
                    {s.title}
                  </h3>
                </div>
                <ul className="space-y-1.5">
                  {s.lines.map((l, i) => (
                    <li key={i} className="text-sm leading-relaxed text-foreground/85">
                      {l}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 bg-background/40 px-6 py-4">
        <p className="flex items-center gap-1.5 font-ui text-[11px] text-muted-foreground">
          <CheckCircle2 className="h-3.5 w-3.5 text-primary/80" />
          Borrador IA · revisar antes de compartir.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={copy}
            className="inline-flex items-center gap-2 rounded-full border border-border-strong/60 px-3 py-1.5 text-xs text-foreground transition hover:border-primary/40 hover:bg-surface-elevated"
          >
            <ClipboardCopy className="h-3.5 w-3.5" /> Copiar
          </button>
          <button
            onClick={download}
            className="inline-flex items-center gap-2 rounded-full border border-border-strong/60 px-3 py-1.5 text-xs text-foreground transition hover:border-primary/40 hover:bg-surface-elevated"
          >
            <Download className="h-3.5 w-3.5" /> Descargar
          </button>
          <button
            onClick={sendToTeams}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            <Send className="h-3.5 w-3.5" /> Enviar por Teams
          </button>
        </div>
      </footer>
    </section>
  );
}
