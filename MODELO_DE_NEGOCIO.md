# Modelo de Negocio — VinApp

**Compliance laboral proactivo y gestión disciplinaria asistida por IA**
Propuesta de sostenibilidad y modelo económico para **Hurtado Gandini Abogados (HG)**

> Documento de negocio (no técnico). Acompaña a `DOCUMENTATION.md` (producto/arquitectura)
> y a `RETO.md` (contexto del caso). Las cifras monetarias están en **COP** salvo que se
> indique, son **estimaciones de planeación** basadas en precios de mercado 2025–2026 en
> Colombia y se marcan como *supuestos* en la sección final.

---

## 1. Resumen ejecutivo

VinApp convierte un servicio legal **manual, repetitivo y reactivo** (revisión periódica de
nómina y contratos, elaboración caso por caso de pliegos de cargos) en un **servicio digital
recurrente, proactivo y trazable**. El modelo propuesto es **B2B SaaS con membresía mensual**,
vendido por HG a sus clientes empresariales (50–500 trabajadores), con el equipo de producto
como proveedor de la plataforma.

La tesis económica tiene tres pilares:

1. **Ingreso recurrente (MRR)**: membresía mensual por empresa cliente, escalonada por tamaño
   de nómina. No es un proyecto "una sola vez": es una suscripción que se renueva mes a mes.
2. **Costo marginal bajo**: una vez construido el producto, atender un cliente adicional cuesta
   muy poco (software multi-tenant). El margen bruto crece con cada cliente.
3. **ROI evidente para el cliente**: una sola demanda laboral evitada (liquidación mal calculada
   o despido sin debido proceso) cuesta a la empresa **decenas de millones de COP**; la
   membresía cuesta una fracción de eso al mes. El producto **se paga solo**.

> No es solo un modelo de gastos: es un modelo de **ingresos recurrentes con margen creciente**,
> donde HG monetiza su conocimiento jurídico a escala sin contratar abogados de forma lineal.

---

## 2. Propuesta de valor

| Para… | Dolor actual | Lo que VinApp entrega |
|---|---|---|
| **Empresa cliente (RRHH)** | Incumplimientos involuntarios (PILA, primas, vacaciones, liquidaciones), riesgo de demandas, procesos disciplinarios mal documentados | Alertas tempranas, liquidación verificada con base legal, pliegos con debido proceso, todo accionable desde RRHH |
| **Hurtado Gandini (firma)** | Servicio que no escala: depende de horas-abogado leyendo cada contrato | Productiza su expertise: cobra una **membresía** en vez de horas, atiende más clientes con el mismo equipo, fideliza con un servicio "siempre encendido" |
| **Equipo de producto** | — | Ingreso recurrente vía licencia de plataforma + participación |

**Diferenciadores defendibles:**
- **El código calcula y decide; la IA solo extrae y redacta.** Cada cifra cita su base legal
  (CST, Ley 2101/2021) y queda en `audit_logs`. Esto responde la pregunta del jurado: *¿qué
  pasa cuando la IA se equivoca?* → hay validación determinista + humano-en-el-bucle + traza.
- **Confidencialidad**: opción de despliegue **on-premise / IA local (Ollama)** — los contratos
  nunca salen de la infraestructura del cliente o de HG. Argumento de venta clave en derecho.
- **Diferenciador Ley 2466/2025**: detección de subordinación algorítmica / reclasificación de
  contratos civiles — un módulo premium que pocos competidores tienen.

---

## 3. Público objetivo

### 3.1 Cliente final (quien usa y se beneficia)
- **Empresas con 50–500 trabajadores** con vínculo laboral directo (el segmento que HG ya
  atiende según `RETO.md`).
- Sectores con alta rotación, turnos y dotación: **retail, manufactura, logística/reparto,
  call centers, salud, vigilancia, construcción**.
- Comprador económico: **Gerencia de Talento Humano / Gerencia Financiera / Gerencia General**.
- Usuario operativo: **analistas de nómina y RRHH**; supervisor jurídico: **abogado de HG**.

### 3.2 Canal / socio (quien vende y respalda)
- **Hurtado Gandini Abogados**: aporta marca, cartera de clientes, criterio jurídico y la
  figura del **abogado responsable** que firma. Es el canal de distribución y el sello de
  confianza.

### 3.3 Segmentación por tamaño (define el plan)
| Segmento | Trabajadores | Plan sugerido |
|---|---|---|
| Pyme laboral | 50–100 | Esencial |
| Mediana | 101–300 | Profesional |
| Corporativa | 301–500 | Corporativo |
| Plataformas / multi-sede | 500+ o riesgo Ley 2466 | Enterprise (a la medida) |

---

## 4. Modelo de negocio y estructura de la relación

**Tipo:** B2B SaaS multi-tenant, **membresía mensual** (suscripción anual con facturación
mensual). Cadena de valor:

```
Equipo de producto ──(licencia de plataforma)──> Hurtado Gandini ──(servicio + membresía)──> Empresas cliente
        (opera/mantiene VinApp)                     (canal + respaldo jurídico)            (pagan suscripción)
```

Se proponen **dos esquemas** para la relación equipo ↔ HG (elegir uno):

- **Esquema A — Licencia + fee por tenant (recomendado):** HG paga al equipo una **licencia
  base mensual** (mantenimiento, hosting, soporte de plataforma) + un **fee por empresa activa**.
  HG fija libremente el precio final al cliente y se queda con el diferencial. Previsible para
  ambas partes.
- **Esquema B — Revenue share:** el equipo opera el SaaS y **comparte ingresos** con HG
  (p. ej. **HG 60% / equipo 40%**) por su rol de canal y supervisión jurídica. Alinea
  incentivos al crecimiento, pero exige reporting de ingresos.

> Recomendación: arrancar con **Esquema A** (ingresos predecibles para el equipo, autonomía
> comercial para HG) y migrar a **B** si HG quiere capturar más margen a cambio de asumir más
> riesgo comercial.

---

## 5. Estructura de precios (membresía)

Precio escalonado por **tamaño de nómina** (el valor y el riesgo evitado crecen con el número de
trabajadores). Facturación mensual; descuento por pago anual anticipado.

| Plan | Trabajadores | Precio cliente (COP/mes) | Incluye |
|---|---|---|---|
| **Esencial** | hasta 100 | **$1.900.000** | Lectura de contratos, alertas (vencimientos/PILA/vacaciones), liquidación verificada, dashboard, 1 usuario abogado HG |
| **Profesional** | 101–300 | **$4.200.000** | Todo Esencial + módulo disciplinario asistido (pliegos con debido proceso) + timesheet/jornada Ley 2101 + auditoría |
| **Corporativo** | 301–500 | **$7.900.000** | Todo Profesional + RAG de riesgo (citación de fuentes) + multi-sede + SLA prioritario |
| **Enterprise** | 500+ / Ley 2466 | **A la medida** (desde $12M) | Detección de subordinación algorítmica, on-premise, integraciones de nómina, soporte dedicado |

**Modelo alternativo (por colaborador activo):** ~**$18.000–28.000 COP/colaborador/mes**, útil
para nóminas variables. Equivale aproximadamente a los planes anteriores.

**Add-ons (mayor ARPU):**
- Implementación / migración inicial (one-time): **$3M–8M** según tamaño.
- Módulo Ley 2466 (subordinación algorítmica): **+$1.5M–3M/mes**.
- Capacitación y mesa de ayuda extendida: **+$800k/mes**.
- Despliegue **on-premise** dedicado (confidencialidad total): cuota de infraestructura +
  **+20–30%** sobre el plan.

**Anclaje de valor (ROI para el cliente):** una liquidación mal calculada o un despido sin
debido proceso puede costar entre **$20M y $150M+** en condena, intereses (art. 65 CST) y
honorarios. La membresía Profesional (~$50M/año) se justifica evitando **una sola** contingencia.

---

## 6. Modelo de ingresos

- **Fuente primaria:** MRR de membresías (suscripción).
- **Fuentes secundarias:** implementación inicial (one-time), add-ons, Enterprise a la medida.
- **Métricas clave:** MRR, ARR (= MRR × 12), ARPU (ingreso medio por cuenta), churn,
  expansión (upsell a planes mayores y add-ons).

**Ejemplo de cuenta tipo:** una mediana de 200 trabajadores en plan Profesional = **$4.2M/mes**
= **$50.4M/año** de ARR por un solo cliente.

---

## 7. Estructura de costos

El costo depende fuertemente del **modelo de despliegue**. VinApp soporta IA **local (Ollama)**
o **nube**, lo que permite elegir entre **confidencialidad máxima** y **menor costo operativo**.

### 7.1 Costos fijos (independientes del nº de clientes)
| Concepto | Estimación mensual (COP) | Nota |
|---|---|---|
| Producto/ingeniería (mantenimiento + evolución) | $12M–25M | 1–2 devs + part-time; el grueso del gasto al inicio |
| Soporte y éxito del cliente | $3M–6M | Crece con la base instalada |
| Curaduría jurídica (actualizar reglas: nuevas leyes/jurisprudencia) | $2M–4M | Abogado de HG; mantiene el "motor de reglas" vigente |
| Comercial / marketing | $2M–5M | Acelera adquisición |

### 7.2 Costos variables — **Despliegue en nube** (multi-tenant compartido)
Camino **lean**: usar **APIs de LLM por tokens** en vez de GPU propia mientras el volumen es bajo.

| Recurso | Estimación mensual | Nota |
|---|---|---|
| Cómputo API (Fastify + worker) | USD 20–80 | VPS/contenedores |
| Postgres + pgvector administrado (Neon/Supabase) | USD 25–120 | Escala con datos/embeddings |
| Redis (colas) | USD 10–40 | BullMQ |
| Object storage (PDFs, tipo S3/MinIO) | USD 5–30 | Por almacenamiento |
| LLM: **API por tokens** (extracción + RAG) | USD 50–300 | Pago por uso; sube con volumen de contratos |
| LLM: **GPU self-host en nube** (alternativa) | USD 300–900 | Sólo si se exige modelo propio en nube |
| **Total nube (arranque)** | **≈ USD 110–570 / mes** (~$0.45M–2.4M COP) | Para decenas de clientes |

> Costo marginal por cliente adicional en nube: **muy bajo** (pocos USD/mes), de ahí el margen
> creciente del SaaS.

### 7.3 Costos variables — **Despliegue local / on-premise** (por cliente o en HG)
Camino **confidencialidad total**: la IA corre en infraestructura del cliente/HG (Ollama local),
los datos **nunca salen**. Argumento de venta fuerte en legal.

| Concepto | Estimación | Nota |
|---|---|---|
| Servidor con GPU (compra) | $8M–25M one-time | Para `llama3:8b` / `qwen2.5:14b`. Puede correr en CPU con menor velocidad |
| Instalación y puesta a punto | $3M–8M one-time | Add-on de implementación |
| Mantenimiento/actualizaciones | $1M–2.5M/mes | Soporte remoto |
| Sin costo de tokens (IA local) | $0 | Se cambia OPEX de API por CAPEX de hardware |

**Cuándo conviene cada uno:**
- **Nube** → menor inversión inicial, escala rápido, ideal para Esencial/Profesional.
- **On-premise** → clientes Enterprise o muy sensibles a confidencialidad; mayor CAPEX pero
  diferenciador comercial y margen superior a largo plazo.

---

## 8. Economía unitaria (unit economics)

Ejemplo con **plan Profesional ($4.2M/mes)** en despliegue nube compartido:

| Métrica | Valor estimado | Cómo se calcula |
|---|---|---|
| Ingreso por cuenta (ARPU) | $4.2M/mes | Precio del plan |
| Costo variable de servir (nube) | ~$0.15M/mes | Prorrateo de infra + tokens |
| **Margen bruto por cuenta** | **~96%** | (ARPU − costo variable) / ARPU |
| CAC (costo de adquisición) | $4M–10M | Venta consultiva vía HG (su cartera abarata el CAC) |
| Payback de CAC | **1–3 meses** | CAC / margen bruto mensual |
| LTV (con churn ~5% anual, vida ~3–5 años) | $120M–200M+ | ARPU × margen × duración |
| **LTV : CAC** | **> 12:1** | Muy saludable para SaaS |

> El canal HG es la palanca clave: vender a su **cartera existente** reduce drásticamente el CAC
> frente a vender en frío.

---

## 9. Proyección financiera (3 años, escenario base)

Supuestos: mezcla de planes con ARPU promedio **~$3.5M/mes**; despliegue principalmente en nube;
crecimiento vía cartera de HG; churn ~5–8% anual.

| | Año 1 | Año 2 | Año 3 |
|---|---|---|---|
| Empresas cliente (fin de año) | 10 | 30 | 70 |
| ARPU promedio (COP/mes) | $3.0M | $3.4M | $3.8M |
| **MRR (fin de año)** | **$30M** | **$102M** | **$266M** |
| **ARR (run-rate)** | **$360M** | **$1.224M** | **$3.192M** |
| Costos fijos anuales (prod+soporte+legal+ventas) | ~$280M | ~$420M | ~$650M |
| Costos variables (infra/IA) anuales | ~$15M | ~$40M | ~$90M |
| **Resultado operativo aprox.** | **negativo/break-even** | **positivo** | **margen 40–55%** |

**Escenarios:**
- **Conservador:** 5 / 15 / 35 clientes → ARR Año 3 ≈ $1.500M.
- **Optimista:** 15 / 50 / 120 clientes → ARR Año 3 ≈ $5.000M+.

Punto de **break-even**: alrededor de **8–12 clientes Profesional** activos (cubre los costos
fijos). A partir de ahí, cada cliente nuevo es casi todo margen.

---

## 10. Modelo de implementación (90 días, realista)

Responde directamente la pregunta del jurado: *¿cómo se implementaría en la firma en 90 días con
presupuesto real?*

| Fase | Semanas | Actividades | Responsables |
|---|---|---|---|
| **0. Acuerdo y setup** | 1–2 | Firmar esquema comercial (A/B), definir despliegue (nube/on-prem), provisionar infraestructura, crear tenant de HG | Equipo + dirección HG |
| **1. Carga y parametrización** | 3–5 | Migrar/cargar contratos de 1–2 clientes piloto, validar extracción IA vs. realidad, ajustar reglas (jornada, prestaciones) | Equipo + abogado HG + RRHH cliente |
| **2. Piloto con cliente ancla** | 6–9 | Operar alertas, liquidaciones y 1–2 procesos disciplinarios reales con humano-en-el-bucle; medir aciertos | Abogado HG + RRHH + Equipo |
| **3. Ajuste y formación** | 10–11 | Capacitar a RRHH y abogados, afinar umbrales de alerta, documentar SLA | Equipo + HG |
| **4. Lanzamiento comercial** | 12–13 | Activar 2–3 clientes adicionales de la cartera de HG, pasar a facturación recurrente | HG (canal) + Equipo |

### 10.1 Recursos necesarios
- **Humanos:** 1–2 ingenieros (plataforma), 1 abogado laboralista de HG (curaduría + supervisión),
  1 rol de éxito del cliente, apoyo comercial de HG.
- **Tecnológicos:** infraestructura nube **o** servidor con GPU (on-prem); el stack ya existe
  (ver `DOCUMENTATION.md`): Fastify + worker, Postgres/pgvector, Redis, MinIO, Ollama.
- **Presupuesto de arranque (90 días):** **$40M–70M COP** (equipo + infra + implementación
  piloto), recuperable con los primeros 8–12 clientes.

### 10.2 Actores
| Actor | Rol |
|---|---|
| Equipo de producto | Construye, opera y evoluciona VinApp; soporte de plataforma |
| Hurtado Gandini | Canal de venta, marca, criterio jurídico, **abogado responsable** que firma |
| RRHH del cliente | Usuario operativo: carga contratos, atiende alertas, gestiona disciplinarios |
| Abogado HG | Supervisa, valida la IA, asume la responsabilidad profesional |

---

## 11. Adopción institucional

- **Bajo esfuerzo de cambio para el cliente:** se integra al flujo de RRHH (subir contrato →
  recibir alertas y cálculos). No reemplaza al abogado: lo **potencia**.
- **Confianza por diseño:** cada cálculo muestra su **base legal** y queda en auditoría; el
  abogado puede revisar y corregir (corrección manual trazable). Esto facilita la aprobación
  jurídica interna.
- **Gestión del cambio:** capacitación corta a RRHH, plantillas y "abogado-en-el-bucle" para
  los primeros casos hasta generar confianza.
- **Pegajosidad (retención):** una vez cargada la nómina y el histórico, migrar cuesta; las
  alertas recurrentes y la traza de auditoría crean dependencia positiva → **bajo churn**.

---

## 12. Responsabilidad legal y gobernanza de IA

> Responde la pregunta del jurado: *¿quién responde legalmente si la IA genera algo incorrecto?*

- **La IA es asistencial, no decisoria.** Extrae y redacta borradores; el **cálculo jurídico lo
  hace código determinista** validado con tests, y **un abogado de HG revisa y firma**.
- **Responsabilidad profesional:** recae en HG/el abogado que avala el resultado, igual que hoy
  con el trabajo manual. VinApp es **herramienta de soporte a la decisión** (se documenta en el
  contrato de servicio con cláusulas de alcance y limitación).
- **Trazabilidad:** todo (extracción, RAG, correcciones humanas, análisis) queda en `audit_logs`
  con modelo usado y fuentes — evidencia de **debido cuidado**.
- **Abstención del RAG:** si no hay evidencia suficiente, el sistema **se abstiene** en vez de
  inventar, reduciendo el riesgo de error con efecto jurídico.
- **Datos personales (Ley 1581/2012):** roles, multi-tenancy estricta y opción **on-premise**
  para datos sensibles; acuerdos de tratamiento de datos con cada cliente.

---

## 13. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Error de la IA con efecto jurídico | Reglas deterministas + humano-en-el-bucle + abstención + auditoría |
| Cambios normativos (nuevas leyes/jurisprudencia) | Curaduría jurídica continua (centralizada en `rules/` + constantes versionadas) |
| Confidencialidad de contratos | Despliegue on-premise / IA local; cifrado; multi-tenancy |
| Dependencia de un solo canal (HG) | A futuro, habilitar otras firmas/clientes directos con el mismo producto |
| Churn por baja activación | Onboarding guiado, éxito del cliente, valor visible (alertas/ROI) desde el mes 1 |
| Costos de IA en nube al escalar | Migrar a GPU propia / on-prem cuando el volumen lo justifique |

---

## 14. Sostenibilidad y por qué es defendible

- **Ingreso recurrente + costo marginal bajo** = márgenes crecientes y caja predecible.
- **Foso competitivo:** dominio jurídico colombiano codificado + trazabilidad + diferenciador
  Ley 2466 + respaldo de marca de HG.
- **Escalabilidad sin crecimiento lineal de costos:** atender el cliente 50 cuesta casi lo mismo
  que el cliente 10 (software multi-tenant).
- **Alineación de incentivos:** HG vende más sin contratar abogados linealmente; el cliente
  evita contingencias; el equipo crece con MRR.

---

## 15. KPIs a seguir

- **Comerciales:** nº de clientes activos, MRR/ARR, ARPU, churn, expansión (upsell), LTV:CAC.
- **Producto/operación:** contratos procesados/mes, alertas accionadas, % de extracción correcta,
  tiempo de liquidación, nº de procesos disciplinarios asistidos.
- **Valor demostrable:** contingencias/multas evitadas (ROI), tiempo-abogado ahorrado.

---

## 16. Supuestos (transparencia)

- Cifras de precios, costos y proyecciones son **estimaciones de planeación** (mercado COP
  2025–2026) para sustentar el modelo ante el jurado; deben validarse con cotizaciones reales de
  infraestructura y con la política de honorarios de HG.
- SMMLV 2025 de referencia: **$1.423.500** (usado en las reglas del producto).
- Costos en nube expresados en USD por ser la moneda típica de los proveedores; conversión
  aproximada a COP a tasa ~$4.100/USD.
- Mezcla de planes, tasa de cierre vía cartera de HG y churn son hipótesis; el escenario base es
  intencionalmente conservador.

---

### Anexo — Decisión rápida para HG

| Pregunta | Recomendación |
|---|---|
| ¿Modelo? | **B2B SaaS, membresía mensual** escalonada por tamaño de nómina |
| ¿Relación equipo↔HG? | **Esquema A** (licencia + fee por tenant) al inicio |
| ¿Despliegue? | **Nube** para arrancar; **on-premise** como premium de confidencialidad |
| ¿Primer objetivo? | **8–12 clientes Profesional** de la cartera de HG → break-even |
| ¿Tiempo a producción? | **90 días** con piloto en cliente ancla |
