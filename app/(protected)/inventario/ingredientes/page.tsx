/**
 * Página de Gestión de Ingredientes
 * Old Texas BBQ - CRM
 *
 * Acceso: Encargado y Admin
 */

'use client';

import { useState } from 'react';
import { Plus, Package2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ListaIngredientes } from '@/components/inventario/ListaIngredientes';
import { FormIngrediente, FormIngredienteData } from '@/components/inventario/FormIngrediente';
import { ingredientesService } from '@/lib/services/ingredientes.service';
import { useAuth } from '@/lib/auth/useAuth';
import { toast } from 'sonner';

export default function IngredientesPage() {
  const { userData } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);

  const handleCrearIngrediente = async (data: FormIngredienteData) => {
    const proveedorId = data.proveedorId && data.proveedorId !== '__none__'
      ? data.proveedorId
      : undefined;
    const proveedorData = proveedorId
      ? { id: proveedorId, nombre: '', contacto: '' }
      : undefined;

    await ingredientesService.createIngrediente({
      nombre: data.nombre,
      categoria: data.categoria,
      unidadMedida: data.unidadMedida,
      precioPorUnidad: data.precioPorUnidad,
      stockActual: data.stockActual,
      stockMinimo: data.stockMinimo,
      stockMaximo: data.stockMaximo,
      ubicacion: data.ubicacion,
      lote: data.lote,
      activo: true,
      creadoPor: userData?.nombre ?? 'Sistema',
      proveedor: proveedorData,
    });

    toast.success('Ingrediente creado correctamente');
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package2 className="h-7 w-7 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Ingredientes</h1>
            <p className="text-sm text-muted-foreground">
              Catálogo y control de stock del inventario
            </p>
          </div>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Ingrediente
        </Button>
      </div>

      {/* Lista */}
      <ListaIngredientes />

      {/* Modal para nuevo ingrediente */}
      <FormIngrediente
        open={modalOpen}
        onSubmit={handleCrearIngrediente}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
