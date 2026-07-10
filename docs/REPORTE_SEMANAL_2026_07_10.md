# Reporte Semanal de Desarrollo — Old Texas BBQ CRM 2.0
**Semana:** 7 – 10 de julio, 2026  
**Desarrollador:** Pedro Durán  
**Proyecto:** Old Texas BBQ CRM 2.0  
**Fase:** 2 — Inventario detallado y controlado  
---

## Resumen Ejecutivo

Esta semana se completó íntegramente el **Módulo de Inventario** del CRM 2.0 (Fase 2). Se construyeron 5 nuevos servicios, 5 componentes de UI, la página principal de inventario con Tabs, se corrigieron dos errores críticos de Firestore (permisos e índices) y se realizó un **seed completo de datos reales** a partir de los archivos Excel de la Dark Kitchen — 67 productos, 19 recetas, 10 mermas, 27 gastos y 4 empleados activos ahora están disponibles en Firestore.

---

## Funcionalidades Entregadas

### 1. Servicios de Inventario (nuevos)

**`lib/services/stock.service.ts`**
- `getStockActual()` — lista ingredientes activos con estado calculado (`ok` / `bajo` / `sin_stock`)
- `getResumenStock()` — KPIs: total ingredientes, cuántos en estado ok/bajo/sin_stock, valor total estimado
- `suscribirStock(callback)` — listener en tiempo real con `onSnapshot`
- `calcularDiasRestantes(stock, consumoDiario)`

**`lib/services/analisisVentas.service.ts`**
- `getTopProductosVendidos(fechas[], topN)` — acumula `cantidadVendidaPorDia` de los productos para las fechas dadas
- `getTopVendidosUltimos7Dias(topN)` / `getTopVendidosUltimos30Dias(topN)` — wrappers de conveniencia
- `getTendenciasMovimientos(inicio, fin)` — movimientos de inventario agrupados por día
- `getResumenAnalisis(dias)` — Promise.all de top vendidos + tendencias + resumen de movimientos

### 2. Componentes de UI (nuevos)

| Componente | Descripción |
|-----------|-------------|
| `StockActual.tsx` | Tabla en tiempo real con 4 KPI cards filtrables (total / ok / bajo / sin stock). Muestra valor estimado del inventario. Filas coloreadas por estado. |
| `RegistroEntrada.tsx` | Dialog con react-hook-form. Carga ingredientes y proveedores al abrir. Muestra stock actual del ingrediente seleccionado. Llama `registrarEntrada()` en transacción atómica. |
| `RegistroSalida.tsx` | Selector de tipo (salida / merma / venta). Calcula stock resultante en tiempo real. Alerta roja si el stock llegaría a 0. |
| `ProveedoresManager.tsx` | Tabla en tiempo real. Email y teléfono como links `mailto:`/`tel:`. Dialog de creación/edición con react-hook-form. Soft-delete. |
| `ProductosMasVendidos.tsx` | Selector de periodo (7d / 30d). Ranking con barras proporcionales y medallas para los top 3. |

### 3. Página de Inventario Refactorizada

`app/(protected)/inventario/page.tsx` fue reescrita con:
- Encabezado con botones "Registrar entrada" (verde) y "Registrar salida" (rojo outline)
- 3 tabs: **Stock actual** → `<StockActual/>` · **Proveedores** → `<ProveedoresManager/>` · **Más vendidos** → `<ProductosMasVendidos/>`
- Dialogs `<RegistroEntrada>` y `<RegistroSalida>` montados y controlados por estado local

---

## Correcciones de Firestore

### Error 1 — `permission-denied` en StockActual
**Causa:** la colección `ingredientes` (minúsculas) no tenía regla en `firestore.rules` y caía al bloqueo por defecto.  
**Solución:** se agregaron reglas explícitas para `ingredientes` y `recetas`:

| Colección | Leer | Crear | Actualizar | Eliminar |
|-----------|------|-------|------------|---------|
| `ingredientes` | autenticado + activo | encargado/admin | admin/encargado/cajera | admin |
| `recetas` | autenticado + activo | encargado/admin | encargado/admin | admin |

Se desplegó con `firebase deploy --only firestore:rules --project oldtexasbbq`.

### Error 2 — `failed-precondition` — índice requerido
**Causa:** query `where('activo', '==', true) + orderBy('nombre', 'asc')` en `ingredientes` requiere índice compuesto.  
**Solución:** se agregaron 6 índices compuestos a `firestore.indexes.json`:

| Colección | Campos |
|-----------|--------|
| `ingredientes` | activo ASC + nombre ASC |
| `ingredientes` | activo ASC + categoria ASC + nombre ASC |
| `Proveedores` | activo ASC + nombre ASC |
| `MovimientosInventario` | tipo ASC + fecha DESC |
| `MovimientosInventario` | ingrediente_id ASC + fecha DESC |
| `MovimientosInventario` | turno_id ASC + fecha DESC |

Se desplegó con `firebase deploy --only firestore:indexes --project oldtexasbbq`.

> **Nota:** los índices de un solo campo los gestiona Firestore automáticamente — declararlos manualmente genera error 400. Solo se declararon los índices multi-campo compuestos.

---

## Seed de Datos Reales

Se analizaron 6 archivos Excel de la Dark Kitchen y se creó `scripts/seed-completo.js` (Admin SDK) que subió:

| Colección | Documentos | Fuente |
|-----------|-----------|--------|
| `productos` | 67 | `02-Costeo de recetas.xlsx` — Productos TPV |
| `productos.cantidadVendidaPorDia` | semana 39 (2025-09-22) | `03-Ventas por ingrediente Sem 39.xlsx` — PPlatillo |
| `recetas` | 19 | `02-Costeo de recetas.xlsx` — desglose de ingredientes |
| `MovimientosInventario` (mermas) | 10 | `04-Flujo de inventario semana 39.xlsx` |
| `MovimientosCaja` (gastos) | 27 | `ADM RESTAURANTE 2025.xlsx` — Libro de gastos sep. 2025 |
| `Empleados` | 4 | `NOMINA 2025.xlsx` — HD COUNT (activos) |

### Productos más vendidos — Semana 39
Los primeros 5 por volumen de unidades:

| # | Producto | Unidades sem. 39 |
|---|---------|---------|
| 1 | Papa Asada con Sirloin | 61 |
| 2 | Orden Tacos Sirloin Maíz | 54 |
| 3 | Boneless 1/2 kg | 39 |
| 4 | Pepsi 600 ml | 38 |
| 5 | Palomitas de Pollo | 37 |

### Empleados activos cargados

| Nombre | Puesto | Salario diario |
|--------|--------|---------------|
| Marco Antonio Caldera Paz | Supervisor | $428.57 |
| Margarita Arias Díaz | Cajero | $285.72 |
| Mónica Mancilla Contreras | Ayudante | $242.00 |
| Tania Leija Cristal | Cajero | $285.72 |

---

## Commits de la Semana

| Hash | Descripción |
|------|-------------|
| `0dd5ace` | `feat(inventario): módulo completo de inventario con seed de datos reales` |

**Total:** 14 archivos modificados/creados · +2,300 líneas insertadas · −189 líneas eliminadas

---

## Estado de la Fase 2

| Categoría | Estado |
|-----------|--------|
| Colecciones Firestore | ✅ Completo |
| Servicios | ✅ Completo (5/5) |
| Componentes | ✅ Completo (5/5) |
| Reglas de seguridad | ✅ Desplegadas |
| Índices compuestos | ✅ Desplegados |
| Seed de datos reales | ✅ 67 productos + 19 recetas + mermas + gastos + empleados |
| `AnalisisInventario.tsx` | ⬜ Pendiente |
| Rutas dedicadas (movimientos / proveedores / análisis) | ⬜ Pendiente |
| Tests de integración | ⬜ Pendiente |

---

## Pendientes para la Próxima Semana

- [ ] `components/reportes/AnalisisInventario.tsx` — gráfica de movimientos + tabla de mermas
- [ ] `app/(protected)/inventario/movimientos/page.tsx` — historial filtrable de entradas/salidas/mermas
- [ ] `app/(protected)/inventario/proveedores/page.tsx` — ruta dedicada de proveedores
- [ ] `app/(protected)/inventario/analisis/page.tsx` — análisis de rotación e inventario
- [ ] Tests de integración del módulo de inventario
- [ ] Inicio **Fase 3 — Dashboard de Reportes (G/P)**

---

*Reporte generado el 10 de julio de 2026*
