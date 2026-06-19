# Rediseño del perfil del colaborador: Obligaciones, Compliance y Timesheet

Cambios acotados a `src/routes/_app.colaboradores.$id.tsx`, `src/lib/mock/data.ts` y un nuevo store ligero para horas registradas. Se mantiene el estilo actual (Taviraj display, Open Sans body, `bg-card`/`border-border`, `rounded-2xl`, chips `StatusBadge`, banners `LegalWarningBanner`). Todo es mock, sin backend.

## 1. Tabs

En `tabSchema` y el array `tabs`:

- Quitar: `contrato`, `liquidacion`.
- Añadir: `obligaciones`, `timesheet`.
- Orden final: Resumen · Obligaciones · Timesheet · Documentos · Alertas · Disciplinario · Auditoría.
- Borrar los bloques JSX `tab === "contrato"` y `tab === "liquidacion"` (los `Kpi` y helpers de liquidación dejan de usarse; se elimina `Kpi`).

## 2. Tab Nomina y **Obligaciones** (layout 2 columnas en `lg`)

### Columna izquierda — "Obligaciones con el trabajador"

Dos `DossierCard` apiladas.

**Mensuales** (icono `CalendarDays`): filas con `Row` mostrando concepto, monto estimado y dot semáforo según vencimiento del mes en curso (mock):

- Aporte salud (8.5% empleador / 4% empleado, base salario)
- Aporte pensión (12% / 4%)
- Aporte ARL (según `nivelRiesgoARL` mock por área: I 0.522%, II 1.044%, III 2.436%, IV 4.350%, V 6.960%; default II)
- Caja de compensación (4%)
- Pago de nómina (neto = salario − deducciones)

**Anuales / periódicas** (icono `Wallet`):

- Intereses sobre cesantías — vence 31 ene
- Consignación cesantías — vence 14 feb
- Prima primer semestre — vence 30 jun
- Prima segundo semestre — vence 20 dic
- Dotación (tres entregas: 30 abr, 31 ago, 20 dic) — solo se renderiza si `tipoContrato ∈ {indefinido, definido}` y `salario < 2 * SMMLV_2025`. Contenido: "Par de zapatos + vestimenta de labor". Si no aplica, fila informativa "No aplica (>2 SMMLV o contrato no laboral)".

Helpers nuevos en `src/lib/mock/data.ts`: `aportesMensuales(salario)`, `proximaPrima(hoy)`, `aplicaDotacion(emp)`, `proximaDotacion(hoy)`. Sin alterar `Employee` salvo añadir opcional `arlNivel?: 1|2|3|4|5`.

### Columna derecha — "Compliance de jornada · Ley 2101/2021"

Card con la estructura de la imagen, en nuestro estilo:

- Header: "COMPLIANCE DE JORNADA · LEY 2101/2021" en uppercase tracking-wider.
- Fila "Jornada máxima legal 2026" → `42 h/sem · Ley 2101` (chip a la derecha).
- Fila "Valor hora ordinaria" → `formatCOP(salario / 240)`.
- Bloque "Registrar horas trabajadas": inputs `Día` (date), `Horas` (number 0–8, step 0.5), `Tipo de hora` (select), botón `+ Registrar`.
- Tipos de hora con factor:
  - Extra diurna ×1.25
  - Extra nocturna ×1.75
  - Recargo nocturno +35%
  - Recargo dom./festivo +75%
  - Recargo dom./festivo nocturno +110%
  - Extra dom./festivo diurna ×2.00
  - Extra dom./festivo nocturna ×2.50
- Bitácora `REGISTRO DE HORAS`: lista de entradas con día, tag de tipo (color por familia: extra=primary, recargo=warning, dom/fest=rose), horas, monto = `salario/240 * horas * factor` (para extras se paga completo; para recargos solo el sobrecosto: `salario/240 * horas * (factor - 1)`).
- Validación al registrar:
  - Bloquear y `toast.error` si `horas + yaRegistradasMismoDíaExtra > 2` cuando el tipo es "Extra*". Los recargos no cuentan al tope de 2h extra.
  - `toast.success` al registrar; persiste en `localStorage` vía nuevo store `useTimesheet` (`src/lib/timesheet-store.tsx`, contexto liviano siguiendo el patrón de `src/lib/store.tsx`).
- Footer informativo (texto mute, igual a la imagen): "Las horas extra se pagan completas con su factor; los recargos (nocturno/dominical) pagan solo el sobrecosto. Base: salario ÷ 240. Factores según Ley 2466/2025."

## 3. Tab **Timesheet**

Vista tipo Mavenlink/Clockify, mock pero funcional sobre el mismo store.

- Filtros arriba: rango (Últimos 30 días / Mes actual / Año / Personalizado), botón `Exportar CSV` (genera blob, sin red).
- KPIs (3 tarjetas): Horas trabajadas totales (40 h/sem * semanas + extras registradas), Horas extra acumuladas, PTO tomado (de `e.presencia === 'vacaciones'` historial mock + entradas tipo `pto`).
- Heatmap semanal simple (grid 7×N, intensidad por horas/día) usando solo Tailwind, sin libs.
- Tabla cronológica: Fecha · Tipo (Ordinaria / Extra / Recargo / PTO / Permiso / Incapacidad) · Horas · Valor · Origen (Manual / Importado).
- Botón `+ Añadir entrada` reabre el mismo formulario de la card Compliance (componente compartido `RegistrarHorasForm`).
- Banner mute: "Integra con Clockify o Mavenlink para sincronización automática (mock)".

## 4. Limpieza

- Quitar imports no usados (`Kpi`, helpers de liquidación) tras borrar tabs.
- Borrar `tab === "contrato"` y `tab === "liquidacion"` y sus textos.
- Sin cambios en otras rutas/componentes.

## Detalles técnicos

- **SMMLV y auxilio**: ya existe `SMMLV_2025` y `auxilioTransporte` en `data.ts`; reutilizar.
- **Store de horas**: `useTimesheet()` con `entries: TimesheetEntry[]`, `addEntry`, `removeEntry`, persist `localStorage` clave `laborapp.timesheet.v1`. Provider montado en `src/lib/store.tsx` junto al existente para no tocar el root.
- **Tipos de entrada**: `{ id, empleadoId, fecha: ISO, horas, tipo: 'extra_diurna'|'extra_nocturna'|'recargo_nocturno'|'recargo_dom_fest'|'recargo_dom_fest_nocturno'|'extra_dom_fest_diurna'|'extra_dom_fest_nocturna'|'pto'|'permiso'|'incapacidad'|'ordinaria', notas? }`.
- **Cálculo**: factor tabla constante exportada `FACTORES_HORA`. Helper `valorHora(entry, salario)` con regla extra-paga-completo / recargo-paga-sobrecosto.
- **Estilo**: tags con `StatusBadge` (variantes existentes), inputs con clases ya usadas en el form de Nuevo contrato.

## Fuera de alcance

- No se toca Documentos, Alertas, Disciplinario, Auditoría.
- No hay integración real con Clockify/Mavenlink.
- No se recalcula la nómina del listado en `Organización`.