/**
 * ProductosHeader Component
 * Old Texas BBQ - CRM
 *
 * Header con búsqueda, toggle de vista y botón de nuevo producto
 */

'use client';

import { Search, Grid3x3, List, Plus, FileSpreadsheet } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface ProductosHeaderProps {
  totalProductos: number;
  productosFiltrados: number;
  vista: 'tabla' | 'grid';
  onToggleVista: () => void;
  busqueda: string;
  onBusquedaChange: (busqueda: string) => void;
  onNuevoProducto: () => void;
  onImportExport?: () => void;
}

export default function ProductosHeader({
  totalProductos,
  productosFiltrados,
  vista,
  onToggleVista,
  busqueda,
  onBusquedaChange,
  onNuevoProducto,
  onImportExport,
}: ProductosHeaderProps) {
  return (
    <div className="space-y-4">
      {/* Título y Stats */}
      <div className="flex flex-col md:flex-row gap-2 items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Productos</h1>
          <p className="text-muted-foreground mt-1">
            {productosFiltrados === totalProductos
              ? `${totalProductos} productos en total`
              : `${productosFiltrados} de ${totalProductos} productos`}
          </p>
        </div>

        {/* Botones de acción */}
        <div className='flex flex-wrap gap-2'>
          {onImportExport && (
            <Button
              variant="outline"
              size="lg"
              className="gap-2"
              onClick={onImportExport}
            >
              <FileSpreadsheet className="h-5 w-5" />
              Import/Export
            </Button>
          )}
          <Button size="lg" className="gap-2" onClick={onNuevoProducto}>
            <Plus className="h-5 w-5" />
            Nuevo Producto
          </Button>
          <Link href={'/productos/categorias'}>
            <Button size="lg" variant="outline" className="gap-2">
              Categorías
            </Button>
          </Link>
        </div>

      </div>

      {/* Barra de búsqueda y toggle de vista */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Búsqueda */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar productos por nombre, descripción o etiquetas..."
            value={busqueda}
            onChange={(e) => onBusquedaChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Toggle Vista */}
        <div className="flex gap-2">
          <Button
            variant={vista === 'grid' ? 'default' : 'outline'}
            size="icon"
            onClick={onToggleVista}
            title="Vista en cuadrícula"
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
          <Button
            variant={vista === 'tabla' ? 'default' : 'outline'}
            size="icon"
            onClick={onToggleVista}
            title="Vista en tabla"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
