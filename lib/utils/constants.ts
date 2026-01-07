/**
 * Constantes globales del sistema
 * Old Texas BBQ - CRM
 */

import { Rol, EstadoPedido, MetodoPago, CanalVenta, TipoTurno } from '@/lib/types/firestore';

// Estados de pedidos
export const ESTADOS_PEDIDO: Record<EstadoPedido, { label: string; color: string }> = {
  pendiente: { label: 'Pendiente', color: 'bg-yellow-500' },
  en_preparacion: { label: 'En Preparación', color: 'bg-blue-500' },
  listo: { label: 'Listo', color: 'bg-green-500' },
  en_reparto: { label: 'En Reparto', color: 'bg-purple-500' },
  entregado: { label: 'Entregado', color: 'bg-gray-500' },
  cancelado: { label: 'Cancelado', color: 'bg-red-500' },
};

// Roles del sistema
export const ROLES: Record<Rol, { label: string; color: string }> = {
  admin: { label: 'Administrador', color: 'bg-red-500' },
  encargado: { label: 'Encargado', color: 'bg-orange-500' },
  cajera: { label: 'Cajera', color: 'bg-blue-500' },
  cocina: { label: 'Cocina', color: 'bg-green-500' },
  repartidor: { label: 'Repartidor', color: 'bg-purple-500' },
};

// Métodos de pago
export const METODOS_PAGO: Record<MetodoPago, { label: string; icon: string }> = {
  efectivo: { label: 'Efectivo', icon: '💵' },
  tarjeta: { label: 'Tarjeta', icon: '💳' },
  transferencia: { label: 'Transferencia', icon: '🏦' },
  uber: { label: 'Uber Eats', icon: '🛵' },
  didi: { label: 'Didi Food', icon: '🍔' },
};

// Canales de venta
export const CANALES_VENTA: Record<CanalVenta, { label: string; icon: string }> = {
  mostrador: { label: 'Mostrador', icon: '🏪' },
  llamada: { label: 'Teléfono', icon: '📞' },
  whatsapp: { label: 'WhatsApp', icon: '💬' },
  uber: { label: 'Uber Eats', icon: '🛵' },
  didi: { label: 'Didi Food', icon: '🍔' },
  web: { label: 'Página Web', icon: '🌐' },
};

// Tipos de turno
export const TIPOS_TURNO: Record<TipoTurno, { label: string; icon: string }> = {
  matutino: { label: 'Matutino', icon: '🌅' },
  vespertino: { label: 'Vespertino', icon: '🌆' },
};

// Configuración de paginación
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 12,
  PAGE_SIZE_OPTIONS: [12, 24, 48, 96],
};

// Límites de datos
export const LIMITS = {
  MAX_ITEMS_PER_ORDER: 50,
  MAX_CUSTOM_TEXT_LENGTH: 500,
  MAX_OBSERVATION_LENGTH: 1000,
  MIN_ORDER_AMOUNT: 1,
  MAX_ORDER_AMOUNT: 100000,
  MAX_FILE_SIZE_MB: 5,
  MAX_FILES_PER_UPLOAD: 10,
};

// Tiempos (en minutos)
export const TIMEOUTS = {
  ORDER_ALERT_MINUTES: 30, // Alerta si un pedido tarda más de 30 min
  SESSION_TIMEOUT_MINUTES: 480, // 8 horas
  NOTIFICATION_AUTO_DISMISS_SECONDS: 5,
};

// URLs y endpoints
export const URLS = {
  WHATSAPP_BASE: 'https://wa.me/52',
  GOOGLE_MAPS_BASE: 'https://www.google.com/maps/search/?api=1&query=',
};

// Validaciones
export const VALIDATION = {
  PASSWORD_MIN_LENGTH: 8,
  PHONE_LENGTH: 10,
  POSTAL_CODE_LENGTH: 5,
  CVV_MIN_LENGTH: 3,
  CVV_MAX_LENGTH: 4,
};

// Mensajes de error comunes
export const ERROR_MESSAGES = {
  REQUIRED_FIELD: 'Este campo es obligatorio',
  INVALID_EMAIL: 'Correo electrónico inválido',
  INVALID_PHONE: 'Teléfono inválido (debe tener 10 dígitos)',
  INVALID_PASSWORD: 'La contraseña debe tener al menos 8 caracteres',
  INVALID_AMOUNT: 'Monto inválido',
  MIN_AMOUNT: (min: number) => `El monto mínimo es $${min}`,
  MAX_AMOUNT: (max: number) => `El monto máximo es $${max}`,
  NETWORK_ERROR: 'Error de conexión. Verifica tu internet.',
  UNAUTHORIZED: 'No tienes permisos para realizar esta acción',
  SERVER_ERROR: 'Error del servidor. Intenta más tarde.',
};

// Mensajes de éxito comunes
export const SUCCESS_MESSAGES = {
  CREATED: 'Creado exitosamente',
  UPDATED: 'Actualizado exitosamente',
  DELETED: 'Eliminado exitosamente',
  SAVED: 'Guardado exitosamente',
};

// Colores del tema (para usar en gráficos, etc.)
export const THEME_COLORS = {
  primary: '#ef4444', // red-500
  secondary: '#f59e0b', // amber-500
  success: '#10b981', // green-500
  warning: '#f59e0b', // amber-500
  error: '#ef4444', // red-500
  info: '#3b82f6', // blue-500
  muted: '#9ca3af', // gray-400
};

// Categorías de productos (si aplica)
export const CATEGORIAS_PRODUCTO = [
  'BBQ',
  'Acompañamientos',
  'Bebidas',
  'Postres',
  'Salsas',
  'Paquetes',
  'Extras',
];

// Prioridades de notificaciones
export const PRIORIDADES_NOTIFICACION = {
  LOW: 'baja',
  NORMAL: 'normal',
  HIGH: 'alta',
  URGENT: 'urgente',
} as const;
