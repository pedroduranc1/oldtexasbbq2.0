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
- [ ] Colección `MovimientosInventario` (id, ingrediente_id, tipo, cantidad, costo_unitario, motivo, fecha, turno_id)
- [ ] Colección `Proveedores` (id, nombre, contacto, email, telefono, direccion)
- [ ] Colección `ConceptosFinancieros` (id, nombre, tipo, categoria, descripcion)
- [ ] Actualizar `Productos` para rastrear cantidad vendida por turno/día

### Servicios
- [ ] `lib/services/movimientosInventario.service.ts` — CRUD, filtrar por tipo y fecha
- [ ] `lib/services/proveedores.service.ts` — CRUD
- [ ] `lib/services/conceptosFinancieros.service.ts` — CRUD
- [ ] `lib/services/analisisVentas.service.ts` — más vendidos y tendencias
- [ ] `lib/services/stock.service.ts` — stock actual y proyecciones

### Componentes
- [ ] `components/inventario/RegistroEntrada.tsx`
- [ ] `components/inventario/RegistroSalida.tsx`
- [ ] `components/inventario/StockActual.tsx`
- [ ] `components/inventario/ProveedoresManager.tsx`
- [ ] `components/inventario/ProductosMasVendidos.tsx`
- [ ] `components/reportes/AnalisisInventario.tsx`

### Rutas
- [ ] `app/(protected)/inventario/page.tsx`
- [ ] `app/(protected)/inventario/movimientos/page.tsx`
- [ ] `app/(protected)/inventario/proveedores/page.tsx`
- [ ] `app/(protected)/inventario/analisis/page.tsx`

### Testing
- [ ] Registrar entradas y verificar actualización de stock
- [ ] Registrar salidas/merma y validar diferenciación
- [ ] Verificar cálculo de productos vendidos

### ✅ Criterios de aceptación (Definition of Done)
- [ ] Cada movimiento queda clasificado por tipo (entrada/salida/merma/gasto) y fecha
- [ ] El stock se recalcula automáticamente con cada entrada y salida
- [ ] Los proveedores quedan vinculados a las entradas de compra
- [ ] El análisis muestra correctamente los productos de mayor rotación

---

## Fase 3 — Dashboard de Reportes (Ganancias y Pérdidas) · Semanas 6–7

**Objetivo:** dashboard ejecutivo con G/P, KPIs, filtros por periodo y export a PDF.

### Servicios
- [ ] `lib/services/reportes.service.ts` — ingresos, egresos, ganancia neta
- [ ] `lib/services/dashboardMetricas.service.ts` — métricas por periodo
- [ ] `lib/services/generadorPDF.service.ts` — export a PDF (jsPDF)

### Componentes
- [ ] `components/reportes/GananciasChart.tsx`
- [ ] `components/reportes/IngresosEgresosChart.tsx`
- [ ] `components/reportes/KPIDashboard.tsx`
- [ ] `components/reportes/FiltrosPeriodo.tsx`
- [ ] `components/reportes/ExportarReporte.tsx`

### Rutas
- [ ] `app/(protected)/reportes/page.tsx`
- [ ] `app/(protected)/reportes/detallado/page.tsx`

### Testing
- [ ] Verificar cálculo de ganancias/pérdidas
- [ ] Probar filtros por periodo (día/semana/mes)
- [ ] Descargar y validar el PDF generado

### ✅ Criterios de aceptación (Definition of Done)
- [ ] El dashboard refleja datos reales de Caja e Inventario
- [ ] KPIs y porcentajes coinciden con los movimientos registrados
- [ ] Los filtros por periodo recalculan correctamente todas las métricas
- [ ] El reporte se exporta a PDF con el formato esperado

---

## Fase 4 — Sistema de Nómina integrado · Semana 8

**Objetivo:** cálculo automático de nómina e integración directa con caja.

### Base de datos (Firestore)
- [ ] Colección `Empleados` (id, nombre, cargo, salario_base, fecha_contratacion, estado)
- [ ] Colección `Nominas` (id, empleado_id, periodo, salario_base, bonos, descuentos, total, estado)
- [ ] Colección `TurnosEmpleado` (integración con `Turnos`)

### Servicios
- [ ] `lib/services/empleados.service.ts` — CRUD
- [ ] `lib/services/nominas.service.ts` — crear nómina, salario neto, pagos
- [ ] `lib/services/integracionCaja.service.ts` — registrar pago como egreso en caja

### Componentes
- [ ] `components/nomina/ListaEmpleados.tsx`
- [ ] `components/nomina/GeneradorNomina.tsx`
- [ ] `components/nomina/DetalleTrabajador.tsx`
- [ ] `components/nomina/RegistroPago.tsx`

### Rutas
- [ ] `app/(protected)/nomina/page.tsx`
- [ ] `app/(protected)/nomina/empleados/page.tsx`
- [ ] `app/(protected)/nomina/generar/page.tsx`

### Testing
- [ ] Crear empleado y verificar en BD
- [ ] Generar nómina y validar cálculos
- [ ] Pagar nómina y verificar egreso en caja

### ✅ Criterios de aceptación (Definition of Done)
- [ ] El alta de empleados persiste correctamente en Firestore
- [ ] La nómina calcula salario base, bonos y descuentos sin errores
- [ ] Cada pago de nómina genera automáticamente un egreso en `MovimientosCaja`
- [ ] El total pagado es consistente entre Nómina, Caja y Reportes

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
| Caja operativa | S2 | [ ] |
| Inventario controlado | S5 | [ ] |
| Dashboard G/P | S7 | [ ] |
| Nómina integrada | S8 | [ ] |
| Go-Live producción | S10 | [ ] |

---

_Documentos de referencia: `PROPUESTA OLDTEXAS 2.0 - FINAL.docx` y `HOJA DE RUTA OLDTEXAS 2.0 - DESARROLLO.docx`._
