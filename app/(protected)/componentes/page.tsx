'use client';

import { useState } from 'react';
import { Package, Search, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';

// Componentes UI
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Spinner, LoadingOverlay } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

// Hooks personalizados
import { useDebounce } from '@/lib/hooks/useDebounce';
import { useLocalStorage } from '@/lib/hooks/useLocalStorage';
import { useIsMobile, useIsTablet, useIsDesktop } from '@/lib/hooks/useMediaQuery';

// Utilidades
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatTime,
  formatPhone,
  formatPercent,
  formatRelativeTime,
  formatFileSize,
  capitalize,
  truncateText,
} from '@/lib/utils/formatters';
import {
  validateEmail,
  validatePhone,
  validatePassword,
  validateAmount,
  validateRequired,
} from '@/lib/utils/validators';
import { toast } from 'sonner';

export default function ComponentesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [contador, setContador] = useLocalStorage('demo-contador', 0);
  const [showOverlay, setShowOverlay] = useState(false);
  const [emailTest, setEmailTest] = useState('');
  const [phoneTest, setPhoneTest] = useState('');

  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isDesktop = useIsDesktop();

  const handleTestValidations = () => {
    const email = validateEmail(emailTest);
    const phone = validatePhone(phoneTest);

    toast(
      email && phone ? '✅ Validaciones correctas' : '❌ Validaciones incorrectas',
      {
        description: `Email: ${email ? 'válido' : 'inválido'}, Teléfono: ${phone ? 'válido' : 'inválido'}`,
      }
    );
  };

  return (
    <div className="container mx-auto py-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Componentes del Sistema</h1>
        <p className="text-muted-foreground">
          Biblioteca completa de componentes UI, utilidades y hooks personalizados
        </p>

        {/* Responsive Indicators */}
        <div className="flex gap-2 mt-4">
          {isMobile && <Badge variant="default">📱 Móvil</Badge>}
          {isTablet && <Badge variant="secondary">💻 Tablet</Badge>}
          {isDesktop && <Badge>🖥️ Desktop</Badge>}
        </div>
      </div>

      <Tabs defaultValue="buttons" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
          <TabsTrigger value="buttons">Botones</TabsTrigger>
          <TabsTrigger value="inputs">Inputs</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
          <TabsTrigger value="loading">Loading</TabsTrigger>
          <TabsTrigger value="utils">Utilidades</TabsTrigger>
          <TabsTrigger value="hooks">Hooks</TabsTrigger>
        </TabsList>

        {/* Tab: Botones */}
        <TabsContent value="buttons" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Variantes de Botones</h3>
            <div className="flex flex-wrap gap-3">
              <Button variant="default">Default</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="link">Link</Button>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Tamaños de Botones</h3>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm">Small</Button>
              <Button size="default">Default</Button>
              <Button size="lg">Large</Button>
              <Button size="icon">🔥</Button>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Estados de Botones</h3>
            <div className="flex flex-wrap gap-3">
              <Button disabled>Disabled</Button>
              <Button>
                <Package className="mr-2 h-4 w-4" />
                Con Icono
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* Tab: Inputs */}
        <TabsContent value="inputs" className="space-y-4">
          <Card className="p-6 space-y-4">
            <h3 className="text-lg font-semibold">Formularios</h3>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="correo@ejemplo.com"
                value={emailTest}
                onChange={(e) => setEmailTest(e.target.value)}
              />
              {emailTest && (
                <p className="text-sm">
                  {validateEmail(emailTest) ? (
                    <span className="text-green-600">✓ Email válido</span>
                  ) : (
                    <span className="text-red-600">✗ Email inválido</span>
                  )}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="5551234567"
                value={phoneTest}
                onChange={(e) => setPhoneTest(e.target.value)}
              />
              {phoneTest && (
                <p className="text-sm">
                  {validatePhone(phoneTest) ? (
                    <span className="text-green-600">✓ Teléfono válido (10 dígitos)</span>
                  ) : (
                    <span className="text-red-600">✗ Teléfono inválido</span>
                  )}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="select">Select</Label>
              <Select>
                <SelectTrigger id="select">
                  <SelectValue placeholder="Selecciona una opción" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="option1">Opción 1</SelectItem>
                  <SelectItem value="option2">Opción 2</SelectItem>
                  <SelectItem value="option3">Opción 3</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="terms" />
              <Label htmlFor="terms">Acepto los términos y condiciones</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch id="airplane-mode" />
              <Label htmlFor="airplane-mode">Modo avión</Label>
            </div>

            <Button onClick={handleTestValidations}>
              Validar Formulario
            </Button>
          </Card>
        </TabsContent>

        {/* Tab: Feedback */}
        <TabsContent value="feedback" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Badges</h3>
            <div className="flex flex-wrap gap-2">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="destructive">Destructive</Badge>
              <Badge variant="outline">Outline</Badge>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <h3 className="text-lg font-semibold">Alerts</h3>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Información</AlertTitle>
              <AlertDescription>
                Este es un mensaje informativo estándar.
              </AlertDescription>
            </Alert>

            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                Ocurrió un error al procesar tu solicitud.
              </AlertDescription>
            </Alert>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Alert Dialog (Confirm)</h3>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">Eliminar Pedido</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción no se puede deshacer. El pedido será eliminado permanentemente.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => toast.success('Pedido eliminado')}>
                    Continuar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Empty State</h3>
            <EmptyState
              icon={Package}
              title="No hay pedidos pendientes"
              description="Todos los pedidos han sido procesados. Crea un nuevo pedido para comenzar."
              action={{
                label: 'Crear Pedido',
                onClick: () => toast.info('Navegando a crear pedido...'),
              }}
            />
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Toast Notifications</h3>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => toast('Notificación simple')}>
                Simple
              </Button>
              <Button onClick={() => toast.success('Operación exitosa')}>
                Success
              </Button>
              <Button onClick={() => toast.error('Ocurrió un error')}>
                Error
              </Button>
              <Button onClick={() => toast.warning('Advertencia')}>
                Warning
              </Button>
              <Button onClick={() => toast.info('Información')}>
                Info
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* Tab: Loading */}
        <TabsContent value="loading" className="space-y-4">
          <Card className="p-6 space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Spinners</h3>
              <div className="flex flex-wrap items-end gap-8">
                <Spinner size="sm" />
                <Spinner size="md" text="Cargando..." />
                <Spinner size="lg" />
                <Spinner size="xl" text="Procesando pedido..." />
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-lg font-semibold mb-4">Loading Overlay</h3>
              <Button onClick={() => {
                setShowOverlay(true);
                setTimeout(() => setShowOverlay(false), 2000);
              }}>
                Mostrar Overlay (2s)
              </Button>
              {showOverlay && <LoadingOverlay text="Guardando cambios..." />}
            </div>

            <Separator />

            <div>
              <h3 className="text-lg font-semibold mb-4">Skeletons</h3>
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Tab: Utilidades */}
        <TabsContent value="utils" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Formatters</h3>
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <span className="text-muted-foreground">Moneda:</span>
                <span className="font-mono">{formatCurrency(12345.67)}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <span className="text-muted-foreground">Porcentaje:</span>
                <span className="font-mono">{formatPercent(85.5)}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <span className="text-muted-foreground">Fecha:</span>
                <span className="font-mono">{formatDate(new Date())}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <span className="text-muted-foreground">Fecha y Hora:</span>
                <span className="font-mono">{formatDateTime(new Date())}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <span className="text-muted-foreground">Hora:</span>
                <span className="font-mono">{formatTime(new Date())}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <span className="text-muted-foreground">Teléfono:</span>
                <span className="font-mono">{formatPhone('5551234567')}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <span className="text-muted-foreground">Tiempo relativo:</span>
                <span className="font-mono">{formatRelativeTime(new Date(Date.now() - 3600000))}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <span className="text-muted-foreground">Tamaño archivo:</span>
                <span className="font-mono">{formatFileSize(1548576)}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <span className="text-muted-foreground">Capitalizar:</span>
                <span className="font-mono">{capitalize('hola mundo')}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <span className="text-muted-foreground">Truncar:</span>
                <span className="font-mono">{truncateText('Este es un texto muy largo que será truncado', 30)}</span>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Tab: Hooks */}
        <TabsContent value="hooks" className="space-y-4">
          <Card className="p-6 space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">useDebounce</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Útil para búsquedas en tiempo real. Espera 500ms después de que el usuario deje de escribir.
              </p>
              <Input
                placeholder="Escribe para buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <p className="text-sm mt-2">
                <span className="text-muted-foreground">Valor inmediato:</span> {searchTerm || '(vacío)'}
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Valor debounced:</span> {debouncedSearch || '(vacío)'}
              </p>
            </div>

            <Separator />

            <div>
              <h3 className="text-lg font-semibold mb-2">useLocalStorage</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Persiste el estado en localStorage automáticamente.
              </p>
              <div className="flex items-center gap-4">
                <Button onClick={() => setContador(contador + 1)}>
                  Incrementar
                </Button>
                <Button variant="outline" onClick={() => setContador(contador - 1)}>
                  Decrementar
                </Button>
                <Button variant="destructive" onClick={() => setContador(0)}>
                  Reset
                </Button>
              </div>
              <p className="text-2xl font-bold mt-4">
                Contador: {contador}
              </p>
              <p className="text-xs text-muted-foreground">
                Este valor persiste al recargar la página
              </p>
            </div>

            <Separator />

            <div>
              <h3 className="text-lg font-semibold mb-2">useMediaQuery</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Detecta el tamaño de pantalla actual.
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {isMobile ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-muted-foreground" />}
                  <span>Móvil (&lt; 768px)</span>
                </div>
                <div className="flex items-center gap-2">
                  {isTablet ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-muted-foreground" />}
                  <span>Tablet (768px - 1024px)</span>
                </div>
                <div className="flex items-center gap-2">
                  {isDesktop ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-muted-foreground" />}
                  <span>Desktop (&gt; 1024px)</span>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Error Boundary Demo */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Error Boundary</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Captura errores de JavaScript y muestra una interfaz de respaldo amigable.
        </p>
        <ErrorBoundary>
          <div className="p-4 bg-muted rounded">
            <p>Este contenido está protegido por ErrorBoundary</p>
          </div>
        </ErrorBoundary>
      </Card>
    </div>
  );
}
