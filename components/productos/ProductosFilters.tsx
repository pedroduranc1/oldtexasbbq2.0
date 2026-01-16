/**
 * ProductosFilters Component
 * Old Texas BBQ - CRM
 *
 * Filtros de categoría, disponibilidad y ordenamiento
 */

'use client';

import { Filter } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';

interface ProductosFiltersProps {
  categorias: string[];
  categoriaSeleccionada: string;
  onCategoriaChange: (categoria: string) => void;
  disponibilidadFiltro: 'todos' | 'disponible' | 'agotado';
  onDisponibilidadChange: (disponibilidad: 'todos' | 'disponible' | 'agotado') => void;
  ordenamiento: 'nombre' | 'precio' | 'fecha';
  onOrdenamientoChange: (ordenamiento: 'nombre' | 'precio' | 'fecha') => void;
}

export default function ProductosFilters({
  categorias,
  categoriaSeleccionada,
  onCategoriaChange,
  disponibilidadFiltro,
  onDisponibilidadChange,
  ordenamiento,
  onOrdenamientoChange,
}: ProductosFiltersProps) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-semibold">Filtros</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Filtro por Categoría */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Categoría</label>
          <Select value={categoriaSeleccionada} onValueChange={onCategoriaChange}>
            <SelectTrigger>
              <SelectValue placeholder="Todas las categorías" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las categorías</SelectItem>
              {categorias.map((categoria) => (
                <SelectItem key={categoria} value={categoria}>
                  {categoria}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filtro por Disponibilidad */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Disponibilidad</label>
          <Select value={disponibilidadFiltro} onValueChange={onDisponibilidadChange}>
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="disponible">Disponibles</SelectItem>
              <SelectItem value="agotado">Agotados</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Ordenamiento */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Ordenar por</label>
          <Select value={ordenamiento} onValueChange={onOrdenamientoChange}>
            <SelectTrigger>
              <SelectValue placeholder="Nombre" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nombre">Nombre (A-Z)</SelectItem>
              <SelectItem value="precio">Precio (Menor a Mayor)</SelectItem>
              <SelectItem value="fecha">Más recientes</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </Card>
  );
}
