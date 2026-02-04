import { Metadata, Viewport } from 'next';

// ================================================
// Configuración SEO Base
// ================================================

const APP_NAME = 'Old Texas BBQ CRM';
const APP_DEFAULT_TITLE = 'Old Texas BBQ - Sistema de Gestión';
const APP_TITLE_TEMPLATE = '%s | Old Texas BBQ';
const APP_DESCRIPTION =
  'Sistema de gestión integral para Old Texas BBQ. Pedidos, cocina, reparto y administración en tiempo real.';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://crm.oldtexasbbq.com';

// ================================================
// Metadata Base
// ================================================

export const baseMetadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: APP_DEFAULT_TITLE,
    template: APP_TITLE_TEMPLATE,
  },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  authors: [{ name: 'Old Texas BBQ', url: APP_URL }],
  generator: 'Next.js',
  keywords: [
    'Old Texas BBQ',
    'CRM',
    'Sistema de pedidos',
    'Restaurante',
    'BBQ',
    'Gestión de pedidos',
    'Cocina',
    'Reparto',
    'Delivery',
  ],
  referrer: 'origin-when-cross-origin',
  creator: 'Old Texas BBQ',
  publisher: 'Old Texas BBQ',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },

  // Open Graph
  openGraph: {
    type: 'website',
    locale: 'es_MX',
    url: APP_URL,
    siteName: APP_NAME,
    title: APP_DEFAULT_TITLE,
    description: APP_DESCRIPTION,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Old Texas BBQ CRM',
      },
    ],
  },

  // Twitter
  twitter: {
    card: 'summary_large_image',
    title: APP_DEFAULT_TITLE,
    description: APP_DESCRIPTION,
    images: ['/og-image.png'],
  },

  // Robots
  robots: {
    index: false, // No indexar CRM interno
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },

  // Icons
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },

  // Manifest
  manifest: '/manifest.json',

  // App Links
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: APP_NAME,
  },

  // Verification (opcional - descomentar si se necesita)
  // verification: {
  //   google: 'google-site-verification-code',
  // },

  // Otros
  category: 'business',
};

// ================================================
// Viewport Configuration
// ================================================

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#1a365d' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
};

// ================================================
// Metadata para páginas específicas
// ================================================

export function generatePageMetadata(
  title: string,
  description?: string,
  noIndex = true
): Metadata {
  return {
    title,
    description: description || APP_DESCRIPTION,
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
  };
}

// ================================================
// Metadata para página pública /pedir
// ================================================

export const pedirPageMetadata: Metadata = {
  title: 'Pedir BBQ | Old Texas BBQ',
  description:
    'Haz tu pedido de BBQ estilo texano. Costillas, brisket, pulled pork y más. Delivery a domicilio.',
  robots: {
    index: true, // Página pública - sí indexar
    follow: true,
  },
  openGraph: {
    type: 'website',
    locale: 'es_MX',
    url: `${APP_URL}/pedir`,
    siteName: APP_NAME,
    title: 'Pedir BBQ | Old Texas BBQ',
    description:
      'Haz tu pedido de BBQ estilo texano. Costillas, brisket, pulled pork y más. Delivery a domicilio.',
    images: [
      {
        url: '/og-pedir.png',
        width: 1200,
        height: 630,
        alt: 'Pedir BBQ - Old Texas BBQ',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pedir BBQ | Old Texas BBQ',
    description:
      'Haz tu pedido de BBQ estilo texano. Costillas, brisket, pulled pork y más.',
    images: ['/og-pedir.png'],
  },
};
