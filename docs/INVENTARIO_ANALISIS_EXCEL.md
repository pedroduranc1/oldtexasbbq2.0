# 📊 Análisis del Archivo "Costeo de Recetas.xlsx"

## 📋 Resumen del Archivo

**Archivo analizado**: `Copia de 02-Costeo de recetas.xlsx`
**Ubicación**: `/docs/files/`
**Fecha de análisis**: 10 de Febrero de 2025

---

## 📄 Estructura del Archivo

El archivo Excel contiene **9 hojas** con información detallada sobre ingredientes, recetas y costos:

### 1. 📦 Hoja "Ingredientes" (998 filas)

**Contenido**: Lista completa de ingredientes/insumos del restaurante

**Columnas**:
- Nombre del ingrediente
- Unidad de medida (PIEZA, KILO, LITRO)
- Categoría
- Precio por unidad

**Categorías identificadas** (10):
1. **BEBIDAS** - Refrescos 600ml (Pepsi, 7Up, Manzanita, Mirinda)
2. **ABARROTES** - Pan hamburguesa, jamón, queso americano, salchichas
3. **SALSAS Y ADEREZOS** - Mayonesa, ranch, queso, BBQ, buffalo
4. **VERDURAS** - Aguacate, cebolla, tomate, lechuga, chile jalapeño
5. **ESPECIAS** - Condimento burger, sal, pimienta, ajo molido, azúcar
6. **INSUMOS EMPAQUE** - Empaques hamburguesa, papel ajedrez, bolsas, aluminio
7. **PROTEINAS** - Carne molida, boneless, costilla de cerdo, sirloin
8. **CONGELADOS** - Papas fritas
9. **POSTRES** - Pay de queso
10. **INSUMOS PREPRODUCCION** - Carbón

**Ejemplos de ingredientes**:
```
• Carne Molida 80/20    - $42.00/kg
• Carne Hamburguesa     - $8.90/pieza
• Aguacate              - $60.00/kg
• Pan Hamburguesa       - $5.53/pieza
• Queso Americano       - $86.50/kg
• Boneless              - $127.18/kg
• Papas Fritas          - $42.83/kg
• Salsa BBQ             - $39.20/kg
• Tocino                - $35.00/kg
```

---

### 2. 🍔 Hoja "Productos TPV" (1000 filas)

**Contenido**: Catálogo de productos vendidos en el TPV con análisis de costos

**Columnas**:
- Nombre del platillo
- Categoría
- Precio de venta
- Costo unitario
- Margen de ganancia
- Porcentaje de margen

**Categorías de productos**:
- BEBIDAS (5 productos)
- BURGERS (18 productos)
- FREIDORA (14 productos)
- EXTRAS (7 productos)
- GUARNICIONES (4 productos)
- PARRILLA (15+ productos)

**Ejemplos de productos**:
```
Producto              | Precio | Costo  | Margen | %
--------------------|--------|--------|--------|------
PEPSI 600ML          | $25    | $10.91 | $14.09 | 56%
BURGER CHEESE        | $75    | $23.91 | $51.09 | 68%
BURGER TOCINO        | $80    | $23.87 | $56.13 | 70%
BONELESS 1/2KG       | $205   | $75.09 | $129.91| 63%
PAPAS FRITAS CHICAS  | $30    | $4.19  | $25.81 | 86%
PAPAS SIRLOIN GRANDE | $89    | $41.74 | $47.26 | 53%
```

**Análisis de márgenes**:
- 🟢 Márgenes altos (>70%): Papas fritas, bebidas, extras
- 🟡 Márgenes medios (50-70%): Burgers, boneless
- 🔴 Márgenes bajos (<50%): Productos con sirloin, parrilla

---

### 3. 🍔 Hoja "Burgers" (1017 filas)

**Contenido**: Recetas detalladas de todas las hamburguesas

**Estructura**: Cada producto tiene una lista de ingredientes con:
- Nombre del ingrediente
- Cantidad exacta
- Unidad de medida
- Costo unitario
- Costo total por ingrediente

**Ejemplo: BURGER ESPECIAL** (Costo total: $22.47)
```
Ingrediente           | Cantidad | Unidad | Precio/U | Total
---------------------|----------|--------|----------|-------
Pan Hamburguesa       | 1        | PIEZA  | $5.53    | $5.53
Carne Hamburguesa     | 1        | PIEZA  | $8.90    | $8.90
Jamón                 | 0.020    | KILO   | $53.00   | $1.06
Queso Americano       | 0.013    | KILO   | $86.50   | $1.12
Aguacate              | 0.050    | KILO   | $60.00   | $3.00
Tomate                | 0.015    | KILO   | $22.00   | $0.33
Cebolla Blanca        | 0.015    | KILO   | $42.00   | $0.63
Aderezo Mayonesa      | 0.006    | KILO   | $37.07   | $0.22
Salsa Catsup          | 0.004    | KILO   | $22.41   | $0.09
Empaque Hamburguesa   | 1        | PIEZA  | $0.84    | $0.84
Chile Jalapeño        | 0.040    | KILO   | $18.50   | $0.74
-----------------------------------------------------------
                                          TOTAL: $22.47
```

**Variaciones de burgers**:
- BURGER ESPECIAL (base) - $22.47
- BURGER CHEESE (+queso extra) - $23.91
- BURGER TOCINO (+tocino) - $23.87
- BURGER DOBLE CHEESE (doble carne) - $34.82
- BURGER SIRLOIN (carne sirloin) - $48.72
- BURGER POLAKA (+salchicha) - $34.85
- BONELESS BURGER (boneless en vez de carne) - $39.00

---

### 4. 🥩 Hoja "Parrilla" (1015 filas)

**Contenido**: Recetas de productos de parrilla

**Productos**:
- Tacos de Sirloin (maíz/harina, con/sin aguacate)
- Papa Asada (con/sin tocino)
- Costillas (diferentes salsas)

**Ejemplo: TACOS DE SIRLOIN EN MAIZ** (Costo: $34.52)
```
Ingrediente           | Cantidad | Unidad | Precio/U | Total
---------------------|----------|--------|----------|-------
Tortilla Maíz         | 10       | PIEZA  | $0.25    | $2.45
Sirloin               | 0.15     | KILO   | $175.00  | $26.25
Cebolla Blanca        | 0.05     | KILO   | $42.00   | $2.10
Limón                 | 0.022    | KILO   | $92.25   | $2.03
Salsa Guacamole       | 0.04     | KILO   | $25.75   | $1.03
Plato 855             | 1        | PIEZA  | $0.66    | $0.66
-----------------------------------------------------------
                                          TOTAL: $34.52
```

---

### 5. 🌶️ Hoja "Salsas y extras" (1002 filas)

**Contenido**: Porciones estándar de salsas, extras y complementos

**Productos**:
- Salsas (BBQ, Buffalo, Mango Habanero, Lemon Pepper, Guacamole)
- Aderezos (Queso, Ranch)
- Chile jalapeño
- Galletas saladas
- Tortillas (maíz/harina)
- Bebidas
- Pay de queso

**Porciones estándar** (0.04 kg por porción):
```
Salsa/Extra              | Costo/Porción
------------------------|---------------
Salsa BBQ                | $1.98
Salsa Buffalo            | $1.57
Salsa Mango Habanero     | $3.52
Salsa Lemon Pepper       | $0.90
Salsa Guacamole          | $1.03
Aderezo de Queso         | $2.52
Aderezo Ranch            | $2.52
Chile Jalapeño           | $0.74
```

---

### 6. 🍟 Hoja "Freidora" (1007 filas)

**Contenido**: Recetas de productos fritos

**Productos**:
- Papas Fritas (chicas/grandes)
- Papas con Queso (chicas/grandes)
- Papas con Tocino (chicas/grandes)
- Papas Sirloin (chicas/grandes)
- Boneless (diferentes porciones)
- Palomitas de pollo
- Nachos Sirloin

**Ejemplo: PAPAS FRITAS CHICAS** (Costo: $4.19)
```
Ingrediente           | Cantidad | Unidad | Precio/U | Total
---------------------|----------|--------|----------|-------
Papas Fritas          | 0.12     | KILO   | $13.90   | $1.67
Empaque Hamburguesa   | 1        | PIEZA  | $0.84    | $0.84
Sobre Catsup          | 3        | PIEZA  | $0.56    | $1.68
-----------------------------------------------------------
                                          TOTAL: $4.19
```

**Ejemplo: BONELESS 1/2KG** (Costo: $75.09)
```
Ingrediente           | Cantidad | Unidad | Precio/U | Total
---------------------|----------|--------|----------|-------
Boneless              | 0.5      | KILO   | $127.18  | $63.59
Empaque 7x7 Liso      | 1        | PIEZA  | $1.96    | $1.96
Salsa Buffalo         | 0.04     | KILO   | $47.75   | $1.91
Aderezo Ranch         | 0.04     | KILO   | $37.07   | $1.48
Papas Fritas          | 0.12     | KILO   | $13.90   | $1.67
Sobre Catsup          | 3        | PIEZA  | $0.56    | $1.68
-----------------------------------------------------------
                                          TOTAL: $75.09
```

---

### 7. 🔧 Hoja "Lista de modificadores" (64 filas)

**Contenido**: Modificadores personalizables de platillos con sus costos

**Categorías de modificadores**:
- COSTILLAS (salsas bañadas, aparte, mitad)
- BONELESS (salsas bañadas, aparte, mitad)
- PARRILLADA MIXTA (costillas con salsas)
- BONELESS BURGER (bañadas)
- BURGERS (extras, quitar ingredientes)

**Ejemplos**:
```
Producto    | Modificador               | Ingred. Afectado | Cant. | Precio
-----------|---------------------------|------------------|-------|--------
COSTILLAS   | BAÑADAS SALSA BBQ         | Salsa BBQ        | 0.35  | +$10
COSTILLAS   | BAÑADAS MANGO HABANERO    | Mango Habanero   | 0.35  | +$15
BONELESS    | BAÑADOS BUFFALO           | Salsa Buffalo    | 0.35  | +$10
BONELESS    | BAÑADOS RANCH             | Aderezo Ranch    | 0.35  | +$15
BURGERS     | EXTRA QUESO               | Queso Americano  | 0.018 | +$10
BURGERS     | SIN VERDURAS              | Aguacate         | -0.05 | $0
BURGERS     | SIN CEBOLLA               | Cebolla          | -0.005| $0
```

**Insight importante**:
- Los modificadores afectan el costo del producto (agregan/quitan ingredientes)
- El sistema debe calcular costo real considerando modificadores
- Algunos modificadores no tienen costo extra para el cliente pero sí impactan el costo real

---

### 8. 🍽️ Hoja "Guarniciones" (1002 filas)

**Contenido**: Recetas de guarniciones

**Productos**:
- Macarrones con queso
- Porción polaka
- Papa Texas
- Puré de papa

**Ejemplo: MACARRONES CON QUESO** (Costo: $11.09)
```
Ingrediente           | Cantidad | Unidad | Precio/U | Total
---------------------|----------|--------|----------|-------
Macarrones            | 0.1      | KILO   | $78.50   | $7.85
Empaque Hamburguesa   | 1        | PIEZA  | $1.96    | $1.96
Salsa Queso           | 0.04     | KILO   | $32.00   | $1.28
-----------------------------------------------------------
                                          TOTAL: $11.09
```

---

### 9. 🔬 Hoja "Subrecetas" (999 filas)

**Contenido**: Ingredientes compuestos (recetas base usadas en otras recetas)

**Subrecetas identificadas**:
1. **Carne Hamburguesa** (5 kg producidos)
2. **Salsa Guacamole** (1 lote)
3. **Puré de Papa** (5 kg producidos)
4. **Marinado para Costillas** (1 lote)
5. **Costillas de Cerdo** (preparadas y marinadas)
6. **Macarrones con Queso** (preparados)

**Ejemplo: CARNE HAMBURGUESA** (Costo: $370.89 por 5kg → $8.90/pieza)
```
Ingrediente           | Cantidad | Unidad | Precio/U | Total
---------------------|----------|--------|----------|-------
Carne Molida 80/20    | 5        | KILO   | $65.90   | $329.50
Condimento Burger     | 0.2      | KILO   | $68.90   | $13.78
Pan Molido            | 0.25     | KILO   | $71.24   | $17.81
Salsa BBQ             | 0.25     | KILO   | $39.20   | $9.80
-----------------------------------------------------------
                                          TOTAL: $370.89
Rendimiento: 5 kg (aproximadamente 50 piezas)
Costo por pieza: $370.89 / 50 = $8.90
```

**Ejemplo: SALSA GUACAMOLE** (Costo: $25.75/kg)
```
Ingrediente           | Cantidad | Unidad | Precio/U | Total
---------------------|----------|--------|----------|-------
Chiles Jalapeño       | 0.5      | KILO   | $18.00   | $9.00
Cebolla Blanca        | 0.2      | KILO   | $18.50   | $3.70
Ajo Molido            | 0.1      | KILO   | $45.00   | $4.50
Caldo de Pollo        | 1        | KILO   | $2.00    | $2.00
Aceite                | 0.5      | LITRO  | $31.10   | $15.55
-----------------------------------------------------------
                                          TOTAL: $25.75
```

---

## 📊 Estadísticas Generales

### Ingredientes
- **Total de ingredientes únicos**: ~50+
- **Categorías**: 10
- **Rango de precios**: $0.12 (bolsa) a $175.00/kg (sirloin)

### Productos
- **Total de productos en menú**: ~80+
- **Categorías de productos**: 6
- **Rango de precios de venta**: $10 (extras) a $399 (boneless 1kg)
- **Margen promedio**: 55-65%

### Recetas
- **Total de recetas detalladas**: 80+
- **Subrecetas**: 6
- **Ingredientes por receta**: Promedio 8-12
- **Modificadores**: 64

---

## 🎯 Insights para el Sistema de Inventario

### 1. Complejidad de Recetas
- ✅ Cada producto tiene receta detallada con cantidades exactas
- ✅ Existen subrecetas (ingredientes compuestos)
- ✅ Los modificadores afectan ingredientes y costos
- ⚠️ Necesidad de calcular costos en cascada (subreceta → receta → producto)

### 2. Control de Costos
- ✅ Todos los ingredientes tienen precio
- ✅ Los costos de productos están calculados
- ✅ Los márgenes están definidos
- ⚠️ Los precios cambian → necesidad de actualizar costos automáticamente

### 3. Gestión de Stock
- ❌ No hay información de stock actual en el archivo
- ❌ No hay stock mínimo/máximo definido
- ❌ No hay información de proveedores
- 🎯 El sistema debe permitir configurar estos valores

### 4. Categorización
- ✅ Ingredientes bien categorizados
- ✅ Productos bien categorizados
- ✅ Unidades de medida consistentes
- ✅ Fácil de importar al sistema

### 5. Descuento Automático
- ✅ Con las recetas exactas, se puede descontar ingredientes al crear pedidos
- ✅ Se puede verificar disponibilidad antes de confirmar
- ⚠️ Debe considerar modificadores del cliente

---

## 🚀 Plan de Importación

### Fase 1: Importar Ingredientes
```typescript
// Leer hoja "Ingredientes"
// Para cada fila:
{
  nombre: "Carne Molida 80/20",
  categoria: "PROTEINAS",
  unidadMedida: "KILO",
  precioPorUnidad: 42.00,
  stockActual: 0, // A configurar manualmente
  stockMinimo: 0, // A configurar manualmente
  stockMaximo: 0, // A configurar manualmente
  activo: true
}
```

### Fase 2: Importar Subrecetas
```typescript
// Leer hoja "Subrecetas"
// Crear ingredientes compuestos:
{
  nombre: "Carne Hamburguesa",
  esSubreceta: true,
  ingredientes: [
    { ingredienteId: "carne-molida", cantidad: 5, unidad: "KILO" },
    { ingredienteId: "condimento-burger", cantidad: 0.2, unidad: "KILO" },
    // ...
  ],
  rendimiento: 5, // kg
  costoTotal: 370.89
}
```

### Fase 3: Importar Recetas de Productos
```typescript
// Leer hojas "Burgers", "Parrilla", "Freidora", etc.
// Para cada producto:
{
  nombre: "Burger Cheese",
  productoId: "prod-burger-cheese", // ID del producto en el menú
  categoria: "BURGERS",
  ingredientes: [
    { ingredienteId: "pan-hamburguesa", cantidad: 1, unidad: "PIEZA" },
    { ingredienteId: "carne-hamburguesa", cantidad: 1, unidad: "PIEZA" },
    { ingredienteId: "queso-americano", cantidad: 0.013, unidad: "KILO" },
    // ...
  ],
  costoTotal: 23.91
}
```

### Fase 4: Importar Modificadores
```typescript
// Leer hoja "Lista de modificadores"
// Vincular con sistema de personalizaciones existente
{
  producto: "BURGERS",
  modificador: "EXTRA QUESO",
  ingredienteAfectado: "queso-americano",
  cantidadExtra: 0.018,
  precioExtra: 10
}
```

---

## ✅ Validaciones Necesarias

### Al Importar
- ✅ Verificar que no haya ingredientes duplicados
- ✅ Validar que precios sean > 0
- ✅ Validar que cantidades sean > 0
- ✅ Verificar que unidades de medida sean válidas
- ✅ Validar que todas las referencias de ingredientes existan

### Integridad de Datos
- ✅ Todas las recetas deben tener al menos 1 ingrediente
- ✅ Todos los ingredientes de recetas deben existir en la colección de ingredientes
- ✅ Los costos calculados deben coincidir con la suma de ingredientes
- ✅ Las subrecetas deben estar marcadas correctamente

---

## 📝 Recomendaciones

### 1. Stock Inicial
- Realizar conteo físico completo antes de empezar
- Configurar stock mínimo basado en consumo promedio de 3 días
- Configurar stock máximo basado en capacidad de almacenamiento

### 2. Proveedores
- Identificar proveedor principal de cada categoría
- Registrar información de contacto
- Establecer frecuencia de compras

### 3. Precios
- Actualizar precios mensualmente
- Mantener historial de cambios de precios
- Recalcular costos de productos cuando cambien precios

### 4. Categorización Adicional
- Agregar subcategorías si es necesario
- Marcar ingredientes perecederos vs no perecederos
- Identificar ingredientes críticos (alta rotación)

---

**Documento creado**: 10 de Febrero de 2025
**Analista**: Jarvis AI Agent Manager
**Proyecto**: Old Texas BBQ - CRM
**Archivo fuente**: `Copia de 02-Costeo de recetas.xlsx`
