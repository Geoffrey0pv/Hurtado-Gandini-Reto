import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { colaboradores, contratos } from "../../db/schema.js";
import { analizarContrato } from "../../rules/analisis.js";

export async function getAlertasOrg(orgId: string) {
  const rows = await db
    .select({
      contratoId: contratos.id,
      colaboradorId: contratos.colaboradorId,
      nombre: colaboradores.nombre,
      cedula: colaboradores.cedula,
      cargo: colaboradores.cargo,
      tipoContrato: contratos.tipoContrato,
      salario: contratos.salario,
      fechaInicio: contratos.fechaInicio,
      fechaFin: contratos.fechaFin,
      jornadaHorasSemana: contratos.jornadaHorasSemana,
      status: contratos.status,
    })
    .from(contratos)
    .innerJoin(colaboradores, eq(contratos.colaboradorId, colaboradores.id))
    .where(eq(contratos.organizationId, orgId));

  const result: Array<{
    contratoId: string;
    colaboradorId: string;
    nombre: string;
    cedula: string;
    cargo: string | null;
    severidad: "alta" | "media" | "baja";
    motivo: string;
    tipo: string;
    plazo?: string;
  }> = [];

  for (const row of rows) {
    if (row.status !== "DONE") continue;

    const analisis = analizarContrato({
      tipoContrato: row.tipoContrato,
      salario: row.salario != null ? Number(row.salario) : null,
      fechaInicio: row.fechaInicio,
      fechaFin: row.fechaFin,
      jornadaHorasSemana: row.jornadaHorasSemana,
    });

    for (const alerta of analisis.alertas) {
      const sev = alerta.severidad;
      const severidad: "alta" | "media" | "baja" =
        sev === "CRITICA" ? "alta" : sev === "ADVERTENCIA" ? "media" : "baja";
      if (sev === "OK") continue; // omitir alertas sin accion requerida

      result.push({
        contratoId: row.contratoId,
        colaboradorId: row.colaboradorId,
        nombre: row.nombre,
        cedula: row.cedula,
        cargo: row.cargo,
        severidad,
        motivo: alerta.mensaje,
        tipo: alerta.tipo,
        plazo: alerta.diasRestantes != null ? String(alerta.diasRestantes) : undefined,
      });
    }

    // Alertas de jornada
    if ("cumple" in analisis.jornada && !analisis.jornada.cumple) {
      result.push({
        contratoId: row.contratoId,
        colaboradorId: row.colaboradorId,
        nombre: row.nombre,
        cedula: row.cedula,
        cargo: row.cargo,
        severidad: "alta",
        motivo: analisis.jornada.mensaje,
        tipo: "JORNADA",
      });
    }
  }

  return result;
}
