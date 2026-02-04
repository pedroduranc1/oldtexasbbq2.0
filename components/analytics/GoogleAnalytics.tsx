'use client';

import Script from 'next/script';

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

/**
 * Componente de Google Analytics 4
 *
 * Configurar en .env.local:
 * NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
 *
 * El ID se obtiene desde:
 * Google Analytics > Admin > Data Streams > Web > Measurement ID
 */
export function GoogleAnalytics() {
  // No cargar si no hay ID configurado o en desarrollo
  if (!GA_MEASUREMENT_ID || process.env.NODE_ENV !== 'production') {
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}', {
            page_path: window.location.pathname,
            anonymize_ip: true,
            cookie_flags: 'SameSite=None;Secure'
          });
        `}
      </Script>
    </>
  );
}

// ================================================
// Funciones de tracking para uso en la app
// ================================================

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Registrar un evento personalizado en Google Analytics
 */
export function trackEvent(
  action: string,
  category: string,
  label?: string,
  value?: number
) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
}

/**
 * Registrar una conversión (pedido completado, etc.)
 */
export function trackConversion(
  conversionId: string,
  value?: number,
  currency = 'MXN'
) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'conversion', {
      send_to: conversionId,
      value: value,
      currency: currency,
    });
  }
}

/**
 * Registrar vista de página (para navegación SPA)
 */
export function trackPageView(url: string, title?: string) {
  if (typeof window !== 'undefined' && window.gtag && GA_MEASUREMENT_ID) {
    window.gtag('config', GA_MEASUREMENT_ID, {
      page_path: url,
      page_title: title,
    });
  }
}

// ================================================
// Eventos predefinidos para Old Texas BBQ
// ================================================

export const Analytics = {
  // Pedidos
  pedidoCreado: (total: number, canal: string) =>
    trackEvent('pedido_creado', 'pedidos', canal, total),

  pedidoCompletado: (total: number, canal: string) =>
    trackEvent('pedido_completado', 'pedidos', canal, total),

  pedidoCancelado: (pedidoId: string) =>
    trackEvent('pedido_cancelado', 'pedidos', pedidoId),

  // Cocina
  pedidoEnPreparacion: (pedidoId: string) =>
    trackEvent('pedido_en_preparacion', 'cocina', pedidoId),

  pedidoListo: (pedidoId: string, tiempoMinutos: number) =>
    trackEvent('pedido_listo', 'cocina', pedidoId, tiempoMinutos),

  // Reparto
  pedidoEnReparto: (pedidoId: string) =>
    trackEvent('pedido_en_reparto', 'reparto', pedidoId),

  pedidoEntregado: (pedidoId: string, tiempoMinutos: number) =>
    trackEvent('pedido_entregado', 'reparto', pedidoId, tiempoMinutos),

  // Usuarios
  login: (rol: string) => trackEvent('login', 'auth', rol),

  logout: () => trackEvent('logout', 'auth'),

  // Productos
  productoVisto: (productoId: string, nombre: string) =>
    trackEvent('producto_visto', 'productos', nombre),

  productoAgregado: (productoId: string, precio: number) =>
    trackEvent('producto_agregado', 'carrito', productoId, precio),

  // Pagos
  pagoIniciado: (monto: number, metodo: string) =>
    trackEvent('pago_iniciado', 'pagos', metodo, monto),

  pagoCompletado: (monto: number, metodo: string) =>
    trackEvent('pago_completado', 'pagos', metodo, monto),

  pagoFallido: (metodo: string, error: string) =>
    trackEvent('pago_fallido', 'pagos', `${metodo}:${error}`),

  // Errores
  error: (tipo: string, mensaje: string) =>
    trackEvent('error', 'errores', `${tipo}:${mensaje}`),
};

export default GoogleAnalytics;
