# Sistema de Layout - Old Texas BBQ CRM

Sistema completo de navegación y layout implementado en la FASE 10.

## 📐 Arquitectura

### Componentes Principales

#### 1. **AppLayout** (`components/layout/AppLayout.tsx`)
Componente principal que integra todos los elementos del layout:
- Sidebar con navegación
- Navbar superior
- Breadcrumbs dinámicos
- Contenido de la página
- Footer

```tsx
import { AppLayout } from '@/components/layout';

<AppLayout>
  {/* Tu contenido aquí */}
</AppLayout>
```

#### 2. **Sidebar** (`components/layout/Sidebar.tsx`)
Navegación lateral con las siguientes características:
- **Filtrado por roles**: Solo muestra las opciones disponibles para el rol del usuario
- **Responsivo**:
  - Desktop: Siempre visible con opción de colapsar
  - Móvil: Overlay con botón hamburger
- **Estado colapsable**: Se puede minimizar en desktop
- **Info del usuario**: Muestra avatar y rol en el footer del sidebar

**Navegación disponible por rol:**

| Ruta | Admin | Encargado | Cajera | Cocina | Repartidor |
|------|-------|-----------|--------|--------|------------|
| Dashboard | ✅ | ✅ | ❌ | ❌ | ❌ |
| Pedidos | ✅ | ✅ | ✅ | ❌ | ❌ |
| Cocina | ✅ | ✅ | ❌ | ✅ | ❌ |
| Reparto | ✅ | ✅ | ❌ | ❌ | ✅ |
| Repartidores | ✅ | ✅ | ❌ | ❌ | ❌ |
| Turnos | ✅ | ✅ | ✅ | ❌ | ❌ |
| Corte de Caja | ✅ | ✅ | ✅ | ❌ | ❌ |
| Colonias | ✅ | ✅ | ❌ | ❌ | ❌ |
| Bitácora | ✅ | ✅ | ❌ | ❌ | ❌ |

#### 3. **Navbar** (`components/layout/Navbar.tsx`)
Barra de navegación superior con:
- **Botón de menú móvil**: Abre/cierra el sidebar en móvil
- **Logo**: Visible solo en móvil
- **Toggle de tema**: Cambio entre light/dark mode
- **Notificaciones**: Badge con contador
- **Menú de usuario**: Dropdown con:
  - Información del usuario (nombre, email, rol)
  - Perfil
  - Cambiar Contraseña
  - Cerrar Sesión

#### 4. **Breadcrumbs** (`components/layout/Breadcrumbs.tsx`)
Migas de pan dinámicas que se generan automáticamente según la ruta:
- Ícono de home que lleva a `/dashboard`
- Segmentos de la ruta como links clicables
- Último segmento resaltado (no clicable)
- Nombres legibles mapeados desde las rutas

**Ejemplo:**
```
🏠 > Dashboard > Pedidos > Nuevo Pedido
```

#### 5. **Footer** (`components/layout/Footer.tsx`)
Pie de página con:
- Copyright y año actual
- Links rápidos (Dashboard, Bitácora, Perfil)
- "Hecho con ❤️ en Piedras Negras"
- Responsive design

## 🎨 Responsive Design

### Desktop (≥ 1024px)
- Sidebar siempre visible
- Contenido con padding-left de 256px (64px cuando está colapsado)
- Navbar completo
- Footer full width

### Tablet (768px - 1023px)
- Sidebar con overlay
- Botón hamburger en navbar
- Breadcrumbs completos
- Footer adaptado

### Móvil (< 768px)
- Sidebar con overlay completo
- Logo visible en navbar
- Breadcrumbs compactos
- Footer en columna

## 🔐 Sistema de Roles

El sidebar filtra automáticamente las opciones de navegación según el rol del usuario autenticado:

```typescript
// Ejemplo: Definición de navegación
const navigation: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['admin', 'encargado'], // Solo admin y encargado pueden ver
  },
  // ... más items
];
```

## 🎯 Uso

### En el Layout Protegido
El `AppLayout` ya está integrado en `app/(protected)/layout.tsx`:

```tsx
'use client';
import { AppLayout } from '@/components/layout/AppLayout';

export default function ProtectedLayout({ children }) {
  // ... validación de autenticación

  return (
    <>
      <NotificationListener />
      <AppLayout>{children}</AppLayout>
      <NotificationCenter />
    </>
  );
}
```

### En Páginas Individuales
No necesitas hacer nada especial, solo escribe tu contenido:

```tsx
export default function MiPagina() {
  return (
    <div>
      <h1>Mi Página</h1>
      {/* Tu contenido aquí */}
    </div>
  );
}
```

El layout se aplica automáticamente a todas las rutas protegidas.

## 📱 Estados del Sidebar

### Desktop
- **Expandido** (default): 256px de ancho
- **Colapsado**: 64px de ancho (solo íconos)
- Botón de toggle en el header

### Móvil
- **Cerrado** (default): Fuera de pantalla
- **Abierto**: Overlay completo con backdrop
- Se cierra al hacer clic en un link o en el backdrop

## 🎨 Tema Dark/Light

El sistema de temas está integrado en el navbar:
- Toggle en el navbar (variant="ghost")
- También disponible como botón flotante con `<ThemeToggle />` (variant="fixed")
- Estados: light, dark
- Persistencia en localStorage con key "old-texas-theme"

## 🔔 Notificaciones

El sistema de notificaciones está integrado en el navbar:
- Badge con contador en tiempo real
- Panel lateral que se abre al hacer clic
- Listener global en el layout protegido

## 📂 Estructura de Archivos

```
components/layout/
├── AppLayout.tsx       # Layout principal
├── Sidebar.tsx         # Navegación lateral
├── Navbar.tsx          # Barra superior
├── Footer.tsx          # Pie de página
├── Breadcrumbs.tsx     # Migas de pan
└── index.ts            # Barrel export
```

## 🚀 Agregar Nueva Ruta a la Navegación

1. Agrega el item en `Sidebar.tsx`:

```typescript
const navigation: NavItem[] = [
  // ... rutas existentes
  {
    title: 'Mi Nueva Sección',
    href: '/mi-nueva-seccion',
    icon: MiIcono, // Importa de lucide-react
    roles: ['admin', 'encargado'], // Roles que pueden acceder
  },
];
```

2. Opcional: Agrega nombre legible en `Breadcrumbs.tsx`:

```typescript
const routeNames: Record<string, string> = {
  // ... rutas existentes
  'mi-nueva-seccion': 'Mi Nueva Sección',
};
```

## 📊 Ventajas del Sistema

✅ **Responsivo**: Funciona perfecto en todos los dispositivos
✅ **Filtrado por roles**: Seguridad integrada en la navegación
✅ **Breadcrumbs automáticos**: No necesitas configurar nada
✅ **Tema integrado**: Dark/Light mode listo para usar
✅ **Notificaciones**: Sistema completo ya integrado
✅ **Mantenible**: Código modular y bien organizado
✅ **TypeScript**: Completamente tipado
✅ **Performance**: Build exitoso, 29 páginas generadas sin errores

## 🎯 Próximos Pasos

El sistema de layout está completo y funcional. Puedes:
1. Agregar más rutas según necesites
2. Personalizar los íconos de navegación
3. Ajustar los breakpoints responsive si es necesario
4. Agregar animaciones adicionales

---

**Implementado en**: FASE 10 - UI/UX Y COMPONENTES COMPARTIDOS ✅
**Build Status**: ✅ 29 páginas generadas exitosamente
**Fecha**: Enero 2026
