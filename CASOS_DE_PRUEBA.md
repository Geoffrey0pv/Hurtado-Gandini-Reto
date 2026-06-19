# Casos de prueba — LaborApp

Casos para validar la solución contra los requisitos del **RETO** (sección 4.3) y
los **FUNDAMENTOS_LEGALES**. Incluye los documentos que necesita el RAG, textos de
contrato listos para generar PDFs, y el resultado esperado de cada caso con su base
legal, para verificar que el sistema responde como exige el marco colombiano.

Parámetros legales 2026 usados como referencia (FUNDAMENTOS §4):
- SMMLV 2026: **$1.750.905** · Auxilio transporte: **$249.095** (tope 2 SMMLV).
- Jornada máxima semanal: **44 h hasta 15-jul-2026**, **42 h desde 16-jul-2026** (Ley 2101/2021).
- Año comercial: 360 días.

---

## 1. Preparación del entorno

1. Infra: `cd backend && docker compose up -d`.
2. API: `cd backend && npm run dev` (http://localhost:3000).
3. Worker: `cd backend && npm run worker` (colas extract / embed / analysis).
4. Ollama con modelos: `llama3:8b-instruct-q4_K_M`, `qwen2.5:14b-instruct-q4_K_M`, `bge-m3`.
   - Sin modelos: `LLM_MODE=mock` en `backend/.env` (corre el flujo sin Ollama).
5. Frontend: `cd frontend && npm run dev`.
6. Usuario de prueba: `admin@laborapp.co` / `demo1234`. Colaboradores de prueba:
   crea los que se indican en cada caso (Documentos → Cargar documento exige seleccionar uno).

> La revisión jurídica (RAG) con `qwen2.5:14b` tarda ~2–3 min por consulta. Es lo
> esperado; el chatbot muestra el estado de carga.

---

## 2. Documentos que necesita el RAG

El RAG de revisión jurídica recupera evidencia por similitud (pgvector + `bge-m3`)
y razona **citando la fuente o absteniéndose**. Para que funcione correctamente
necesita que existan *chunks* indexados para el contrato consultado.

### 2.1 Obligatorio (ya soportado)
- **El PDF del contrato** subido por Documentos → al quedar `DONE`, el worker
  trocea sus cláusulas y genera embeddings en `document_chunks` (`source="contrato"`).
  Esta es la fuente mínima: el RAG cita las cláusulas del propio contrato.
- Requisito: PDF **con texto seleccionable** (no escaneado). Si es escaneado, entra
  el OCR (`tesseract.js`), con menor precisión.

### 2.2 Recomendado para enriquecer el análisis (normativa)
Para que el RAG contraste el contrato contra la ley, conviene indexar también
normativa como fuentes adicionales (`source="normativa"`). Documentos sugeridos
(en `.txt`/`.md` con texto plano), derivados de FUNDAMENTOS §19:

- **Código Sustantivo del Trabajo** — arts. 46, 61, 64, 99, 115, 127–128, 186–187,
  230, 239–240, 249–252, 306–307.
- **Ley 2101 de 2021** — reducción de jornada a 42 h.
- **Ley 2466 de 2025** — recargos y subordinación algorítmica (reclasificación).
- **Ley 50 de 1990** — cesantías e intereses; salario integral (≥10 SMMLV).
- **Decretos 1469 y 1470 de 2025** — SMMLV y auxilio de transporte 2026.
- (Disciplinario) **Reglamento Interno de Trabajo** del cliente — define la gravedad
  de las faltas (FUNDAMENTOS §13.2).

> Estado actual: el pipeline indexa la normativa con el mismo modelo de embeddings,
> pero **aún no hay endpoint de carga de normativa** (solo contratos). Mientras se
> agrega, el RAG se fundamenta en las cláusulas del contrato. Marcar este punto en la
> demo como mejora inmediata (seed de normativa con `source="normativa"`).

---

## 3. Textos de contrato (generar PDF y subir)

Copia cada texto en Word/Docs y expórtalo a PDF. Súbelo en Documentos → Cargar
documento, seleccionando el colaborador indicado.

### Contrato A — Término fijo con múltiples incumplimientos
Colaborador: **Juan Perez Gomez**, cédula 1020304050.

```
CONTRATO INDIVIDUAL DE TRABAJO A TERMINO FIJO

Entre EMPRESA DEMO S.A.S., NIT 900.123.456-7, EL EMPLEADOR, y JUAN PEREZ GOMEZ,
identificado con cedula 1.020.304.050, EL TRABAJADOR, se celebra:

CLAUSULA PRIMERA. CARGO. Analista de Operaciones, bajo subordinacion del EMPLEADOR.
CLAUSULA SEGUNDA. DURACION. Seis (6) meses desde el 1 de febrero de 2026 hasta el
31 de julio de 2026, prorrogable.
CLAUSULA TERCERA. PERIODO DE PRUEBA. Cuatro (4) meses.
CLAUSULA CUARTA. JORNADA. Cuarenta y ocho (48) horas semanales, de lunes a sabado.
CLAUSULA QUINTA. REMUNERACION. Salario mensual de UN MILLON QUINIENTOS MIL PESOS
($1.500.000), como salario integral que incluye todas las prestaciones sociales.
CLAUSULA SEXTA. EXCLUSIVIDAD. No podra prestar servicios a terceros.

Firmado en Bogota D.C., el 1 de febrero de 2026.
```

### Contrato B — Término indefinido conforme
Colaborador: **Maria Fernanda Rios Lopez**, cédula 52987654.

```
CONTRATO INDIVIDUAL DE TRABAJO A TERMINO INDEFINIDO

Entre EMPRESA DEMO S.A.S., NIT 900.123.456-7, y MARIA FERNANDA RIOS LOPEZ,
cedula 52.987.654, a termino indefinido:

CLAUSULA PRIMERA. CARGO. Coordinadora de Talento Humano.
CLAUSULA SEGUNDA. INICIO. 15 de enero de 2026, a termino indefinido.
CLAUSULA TERCERA. JORNADA. Cuarenta y dos (42) horas semanales, de lunes a viernes.
CLAUSULA CUARTA. SALARIO. TRES MILLONES OCHOCIENTOS MIL PESOS ($3.800.000) mensuales.
CLAUSULA QUINTA. PERIODO DE PRUEBA. Dos (2) meses.

Firmado en Medellin, el 15 de enero de 2026.
```

### Contrato C — Prestación de servicios con indicios de subordinación
Colaborador: **Carlos Andres Mejia**, cédula 71234567.

```
CONTRATO DE PRESTACION DE SERVICIOS

Entre EMPRESA DEMO S.A.S., NIT 900.123.456-7, EL CONTRATANTE, y CARLOS ANDRES
MEJIA, cedula 71.234.567, EL CONTRATISTA:

PRIMERA. OBJETO. Prestacion de servicios de mensajeria y reparto.
SEGUNDA. HORARIO. El CONTRATISTA cumplira un horario de lunes a sabado de 8:00 a.m.
a 6:00 p.m. asignado por la plataforma de la empresa.
TERCERA. INSTRUCCIONES. Recibira ordenes e instrucciones directas del supervisor de
operaciones y la asignacion de tareas se realiza mediante la aplicacion de la empresa.
CUARTA. EXCLUSIVIDAD. Prestara sus servicios de forma exclusiva para EL CONTRATANTE.
QUINTA. HERRAMIENTAS. Usara el uniforme y el vehiculo suministrados por la empresa.
SEXTA. HONORARIOS. La tarifa por servicio es fijada por la empresa.

Firmado en Cali, el 1 de marzo de 2026.
```

---

## 4. Casos de prueba

### CP-01 · Lectura contractual (extracción)
**Requisito RETO 4.3(1) · evaluación "Lectura contractual".**
- Acción: subir Contrato A.
- Esperado: estado pasa a *Procesando* → *Pendiente de revisión* (`DONE`). En el
  detalle, resumen con: tipo `Término fijo`, cargo "Analista de Operaciones",
  cédula 1020304050, salario $1.500.000, jornada 48 h, fechas 2026-02-01 / 2026-07-31.
- Verifica: el archivo abre desde MinIO con "Ver archivo (PDF)".

### CP-02 · Verificación de liquidación (prestaciones)
**Requisito RETO 4.3(3) · "Verificación de liquidación".**
- Acción: abrir **Obligaciones** tras procesar Contrato A.
- Esperado (FUNDAMENTOS §6, año comercial 360): cesantías, intereses (12%), prima y
  vacaciones proporcionales, con su base legal (arts. 249, 99 Ley 50/90, 306, 186).
  Indemnización estimada por término fijo = salarios faltantes (art. 64).
- Verifica: cada concepto muestra valor en COP y su norma.

### CP-03 · Jornada legal (Ley 2101/2021)
**Requisito RETO 4.3(1) · evaluación de jornada.**
- Esperado Contrato A (48 h, fecha actual ≤ 15-jul-2026 → máx 44 h): **No conforme**,
  "excede en 4 h", base "Ley 2101 de 2021".
- Esperado Contrato B (42 h): **Conforme**.
- Dónde: Obligaciones (tarjeta del contrato) y Alertas (tipo `JORNADA`).

### CP-04 · Alertas tempranas (4 categorías)
**Requisito RETO 4.3(2) · "Detección de riesgo / utilidad para el cliente".**
En **Alertas**, esperado:
- `VENCIMIENTO_CONTRATO` (Contrato A, término fijo): según días al 31-jul-2026; ≤30
  días → ADVERTENCIA (art. 46 CST).
- `VACACIONES_ACUMULADAS`: >1 período sin disfrutar → alerta (art. 187 CST).
- `LIQUIDACION_PENDIENTE`: si la fecha fin ya pasó → crítica (art. 65 CST).
- `SEGURIDAD_SOCIAL`: obligación mensual a nivel compañía (Ley 100/93).

### CP-05 · Revisión jurídica RAG — riesgos con cita
**Requisito RETO 4.3 · diferenciador IA + FUNDAMENTOS §16 (validación humana).**
- Acción: abrir Contrato A en Documentos → "Ejecutar revisión jurídica" (o preguntar
  en el chat). También desde la pantalla **Revisión jurídica**.
- Esperado: riesgos citando `[FUENTE N]`, p. ej.:
  - Jornada 48 h excede el máximo legal (alta).
  - Periodo de prueba de 4 meses excede el máximo (término fijo ≤ 1 año: 1/5 de la
    duración, tope 2 meses).
  - Salario $1.500.000 inferior al SMMLV 2026 ($1.750.905) y "salario integral"
    inválido (<10 SMMLV).
- Verifica: cada riesgo trae severidad, fuente citada, recomendación y confianza;
  queda registrado en **Auditoría** (`RAG_RISK`).

### CP-06 · Abstención del RAG (no alucinar)
**FUNDAMENTOS §16 · gobernanza de IA.**
- Acción: en el chat de un contrato, preguntar algo sin soporte en el documento,
  p. ej. "¿Qué dice sobre teletrabajo internacional?".
- Esperado: el RAG **se abstiene** (lista en "Sin evidencia suficiente", confianza
  baja) en vez de inventar. Queda `RAG_RISK_ABSTENTION` en Auditoría.

### CP-07 · Reclasificación laboral (Ley 2466/2025)
**Requisito RETO 4.3(5) · diferenciador Ley 2466.**
- Acción: subir Contrato C (prestación de servicios) y ejecutar revisión jurídica
  preguntando por indicios de subordinación.
- Esperado: el RAG identifica indicios (horario fijo, instrucciones directas,
  exclusividad, herramientas/uniforme de la empresa, tarifa fijada por la empresa,
  asignación por app → subordinación algorítmica) y señala riesgo de contrato
  realidad (art. 23 CST; Ley 2466/2025).

### CP-08 · Debido proceso disciplinario
**Requisito RETO 4.3(4) · "Proceso disciplinario / art. 29 CN".**
- Acción: en **Disciplinario**, crear un expediente y consultar el debido proceso
  (`GET /disciplinario/:id/debido-proceso`).
- Esperado: checklist de etapas (FUNDAMENTOS §13.1) y requisitos de la carta de
  descargos (art. 115 CST, art. 29 CN, SL1706-2024); marca etapas faltantes.

### CP-09 · Trazabilidad (auditoría)
**FUNDAMENTOS §15–16 · Ley 1581/2012.**
- Acción: abrir **Auditoría** tras ejecutar CP-01 a CP-07.
- Esperado: entradas `EXTRACT_CONTRACT` (con modelo), `RULES_ANALYSIS`
  (post-ingestion, sin modelo), `RAG_RISK` / `RAG_RISK_ABSTENTION` (con modelo,
  query y fuentes citadas), cada una con fecha.

### CP-10 · Multi-tenant (aislamiento)
- Acción: registrar una segunda organización y verificar que no ve contratos,
  alertas ni auditoría de la primera.
- Esperado: listados vacíos para el nuevo tenant (aislamiento por `organizationId`).

---

## 5. Validación por API (opcional)

```bash
TOK=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@laborapp.co","password":"demo1234"}' | jq -r .token)

# Alertas (4 categorías)
curl -s http://localhost:3000/alertas -H "Authorization: Bearer $TOK" | jq

# Análisis determinista de un contrato
curl -s http://localhost:3000/contratos/<ID>/analisis -H "Authorization: Bearer $TOK" | jq

# Revisión jurídica RAG (lento)
curl -s -X POST http://localhost:3000/rag/analyze -H "Authorization: Bearer $TOK" \
  -H "Content-Type: application/json" \
  -d '{"contratoId":"<ID>","query":"Analiza riesgos de jornada, periodo de prueba y salario."}' | jq

# Trazabilidad
curl -s "http://localhost:3000/audit-logs?action=RAG_RISK" -H "Authorization: Bearer $TOK" | jq
```

---

## 6. Preguntas del jurado (RETO §4.4) y dónde se responden

- **¿Qué hace la IA vs. el código?** La IA extrae datos del PDF y redacta el análisis
  de riesgo (RAG con cita/abstención); el código calcula prestaciones, jornada y
  alertas de forma determinista. Todo cálculo con efecto jurídico es determinista.
- **¿Qué pasa si la IA se equivoca?** Doble validación Zod sobre la salida del LLM,
  abstención cuando no hay evidencia, y validación humana obligatoria (Revisión
  jurídica). Nada se da por definitivo sin aprobación.
- **¿Quién responde legalmente?** La firma/abogado que aprueba; la IA solo propone.
- **Trazabilidad:** cada acción queda en `audit_logs` (autor, fecha, modelo, fuentes).
