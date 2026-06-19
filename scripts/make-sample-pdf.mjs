// scripts/make-sample-pdf.mjs — Genera un PDF valido con texto de contrato
// (capa de texto nativa, sin imagenes) para probar el pipeline de ingestion.
// Uso: node scripts/make-sample-pdf.mjs [salida.pdf]
import { writeFileSync } from "node:fs";

const lines = [
  "CONTRATO INDIVIDUAL DE TRABAJO A TERMINO FIJO",
  "EMPLEADOR: Acme Soluciones S.A.S. NIT 900123456-7",
  "TRABAJADOR: Juan Perez Gomez",
  "CEDULA: 1024567890",
  "CARGO: Analista de Datos",
  "SALARIO: 2500000 pesos mensuales",
  "JORNADA: 42 horas semanales (Ley 2101 de 2021)",
  "FECHA INICIO 2024-01-15",
  "CLAUSULA PRIMERA. Objeto: el trabajador se obliga a prestar sus servicios",
  "personales bajo subordinacion del empleador en el cargo indicado.",
  "CLAUSULA SEGUNDA. Salario: las partes acuerdan el salario mensual senalado,",
  "pagadero por mensualidades vencidas.",
  "CLAUSULA TERCERA. Jornada: la jornada maxima sera de 42 horas semanales.",
  "CLAUSULA CUARTA. Duracion: el presente contrato es a termino fijo por un anio.",
];

function escapePdf(s) {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

// Stream de contenido: posiciona y escribe cada linea con interlineado.
let content = "BT\n/F1 11 Tf\n50 770 Td\n15 TL\n";
content += lines.map((l, i) => (i === 0 ? `(${escapePdf(l)}) Tj` : `T* (${escapePdf(l)}) Tj`)).join("\n");
content += "\nET";

const objects = [
  "<< /Type /Catalog /Pages 2 0 R >>",
  "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
  "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
  `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
];

let pdf = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
const offsets = [];
objects.forEach((body, i) => {
  offsets.push(pdf.length);
  pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
});

const xrefStart = pdf.length;
pdf += `xref\n0 ${objects.length + 1}\n`;
pdf += "0000000000 65535 f \n";
for (const off of offsets) pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

const out = process.argv[2] ?? "scripts/sample-contrato.pdf";
writeFileSync(out, Buffer.from(pdf, "latin1"));
console.log(`PDF generado: ${out} (${pdf.length} bytes)`);
