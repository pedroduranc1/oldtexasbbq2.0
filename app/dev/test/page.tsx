'use client';
import { useState, useEffect } from 'react';
import { notificacionesService } from '@/lib/services/notificaciones.service';
import { NotificationListener } from '@/components/notifications/notification-listener';
import {
  ShoppingCart,
  Bell,
  Package,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';

interface Ticket {
  id: string;
  productos: string[];
  total: number;
  fecha: Date;
}

export default function TestNotificationsPage() {
  const [loading, setLoading] = useState(false);
  const [lastTicket, setLastTicket] = useState<Ticket | null>(null);
  const [firebaseError, setFirebaseError] = useState<string | null>(null);

  useEffect(() => {
    // Verificar que Firebase esté funcionando
    try {
      // Intentar acceder a la configuración de Firebase
      const config = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      };

      if (!config.apiKey || config.apiKey.includes('your-')) {
        setFirebaseError('Firebase no está configurado correctamente');
      }
    } catch (error: any) {
      setFirebaseError(error.message);
    }
  }, []);

  const crearTicketCompra = async () => {
    try {
      setLoading(true);

      // Simular creación de ticket
      const ticket: Ticket = {
        id: `TICKET-${Date.now()}`,
        productos: ['Brisket 1kg', 'Costillas BBQ', 'Salsa Especial'],
        total: 450.0,
        fecha: new Date(),
      };

      setLastTicket(ticket);

      // Crear notificación en Firestore
      await notificacionesService.create({
        tipo: 'nuevo_pedido',
        titulo: '🛒 Nuevo Ticket de Compra',
        mensaje: `Ticket ${ticket.id} - Total: $${ticket.total.toFixed(2)} - Productos: ${ticket.productos.join(', ')}`,
        leida: false,
        prioridad: 'alta',
        timestamp: new Date() as any,
      });

      console.log('✅ Ticket creado y notificación enviada:', ticket.id);
      setFirebaseError(null);
    } catch (error: any) {
      console.error('❌ Error al crear ticket:', error);
      setFirebaseError(error.message);
      alert('Error al crear ticket: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-8">
      {/* Listener de notificaciones en tiempo real */}
      <NotificationListener />

      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-primary flex items-center justify-center gap-3">
            <Bell className="h-10 w-10" />
            Test de Notificaciones en Tiempo Real
          </h1>
          <p className="text-muted-foreground">
            Crea un ticket en esta ventana y mira la notificación aparecer en
            otro navegador
          </p>
        </div>

        {/* Estado de Firebase */}
        {firebaseError ? (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-1" />
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-900 dark:text-yellow-200 mb-2">
                  Advertencia de Configuración
                </h3>
                <p className="text-yellow-800 dark:text-yellow-300 text-sm mb-3">
                  {firebaseError}
                </p>
                <p className="text-yellow-700 dark:text-yellow-400 text-xs">
                  Verifica que las variables de entorno en{' '}
                  <code className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">
                    .env
                  </code>{' '}
                  estén configuradas correctamente. Después de cambiar las
                  variables, reinicia el servidor.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              <p className="text-green-800 dark:text-green-300 font-medium">
                Firebase está configurado y listo para usar
              </p>
            </div>
          </div>
        )}

        {/* Instrucciones */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-200 mb-3">
            📋 Instrucciones de Prueba
          </h2>
          <ol className="space-y-2 text-blue-800 dark:text-blue-300">
            <li>
              <strong>1.</strong> Abre esta página en dos navegadores diferentes
              (o dos ventanas en incógnito)
            </li>
            <li>
              <strong>2.</strong> Haz clic en "Crear Ticket de Compra" en una
              ventana
            </li>
            <li>
              <strong>3.</strong> Observa cómo aparece la notificación toast en
              la otra ventana automáticamente
            </li>
            <li>
              <strong>4.</strong> La notificación es en tiempo real gracias a
              Firestore onSnapshot
            </li>
          </ol>
        </div>

        {/* Botón crear ticket */}
        <div className="bg-card rounded-xl shadow-lg p-8 border border-border">
          <div className="flex flex-col items-center gap-6">
            <ShoppingCart className="h-16 w-16 text-primary" />
            <h2 className="text-2xl font-bold">Crear Ticket de Compra</h2>
            <p className="text-muted-foreground text-center max-w-md">
              Simula la creación de un ticket de compra. Esto generará una
              notificación que aparecerá en todas las ventanas abiertas.
            </p>
            <button
              onClick={crearTicketCompra}
              disabled={loading}
              className="px-8 py-4 bg-primary text-primary-foreground rounded-lg font-semibold text-lg hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                  Creando...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Crear Ticket de Compra
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Último ticket creado */}
        {lastTicket && (
          <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-green-900 dark:text-green-200 mb-3">
              ✅ Último Ticket Creado
            </h3>
            <div className="space-y-2 text-green-800 dark:text-green-300">
              <p>
                <strong>ID:</strong> {lastTicket.id}
              </p>
              <p>
                <strong>Total:</strong> ${lastTicket.total.toFixed(2)}
              </p>
              <p>
                <strong>Productos:</strong>
              </p>
              <ul className="list-disc list-inside ml-4">
                {lastTicket.productos.map((producto, idx) => (
                  <li key={idx}>{producto}</li>
                ))}
              </ul>
              <p>
                <strong>Fecha:</strong> {lastTicket.fecha.toLocaleString()}
              </p>
            </div>
          </div>
        )}

        {/* Info adicional */}
        <div className="bg-muted rounded-lg p-6 text-sm text-muted-foreground">
          <h3 className="font-semibold text-foreground mb-2">
            🔧 Detalles Técnicos
          </h3>
          <ul className="space-y-1 list-disc list-inside">
            <li>
              Las notificaciones se almacenan en Firestore colección
              "notificaciones"
            </li>
            <li>
              El componente NotificationListener usa onSnapshot para escuchar
              cambios
            </li>
            <li>
              Cuando se crea una notificación, se propaga a todos los clientes
            </li>
            <li>
              Las notificaciones aparecen como toast en la esquina superior
              derecha
            </li>
            <li>Incluye sonido y animación para mejor UX</li>
          </ul>
        </div>

        {/* Información de configuración */}
        <div className="bg-card rounded-lg p-6 border border-border">
          <h3 className="font-semibold mb-3">🔍 Información de Debug</h3>
          <div className="space-y-2 text-sm font-mono">
            <p>
              <strong>Project ID:</strong>{' '}
              {process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'No configurado'}
            </p>
            <p>
              <strong>Auth Domain:</strong>{' '}
              {process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'No configurado'}
            </p>
            <p>
              <strong>API Key:</strong>{' '}
              {process.env.NEXT_PUBLIC_FIREBASE_API_KEY
                ? '✅ Configurado'
                : '❌ No configurado'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
