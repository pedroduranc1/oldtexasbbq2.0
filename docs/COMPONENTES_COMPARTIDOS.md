# 📦 Componentes Compartidos - Old Texas BBQ CRM

Documentación completa de todos los componentes UI, utilidades y hooks personalizados del proyecto.

## 📋 Índice

1. [Componentes UI](#componentes-ui)
2. [Utilidades](#utilidades)
3. [Hooks Personalizados](#hooks-personalizados)
4. [Página de Demostración](#página-de-demostración)

---

## 🎨 Componentes UI

### Componentes de shadcn/ui

Estos componentes ya están instalados y listos para usar:

#### Button
```tsx
import { Button } from '@/components/ui/button';

// Variantes
<Button variant="default">Default</Button>
<Button variant="destructive">Destructive</Button>
<Button variant="outline">Outline</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>

// Tamaños
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="icon">🔥</Button>

// Estados
<Button disabled>Disabled</Button>
<Button><Package className="mr-2 h-4 w-4" />Con Icono</Button>
```

#### Input
```tsx
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input id="email" type="email" placeholder="correo@ejemplo.com" />
</div>
```

#### Select
```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

<Select>
  <SelectTrigger>
    <SelectValue placeholder="Selecciona una opción" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Opción 1</SelectItem>
    <SelectItem value="option2">Opción 2</SelectItem>
  </SelectContent>
</Select>
```

#### Card
```tsx
import { Card } from '@/components/ui/card';

<Card className="p-6">
  <h3 className="text-lg font-semibold">Título</h3>
  <p>Contenido de la tarjeta</p>
</Card>
```

#### Badge
```tsx
import { Badge } from '@/components/ui/badge';

<Badge>Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="destructive">Destructive</Badge>
<Badge variant="outline">Outline</Badge>
```

#### Dialog (Modal)
```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

<Dialog>
  <DialogTrigger asChild>
    <Button>Abrir Modal</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Título del Modal</DialogTitle>
    </DialogHeader>
    <p>Contenido del modal</p>
  </DialogContent>
</Dialog>
```

#### AlertDialog (ConfirmDialog)
```tsx
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive">Eliminar</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
      <AlertDialogDescription>
        Esta acción no se puede deshacer.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancelar</AlertDialogCancel>
      <AlertDialogAction>Continuar</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

#### Tabs
```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

<Tabs defaultValue="tab1">
  <TabsList>
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">Contenido Tab 1</TabsContent>
  <TabsContent value="tab2">Contenido Tab 2</TabsContent>
</Tabs>
```

#### Skeleton (Loading placeholders)
```tsx
import { Skeleton } from '@/components/ui/skeleton';

<div className="space-y-3">
  <Skeleton className="h-4 w-full" />
  <Skeleton className="h-4 w-3/4" />
  <Skeleton className="h-4 w-1/2" />
</div>
```

### Componentes Personalizados

#### Spinner / LoadingOverlay
```tsx
import { Spinner, LoadingOverlay } from '@/components/ui/spinner';

// Spinner básico
<Spinner size="md" text="Cargando..." />

// Tamaños: sm, md, lg, xl
<Spinner size="sm" />
<Spinner size="lg" text="Procesando..." />

// Loading Overlay (fullscreen)
{isLoading && <LoadingOverlay text="Guardando cambios..." />}
```

**Casos de uso:**
- Spinner en componentes específicos
- LoadingOverlay para operaciones que bloquean toda la pantalla

#### EmptyState
```tsx
import { EmptyState } from '@/components/ui/empty-state';
import { Package } from 'lucide-react';

<EmptyState
  icon={Package}
  title="No hay pedidos pendientes"
  description="Todos los pedidos han sido procesados."
  action={{
    label: 'Crear Pedido',
    onClick: () => router.push('/pedidos/nuevo'),
  }}
/>
```

**Casos de uso:**
- Listas vacías
- Resultados de búsqueda sin coincidencias
- Estados iniciales

#### ErrorBoundary
```tsx
import { ErrorBoundary } from '@/components/ui/error-boundary';

// Envolver componentes que pueden fallar
<ErrorBoundary>
  <ComponenteQuePodriaFallar />
</ErrorBoundary>

// Con fallback personalizado
<ErrorBoundary
  fallback={<div>Ocurrió un error. Intenta recargar.</div>}
  onError={(error, errorInfo) => {
    console.error('Error capturado:', error, errorInfo);
  }}
>
  <ComponenteQuePodriaFallar />
</ErrorBoundary>
```

**Casos de uso:**
- Proteger rutas completas
- Aislar componentes complejos
- Evitar que un error en un componente rompa toda la app

---

## 🛠️ Utilidades

### Formatters (`lib/utils/formatters.ts`)

#### Moneda
```tsx
import { formatCurrency } from '@/lib/utils/formatters';

formatCurrency(12345.67); // "$12,345.67"
```

#### Números
```tsx
import { formatNumber, formatPercent } from '@/lib/utils/formatters';

formatNumber(1234567, 2); // "1,234,567.00"
formatPercent(85.5); // "85.5%"
```

#### Fechas
```tsx
import { formatDate, formatDateTime, formatTime, formatRelativeTime } from '@/lib/utils/formatters';

formatDate(new Date()); // "05 de enero, 2026"
formatDateTime(new Date()); // "05/ene/2026 14:30"
formatTime(new Date()); // "14:30"
formatRelativeTime(new Date(Date.now() - 3600000)); // "Hace 1 hora"
```

#### Otros
```tsx
import { formatPhone, formatFileSize, capitalize, truncateText } from '@/lib/utils/formatters';

formatPhone('5551234567'); // "(555) 123-4567"
formatFileSize(1548576); // "1.48 MB"
capitalize('hola mundo'); // "Hola Mundo"
truncateText('Texto muy largo...', 10); // "Texto muy..."
```

### Validators (`lib/utils/validators.ts`)

#### Email y Teléfono
```tsx
import { validateEmail, validatePhone } from '@/lib/utils/validators';

validateEmail('correo@ejemplo.com'); // true
validatePhone('5551234567'); // true
```

#### Contraseñas y Montos
```tsx
import { validatePassword, validateAmount } from '@/lib/utils/validators';

validatePassword('MiPass123'); // true (min 8 caracteres, letra + número)
validateAmount(123.45); // true (positivo, máx 2 decimales)
```

#### Campos requeridos y rangos
```tsx
import { validateRequired, validateRange, validateMinLength, validateMaxLength } from '@/lib/utils/validators';

validateRequired(''); // false
validateRequired('texto'); // true
validateRange(5, 1, 10); // true
validateMinLength('hola', 3); // true
validateMaxLength('hola', 10); // true
```

#### Sanitización
```tsx
import { sanitizeString } from '@/lib/utils/validators';

sanitizeString('<script>alert("xss")</script>'); // "scriptalert(\"xss\")/script"
```

### Constants (`lib/utils/constants.ts`)

```tsx
import {
  ESTADOS_PEDIDO,
  ROLES,
  METODOS_PAGO,
  CANALES_VENTA,
  TIPOS_TURNO,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
} from '@/lib/utils/constants';

// Ejemplo: Mostrar badge con color según estado
const estadoPedido = 'pendiente';
const { label, color } = ESTADOS_PEDIDO[estadoPedido];
// label: "Pendiente", color: "bg-yellow-500"

// Mensajes de error consistentes
toast.error(ERROR_MESSAGES.REQUIRED_FIELD);
toast.error(ERROR_MESSAGES.INVALID_EMAIL);
toast.success(SUCCESS_MESSAGES.CREATED);
```

---

## 🪝 Hooks Personalizados

### useDebounce (`lib/hooks/useDebounce.ts`)

Útil para búsquedas en tiempo real y optimizar renders.

```tsx
import { useState } from 'react';
import { useDebounce } from '@/lib/hooks/useDebounce';

function SearchComponent() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 500);

  // debouncedSearch se actualiza 500ms después de que el usuario deje de escribir
  useEffect(() => {
    if (debouncedSearch) {
      // Hacer búsqueda en la API
      searchAPI(debouncedSearch);
    }
  }, [debouncedSearch]);

  return (
    <Input
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      placeholder="Buscar..."
    />
  );
}
```

### useLocalStorage (`lib/hooks/useLocalStorage.ts`)

Persiste el estado en localStorage automáticamente.

```tsx
import { useLocalStorage } from '@/lib/hooks/useLocalStorage';

function Counter() {
  const [count, setCount] = useLocalStorage('counter', 0);

  return (
    <div>
      <p>Count: {count}</p>
      <Button onClick={() => setCount(count + 1)}>Incrementar</Button>
      <Button onClick={() => setCount(0)}>Reset</Button>
    </div>
  );
  // El valor persiste al recargar la página
}
```

### useMediaQuery (`lib/hooks/useMediaQuery.ts`)

Detecta el tamaño de pantalla para responsive design.

```tsx
import { useIsMobile, useIsTablet, useIsDesktop, useMediaQuery } from '@/lib/hooks/useMediaQuery';

function ResponsiveComponent() {
  const isMobile = useIsMobile(); // < 768px
  const isTablet = useIsTablet(); // 768px - 1024px
  const isDesktop = useIsDesktop(); // > 1024px

  // O custom query
  const isLargeScreen = useMediaQuery('(min-width: 1280px)');

  return (
    <div>
      {isMobile && <MobileLayout />}
      {isTablet && <TabletLayout />}
      {isDesktop && <DesktopLayout />}
    </div>
  );
}
```

---

## 🎯 Página de Demostración

Visita `/componentes` (solo Admin) para ver:

- ✅ Todos los componentes en acción
- ✅ Ejemplos de uso interactivos
- ✅ Testing de validaciones en vivo
- ✅ Demostración de hooks personalizados
- ✅ Formatters funcionando en tiempo real

La página está organizada en tabs:
1. **Botones** - Todas las variantes y tamaños
2. **Inputs** - Formularios con validación en vivo
3. **Feedback** - Badges, Alerts, Dialogs, EmptyState
4. **Loading** - Spinners, Overlays, Skeletons
5. **Utilidades** - Formatters en acción
6. **Hooks** - Demostración de useDebounce, useLocalStorage, useMediaQuery

---

## 📝 Mejores Prácticas

### Componentes

1. **Usa componentes de shadcn/ui** cuando estén disponibles
2. **Mantén componentes pequeños** (< 200 líneas)
3. **Tipado estricto** con TypeScript
4. **Props descriptivas** con interfaces claras

### Utilidades

1. **Importa solo lo necesario** para optimizar bundle
2. **Reutiliza validators** en forms y APIs
3. **Usa constants** en lugar de hardcodear valores
4. **Formatters consistentes** en toda la app

### Hooks

1. **useDebounce** para búsquedas y inputs
2. **useLocalStorage** para preferencias del usuario
3. **useMediaQuery** para responsive logic compleja
4. **Custom hooks** para lógica reutilizable

---

## 🚀 Próximos Pasos

Para agregar nuevos componentes:

1. Verifica si existe en [shadcn/ui](https://ui.shadcn.com/)
2. Si no existe, créalo en `components/ui/`
3. Documenta el uso en esta guía
4. Agrega ejemplo en `/componentes`

---

**Última actualización:** Enero 2026
**Versión:** 1.0
**Mantenedor:** Equipo Old Texas BBQ
