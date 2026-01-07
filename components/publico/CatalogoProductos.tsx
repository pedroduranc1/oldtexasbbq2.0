'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Producto } from '@/lib/types/firestore';
import { productosService } from '@/lib/services/productos.service';
import { Plus, Search, Flame, Star } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface CatalogoProductosProps {
  onAgregarProducto: (producto: Producto) => void;
}

export function CatalogoProductos({
  onAgregarProducto,
}: CatalogoProductosProps) {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<
    string | null
  >(null);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarProductos();
  }, []);

  const cargarProductos = async () => {
    try {
      setCargando(true);
      const productosDisponibles =
        await productosService.getDisponiblesOrdenadosPorMenu();
      setProductos(productosDisponibles);
    } catch (error) {
      console.error('Error cargando productos:', error);
      toast.error('Error al cargar los productos');
    } finally {
      setCargando(false);
    }
  };

  // Obtener categorías únicas
  const categorias = Array.from(
    new Set(productos.map((p) => p.categoria))
  ).sort();

  // Filtrar productos
  const productosFiltrados = productos.filter((producto) => {
    const matchCategoria =
      !categoriaSeleccionada || producto.categoria === categoriaSeleccionada;
    const matchBusqueda =
      !busqueda ||
      producto.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      producto.descripcion.toLowerCase().includes(busqueda.toLowerCase());

    return matchCategoria && matchBusqueda;
  });

  const handleAgregar = (producto: Producto) => {
    onAgregarProducto(producto);
    toast.success(`${producto.nombre} agregado al carrito`, {
      duration: 2000,
    });
  };

  if (cargando) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="p-4 space-y-4">
              <Skeleton className="h-48 w-full rounded-lg" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-10 w-full" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Búsqueda */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <Input
          type="text"
          placeholder="Buscar productos..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="pl-10 h-12 text-lg"
        />
      </div>

      {/* Filtro de categorías */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={categoriaSeleccionada === null ? 'default' : 'outline'}
          onClick={() => setCategoriaSeleccionada(null)}
          className={cn(
            categoriaSeleccionada === null && 'bg-red-600 hover:bg-red-700'
          )}
        >
          Todos
        </Button>
        {categorias.map((categoria) => (
          <Button
            key={categoria}
            variant={
              categoriaSeleccionada === categoria ? 'default' : 'outline'
            }
            onClick={() => setCategoriaSeleccionada(categoria)}
            className={cn(
              categoriaSeleccionada === categoria &&
              'bg-red-600 hover:bg-red-700'
            )}
          >
            {categoria}
          </Button>
        ))}
      </div>

      {/* Grid de productos */}
      {productosFiltrados.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-gray-500 text-lg">
            No se encontraron productos con esos criterios
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {productosFiltrados.map((producto) => (
            <Card
              key={producto.id}
              className="overflow-hidden hover:shadow-xl transition-shadow duration-300 group"
            >
              {/* Imagen del producto */}
              <div className="relative h-48 bg-gray-100 overflow-hidden">
                {producto.foto ? (
                  <Image
                    src={producto.foto}
                    alt={producto.nombre}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-6xl">
                    🍖
                  </div>
                )}

                {/* Badges */}
                <div className="absolute top-2 left-2 flex gap-2">
                  {producto.enPromocion && (
                    <Badge key="promo" className="bg-red-600 text-white">
                      <Flame className="h-3 w-3 mr-1" />
                      Promoción
                    </Badge>
                  )}
                  {producto.destacado && (
                    <Badge key="destacado" className="bg-yellow-500 text-white">
                      <Star className="h-3 w-3 mr-1" />
                      Destacado
                    </Badge>
                  )}
                </div>
              </div>

              {/* Contenido */}
              <div className="p-4 space-y-3">
                <div>
                  <h3 className="text-lg font-bold text-foreground line-clamp-1">
                    {producto.nombre}
                  </h3>
                  <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                    {producto.descripcion}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    {producto.enPromocion && producto.precioPromocion ? (
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-red-600">
                          ${producto.precioPromocion.toFixed(2)}
                        </span>
                        <span className="text-sm text-foreground/90 line-through">
                          ${producto.precio.toFixed(2)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-2xl font-bold text-foreground">
                        ${producto.precio.toFixed(2)}
                      </span>
                    )}
                  </div>

                  <Button
                    onClick={() => handleAgregar(producto)}
                    className="gap-2 bg-red-600 hover:bg-red-700 text-white"
                  >
                    <Plus className="h-4 w-4" />
                    Agregar
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
