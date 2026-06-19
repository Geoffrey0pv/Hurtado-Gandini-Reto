LaborApp
Fundamentos legales para el equipo de ingeniería
Cómo el derecho laboral colombiano se traduce en reglas, fechas y fórmulas del sistema
Reto 4 — Laboral & Compliance · Hurtado Gandini Abogados
Legal Hack Icesi 2026
Versión 1.0 · junio de 2026
 
Contenido
1. Propósito de este documento	1
2. Cómo leer este documento	1
3. Glosario de términos legales clave	1
4. Parámetros y constantes legales 2026	1
5. Tipos de contrato y sus reglas	1
6. Prestaciones sociales: conceptos y fórmulas	1
6.1 Base de cálculo	1
6.2 Cesantías	1
6.3 Intereses a las cesantías	1
6.4 Prima de servicios	1
6.5 Vacaciones	1
7. Indemnización por despido sin justa causa (art. 64 CST)	1
7.1 Por tipo de contrato	1
8. Jornada y recargos (Ley 2101/2021 y Ley 2466/2025)	1
8.1 Reducción de la jornada — Ley 2101 de 2021	1
8.2 Recargos — Ley 2466 de 2025 (reforma laboral)	1
9. Calendario de obligaciones y fechas legales	1
10. Alertas tempranas: reglas de negocio	1
11. Riesgo de despido: modelo compuesto	1
11.1 Costo económico	1
11.2 Riesgo de nulidad por fuero o estabilidad reforzada	1
11.3 Riesgo procesal (debido proceso)	1
12. Reclasificación laboral (Ley 2466/2025)	1
12.1 Contingencia estimada	1
13. Proceso disciplinario y debido proceso	1
13.1 Etapas del proceso	1
13.2 Requisitos de la carta de descargos	1
14. Documentos requeridos por ley	1
15. Protección de datos personales (Ley 1581/2012)	1
16. Validación humana y gobernanza de IA	1
17. Tabla maestra: norma → función del sistema	1
18. Supuestos, limitaciones y casos borde	1
19. Referencias normativas	1

 
1. Propósito de este documento
Este documento traduce el marco legal del derecho laboral colombiano a las reglas, fechas y fórmulas que LaborApp debe implementar. Está dirigido al equipo de ingeniería: no asume conocimiento jurídico previo y, para cada concepto legal, indica qué debe calcular, validar o alertar el sistema.
La premisa central es que LaborApp es un asistente de cálculo y redacción, no un sustituto del abogado. Por eso, en varias secciones se distingue entre lo que el sistema puede automatizar de forma determinista (cálculos con fórmula exacta) y lo que solo puede señalar para revisión humana (decisiones de criterio jurídico).
Convención: los bloques con borde como este resaltan decisiones de diseño o advertencias que afectan directamente la implementación.
2. Cómo leer este documento
Cada sección sigue la misma lógica: primero el concepto legal, luego la regla operativa (cómo se traduce a datos o cálculos) y, donde aplica, la fórmula y la norma que la respalda. Los conceptos se conectan con las entidades de datos del sistema así:
Concepto legal	Entidad / dato en el sistema	Para qué se usa
Contrato	Perfil del trabajador (tipo, salario, fechas, jornada)	Base de todos los cálculos y reglas
Prestaciones sociales	Motor de liquidación	Estimar lo que se debe al trabajador
Fueros / estabilidad	Variables booleanas del perfil	Riesgo de nulidad del despido
Obligaciones periódicas	Calendario y checklist	Alertas tempranas de cumplimiento
Proceso disciplinario	Expediente y línea de tiempo	Debido proceso y defensa
3. Glosario de términos legales clave
Definiciones mínimas para que el equipo entienda los nombres que aparecen en el código y en la interfaz.
•	SMMLV: Salario Mínimo Mensual Legal Vigente. Valor base que el Gobierno fija cada año; muchas reglas dependen de múltiplos de este valor.
•	Auxilio de transporte: Suma adicional al salario que se paga a quienes ganan hasta 2 SMMLV. No es salario, pero sí entra en la base de cesantías y prima.
•	Prestaciones sociales: Pagos adicionales al salario que la ley obliga al empleador: cesantías, intereses a las cesantías, prima de servicios y vacaciones.
•	Cesantías: Una especie de ahorro forzoso equivalente a un mes de salario por año trabajado, que se consigna en un fondo.
•	Prima de servicios: Un mes de salario por año, pagado en dos cuotas (junio y diciembre).
•	Indemnización: Pago que debe el empleador cuando termina el contrato sin justa causa. No es una prestación; es una sanción por el despido.
•	Fuero / estabilidad reforzada: Protección especial que impide o restringe el despido de ciertos trabajadores (salud, maternidad, sindicato, prepensión).
•	Debido proceso: Conjunto de pasos que la empresa debe cumplir antes de sancionar o despedir por justa causa; si se omite, el despido puede ser declarado injusto o nulo.
•	Contrato realidad: Principio según el cual, si en la práctica hay subordinación, existe contrato de trabajo aunque el papel diga 'prestación de servicios'.
•	Otrosí: Documento que modifica un contrato existente (por ejemplo, para prorrogar un contrato a término fijo).
4. Parámetros y constantes legales 2026
Estos valores deben vivir en una capa de configuración versionada por año, nunca incrustados en el código, porque cambian cada 1.º de enero (y algunos a mitad de año).
Parámetro	Valor 2026	Fuente / nota
SMMLV	$1.750.905	Decreto 1469 de 2025
Auxilio de transporte	$249.095	Decreto 1470 de 2025
Tope para auxilio de transporte	2 SMMLV = $3.501.810	Aplica si el salario es ≤ a este valor
Año comercial (base de cálculo)	360 días	Convención laboral para liquidaciones
Jornada máxima semanal	44 h hasta 15-jul-2026; 42 h desde 16-jul-2026	Ley 2101 de 2021 (ver sección 8)
La jornada y los recargos cambian a mitad de 2026. El motor de jornada debe ser sensible a la fecha de la operación, no usar un valor fijo.
5. Tipos de contrato y sus reglas
El tipo de contrato determina qué cálculos y reglas aplican. Es el primer dato que condiciona toda la lógica; por eso la interfaz muestra vistas distintas para vínculos laborales y para la prestación de servicios.
Tipo	Características	Implicación en el sistema
Término indefinido	Sin fecha de fin. El más común.	Indemnización por años de servicio (art. 64).
Término fijo	Con fecha de fin; se prorroga.	Requiere preaviso de 30 días y opción de otrosí; indemnización = salarios faltantes.
Obra o labor	Dura lo que dure la obra.	Indemnización = salarios faltantes, mínimo 15 días.
Prestación de servicios	Vínculo civil, no laboral.	No causa prestaciones ni aportes; activa el test de reclasificación.
6. Prestaciones sociales: conceptos y fórmulas
Las prestaciones se calculan sobre el año comercial de 360 días y de forma proporcional al tiempo trabajado en el período. Todos estos cálculos son deterministas: dada la misma entrada, siempre producen el mismo resultado, lo que permite automatizarlos con confianza.
6.1 Base de cálculo
La base para cesantías y prima incluye el auxilio de transporte cuando aplica; la base para vacaciones no incluye el auxilio de transporte.
Base prestacional = Salario + (Auxilio de transporte si Salario ≤ 2 SMMLV)
6.2 Cesantías
Equivalen a un mes de salario por año. Se liquidan a 31 de diciembre y se consignan al fondo (ver sección 9).
Cesantías = (Base prestacional × días trabajados) ÷ 360
Norma: art. 249 CST.
6.3 Intereses a las cesantías
El 12% anual sobre las cesantías acumuladas, pagado directamente al trabajador.
Intereses = (Cesantías × días trabajados × 12%) ÷ 360
Norma: art. 99 Ley 50 de 1990.
6.4 Prima de servicios
Un mes de salario por año, dividido en dos cuotas semestrales.
Prima = (Base prestacional × días del semestre) ÷ 360
Norma: art. 306 CST.
6.5 Vacaciones
15 días hábiles de descanso remunerado por año. Para liquidarlas en dinero se usa el salario sin auxilio de transporte.
Vacaciones = (Salario × días trabajados) ÷ 720
Norma: art. 186 CST. El divisor 720 equivale a 15 días hábiles por cada 360 trabajados.
Para vacaciones acumuladas, restar los días ya disfrutados. Si un trabajador acumula más de un período (≈15 días) sin disfrutar, el sistema debe generar una alerta.
7. Indemnización por despido sin justa causa (art. 64 CST)
Es el pago que debe el empleador cuando termina el contrato sin una causa legal. No aplica cuando el despido es con justa causa probada. El valor del día es el salario dividido entre 30.
Valor del día = Salario ÷ 30
7.1 Por tipo de contrato
Tipo de contrato	Fórmula de la indemnización
Indefinido, salario < 10 SMMLV	30 días por el primer año + 20 días por cada año adicional (proporcional por fracción).
Indefinido, salario ≥ 10 SMMLV	20 días por el primer año + 15 días por cada año adicional (proporcional).
Término fijo	Salarios correspondientes al tiempo que falte hasta la fecha de terminación.
Obra o labor	Salarios del tiempo que falte para terminar la obra, con un mínimo de 15 días.
La indemnización es un costo conocido y calculable; el riesgo real aparece cuando hay fuero (sección 11), donde el despido puede ser declarado nulo y ordenarse el reintegro.
8. Jornada y recargos (Ley 2101/2021 y Ley 2466/2025)
8.1 Reducción de la jornada — Ley 2101 de 2021
La jornada máxima semanal se reduce de forma progresiva. El sistema debe escoger el valor según la fecha de la operación.
Vigencia	Jornada máxima semanal
Desde 16-jul-2024	46 horas
Desde 16-jul-2025	44 horas
Desde 16-jul-2026	42 horas
8.2 Recargos — Ley 2466 de 2025 (reforma laboral)
La reforma laboral de 2025 cambió el horario nocturno y aumentó el recargo dominical de forma progresiva. Estos factores deben ser parametrizables por fecha, porque siguen subiendo hasta 2027.
Concepto	Horario / factor	Vigencia
Jornada nocturna	7:00 p.m. a 6:00 a.m.	Desde 25-dic-2025
Recargo nocturno	35% (×0,35)	Vigente
Hora extra diurna	+25% (×1,25)	Vigente
Hora extra nocturna	+75% (×1,75)	Vigente
Recargo dominical/festivo	90% en 2026 (sube a 100% en 2027)	Progresivo
El valor de la hora ordinaria se calcula, por convención, dividiendo el salario mensual entre 240. Con la reducción de jornada de la Ley 2101 este divisor es discutido, por lo que conviene dejarlo parametrizable.
Valor hora ordinaria = Salario mensual ÷ 240
Regla de control: la jornada extra ordinaria no puede exceder 2 horas diarias ni 12 semanales. Superar la jornada máxima (sección 8.1) debe generar una alerta de compliance.
9. Calendario de obligaciones y fechas legales
Estas fechas son fijas y deben generar recordatorios anticipados. Son la base del motor de alertas tempranas (sección 10).
Obligación	Fecha límite	Norma
Intereses a las cesantías	31 de enero	Ley 50/90
Consignación de cesantías al fondo	14 de febrero	Ley 50/90
Prima — primera cuota	30 de junio	art. 306 CST
Prima — segunda cuota	20 de diciembre	art. 306 CST
Dotación (salario ≤ 2 SMMLV)	30 abr · 31 ago · 20 dic	art. 230 CST
Aportes a seguridad social (PILA)	Mensual, según dígito del documento	Ley 100/93
Preaviso de no prórroga (término fijo)	30 días antes del vencimiento	art. 46 CST
Vacaciones	Aviso con 15 días de anticipación	art. 187 CST
10. Alertas tempranas: reglas de negocio
El motor de avisos deriva las alertas automáticamente del estado de cada trabajador. Cada regla tiene un disparador, una condición y una norma de respaldo. Esta es una de las funciones centrales que exige el reto.
Alerta	Condición que la dispara	Norma / base
Vencimiento de contrato	Término fijo con ≤ 30 días para terminar	art. 46 CST
Obligación de seguridad social pendiente	Aporte mensual no registrado	Ley 100/93
Prestación vencida	Intereses/cesantías/prima no pagados tras su fecha	secc. 9
Vacaciones acumuladas	Más de un período (~15 días) sin disfrutar	art. 187 CST
Horas extra por liquidar	Horas extra registradas > 0	Ley 2101/2466
Debido proceso incompleto	Proceso disciplinario con etapas faltantes	SL1706-2024
Documento faltante	Falta un documento requerido por ley	secc. 14
Perfil sin validar	Datos extraídos por IA sin verificación humana	gobernanza (secc. 16)
11. Riesgo de despido: modelo compuesto
El riesgo de despedir no es un solo número: se compone de tres capas que el sistema evalúa por separado y muestra de forma trazable, para que el abogado entienda de dónde sale cada conclusión.
11.1 Costo económico
Es determinista: la indemnización (sección 7) más las prestaciones causadas. Es un costo conocido, no un riesgo en sí mismo.
11.2 Riesgo de nulidad por fuero o estabilidad reforzada
Si el trabajador tiene una protección especial, el despido puede ser declarado nulo y ordenarse el reintegro con salarios dejados de percibir. Basta una sola de estas condiciones para elevar el riesgo a alto.
Protección	Efecto	Norma
Estabilidad reforzada por salud	Requiere autorización del Inspector de Trabajo	art. 26 Ley 361/97 · SU-049/2017
Fuero de maternidad / lactancia	Prohibición de despido; presunción discriminatoria	arts. 239-240 CST
Fuero sindical	Requiere levantamiento judicial del fuero	arts. 405-406 CST
Pre-pensionado (retén social)	Protección por proximidad a la pensión	jurisprudencia C. Constitucional
Denunciante / testigo de acoso	Garantía contra represalias	art. 11 Ley 1010/06
11.3 Riesgo procesal (debido proceso)
Aplica solo al despido con justa causa. Si no se cumplió el debido proceso disciplinario (sección 13), el juez puede declarar el despido injusto. El sistema verifica el cumplimiento de cada etapa como una lista de control.
Norma: art. 115 CST, art. 29 Constitución Política, Sentencia SL1706-2024.
12. Reclasificación laboral (Ley 2466/2025)
Cuando un contrato de prestación de servicios esconde una relación laboral real, un juez puede declarar la existencia de un contrato de trabajo (contrato realidad, art. 23 CST). La Ley 2466 de 2025 introdujo además el concepto de subordinación algorítmica para trabajadores de plataformas.
El sistema evalúa indicios de subordinación como una lista de verificación y produce un puntaje de riesgo. A mayor número de indicios presentes, mayor probabilidad de reclasificación.
Indicios típicos a evaluar:
•	La empresa fija el horario
•	La empresa determina el lugar de trabajo
•	El trabajador recibe órdenes e instrucciones directas
•	Presta servicios de forma exclusiva
•	Usa herramientas o uniforme de la empresa
•	La empresa o la plataforma fija la tarifa
•	La prestación es continua y permanente
•	La asignación o el control se hacen por algoritmo o app
12.1 Contingencia estimada
Si se declara el contrato realidad, la empresa debería pagar de forma retroactiva las prestaciones y los aportes de toda la relación. El sistema lo estima así (es una aproximación, no incluye sanciones ni costas):
Contingencia ≈ Cesantías + Intereses + Prima + Vacaciones (de toda la relación) + Aportes del empleador (~20,5% mensual)
13. Proceso disciplinario y debido proceso
Antes de sancionar o despedir por justa causa, la empresa debe seguir un procedimiento. Omitirlo es la causa más frecuente de demandas que terminan en nulidad del despido. El sistema modela el proceso como una línea de tiempo de etapas y verifica que cada una se cumpla en orden.
13.1 Etapas del proceso
	1. Conocimiento del hecho o queja
	2. Citación a descargos por escrito
	3. Diligencia de descargos (con acta firmada)
	4. Análisis y valoración
	5. Decisión y comunicación de la sanción
	6. Recursos del trabajador / firmeza
13.2 Requisitos de la carta de descargos
Para que sea válida (art. 115 CST y art. 29 CN), la carta que genera el sistema debe contener:
•	Identificación del trabajador
•	Hechos concretos con fecha, modo y lugar
•	Normas del reglamento interno o del contrato presuntamente vulneradas
•	Fecha, hora, lugar y modalidad de la diligencia
•	Mención del derecho a defensa y a estar acompañado por dos representantes del sindicato o dos compañeros
La gravedad de la falta (leve/grave/gravísima) no la define la IA: proviene del reglamento interno de cada empresa cliente, que debe poder cargarse y parametrizarse. La reincidencia es relevante para justificar la proporcionalidad de la sanción.
14. Documentos requeridos por ley
El expediente de cada trabajador debe contener, como mínimo, estos documentos. Su ausencia genera una alerta y afecta el cumplimiento.
•	Contrato de trabajo firmado
•	Manual de funciones
•	Afiliación a EPS (salud)
•	Afiliación a ARL (riesgos laborales)
•	Afiliación a fondo de pensión
•	Afiliación a caja de compensación
•	Examen médico de ingreso
•	Hoja de vida y soportes
Para la prestación de servicios el conjunto es distinto: contrato civil, RUT del contratista, planilla de seguridad social como independiente y hoja de vida.
15. Protección de datos personales (Ley 1581/2012)
LaborApp maneja datos personales y, en varios casos, datos sensibles (salud, incapacidades, antecedentes disciplinarios). Esto impone obligaciones técnicas concretas:
•	Autorización y finalidad: Registrar el consentimiento del titular y la finalidad del tratamiento.
•	Datos sensibles: Salud y expediente disciplinario requieren acceso restringido y justificación reforzada.
•	Derechos del titular: Habilitar acceso, rectificación, actualización y supresión de los datos.
•	Retención: Definir y aplicar una política de cuánto tiempo se conservan los datos.
•	Seguridad y trazabilidad: Cifrado, control de acceso por rol y bitácora de auditoría de cada acción.
16. Validación humana y gobernanza de IA
Por diseño, la IA propone y el humano decide. Esto no es solo una buena práctica: responde a la pregunta de quién responde si el sistema se equivoca y al deber de poder explicar las decisiones asistidas por IA.
•	Confianza visible: cada dato extraído muestra su nivel de confianza y su fuente.
•	Validación obligatoria: ningún documento ni cálculo se da por definitivo sin que RRHH o el abogado lo valide.
•	Trazabilidad: toda acción (validar, generar, enviar) queda en la bitácora con autor y fecha.
•	Cálculo determinista vs. criterio: el sistema automatiza lo calculable; marca para revisión lo que requiere juicio jurídico.
17. Tabla maestra: norma → función del sistema
Norma	Tema	Función del sistema
CST arts. 249, 306, 186; Ley 50/90	Prestaciones sociales	Motor de liquidación
CST art. 64	Indemnización por despido	Cálculo de costo de desvinculación
Ley 2101/2021	Jornada laboral	Compliance de jornada
Ley 2466/2025	Recargos y subordinación algorítmica	Recargos + test de reclasificación
CST art. 115 · CN art. 29 · SL1706-2024	Debido proceso	Carta de descargos + línea de tiempo
CST arts. 239-240, 405-406; Ley 361/97	Fueros / estabilidad reforzada	Riesgo de nulidad del despido
CST art. 23	Contrato realidad	Contingencia por reclasificación
Ley 1581/2012	Datos personales	Acceso por rol, retención y auditoría
18. Supuestos, limitaciones y casos borde
Para evitar malentendidos, el equipo debe tener presente lo que el modelo de cálculo asume y lo que aún no resuelve:
•	Usa el año comercial de 360 días, estándar para liquidaciones; no el año calendario de 365.
•	Asume salario fijo. El salario variable (comisiones, promedios) requiere lógica adicional para el cálculo de la base.
•	La base de cesantías y prima incluye auxilio de transporte; la de vacaciones no. Confundirlas es un error frecuente.
•	Los recargos y la jornada cambian a mitad de 2026 y siguen cambiando hasta 2027: deben ser parametrizables por fecha.
•	La gravedad disciplinaria y la tipificación de faltas dependen del reglamento interno de cada empresa cliente.
•	La contingencia por reclasificación es una estimación; no incluye sanciones, intereses de mora ni costas procesales.
•	Los valores legales (SMMLV, auxilio) se actualizan cada año y deben estar en configuración, no en el código.
19. Referencias normativas
•	Código Sustantivo del Trabajo (CST): arts. 23, 46, 62, 64, 99, 115, 127-128, 186-187, 230, 239-240, 249-252, 306-307, 405-406.
•	Ley 50 de 1990: régimen de cesantías e intereses.
•	Ley 2101 de 2021: reducción progresiva de la jornada a 42 horas.
•	Ley 2466 de 2025: reforma laboral; recargos y subordinación algorítmica.
•	Ley 361 de 1997 y Sentencia SU-049 de 2017: estabilidad laboral reforzada por salud.
•	Ley 1010 de 2006: acoso laboral.
•	Ley 100 de 1993: seguridad social (PILA).
•	Ley 1581 de 2012: protección de datos personales.
•	Sentencia CSJ Sala Laboral SL1706-2024: debido proceso disciplinario.
•	Decretos 1469 y 1470 de 2025: SMMLV y auxilio de transporte 2026.
Este documento es material de trabajo para el desarrollo del prototipo; no constituye concepto jurídico. Las reglas deben validarse con el abogado responsable antes de su uso en producción.
