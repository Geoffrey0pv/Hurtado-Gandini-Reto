# Índice de fuentes para el RAG legal — LaborApp (Reto 4)

Este documento lista los documentos que debe contener la base de conocimiento (RAG) de LaborApp,
con el **enlace oficial a la versión vigente** de cada uno. Descarga cada archivo desde su fuente
y guárdalo en la subcarpeta indicada.

> **Por qué desde la fuente oficial:** las versiones de `secretariasenado.gov.co/basedoc` y del
> `Gestor Normativo de Función Pública` están **consolidadas** (incorporan reformas y marcan la
> "vigencia expresa"). Eso evita cargar al RAG normas derogadas o desactualizadas.

---

## Estructura de carpetas

```
RAG_Documentos/
├── 01_Normativa/          → leyes, códigos y decretos (capa legal global)
├── 02_Jurisprudencia/     → sentencias (capa legal global)
├── 03_Plantillas/         → modelos de cartas, otrosí, certificados
└── 04_Reglamento_Cliente/ → RIT, convención y manuales POR EMPRESA (capa segmentada)
```

El RAG se organiza en **dos capas**: la **legal global** (carpetas 01 y 02, igual para todos los
clientes) y la **por cliente** (carpeta 04, aislada por empresa por la Ley 1581).

---

## 01_Normativa (capa global)

| Documento | Por qué se necesita | Fuente oficial (versión vigente) |
|---|---|---|
| Código Sustantivo del Trabajo (CST) | Base de prestaciones, indemnización, jornada, debido proceso | http://www.secretariasenado.gov.co/senado/basedoc/codigo_sustantivo_trabajo.html |
| Constitución Política — art. 29 | Debido proceso | http://www.secretariasenado.gov.co/senado/basedoc/constitucion_politica_1991.html |
| Ley 50 de 1990 | Régimen de cesantías e intereses | http://www.secretariasenado.gov.co/senado/basedoc/ley_0050_1990.html |
| Ley 100 de 1993 | Seguridad social (PILA) | http://www.secretariasenado.gov.co/senado/basedoc/ley_0100_1993.html |
| Ley 361 de 1997 | Estabilidad reforzada por discapacidad/salud | http://www.secretariasenado.gov.co/senado/basedoc/ley_0361_1997.html |
| Ley 1010 de 2006 | Acoso laboral | http://www.secretariasenado.gov.co/senado/basedoc/ley_1010_2006.html |
| Ley 1581 de 2012 | Protección de datos personales | http://www.secretariasenado.gov.co/senado/basedoc/ley_1581_2012.html |
| Ley 2101 de 2021 | Reducción de la jornada (42 h) | http://www.secretariasenado.gov.co/senado/basedoc/ley_2101_2021.html |
| **Ley 2466 de 2025 (reforma laboral)** | Recargos y subordinación algorítmica | https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=260676 |
| Decreto 1072 de 2015 (DUR Trabajo) | Jornadas especiales y proceso disciplinario | https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=72173 |
| Decreto 1469 de 2025 (SMMLV 2026) | Salario mínimo vigente | https://www.funcionpublica.gov.co/eva/gestornormativo (buscar "Decreto 1469 de 2025") |
| Decreto 1470 de 2025 (auxilio de transporte 2026) | Auxilio de transporte vigente | https://www.funcionpublica.gov.co/eva/gestornormativo (buscar "Decreto 1470 de 2025") |

> Nota: el SMMLV y el auxilio cambian cada año; estos decretos deben reemplazarse cada 1.º de enero.

---

## 02_Jurisprudencia (capa global)

| Sentencia | Tema | Fuente oficial |
|---|---|---|
| CSJ Sala Laboral **SL1706-2024** | Debido proceso disciplinario / nulidad del despido | https://cortesuprema.gov.co/sala-laboral-relatoria/ (buscar "SL1706-2024") |
| Corte Constitucional **SU-049 de 2017** | Estabilidad laboral reforzada por salud | https://www.corteconstitucional.gov.co/relatoria/2017/SU049-17.htm |
| Línea CSJ — contrato realidad (art. 23 CST) | Reclasificación laboral | https://cortesuprema.gov.co/sala-laboral-relatoria/ |
| Línea CSJ — indemnización moratoria (art. 65 CST) | Demora en el pago de la liquidación | https://cortesuprema.gov.co/sala-laboral-relatoria/ |
| Corte Constitucional — retén social / pre-pensionados | Protección por proximidad a la pensión | https://www.corteconstitucional.gov.co/relatoria/ |

---

## 03_Plantillas (modelos para generación)

No se descargan de la web: son modelos internos que el sistema usa como referencia de estructura.
Recomendados:

- Carta de llamamiento a descargos.
- Otrosí de prórroga (término fijo).
- Comunicación de terminación (laboral) y de contrato de prestación de servicios (civil).
- Certificado laboral y de liquidación.

---

## 04_Reglamento_Cliente (capa POR EMPRESA — aislada)

Estos documentos los aporta **cada empresa cliente** y NO se mezclan entre clientes:

- **Reglamento Interno de Trabajo (RIT)** — define la tipificación y gravedad de las faltas. Imprescindible para el módulo disciplinario.
- Convención o pacto colectivo (si existe).
- Manuales de funciones por cargo.
- Políticas internas (tratamiento de datos, SG-SST, código de conducta).

---

## Metadatos obligatorios en cada chunk del RAG

Para que el sistema cite la fuente y no entregue normas derogadas ni mezcle clientes:

- **fuente** (ley/decreto/sentencia/RIT) y **artículo o numeral exacto**.
- **fecha_vigencia / versión** — crítico: la Ley 2466 entra escalonada (recargos suben hasta 2027); el RAG debe filtrar "vigente a la fecha X".
- **tipo** (norma primaria, jurisprudencia, reglamento interno).
- **tenant / empresa** — aísla la capa por cliente (Ley 1581).

## Qué NO va al RAG

Los cálculos deterministas (liquidación, sanción moratoria, recargos, fechas de prestaciones, SMMLV)
NO se recuperan como texto: van como **reglas en código y configuración versionada por año**.

---

*Documento de trabajo para el prototipo. Verificar cada enlace antes de la ingesta; los portales
oficiales pueden cambiar la ruta exacta de un documento.*
