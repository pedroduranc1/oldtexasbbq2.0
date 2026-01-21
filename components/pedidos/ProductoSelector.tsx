'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Minus, Trash2, ShoppingCart, RefreshCw } from 'lucide-react';
import { Producto } from '@/lib/types/firestore';
import { useProductosStore } from '@/lib/stores/productos.store';

interface ProductoSelectorProps {
  value: any[];
  onChange: (productos: any[]) => void;
}

interface ProductoCarrito {
  id: string;
  productoId: string;
  productoNombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export function ProductoSelector({ value, onChange }: ProductoSelectorProps) {
  const [busqueda, setBusqueda] = useState('');

  // Usar store de Zustand para productos con sincronización en tiempo real
  const {
    productos: todosProductos,
    loading: cargando,
    initializeRealtime,
    getProductosDisponibles,
  } = useProductosStore();

  // Inicializar escucha en tiempo real al montar
  useEffect(() => {
    initializeRealtime();
  }, [initializeRealtime]);

  // Obtener productos disponibles del store
  const productos = getProductosDisponibles();

  // Usar value del prop en lugar de estado local
  // Convertir ItemCarrito[] a ProductoCarrito[] para compatibilidad interna
  const carrito: ProductoCarrito[] = value.map((item: any) => ({
    id: item.id,
    productoId: item.productoId,
    productoNombre: item.nombre || item.productoNombre,
    cantidad: item.cantidad,
    precioUnitario: item.precio || item.precioUnitario,
    subtotal: item.subtotal,
  }));

  // Filtrar productos por búsqueda
  const productosFiltrados = productos.filter((producto) =>
    producto.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    producto.descripcion.toLowerCase().includes(busqueda.toLowerCase()) ||
    producto.categoriaNombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  // Agregar producto al carrito
  const agregarProducto = (producto: Producto) => {
    const productoEnCarrito = carrito.find((p) => p.productoId === producto.id);

    if (productoEnCarrito) {
      // Si ya existe, incrementar cantidad
      const nuevoCarrito = carrito.map((p) =>
        p.productoId === producto.id
          ? {
              ...p,
              cantidad: p.cantidad + 1,
              subtotal: (p.cantidad + 1) * p.precioUnitario,
            }
          : p
      );
      // Transformar a ItemCarrito[] antes de enviar al padre
      const items = nuevoCarrito.map((p) => ({
        id: p.id,
        productoId: p.productoId,
        nombre: p.productoNombre,
        precio: p.precioUnitario,
        cantidad: p.cantidad,
        personalizaciones: {},
        subtotal: p.subtotal,
      }));
      onChange(items);
    } else {
      // Si no existe, agregar nuevo
      const precio = producto.enPromocion && producto.precioPromocion
        ? producto.precioPromocion
        : producto.precio;

      const nuevoProducto = {
        id: `temp-${Date.now()}`,
        productoId: producto.id,
        nombre: producto.nombre,
        precio: precio,
        cantidad: 1,
        personalizaciones: {},
        subtotal: precio,
      };
      onChange([...value, nuevoProducto]);
    }
  };

  // Modificar cantidad
  const modificarCantidad = (productoId: string, delta: number) => {
    const nuevoCarrito = carrito
      .map((p) => {
        if (p.productoId === productoId) {
          const nuevaCantidad = p.cantidad + delta;
          if (nuevaCantidad <= 0) return null;
          return {
            ...p,
            cantidad: nuevaCantidad,
            subtotal: nuevaCantidad * p.precioUnitario,
          };
        }
        return p;
      })
      .filter((p) => p !== null) as ProductoCarrito[];

    // Transformar a ItemCarrito[] antes de enviar al padre
    const items = nuevoCarrito.map((p) => ({
      id: p.id,
      productoId: p.productoId,
      nombre: p.productoNombre,
      precio: p.precioUnitario,
      cantidad: p.cantidad,
      personalizaciones: {},
      subtotal: p.subtotal,
    }));
    onChange(items);
  };

  // Eliminar producto
  const eliminarProducto = (productoId: string) => {
    const nuevoCarrito = carrito.filter((p) => p.productoId !== productoId);

    // Transformar a ItemCarrito[] antes de enviar al padre
    const items = nuevoCarrito.map((p) => ({
      id: p.id,
      productoId: p.productoId,
      nombre: p.productoNombre,
      precio: p.precioUnitario,
      cantidad: p.cantidad,
      personalizaciones: {},
      subtotal: p.subtotal,
    }));
    onChange(items);
  };

  // Calcular total
  const calcularTotal = () => {
    return carrito.reduce((acc, p) => acc + p.subtotal, 0);
  };

  return (
    <div className="space-y-6">
      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Buscar producto por nombre, categoría..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="pl-10 text-base"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de productos disponibles */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-semibold text-lg">Productos Disponibles</h3>

          {cargando ? (
            <div className="text-center py-12 text-muted-foreground">
              Cargando productos...
            </div>
          ) : productosFiltrados.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No se encontraron productos
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {productosFiltrados.map((producto) => (
                <div
                  key={producto.id}
                  className="border border-border rounded-lg p-4 hover:bg-muted/50 transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h4 className="font-semibold">{producto.nombre}</h4>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {producto.descripcion}
                      </p>
                      <Badge variant="outline" className="mt-2">
                        {producto.categoriaNombre}
                      </Badge>
                      <div className="mt-2">
                        {producto.enPromocion && producto.precioPromocion ? (
                          <div className="flex items-center gap-2">
                            <span className="line-through text-muted-foreground text-sm">
                              ${producto.precio.toFixed(2)}
                            </span>
                            <span className="text-lg font-bold text-red">
                              ${producto.precioPromocion.toFixed(2)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-lg font-bold">
                            ${producto.precio.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => agregarProducto(producto)}
                      className="shrink-0"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Carrito */}
        <div className="lg:col-span-1">
          <div className="sticky top-4 border border-border rounded-lg p-4 bg-card">
            <div className="flex items-center gap-2 mb-4">
              <ShoppingCart className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-lg">
                Carrito ({carrito.length})
              </h3>
            </div>

            {carrito.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No hay productos en el carrito
              </div>
            ) : (
              <div className="space-y-3">
                {carrito.map((item) => (
                  <div
                    key={item.id}
                    className="border border-border rounded-lg p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-sm flex-1">
                        {item.productoNombre}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => eliminarProducto(item.productoId)}
                        className="h-6 w-6 p-0 text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => modificarCantidad(item.productoId, -1)}
                          className="h-7 w-7 p-0"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="font-bold min-w-[2rem] text-center">
                          {item.cantidad}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => modificarCantidad(item.productoId, 1)}
                          className="h-7 w-7 p-0"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <span className="font-bold text-primary">
                        ${item.subtotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}

                {/* Total */}
                <div className="border-t border-border pt-3 mt-4">
                  <div className="flex items-center justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span className="text-primary">
                      ${calcularTotal().toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
