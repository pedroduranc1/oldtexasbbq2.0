# 📦 Sistema de Inventario y Control de Costos

## 📋 Resumen Ejecutivo

Sistema completo de gestión de inventario para Old Texas BBQ que permite:

- **Control total de ingredientes** con 50+ insumos categorizados
- **Recetas detalladas** de todos los productos del menú
- **Cálculo automático de costos** basado en precios reales
- **Alertas inteligentes** de stock bajo y productos sin disponibilidad
- **Integración con pedidos** para descontar automáticamente del inventario
- **Órdenes de compra** con sugerencias automáticas
- **Conteo físico** para reconciliación de inventario
- **Reportes y analítica** de consumo, rotación y valoración

---

## 🎯 Objetivos del Sistema

### Objetivos Principales

1. **Eliminar el control manual** de inventario en hojas de cálculo
2. **Automatizar el descuento** de ingredientes al crear pedidos
3. **Calcular costos reales** de productos basados en precios actuales
4. **Prevenir faltantes** con alertas de stock bajo
5. **Optimizar compras** con órdenes sugeridas automáticamente
6. **Reducir merma** con mejor control y seguimiento
7. **Mejorar márgenes** con cálculos precisos de costos

### Métricas de Éxito

- Reducción del 80% en tiempo de control de inventario
- Reducción del 50% en faltantes de ingredientes
- Reducción del 30% en merma y desperdicio
- Cálculo de costos reales en tiempo real
- Órdenes de compra automáticas basadas en consumo
- ROI positivo en 3 meses

---

## 📊 Arquitectura del Sistema

### Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────┐
│                     SISTEMA DE INVENTARIO                    │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────▼────────┐   ┌────────▼────────┐   ┌───────▼────────┐
│  INGREDIENTES  │   │     RECETAS     │   │  MOVIMIENTOS   │
│                │   │                 │   │                │
│ • CRUD         │   │ • Vinculación   │   │ • Entradas     │
│ • Categorías   │   │   con productos │   │ • Salidas      │
│ • Stock        │   │ • Cálculo de    │   │ • Ajustes      │
│ • Precios      │   │   costos        │   │ • Merma        │
│ • Alertas      │   │ • Subrecetas    │   │ • Auditoría    │
└────────────────┘   └─────────────────┘   └────────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
        ┌─────────────────────┴─────────────────────┐
        │                                           │
┌───────▼────────┐                         ┌────────▼────────┐
│ ÓRDENES COMPRA │                         │   REPORTES      │
│                │                         │                 │
│ • Sugerencias  │                         │ • Consumo       │
│ • Proveedores  │                         │ • Valoración    │
│ • Aprobación   │                         │ • Rotación      │
│ • Recepción    │                         │ • Merma         │
└────────────────┘                         │ • Compras       │
                                           └─────────────────┘
```

### Flujos Principales

#### 1. Flujo de Creación de Pedido

```
Usuario crea pedido
        ↓
Sistema obtiene receta del producto
        ↓
Verifica disponibilidad de ingredientes
        ↓
    ┌───┴───┐
    │       │
Sin Stock   Con Stock
    │       │
    │       └→ Confirma pedido
    │           ↓
    │       Descuenta ingredientes
    │           ↓
    │       Registra movimientos
    │           ↓
    └→ Alerta  Actualiza stock
```

#### 2. Flujo de Orden de Compra

```
Stock bajo detectado
        ↓
Sistema genera orden sugerida
        ↓
Encargado revisa y ajusta
        ↓
Crea orden de compra
        ↓
Admin aprueba (opcional)
        ↓
Envía a proveedor
        ↓
Recibe mercancía
        ↓
Registra cantidades recibidas
        ↓
Actualiza stock automáticamente
        ↓
Registra movimientos de entrada
```

#### 3. Flujo de Conteo Físico

```
Inicia conteo físico
        ↓
Selecciona tipo (Completo/Parcial/Cíclico)
        ↓
Recorre ingredientes
        ↓
Registra cantidad física
        ↓
Sistema calcula diferencias
        ↓
Revisa discrepancias
        ↓
Aplica ajustes al stock
        ↓
Genera reporte de conteo
```

---

## 🗄️ Modelo de Datos Detallado

### Colección: `ingredientes`

**Propósito**: Almacenar todos los insumos del restaurante

**Campos principales**:
- `nombre` - Nombre del ingrediente
- `categoria` - Categoría (PROTEINAS, VERDURAS, SALSAS, etc.)
- `unidadMedida` - KILO, LITRO, PIEZA, GRAMO, MILILITRO
- `precioPorUnidad` - Precio actual por unidad
- `stockActual` - Cantidad disponible actualmente
- `stockMinimo` - Nivel mínimo antes de alertar
- `stockMaximo` - Nivel máximo recomendado
- `proveedor` - Información del proveedor principal
- `ubicacion` - Ubicación física (Almacén, Refrigerador, Congelador)

**Índices necesarios**:
- `categoria` + `activo`
- `stockActual` (para queries de stock bajo)
- `nombre` (para búsquedas)

**Ejemplos de categorías** (basadas en el archivo Excel):
- BEBIDAS
- ABARROTES
- SALSAS Y ADEREZOS
- VERDURAS
- ESPECIAS
- INSUMOS EMPAQUE
- PROTEINAS
- CONGELADOS
- POSTRES
- INSUMOS PREPRODUCCION

---

### Colección: `recetas`

**Propósito**: Almacenar las recetas de cada producto del menú

**Estructura**:
```typescript
{
  id: "receta-burger-cheese",
  nombre: "Burger Cheese",
  productoId: "prod-burger-cheese",
  categoria: "BURGERS",
  ingredientes: [
    {
      ingredienteId: "ing-pan-hamburguesa",
      ingredienteNombre: "Pan Hamburguesa",
      cantidad: 1,
      unidadMedida: "PIEZA",
      costoUnitario: 5.53,
      costoTotal: 5.53
    },
    {
      ingredienteId: "ing-carne-hamburguesa",
      ingredienteNombre: "Carne Hamburguesa",
      cantidad: 1,
      unidadMedida: "PIEZA",
      costoUnitario: 8.90,
      costoTotal: 8.90
    },
    {
      ingredienteId: "ing-queso-americano",
      ingredienteNombre: "Queso Americano",
      cantidad: 0.013,
      unidadMedida: "KILO",
      costoUnitario: 86.5,
      costoTotal: 1.12
    }
    // ... más ingredientes
  ],
  costoTotal: 23.91,
  esSubreceta: false,
  activo: true
}
```

**Subrecetas**:
Algunos ingredientes son subrecetas (ej: "Carne Hamburguesa" que a su vez tiene una receta):
```typescript
{
  id: "subreceta-carne-hamburguesa",
  nombre: "Carne Hamburguesa",
  esSubreceta: true,
  ingredientes: [
    {
      ingredienteId: "ing-carne-molida",
      cantidad: 5,
      unidadMedida: "KILO",
      costoUnitario: 65.9,
      costoTotal: 329.5
    },
    {
      ingredienteId: "ing-condimento-burger",
      cantidad: 0.2,
      unidadMedida: "KILO",
      costoUnitario: 68.9,
      costoTotal: 13.78
    }
    // ...
  ],
  rendimiento: 5 // Produce 5 kilos
}
```

---

### Colección: `movimientos_inventario`

**Propósito**: Auditoría completa de todos los movimientos de stock

**Tipos de movimientos**:
1. **ENTRADA** - Compras, devoluciones
2. **SALIDA** - Ventas, consumo en pedidos
3. **AJUSTE** - Correcciones manuales
4. **MERMA** - Desperdicio, vencido, roto
5. **TRASPASO** - Entre ubicaciones o sucursales
6. **VENTA** - Descuento automático por pedido

**Ejemplo**:
```typescript
{
  id: "mov-20250210-001",
  tipo: "ENTRADA",
  ingredienteId: "ing-carne-molida",
  ingredienteNombre: "Carne Molida 80/20",
  cantidad: 30,
  unidadMedida: "KILO",
  stockAnterior: 5.5,
  stockNuevo: 35.5,
  costoUnitario: 42,
  costoTotal: 1260,
  motivo: "Compra semanal",
  referencia: "OC-20250210-001",
  usuarioId: "user-encargado",
  usuarioNombre: "Juan Pérez",
  fecha: "2025-02-10T10:30:00Z",
  proveedor: {
    id: "prov-carniceria-central",
    nombre: "Carnicería Central"
  },
  documentoCompra: "FAC-12345"
}
```

**Reglas importantes**:
- ❌ **NUNCA eliminar** movimientos (auditoría completa)
- ✅ Solo **insertar** nuevos registros
- ✅ Actualizar `stockActual` del ingrediente de forma atómica

---

### Colección: `ordenes_compra`

**Propósito**: Gestionar órdenes de compra a proveedores

**Estados**:
- `PENDIENTE` - Creada, pendiente de aprobar
- `APROBADA` - Aprobada por admin
- `ENVIADA` - Enviada al proveedor
- `RECIBIDA` - Mercancía recibida y registrada
- `CANCELADA` - Cancelada

**Workflow**:
1. Encargado crea orden → `PENDIENTE`
2. Admin aprueba → `APROBADA`
3. Se envía al proveedor → `ENVIADA`
4. Se recibe mercancía → `RECIBIDA` (actualiza stock automáticamente)

---

### Colección: `proveedores`

**Propósito**: Catálogo de proveedores

**Información clave**:
- Datos fiscales (Razón Social, RFC)
- Contacto (Teléfono, Email)
- Categorías de productos que provee
- Calificación (1-5 estrellas)
- Tiempo de entrega promedio
- Historial de compras

---

### Colección: `conteo_fisico`

**Propósito**: Registrar inventarios físicos periódicos

**Tipos de conteo**:
- **COMPLETO** - Todos los ingredientes
- **PARCIAL** - Solo ciertas categorías
- **CICLICO** - Rotativo (cada semana una categoría diferente)

**Proceso**:
1. Iniciar conteo → Estado `EN_PROCESO`
2. Registrar cantidades físicas por ingrediente
3. Sistema calcula diferencias vs stock en sistema
4. Finalizar conteo → Estado `COMPLETADO`
5. Revisar diferencias → Estado `REVISADO`
6. Aplicar ajustes al stock (genera movimientos tipo `AJUSTE`)

---

## 🔗 Integración con Pedidos

### Verificación de Stock

Al crear un pedido:

```typescript
// 1. Obtener la receta del producto
const receta = await getRecetaByProductoId(productoId);

// 2. Verificar disponibilidad de cada ingrediente
for (const ingrediente of receta.ingredientes) {
  const disponible = await verificarDisponibilidad(
    ingrediente.ingredienteId,
    ingrediente.cantidad
  );

  if (!disponible) {
    throw new Error(`Sin stock de ${ingrediente.ingredienteNombre}`);
  }
}

// 3. Crear pedido
const pedido = await createPedido(datos);

// 4. Descontar ingredientes
await descontarIngredientesPedido(pedido.id, receta);
```

### Descuento Automático

```typescript
async function descontarIngredientesPedido(pedidoId: string, receta: Receta) {
  for (const ingrediente of receta.ingredientes) {
    // Registrar movimiento de salida
    await registrarSalida(
      ingrediente.ingredienteId,
      ingrediente.cantidad,
      {
        tipo: 'VENTA',
        referencia: pedidoId,
        motivo: `Venta de ${receta.nombre}`
      }
    );
  }
}
```

### Alertas en UI

En el formulario de pedidos:
- ✅ Producto disponible (verde)
- ⚠️ Producto con stock bajo (amarillo)
- ❌ Producto sin stock (rojo, deshabilitado)

---

## 🔔 Sistema de Alertas

### Alertas Automáticas

1. **Stock Bajo** (stock < stockMinimo)
   - Notificación push a encargado
   - Badge rojo en dashboard
   - Email diario con resumen

2. **Sin Stock** (stock = 0)
   - Notificación urgente
   - Producto deshabilitado en menú
   - Sugerencia de orden de compra

3. **Próximo a Vencer** (< 7 días)
   - Notificación a encargado
   - Sugerencia de usar en promociones

4. **Consumo Anormal**
   - Si consumo diario > 150% del promedio
   - Alerta de posible error o desperdicio

### Dashboard de Alertas

```
┌─────────────────────────────────────────┐
│     🚨 ALERTAS DE INVENTARIO (12)       │
├─────────────────────────────────────────┤
│ ❌ Sin Stock (3)                        │
│   • Carne Molida 80/20                  │
│   • Queso Americano                     │
│   • Tocino                              │
│                                         │
│ ⚠️ Stock Bajo (7)                       │
│   • Aguacate (1.5kg) - Mín: 5kg        │
│   • Pan Hamburguesa (12 pz) - Mín: 50  │
│   • Salsa BBQ (0.8kg) - Mín: 2kg       │
│   ...                                   │
│                                         │
│ 🕒 Próximo a Vencer (2)                │
│   • Boneless (Vence en 3 días)         │
│   • Jamon (Vence en 5 días)            │
│                                         │
│ [Generar Orden de Compra] [Ver Todo]   │
└─────────────────────────────────────────┘
```

---

## 📊 Reportes y Analítica

### 1. Reporte de Consumo

**Métricas**:
- Consumo total por ingrediente (período seleccionado)
- Consumo promedio diario
- Tendencia (aumentó/disminuyó vs período anterior)
- Proyección de cuándo se agotará el stock

**Filtros**:
- Rango de fechas
- Categoría de ingrediente
- Ingrediente específico

**Visualizaciones**:
- Gráfica de barras (ingredientes más consumidos)
- Gráfica de línea (tendencia de consumo)
- Tabla detallada

---

### 2. Reporte de Valoración

**Métricas**:
- Valor total del inventario actual
- Valor por categoría
- Distribución porcentual
- Evolución del valor (últimos 6 meses)

**Cálculo**:
```typescript
valorIngrediente = stockActual * precioPorUnidad
valorTotal = sum(valorIngrediente para cada ingrediente)
```

**Visualizaciones**:
- Gráfica de pastel (distribución por categoría)
- Gráfica de línea (evolución del valor)
- Cards con métricas clave

---

### 3. Reporte de Rotación

**Métricas**:
- Rotación de inventario (veces por período)
- Días promedio de inventario
- Ingredientes de alta rotación (> 12 veces/año)
- Ingredientes de baja rotación (< 4 veces/año)
- Ingredientes obsoletos (sin movimiento en 90+ días)

**Cálculo de rotación**:
```typescript
rotacion = consumoTotal / stockPromedio
diasInventario = 365 / rotacion
```

**Clasificación**:
- 🟢 Alta rotación: > 12 veces/año
- 🟡 Media rotación: 4-12 veces/año
- 🔴 Baja rotación: < 4 veces/año

---

### 4. Reporte de Merma

**Métricas**:
- Merma total por período
- Merma por categoría
- Merma por ingrediente
- Valor monetario de merma
- Porcentaje de merma vs consumo

**Causas de merma**:
- Vencido
- Desperdicio en preparación
- Roto/Derramado
- Robo/Faltante
- Otro

---

### 5. Reporte de Compras

**Métricas**:
- Gasto total por período
- Compras por proveedor
- Compras por categoría
- Frecuencia de compras
- Variación de precios

**Análisis**:
- Proveedores más utilizados
- Categorías con más gasto
- Comparativa de precios entre proveedores

---

## 🔒 Seguridad y Permisos

### Matriz de Permisos

| Acción                         | Encargado | Admin |
| ------------------------------ | --------- | ----- |
| Ver ingredientes               | ✅        | ✅    |
| Crear/Editar ingredientes      | ✅        | ✅    |
| Eliminar ingredientes          | ❌        | ✅    |
| Ver recetas                    | ✅        | ✅    |
| Crear/Editar recetas           | ✅        | ✅    |
| Registrar movimientos          | ✅        | ✅    |
| Ver movimientos                | ✅        | ✅    |
| Crear orden de compra          | ✅        | ✅    |
| Aprobar orden de compra        | ❌        | ✅    |
| Recibir orden                  | ✅        | ✅    |
| Gestionar proveedores          | ✅        | ✅    |
| Realizar conteo físico         | ✅        | ✅    |
| Ver reportes                   | ✅        | ✅    |
| Exportar reportes              | ✅        | ✅    |

### Auditoría

**Todas las operaciones críticas se registran**:
- Quién realizó la acción
- Cuándo se realizó
- Qué se modificó
- Valores anteriores y nuevos

**Eventos auditados**:
- ✅ Crear/modificar/eliminar ingredientes
- ✅ Registrar movimientos de stock
- ✅ Crear/aprobar/recibir órdenes de compra
- ✅ Realizar conteos físicos
- ✅ Aplicar ajustes de inventario

---

## 📱 Interfaces de Usuario

### Dashboard Principal

```
┌────────────────────────────────────────────────────────┐
│  📦 INVENTARIO - Dashboard                             │
├────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │   156    │ │    12    │ │    3     │ │ $45,230  │ │
│  │  Total   │ │  Stock   │ │  Sin     │ │  Valor   │ │
│  │  Items   │ │  Bajo    │ │  Stock   │ │  Total   │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
│                                                        │
│  🚨 Alertas Activas (15)                              │
│  ┌────────────────────────────────────────────────┐   │
│  │ ❌ Carne Molida - Sin stock                    │   │
│  │ ⚠️ Aguacate - Stock bajo (1.5kg de 5kg)       │   │
│  │ 🕒 Boneless - Vence en 3 días                  │   │
│  └────────────────────────────────────────────────┘   │
│                                                        │
│  📊 Consumo por Categoría (Últimos 7 días)           │
│  [Gráfica de barras]                                  │
│                                                        │
│  🔝 Top 10 Más Consumidos                            │
│  [Tabla con ingredientes]                             │
│                                                        │
│  ⚡ Acciones Rápidas                                  │
│  [Registrar Movimiento] [Nueva Orden] [Conteo]       │
└────────────────────────────────────────────────────────┘
```

### Lista de Ingredientes

```
┌────────────────────────────────────────────────────────┐
│  📦 Ingredientes                                       │
├────────────────────────────────────────────────────────┤
│  [Buscar...] [Filtros▼] [+ Nuevo Ingrediente]        │
│                                                        │
│  Categoría: [Todas ▼]  Stock: [Todos ▼]              │
│                                                        │
│  ┌────────────────────────────────────────────────┐   │
│  │ Nombre          │ Categoría │ Stock   │ Precio │   │
│  ├────────────────────────────────────────────────┤   │
│  │ 🔴 Carne Molida │ PROTEINAS │ 0.0 kg  │ $42.00 │   │
│  │ 🟡 Aguacate     │ VERDURAS  │ 1.5 kg  │ $60.00 │   │
│  │ 🟢 Pan Hambur.  │ ABARROTES │ 120 pz  │ $5.53  │   │
│  └────────────────────────────────────────────────┘   │
│                                                        │
│  [< Anterior] Página 1 de 8 [Siguiente >]            │
└────────────────────────────────────────────────────────┘
```

### Registrar Movimiento

```
┌────────────────────────────────────────┐
│  📝 Registrar Movimiento               │
├────────────────────────────────────────┤
│  Tipo: ● Entrada ○ Salida ○ Ajuste   │
│                                        │
│  Ingrediente:                          │
│  [Buscar ingrediente...]               │
│  ├─ Carne Molida 80/20                │
│  └─ Stock actual: 0.0 kg               │
│                                        │
│  Cantidad:                             │
│  [30] kg                               │
│                                        │
│  Costo Unitario:                       │
│  [$42.00] /kg                          │
│                                        │
│  Costo Total: $1,260.00                │
│                                        │
│  Proveedor:                            │
│  [Carnicería Central ▼]                │
│                                        │
│  Referencia:                           │
│  [OC-20250210-001]                     │
│                                        │
│  Notas:                                │
│  [Compra semanal...]                   │
│                                        │
│  Nuevo stock: 30.0 kg                  │
│                                        │
│  [Cancelar] [Registrar Entrada]        │
└────────────────────────────────────────┘
```

---

## 🚀 Plan de Implementación

### Fase 1: Fundación (2-3 semanas)

1. **Modelo de Datos** (3 días)
   - Diseñar schemas completos
   - Crear índices en Firestore
   - Documentar relaciones

2. **Servicios CRUD** (5 días)
   - `ingredientesService`
   - `recetasService`
   - `movimientosService`
   - Tests unitarios

3. **Migración Inicial** (2 días)
   - Script de importación desde Excel
   - Validación de datos
   - Carga de ingredientes y recetas

### Fase 2: UI Básica (2-3 semanas)

4. **Dashboard de Inventario** (3 días)
   - Métricas principales
   - Alertas destacadas
   - Acciones rápidas

5. **Gestión de Ingredientes** (4 días)
   - Lista de ingredientes
   - Formulario CRUD
   - Búsqueda y filtros
   - Indicadores de stock

6. **Gestión de Recetas** (3 días)
   - Lista de recetas
   - Formulario de receta
   - Vinculación con productos
   - Cálculo de costos

7. **Movimientos** (3 días)
   - Registrar movimientos
   - Historial
   - Filtros

### Fase 3: Integración (1-2 semanas)

8. **Integración con Pedidos** (4 días)
   - Verificar stock al crear pedido
   - Descontar ingredientes automáticamente
   - Alertas en formulario de pedidos

9. **Sistema de Alertas** (3 días)
   - Listeners de stock bajo
   - Notificaciones push
   - Dashboard de alertas

### Fase 4: Avanzado (2-3 semanas)

10. **Órdenes de Compra** (5 días)
    - CRUD de órdenes
    - Flujo de aprobación
    - Recepción de mercancía
    - Órdenes sugeridas

11. **Proveedores** (2 días)
    - CRUD de proveedores
    - Vinculación con ingredientes
    - Historial de compras

12. **Conteo Físico** (4 días)
    - Iniciar conteo
    - Registrar cantidades
    - Calcular diferencias
    - Aplicar ajustes

13. **Reportes** (4 días)
    - Reporte de consumo
    - Reporte de valoración
    - Reporte de rotación
    - Reporte de merma
    - Exportación a Excel/PDF

### Fase 5: Optimización (1 semana)

14. **Cálculos Avanzados** (3 días)
    - Proyección de stock
    - Punto de reorden
    - Cantidad óptima
    - Análisis de tendencias

15. **Testing y QA** (2 días)
    - Tests de integración
    - Tests E2E
    - Pruebas con usuarios

---

## 📈 Métricas y KPIs

### KPIs Operativos

1. **Tiempo de control de inventario**
   - Antes: 4 horas/semana
   - Objetivo: 30 minutos/semana
   - Reducción: 87.5%

2. **Faltantes de ingredientes**
   - Antes: 5-10 por semana
   - Objetivo: 0-2 por semana
   - Reducción: 80%

3. **Precisión de inventario**
   - Antes: 70-75% (vs conteo físico)
   - Objetivo: 95-98%
   - Mejora: +25%

4. **Tiempo de creación de orden de compra**
   - Antes: 45 minutos (manual en Excel)
   - Objetivo: 10 minutos (con sugerencias)
   - Reducción: 78%

### KPIs Financieros

1. **Reducción de merma**
   - Antes: 8-10% del inventario
   - Objetivo: 3-5%
   - Ahorro: $3,000-5,000/mes

2. **Optimización de compras**
   - Reducir sobrestocks en 40%
   - Liberar capital de trabajo
   - Mejora en rotación de inventario

3. **Cálculo de costos reales**
   - Costos actualizados en tiempo real
   - Mejor toma de decisiones de precios
   - Identificar productos menos rentables

---

## 🎯 Casos de Uso Principales

### Caso 1: Encargado revisa inventario diario

```
1. Abre dashboard de inventario
2. Ve 12 ingredientes con stock bajo
3. Hace clic en "Generar Orden de Compra"
4. Sistema sugiere cantidades basadas en consumo
5. Revisa y ajusta cantidades
6. Crea orden de compra
7. Admin aprueba la orden
8. Envía orden al proveedor por WhatsApp
```

### Caso 2: Cajera crea pedido

```
1. Crea pedido de "Burger Cheese"
2. Sistema verifica receta del producto
3. Valida que haya stock de todos los ingredientes
4. Confirma pedido
5. Sistema descuenta automáticamente:
   - 1 Pan Hamburguesa
   - 1 Carne Hamburguesa
   - 0.013 kg Queso Americano
   - etc.
6. Registra movimientos de salida
7. Actualiza stock de cada ingrediente
```

### Caso 3: Recepción de mercancía

```
1. Llega proveedor con orden OC-001
2. Encargado abre la orden en el sistema
3. Hace clic en "Recibir Orden"
4. Verifica cada item:
   - Carne Molida: ✅ 30 kg (esperados 30 kg)
   - Aguacate: ⚠️ 8 kg (esperados 10 kg)
   - Queso: ✅ 5 kg (esperados 5 kg)
5. Registra diferencias y notas
6. Confirma recepción
7. Sistema actualiza stock automáticamente
8. Registra movimientos de entrada
```

### Caso 4: Conteo físico mensual

```
1. Inicio de mes → Conteo físico completo
2. Encargado inicia conteo en sistema
3. Recorre almacén con tablet
4. Escanea/busca cada ingrediente
5. Registra cantidad física real
6. Sistema calcula diferencias:
   - Carne Molida: Sistema 5kg, Físico 4.5kg (-0.5kg)
   - Aguacate: Sistema 3kg, Físico 3.2kg (+0.2kg)
7. Finaliza conteo
8. Revisa discrepancias con admin
9. Aplica ajustes al stock
10. Genera reporte PDF
```

---

## 🔮 Mejoras Futuras

### Corto Plazo (3-6 meses)

- [ ] App móvil para conteo físico
- [ ] Lector de código de barras
- [ ] Alertas de fecha de vencimiento
- [ ] Integración con WhatsApp para órdenes

### Mediano Plazo (6-12 meses)

- [ ] IA para predicción de demanda
- [ ] Optimización automática de órdenes
- [ ] Análisis de desperdicio con ML
- [ ] Multi-sucursal con transferencias

### Largo Plazo (12+ meses)

- [ ] Integración con balanzas digitales
- [ ] Sistema de lotes y trazabilidad
- [ ] Blockchain para auditoría
- [ ] Marketplace de proveedores

---

**Documento creado**: 10 de Febrero de 2025
**Versión**: 1.0
**Autor**: Jarvis AI Agent Manager
**Proyecto**: Old Texas BBQ - CRM
