'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, UserX, UserCheck, Phone, ChevronDown, ChevronUp, Landmark, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { empleadosService } from '@/lib/services/empleados.service';
import { prestamosService } from '@/lib/services/prestamos.service';
import { Empleado, NuevoEmpleado, CargoEmpleado, PeriodoNomina, JornadaEmpleado, NuevoPrestamo } from '@/lib/types/firestore';
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

const JORNADAS: Record<JornadaEmpleado, string> = {
  completa:    'Tiempo completo',
  medio_tiempo: 'Medio tiempo',
};

const EMPTY: Omit<NuevoEmpleado, 'estado'> = {
  nombre: '',
  cargo: 'cajera',
  salarioBase: 0,
  salarioDiario: undefined,
  jornada: undefined,
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
  const [expedienteAbierto, setExpedienteAbierto] = useState(false);
  const [prestamosAbierto, setPrestamosAbierto] = useState(false);
  const [nuevoPrestamoOpen, setNuevoPrestamoOpen] = useState(false);
  const [formPrestamo, setFormPrestamo] = useState({ montoTotal: 0, descuentoSemanal: 0, notas: '' });

  const { data: empleados = [], isLoading } = useQuery({
    queryKey: ['empleados'],
    queryFn: () => empleadosService.getTodos(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: prestamosActivos = [], refetch: refetchPrestamos } = useQuery({
    queryKey: ['prestamos-activos', editando?.id],
    queryFn: () => prestamosService.getActivosPorEmpleado(editando!.id),
    enabled: !!editando?.id,
    staleTime: 0,
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

  const mutCrearPrestamo = useMutation({
    mutationFn: (data: NuevoPrestamo) => prestamosService.crear(data),
    onSuccess: () => {
      refetchPrestamos();
      setNuevoPrestamoOpen(false);
      setFormPrestamo({ montoTotal: 0, descuentoSemanal: 0, notas: '' });
      toast.success('Préstamo registrado');
    },
    onError: () => toast.error('Error al registrar préstamo'),
  });

  const mutAplicarDescuento = useMutation({
    mutationFn: (prestamoId: string) => prestamosService.aplicarDescuentoSemanal(prestamoId),
    onSuccess: (montoDescontado) => {
      refetchPrestamos();
      toast.success(`Descuento de $${montoDescontado.toLocaleString('es-MX')} aplicado`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mutSaldarPrestamo = useMutation({
    mutationFn: (id: string) => prestamosService.saldar(id),
    onSuccess: () => { refetchPrestamos(); toast.success('Préstamo saldado'); },
    onError: () => toast.error('Error al saldar'),
  });

  const abrirNuevo = () => {
    setEditando(null);
    setForm(EMPTY);
    setExpedienteAbierto(false);
    setPrestamosAbierto(false);
    setModalOpen(true);
  };
  const abrirEditar = (e: Empleado) => {
    setEditando(e);
    setForm({
      nombre:              e.nombre              ?? '',
      cargo:               e.cargo               ?? 'cajera',
      salarioBase:         e.salarioBase         ?? 0,
      salarioDiario:       e.salarioDiario,
      jornada:             e.jornada,
      periodoPago:         e.periodoPago         ?? 'semanal',
      fechaContratacion:   e.fechaContratacion   ?? format(new Date(), 'yyyy-MM-dd'),
      telefono:            e.telefono            ?? '',
      notas:               e.notas               ?? '',
      sucursal:            e.sucursal,
      bonoPermanenciaFecha: e.bonoPermanenciaFecha,
      curp:                e.curp,
      rfc:                 e.rfc,
      nss:                 e.nss,
      fechaNacimiento:     e.fechaNacimiento,
      direccion:           e.direccion,
      contactoEmergencia:  e.contactoEmergencia,
    });
    setExpedienteAbierto(false);
    setPrestamosAbierto(false);
    setModalOpen(true);
  };
  const cerrarModal = () => {
    setModalOpen(false);
    setEditando(null);
    setExpedienteAbierto(false);
    setPrestamosAbierto(false);
    setNuevoPrestamoOpen(false);
  };

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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar empleado' : 'Nuevo empleado'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Nombre */}
            <div className="space-y-1.5">
              <Label>Nombre completo *</Label>
              <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej. María González" />
            </div>

            {/* Cargo + Periodo */}
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

            {/* Salarios + Jornada */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Salario diario (MXN)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.salarioDiario ?? ''}
                  onChange={(e) => setForm({ ...form, salarioDiario: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="Ej. 285.72"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Jornada</Label>
                <Select
                  value={form.jornada ?? '__none__'}
                  onValueChange={(v) => setForm({ ...form, jornada: v === '__none__' ? undefined : v as JornadaEmpleado })}
                >
                  <SelectTrigger><SelectValue placeholder="Sin especificar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sin especificar</SelectItem>
                    {Object.entries(JORNADAS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Salario base + Contratación */}
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

            {/* Teléfono + Notas */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Teléfono</Label>
                <Input value={form.telefono ?? ''} onChange={(e) => setForm({ ...form, telefono: e.target.value })} placeholder="Opcional" />
              </div>
              <div className="space-y-1.5">
                <Label>Sucursal</Label>
                <Input value={form.sucursal ?? ''} onChange={(e) => setForm({ ...form, sucursal: e.target.value })} placeholder="Opcional" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Bono permanencia (próxima fecha)</Label>
              <Input
                type="date"
                value={form.bonoPermanenciaFecha ?? ''}
                onChange={(e) => setForm({ ...form, bonoPermanenciaFecha: e.target.value || undefined })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Notas</Label>
              <Input value={form.notas ?? ''} onChange={(e) => setForm({ ...form, notas: e.target.value })} placeholder="Opcional" />
            </div>

            {/* Sección préstamos — solo al editar */}
            {editando && (
              <div className="border border-border rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setPrestamosAbierto((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 text-sm font-medium hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Landmark className="h-4 w-4" />
                    Préstamos activos
                    {prestamosActivos.length > 0 && (
                      <span className="bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 text-xs px-1.5 py-0.5 rounded-full">
                        {prestamosActivos.length}
                      </span>
                    )}
                  </span>
                  {prestamosAbierto ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {prestamosAbierto && (
                  <div className="p-4 space-y-3">
                    {prestamosActivos.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-2">Sin préstamos activos</p>
                    ) : (
                      <div className="space-y-2">
                        {prestamosActivos.map((p) => (
                          <div key={p.id} className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium text-foreground">
                                ${p.montoTotal.toLocaleString('es-MX')} total
                              </span>
                              <span className="text-muted-foreground">
                                Saldo: <span className="text-amber-600 font-semibold">${p.saldoPendiente.toLocaleString('es-MX')}</span>
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Descuento semanal: ${p.descuentoSemanal.toLocaleString('es-MX')}
                              {p.notas && <span> · {p.notas}</span>}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1 flex-1"
                                onClick={() => mutAplicarDescuento.mutate(p.id)}
                                disabled={mutAplicarDescuento.isPending}
                              >
                                <CreditCard className="h-3 w-3" />
                                Aplicar descuento esta semana
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs text-muted-foreground hover:text-emerald-600"
                                onClick={() => mutSaldarPrestamo.mutate(p.id)}
                                disabled={mutSaldarPrestamo.isPending}
                              >
                                Saldar
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Formulario nuevo préstamo */}
                    {nuevoPrestamoOpen ? (
                      <div className="rounded-lg border border-dashed border-amber-300 dark:border-amber-700 p-3 space-y-3">
                        <p className="text-xs font-medium text-amber-700 dark:text-amber-400">Nuevo préstamo</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Monto total</Label>
                            <Input
                              type="number"
                              min={0}
                              value={formPrestamo.montoTotal || ''}
                              onChange={(e) => setFormPrestamo({ ...formPrestamo, montoTotal: Number(e.target.value) })}
                              placeholder="0.00"
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Descuento semanal</Label>
                            <Input
                              type="number"
                              min={0}
                              value={formPrestamo.descuentoSemanal || ''}
                              onChange={(e) => setFormPrestamo({ ...formPrestamo, descuentoSemanal: Number(e.target.value) })}
                              placeholder="0.00"
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>
                        <Input
                          value={formPrestamo.notas}
                          onChange={(e) => setFormPrestamo({ ...formPrestamo, notas: e.target.value })}
                          placeholder="Notas (opcional)"
                          className="h-8 text-sm"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="h-7 text-xs flex-1"
                            onClick={() => {
                              if (!formPrestamo.montoTotal || !formPrestamo.descuentoSemanal) {
                                return toast.error('Monto y descuento semanal son requeridos');
                              }
                              mutCrearPrestamo.mutate({
                                empleadoId:       editando.id,
                                empleadoNombre:   editando.nombre,
                                montoTotal:       formPrestamo.montoTotal,
                                saldoPendiente:   formPrestamo.montoTotal,
                                descuentoSemanal: formPrestamo.descuentoSemanal,
                                estado:           'activo',
                                ...(formPrestamo.notas ? { notas: formPrestamo.notas } : {}),
                              });
                            }}
                            disabled={mutCrearPrestamo.isPending}
                          >
                            Guardar préstamo
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => setNuevoPrestamoOpen(false)}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full h-8 text-xs gap-1 border-dashed"
                        onClick={() => setNuevoPrestamoOpen(true)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Registrar nuevo préstamo
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Sección expediente colapsable */}
            <div className="border border-border rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setExpedienteAbierto((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/30 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
              >
                Expediente (CURP, RFC, NSS, emergencia)
                {expedienteAbierto ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              {expedienteAbierto && (
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label>CURP</Label>
                      <Input value={form.curp ?? ''} onChange={(e) => setForm({ ...form, curp: e.target.value || undefined })} placeholder="18 caracteres" className="uppercase" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>RFC</Label>
                      <Input value={form.rfc ?? ''} onChange={(e) => setForm({ ...form, rfc: e.target.value || undefined })} placeholder="13 caracteres" className="uppercase" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>NSS</Label>
                      <Input value={form.nss ?? ''} onChange={(e) => setForm({ ...form, nss: e.target.value || undefined })} placeholder="11 dígitos" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Fecha de nacimiento</Label>
                      <Input
                        type="date"
                        value={form.fechaNacimiento ?? ''}
                        onChange={(e) => setForm({ ...form, fechaNacimiento: e.target.value || undefined })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Dirección</Label>
                      <Input value={form.direccion ?? ''} onChange={(e) => setForm({ ...form, direccion: e.target.value || undefined })} placeholder="Calle, número, colonia" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Contacto emergencia — nombre</Label>
                      <Input
                        value={form.contactoEmergencia?.nombre ?? ''}
                        onChange={(e) => setForm({ ...form, contactoEmergencia: e.target.value ? { nombre: e.target.value, telefono: form.contactoEmergencia?.telefono ?? '' } : undefined })}
                        placeholder="Nombre"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Contacto emergencia — teléfono</Label>
                      <Input
                        value={form.contactoEmergencia?.telefono ?? ''}
                        onChange={(e) => setForm({ ...form, contactoEmergencia: e.target.value ? { nombre: form.contactoEmergencia?.nombre ?? '', telefono: e.target.value } : undefined })}
                        placeholder="Teléfono"
                      />
                    </div>
                  </div>
                </div>
              )}
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
