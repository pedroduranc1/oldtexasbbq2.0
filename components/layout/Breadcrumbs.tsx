'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import { Fragment } from 'react';

// Mapeo de rutas a nombres legibles
const routeNames: Record<string, string> = {
  dashboard: 'Dashboard',
  pedidos: 'Pedidos',
  nuevo: 'Nuevo Pedido',
  cocina: 'Cocina',
  reparto: 'Reparto',
  repartidores: 'Repartidores',
  turnos: 'Turnos',
  caja: 'Caja',
  corte: 'Corte de Caja',
  colonias: 'Colonias',
  bitacora: 'Bitácora',
  perfil: 'Perfil',
  usuarios: 'Usuarios',
  'cambiar-password': 'Cambiar Contraseña',
};

export function Breadcrumbs() {
  const pathname = usePathname();

  // Dividir la ruta en segmentos
  const segments = pathname.split('/').filter((segment) => segment !== '');

  // Si estamos en home, no mostrar breadcrumbs
  if (segments.length === 0 || pathname === '/') {
    return null;
  }

  return (
    <nav className="flex items-center space-x-1 text-sm text-muted-foreground py-3 px-4 lg:px-6">
      {/* Home link */}
      <Link
        href="/dashboard"
        className="flex items-center hover:text-foreground transition-colors"
      >
        <Home className="h-4 w-4" />
      </Link>

      {/* Segmentos de la ruta */}
      {segments.map((segment, index) => {
        const href = `/${segments.slice(0, index + 1).join('/')}`;
        const isLast = index === segments.length - 1;
        const name = routeNames[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);

        return (
          <Fragment key={href}>
            <ChevronRight className="h-4 w-4" />
            {isLast ? (
              <span className="font-medium text-foreground">{name}</span>
            ) : (
              <Link
                href={href}
                className="hover:text-foreground transition-colors"
              >
                {name}
              </Link>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
