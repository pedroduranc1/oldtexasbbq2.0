/**
 * Configuración de Sentry para Error Tracking
 *
 * Para habilitar Sentry:
 * 1. npm install @sentry/nextjs
 * 2. npx @sentry/wizard@latest -i nextjs
 * 3. Configurar NEXT_PUBLIC_SENTRY_DSN en .env
 *
 * Este archivo provee una interfaz simple para tracking de errores
 * que funciona con o sin Sentry instalado.
 */

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Tipo para Sentry (opcional si está instalado)
type SentryType = {
  captureException: (error: Error, context?: Record<string, unknown>) => void;
  captureMessage: (message: string, level?: string) => void;
  setUser: (user: { id: string; email?: string; username?: string } | null) => void;
  setTag: (key: string, value: string) => void;
  setContext: (name: string, context: Record<string, unknown>) => void;
  addBreadcrumb: (breadcrumb: {
    category: string;
    message: string;
    level?: string;
    data?: Record<string, unknown>;
  }) => void;
};

// Intentar importar Sentry si está instalado
let Sentry: SentryType | null = null;

// Función para inicializar Sentry dinámicamente
async function initSentry() {
  if (!SENTRY_DSN || !IS_PRODUCTION) {
    return null;
  }

  try {
    const sentryModule = await import('@sentry/nextjs');
    Sentry = sentryModule as unknown as SentryType;
    return Sentry;
  } catch {
    // Sentry no está instalado - usar fallback
    console.info('[Sentry] No instalado - usando fallback de consola');
    return null;
  }
}

// Inicializar al cargar el módulo
if (typeof window !== 'undefined') {
  initSentry();
}

// ================================================
// API de Error Tracking (funciona con o sin Sentry)
// ================================================

/**
 * Capturar una excepción
 */
export function captureException(
  error: Error | unknown,
  context?: Record<string, unknown>
) {
  const errorObj = error instanceof Error ? error : new Error(String(error));

  if (Sentry) {
    Sentry.captureException(errorObj, context);
  } else if (IS_PRODUCTION) {
    // Fallback: enviar a consola en producción
    console.error('[Error Tracker]', errorObj, context);
  } else {
    // En desarrollo, solo mostrar en consola
    console.error('[Dev Error]', errorObj, context);
  }
}

/**
 * Capturar un mensaje (warning, info, etc.)
 */
export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info'
) {
  if (Sentry) {
    Sentry.captureMessage(message, level);
  } else if (IS_PRODUCTION) {
    console[level === 'error' ? 'error' : level === 'warning' ? 'warn' : 'info'](
      `[${level.toUpperCase()}]`,
      message
    );
  }
}

/**
 * Establecer el usuario actual (para tracking de errores por usuario)
 */
export function setUser(user: { id: string; email?: string; rol?: string } | null) {
  if (Sentry) {
    Sentry.setUser(
      user
        ? {
            id: user.id,
            email: user.email,
            username: user.rol,
          }
        : null
    );
  }
}

/**
 * Agregar un tag para filtrar errores
 */
export function setTag(key: string, value: string) {
  if (Sentry) {
    Sentry.setTag(key, value);
  }
}

/**
 * Agregar contexto adicional a los errores
 */
export function setContext(name: string, context: Record<string, unknown>) {
  if (Sentry) {
    Sentry.setContext(name, context);
  }
}

/**
 * Agregar un breadcrumb (rastro de acciones del usuario)
 */
export function addBreadcrumb(
  category: string,
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  data?: Record<string, unknown>
) {
  if (Sentry) {
    Sentry.addBreadcrumb({
      category,
      message,
      level,
      data,
    });
  }
}

// ================================================
// Helpers para Old Texas BBQ
// ================================================

export const ErrorTracker = {
  // Errores de pedidos
  pedidoError: (pedidoId: string, error: Error, accion: string) => {
    setContext('pedido', { pedidoId, accion });
    captureException(error, { pedidoId, accion });
  },

  // Errores de Firebase
  firebaseError: (operacion: string, error: Error) => {
    setTag('firebase_operation', operacion);
    captureException(error, { operacion, servicio: 'firebase' });
  },

  // Errores de pago
  pagoError: (monto: number, metodo: string, error: Error) => {
    setContext('pago', { monto, metodo });
    captureException(error, { monto, metodo, servicio: 'pagos' });
  },

  // Errores de autenticación
  authError: (accion: string, error: Error) => {
    setTag('auth_action', accion);
    captureException(error, { accion, servicio: 'auth' });
  },

  // Error de API
  apiError: (endpoint: string, status: number, error: Error) => {
    setContext('api', { endpoint, status });
    captureException(error, { endpoint, status, servicio: 'api' });
  },

  // Error genérico con contexto
  custom: (categoria: string, error: Error, contexto?: Record<string, unknown>) => {
    setTag('error_category', categoria);
    captureException(error, { categoria, ...contexto });
  },

  // Breadcrumbs predefinidos
  breadcrumb: {
    navigation: (ruta: string) =>
      addBreadcrumb('navigation', `Navegó a ${ruta}`),

    action: (accion: string, data?: Record<string, unknown>) =>
      addBreadcrumb('user', accion, 'info', data),

    api: (endpoint: string, metodo: string) =>
      addBreadcrumb('http', `${metodo} ${endpoint}`),
  },
};

export default ErrorTracker;
