// src/rules/debido-proceso.ts — Checklist de debido proceso disciplinario.
// Sentencia C-593/2014 y Art. 29 C.P.: un proceso disciplinario laboral debe
// garantizar el derecho de defensa. Esta regla evalua que pasos faltan; NO la
// decide la IA. Defendible y 100% trazable.

export interface PasoDebidoProceso {
  clave: string;
  descripcion: string;
  baseLegal: string;
}

export const PASOS_DEBIDO_PROCESO: PasoDebidoProceso[] = [
  {
    clave: "citacion_descargos",
    descripcion: "Citacion escrita y previa a diligencia de descargos, con tiempo razonable",
    baseLegal: "Art. 29 C.P. / C-593/2014",
  },
  {
    clave: "comunicacion_cargos",
    descripcion: "Comunicacion clara y concreta de los hechos y faltas imputadas",
    baseLegal: "Art. 115 CST",
  },
  {
    clave: "oportunidad_descargos",
    descripcion: "Oportunidad real de rendir descargos y presentar pruebas",
    baseLegal: "Art. 29 C.P.",
  },
  {
    clave: "derecho_defensa",
    descripcion: "Derecho a ser oido y a estar acompaniado/representado",
    baseLegal: "Art. 29 C.P.",
  },
  {
    clave: "controvertir_pruebas",
    descripcion: "Posibilidad de controvertir las pruebas en su contra",
    baseLegal: "Art. 29 C.P.",
  },
  {
    clave: "decision_motivada",
    descripcion: "Decision motivada y comunicada por escrito",
    baseLegal: "C-593/2014",
  },
  {
    clave: "proporcionalidad_sancion",
    descripcion: "Proporcionalidad entre la falta y la sancion impuesta",
    baseLegal: "Art. 115 CST",
  },
  {
    clave: "doble_instancia",
    descripcion: "Recursos/doble instancia si el reglamento interno los preve",
    baseLegal: "Reglamento Interno de Trabajo",
  },
];

export interface DebidoProcesoResult {
  totalPasos: number;
  completados: number;
  faltantes: PasoDebidoProceso[];
  cumple: boolean;
  porcentaje: number;
  checklist: Array<PasoDebidoProceso & { cumplido: boolean }>;
}

// pasosCumplidos: { clave: true/false }. Falta o false => paso no cumplido.
export function evaluarDebidoProceso(
  pasosCumplidos: Record<string, boolean>,
): DebidoProcesoResult {
  const checklist = PASOS_DEBIDO_PROCESO.map((p) => ({
    ...p,
    cumplido: pasosCumplidos[p.clave] === true,
  }));
  const faltantes = checklist.filter((p) => !p.cumplido);
  const completados = checklist.length - faltantes.length;

  return {
    totalPasos: checklist.length,
    completados,
    faltantes: faltantes.map(({ cumplido, ...p }) => p),
    cumple: faltantes.length === 0,
    porcentaje: Math.round((completados / checklist.length) * 100),
    checklist,
  };
}
