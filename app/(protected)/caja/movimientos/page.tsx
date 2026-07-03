'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ArrowLeft,
  ArrowUpCircle,
  ArrowDownCircle,
  Download,
  Loader2,
  Undo2,
  CheckCircle2,
} from 'lucide-react';
import { useTurnoActivo, useMovimientosTurno, useCorregirMovimiento } from '@/lib/hooks/useCaja';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useRolGuard } from '@/lib/hooks/useRolGuard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { MovimientoCaja, TipoMovimientoCaja } from '@/lib/types/firestore';
import { toast } from 'sonner';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);

function fmtHora(ts: any): string {
  if (!ts) return '-';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return format(d, 'HH:mm:ss', { locale: es });
}

function exportarCSV(movimientos: MovimientoCaja[]) {
  const headers = ['Hora', 'Tipo', 'Concepto', 'Descripción', 'Monto', 'Usuario', 'Estado'];
  const rows = movimientos.map((m) => [
    m.fecha?.toDate ? format(m.fecha.toDate(), 'yyyy-MM-dd HH:mm:ss') : '',
    m.tipo,
    m.concepto,
    m.descripcion ?? '',
    m.monto.toFixed(2),
    m.usuario_id,
    m.corregidoPor ? 'Corregido' : m.correccionDe ? 'Es corrección' : 'Vigente',
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `movimientos_${format(new Date(), 'yyyy-MM-dd_HHmm')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function MovimientosPage() {
  const { userData: usuario } = useAuthStore();
  const { data: turno, isLoading: loadingTurno } = useTurnoActivo();
  const { data: movimientos = [], isLoading: loadingMovs } = useMovimientosTurno(turno?.id);
  const { mutate: corregir, isPending: corrigiendo } = useCorregirMovimiento(turno?.id ?? '');
  const { allowed: puedeCorregir } = useRolGuard(['admin', 'encargado']);

  const [filtroTipo, setFiltroTipo] = useState<'todos' | TipoMovimientoCaja>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [movimientoACorregir, setMovimientoACorregir] = useState<MovimientoCaja | null>(null);
  const [motivo, setMotivo] = useState('');

  const filtrados = useMemo(() => {
    return movimientos.filter((m) => {
      if (filtroTipo !== 'todos' && m.tipo !== filtroTipo) return false;
      if (busqueda && !m.concepto.toLowerCase().includes(busqueda.toLowerCase())) return false;
      return true;
    });
  }, [movimientos, filtroTipo, busqueda]);

  const totalIngresos = filtrados
    .filter((m) => m.tipo === 'ingreso')
    .reduce((sum, m) => sum + m.monto, 0);
  const totalEgresos = filtrados
    .filter((m) => m.tipo === 'egreso')
    .reduce((sum, m) => sum + m.monto, 0);

  const handleCorregir = () => {
    if (!movimientoACorregir || !usuario) return;
    if (!motivo.trim()) {
      toast.error('Indica el motivo de la corrección');
      return;
    }
    corregir(
      { movimientoId: movimientoACorregir.id, usuarioId: usuario.id, motivo },
      {
        onSuccess: () => {
          toast.success('Movimiento corregido — se creó el registro inverso');
          setMovimientoACorregir(null);
          setMotivo('');
        },
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : 'Error al corregir movimiento'),
      }
    );
  };

  if (loadingTurno) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!turno) {
    return (
      <div className="container mx-auto p-6 space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/caja">
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver a Caja
          </Link>
        </Button>
        <p className="text-muted-foreground text-sm">No hay turno activo.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Button variant="ghost" size="sm" className="-ml-2 mb-1" asChild>
            <Link href="/caja">
              <ArrowLeft className="h-4 w-4 mr-1" /> Volver a Caja
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Movimientos del Turno</h1>
          <p className="text-sm text-muted-foreground">
            Turno {turno.tipo} · {turno.cajeroNombre}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => exportarCSV(filtrados)}
          disabled={filtrados.length === 0}
        >
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label className="text-xs">Tipo</Label>
          <Select value={filtroTipo} onValueChange={(v) => setFiltroTipo(v as any)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="ingreso">Ingresos</SelectItem>
              <SelectItem value="egreso">Egresos</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 flex-1 min-w-[200px]">
          <Label className="text-xs">Buscar por concepto</Label>
          <Input
            placeholder="Ej. Venta mostrador…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
      </div>

      {/* Totales del filtro */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Ingresos filtrados</p>
          <p className="text-lg font-bold text-green-600">{fmt(totalIngresos)}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Egresos filtrados</p>
          <p className="text-lg font-bold text-destructive">{fmt(totalEgresos)}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Movimientos</p>
          <p className="text-lg font-bold">{filtrados.length}</p>
        </div>
      </div>

      {/* Tabla */}
      {loadingMovs ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtrados.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">
          Sin movimientos que coincidan con el filtro
        </p>
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hora</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Concepto</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead>Estado</TableHead>
                {puedeCorregir && <TableHead className="text-right">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.map((m) => {
                const esCorreccion = !!m.correccionDe;
                const fueCorregido = !!m.corregidoPor;
                return (
                  <TableRow key={m.id} className={fueCorregido ? 'opacity-60' : ''}>
                    <TableCell className="text-xs text-muted-foreground">
                      {fmtHora(m.fecha)}
                    </TableCell>
                    <TableCell>
                      {m.tipo === 'ingreso' ? (
                        <Badge variant="outline" className="text-green-600 border-green-300">
                          <ArrowUpCircle className="h-3 w-3 mr-1" /> Ingreso
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-destructive border-destructive/30">
                          <ArrowDownCircle className="h-3 w-3 mr-1" /> Egreso
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm max-w-[260px]">
                      {m.concepto}
                      {m.descripcion && (
                        <span className="block text-xs text-muted-foreground truncate">
                          {m.descripcion}
                        </span>
                      )}
                    </TableCell>
                    <TableCell
                      className={`text-right font-semibold ${
                        m.tipo === 'ingreso' ? 'text-green-600' : 'text-destructive'
                      }`}
                    >
                      {m.tipo === 'egreso' ? '-' : '+'}{fmt(m.monto)}
                    </TableCell>
                    <TableCell>
                      {esCorreccion ? (
                        <Badge variant="secondary" className="text-xs">
                          <Undo2 className="h-3 w-3 mr-1" /> Corrección
                        </Badge>
                      ) : fueCorregido ? (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          Corregido
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Vigente
                        </Badge>
                      )}
                    </TableCell>
                    {puedeCorregir && (
                      <TableCell className="text-right">
                        {!esCorreccion && !fueCorregido && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setMovimientoACorregir(m)}
                          >
                            <Undo2 className="h-3.5 w-3.5 mr-1" />
                            Corregir
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog de corrección */}
      <Dialog open={!!movimientoACorregir} onOpenChange={(open) => !open && setMovimientoACorregir(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Corregir movimiento</DialogTitle>
            <DialogDescription>
              Se creará un movimiento inverso de {movimientoACorregir && fmt(movimientoACorregir.monto)}.
              El registro original no se borra — queda marcado como corregido.
            </DialogDescription>
          </DialogHeader>

          {movimientoACorregir && (
            <div className="rounded-lg border bg-muted/40 p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Concepto</span>
                <span className="font-medium">{movimientoACorregir.concepto}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tipo original</span>
                <span className="font-medium capitalize">{movimientoACorregir.tipo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Monto</span>
                <span className="font-medium">{fmt(movimientoACorregir.monto)}</span>
              </div>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="motivo">Motivo de la corrección</Label>
            <Textarea
              id="motivo"
              rows={3}
              placeholder="Ej. Se registró por error como ingreso, era un egreso…"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setMovimientoACorregir(null)}
              disabled={corrigiendo}
            >
              Cancelar
            </Button>
            <Button onClick={handleCorregir} disabled={corrigiendo}>
              {corrigiendo ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Corrigiendo…
                </>
              ) : (
                'Confirmar Corrección'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
