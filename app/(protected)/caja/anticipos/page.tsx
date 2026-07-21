'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plus, ChevronDown, Loader2, Info } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { useAuthStore } from '@/lib/stores/auth.store';
import { useTurnoActivo } from '@/lib/hooks/useCaja';
import {
  getAnticipos,
  crearAnticipo,
  aplicarAnticipo,
  saldarAnticipo,
  cancelarAnticipo,
  calcularMontoNetoClip,
} from '@/lib/services/anticipos.service';
import { formatCurrency } from '@/lib/utils/formatters';
import type { Anticipo, EstadoAnticipo, MetodoPago, SubmetodoTarjeta } from '@/lib/types/firestore';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ESTADO_LABEL: Record<EstadoAnticipo, string> = {
  recibido: 'Recibido',
  aplicado: 'Aplicado',
  saldado: 'Saldado',
  cancelado: 'Cancelado',
};

const ESTADO_VARIANT: Record<EstadoAnticipo, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  recibido: 'default',
  aplicado: 'secondary',
  saldado: 'outline',
  cancelado: 'destructive',
};

// ─── Formulario de nuevo anticipo ─────────────────────────────────────────────

interface FormData {
  clienteNombre: string;
  clienteTelefono: string;
  descripcion: string;
  montoAnticipo: string;
  totalEstimado: string;
  metodoPago: MetodoPago;
  submetodoTarjeta: SubmetodoTarjeta | '';
  fechaEntregaEstimada: string;
  notas: string;
}

const FORM_INICIAL: FormData = {
  clienteNombre: '',
  clienteTelefono: '',
  descripcion: '',
  montoAnticipo: '',
  totalEstimado: '',
  metodoPago: 'efectivo',
  submetodoTarjeta: '',
  fechaEntregaEstimada: '',
  notas: '',
};

// ─── Página principal ─────────────────────────────────────────────────────────

export default function AnticiposPage() {
  const qc = useQueryClient();
  const { userData } = useAuthStore();
  const { data: turnoActivo } = useTurnoActivo();

  const [filtroEstado, setFiltroEstado] = useState<'todos' | EstadoAnticipo>('todos');
  const [dialogNuevo, setDialogNuevo] = useState(false);
  const [dialogCancelar, setDialogCancelar] = useState<{ id: string; nombre: string } | null>(null);
  const [motivoCancelacion, setMotivoCancelacion] = useState('');
  const [form, setForm] = useState<FormData>(FORM_INICIAL);

  // ─── Datos ──────────────────────────────────────────────────────────────────

  const { data: anticipos = [], isLoading } = useQuery({
    queryKey: ['anticipos', filtroEstado],
    queryFn: () =>
      filtroEstado === 'todos' ? getAnticipos() : getAnticipos(),
  });

  const anticiposFiltrados =
    filtroEstado === 'todos'
      ? anticipos
      : anticipos.filter((a) => a.estado === filtroEstado);

  const activos = anticipos.filter((a) => ['recibido', 'aplicado'].includes(a.estado));
  const totalPendiente = activos.reduce((s, a) => s + a.montoAnticipo, 0);

  // ─── Mutations ──────────────────────────────────────────────────────────────

  const invalidar = () => qc.invalidateQueries({ queryKey: ['anticipos'] });

  const mutCrear = useMutation({
    mutationFn: () => {
      if (!userData) throw new Error('Sin sesión');
      const monto = parseFloat(form.montoAnticipo);
      const total = parseFloat(form.totalEstimado);
      return crearAnticipo(
        {
          clienteNombre: form.clienteNombre.trim(),
          clienteTelefono: form.clienteTelefono.trim() || undefined,
          descripcion: form.descripcion.trim(),
          montoAnticipo: monto,
          totalEstimado: total || undefined,
          metodoPago: form.metodoPago,
          submetodoTarjeta: (form.metodoPago === 'tarjeta' && form.submetodoTarjeta) || undefined,
          fechaEntregaEstimada: form.fechaEntregaEstimada
            ? Timestamp.fromDate(new Date(form.fechaEntregaEstimada + 'T12:00:00'))
            : undefined,
          notas: form.notas.trim() || undefined,
          estado: 'recibido',
          usuarioId: userData.id,
          usuarioNombre: userData.nombre,
          fechaRecepcion: Timestamp.now(),
        },
        turnoActivo?.id
      );
    },
    onSuccess: () => {
      toast.success('Anticipo registrado');
      setDialogNuevo(false);
      setForm(FORM_INICIAL);
      invalidar();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mutAplicar = useMutation({
    mutationFn: (id: string) => aplicarAnticipo(id),
    onSuccess: () => { toast.success('Anticipo marcado como aplicado'); invalidar(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const mutSaldar = useMutation({
    mutationFn: (id: string) => saldarAnticipo(id),
    onSuccess: () => { toast.success('Anticipo saldado'); invalidar(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const mutCancelar = useMutation({
    mutationFn: () => {
      if (!dialogCancelar || !userData || !turnoActivo) throw new Error('Datos incompletos');
      return cancelarAnticipo(
        dialogCancelar.id,
        motivoCancelacion || 'Sin motivo',
        turnoActivo.id,
        userData.id
      );
    },
    onSuccess: () => {
      toast.success('Anticipo cancelado');
      setDialogCancelar(null);
      setMotivoCancelacion('');
      invalidar();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ─── Formulario helpers ──────────────────────────────────────────────────────

  const setField = <K extends keyof FormData>(k: K, v: FormData[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const montoAnticipo = parseFloat(form.montoAnticipo) || 0;
  const montoNetoClip = form.metodoPago === 'tarjeta' ? calcularMontoNetoClip(montoAnticipo) : 0;
  const formValido =
    form.clienteNombre.trim() &&
    form.descripcion.trim() &&
    montoAnticipo > 0;

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Anticipos</h1>
          <p className="text-sm text-muted-foreground">Pedidos especiales y pagos adelantados</p>
        </div>
        <Button onClick={() => setDialogNuevo(true)} className="bg-red-600 hover:bg-red-700 text-white">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo anticipo
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Activos</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold">{activos.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Monto pendiente</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPendiente)}</p>
          </CardContent>
        </Card>
        <Card className="col-span-2 md:col-span-1">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total registrados</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold">{anticipos.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtro */}
      <div className="flex gap-2 flex-wrap">
        {(['todos', 'recibido', 'aplicado', 'saldado', 'cancelado'] as const).map((e) => (
          <Button
            key={e}
            variant={filtroEstado === e ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFiltroEstado(e)}
            className={filtroEstado === e ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
          >
            {e === 'todos' ? 'Todos' : ESTADO_LABEL[e]}
          </Button>
        ))}
      </div>

      {/* Tabla */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : anticiposFiltrados.length === 0 ? (
            <p className="text-center text-muted-foreground py-10">Sin anticipos</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-right">Anticipo</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Fecha entrega</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {anticiposFiltrados.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>
                        <div className="font-medium">{a.clienteNombre}</div>
                        {a.clienteTelefono && (
                          <div className="text-xs text-muted-foreground">{a.clienteTelefono}</div>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <span className="text-sm line-clamp-2">{a.descripcion}</span>
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {formatCurrency(a.montoAnticipo)}
                        {a.totalEstimado && (
                          <div className="text-xs text-muted-foreground">
                            de {formatCurrency(a.totalEstimado)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm capitalize">{a.metodoPago}</span>
                        {a.submetodoTarjeta && (
                          <div className="text-xs text-muted-foreground">{a.submetodoTarjeta.replace('_', ' ')}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {a.fechaEntregaEstimada
                          ? format(a.fechaEntregaEstimada.toDate(), 'dd MMM', { locale: es })
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={ESTADO_VARIANT[a.estado]}>
                          {ESTADO_LABEL[a.estado]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <AccionesAnticipo
                          anticipo={a}
                          turnoAbierto={!!turnoActivo}
                          onAplicar={() => mutAplicar.mutate(a.id)}
                          onSaldar={() => mutSaldar.mutate(a.id)}
                          onCancelar={() => setDialogCancelar({ id: a.id, nombre: a.clienteNombre })}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Nuevo anticipo */}
      <Dialog open={dialogNuevo} onOpenChange={setDialogNuevo}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nuevo anticipo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Cliente *</Label>
                <Input
                  placeholder="Nombre del cliente"
                  value={form.clienteNombre}
                  onChange={(e) => setField('clienteNombre', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Teléfono</Label>
                <Input
                  placeholder="10 dígitos"
                  value={form.clienteTelefono}
                  onChange={(e) => setField('clienteTelefono', e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Descripción del pedido *</Label>
              <Input
                placeholder="Ej: 2 briskets + sides para evento..."
                value={form.descripcion}
                onChange={(e) => setField('descripcion', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Monto anticipo *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.montoAnticipo}
                  onChange={(e) => setField('montoAnticipo', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Total estimado</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.totalEstimado}
                  onChange={(e) => setField('totalEstimado', e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Método de pago</Label>
                <Select
                  value={form.metodoPago}
                  onValueChange={(v) => { setField('metodoPago', v as MetodoPago); setField('submetodoTarjeta', ''); }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="efectivo">Efectivo</SelectItem>
                    <SelectItem value="tarjeta">Tarjeta / Clip</SelectItem>
                    <SelectItem value="transferencia">Transferencia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.metodoPago === 'tarjeta' && (
                <div className="space-y-1">
                  <Label>Canal Clip</Label>
                  <Select
                    value={form.submetodoTarjeta}
                    onValueChange={(v) => setField('submetodoTarjeta', v as SubmetodoTarjeta)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="clip_link">Clip Link</SelectItem>
                      <SelectItem value="clip_terminal">Clip Terminal</SelectItem>
                      <SelectItem value="otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            {form.metodoPago === 'tarjeta' && montoAnticipo > 0 && (
              <div className="rounded-md bg-amber-50 border border-amber-200 p-3 flex gap-2 text-sm text-amber-800">
                <Info className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Clip — depósito D+1</p>
                  <p>Monto neto estimado (ya sin comisión 4.2%): <strong>{formatCurrency(montoNetoClip)}</strong></p>
                  <p className="text-xs mt-1">Este ingreso se registrará en caja el día siguiente.</p>
                </div>
              </div>
            )}
            <div className="space-y-1">
              <Label>Fecha de entrega estimada</Label>
              <Input
                type="date"
                value={form.fechaEntregaEstimada}
                onChange={(e) => setField('fechaEntregaEstimada', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Notas</Label>
              <Input
                placeholder="Notas adicionales"
                value={form.notas}
                onChange={(e) => setField('notas', e.target.value)}
              />
            </div>
            {!turnoActivo && form.metodoPago === 'efectivo' && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                No hay turno abierto — el anticipo se guardará pero no se registrará en caja automáticamente.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogNuevo(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={!formValido || mutCrear.isPending}
              onClick={() => mutCrear.mutate()}
            >
              {mutCrear.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Registrar anticipo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Confirmar cancelación */}
      <Dialog open={!!dialogCancelar} onOpenChange={() => setDialogCancelar(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Cancelar anticipo</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Cancelar el anticipo de <strong>{dialogCancelar?.nombre}</strong>. Si fue en efectivo, se generará un egreso de devolución.
          </p>
          <div className="space-y-1">
            <Label>Motivo</Label>
            <Input
              placeholder="Motivo de cancelación"
              value={motivoCancelacion}
              onChange={(e) => setMotivoCancelacion(e.target.value)}
            />
          </div>
          {!turnoActivo && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
              Sin turno abierto — no se registrará el egreso de devolución.
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogCancelar(null)}>Volver</Button>
            <Button
              variant="destructive"
              disabled={mutCancelar.isPending}
              onClick={() => mutCancelar.mutate()}
            >
              {mutCancelar.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Cancelar anticipo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Botones de acción por fila ────────────────────────────────────────────────

function AccionesAnticipo({
  anticipo,
  turnoAbierto,
  onAplicar,
  onSaldar,
  onCancelar,
}: {
  anticipo: Anticipo;
  turnoAbierto: boolean;
  onAplicar: () => void;
  onSaldar: () => void;
  onCancelar: () => void;
}) {
  if (anticipo.estado === 'saldado' || anticipo.estado === 'cancelado') {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  return (
    <div className="flex gap-1 justify-end">
      {anticipo.estado === 'recibido' && (
        <Button size="sm" variant="outline" onClick={onAplicar} className="text-xs h-7">
          Aplicar
        </Button>
      )}
      {anticipo.estado === 'aplicado' && (
        <Button size="sm" variant="outline" onClick={onSaldar} className="text-xs h-7 text-green-700 border-green-300 hover:bg-green-50">
          Saldar
        </Button>
      )}
      <Button
        size="sm"
        variant="outline"
        onClick={onCancelar}
        disabled={!turnoAbierto && anticipo.metodoPago === 'efectivo'}
        className="text-xs h-7 text-red-600 border-red-200 hover:bg-red-50"
      >
        Cancelar
      </Button>
    </div>
  );
}
