# Reporte Semanal de Desarrollo — Old Texas BBQ CRM 2.0
**Semana:** 23 – 27 de junio, 2026
**Desarrollador:** Pedro Durán
**Proyecto:** Old Texas BBQ CRM 2.0
**Rama:** `semana-1-sistema-caja`

---

## Resumen Ejecutivo

Esta semana se completó el **Módulo de Caja** completo del sistema CRM 2.0, incluyendo apertura y cierre de turnos, registro de movimientos de dinero, importación de histórico desde Loyverse (CSV), y el histórico de cortes de caja con justificación de descuadres. Adicionalmente se migró el proyecto a un nuevo repositorio en Firebase (`oldtexasbbq`) y se estructuró su base de datos.

---

## Funcionalidades Entregadas

### 1. Sistema de Turnos de Caja

**Apertura de Turno**
- Fondo inicial por defecto de **$800** (basado en datos históricos reales)
- Detección automática del tipo de turno según hora del sistema (matutino 6–17h / vespertino 17–23h / nocturno 23–6h)
- Validación de turno único — impide abrir dos turnos simultáneos
- Campo obligatorio de justificación cuando el fondo es $0

**Cierre de Turno**
- Sistema de alertas por nivel de descuadre:
  - 🔵 $1–$49: Información
  - 🟡 $50–$199: Advertencia (notas obligatorias)
  - 🔴 $200+: Crítico (notas obligatorias)
- Detección de **turno cruzado** (cajero que abre ≠ cajero que cierra)
- Previsualización del corte antes de confirmar

### 2. Registro de Movimientos

- Ingresos y egresos durante el turno activo
- Catálogo de conceptos centralizado en Firestore (16 conceptos predefinidos)
- Campo de concepto personalizado cuando no aplica ninguno del catálogo
- Historial en tiempo real con ordenamiento por hora

### 3. Resumen de Caja en Tiempo Real

- KPIs en vivo: Fondo Inicial, Total Ingresos, Total Egresos, Efectivo en Caja
- Desglose de egresos por concepto
- Últimos 10 movimientos con tipo, concepto y monto
- Alerta automática cuando el efectivo supera **$6,000** (riesgo operativo)

### 4. Histórico de Cortes (Corte de Caja)

- Tabla completa de todos los turnos cerrados
- Filtros por rango de fecha, tipo de turno y nombre de cajero
- Tarjetas de resumen del periodo: total de turnos, ventas totales, pérdida/ganancia neta, tasa de descuadre
- Desglose de descuadres por cajero
- Highlight visual en rojo para descuadres ≥ $50
- Highlight en ámbar para turnos cruzados
- **Justificación de descuadres**: los managers pueden justificar y documentar descuadres, quedando registrado quién justificó y cuándo

### 5. Importación de Histórico CSV (Loyverse)

- Importación de 49 turnos históricos de mayo–junio 2026
- Parseo robusto del formato de fecha Loyverse (`DD/M/YY HH:MM`, año de 2 dígitos)
- Detección automática de separador (`;`, `,`, `\t`)
- Normalización de acentos en encabezados
- Los turnos importados aparecen correctamente en el histórico con sus descuadres reales

---

## Infraestructura y Base de Datos

### Nuevo Proyecto Firebase (`oldtexasbbq`)

Se estructuró el proyecto Firebase de producción con:

- **16 ConceptosFinancieros** (6 ingresos + 10 egresos)
- **7 Categorías de menú** (brisket, costillas, combos, sides, bebidas, postres, extras)
- **Configuración general** (fondo estándar $800, umbrales de alerta)
- **Reglas de seguridad Firestore** con inmutabilidad en `MovimientosCaja` y `CierresCaja` (audit trail — no se puede editar ni borrar)

### Scripts de Administración

- `scripts/setup-firebase.js` — Seed inicial del proyecto
- `scripts/create-admin.js` — Creación de usuarios administradores vía Admin SDK

---

## Control de Acceso por Rol

| Acción | Admin | Encargado | Cajera | Cocina | Repartidor |
|--------|-------|-----------|--------|--------|------------|
| Abrir turno | ✅ | ✅ | ✅ | ❌ | ❌ |
| Registrar movimiento | ✅ | ✅ | ✅ | ❌ | ❌ |
| Cerrar turno | ✅ | ✅ | ✅ | ❌ | ❌ |
| Ver histórico | ✅ | ✅ | ✅ | ❌ | ❌ |
| Justificar descuadre | ✅ | ✅ | ❌ | ❌ | ❌ |
| Importar CSV | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## Hallazgos del Análisis de Datos Históricos

Con base en los **49 turnos reales** de Loyverse (mayo–junio 2026):

| Métrica | Valor |
|---------|-------|
| Cajeros activos | 2 (Axel Caldera, Ashley) |
| Fondo estándar usado | $800 (>90% de turnos) |
| Pérdida neta del periodo | -$2,630.40 |
| Turnos con descuadre ≥ $50 | Varios (justificables en sistema) |

---

## Correcciones y Bugs Resueltos

| Bug | Causa | Solución |
|-----|-------|----------|
| `setDoc() called with invalid data: undefined` | `encargadoId` enviado como `undefined` a Firestore | Usar spread condicional: solo incluir campo si tiene valor |
| `52 errores — Fila sin fecha válida` | Loyverse exporta fechas como `DD/M/YY` (año 2 dígitos) | Parseo con regex `\d{2,4}` + conversión `2000 + año` |
| Descuadres aparecían como $0.00 | Turnos importados guardados sin campo `corte` | Agregar objeto `corte` completo al guardar en Firestore |
| "Pedro Duran undefined" en detalle turno | `usuario.apellido` es `undefined` en algunos registros | `[nombre, apellido].filter(Boolean).join(' ')` |
| Movimientos no aparecen en histórico | Query `where + orderBy` requiere índice compuesto inexistente | Eliminar `orderBy` del query, ordenar en cliente |

---

## Repositorio

- **GitHub:** [pedroduranc1/oldtexasbbq2.0](https://github.com/pedroduranc1/oldtexasbbq2.0)
- **Rama principal:** `main`
- **Rama de trabajo:** `semana-1-sistema-caja`
- **Commits de la semana:** 2 commits principales, 4,265 líneas agregadas, 25 archivos

---

## Pendientes para la Próxima Semana

- [ ] Configurar variables de entorno en Vercel para producción (`SESSION_SECRET`, Firebase keys)
- [ ] Crear usuario administrador en proyecto `oldtexasbbq`
- [ ] Desplegar reglas de Firestore (`firebase deploy --only firestore:rules`)
- [ ] `app/(protected)/caja/movimientos/page.tsx` — página de movimientos por turno
- [ ] `app/(protected)/caja/cierre/page.tsx` — página de cierre dedicada
- [ ] Vista de solo lectura para roles que solo consultan
- [ ] Movimiento de corrección (patrón de corrección en lugar de edición)
- [ ] Inicio **Fase 2 — Inventario**

---

*Reporte generado el 27 de junio de 2026*
