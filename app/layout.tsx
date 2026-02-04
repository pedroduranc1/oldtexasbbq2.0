import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ReactQueryProvider } from '@/lib/react-query/provider';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from 'sonner';
import { baseMetadata, viewport as viewportConfig } from '@/lib/seo/config';
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics';

export const metadata: Metadata = baseMetadata;
export const viewport: Viewport = viewportConfig;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
      </head>
      <body>
        <GoogleAnalytics />
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          storageKey="old-texas-theme"
          disableTransitionOnChange={false}
        >
          <ReactQueryProvider>{children}</ReactQueryProvider>
          <Toaster
            position="top-right"
            richColors
            closeButton
            expand={false}
            toastOptions={{
              style: {
                background: 'hsl(var(--background))',
                color: 'hsl(var(--foreground))',
                border: '1px solid hsl(var(--border))',
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
