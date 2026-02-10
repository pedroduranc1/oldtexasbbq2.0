'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/useAuth';
import type { Rol } from '@/lib/types/firestore';
import {
  LayoutDashboard,
  ShoppingCart,
  ChefHat,
  Truck,
  Users,
  Clock,
  MapPin,
  FileText,
  DollarSign,
  ChevronLeft,
  Menu,
  Package,
  UtensilsCrossed,
  PackageOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  roles: Rol[];
}

const navigation: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['admin', 'encargado'],
  },
  {
    title: 'Pedidos',
    href: '/pedidos',
    icon: ShoppingCart,
    roles: ['admin', 'encargado', 'cajera'],
  },
  {
    title: 'Cocina',
    href: '/cocina',
    icon: ChefHat,
    roles: ['admin', 'encargado', 'cocina'],
  },
  {
    title: 'Reparto',
    href: '/reparto',
    icon: Truck,
    roles: ['admin', 'encargado', 'repartidor'],
  },
  {
    title: 'Repartidores',
    href: '/repartidores',
    icon: Users,
    roles: ['admin', 'encargado'],
  },
  {
    title: 'Turnos',
    href: '/turnos',
    icon: Clock,
    roles: ['admin', 'encargado', 'cajera'],
  },
  {
    title: 'Corte de Caja',
    href: '/caja/corte',
    icon: DollarSign,
    roles: ['admin', 'encargado', 'cajera'],
  },
  {
    title: 'Productos',
    href: '/productos',
    icon: UtensilsCrossed,
    roles: ['admin', 'encargado'],
  },
  {
    title: 'Inventario',
    href: '/inventario',
    icon: PackageOpen,
    roles: ['admin', 'encargado'],
  },
  {
    title: 'Colonias',
    href: '/colonias',
    icon: MapPin,
    roles: ['admin', 'encargado'],
  },
  {
    title: 'Bitácora',
    href: '/bitacora',
    icon: FileText,
    roles: ['admin', 'encargado'],
  },
  {
    title: 'Componentes',
    href: '/componentes',
    icon: Package,
    roles: ['admin'],
  },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

export function Sidebar({ isOpen, onClose, isCollapsed, onCollapsedChange }: SidebarProps) {
  const pathname = usePathname();
  const { userData } = useAuth();

  // Filtrar navegación según rol del usuario
  const filteredNavigation = navigation.filter((item) =>
    userData?.rol ? item.roles.includes(userData.rol) : false
  );

  return (
    <>
      {/* Overlay para móvil */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-40 h-screen transition-transform duration-300 ease-in-out bg-card border-r border-border',
          isCollapsed ? 'w-16' : 'w-64',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header del Sidebar */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            {!isCollapsed && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-lg">
                    OT
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-sm">Old Texas BBQ</span>
                  <span className="text-xs text-muted-foreground">CRM</span>
                </div>
              </div>
            )}

            {/* Botón de colapsar (solo desktop) */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onCollapsedChange(!isCollapsed)}
              className="hidden lg:flex"
            >
              <ChevronLeft
                className={cn(
                  'h-4 w-4 transition-transform',
                  isCollapsed && 'rotate-180'
                )}
              />
            </Button>

            {/* Botón de cerrar (solo móvil) */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="lg:hidden"
            >
              <Menu className="h-4 w-4" />
            </Button>
          </div>

          {/* Navegación */}
          <ScrollArea className="flex-1 px-3 py-4">
            <nav className="space-y-1">
              {filteredNavigation.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link key={item.href} href={item.href} onClick={onClose}>
                    <div
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                        'hover:bg-accent hover:text-accent-foreground',
                        isActive
                          ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                          : 'text-muted-foreground'
                      )}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      {!isCollapsed && (
                        <span className="font-medium text-sm">
                          {item.title}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </nav>
          </ScrollArea>

          {/* Footer del Sidebar */}
          {!isCollapsed && userData && (
            <div className="p-4 border-t border-border">
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/50">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground text-xs font-bold">
                    {userData.nombre
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {userData.nombre}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {userData.rol}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
