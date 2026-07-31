# Reporte Semanal de Avance — Old Texas BBQ CRM
**Periodo:** 25 julio – 31 julio 2026
**Entregado por:** Equipo de Desarrollo
**Repositorio:** github.com/pedroduranc1/oldtexasbbq2.0

---

## Resumen Ejecutivo

Esta semana se completó la **Fase 4 — Sistema de Nómina integrado**, incluyendo los servicios, componentes UI, integración con caja, suite de tests automatizados y reglas de seguridad en Firestore. Adicionalmente, se corrigieron seis errores de runtime detectados al usar el módulo en producción con datos reales. Al final de la semana se analizaron los archivos de bitácora del cliente (Excel de nómina real, registro de gastos diarios y bitácora de problemas), lo que permitió definir el backlog de la siguiente iteración con requerimientos concretos.

---

## Entregables de Esta Semana

### 1. Módulo de Nómina — Fase 4 completa

Se implementó desde cero el sistema de nómina integrado con el módulo de caja existente.

**Tipos y base de datos:**
- Nuevos tipos en `lib/types/firestore.ts`: `Empleado`, `Nomina`, `TurnoEmpleado` con enums `CargoEmpleado`, `PeriodoNomina`, `EstadoNomina`, `EstadoEmpleado`
- Nuevas colecciones Firestore: `Empleados`, `Nominas`, `TurnosEmpleado`

**Servicios creados:**
- `lib/services/empleados.service.ts` — CRUD con `getActivos`, `getTodos`, `crear`, `actualizar`, `cambiarEstado`
- `lib/services/nominas.service.ts` — `generarNomina` (calcula `periodoFin` y `totalNeto`), `marcarPagada`, `cancelar`, consultas por empleado y periodo
- `lib/services/integracionCaja.service.ts` — `pagarNomina` registra automáticamente un egreso en el turno activo y marca la nómina como pagada en una sola operación
- `lib/services/turnosEmpleado.service.ts` — `registrarEntrada`, `registrarSalida` (calcula `minutosTrabajados` con soporte nocturno), queries por turno o empleado

**Componentes UI:**
- `components/nomina/ListaEmpleados.tsx` — tabla con búsqueda por nombre/cargo, modal de crear/editar con validaciones, botón toggle activo/inactivo por empleado
- `components/nomina/GeneradorNomina.tsx` — selector de empleado, input de periodo inicio, campos de bonos y descuentos, panel de preview con totalNeto en vivo, lista de nóminas con filtro por empleado o pendientes, acciones de pagar y cancelar

**Ruta:**
- `app/(protected)/nomina/page.tsx` — página con navegación por tabs entre "Empleados" y "Nóminas"
- Ítem de Nómina habilitado en el Sidebar (se quitó la marca `soon: true`)

---

### 2. Testing automatizado — Suite de nómina

Se creó `__tests__/integration/nomina-flow.test.ts` con **14 tests en verde** que cubren los tres flujos principales:

| Bloque | Tests | Qué verifica |
|---|---|---|
| Crear empleado | 4 | Crear, getActivos, cambiarEstado, actualizar |
| Generar nómina | 6 | totalNeto, periodoFin semanal/quincenal/mensual, sin bonos, getPendientes |
| Pagar nómina | 4 | Egreso correcto en caja, sin turno activo, cancelar, consistencia Nómina↔Caja |

El test de consistencia valida que el monto del egreso en `MovimientosCaja` es idéntico al `totalNeto` de la nómina generada.

---

### 3. Reglas de seguridad Firestore

Se identificó que seis colecciones nuevas no tenían reglas y caían en la regla catch-all que bloquea todo, generando `FirebaseError: Missing or insufficient permissions`.

Se agregaron y desplegaron reglas explícitas para: `Empleados`, `Nominas`, `TurnosEmpleado`, `Anticipos`, `FlujoEfectivo`, `Bitacora`.

**Regla aplicada en todos los casos:** solo usuarios autenticados pueden leer y escribir; ningún documento puede eliminarse desde el cliente.

---

### 4. Corrección de seis errores de runtime

Al usar el módulo con datos reales de Firestore se detectaron y corrigieron los siguientes errores:

| Error | Causa | Corrección |
|---|---|---|
| `FirebaseError: Missing or insufficient permissions` | Colecciones sin reglas Firestore | Reglas desplegadas (punto 3) |
| `TypeError: Cannot read properties of undefined (reading 'toLocaleString')` | `salarioBase` ausente en documentos legacy | `(emp.salarioBase ?? 0).toLocaleString()` |
| `Error: A <Select.Item /> must have a value prop that is not an empty string` | `<SelectItem value="">` no permitido por Radix UI | Sentinel `'__pendientes__'` en estado y componente |
| `RangeError: Invalid time value` (1) | `periodoInicio` vacío pasado a `new Date()` | Guard `empleadoSel && periodoInicio` + validación `isNaN` |
| `RangeError: Invalid time value` (2) | `periodoPago` undefined en datos legacy; `switch` sin `default` retornaba `undefined` | Función acepta `PeriodoNomina \| undefined`; caso `default` con cálculo semanal |
| `FirebaseError: Unsupported field value: undefined (found in field notas)` | Campo `notas?: string` enviado como `undefined` a Firestore | Spread condicional `...(notas ? { notas } : {})` en nóminas; `delete clean.notas` en empleados |

Adicionalmente se corrigió el error de input no controlado en `ListaEmpleados.tsx` normalizando todos los campos con fallbacks explícitos en `abrirEditar` para datos legacy.

---

### 5. Análisis de bitácora del cliente — Definición del backlog siguiente

Se analizaron tres archivos enviados por el cliente:
- `202601-01-NOMINA OTB SF.xlsx` — Excel real de nómina semanal
- `Registro de gastos diarios - Julio 2026.xlsx` — catálogo y registro de flujo de efectivo
- `03-Bitacora Problemas_Errores OTB.docx` — problemas y requerimientos operativos

**Hallazgos principales:**

El sistema actual calcula la nómina con un `salarioBase` fijo por periodo. El cliente opera con `salarioDiario × días trabajados` y múltiples conceptos variables (Bono PA, Bono Limpieza, Comisiones, Tiempo Extra, descuento Préstamo, descuento Comida, Faltantes Caja, Fondo Ahorro). Esto requiere un rediseño del modelo de datos.

El registro de gastos usa una jerarquía de catálogo (Concepto → Subcategoría → Categoría) con proveedores, cuentas y responsables definidos. El flujo de efectivo maneja cuatro cuentas: Caja fondo, Caja chica, Banregio débito, Banorte crédito.

El módulo de inventario requiere costeo en cascada por receta (Ingrediente → Subreceta → Platillo) con margen de contribución por producto.

Estos hallazgos se documentaron en el **TODO 2.0.md como Fase 4.5** con tareas concretas para la siguiente semana.

---

## Métricas de Desarrollo

| Métrica | Valor |
|---|---|
| Commits realizados | 6 |
| Archivos nuevos creados | 7 |
| Archivos modificados | 9 |
| Líneas agregadas | +1,812 |
| Líneas eliminadas | -139 |
| Tests nuevos (todos en verde) | 14 |
| Errores de runtime corregidos | 6 |
| Colecciones Firestore con reglas nuevas | 6 |

---

## Estado General de Fases

| Fase | Descripción | Estado |
|---|---|---|
| Fase 1 | Sistema de Caja | ✅ Completa |
| Fase 2 | Inventario | ✅ Completa |
| Fase 3 | Dashboard de Reportes | ✅ Completa |
| Fase 4 | Nómina integrada | ✅ Completa |
| Fase 4.5 | Nómina real (salario diario, asistencia, expediente) | 📋 Planificada |
| Fase 5 | Pulido, testing exhaustivo y Go-Live | ⏳ Pendiente |

---

## Próximos Pasos — Semana del 4 agosto

**Prioridad alta — Fase 4.5:**
1. Extender modelo `Empleado` con `salarioDiario`, `jornada`, `bonoPermanenciaFecha`
2. Extender modelo `Nomina` con todos los conceptos individuales (bonoPA, bonoLimpieza, tiempoExtra, descuentos desglosados)
3. Crear colección `AsistenciaSemanal` y componente `RegistroAsistencia.tsx` con grid L–D (A/D/V/F)
4. Actualizar `generarNomina` para calcular con `salarioDiario × totalDias` en lugar de `salarioBase` fijo
5. Módulo de Préstamos con descuento automático del 10% semanal
6. Expediente completo del empleado (CURP, RFC, NSS, contacto de emergencia)

---

**Fecha del Reporte:** 31 de julio, 2026
**Próxima Revisión:** 7 de agosto, 2026
**Responsable:** Pedro Duran — Old Texas BBQ CRM
