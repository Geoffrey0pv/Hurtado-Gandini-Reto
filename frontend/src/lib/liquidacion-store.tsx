// liquidacion-store — Estado de liquidaciones generadas, pago y mora (art. 65 CST).
//
// DECISIÓN DE ARQUITECTURA: este estado es intencionalmente client-side
// (localStorage), porque el backend NO expone hoy un módulo de liquidaciones/pagos
// (la API solo calcula la estimación determinista en GET /contratos/:id/analisis).
// El cálculo autoritativo de los conceptos viene del backend; aquí solo se guarda
// la decisión operativa de "liquidación generada" y el seguimiento de mora para el
// usuario. Si en el futuro se agrega un módulo /liquidaciones al backend, este
// store debe reemplazarse por un hook de TanStack Query equivalente.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type LiquidacionGenerada = {
  empleadoId: string;
  fechaGeneracion: string; // ISO datetime
  fechaTerminacion: string; // YYYY-MM-DD (asumido = día de generación)
  salario: number;
  totalEstimado: number;
  escenario: "sin" | "con";
  pagada?: { fecha: string; monto: number };
  avisos: { fecha: string; mensaje: string; diasMora: number; costoAcumulado: number }[];
};

const STORAGE_KEY = "laborapp.liquidaciones.v1";

type Ctx = {
  registros: Record<string, LiquidacionGenerada>;
  generar: (r: Omit<LiquidacionGenerada, "avisos" | "fechaGeneracion" | "fechaTerminacion"> & { fechaTerminacion?: string }) => LiquidacionGenerada;
  marcarPagada: (empleadoId: string, monto: number) => void;
  registrarAviso: (empleadoId: string, aviso: LiquidacionGenerada["avisos"][number]) => void;
  reset: (empleadoId: string) => void;
  get: (empleadoId: string) => LiquidacionGenerada | undefined;
};

const LiqCtx = createContext<Ctx | null>(null);

export function LiquidacionProvider({ children }: { children: ReactNode }) {
  const [registros, setRegistros] = useState<Record<string, LiquidacionGenerada>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(registros)); } catch { /* ignore */ }
  }, [registros]);

  const generar = useCallback<Ctx["generar"]>((r) => {
    const now = new Date();
    const fechaTerm = r.fechaTerminacion ?? now.toISOString().slice(0, 10);
    const nuevo: LiquidacionGenerada = {
      empleadoId: r.empleadoId,
      fechaGeneracion: now.toISOString(),
      fechaTerminacion: fechaTerm,
      salario: r.salario,
      totalEstimado: r.totalEstimado,
      escenario: r.escenario,
      avisos: [{
        fecha: now.toISOString(),
        diasMora: 0,
        costoAcumulado: 0,
        mensaje: "Liquidación generada. Plazo legal: pago inmediato a la terminación (art. 65 CST).",
      }],
    };
    setRegistros((p) => ({ ...p, [r.empleadoId]: nuevo }));
    return nuevo;
  }, []);

  const marcarPagada: Ctx["marcarPagada"] = (empleadoId, monto) => {
    setRegistros((p) => {
      const r = p[empleadoId];
      if (!r) return p;
      return { ...p, [empleadoId]: { ...r, pagada: { fecha: new Date().toISOString(), monto } } };
    });
  };

  const registrarAviso: Ctx["registrarAviso"] = (empleadoId, aviso) => {
    setRegistros((p) => {
      const r = p[empleadoId];
      if (!r) return p;
      if (r.avisos.some((a) => a.fecha.slice(0, 10) === aviso.fecha.slice(0, 10) && a.diasMora === aviso.diasMora)) return p;
      return { ...p, [empleadoId]: { ...r, avisos: [aviso, ...r.avisos] } };
    });
  };

  const reset: Ctx["reset"] = (empleadoId) => {
    setRegistros((p) => {
      const { [empleadoId]: _, ...rest } = p;
      return rest;
    });
  };

  const value = useMemo<Ctx>(() => ({
    registros,
    generar,
    marcarPagada,
    registrarAviso,
    reset,
    get: (id) => registros[id],
  }), [registros, generar]);

  return <LiqCtx.Provider value={value}>{children}</LiqCtx.Provider>;
}

export function useLiquidaciones() {
  const ctx = useContext(LiqCtx);
  if (!ctx) throw new Error("useLiquidaciones must be used inside LiquidacionProvider");
  return ctx;
}

// Helpers de cálculo de mora (Art. 65 CST)
export function calcularMora(salario: number, fechaTerminacion: string, ref: Date = new Date()) {
  const ini = new Date(fechaTerminacion + "T00:00:00");
  const dias = Math.max(0, Math.floor((ref.getTime() - ini.getTime()) / (1000 * 60 * 60 * 24)));
  const diaSalario = salario / 30;
  // primeros 24 meses (720 días): 1 día de salario por cada día de mora
  const diasFase1 = Math.min(dias, 720);
  const fase1 = Math.round(diaSalario * diasFase1);
  // a partir del mes 25: intereses moratorios a tasa máxima legal (aprox. 25% EA → ~0.0625% diario sobre saldo)
  const diasFase2 = Math.max(0, dias - 720);
  const tasaDiaria = 0.25 / 360;
  const fase2 = Math.round(salario * tasaDiaria * diasFase2);
  return { dias, diaSalario: Math.round(diaSalario), fase1, fase2, total: fase1 + fase2, diasFase1, diasFase2 };
}
