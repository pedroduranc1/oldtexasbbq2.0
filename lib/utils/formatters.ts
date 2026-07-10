/**
 * Utilidades para formatear datos
 * Old Texas BBQ - CRM
 */

import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Tipo compatible con Firestore Timestamp, Date y string
type TimestampLike = { toDate: () => Date } | Date | string | null | undefined;

function tsToDate(value: TimestampLike): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string') return new Date(value);
  if ('toDate' in value) return value.toDate();
  return null;
}

// ── Moneda ────────────────────────────────────────────────────────────────────

/** $1,234 — sin decimales, para KPIs y tablas */
export const fmtPesos = (n: number): string =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n);

/** $1,234.56 — con decimales, para costeos y cierres */
export const fmtPesosDecimal = (n: number): string =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 }).format(n);

/** +$50 / -$200 / $0 — diferencias de caja con signo */
export const fmtDiferencia = (n: number): string => {
  if (n === 0) return '$0';
  return `${n > 0 ? '+' : ''}${fmtPesos(n)}`;
};

// ── Fechas y horas (compatibles con Firestore Timestamp) ──────────────────────

/** 14:35 */
export const fmtHora = (value: TimestampLike): string => {
  const d = tsToDate(value);
  return d ? format(d, 'HH:mm', { locale: es }) : '—';
};

/** 10 jul 2026 */
export const fmtFecha = (value: TimestampLike): string => {
  const d = tsToDate(value);
  return d ? format(d, 'd MMM yyyy', { locale: es }) : '—';
};

/** 10/07/2026 14:35 */
export const fmtFechaHora = (value: TimestampLike): string => {
  const d = tsToDate(value);
  return d ? format(d, 'dd/MM/yyyy HH:mm', { locale: es }) : '—';
};

// ── Existentes ────────────────────────────────────────────────────────────────

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount);
};

export const formatNumber = (num: number, decimals: number = 0): string => {
  return new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
};

export const formatPercent = (value: number, decimals: number = 0): string => {
  return `${formatNumber(value, decimals)}%`;
};

export const formatDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(dateObj);
};

export const formatDateTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj);
};

export const formatTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj);
};

export const formatPhone = (phone: string): string => {
  // Formato: (XXX) XXX-XXXX
  const cleaned = phone.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`;
  }
  return phone;
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export const capitalize = (text: string): string => {
  return text
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const formatRelativeTime = (date: Date | string): string => {
  const now = new Date();
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Hace un momento';

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `Hace ${diffInMinutes} ${diffInMinutes === 1 ? 'minuto' : 'minutos'}`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `Hace ${diffInHours} ${diffInHours === 1 ? 'hora' : 'horas'}`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `Hace ${diffInDays} ${diffInDays === 1 ? 'día' : 'días'}`;
  }

  return formatDate(dateObj);
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};
