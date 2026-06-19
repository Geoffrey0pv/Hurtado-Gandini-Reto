import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type ObligacionDone = {
  doneAt: string; // ISO timestamp
};

const STORAGE_KEY = "laborapp.obligaciones.v1";

type Ctx = {
  done: Record<string, ObligacionDone>;
  isDone: (id: string) => boolean;
  toggle: (id: string) => void;
  setDone: (id: string, done: boolean) => void;
  setManyDone: (ids: string[], done: boolean) => void;
};

const Context = createContext<Ctx | null>(null);

export function ObligacionesProvider({ children }: { children: ReactNode }) {
  const [done, setDoneMap] = useState<Record<string, ObligacionDone>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Record<string, ObligacionDone>) : {};
    } catch { return {}; }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(done)); } catch { /* ignore */ }
  }, [done]);

  const setDone = useCallback<Ctx["setDone"]>((id, value) => {
    setDoneMap((prev) => {
      const next = { ...prev };
      if (value) next[id] = { doneAt: new Date().toISOString() };
      else delete next[id];
      return next;
    });
  }, []);

  const setManyDone = useCallback<Ctx["setManyDone"]>((ids, value) => {
    setDoneMap((prev) => {
      const next = { ...prev };
      const ts = new Date().toISOString();
      for (const id of ids) {
        if (value) next[id] = { doneAt: ts };
        else delete next[id];
      }
      return next;
    });
  }, []);

  const toggle = useCallback<Ctx["toggle"]>((id) => {
    setDoneMap((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = { doneAt: new Date().toISOString() };
      return next;
    });
  }, []);

  const value = useMemo<Ctx>(() => ({
    done,
    isDone: (id) => !!done[id],
    setDone,
    setManyDone,
    toggle,
  }), [done, setDone, setManyDone, toggle]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useObligaciones() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("useObligaciones must be used inside ObligacionesProvider");
  return ctx;
}
