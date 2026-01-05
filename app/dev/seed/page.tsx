'use client';
import { useState } from 'react';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, Database } from 'lucide-react';

export default function SeedPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    categorias: number;
    productos: number;
    repartidores: number;
    errors: string[];
  }>({
    categorias: 0,
    productos: 0,
    repartidores: 0,
    errors: [],
  });
  const [completed, setCompleted] = useState(false);

  const categorias = [
    {
      nombre: 'Hamburguesas',
      descripcion: 'Deliciosas hamburguesas BBQ',
      icono: '🍔',
      orden: 1,
      activo: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    },
    {
      nombre: 'Costillas',
      descripcion: 'Costillas ahumadas',
      icono: '🍖',
      orden: 2,
      activo: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    },
    {
      nombre: 'Bebidas',
      descripcion: 'Refrescos y bebidas',
      icono: '🥤',
      orden: 3,
      activo: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    },
    {
      nombre: 'Guarniciones',
      descripcion: 'Acompañamientos',
      icono: '🍟',
      orden: 4,
      activo: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    },
  ];

  const productos = [
    // Hamburguesas
    {
      nombre: 'Texas Burger',
      descripcion:
        'Hamburguesa con tocino ahumado, queso cheddar y salsa BBQ',
      precio: 120,
      categoriaId: '',
      categoriaNombre: 'Hamburguesas',
      disponible: true,
      imagen:
        'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400',
      orden: 1,
      personalizaciones: {
        salsas: ['BBQ', 'Picante', 'Ranch'],
        extras: ['Queso extra', 'Tocino', 'Aguacate'],
        presentaciones: ['Para llevar', 'Para aquí'],
      },
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    },
    {
      nombre: 'BBQ Classic',
      descripcion: 'Hamburguesa clásica con carne ahumada y vegetales frescos',
      precio: 100,
      categoriaId: '',
      categoriaNombre: 'Hamburguesas',
      disponible: true,
      imagen:
        'https://images.unsplash.com/photo-1550547660-d9450f859349?w=400',
      orden: 2,
      personalizaciones: {
        salsas: ['BBQ', 'Chipotle', 'Miel Mostaza'],
        extras: ['Queso extra', 'Cebolla caramelizada', 'Jalapeños'],
        presentaciones: ['Para llevar', 'Para aquí'],
      },
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    },
    {
      nombre: 'Smokey Deluxe',
      descripcion: 'Hamburguesa premium con doble carne y queso',
      precio: 150,
      categoriaId: '',
      categoriaNombre: 'Hamburguesas',
      disponible: true,
      imagen:
        'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=400',
      orden: 3,
      personalizaciones: {
        salsas: ['BBQ', 'Habanero', 'Ajo'],
        extras: ['Queso extra', 'Tocino', 'Aguacate', 'Champiñones'],
        presentaciones: ['Para llevar', 'Para aquí'],
      },
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    },
    // Costillas
    {
      nombre: 'Costillas BBQ',
      descripcion: 'Costillas de cerdo ahumadas con salsa BBQ',
      precio: 200,
      categoriaId: '',
      categoriaNombre: 'Costillas',
      disponible: true,
      imagen:
        'https://images.unsplash.com/photo-1544025162-d76694265947?w=400',
      orden: 4,
      personalizaciones: {
        salsas: ['BBQ', 'Picante', 'Miel Mostaza'],
        extras: [],
        presentaciones: ['Para llevar', 'Para aquí', 'En caja'],
      },
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    },
    {
      nombre: 'Costillas Picantes',
      descripcion: 'Costillas con salsa habanero extra picante',
      precio: 220,
      categoriaId: '',
      categoriaNombre: 'Costillas',
      disponible: true,
      imagen:
        'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=400',
      orden: 5,
      personalizaciones: {
        salsas: ['Habanero', 'Chipotle', 'Picante'],
        extras: [],
        presentaciones: ['Para llevar', 'Para aquí', 'En caja'],
      },
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    },
    // Bebidas
    {
      nombre: 'Coca Cola',
      descripcion: 'Refresco 355ml',
      precio: 25,
      categoriaId: '',
      categoriaNombre: 'Bebidas',
      disponible: true,
      imagen:
        'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400',
      orden: 6,
      personalizaciones: {
        salsas: [],
        extras: [],
        presentaciones: ['Fría', 'Natural'],
      },
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    },
    {
      nombre: 'Agua Mineral',
      descripcion: 'Agua embotellada 500ml',
      precio: 20,
      categoriaId: '',
      categoriaNombre: 'Bebidas',
      disponible: true,
      imagen:
        'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400',
      orden: 7,
      personalizaciones: {
        salsas: [],
        extras: [],
        presentaciones: ['Fría', 'Natural'],
      },
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    },
    // Guarniciones
    {
      nombre: 'Papas Fritas',
      descripcion: 'Papas fritas crujientes con sal',
      precio: 40,
      categoriaId: '',
      categoriaNombre: 'Guarniciones',
      disponible: true,
      imagen:
        'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400',
      orden: 8,
      personalizaciones: {
        salsas: ['BBQ', 'Ranch', 'Chipotle'],
        extras: ['Queso extra'],
        presentaciones: ['Para llevar', 'Para aquí'],
      },
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    },
    {
      nombre: 'Aros de Cebolla',
      descripcion: 'Aros de cebolla empanizados',
      precio: 45,
      categoriaId: '',
      categoriaNombre: 'Guarniciones',
      disponible: true,
      imagen:
        'https://images.unsplash.com/photo-1639024471283-03518883512d?w=400',
      orden: 9,
      personalizaciones: {
        salsas: ['Ranch', 'Chipotle', 'BBQ'],
        extras: [],
        presentaciones: ['Para llevar', 'Para aquí'],
      },
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    },
  ];

  const repartidores = [
    {
      nombre: 'Carlos Méndez',
      telefono: '5551234567',
      vehiculo: 'Moto Honda',
      placas: 'ABC-123',
      disponible: true,
      activo: true,
      comisionPorcentaje: 10,
      pedidosEntregados: 0,
      calificacionPromedio: 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    },
    {
      nombre: 'Luis Rodríguez',
      telefono: '5559876543',
      vehiculo: 'Moto Yamaha',
      placas: 'XYZ-789',
      disponible: true,
      activo: true,
      comisionPorcentaje: 10,
      pedidosEntregados: 0,
      calificacionPromedio: 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    },
    {
      nombre: 'Miguel Torres',
      telefono: '5554445566',
      vehiculo: 'Bicicleta',
      placas: 'N/A',
      disponible: false,
      activo: true,
      comisionPorcentaje: 12,
      pedidosEntregados: 0,
      calificacionPromedio: 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    },
  ];

  const handleSeed = async () => {
    setLoading(true);
    setCompleted(false);
    const errors: string[] = [];
    const categoriaIds: { [key: string]: string } = {};

    try {
      // 1. Crear categorías
      let categoriasCreadas = 0;
      for (const categoria of categorias) {
        try {
          const docRef = await addDoc(collection(db, 'categorias'), categoria);
          categoriaIds[categoria.nombre] = docRef.id;
          categoriasCreadas++;
        } catch (error) {
          errors.push(
            `Error al crear categoría ${categoria.nombre}: ${error}`
          );
        }
      }

      // 2. Crear productos
      let productosCreados = 0;
      for (const producto of productos) {
        try {
          const productoConCategoria = {
            ...producto,
            categoriaId: categoriaIds[producto.categoriaNombre] || '',
          };
          await addDoc(collection(db, 'productos'), productoConCategoria);
          productosCreados++;
        } catch (error) {
          errors.push(`Error al crear producto ${producto.nombre}: ${error}`);
        }
      }

      // 3. Crear repartidores
      let repartidoresCreados = 0;
      for (const repartidor of repartidores) {
        try {
          await addDoc(collection(db, 'repartidores'), repartidor);
          repartidoresCreados++;
        } catch (error) {
          errors.push(
            `Error al crear repartidor ${repartidor.nombre}: ${error}`
          );
        }
      }

      setResults({
        categorias: categoriasCreadas,
        productos: productosCreados,
        repartidores: repartidoresCreados,
        errors,
      });
      setCompleted(true);
    } catch (error) {
      errors.push(`Error general: ${error}`);
      setResults({
        categorias: 0,
        productos: 0,
        repartidores: 0,
        errors,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <div className="space-y-6">
        <div className="text-center">
          <Database className="h-16 w-16 mx-auto mb-4 text-primary" />
          <h1 className="text-3xl font-bold mb-2">
            Seed de Datos de Prueba
          </h1>
          <p className="text-muted-foreground">
            Crear datos de prueba para validar el módulo de pedidos
          </p>
        </div>

        <Card className="p-6">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-primary">4</div>
                <div className="text-sm text-muted-foreground">Categorías</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">9</div>
                <div className="text-sm text-muted-foreground">Productos</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">3</div>
                <div className="text-sm text-muted-foreground">
                  Repartidores
                </div>
              </div>
            </div>

            <Button
              onClick={handleSeed}
              disabled={loading || completed}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Creando datos de prueba...
                </>
              ) : completed ? (
                <>
                  <CheckCircle className="mr-2 h-5 w-5" />
                  Datos creados exitosamente
                </>
              ) : (
                <>
                  <Database className="mr-2 h-5 w-5" />
                  Crear Datos de Prueba
                </>
              )}
            </Button>
          </div>
        </Card>

        {completed && (
          <Card className="p-6 border-green-500">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <h3 className="font-semibold">Seed Completado</h3>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Categorías creadas:</span>
                  <Badge variant="default">{results.categorias}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Productos creados:</span>
                  <Badge variant="default">{results.productos}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Repartidores creados:</span>
                  <Badge variant="default">{results.repartidores}</Badge>
                </div>
              </div>

              {results.errors.length > 0 && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-2">
                    <XCircle className="h-4 w-4" />
                    <span className="font-semibold">Errores:</span>
                  </div>
                  <ul className="text-sm text-red-600 dark:text-red-400 space-y-1">
                    {results.errors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground text-center">
                  Ahora puedes probar el formulario en:{' '}
                  <a
                    href="/pedidos/nuevo"
                    className="text-primary hover:underline font-semibold"
                  >
                    /pedidos/nuevo
                  </a>
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
