'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Pencil, UserX, Loader2, Phone, Mail, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  crearProveedor,
  actualizarProveedor,
  desactivarProveedor,
  suscribirProveedores,
  type Proveedor,
  type NuevoProveedor,
} from '@/lib/services/proveedores.service';
import { useAuthStore } from '@/lib/stores/auth.store';

interface FormValues {
  nombre: string;
  contacto: string;
  email: string;
  telefono: string;
  direccion: string;
  rfc: string;
  notas: string;
}

export function ProveedoresManager() {
  const { userData } = useAuthStore();
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [cargando, setCargando] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState<Proveedor | null>(null);
  const [guardando, setGuardando] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>();

  useEffect(() => {
    const unsub = suscribirProveedores((p) => {
      setProveedores(p);
      setCargando(false);
    });
    return unsub;
  }, []);

  function abrirNuevo() {
    setEditando(null);
    reset({ nombre: '', contacto: '', email: '', telefono: '', direccion: '', rfc: '', notas: '' });
    setDialogOpen(true);
  }

  function abrirEdicion(p: Proveedor) {
    setEditando(p);
    reset({
      nombre: p.nombre,
      contacto: p.contacto,
      email: p.email,
      telefono: p.telefono,
      direccion: p.direccion ?? '',
      rfc: p.rfc ?? '',
      notas: p.notas ?? '',
    });
    setDialogOpen(true);
  }

  async function onSubmit(data: FormValues) {
    if (!userData) return;
    setGuardando(true);
    try {
      if (editando) {
        await actualizarProveedor(editando.id, {
          nombre: data.nombre,
          contacto: data.contacto,
          email: data.email,
          telefono: data.telefono,
          direccion: data.direccion || undefined,
          rfc: data.rfc || undefined,
          notas: data.notas || undefined,
        });
        toast.success('Proveedor actualizado');
      } else {
        await crearProveedor({
          nombre: data.nombre,
          contacto: data.contacto,
          email: data.email,
          telefono: data.telefono,
          direccion: data.direccion || undefined,
          rfc: data.rfc || undefined,
          notas: data.notas || undefined,
          activo: true,
          creadoPor: userData.id,
        } as NuevoProveedor);
        toast.success('Proveedor creado');
      }
      setDialogOpen(false);
    } catch {
      toast.error('Error al guardar el proveedor');
    } finally {
      setGuardando(false);
    }
  }

  async function handleDesactivar(p: Proveedor) {
    try {
      await desactivarProveedor(p.id);
      toast.success(`${p.nombre} desactivado`);
    } catch {
      toast.error('Error al desactivar');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {proveedores.length} proveedor{proveedores.length !== 1 ? 'es' : ''} activo{proveedores.length !== 1 ? 's' : ''}
        </p>
        <Button size="sm" onClick={abrirNuevo}>
          <Plus className="h-4 w-4 mr-1" />
          Nuevo proveedor
        </Button>
      </div>

      {cargando ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Cargando proveedores…</p>
      ) : proveedores.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground space-y-2">
          <Building2 className="h-10 w-10 mx-auto opacity-30" />
          <p className="text-sm">No hay proveedores registrados.</p>
          <Button size="sm" variant="outline" onClick={abrirNuevo}>Agregar primero</Button>
        </div>
      ) : (
        <div className="rounded-md border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>RFC</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proveedores.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nombre}</TableCell>
                  <TableCell className="text-sm">{p.contacto}</TableCell>
                  <TableCell>
                    <a href={`tel:${p.telefono}`} className="flex items-center gap-1 text-sm hover:underline">
                      <Phone className="h-3 w-3" />{p.telefono}
                    </a>
                  </TableCell>
                  <TableCell>
                    <a href={`mailto:${p.email}`} className="flex items-center gap-1 text-sm hover:underline">
                      <Mail className="h-3 w-3" />{p.email}
                    </a>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.rfc ?? '—'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => abrirEdicion(p)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDesactivar(p)}
                      >
                        <UserX className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog formulario */}
      <Dialog open={dialogOpen} onOpenChange={(v) => !v && setDialogOpen(false)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar proveedor' : 'Nuevo proveedor'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>Nombre del negocio *</Label>
                <Input {...register('nombre', { required: true })} />
                {errors.nombre && <p className="text-xs text-destructive">Requerido</p>}
              </div>
              <div className="space-y-1">
                <Label>Persona de contacto *</Label>
                <Input {...register('contacto', { required: true })} />
                {errors.contacto && <p className="text-xs text-destructive">Requerido</p>}
              </div>
              <div className="space-y-1">
                <Label>Teléfono *</Label>
                <Input type="tel" {...register('telefono', { required: true })} />
                {errors.telefono && <p className="text-xs text-destructive">Requerido</p>}
              </div>
              <div className="space-y-1">
                <Label>Email *</Label>
                <Input type="email" {...register('email', { required: true })} />
                {errors.email && <p className="text-xs text-destructive">Requerido</p>}
              </div>
              <div className="space-y-1">
                <Label>RFC</Label>
                <Input placeholder="Opcional" {...register('rfc')} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Dirección</Label>
                <Input placeholder="Opcional" {...register('direccion')} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Notas</Label>
                <Textarea rows={2} placeholder="Condiciones de pago, días de entrega…" {...register('notas')} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={guardando}>
                Cancelar
              </Button>
              <Button type="submit" disabled={guardando}>
                {guardando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editando ? 'Guardar cambios' : 'Crear proveedor'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
