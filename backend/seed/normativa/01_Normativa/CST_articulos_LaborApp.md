---
fuente: Código Sustantivo del Trabajo — Artículos relevantes para LaborApp
proposito: Extracto curado de los artículos que el sistema usa o puede necesitar, para que el equipo decida la estrategia de RAG (código completo vs. extracto)
fecha_vigencia_texto: actualizado a 31 de mayo de 2026 (incluye Ley 2466 de 2025)
tipo: extracto curado
jurisdiccion: Colombia
fuente_oficial: http://www.secretariasenado.gov.co/senado/basedoc/codigo_sustantivo_trabajo.html
estado: COMPLETO — el CST íntegro está en la carpeta CST/ (17 partes, arts. 1-492); aquí está la capa esencial.
---

# CST — Artículos relevantes para LaborApp (capa esencial)

El **CST completo** está en `01_Normativa/CST/` (partes 1 a 17, arts. 1-492), con los artículos clave
marcados ⭐ dentro del texto íntegro. Esta lista es la **capa esencial** para optimizar el RAG: contiene
solo los artículos que el sistema usa o puede necesitar, con su ubicación en la compilación.

| Art. | Tema | Función en LaborApp | Parte (archivo) |
|---|---|---|---|
| 22 | Definición del contrato | Perfil / subordinación | 01 |
| 23 | Elementos esenciales (subordinación, Ley 2466) | Test de reclasificación | 01 |
| 24 | Presunción de contrato | Contrato realidad | 01 |
| 34 | Contratistas / solidaridad | Reclasificación | 02 |
| 45-47 | Duración / término fijo (máx. 4 años) / indefinido (Ley 2466) | Tipo de contrato, otrosí, preaviso | 02 |
| 59A | Maniobras de elusión (Ley 2466) | Reclasificación | 02 |
| 61-62 | Terminación y justas causas | Despido, disciplinario | 02 |
| 64 | Indemnización sin justa causa | Costo de desvinculación | 02 |
| 65 | Indemnización moratoria (hasta 24 meses) | Módulo "POR LIQUIDAR" | 02 |
| 78 | Período de prueba (máx. 2 meses) | Perfil del contrato | 03 |
| 104, 108 | Reglamento Interno y escala de faltas | Módulo disciplinario | 04 |
| 111-114 | Límites de sanciones (suspensión, multas) | Módulo disciplinario | 04 |
| **115** | **Debido proceso disciplinario (Ley 2466)** | Carta de descargos + timeline | 04 |
| 127-128 | Salario / pagos que no son salario | Base de cálculo | 05 |
| 129, 132 | Salario en especie / salario integral | Régimen salarial | 05 |
| 143 | Igualdad salarial | No discriminación | 05 |
| 160-161 | Jornada (diurno/nocturno; 42 h — Ley 2101/2466) | Compliance de jornada | 06 |
| 167A | Tope de horas extra (2/día, 12/semana) | Registro de horas | 06 |
| 168 | Recargos: nocturno 35%, extra diurna 25%, extra nocturna 75% | Registro de horas | 06 |
| 177 | Festivos | Calendario | 07 |
| 179 | Recargo dominical/festivo (90% en 2026 — Ley 2466) | Registro de horas | 07 |
| 186-192 | Vacaciones (15 días hábiles, acumulación, remuneración) | Liquidación, alertas | 07 |
| 227 | Auxilio por enfermedad común (180 días) | Estabilidad por salud | 08 |
| 230-232 | Dotación (≤2 SMMLV; 30 abr / 31 ago / 20 dic) | Calendario de obligaciones | 08 |
| 236-237 | Licencia de maternidad/paternidad | Riesgo de nulidad | 08 |
| 238 | Lactancia | Maternidad | 09 |
| **239-241** | **Fuero de maternidad (prohibición de despido)** | Riesgo de nulidad | 09 |
| 241A | Prohibición de pruebas de embarazo | Cumplimiento | 09 |
| 249-254 | Cesantías (un mes/año, salario base, pérdida) | Liquidación | 09 |
| 267 | Pensión-sanción | Riesgo de despido (antigüedad) | 09 |
| 306-307 | Prima de servicios (un mes/año, en dos pagos) | Liquidación, calendario | 11 |
| 340, 344 | Irrenunciabilidad e inembargabilidad | Prestaciones | 12 |
| 348-349 | Higiene y seguridad (SG-SST), reglamento | Documentos / compliance | 12 |
| 354 | Protección del derecho de asociación | Riesgo de nulidad (sindical) | 13 |
| **405-408, 410, 413** | **Fuero sindical (definición, amparados, reintegro)** | Riesgo de nulidad | 14 |
| 486 | Facultades de inspección y multas (Mintrabajo) | Gobernanza / riesgo | 17 |
| 488-489 | Prescripción de acciones (3 años — Ley 2466) | Riesgo, plazos | 17 |

---

## Notas de actualización por la Ley 2466 de 2025 (críticas para LaborApp)
- **Art. 23:** redefine la subordinación (test de reclasificación).
- **Art. 46:** término fijo **máximo 4 años**, nuevas reglas de prórroga (afecta el otrosí).
- **Art. 47:** término indefinido como **regla general**.
- **Art. 59A:** indemnización por maniobras de elusión (1 día/día, hasta 24 meses).
- **Art. 115:** **nuevo procedimiento de debido proceso disciplinario** (7 pasos, defensa ≥5 días).
- **Arts. 160-161, 167A:** jornada nocturna desde las **7 p.m.**, jornada de **42 h**, tope de extras.
- **Art. 179:** recargo dominical/festivo **90% en 2026** (→100% en 2027).
- **Art. 488:** prescripción de **3 años**.

---
*El texto íntegro y citable de cada artículo está en las 17 partes de la carpeta `CST/`. Esta capa esencial permite a los ingenieros decidir si el RAG carga el código completo o solo estos artículos.*
