'use client';

import { AperturaTurno } from '@/components/caja/AperturaTurno';
import { RegistroMovimiento } from '@/components/caja/RegistroMovimiento';
import { ResumenCaja } from '@/components/caja/ResumenCaja';
import { CierreTurno } from '@/components/caja/CierreTurno';
import { useTurnoActivo, useTurnoVencido } from '@/lib/hooks/useCaja';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useAccesoTotalCaja } from '@/lib/hooks/useAccesoTotalCaja';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import {
  AlertCircle,
  Clock,
  ListOrdered,
  Lock,
  History,
  ChevronRight,
  Eye,
} from 'lucide-react';
import Link from 'next/link';

const RUTAS_CAJA = [
  {
    href: '/caja/movimientos',
    titulo: 'Movimientos',
    descripcion: 'Ver, filtrar y corregir ingresos/egresos del turno activo',
    icon: ListOrdered,
    requiereTurno: true,
    requiereOperar: false,
  },
  {
    href: '/caja/cierre',
    titulo: 'Cierre de Turno',
    descripcion: 'Conciliar efectivo y cerrar el turno a pantalla completa',
    icon: Lock,
    requiereTurno: true,
    requiereOperar: true,
  },
  {
    href: '/caja/corte',
    titulo: 'Histórico de Cortes',
    descripcion: 'Consultar turnos cerrados, justificar descuadres y exportar PDF',
    icon: History,
    requiereTurno: false,
    requiereOperar: false,
  },
] as const;

export default function CajaPage() {
  const { userData: usuario } = useAuthStore();
  const { data: turno, isLoading, isError } = useTurnoActivo();
  const { data: vencidos = [] } = useTurnoVencido(10);
  const accesoTotal = useAccesoTotalCaja();

  // admin/encargado viendo un turno que NO abrieron ellos → modo solo lectura,
  // salvo que su correo esté en la lista de acceso total (configuracion/general)
  const esSupervisionAjena =
    !!turno &&
    !!usuario &&
    usuario.rol !== 'cajera' &&
    turno.cajeroId !== usuario.id &&
    !accesoTotal;

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-3 p-4 rounded-lg border border-destructive/40 bg-destructive/10 text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm">Error al cargar el estado de caja. Recarga la página.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Alerta turno vencido */}
      {vencidos.length > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400">
          <Clock className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">Turno abierto hace más de 10 horas</p>
            <p className="text-xs mt-0.5 text-amber-600 dark:text-amber-500">
              El turno lleva demasiado tiempo activo. Si el cajero ya terminó, realiza el cierre lo antes posible.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Caja</h1>
        <p className="text-muted-foreground">
          {turno
            ? `Turno ${turno.tipo} activo · abierto a las ${
                turno.horaInicio?.toDate
                  ? turno.horaInicio.toDate().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
                  : '-'
              }`
            : 'Sin turno activo'}
        </p>
      </div>

      {/* Navegación — todas las rutas del módulo de caja */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {RUTAS_CAJA.map((ruta) => {
          const Icon = ruta.icon;
          const sinTurno = ruta.requiereTurno && !turno;
          const sinPermiso = ruta.requiereOperar && esSupervisionAjena;
          const deshabilitado = sinTurno || sinPermiso;
          const contenido = (
            <Card
              className={`p-4 flex items-start gap-3 h-full transition-colors ${
                deshabilitado
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:border-primary/50 hover:bg-accent/30'
              }`}
            >
              <Icon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm flex items-center gap-1">
                  {ruta.titulo}
                  {!deshabilitado && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{ruta.descripcion}</p>
                {sinTurno && (
                  <p className="text-xs text-amber-600 mt-1">Requiere un turno activo</p>
                )}
                {sinPermiso && !sinTurno && (
                  <p className="text-xs text-amber-600 mt-1">Solo el cajero del turno puede cerrarlo</p>
                )}
              </div>
            </Card>
          );

          return deshabilitado ? (
            <div key={ruta.href}>{contenido}</div>
          ) : (
            <Link key={ruta.href} href={ruta.href}>
              {contenido}
            </Link>
          );
        })}
      </div>

      {/* Sin turno activo → mostrar apertura */}
      {!turno && (
        <div className="flex justify-center pt-8">
          <AperturaTurno />
        </div>
      )}

      {/* Turno activo, ajeno y sin acceso total → modo solo lectura */}
      {turno && esSupervisionAjena && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-lg border border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-400">
            <Eye className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Modo consulta — turno de {turno.cajeroNombre}</p>
              <p className="text-xs mt-0.5 text-blue-600 dark:text-blue-500">
                Estás viendo el turno activo de otro cajero. Solo {turno.cajeroNombre} puede registrar
                nuevos ingresos/egresos o cerrar este turno. Si necesitas corregir un movimiento ya
                registrado, puedes hacerlo desde <strong>Movimientos</strong>.
              </p>
            </div>
          </div>
          <ResumenCaja turno={turno} />
        </div>
      )}

      {/* Turno activo y puedo operar → flujo normal */}
      {turno && !esSupervisionAjena && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna izquierda: registro + cierre */}
          <div className="space-y-4">
            <RegistroMovimiento turnoId={turno.id} />
            <CierreTurno turno={turno} />
          </div>

          {/* Columna derecha (2/3): resumen en vivo */}
          <div className="lg:col-span-2">
            <ResumenCaja turno={turno} />
          </div>
        </div>
      )}
    </div>
  );
}
