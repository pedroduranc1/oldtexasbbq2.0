import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  // ================================================
  // Optimización de Imágenes
  // ================================================
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
    // Formatos optimizados (WebP y AVIF son más ligeros)
    formats: ['image/avif', 'image/webp'],
    // Minimizar tamaño de imágenes
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 días
    // Device sizes para responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },

  // ================================================
  // Output Standalone para Docker/Vercel
  // ================================================
  output: 'standalone',

  // ================================================
  // Optimización de Bundle
  // ================================================
  // Compresión de assets
  compress: true,

  // Generar source maps solo en desarrollo
  productionBrowserSourceMaps: false,

  // ================================================
  // Headers de Seguridad y Cache
  // ================================================
  async headers() {
    return [
      {
        // Aplicar a todos los assets estáticos
        source: '/:path*',
        headers: [
          // Seguridad
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self)',
          },
        ],
      },
      {
        // Cache para assets estáticos (JS, CSS, imágenes)
        source: '/(.*)\\.(js|css|woff|woff2|png|jpg|jpeg|gif|ico|svg|webp|avif)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Cache para archivos de sonido
        source: '/sounds/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  // ================================================
  // Redirecciones
  // ================================================
  async redirects() {
    return [
      // Redirigir www a non-www (o viceversa según preferencia)
      // Descomentar si se necesita
      // {
      //   source: '/:path*',
      //   has: [{ type: 'host', value: 'www.oldtexasbbq.com' }],
      //   destination: 'https://crm.oldtexasbbq.com/:path*',
      //   permanent: true,
      // },
    ];
  },

  // ================================================
  // Turbopack Configuration (Next.js 16+)
  // ================================================
  turbopack: {
    // Turbopack está habilitado por defecto en Next.js 16
    // Agregar configuración específica si es necesario
  },

  // ================================================
  // Experimental Features
  // ================================================
  experimental: {
    // Optimizar imports de paquetes
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      '@radix-ui/react-icons',
      'recharts',
    ],
  },

  // ================================================
  // Powered By Header (ocultar por seguridad)
  // ================================================
  poweredByHeader: false,
};

export default nextConfig;
