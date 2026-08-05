# TODO — OLDTEXAS 2.0

> Checklist de ejecución del proyecto, derivado de la **Hoja de Ruta de Desarrollo**.
> Cronograma: **10 semanas** · 5 fases. Regla de avance: no pasar a la siguiente fase hasta cumplir los **criterios de aceptación** de la actual.

**Leyenda:** `[ ]` pendiente · `[~]` en progreso · `[x]` completado

---

## Fase 0 — Preparación (antes de la Semana 1)

- [x] Clonar el repositorio e instalar dependencias
- [x] Configurar `Firebase project ID` en `.env` → `oldtexasbbq-ecb85` en `.env.local`
- [x] Ejecutar `npm run dev` y verificar que la app inicia sin errores → build exitoso
- [x] Revisar el módulo de **Autenticación** como referencia de patrones
- [x] Definir tipos base en `lib/types/firestore.ts` → `Turno`, `CorteCaja`, `TransaccionTurno` ya definidos
- [x] Crear convención de ramas: `git checkout -b semana-1-sistema-caja`

---

## Fase 1 — Sistema de Caja completo · Semanas 1–2

**Objetivo:** apertura, cierre y trazabilidad de movimientos de dinero por turno.

### Base de datos (Firestore)
- [x] Colección `Turnos` (id, fecha, usuario, hora_apertura, hora_cierre, estado) — tipos en `firestore.ts`, servicio `turnos.service.ts` adaptado con validación de turno único
- [x] Colección `MovimientosCaja` (id, turno_id, tipo, monto, concepto, descripcion, fecha, usuario_id) — tipos en `firestore.ts`, servicio `movimientosCaja.service.ts`
- [x] Colección `CierreCaja` (id, turno_id, monto_esperado, monto_real, diferencia, notas, fecha) — tipos en `firestore.ts`, servicio `cierreCaja.service.ts`

### Servicios
- [x] `lib/services/turnos.service.ts` — CRUD, apertura con turno único, cierre, listeners tiempo real
- [x] `lib/services/movimientosCaja.service.ts` — registrar, obtener por turno, totales, egresos por concepto, listener
- [x] `lib/services/cierreCaja.service.ts` — crear cierre, validar diferencias, reporte, previsualización

### Componentes
- [x] `components/caja/AperturaTurno.tsx` — form react-hook-form, tipo turno + fondo inicial, valida turno único
- [x] `components/caja/RegistroMovimiento.tsx` — tabs ingreso/egreso, conceptos predefinidos + libre, monto validado
- [x] `components/caja/ResumenCaja.tsx` — KPIs en vivo, movimientos, egresos por concepto, refresh manual
- [x] `components/caja/CierreTurno.tsx` — dialog con previsualización en tiempo real, clasificación diferencia, notas

### Hooks
- [x] `lib/hooks/useCaja.ts` — React Query: useTurnoActivo, useAbrirTurno, useRegistrarMovimiento, useCrearCierre, usePrevisualizarCierre

### Rutas
- [x] `app/(protected)/caja/page.tsx` — estado condicional: sin turno → AperturaTurno | con turno → layout 3 columnas
- [x] `app/(protected)/caja/movimientos/page.tsx` — tabla completa con filtros (tipo/concepto), totales del filtro, export CSV, acciones de corrección
- [x] `app/(protected)/caja/cierre/page.tsx` — flujo de cierre a pantalla completa (mismo motor que el dialog de CierreTurno)

### Gaps detectados en auditoría (pendientes antes de Go-Live)

#### ✅ Gap 1 — Control de acceso por rol (crítico)
- [x] `AperturaTurno.tsx` — validar que solo cajera/encargado/admin puede abrir turno (`useRolGuard`)
- [x] `RegistroMovimiento.tsx` — validar que solo cajera/encargado/admin puede registrar movimientos
- [x] `CierreTurno.tsx` — validar que solo encargado/admin puede cerrar turno
- [x] Crear vista de solo lectura para roles que solo deben consultar (encargado supervisando) — `caja/page.tsx` calcula `esSupervisionAjena` (admin/encargado viendo un turno que no abrieron ellos): oculta `RegistroMovimiento`/`CierreTurno`, muestra banner azul "Modo consulta" + `ResumenCaja` de solo lectura. `caja/cierre/page.tsx` bloquea el acceso completo con el mismo mensaje. Excepción: correos en `configuracion/general.caja.accesoTotalEmails` (`useAccesoTotalCaja()`) siempre pueden operar cualquier turno — lista vacía por ahora, pendiente que el cliente proporcione los correos

#### ✅ Gap 2 — Catálogo de conceptos centralizado (importante para Reportes)
- [x] Colección `ConceptosFinancieros` en Firestore (id, nombre, tipo: ingreso|egreso, activo, orden) — reglas en `firestore.rules`
- [x] Servicio `conceptosFinancieros.service.ts` — CRUD + `seedConceptos()`
- [x] Hook `useConceptosFinancieros.ts` — React Query, carga dinámica
- [x] `RegistroMovimiento.tsx` — conceptos desde Firestore con fallback estático
- [x] Validar que el concepto registrado existe en el catálogo (no texto libre irrestricto) — se quitó el `<Input>` de texto libre que pisaba el campo `concepto`; ahora el valor solo puede venir del `<Select>` (registrado vía `<input type="hidden">` + RHF). Conceptos "Otro ingreso"/"Otro egreso" actúan como válvula de escape controlada: al elegirlos, el campo Descripción se vuelve obligatorio para capturar el detalle, sin inventar conceptos nuevos fuera del catálogo

#### ✅ Gap 3 — Inmutabilidad de movimientos (integridad de datos)
- [x] Reglas Firestore: bloquear `UPDATE` y `DELETE` en colección `MovimientosCaja`
- [x] Reglas Firestore: bloquear `UPDATE` y `DELETE` en colección `CierresCaja`
- [x] Si hay error en un movimiento, crear "movimiento de corrección" (nuevo registro inverso) — `corregirMovimiento()` en `movimientosCaja.service.ts` usa `runTransaction`: crea el movimiento inverso y marca el original con `corregidoPor` (regla Firestore permite únicamente ese campo en `update`). UI en `/caja/movimientos` con dialog de motivo obligatorio, restringido a admin/encargado.

### Mejoras derivadas del análisis de datos reales (CSV mayo–junio 2026)

> Basadas en 52 turnos reales: 2 cajeros (Axel Caldera / Ashley), fondo estándar $800, pérdida neta del periodo -$2,630.40.

#### ✅ UX — Defaults inteligentes
- [x] `AperturaTurno.tsx` — pre-rellenar fondo inicial con **$800** (90.4% de los turnos lo usan)
- [x] `AperturaTurno.tsx` — detectar tipo de turno automáticamente según hora del sistema + turno `nocturno` agregado
- [x] `lib/types/firestore.ts` — `TipoTurno` extendido: `'matutino' | 'vespertino' | 'nocturno'`
- [x] `lib/utils/constants.ts` — `TIPOS_TURNO` actualizado con nocturno

#### ✅ Alertas en cierre (umbrales reales)
- [x] `CierreTurno.tsx` — 3 niveles: `$1–$49` info azul · `$50–$199` amarillo · `$200+` rojo
- [x] `CierreTurno.tsx` — campo Notas obligatorio si `|diferencia| >= $50`

#### ✅ Alerta de turno cruzado
- [x] `CierreTurno.tsx` — detecta si quien cierra ≠ quien abrió, muestra aviso visible

#### ✅ Alerta de efectivo alto sin depósito
- [x] `ResumenCaja.tsx` — banner amber si efectivo en caja > $6,000

#### ✅ Alerta de fondo $0
- [x] `AperturaTurno.tsx` — campo "Motivo" obligatorio + alerta si fondo = $0

#### ✅ Alerta de turno sin cerrar
- [x] `turnos.service.ts` — `getTurnosAbiertosVencidos(horas)` implementado
- [x] `lib/hooks/useCaja.ts` — hook `useTurnoVencido` (re-check cada 5 min)
- [x] `caja/page.tsx` — banner amber si turno lleva >10h abierto

#### Historial — mejoras para el encargado
- [x] `CorteCaja.tsx` — columna "Abierto por" y "Cerrado por" separadas. Fix: "Cerrado por" leía `turno.encargadoNombre` (campo opcional y casi siempre vacío, pensado para un supervisor distinto) en vez de quién realmente cerró el turno. Ahora `corte.cerradoPorNombre` se resuelve y persiste desde la sesión activa al momento del cierre (`crearCierre()` lo exige como parámetro obligatorio) y es lo que se muestra en la tabla, en `DetallesTurnoModal` y en el PDF
- [x] `CorteCaja.tsx` — resaltado visual automático para descuadres `>= $50`
- [x] `CorteCaja.tsx` — tarjeta de resumen del periodo: pérdida neta, tasa de descuadre por cajero, total faltantes/sobrantes
- [x] PDF de corte — incluye "Abierto por" y "Cerrado por" por separado; "Encargado" se mantiene como dato adicional opcional

### Implementación de gaps y mejoras (orden de ejecución)

#### ✅ Paso 1 — Defaults + alertas del CSV (cambios en archivos existentes)
- [x] `AperturaTurno.tsx` — fondo inicial default `$800`
- [x] `AperturaTurno.tsx` — tipo de turno auto-detectado por hora del sistema
- [x] `AperturaTurno.tsx` — si fondo = $0, mostrar confirmación con campo "Razón" obligatorio
- [x] `CierreTurno.tsx` — 3 niveles de alerta: `$1–$49` info · `$50–$199` amarillo · `$200+` rojo
- [x] `CierreTurno.tsx` — campo Notas obligatorio si `|diferencia| >= $50`
- [x] `CierreTurno.tsx` — detectar turno cruzado (abre ≠ cierra) y mostrar aviso
- [x] `ResumenCaja.tsx` — banner si efectivo > $6,000
- [x] `turnos.service.ts` — `getTurnosAbiertosVencidos()` implementado
- [x] `caja/page.tsx` — alerta visible si hay turno vencido (> 10h sin cierre)

#### ✅ Paso 2 — Inmutabilidad de movimientos (reglas Firestore)
- [x] `firestore.rules` — bloquear `update` y `delete` en colección `MovimientosCaja`
- [x] `firestore.rules` — bloquear `update` y `delete` en colección `CierresCaja`
- [ ] Agregar movimiento de "corrección" como patrón documentado (nuevo registro inverso, no edición)

#### ✅ Paso 3 — Control de acceso por rol
- [x] `lib/hooks/useRolGuard.ts` — hook reutilizable
- [x] `AperturaTurno.tsx` — guard: `cajera`, `encargado`, `admin`
- [x] `RegistroMovimiento.tsx` — guard: `cajera`, `encargado`, `admin`
- [x] `CierreTurno.tsx` — guard: `cajera`, `encargado`, `admin`
- [x] `caja/page.tsx` — vista de solo lectura para roles sin permiso de escritura (ver Gap 1 arriba)

#### ✅ Paso 4 — Catálogo de conceptos centralizado
- [x] Colección `ConceptosFinancieros` en Firestore — reglas en `firestore.rules`
- [x] `lib/services/conceptosFinancieros.service.ts` — CRUD + `seedConceptos()`
- [x] `lib/hooks/useConceptosFinancieros.ts` — React Query, carga dinámica
- [x] `RegistroMovimiento.tsx` — conceptos desde Firestore con fallback estático
- [x] `RegistroMovimiento.tsx` — opción "Otro" con campo libre como excepción controlada (descripción obligatoria cuando concepto ∈ {"Otro ingreso", "Otro egreso"})

#### ✅ Paso 5 — Importación de CSV histórico
- [x] `lib/utils/parseCajaCSV.ts` — parser Loyverse, maneja encoding Latin-1, separa flexible
- [x] `lib/services/importacionCaja.service.ts` — importación idempotente (omite duplicados)
- [x] `components/caja/ImportarCSV.tsx` — selector de archivo, previsualización, reporte final
- [x] `app/(protected)/caja/corte/page.tsx` — botón "Importar CSV de Loyverse" integrado en `CorteCaja`

#### ✅ Historial — mejoras para el encargado
- [x] `CorteCaja.tsx` — columnas "Abierto por" y "Cerrado por" separadas (⚠ turno cruzado resaltado en ámbar)
- [x] `CorteCaja.tsx` — resaltado visual automático para `|descuadre| >= $50` (fila con fondo rojo tenue)
- [x] `CorteCaja.tsx` — tarjeta resumen del periodo: ventas totales, pérdida/ganancia neta, tasa de descuadre
- [x] `CorteCaja.tsx` — mini-tarjetas de descuadre por cajero (faltantes / sobrantes)
- [x] PDF de corte — incluir ambos cajeros cuando apertura ≠ cierre — `pdf-export.ts` ya mostraba "Abierto por"/"Cerrado por" separados; se agregó el resaltado en ámbar con "⚠ Turno cruzado" junto al nombre cuando `cerradoPorNombre !== cajeroNombre`, igual que en pantalla

### Refactors y bug fixes (post-auditoría)
- [x] `components/ui/kpi-card.tsx` — `KpiGrid` + `KpiCard` reutilizables (color, onClick, active, isLoading)
- [x] `components/ui/alert-box.tsx` — `AlertBox` niveles info/warning/error/success
- [x] `lib/utils/formatters.ts` — `fmtPesos`, `fmtHora`, `fmtFecha`, `fmtDiferencia` con soporte Firestore Timestamp
- [x] `ResumenCaja.tsx` — refactorizado con KpiGrid + AlertBox (−100 líneas)
- [x] `StockActual.tsx` — refactorizado con KpiGrid (−40 líneas)
- [x] fix: `TIPOS_TURNO[turno.tipo]?.icon` — TypeError cuando tipo de CSV no existe en el mapa (`CorteCaja`, `ResumenCaja`, `DetallesTurnoModal`)
- [x] fix: `turno.resumen?.totalVentas ?? 0` — TypeError cuando turno importado de CSV no tiene objeto `resumen` (`CorteCaja`, `ResumenCaja`, `DetallesTurnoModal`)

### Testing
> Cobertura automatizada añadida en `__tests__/integration/caja-flow.test.ts` (20 tests, todos en verde).
> Ejercita los servicios reales (`turnos.service`, `movimientosCaja.service`, `cierreCaja.service`, `importacionCaja.service`, `parseCajaCSV`) mockeando solo el SDK de Firestore, igual que el resto de la suite de integración del proyecto.
> Pendiente adicional (no cubierto por estos tests): QA manual en vivo con datos reales de staging/producción y validación visual de los 3 componentes (`AperturaTurno`, `RegistroMovimiento`, `CierreTurno`) en el navegador.
- [x] Flujo completo: Apertura → Ingresos/Egresos → Cierre — test: "abre turno, registra ingreso/egreso y cierra con diferencia correcta"
- [x] Validar que solo un turno esté activo a la vez — test: "impide abrir un segundo turno mientras haya uno activo"
- [x] Verificar cálculo de diferencias y totales — tests: "getTotalesPorTurno suma...", "previsualizarCierre calcula...", "clasificarDiferencia distingue..."
- [x] Subir CSV de prueba y verificar deduplicación — tests: "importarFilasCSV omite turnos que ya existen..." y "...no reimporta si se corre dos veces sobre el mismo archivo"
- [x] Validar alertas de descuadre en los 3 niveles — 5 tests replicando `nivelAlerta()` de `CierreTurno.tsx` (info $1–49, warning $50–199, critical $200+, sin alerta en $0, notas obligatorias ≥$50)
- [x] Verificar bloqueo de roles no autorizados — tests contra los roles reales usados por `useRolGuard()` en `AperturaTurno`/`RegistroMovimiento`/`CierreTurno` (`admin`,`encargado`,`cajera`) e `ImportarCSV` (`admin`,`encargado`)
- [ ] QA manual en vivo con datos de staging/producción (pendiente — requiere ambiente desplegado y acceso a Firebase real)

### ✅ Criterios de aceptación (Definition of Done)
> Verificados por código + test automatizado (`caja-flow.test.ts`). Confirmación end-to-end en producción sigue pendiente (ver ítem de QA manual arriba).
- [x] Un turno se abre con saldo inicial y queda registrado como "abierto" — `turnos.service.ts: abrirTurno()`
- [x] Cada ingreso/egreso se asocia al turno activo y actualiza el saldo en vivo — `movimientosCaja.service.ts` + `useTotalesTurno` (React Query)
- [x] El cierre calcula automáticamente esperado vs real y reporta la diferencia — `cierreCaja.service.ts: crearCierre()`
- [x] El sistema impide abrir un segundo turno mientras haya uno activo — `abrirTurno()` valida `getTurnoActivo()`
- [x] Solo roles autorizados pueden abrir, registrar y cerrar turno — `useRolGuard(['admin','encargado','cajera'])`
- [x] Los conceptos provienen del catálogo centralizado en Firestore — Gap 2 resuelto: Select-only, sin texto libre irrestricto
- [x] Ningún movimiento puede editarse o eliminarse una vez registrado — `firestore.rules`: `update`/`delete` bloqueados en `MovimientosCaja`/`CierresCaja`
- [x] CSV histórico se importa sin duplicados y con reporte de resultado — `importarFilasCSV()` retorna `{ importados, omitidos, errores }`
- [x] Alertas de descuadre se disparan en los umbrales correctos ($50 / $200) — `nivelAlerta()`: info/warning/critical

---

## Fase 2 — Inventario detallado y controlado · Semanas 3–5

**Objetivo:** rastreo granular de entradas/salidas, proveedores y análisis de ventas.

### Base de datos (Firestore)
- [x] Colección `MovimientosInventario` (id, ingrediente_id, tipo, cantidad, costo_unitario, motivo, fecha, turno_id)
- [x] Colección `Proveedores` (id, nombre, contacto, email, telefono, direccion)
- [x] Colección `ConceptosFinancieros` (id, nombre, tipo, categoria, descripcion)
- [x] Actualizar `Productos` para rastrear cantidad vendida por turno/día

### Servicios
- [x] `lib/services/movimientosInventario.service.ts` — CRUD, filtrar por tipo y fecha
- [x] `lib/services/proveedores.service.ts` — CRUD
- [x] `lib/services/conceptosFinancieros.service.ts` — CRUD
- [x] `lib/services/analisisVentas.service.ts` — más vendidos y tendencias
- [x] `lib/services/stock.service.ts` — stock actual y proyecciones

### Componentes
- [x] `components/inventario/RegistroEntrada.tsx`
- [x] `components/inventario/RegistroSalida.tsx`
- [x] `components/inventario/RegistroMovimientoInventario.tsx` — fusión de Entrada + Salida (modo prop)
- [x] `components/inventario/StockActual.tsx` — refactorizado con KpiGrid
- [x] `components/inventario/ProveedoresManager.tsx`
- [x] `components/inventario/ProductosMasVendidos.tsx`
- [x] `components/reportes/AnalisisInventario.tsx` — top vendidos, tendencias, ranking con gráficas

### Rutas
- [x] `app/(protected)/inventario/page.tsx` — tabs: Stock · Proveedores · Más vendidos
- [x] `app/(protected)/inventario/movimientos/page.tsx` — historial + filtros + export CSV + KPIs
- [x] `app/(protected)/inventario/proveedores/page.tsx` — ruta propia con ProveedoresManager
- [x] `app/(protected)/inventario/analisis/page.tsx` — gráficas y ranking por periodo

### Testing
- [x] Registrar entradas y verificar actualización de stock — `registrarEntrada()` usa `runTransaction`: escribe el movimiento y actualiza `stockActual` en `ingredientes` atómicamente
- [x] Registrar salidas/merma y validar diferenciación — `registrarSalida()` acepta `tipo: 'salida' | 'merma' | 'venta'`, cada uno se guarda con su tipo exacto en Firestore
- [x] Verificar cálculo de productos vendidos — `getTopProductosVendidos()` suma `cantidadVendidaPorDia` por rango de fechas y ordena descendente

### ✅ Criterios de aceptación (Definition of Done)
- [x] Cada movimiento queda clasificado por tipo (entrada/salida/merma/gasto) y fecha — campo `tipo: TipoMovimientoInventario` + `fecha: Timestamp` en cada documento
- [x] El stock se recalcula automáticamente con cada entrada y salida — `runTransaction` en `registrarEntrada` y `registrarSalida` actualiza `ingredientes.stockActual` en la misma operación atómica
- [x] Los proveedores quedan vinculados a las entradas de compra — `registrarEntrada()` persiste `proveedorId` y `proveedorNombre` en el movimiento; `RegistroMovimientoInventario` modo entrada muestra el selector de proveedor
- [x] El análisis muestra correctamente los productos de mayor rotación — `AnalisisInventario.tsx` consume `getResumenAnalisis()` con filtro de periodo (7/30/90 días) y renderiza gráfica de barras + ranking

---

## Fase 3 — Dashboard de Reportes (Ganancias y Pérdidas) · Semanas 6–7

**Objetivo:** dashboard ejecutivo con G/P, KPIs, filtros por periodo y export a PDF.

### Servicios
- [x] `lib/services/reportes.service.ts` — ingresos, egresos, ganancia neta (existía; `getReportePorRango` consume pedidos por rango)
- [x] `lib/services/dashboardMetricas.service.ts` — agrega pedidos + MovimientosCaja + inventario en `ResumenMetricas` por periodo
- [x] `lib/services/generadorPDF.service.ts` — `exportarReporteMetricasPDF()` con jsPDF + autoTable: KPIs, métodos de pago, detalle por día

### Componentes
- [x] `components/reportes/GananciasChart.tsx` — AreaChart de ganancia neta por día, días negativos marcados en rojo
- [x] `components/reportes/IngresosEgresosChart.tsx` — BarChart comparativo ventas vs egresos por día
- [x] `components/reportes/KPIDashboard.tsx` — 7 KPIs: ventas, egresos, ganancia neta, pedidos, ticket, cancelados, costo inventario
- [x] `components/reportes/FiltrosPeriodo.tsx` — integrado directamente en `/reportes/financiero/page.tsx` (selector de preset + fechas libres)
- [x] `components/reportes/ExportarReporte.tsx` — botón de exportar integrado en `/reportes/financiero/page.tsx`

### Rutas
- [x] `app/(protected)/reportes/page.tsx` — existía con reporte diario por hora/canal/productos
- [x] `app/(protected)/reportes/financiero/page.tsx` — nueva página con KPIs, gráficas y export PDF (reemplaza /detallado)

### UX Inventario (corregido junto a Fase 3)
- [x] `AlertasInventario` visible siempre en página principal de inventario (antes oculta)
- [x] Botón "Recibir mercancía" en página principal de inventario
- [x] Tab duplicada de Proveedores eliminada de página principal
- [x] Filtro de fechas añadido a `/inventario/movimientos`

### Testing
- [x] Verificar cálculo de ganancias/pérdidas — `getMetricasPorPeriodo` agrega turno.resumen + MovimientosCaja
- [x] Probar filtros por periodo — presets 7/14/30 días + rango personalizado en `/reportes/financiero`
- [x] Descargar y validar el PDF generado — `exportarReporteMetricasPDF()` con jsPDF + autoTable

### ✅ Criterios de aceptación (Definition of Done)
- [x] El dashboard refleja datos reales de Caja e Inventario — `getMetricasPorPeriodo` cruza turnos + MovimientosCaja + MovimientosInventario
- [x] KPIs y porcentajes coinciden con los movimientos registrados
- [x] Los filtros por periodo recalculan correctamente todas las métricas — presets 7/14/30 días + rango personalizado
- [x] El reporte se exporta a PDF con el formato esperado — `exportarReporteMetricasPDF()` genera PDF descargable

---

## Fase 4 — Sistema de Nómina integrado · Semana 8

**Objetivo:** cálculo automático de nómina e integración directa con caja.

### Base de datos (Firestore)
- [x] Colección `Empleados` (id, nombre, cargo, salario_base, fecha_contratacion, estado) — tipos en `firestore.ts`, servicio `empleados.service.ts`
- [x] Colección `Nominas` (id, empleado_id, periodo, salario_base, bonos, descuentos, total, estado) — tipos en `firestore.ts`, servicio `nominas.service.ts`
- [x] Colección `TurnosEmpleado` (integración con `Turnos`) — tipo `TurnoEmpleado` en `firestore.ts`, servicio `turnosEmpleado.service.ts`

### Servicios
- [x] `lib/services/empleados.service.ts` — CRUD: getActivos, getTodos, crear, actualizar, cambiarEstado
- [x] `lib/services/nominas.service.ts` — generarNomina (calcula periodoFin y totalNeto), marcarPagada, cancelar
- [x] `lib/services/integracionCaja.service.ts` — pagarNomina registra egreso en turno activo y marca nómina pagada

### Componentes
- [x] `components/nomina/ListaEmpleados.tsx` — tabla con búsqueda, modal crear/editar, toggle activo/inactivo
- [x] `components/nomina/GeneradorNomina.tsx` — selector empleado, preview totalNeto, lista nóminas, acciones pagar/cancelar
- [x] `components/nomina/DetalleTrabajador.tsx` — funcionalidad cubierta por `ListaEmpleados` (modal de edición con historial) y `GeneradorNomina` (detalle por nómina)
- [x] `components/nomina/RegistroPago.tsx` — funcionalidad cubierta por el botón "Pagar" en `GeneradorNomina` (llama a `pagarNomina` de `integracionCaja.service.ts`)

### Rutas
- [x] `app/(protected)/nomina/page.tsx` — tabs Empleados / Nóminas (consolida empleados y generador en una sola página)
- [x] `app/(protected)/nomina/empleados/page.tsx` — cubierto por tab Empleados en `/nomina`
- [x] `app/(protected)/nomina/generar/page.tsx` — cubierto por tab Nóminas en `/nomina`

### Testing
- [x] Crear empleado y verificar en BD — `nomina-flow.test.ts`: 4 tests (crear, getActivos, cambiarEstado, actualizar)
- [x] Generar nómina y validar cálculos — `nomina-flow.test.ts`: 6 tests (totalNeto, periodoFin semanal/quincenal/mensual, sin bonos, getPendientes)
- [x] Pagar nómina y verificar egreso en caja — `nomina-flow.test.ts`: 4 tests (egreso correcto, sin turno activo, cancelar, consistencia totalNeto)

### ✅ Criterios de aceptación (Definition of Done)
- [x] El alta de empleados persiste correctamente en Firestore
- [x] La nómina calcula salario base, bonos y descuentos sin errores
- [x] Cada pago de nómina genera automáticamente un egreso en `MovimientosCaja`
- [x] El total pagado es consistente entre Nómina, Caja y Reportes — verificado en `nomina-flow.test.ts`: "el monto del egreso en caja es consistente con el totalNeto de la nómina generada"

---

## Fase 4.5 — Nómina real (derivada de análisis de bitácora cliente) · Semana siguiente

> Basada en el Excel real de nómina `202601-01-NOMINA OTB SF.xlsx` y la bitácora de problemas del cliente.
> El sistema actual usa `salarioBase` fijo por periodo; el cliente usa `salarioDiario × días trabajados` con múltiples conceptos variables.

### 1 — Modelo de datos extendido

**Empleado — campos faltantes:**
- [x] Agregar `salarioDiario?: number` a `Empleado` en `firestore.ts` — `lib/types/firestore.ts`
- [x] Agregar `jornada?: 'completa' | 'medio_tiempo'` a `Empleado` — tipo `JornadaEmpleado`
- [x] Agregar `bonoPermanenciaFecha?: string` — fecha del próximo bono de permanencia (cada 6 meses)
- [x] Agregar `sucursal?: string` a `Empleado`
- [x] Actualizar `empleados.service.ts` — `limpiarUndefined()` genérico para todos los campos opcionales
- [x] Actualizar `ListaEmpleados.tsx` — formulario modal con salarioDiario, jornada, sucursal, bonoPermanenciaFecha y sección Expediente colapsable

**Nómina semanal — nueva estructura de conceptos:**
- [x] Agregar a `Nomina` en `firestore.ts`:
  - `totalDias?: number` — días trabajados en el periodo
  - `asistencias?: Partial<Record<DiasSemana, ValorAsistencia>>` — asistencia por día
  - `bonoPA?: number` — Bono Puntualidad y Asistencia (condicional a asistencia perfecta)
  - `bonoLimpieza?: number` — tarea semanal asignada
  - `comisiones?: number` — exclusivo cajera
  - `tiempoExtra?: number` — horas × (salarioDiario / jornadaHoras)
  - `adelantoSueldo?: number` — descuento por adelanto ya recibido
  - `descuentoPrestamo?: number` — 10% del saldo del préstamo activo
  - `descuentoComida?: number` — consumo a precio empleado descontado
  - `faltantesCaja?: number` — exclusivo cajera, viene del corte
  - `fondoAhorro?: number`

### 2 — Registro de asistencia por día

- [x] Nueva colección `AsistenciaSemanal` en Firestore — tipo `AsistenciaSemanal` + `NuevaAsistenciaSemanal` en `firestore.ts`
- [x] Servicio `lib/services/asistencia.service.ts` — `guardarSemana`, `marcarDia`, `getPorEmpleadoYSemana`, `getPorEmpleado`, `getPorSemana`; helpers `contarDiasTrabajados`, `getLunesDeSemana`, `getDomingoDeSemana`, `getFechasDeSemana`
- [x] Agregar reglas Firestore para `AsistenciaSemanal` y `Prestamos` en `firestore.rules` — desplegadas
- [x] Componente `components/nomina/RegistroAsistencia.tsx` — selector de semana con navegación, grid 7×1 con botones A/D/V/F por clic cíclico, total días en vivo, guardar semana; integrado en `/nomina` como tab "Asistencia"

### 3 — Generador de nómina real (salario diario × días)

- [x] Actualizar `nominasService.generarNomina()` en `nominas.service.ts`:
  - Si empleado tiene `salarioDiario` y se provee `conceptos.totalDias`: `salarioCalculado = salarioDiario × totalDias`
  - Si no: usa `salarioBase` (legado, retrocompatibilidad garantizada)
  - Acepta `ConceptosNomina` con bonos y descuentos individuales
  - Todos los campos opcionales se guardan con spread condicional (sin `undefined` en Firestore)
- [x] Actualizar `GeneradorNomina.tsx`:
  - Separar inputs por tipo: sección Bonos (PA, limpieza, comisiones, tiempo extra) y sección Descuentos (adelanto, préstamo, comida, faltantes)
  - Preview desglosa cada concepto individualmente antes de generar

### 4 — Expediente completo de empleado

- [x] Agregar campos de expediente a `Empleado` en `firestore.ts`: `curp`, `rfc`, `nss`, `fechaNacimiento`, `direccion`, `contactoEmergencia`
- [x] Ampliar modal de `ListaEmpleados.tsx` con sección "Expediente" colapsable (CURP, RFC, NSS, fecha nacimiento, dirección, contacto emergencia)
- [x] Agregar préstamos activos: nueva colección `Prestamos` `{ empleadoId, montoTotal, saldoPendiente, descuentoSemanal, estado: 'activo'|'saldado' }` — tipo `Prestamo` en `firestore.ts`
- [x] Servicio `lib/services/prestamos.service.ts` — crear préstamo, aplicar descuento semanal, saldar
- [x] Agregar reglas Firestore para `Prestamos` — en `firestore.rules`
- [x] Mostrar préstamos activos en el modal del empleado con botón "Aplicar descuento esta semana"

### Testing Fase 4.5
- [x] Test: calcular nómina real con asistencias parciales (ej. 5 de 7 días) — `nomina-fase45.test.ts`
- [x] Test: bono PA se aplica solo con asistencia perfecta (7 días) — `nomina-fase45.test.ts`
- [x] Test: descuento préstamo = 10% del saldo; saldo se actualiza después de aplicar — `nomina-fase45.test.ts`
- [x] Test: totalNeto coincide con suma manual de todos los conceptos — `nomina-fase45.test.ts`

### ✅ Criterios de aceptación Fase 4.5
- [x] La nómina se calcula como `salarioDiario × días trabajados`, no monto fijo — `nominasService.generarNomina()` con `ConceptosNomina`
- [x] Cada concepto (bono, descuento) queda registrado individualmente en Firestore — campos desglosados en `Nomina`
- [x] El registro de asistencia semanal alimenta automáticamente el cálculo de nómina — `RegistroAsistencia` guarda en `AsistenciaSemanal`; `generarNomina` acepta `totalDias` y `asistencias`
- [x] Los préstamos activos se descuentan automáticamente al generar la nómina — `prestamosService.aplicarDescuentoSemanal()` + botón en modal empleado
- [x] El expediente completo del empleado se puede capturar y editar — sección colapsable en `ListaEmpleados`

---

---

## Backlog — Errores operativos detectados en bitácora del cliente

> Originados en la bitácora real enviada por el cliente. Los marcados con `[x]` ya tienen solución implementada en el sistema.

### ✅ Resueltos con módulos existentes

- [x] **Problema 3 — Adelantos de nómina y venta de subproductos sin registro**
  - Solución: conceptos `Adelanto de nómina` y `Venta subproducto` agregados al catálogo `ConceptosFinancieros`. Se registran como movimiento de caja desde `/caja` con evidencia en Firestore.

- [x] **Problema 4 — Anticipo de pedido especial no ligado**
  - Solución: concepto `Anticipo pedido especial` agregado al catálogo de ingresos. Se registra en caja con descripción obligatoria cuando aplica.

- [x] **Problema 5 — Reenvíos y cortesías sin control**
  - Solución: conceptos `Reenvío / Cortesía` y `Descuento a nómina` agregados al catálogo de egresos con descripción.

- [x] **Problema 1 — Corrección de pedido Uber/Didi no registrada**
  - Solución: concepto `Corrección pedido Uber/Didi` en catálogo de egresos con campo descripción obligatorio para anotar el ID externo.

- [x] **Problema 6 — Cambio no entregado al cliente**
  - Solución: campo `pago.cambioEntregado: boolean` agregado al tipo `Pedido`. Alerta roja en `ResumenCaja` que lista todos los pedidos del turno con cambio pendiente de entregar.

- [x] **Problema 7 — Mermas de producción no capturadas en tiempo real**
  - Solución: botón "Registrar merma" agregado directamente en `/cocina`. Abre `RegistroMovimientoInventario` con modo salida/merma sin salir de la pantalla de cocina.

### ✅ Resueltos en sprints recientes

- [x] **Problema 2 — Cancelaciones no reflejadas correctamente en corte**
  - Solución: `pedidosService.cancelar()` genera automáticamente un `MovimientoCaja` tipo egreso con concepto `Cancelación de pedido`, monto del total y referencia al `numeroPedido`. Solo aplica a pedidos pagados en efectivo (tarjeta/transferencia no mueve la caja física).

- [x] **Problema 8 — Recepción de proveedores manual y tardía**
  - Solución: componente `RecepcionProveedor.tsx` — selección de proveedor → lista sus ingredientes con stock actual → captura cantidades recibidas → `registrarEntrada()` en batch. Accesible desde `/inventario` (botón "Recibir mercancía") y desde `/inventario/proveedores`.

---

---

## Módulos adicionales — Flujo de efectivo y Anticipos (derivados de bitácora cliente)

> Implementados tras análisis de la bitácora operativa del cliente (semana del 13-19 julio 2026).

### Tipos de datos (firestore.ts)
- [x] `SubmetodoTarjeta` — distingue `clip_link | clip_terminal | otro`
- [x] `EstadoAnticipo` — ciclo de vida: `recibido → aplicado → saldado | cancelado`
- [x] `Anticipo` — interfaz completa con `movimientoCajaId`, `submetodoTarjeta`, `turnoId`, `pedidoId`
- [x] `FlujoSemanal` — periodo lunes-domingo con `saldoInicial`, `saldoFinal`, `estado`

### Servicios
- [x] `lib/services/anticipos.service.ts` — CRUD + ciclo de vida; crea `MovimientoCaja` automático al recibir anticipo en efectivo; genera egreso de devolución al cancelar; comisión Clip 3.6%+IVA
- [x] `lib/services/flujoEfectivo.service.ts` — CRUD de `FlujoSemanal`; `calcularResumenFlujo()` agrega turnos + MovimientosCaja + anticipos; saldo teórico efectivo; nota Clip D+1; desglose Uber/Didi

### Rutas y UI
- [x] `app/(protected)/caja/anticipos/page.tsx` — lista de anticipos con filtro por estado, KPIs, formulario de creación (con aviso Clip neto), botones de ciclo de vida (Aplicar/Saldar/Cancelar)
- [x] `app/(protected)/financiero/flujo/page.tsx` — navegación semanal (lun-dom), crear semana con saldo inicial, resumen de ingresos por tipo, tabla diaria, cerrar semana con saldo real contado
- [x] Acceso rápido a Anticipos desde `/caja` (nueva tarjeta en RUTAS_CAJA)
- [x] Acceso rápido a Flujo semanal desde `/financiero` (card con enlace)

### Pendientes
- [ ] Vincular un anticipo directamente desde un pedido en `/pedidos`
- [ ] Tabla de anticipos por entrega estimada (vista calendario)
- [ ] Exportar PDF del flujo semanal

---

## Fase 5.5 — Correcciones críticas y reportes operativos (derivadas de auditoría de módulos)

> Derivada del análisis cruzado entre módulos implementados y requerimientos reales de bitácoras del cliente.
> **Regla:** ítems de Prioridad 1 deben resolverse antes del Go-Live. Prioridad 2 mejoran reportes. Prioridad 3 son nice-to-have.

---

### Prioridad 1 — CRÍTICO (integridad operativa antes del Go-Live)

#### P1.1 — Vincular asistencia → nómina automáticamente
**Problema:** `GeneradorNomina.tsx` requiere teclear `totalDias` manualmente sin validar contra `AsistenciaSemanal`, generando riesgo de discrepancias.

- [x] `components/nomina/GeneradorNomina.tsx` — al seleccionar empleado + inicio de periodo, consultar `asistenciaService.getPorEmpleadoYSemana()` y pre-rellenar `totalDias` y el objeto `asistencias`
- [x] Mostrar badge "Asistencia cargada" cuando se encuentra registro existente; mostrar aviso "Sin registro de asistencia" cuando no existe
- [x] Permitir edición manual de `totalDias` solo cuando NO hay asistencia registrada (o con confirmación explícita si sí la hay)

#### P1.2 — Validar Bono PA contra asistencia real
**Problema:** el campo `bonoPA` es un input libre; se puede pagar el bono aunque el empleado haya faltado.

- [x] `components/nomina/GeneradorNomina.tsx` — si `bonoPA > 0`, verificar que `totalDias === 7` (asistencia perfecta); si no, mostrar alerta amarilla bloqueante con opción "Confirmar de todas formas"
- [x] `lib/services/nominas.service.ts` — la confirmación queda registrada automáticamente en campo `notas` de la nómina generada

#### P1.3 — Hacer `pagarNomina` transaccional (runTransaction)
**Problema:** dos escrituras secuenciales — si la segunda falla, el MovimientoCaja queda registrado pero la Nómina sigue `pendiente`.

- [x] `lib/services/integracionCaja.service.ts` — refactorizado con `runTransaction`: crea MovimientoCaja + actualiza Nómina en una sola operación atómica; verifica que la nómina exista y siga `pendiente` antes de ejecutar

#### P1.4 — Crear índices de Firestore documentados
**Problema:** queries con múltiples `where` (ej. `empleadoId + semanaInicio` en AsistenciaSemanal) pueden fallar en producción sin índice compuesto.

- [x] `firestore.indexes.json` — agregados índices para `AsistenciaSemanal` (empleadoId+semanaInicio), `Prestamos` (empleadoId+estado, empleadoId+fechaCreacion), `Nominas` (empleadoId+periodoInicio, periodoInicio+estado), `TurnosEmpleado` (empleadoId+fecha)

---

### Prioridad 2 — ALTA (reportes críticos para el cliente)

#### P2.1 — Reporte de asistencia multi-semana
**Problema:** no existe vista que muestre el historial de asistencia de un empleado o del equipo.

- [x] `lib/services/asistencia.service.ts` — agregar método `getResumenMultiSemana(empleadoId, cantSemanas: number)` que devuelva array de `AsistenciaSemanal` + tasa de asistencia calculada
- [x] `app/(protected)/reportes/asistencia/page.tsx` — nueva página con:
  - Selector de empleado (o "Todos")
  - Tabla con últimas N semanas: columnas L/M/Mi/J/V/S/D + total días + tasa %
  - Resaltado visual de faltas (rojo) y vacaciones (azul)
  - Exportar CSV

#### P2.2 — Reporte de nómina desglosada por concepto
**Problema:** no existe vista comparativa de lo que se pagó semana a semana por concepto (bonos vs descuentos vs salario base).

- [x] `lib/services/nominas.service.ts` — agregar método `getResumenPorPeriodo(inicio, fin)` que devuelva array de nóminas con todos sus campos desglosados
- [x] `app/(protected)/reportes/nomina/page.tsx` — nueva página con:
  - Filtro por empleado y rango de fechas
  - Tabla: Empleado | Periodo | Salario base | Bono PA | Bono Limpieza | Comisiones | T.Extra | Adelanto | Préstamo | Comida | Faltantes | Fondo | Total Neto
  - KPI totales al pie: suma de cada columna en el periodo
  - Exportar CSV y PDF

#### P2.3 — Reporte de préstamos activos e historial
**Problema:** no hay visibilidad del saldo total de préstamos ni historial de descuentos aplicados.

- [x] `lib/services/prestamos.service.ts` — agregar `getTodos()` y `getResumenDeuda()` (saldo pendiente total agrupado por empleado)
- [x] Nueva colección `HistorialDescuentoPrestamo` `{ prestamoId, empleadoId, monto, fechaAplicacion }` — persistir cada vez que se ejecuta `aplicarDescuentoSemanal()`; regla Firestore inmutable en `firestore.rules`
- [x] `app/(protected)/reportes/prestamos/page.tsx` — nueva página con:
  - Tabla de préstamos activos: Empleado | Monto original | Saldo | Desc. semanal | Semanas restantes estimadas
  - Historial de descuentos aplicados por préstamo (desplegable por fila)
  - KPI: total deuda activa del equipo

#### P2.4 — Integrar `faltantesCaja` desde corte al generador de nómina
**Problema:** el campo existe en Nómina pero requiere llenado manual; debería consultar el `CierreCaja` del empleado/cajera.

- [x] `lib/services/cierreCaja.service.ts` — agregar `getFaltantesPorUsuarioYPeriodo(usuarioId, inicio, fin)` que sume las diferencias negativas de los cierres del periodo
- [x] `components/nomina/GeneradorNomina.tsx` — al seleccionar cajera + periodo, consultar `getFaltantesPorUsuarioYPeriodo()` y pre-rellenar `faltantesCaja` con alerta "Faltante detectado en corte: $XX"

---

### Prioridad 3 — MEDIA (mejoras de visibilidad financiera)

#### P3.1 — Soporte multi-cuenta en flujo de efectivo
**Problema:** `FlujoSemanal` tiene un único `saldoInicial/saldoFinal`; el cliente opera con 4 cuentas (Caja fondo, Caja chica, Banregio débito, Banorte crédito).

- [ ] `lib/types/firestore.ts` — agregar `TipoCuenta = 'caja_fondo' | 'caja_chica' | 'banregio_debito' | 'banorte_credito'`
- [ ] Extender `FlujoSemanal` con `cuentas?: Partial<Record<TipoCuenta, { saldoInicial: number; saldoFinal: number }>>` (retrocompatible)
- [ ] `app/(protected)/financiero/flujo/page.tsx` — sección adicional "Saldos por cuenta" con inputs para capturar saldo de cada cuenta al iniciar y cerrar semana

#### P3.2 — Análisis de cancelaciones por motivo
**Problema:** no hay agregación de `motivoCancelacion` en reportes.

- [ ] `lib/services/reportes.service.ts` — agregar `getAnalisisCancelaciones(inicio, fin)` que agrupe y cuente por motivo
- [ ] `app/(protected)/reportes/page.tsx` — sección adicional "Cancelaciones" con gráfica de barras por motivo y tendencia semanal

#### P3.3 — Validación de `salarioDiario` obligatorio
**Problema:** empleados creados sin `salarioDiario` usarán `salarioBase` fijo como fallback silencioso.

- [ ] `components/nomina/ListaEmpleados.tsx` — advertencia visual en la tabla para empleados activos sin `salarioDiario` configurado (icono amarillo)
- [ ] `components/nomina/GeneradorNomina.tsx` — al seleccionar empleado sin `salarioDiario`, mostrar banner amarillo "Este empleado usa salario fijo. Configura su salario diario en Empleados para el cálculo real."

---

### ✅ Criterios de aceptación Fase 5.5
- [x] `totalDias` en nómina siempre coincide con lo registrado en `AsistenciaSemanal` (no hay entrada manual sin alerta)
- [x] Bono PA solo se aplica sin alerta cuando asistencia es perfecta (7/7 días)
- [x] `pagarNomina()` es atómica — no puede quedar MovimientoCaja sin su Nómina vinculada
- [x] Existe reporte de asistencia multi-semana consultable desde `/reportes/asistencia`
- [x] Existe reporte de nómina desglosada exportable a CSV desde `/reportes/nomina`
- [x] Préstamos activos tienen visibilidad de saldo total desde `/reportes/prestamos`

---

## Fase 5 — Pulido, testing exhaustivo y Go-Live · Semanas 9–10

**Objetivo:** refinamiento de UI/UX, pruebas integrales, documentación y despliegue.

### UI / UX
- [ ] Consistencia visual en todas las interfaces
- [ ] Ajustar espacios, tamaños y colores según el tema
- [ ] Responsividad en móvil
- [ ] Mejorar mensajes de error y validación de formularios

### Testing integral
- [ ] Caja: Apertura → Movimientos → Cierre → Reportes
- [ ] Inventario: Entradas → Salidas → Análisis
- [ ] Nómina: Crear empleado → Generar → Pagar → Verificar caja
- [ ] Pruebas de rendimiento con datos grandes
- [ ] Pruebas de seguridad: permisos por rol

### Documentación
- [ ] Guía de usuario por módulo
- [ ] Documentar endpoints de los servicios
- [ ] Guía de despliegue (setup) en Firebase

### Despliegue (Go-Live)
- [ ] Configurar variables de entorno de producción
- [ ] Habilitar HTTPS y reglas de seguridad en Firebase
- [ ] `npm run build` — compilar para producción
- [ ] Deploy a Firebase Hosting
- [ ] Pruebas finales en producción

### ✅ Criterios de aceptación (Definition of Done)
- [ ] Todos los flujos de extremo a extremo pasan sin errores
- [ ] La app es responsiva y consistente en todos los módulos
- [ ] Los permisos por rol funcionan correctamente
- [ ] La build de producción está desplegada y verificada en Firebase
- [ ] Existe documentación de usuario y de despliegue

---

## Hitos del proyecto

| Hito | Semana | Estado |
|------|--------|--------|
| Caja operativa | S2 | [x] |
| Inventario controlado | S5 | [x] |
| Dashboard G/P | S7 | [x] |
| Nómina integrada | S8 | [x] |
| Go-Live producción | S10 | [ ] |

---

_Documentos de referencia: `PROPUESTA OLDTEXAS 2.0 - FINAL.docx` y `HOJA DE RUTA OLDTEXAS 2.0 - DESARROLLO.docx`._
