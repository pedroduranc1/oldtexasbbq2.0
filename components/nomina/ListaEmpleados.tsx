'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, UserX, UserCheck, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { empleadosService } from '@/lib/services/empleados.service';
import { Empleado, NuevoEmpleado, CargoEmpleado, PeriodoNomina } from '@/lib/types/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const CARGOS: Record<CargoEmpleado, string> = {
  cajera: 'Cajera',
  cocinero: 'Cocinero',
  repartidor: 'Repartidor',
  encargado: 'Encargado',
  limpieza: 'Limpieza',
  otro: 'Otro',
};

const PERIODOS: Record<PeriodoNomina, string> = {
  semanal: 'Semanal',
  quincenal: 'Quincenal',
  mensual: 'Mensual',
};

const ESTADO_COLORS: Record<string, string> = {
  activo:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  inactivo: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  baja:     'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const EMPTY: Omit<NuevoEmpleado, 'estado'> = {
  nombre: '',
  cargo: 'cajera',
  salarioBase: 0,
  periodoPago: 'semanal',
  fechaContratacion: format(new Date(), 'yyyy-MM-dd'),
  telefono: '',
  notas: '',
};

export function ListaEmpleados() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Empleado | null>(null);
  const [form, setForm] = useState<Omit<NuevoEmpleado, 'estado'>>(EMPTY);
  const [busqueda, setBusqueda] = useState('');

  const { data: empleados = [], isLoading } = useQuery({
    queryKey: ['empleados'],
    queryFn: () => empleadosService.getTodos(),
    staleTime: 5 * 60 * 1000,
  });

  const mutCrear = useMutation({
    mutationFn: (data: NuevoEmpleado) => empleadosService.crear(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['empleados'] }); toast.success('Empleado registrado'); cerrarModal(); },
    onError: () => toast.error('Error al guardar'),
  });

  const mutActualizar = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<NuevoEmpleado> }) =>
      empleadosService.actualizar(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['empleados'] }); toast.success('Empleado actualizado'); cerrarModal(); },
    onError: () => toast.error('Error al actualizar'),
  });

  const mutEstado = useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: Empleado['estado'] }) =>
      empleadosService.cambiarEstado(id, estado),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['empleados'] }); toast.success('Estado actualizado'); },
    onError: () => toast.error('Error al cambiar estado'),
  });

  const abrirNuevo = () => { setEditando(null); setForm(EMPTY); setModalOpen(true); };
  const abrirEditar = (e: Empleado) => {
    setEditando(e);
    setForm({
      nombre:            e.nombre            ?? '',
      cargo:             e.cargo             ?? 'cajera',
      salarioBase:       e.salarioBase       ?? 0,
      periodoPago:       e.periodoPago       ?? 'semanal',
      fechaContratacion: e.fechaContratacion ?? format(new Date(), 'yyyy-MM-dd'),
      telefono:          e.telefono          ?? '',
      notas:             e.notas             ?? '',
    });
    setModalOpen(true);
  };
  const cerrarModal = () => { setModalOpen(false); setEditando(null); };

  const handleSubmit = () => {
    if (!form.nombre.trim()) return toast.error('El nombre es requerido');
    if (form.salarioBase <= 0) return toast.error('El salario debe ser mayor a cero');
    if (editando) {
      mutActualizar.mutate({ id: editando.id, data: form });
    } else {
      mutCrear.mutate({ ...form, estado: 'activo' });
    }
  };

  const filtrados = empleados.filter((e) =>
    e.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    CARGOS[e.cargo]?.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Barra superior */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Input
          placeholder="Buscar empleado..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="max-w-xs"
        />
        <Button onClick={abrirNuevo} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo empleado
        </Button>
      </div>

      {/* Tabla */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nombre</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Cargo</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Salario base</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Periodo</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Contratación</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 rounded bg-muted animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtrados.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground text-sm">
                  {busqueda ? 'Sin resultados' : 'No hay empleados registrados'}
                </td>
              </tr>
            ) : (
              filtrados.map((emp) => (
                <tr key={emp.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">
                    <div>{emp.nombre}</div>
                    {emp.telefono && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <Phone className="h-3 w-3" />
                        {emp.telefono}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{CARGOS[emp.cargo]}</td>
                  <td className="px-4 py-3 text-right font-semibold text-foreground">
                    ${(emp.salarioBase ?? 0).toLocaleString('es-MX')}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{PERIODOS[emp.periodoPago]}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {emp.fechaContratacion
                      ? format(new Date(emp.fechaContratacion + 'T12:00:00'), "d MMM yyyy", { locale: es })
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_COLORS[emp.estado]}`}>
                      {emp.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => abrirEditar(emp)}
                        className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      {emp.estado === 'activo' ? (
                        <button
                          onClick={() => mutEstado.mutate({ id: emp.id, estado: 'inactivo' })}
                          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-orange-500 transition-colors"
                          title="Desactivar"
                        >
                          <UserX className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => mutEstado.mutate({ id: emp.id, estado: 'activo' })}
                          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-emerald-500 transition-colors"
                          title="Activar"
                        >
                          <UserCheck className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal crear/editar */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar empleado' : 'Nuevo empleado'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nombre completo *</Label>
              <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej. María González" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Cargo *</Label>
                <Select value={form.cargo} onValueChange={(v) => setForm({ ...form, cargo: v as CargoEmpleado })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CARGOS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Periodo de pago *</Label>
                <Select value={form.periodoPago} onValueChange={(v) => setForm({ ...form, periodoPago: v as PeriodoNomina })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PERIODOS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Salario base (MXN) *</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.salarioBase || ''}
                  onChange={(e) => setForm({ ...form, salarioBase: Number(e.target.value) })}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Fecha de contratación</Label>
                <Input
                  type="date"
                  value={form.fechaContratacion}
                  onChange={(e) => setForm({ ...form, fechaContratacion: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Teléfono</Label>
              <Input value={form.telefono ?? ''} onChange={(e) => setForm({ ...form, telefono: e.target.value })} placeholder="Opcional" />
            </div>

            <div className="space-y-1.5">
              <Label>Notas</Label>
              <Input value={form.notas ?? ''} onChange={(e) => setForm({ ...form, notas: e.target.value })} placeholder="Opcional" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={cerrarModal}>Cancelar</Button>
            <Button
              onClick={handleSubmit}
              disabled={mutCrear.isPending || mutActualizar.isPending}
            >
              {editando ? 'Guardar cambios' : 'Registrar empleado'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
