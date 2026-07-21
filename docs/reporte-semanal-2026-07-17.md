# Reporte Semanal de Avance — Old Texas BBQ CRM
**Periodo:** 10 julio – 17 julio 2026
**Entregado por:** Equipo de Desarrollo
**Repositorio:** github.com/pedroduranc1/oldtexasbbq2.0

---

## Resumen Ejecutivo

Durante esta semana se completaron dos hitos importantes: la **Fase 2 del módulo de Inventario** con acceso a historial, analíticas y gestión de proveedores, y la **resolución de 6 errores operativos reales** reportados por el equipo de Old Texas BBQ en su operación diaria. Además se implementaron dos funcionalidades adicionales solicitadas directamente: el registro automático de cancelaciones en caja y la recepción guiada de mercancía por proveedor.

---

## Entregables de Esta Semana

### 1. Módulo de Inventario — Fase 2 (Completo)

Se habilitaron tres nuevas páginas accesibles desde el panel de inventario:

**Historial de Movimientos** (`/inventario/movimientos`)
- Tabla completa con todos los movimientos: entradas, salidas, mermas, ventas y ajustes
- Filtros por tipo y búsqueda por nombre de ingrediente
- KPIs en la parte superior: total entradas, salidas, mermas y costo del periodo
- Exportación a CSV
- Paginación de 20 registros por página
- Botones de registro rápido de entrada/salida

**Gestión de Proveedores** (`/inventario/proveedores`)
- Directorio completo de proveedores activos
- Nuevo botón **"Recibir mercancía"** que abre el flujo de recepción guiada

**Analíticas de Inventario** (`/inventario/analisis`)
- Gráfica de barras con los ingredientes más vendidos/usados
- Gráfica de líneas con tendencia de movimientos por día
- Ranking de productos con indicador visual de posición
- Selector de periodo: últimos 7, 30 o 90 días

**Accesos rápidos en la página principal de inventario**
- Tres tarjetas de acceso a Movimientos, Proveedores y Análisis siempre visibles

---

### 2. Recepción Guiada de Proveedor (Problema 8 resuelto)

Nueva funcionalidad para registrar la llegada de mercancía de un proveedor en un solo flujo:

1. El encargado selecciona el proveedor que llegó
2. El sistema muestra automáticamente todos los ingredientes vinculados a ese proveedor con su stock actual
3. Se ingresan las cantidades recibidas (solo las que apliquen)
4. Al confirmar, el sistema registra las entradas y actualiza el stock de forma atómica en Firestore

**Beneficio operativo:** Elimina el registro manual ingrediente por ingrediente cuando llega un pedido de proveedor.

---

### 3. Cancelaciones con Movimiento Automático en Caja (Problema 2 resuelto)

Cuando un pedido pagado en **efectivo** es cancelado, el sistema ahora registra automáticamente un egreso en caja con el concepto **"Cancelación de pedido"** incluyendo el número de pedido y el motivo.

**Antes:** La cancelación revertía el conteo de ventas del turno, pero no quedaba registro del dinero que salió de caja por devolución.
**Ahora:** El movimiento queda trazado en el historial de caja con fecha, monto, referencia al pedido y usuario que lo canceló.

---

### 4. Registro de Merma desde Cocina

Se agregó un botón **"Registrar merma"** directamente en la pantalla de cocina. El personal de cocina puede registrar ingredientes desperdiciados sin salir de su vista de comandas.

---

### 5. Alerta de Cambio Pendiente

En el resumen de turno activo de caja ahora aparece una alerta roja cuando existen pedidos donde el cambio todavía no ha sido entregado al cliente. Muestra el número de pedido y el monto exacto de cambio pendiente.

---

### 6. Nuevos Conceptos Financieros en Catálogo

Se añadieron 6 nuevos conceptos al catálogo de caja para cubrir situaciones reales detectadas en la operación:

**Ingresos:**
- Anticipo pedido especial
- Venta subproducto (aceite, cajas, etc.)

**Egresos:**
- Adelanto de nómina
- Corrección pedido Uber/Didi
- Reenvío / Cortesía
- Descuento a nómina

---

### 7. Sin Caché en Desarrollo

Se desactivó el caché del navegador en el entorno local (`localhost`). Esto facilita la revisión de cambios en tiempo real sin necesidad de hacer "hard reload" manualmente.

---

## Problemas Operativos Atendidos

| # | Problema reportado | Estado |
|---|---|---|
| 1 | Falta de conceptos para registrar cortesías, adelantos y correcciones | Resuelto — nuevos conceptos en catálogo |
| 2 | Cancelación de pedido no genera movimiento en caja | Resuelto — egreso automático al cancelar |
| 3 | No hay forma de saber si el cambio fue entregado al cliente | Resuelto — campo `cambioEntregado` + alerta en caja |
| 4 | Merma se debe registrar pero cocina no tiene acceso al inventario | Resuelto — botón de merma en pantalla de cocina |
| 5 | Varios conceptos de gasto no estaban disponibles en el catálogo | Resuelto — catálogo expandido con 6 nuevos conceptos |
| 6 | KPIs y alertas de caja no eran consistentes | Resuelto — componentización `KpiGrid` + `AlertBox` |
| 7 | Crashes al revisar historial de turnos importados de Loyverse CSV | Resuelto — guardias opcionales `?.` en todos los accesos a `turno.resumen` |
| 8 | Entrada de proveedor se registra ingrediente por ingrediente | Resuelto — recepción guiada por proveedor en batch |

---

## Estado General del Proyecto

| Módulo | Avance |
|---|---|
| Sistema de Caja | Completo |
| Historial / Corte | Completo |
| Importación Loyverse CSV | Completo |
| Módulo de Inventario | Completo |
| Analíticas de Caja | Completo |
| Analíticas de Inventario | Completo |
| Gestión de Proveedores | Completo |
| Módulo de Reportes | En progreso |
| Módulo de Repartidores | En progreso |
| App pública de pedidos | Pendiente |

---

## Próximos Pasos (Semana siguiente)

1. **Reporte semanal automático para encargado** — página `/reportes/semanal` con ventas, egresos y comparativo semanal lista para imprimir o exportar a PDF
2. **Recepciones de proveedor con órden de compra** — flujo completo: crear orden → proveedor entrega → confirmar contra la orden
3. **Ajuste de stock por conteo físico** — formulario de conteo físico para que el encargado corrija diferencias entre inventario real y sistema

---

## Notas Técnicas

- Todos los cambios están subidos al repositorio en la rama `main`
- Se mantiene la integridad de datos: los movimientos de caja son inmutables (solo se corrigen con registros inversos)
- Las actualizaciones de stock en inventario son atómicas (Firestore `runTransaction`)
- No se introdujeron cambios incompatibles con datos existentes en Firestore

---

*Reporte generado el 17 de julio de 2026*
