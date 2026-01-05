'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/useAuth';
import { Loader2 } from 'lucide-react';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { NotificationBadge } from '@/components/notifications/NotificationBadge';
import { NotificationListener } from '@/components/notifications/notification-listener';
import { initializeFCM } from '@/lib/notifications/fcm';
import { ThemeToggle } from '@/components/theme-toggle';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { userData, loading } = useAuth();

  useEffect(() => {
    if (!loading && !userData) {
      // Usuario no autenticado, redirigir a login
      router.push('/login');
    }
  }, [userData, loading, router]);

  // Inicializar FCM cuando el usuario esté autenticado
  useEffect(() => {
    if (userData?.id) {
      initializeFCM(userData.id).then((token) => {
        if (token) {
          console.log('✅ FCM inicializado para usuario:', userData.id);
        }
      });
    }
  }, [userData?.id]);

  // Mostrar loading mientras verifica autenticación
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-gray-600 dark:text-gray-400">
            Verificando autenticación...
          </p>
        </div>
      </div>
    );
  }

  // Si no hay usuario después de cargar, no mostrar nada (se redirigirá)
  if (!userData) {
    return null;
  }

  // Usuario autenticado, mostrar contenido
  return (
    <>
      {/* Listener de notificaciones en tiempo real */}
      <NotificationListener />

      {/* Contenido principal */}
      {children}

      {/* Botón flotante de notificaciones (bottom-right) */}
      <div className="fixed bottom-6 right-6 z-40">
        <NotificationBadge />
      </div>

      {/* Botón de cambio de tema (bottom-left) */}
      <ThemeToggle />

      {/* Panel de notificaciones */}
      <NotificationCenter />
    </>
  );
}
