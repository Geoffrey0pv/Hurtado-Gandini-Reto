// src/rules/obligaciones.ts — Calendario DETERMINISTA de obligaciones laborales
// recurrentes (PILA, nómina, prima, cesantías, dotación). Funcion pura: a partir
// del salario, tipo de contrato y un rango de fechas, devuelve los eventos con
// su monto (cuando aplica) y base legal. Sin IA, sin DB => facil de testear y
// trazable. Refleja la logica del cliente (frontend/src/lib/obligaciones.ts).
import { SMMLV_2025 } from "./constants.js";

export type Frecuencia = "mensual" | "anual";
export type ObligacionTone = "primary" | "warning" | "muted" | "success";

export interface ObligacionEvento {
  id: string; // `${empleadoId}:${tipo}:${YYYY-MM-DD}`
  empleadoId: string;
  tipo: string;
  fecha: string; // YYYY-MM-DD
  label: string;
  detalle?: string;
  monto?: number;
  frecuencia: Frecuencia;
  tone: ObligacionTone;
}

const ARL_PCT: Record<number, number> = {
  1: 0.00522, 2: 0.01044, 3: 0.02436, 4: 0.0435, 5: 0.0696,
};

const round = (n: number) => Math.round(n);
const pad = (n: number) => n.toString().padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

// Aportes mensuales (parafiscales + seguridad social) y neto de nomina.
// Mantiene los mismos porcentajes que el cliente para consistencia de cifras.
function aportesMensuales(salario: number, arlNivel = 2) {
  const arlPct = ARL_PCT[arlNivel] ?? ARL_PCT[2];
  const salud = round(salario * 0.085);
  const pension = round(salario * 0.12);
  const arl = round(salario * arlPct);
  const caja = round(salario * 0.04);
  const deduccionEmpleado = round(salario * 0.08);
  const auxAplica = salario <= 2 * SMMLV_2025;
  const aux = auxAplica ? round(SMMLV_2025 * 0.142) : 0;
  const neto = salario + aux - deduccionEmpleado;
  return { salud, pension, arl, caja, aux, neto };
}

// Dotacion: contratos laborales con salario < 2 SMMLV (art. 230 CST).
function aplicaDotacion(tipoContrato: string | null | undefined, salario: number): boolean {
  const laboral =
    tipoContrato === "TERMINO_INDEFINIDO" ||
    tipoContrato === "TERMINO_FIJO" ||
    tipoContrato === "OBRA_LABOR";
  return laboral && salario < 2 * SMMLV_2025;
}

// Ultimo dia habil (lun-vie) del mes m (0-based) en formato ISO.
function ultimoDiaHabilISO(y: number, m: number): string {
  let day = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  let dow = new Date(Date.UTC(y, m, day)).getUTCDay();
  while (dow === 0 || dow === 6) {
    day -= 1;
    dow = new Date(Date.UTC(y, m, day)).getUTCDay();
  }
  return iso(y, m, day);
}

export interface ObligacionesParams {
  empleadoId: string;
  salario: number;
  tipoContrato?: string | null;
  desde: string; // YYYY-MM-DD
  hasta: string; // YYYY-MM-DD
  arlNivel?: number;
}

export function obligacionesEnRango(p: ObligacionesParams): ObligacionEvento[] {
  const out: ObligacionEvento[] = [];
  const salario = p.salario || 0;
  const ap = aportesMensuales(salario, p.arlNivel ?? 2);
  const totalAportes = ap.salud + ap.pension + ap.arl + ap.caja;
  // Comparacion lexicografica de fechas ISO (robusta y sin zona horaria).
  const inRange = (s: string) => s >= p.desde && s <= p.hasta;
  const yStart = Number(p.desde.slice(0, 4));
  const yEnd = Number(p.hasta.slice(0, 4));

  for (let y = yStart; y <= yEnd; y++) {
    for (let m = 0; m < 12; m++) {
      // PILA — dia 10 (aportes a seguridad social)
      const pila = iso(y, m, 10);
      if (inRange(pila)) {
        out.push({
          id: `${p.empleadoId}:pila:${pila}`,
          empleadoId: p.empleadoId,
          tipo: "pila",
          fecha: pila,
          label: "Aportes seguridad social (PILA)",
          detalle: "Salud + pensión + ARL + caja · Ley 100/93",
          monto: totalAportes,
          frecuencia: "mensual",
          tone: "primary",
        });
      }
      // Pago de nomina — ultimo dia habil del mes
      const nomina = ultimoDiaHabilISO(y, m);
      if (inRange(nomina)) {
        out.push({
          id: `${p.empleadoId}:nomina:${nomina}`,
          empleadoId: p.empleadoId,
          tipo: "nomina",
          fecha: nomina,
          label: "Pago de nómina",
          detalle: "Neto a transferir al colaborador",
          monto: ap.neto,
          frecuencia: "mensual",
          tone: "warning",
        });
      }
    }

    // Anuales (mes 0-based, dia)
    const anuales: Array<[string, number, number, string, string, ObligacionTone]> = [
      ["int_cesantias", 0, 31, "Intereses sobre cesantías", "12% anual · Ley 52/75", "warning"],
      ["cons_cesantias", 1, 14, "Consignación de cesantías", "Fondo de cesantías · Ley 50/90", "warning"],
      ["prima_jun", 5, 30, "Prima 1.ª cuota", "Prestación · art. 306 CST", "warning"],
      ["prima_dic", 11, 20, "Prima 2.ª cuota", "Prestación · art. 306 CST", "success"],
    ];
    for (const [tipo, mes, dia, label, detalle, tone] of anuales) {
      const f = iso(y, mes, dia);
      if (inRange(f)) {
        out.push({ id: `${p.empleadoId}:${tipo}:${f}`, empleadoId: p.empleadoId, tipo, fecha: f, label, detalle, frecuencia: "anual", tone });
      }
    }

    // Dotacion (3 entregas anuales si aplica · art. 230 CST)
    if (aplicaDotacion(p.tipoContrato, salario)) {
      const dot: Array<[string, number, number]> = [
        ["dotacion_abr", 3, 30], ["dotacion_ago", 7, 31], ["dotacion_dic", 11, 20],
      ];
      for (const [tipo, mes, dia] of dot) {
        const f = iso(y, mes, dia);
        if (inRange(f)) {
          out.push({
            id: `${p.empleadoId}:${tipo}:${f}`, empleadoId: p.empleadoId, tipo, fecha: f,
            label: "Entrega de dotación", detalle: "Calzado + vestido de labor · art. 230 CST",
            frecuencia: "anual", tone: "muted",
          });
        }
      }
    }
  }

  return out.sort((a, b) => a.fecha.localeCompare(b.fecha));
}
