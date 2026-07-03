/**
 * VariantesProducto Component
 * Old Texas BBQ - CRM
 *
 * Componente para gestionar variantes de producto (tamaños, extras)
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Plus,
  Edit,
  Trash2,
  GripVertical,
  Package,
  DollarSign,
} from 'lucide-react';
import { VarianteProducto } from '@/lib/types/firestore';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface VariantesProductoProps {
  variantes: VarianteProducto[];
  precioBase: number;
  onChange: (variantes: VarianteProducto[]) => void;
  disabled?: boolean;
}

// Componente de variante sortable
function SortableVariante({
  variante,
  precioBase,
  onEdit,
  onDelete,
  onToggleDisponible,
}: {
  variante: VarianteProducto;
  precioBase: number;
  onEdit: () => void;
  onDelete: () => void;
  onToggleDisponible: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: variante.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const formatoPrecio = (precio: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(precio);
  };

  const getTipoBadge = (tipo: VarianteProducto['tipo']) => {
    switch (tipo) {
      case 'tamaño':
        return <Badge variant="default">Tamaño</Badge>;
      case 'extra':
        return <Badge variant="secondary">Extra</Badge>;
      case 'personalizado':
        return <Badge variant="outline">Personalizado</Badge>;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        flex items-center gap-3 p-3 rounded-lg border
        ${variante.disponible ? 'bg-card' : 'bg-muted/50 opacity-60'}
      `}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium">{variante.nombre}</span>
          {getTipoBadge(variante.tipo)}
        </div>
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <span>{formatoPrecio(variante.precio)}</span>
          {variante.precioDiferencia !== undefined && variante.precioDiferencia !== 0 && (
            <span className={variante.precioDiferencia > 0 ? 'text-green-600' : 'text-red-600'}>
              ({variante.precioDiferencia > 0 ? '+' : ''}{formatoPrecio(variante.precioDiferencia)})
            </span>
          )}
        </div>
      </div>

      {/* Disponible */}
      <Switch
        checked={variante.disponible}
        onCheckedChange={onToggleDisponible}
      />

      {/* Acciones */}
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={onEdit}>
          <Edit className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onDelete}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

// Modal para crear/editar variante
function VarianteModal({
  open,
  onClose,
  variante,
  precioBase,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  variante?: VarianteProducto;
  precioBase: number;
  onSave: (variante: Omit<VarianteProducto, 'id' | 'orden'>) => void;
}) {
  const [nombre, setNombre] = useState(variante?.nombre || '');
  const [tipo, setTipo] = useState<VarianteProducto['tipo']>(variante?.tipo || 'tamaño');
  const [precio, setPrecio] = useState(variante?.precio || precioBase);
  const [disponible, setDisponible] = useState(variante?.disponible ?? true);

  const handleSave = () => {
    if (!nombre.trim()) return;

    onSave({
      nombre: nombre.trim(),
      tipo,
      precio,
      precioDiferencia: precio - precioBase,
      disponible,
    });

    onClose();
  };

  const formatoPrecio = (precio: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(precio);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {variante ? 'Editar Variante' : 'Nueva Variante'}
          </DialogTitle>
          <DialogDescription>
            Precio base del producto: {formatoPrecio(precioBase)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Nombre */}
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre de la variante</Label>
            <Input
              id="nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Grande, Con extra queso..."
            />
          </div>

          {/* Tipo */}
          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo de variante</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tamaño">Tamaño</SelectItem>
                <SelectItem value="extra">Extra</SelectItem>
                <SelectItem value="personalizado">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Precio */}
          <div className="space-y-2">
            <Label htmlFor="precio">Precio de esta variante</Label>
            <CurrencyInput
              id="precio"
              value={precio}
              onValueChange={setPrecio}
            />
            {precio !== precioBase && (
              <p className={`text-sm ${precio > precioBase ? 'text-green-600' : 'text-red-600'}`}>
                Diferencia: {precio > precioBase ? '+' : ''}{formatoPrecio(precio - precioBase)}
              </p>
            )}
          </div>

          {/* Disponible */}
          <div className="flex items-center justify-between">
            <Label htmlFor="disponible">Disponible para venta</Label>
            <Switch
              id="disponible"
              checked={disponible}
              onCheckedChange={setDisponible}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!nombre.trim()}>
            {variante ? 'Guardar' : 'Crear'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function VariantesProducto({
  variantes,
  precioBase,
  onChange,
  disabled = false,
}: VariantesProductoProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [varianteEditar, setVarianteEditar] = useState<VarianteProducto | undefined>();

  // Drag & drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = variantes.findIndex((v) => v.id === active.id);
    const newIndex = variantes.findIndex((v) => v.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(variantes, oldIndex, newIndex).map((v, i) => ({
      ...v,
      orden: i,
    }));

    onChange(newOrder);
  };

  const handleSaveVariante = (data: Omit<VarianteProducto, 'id' | 'orden'>) => {
    if (varianteEditar) {
      // Editar existente
      onChange(
        variantes.map((v) =>
          v.id === varianteEditar.id ? { ...v, ...data } : v
        )
      );
    } else {
      // Crear nueva
      const nuevaVariante: VarianteProducto = {
        id: `var-${Date.now()}`,
        orden: variantes.length,
        ...data,
      };
      onChange([...variantes, nuevaVariante]);
    }

    setVarianteEditar(undefined);
    setModalOpen(false);
  };

  const handleEditVariante = (variante: VarianteProducto) => {
    setVarianteEditar(variante);
    setModalOpen(true);
  };

  const handleDeleteVariante = (id: string) => {
    if (confirm('¿Eliminar esta variante?')) {
      onChange(variantes.filter((v) => v.id !== id));
    }
  };

  const handleToggleDisponible = (id: string) => {
    onChange(
      variantes.map((v) =>
        v.id === id ? { ...v, disponible: !v.disponible } : v
      )
    );
  };

  const handleNuevaVariante = () => {
    setVarianteEditar(undefined);
    setModalOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-muted-foreground" />
          <Label className="text-base font-medium">
            Variantes del producto
          </Label>
          {variantes.length > 0 && (
            <Badge variant="secondary">{variantes.length}</Badge>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleNuevaVariante}
          disabled={disabled}
          className="gap-1"
        >
          <Plus className="h-4 w-4" />
          Agregar
        </Button>
      </div>

      {/* Lista de variantes */}
      {variantes.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <Package className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground mb-3">
            Sin variantes. El producto se venderá al precio base.
          </p>
          <Button variant="outline" size="sm" onClick={handleNuevaVariante}>
            <Plus className="h-4 w-4 mr-1" />
            Agregar variante
          </Button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={variantes.map((v) => v.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {variantes.map((variante) => (
                <SortableVariante
                  key={variante.id}
                  variante={variante}
                  precioBase={precioBase}
                  onEdit={() => handleEditVariante(variante)}
                  onDelete={() => handleDeleteVariante(variante.id)}
                  onToggleDisponible={() => handleToggleDisponible(variante.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Info */}
      <p className="text-xs text-muted-foreground">
        Las variantes permiten ofrecer diferentes opciones (tamaños, extras) con precios distintos.
      </p>

      {/* Modal */}
      <VarianteModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setVarianteEditar(undefined);
        }}
        variante={varianteEditar}
        precioBase={precioBase}
        onSave={handleSaveVariante}
      />
    </div>
  );
}
