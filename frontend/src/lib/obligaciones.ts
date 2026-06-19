import { aplicaDotacion, aportesMensuales, type Employee } from "./mock/data";

export type Frecuencia = "mensual" | "anual";
export type ObligacionTone = "primary" | "warning" | "muted" | "success";

export type ObligacionEvento = {
  id: string; // `${empleadoId}:${tipo}:${YYYY-MM-DD}`
  empleadoId: string;
  tipo: string; // estable: 'pila', 'nomina', 'prima_jun', 'prima_dic', 'int_cesantias', 'cons_cesantias', 'dotacion_abr', etc.
  fecha: string; // YYYY-MM-DD
  label: string;
  detalle?: string;
  monto?: number;
  frecuencia: Frecuencia;
  tone: ObligacionTone;
};

function pad(n: number) { return n.toString().padStart(2, "0"); }
function iso(y: number, m: number, d: number) { return `${y}-${pad(m + 1)}-${pad(d)}`; }

// Último día hábil del mes (lun-vie)
function ultimoDiaHabil(y: number, m: number): Date {
  const d = new Date(y, m + 1, 0);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1);
  return d;
}

// Días hábiles (lun-vie) entre hoy y target. Negativo = vencido.
export function diasHabilesHasta(target: Date, ref: Date = new Date()): number {
  const a = new Date(ref); a.setHours(0, 0, 0, 0);
  const b = new Date(target); b.setHours(0, 0, 0, 0);
  if (a.getTime() === b.getTime()) return 0;
  const dir = b > a ? 1 : -1;
  let count = 0;
  const cur = new Date(a);
  while (cur.getTime() !== b.getTime()) {
    cur.setDate(cur.getDate() + dir);
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) count += dir;
  }
  return count;
}

export const AVISOS_MENSUAL = [5, 3, 1] as const;
export const AVISOS_ANUAL = [30, 15, 7] as const;

export type NivelAviso = "ok" | "info" | "advertencia" | "urgente" | "vencido";

export function nivelAviso(diasHabiles: number, frecuencia: Frecuencia): NivelAviso {
  if (diasHabiles < 0) return "vencido";
  const avisos = frecuencia === "mensual" ? AVISOS_MENSUAL : AVISOS_ANUAL;
  if (diasHabiles <= avisos[2]) return "urgente";
  if (diasHabiles <= avisos[1]) return "advertencia";
  if (diasHabiles <= avisos[0]) return "info";
  return "ok";
}

export function avisosFrecuencia(f: Frecuencia): readonly number[] {
  return f === "mensual" ? AVISOS_MENSUAL : AVISOS_ANUAL;
}

export function obligacionesEnRango(e: Employee, ini: Date, fin: Date): ObligacionEvento[] {
  const out: ObligacionEvento[] = [];
  const aportes = aportesMensuales(e.salario);
  const totalAportes = aportes.salud + aportes.pension + aportes.arl + aportes.caja;
  const yStart = ini.getFullYear();
  const yEnd = fin.getFullYear();

  for (let y = yStart; y <= yEnd; y++) {
    for (let m = 0; m < 12; m++) {
      // PILA — día 10 (aportes a seguridad social)
      const pila = new Date(y, m, 10);
      if (pila >= ini && pila <= fin) {
        out.push({
          id: `${e.id}:pila:${iso(y, m, 10)}`,
          empleadoId: e.id,
          tipo: "pila",
          fecha: iso(y, m, 10),
          label: "Aportes seguridad social (PILA)",
          detalle: "Salud + pensión + ARL + caja · Ley 100/93",
          monto: totalAportes,
          frecuencia: "mensual",
          tone: "primary",
        });
      }
      // Pago de nómina — último día hábil del mes
      const nomina = ultimoDiaHabil(y, m);
      if (nomina >= ini && nomina <= fin) {
        out.push({
          id: `${e.id}:nomina:${iso(nomina.getFullYear(), nomina.getMonth(), nomina.getDate())}`,
          empleadoId: e.id,
          tipo: "nomina",
          fecha: iso(nomina.getFullYear(), nomina.getMonth(), nomina.getDate()),
          label: "Pago de nómina",
          detalle: "Neto a transferir al colaborador",
          monto: aportes.neto,
          frecuencia: "mensual",
          tone: "warning",
        });
      }
    }

    // Anuales
    const anuales: Array<[string, number, number, string, string, ObligacionTone]> = [
      ["int_cesantias", 0, 31, "Intereses sobre cesantías", "12% anual · Ley 50/90", "warning"],
      ["cons_cesantias", 1, 14, "Consignación de cesantías", "Fondo de cesantías", "warning"],
      ["prima_jun", 5, 30, "Prima 1.ª cuota", "Prestación · art. 306 CST", "warning"],
      ["prima_dic", 11, 20, "Prima 2.ª cuota", "Prestación · art. 306 CST", "success"],
    ];
    for (const [tipo, mes, dia, label, detalle, tone] of anuales) {
      const d = new Date(y, mes, dia);
      if (d >= ini && d <= fin) {
        out.push({
          id: `${e.id}:${tipo}:${iso(y, mes, dia)}`,
          empleadoId: e.id, tipo, fecha: iso(y, mes, dia), label, detalle, frecuencia: "anual", tone,
        });
      }
    }

    // Dotación (3 entregas anuales si aplica)
    if (aplicaDotacion(e)) {
      const dot: Array<[string, number, number]> = [
        ["dotacion_abr", 3, 30], ["dotacion_ago", 7, 31], ["dotacion_dic", 11, 20],
      ];
      for (const [tipo, mes, dia] of dot) {
        const d = new Date(y, mes, dia);
        if (d >= ini && d <= fin) {
          out.push({
            id: `${e.id}:${tipo}:${iso(y, mes, dia)}`,
            empleadoId: e.id, tipo, fecha: iso(y, mes, dia),
            label: "Entrega de dotación", detalle: "Calzado + vestimenta de labor",
            frecuencia: "anual", tone: "muted",
          });
        }
      }
    }
  }
  return out.sort((a, b) => a.fecha.localeCompare(b.fecha));
}

// Próximas N ocurrencias desde una fecha de referencia.
export function proximasObligaciones(e: Employee, n = 12, ref: Date = new Date()): ObligacionEvento[] {
  const fin = new Date(ref.getFullYear(), ref.getMonth() + 6, 0);
  const todas = obligacionesEnRango(e, ref, fin);
  return todas.slice(0, n);
}
