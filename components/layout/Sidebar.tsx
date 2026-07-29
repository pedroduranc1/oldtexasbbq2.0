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
  DollarSign,
  ChevronLeft,
  ChevronDown,
  Menu,
  UtensilsCrossed,
  PackageOpen,
  BarChart3,
  Wallet,
  TrendingUp,
  FileUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  roles: Rol[];
  soon?: boolean;
  children?: { title: string; href: string }[];
}

// ── Módulos activos del sistema ─────────────────────────────────────────────
const navigation: NavItem[] = [
  // ── Operación diaria ───────────────────────────────────────────────────────
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
    title: 'Productos',
    href: '/productos',
    icon: UtensilsCrossed,
    roles: ['admin', 'encargado'],
  },
  // ── Gestión financiera ─────────────────────────────────────────────────────
  {
    title: 'Caja',
    href: '/caja',
    icon: DollarSign,
    roles: ['admin', 'encargado', 'cajera'],
  },
  {
    title: 'Finanzas',
    href: '/financiero',
    icon: TrendingUp,
    roles: ['admin', 'encargado'],
  },
  {
    title: 'Inventario',
    href: '/inventario',
    icon: PackageOpen,
    roles: ['admin', 'encargado'],
  },
  {
    title: 'Importar',
    href: '/importar',
    icon: FileUp,
    roles: ['admin', 'encargado'],
  },
  // ── Análisis ───────────────────────────────────────────────────────────────
  {
    title: 'Reportes',
    href: '/reportes',
    icon: BarChart3,
    roles: ['admin', 'encargado'],
    children: [
      { title: 'Diario', href: '/reportes' },
      { title: 'Semanal', href: '/reportes/semanal' },
      { title: 'Financiero', href: '/reportes/financiero' },
    ],
  },
  {
    title: 'Nómina',
    href: '/nomina',
    icon: Wallet,
    roles: ['admin', 'encargado'],
  },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

// Secciones del sidebar — cada sección agrupa ítems de navigation
const SECCIONES: { label: string; hrefs: string[] }[] = [
  { label: 'Operación', hrefs: ['/dashboard', '/pedidos', '/cocina', '/reparto', '/repartidores', '/productos'] },
  { label: 'Gestión', hrefs: ['/caja', '/financiero', '/inventario', '/importar'] },
  { label: 'Análisis', hrefs: ['/reportes', '/nomina'] },
];

export function Sidebar({ isOpen, onClose, isCollapsed, onCollapsedChange }: SidebarProps) {
  const pathname = usePathname();
  const { userData } = useAuth();
  const [reportesExpanded, setReportesExpanded] = useState(true);

  const filteredNavigation = navigation.filter((item) =>
    userData?.rol ? item.roles.includes(userData.rol) : false
  );

  // Agrupa ítems por sección
  const seccionesConItems = SECCIONES.map((sec) => ({
    label: sec.label,
    items: filteredNavigation.filter((item) => sec.hrefs.includes(item.href)),
  })).filter((sec) => sec.items.length > 0);

  const renderItem = (item: NavItem) => {
    const Icon = item.icon;

    if (item.soon) {
      return (
        <div
          key={item.href}
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-lg',
            'opacity-40 cursor-not-allowed select-none text-muted-foreground'
          )}
          title={`${item.title} — próximamente`}
        >
          <Icon className="h-5 w-5 shrink-0" />
          {!isCollapsed && (
            <div className="flex items-center justify-between flex-1 min-w-0">
              <span className="font-medium text-sm">{item.title}</span>
              <span className="text-[9px] font-semibold uppercase tracking-wide bg-muted px-1.5 py-0.5 rounded">
                Soon
              </span>
            </div>
          )}
        </div>
      );
    }

    // Ítem con subitems (ej. Reportes)
    if (item.children && !isCollapsed) {
      const isParentActive = item.children.some((c) => pathname === c.href);
      const isExpanded = item.href === '/reportes' ? reportesExpanded : false;
      const toggleExpanded = item.href === '/reportes'
        ? () => setReportesExpanded((v) => !v)
        : undefined;

      return (
        <div key={item.href}>
          <button
            onClick={toggleExpanded}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
              'hover:bg-accent hover:text-accent-foreground',
              isParentActive ? 'text-foreground font-semibold' : 'text-muted-foreground'
            )}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span className="font-medium text-sm flex-1 text-left">{item.title}</span>
            <ChevronDown
              className={cn('h-3.5 w-3.5 transition-transform', isExpanded && 'rotate-180')}
            />
          </button>

          {isExpanded && (
            <div className="mt-0.5 ml-4 pl-3 border-l border-border space-y-0.5">
              {item.children.map((child) => {
                const isChildActive = pathname === child.href;
                return (
                  <Link key={child.href} href={child.href} onClick={onClose}>
                    <div
                      className={cn(
                        'flex items-center px-3 py-1.5 rounded-md text-sm transition-colors',
                        'hover:bg-accent hover:text-accent-foreground',
                        isChildActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground'
                      )}
                    >
                      {child.title}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    // Ítem normal
    const isActive = pathname === item.href ||
      (item.href !== '/reportes' && pathname.startsWith(item.href + '/'));

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
            <span className="font-medium text-sm">{item.title}</span>
          )}
        </div>
      </Link>
    );
  };

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
            <nav className="space-y-4">
              {seccionesConItems.map((seccion, si) => (
                <div key={seccion.label}>
                  {!isCollapsed && (
                    <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                      {seccion.label}
                    </p>
                  )}
                  {isCollapsed && si > 0 && (
                    <div className="border-t border-border mb-2" />
                  )}
                  <div className="space-y-0.5">
                    {seccion.items.map(renderItem)}
                  </div>
                </div>
              ))}
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
