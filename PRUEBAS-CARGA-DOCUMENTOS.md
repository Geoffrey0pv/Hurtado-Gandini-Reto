# Pruebas — Carga de documentos (extracción IA)

Guía para probar el botón "Cargar documento" de la página **Documentos**, que sube
un PDF de contrato al pipeline de ingestión: `POST /contratos/upload` → MinIO →
worker (pdf-parse / OCR → extracción con Ollama → validación Zod → embeddings →
`document_chunks`).

## Requisitos antes de probar

1. Infraestructura arriba: `cd backend && docker compose up -d`.
2. Backend API: `cd backend && npm run dev` (http://localhost:3000).
3. Worker: `cd backend && npm run worker` (procesa la extracción en segundo plano).
4. Ollama con los modelos: `llama3:8b-instruct-q4_K_M` y `bge-m3`.
   - Si NO tienes los modelos, pon `LLM_MODE=mock` en `backend/.env` y reinicia el
     worker: el flujo corre igual con extracción/embeddings simulados.
5. Frontend: `cd frontend && npm run dev`.
6. Debe existir al menos un **colaborador** (el formulario lo exige). Créalo en la
   sección Colaboradores, o usa el de prueba ya sembrado: **Juan Perez Gomez**,
   cédula 1020304050.

## Cómo generar el PDF manualmente

1. Copia uno de los textos de abajo.
2. Pégalo en Word, Google Docs o LibreOffice.
3. Exporta o guarda como **PDF** (no como imagen escaneada: debe ser PDF con texto
   seleccionable para que `pdf-parse` lo lea sin OCR).
4. En la app: Documentos → **Cargar documento** → selecciona el colaborador →
   elige el PDF → **Subir**.
5. El diálogo mostrará el estado (Pendiente → Procesando → Pendiente de revisión).
   Al terminar, abre la fila en la tabla para ver los **datos extraídos** (JSON).

## Qué deberías ver al terminar (DONE)

- El contrato aparece en la tabla con estado "Pendiente de revisión".
- En el detalle, el JSON `extracted` con: tipo de contrato, nombre, cédula, cargo,
  fechas, salario y jornada.
- Si usas Ollama real, el contenido queda indexado en `document_chunks` y luego
  puedes correr el análisis de riesgo RAG sobre ese contrato.

---

## Texto 1 — Contrato a término fijo (caso con riesgos)

> Útil para demostrar extracción + detección de riesgos (jornada de 48h, período de
> prueba excesivo, salario integral mal redactado).

```
CONTRATO INDIVIDUAL DE TRABAJO A TERMINO FIJO

Entre EMPRESA DEMO S.A.S., identificada con NIT 900.123.456-7, en adelante EL
EMPLEADOR, y JUAN PEREZ GOMEZ, mayor de edad, identificado con cedula de ciudadania
No. 1.020.304.050, en adelante EL TRABAJADOR, se celebra el presente contrato
individual de trabajo a termino fijo, regido por las siguientes clausulas:

CLAUSULA PRIMERA. OBJETO. EL TRABAJADOR se obliga a prestar sus servicios personales
en el cargo de Analista de Operaciones, bajo subordinacion del EMPLEADOR.

CLAUSULA SEGUNDA. DURACION. El presente contrato tendra una duracion de seis (6)
meses, contados a partir del 1 de febrero de 2026 y hasta el 31 de julio de 2026,
prorrogable automaticamente por periodos iguales.

CLAUSULA TERCERA. PERIODO DE PRUEBA. Las partes acuerdan un periodo de prueba de
cuatro (4) meses, durante el cual cualquiera de las partes podra dar por terminado
el contrato sin previo aviso ni indemnizacion alguna.

CLAUSULA CUARTA. JORNADA. La jornada ordinaria de trabajo sera de cuarenta y ocho
(48) horas semanales, distribuidas de lunes a sabado.

CLAUSULA QUINTA. REMUNERACION. EL TRABAJADOR devengara un salario mensual de UN
MILLON QUINIENTOS MIL PESOS ($1.500.000), que se entiende como salario integral e
incluye todas las prestaciones sociales, recargos y horas extra.

CLAUSULA SEXTA. EXCLUSIVIDAD. EL TRABAJADOR no podra prestar servicios a ninguna
otra persona natural o juridica durante la vigencia del contrato.

En constancia se firma en la ciudad de Bogota D.C., el 1 de febrero de 2026.
```

---

## Texto 2 — Contrato a término indefinido (caso limpio)

> Útil para verificar que la extracción captura bien los campos en un contrato
> conforme.

```
CONTRATO INDIVIDUAL DE TRABAJO A TERMINO INDEFINIDO

Entre EMPRESA DEMO S.A.S., con NIT 900.123.456-7, en adelante EL EMPLEADOR, y MARIA
FERNANDA RIOS LOPEZ, identificada con cedula de ciudadania No. 52.987.654, en
adelante LA TRABAJADORA, se celebra el presente contrato a termino indefinido:

CLAUSULA PRIMERA. CARGO. LA TRABAJADORA desempenara el cargo de Coordinadora de
Talento Humano.

CLAUSULA SEGUNDA. INICIO. La relacion laboral inicia el 15 de enero de 2026 y es a
termino indefinido.

CLAUSULA TERCERA. JORNADA. La jornada de trabajo sera de cuarenta y dos (42) horas
semanales, de lunes a viernes, conforme a la Ley 2101 de 2021.

CLAUSULA CUARTA. SALARIO. LA TRABAJADORA devengara un salario mensual ordinario de
TRES MILLONES OCHOCIENTOS MIL PESOS ($3.800.000), pagaderos quincenalmente.

CLAUSULA QUINTA. PERIODO DE PRUEBA. Se pacta un periodo de prueba de dos (2) meses,
de conformidad con la ley.

En constancia se firma en Medellin, el 15 de enero de 2026.
```

---

## Texto 3 — Término fijo de un año (1-ene-2026 → 31-dic-2026)

> Inicia el 1 de enero de 2026 y termina dentro del mismo año. Útil para ver
> vencimiento de término fijo, vacaciones causadas y liquidación de un año completo.

```
CONTRATO INDIVIDUAL DE TRABAJO A TERMINO FIJO

Entre COMERCIAL ANDES S.A.S., identificada con NIT 901.888.777-5, en adelante EL
EMPLEADOR, y ANDRES FELIPE CASTRO RUIZ, mayor de edad, identificado con cedula de
ciudadania No. 1.098.765.432, en adelante EL TRABAJADOR, se celebra el presente
contrato individual de trabajo a termino fijo:

CLAUSULA PRIMERA. CARGO. EL TRABAJADOR se desempenara como Auxiliar Contable, bajo
subordinacion del EMPLEADOR.

CLAUSULA SEGUNDA. DURACION. El contrato tendra una duracion de un (1) ano, contado
a partir del 1 de enero de 2026 y hasta el 31 de diciembre de 2026, prorrogable.

CLAUSULA TERCERA. PERIODO DE PRUEBA. Se pacta un periodo de prueba de dos (2) meses,
de conformidad con la ley.

CLAUSULA CUARTA. JORNADA. La jornada de trabajo sera de cuarenta y dos (42) horas
semanales, de lunes a viernes, conforme a la Ley 2101 de 2021.

CLAUSULA QUINTA. REMUNERACION. EL TRABAJADOR devengara un salario mensual de DOS
MILLONES DOSCIENTOS MIL PESOS ($2.200.000).

En constancia se firma en la ciudad de Bogota D.C., el 1 de enero de 2026.
```

---

## Texto 4 — Término fijo con jornada excedida (1-ene-2026 → 30-sep-2026)

> Inicia el 1 de enero de 2026 y termina el 30 de septiembre de 2026. Caso con
> riesgo: jornada de 46 h (supera el máximo legal aplicable en 2026).

```
CONTRATO INDIVIDUAL DE TRABAJO A TERMINO FIJO

Entre COMERCIAL ANDES S.A.S., identificada con NIT 901.888.777-5, EL EMPLEADOR, y
DIANA MARCELA OSPINA LEON, identificada con cedula de ciudadania No. 43.221.100, EL
TRABAJADOR, se celebra el presente contrato a termino fijo:

CLAUSULA PRIMERA. CARGO. La trabajadora se desempenara como Asesora Comercial.

CLAUSULA SEGUNDA. DURACION. El contrato tendra vigencia desde el 1 de enero de 2026
y hasta el 30 de septiembre de 2026.

CLAUSULA TERCERA. PERIODO DE PRUEBA. Sesenta (60) dias.

CLAUSULA CUARTA. JORNADA. La jornada ordinaria sera de cuarenta y seis (46) horas
semanales, distribuidas de lunes a sabado.

CLAUSULA QUINTA. REMUNERACION. La trabajadora devengara un salario mensual de UN
MILLON OCHOCIENTOS MIL PESOS ($1.800.000), mas las comisiones por ventas pactadas.

En constancia se firma en la ciudad de Cali, el 1 de enero de 2026.
```

---

## Texto 5 — Caso IDEAL de liquidación (término fijo, año completo 2026)

> Caso de referencia para verificar la liquidación determinista. Término fijo del
> 1-ene-2026 al 31-dic-2026 (un año = 360 días comerciales), salario mínimo 2026
> ($1.750.905) y jornada máxima legal vigente (44 h). El auxilio de transporte
> ($249.095) lo aplica el sistema automáticamente porque el salario ≤ 2 SMMLV.
>
> Resultado esperado (al liquidar al terminar el contrato, sin indemnización):
> Cesantías $2.000.000 · Intereses $240.000 · Prima $2.000.000 ·
> Vacaciones $875.452,50 · **Total $5.115.452,50**.

```
CONTRATO INDIVIDUAL DE TRABAJO A TERMINO FIJO

Entre COMERCIAL ANDES S.A.S., identificada con NIT 901.888.777-5, en adelante EL
EMPLEADOR, y SOFIA RAMIREZ TORRES, mayor de edad, identificada con cedula de
ciudadania No. 1.144.556.677, en adelante LA TRABAJADORA, se celebra el presente
contrato individual de trabajo a termino fijo:

CLAUSULA PRIMERA. CARGO. La trabajadora se desempenara como Auxiliar Administrativo.

CLAUSULA SEGUNDA. DURACION. El contrato tendra una duracion de un (1) ano, contado
a partir del 1 de enero de 2026 y hasta el 31 de diciembre de 2026.

CLAUSULA TERCERA. JORNADA. La jornada de trabajo sera de cuarenta y cuatro (44)
horas semanales, conforme a la Ley 2101 de 2021.

CLAUSULA CUARTA. REMUNERACION. La trabajadora devengara un salario mensual
equivalente al salario minimo legal mensual vigente de UN MILLON SETECIENTOS
CINCUENTA MIL NOVECIENTOS CINCO PESOS ($1.750.905), mas el auxilio de transporte
de ley.

CLAUSULA QUINTA. PERIODO DE PRUEBA. Dos (2) meses.

En constancia se firma en la ciudad de Bogota D.C., el 1 de enero de 2026.
```

---

## Verificación rápida por API (opcional)

```bash
# Token
TOK=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@laborapp.co","password":"demo1234"}' | jq -r .token)

# Listar contratos y ver estado
curl -s http://localhost:3000/contratos -H "Authorization: Bearer $TOK" | jq '.[] | {id, status, tipoContrato}'

# Estado del job de ingestión
curl -s http://localhost:3000/contratos/job/<JOB_ID> -H "Authorization: Bearer $TOK"
```

## Solución de problemas

- **El estado se queda en "Procesando":** el worker no está corriendo o se cayó.
  Revisa `cd backend && npm run worker`.
- **Estado "Error" (FAILED):** el PDF no tenía texto seleccionable, o Ollama no
  estaba disponible. Usa un PDF con texto real o pon `LLM_MODE=mock`.
- **"Solo se aceptan archivos PDF":** el archivo no es `application/pdf`.
- **"Falta el campo colaboradorId":** no seleccionaste colaborador en el diálogo.
- **El selector de colaboradores está vacío:** crea un colaborador primero.
```
