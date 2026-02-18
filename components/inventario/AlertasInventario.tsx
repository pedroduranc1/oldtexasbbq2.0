/**
 * AlertasInventario Component
 * Old Texas BBQ - CRM
 *
 * Panel de alertas del inventario:
 * - Ingredientes sin stock (rojo)
 * - Ingredientes con stock bajo (amarillo)
 * - Ingredientes próximos a vencer (naranja)
 * - Generación automática de órdenes de compra
 */

'use client';

import { useState, useEffect } from 'react';
import { Ingrediente } from '@/lib/types';
import { ingredientesService } from '@/lib/services/ingredientes.service';
import { ordenesCompraService } from '@/lib/services/ordenesCompra.service';
import { useAuth } from '@/lib/auth/useAuth';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  AlertTriangle,
  PackageX,
  Clock,
  ShoppingCart,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';

interface AlertasData {
  stockBajo: Ingrediente[];
  sinStock: Ingrediente[];
  proximosVencer: Ingrediente[];
}

interface AlertasInventarioProps {
  /** Muestra solo un resumen compacto sin listas expandibles */
  compact?: boolean;
  /** Callback cuando se generan órdenes de compra */
  onOrdenesGeneradas?: (count: number) => void;
}

export function AlertasInventario({
  compact = false,
  onOrdenesGeneradas,
}: AlertasInventarioProps) {
  const { userData } = useAuth();

  const [alertas, setAlertas] = useState<AlertasData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generando, setGenerando] = useState(false);
  const [expandido, setExpandido] = useState<Record<string, boolean>>({
    sinStock: true,
    stockBajo: false,
    proximosVencer: false,
  });

  const cargarAlertas = async () => {
    try {
      setLoading(true);
      const data = await ingredientesService.getIngredientesConAlertas();
      setAlertas(data);
    } catch {
      toast.error('Error al cargar alertas de inventario');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarAlertas();
  }, []);

  const totalAlertas =
    (alertas?.sinStock.length ?? 0) +
    (alertas?.stockBajo.length ?? 0) +
    (alertas?.proximosVencer.length ?? 0);

  const handleGenerarOrden = async () => {
    if (!userData) return;

    try {
      setGenerando(true);
      const sugerencias = await ordenesCompraService.generarOrdenSugerida();

      if (sugerencias.length === 0) {
        toast.info('No se encontraron ingredientes que requieran reabastecimiento');
        return;
      }

      const ordenesIds = await ordenesCompraService.crearOrdenesFromSugerencias(
        sugerencias,
        userData.nombre
      );

      const creadas = ordenesIds.length;
      const sinProveedor = sugerencias.filter(
        (s) => s.proveedorId === 'SIN_PROVEEDOR'
      ).length;

      let msg = `${creadas} orden${creadas !== 1 ? 'es' : ''} de compra generada${creadas !== 1 ? 's' : ''}`;
      if (sinProveedor > 0) {
        msg += ` (${sinProveedor} grupo${sinProveedor !== 1 ? 's' : ''} sin proveedor omitido${sinProveedor !== 1 ? 's' : ''})`;
      }

      toast.success(msg);
      onOrdenesGeneradas?.(creadas);
    } catch {
      toast.error('Error al generar órdenes de compra');
    } finally {
      setGenerando(false);
    }
  };

  const toggleSeccion = (key: string) => {
    setExpandido((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-10">
          <Spinner className="h-6 w-6" />
        </CardContent>
      </Card>
    );
  }

  if (totalAlertas === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            Alertas de Inventario
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <p className="text-2xl">✅</p>
            <p className="text-sm font-medium">Todo en orden</p>
            <p className="text-xs text-muted-foreground">
              No hay ingredientes con alertas activas
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Vista compacta (solo contadores)
  if (compact) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Alertas de Inventario
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={cargarAlertas}
              title="Actualizar"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {(alertas?.sinStock.length ?? 0) > 0 && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <PackageX className="h-4 w-4 text-destructive" />
                <span className="text-destructive font-medium">Sin stock</span>
              </div>
              <Badge variant="destructive">{alertas!.sinStock.length}</Badge>
            </div>
          )}
          {(alertas?.stockBajo.length ?? 0) > 0 && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span className="text-amber-600 font-medium">Stock bajo</span>
              </div>
              <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                {alertas!.stockBajo.length}
              </Badge>
            </div>
          )}
          {(alertas?.proximosVencer.length ?? 0) > 0 && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-500" />
                <span className="text-orange-600 font-medium">Próximos a vencer</span>
              </div>
              <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">
                {alertas!.proximosVencer.length}
              </Badge>
            </div>
          )}
          <Button
            size="sm"
            className="w-full mt-2"
            variant="outline"
            onClick={handleGenerarOrden}
            disabled={generando}
          >
            {generando ? (
              <>
                <Spinner className="h-3 w-3 mr-2" />
                Generando...
              </>
            ) : (
              <>
                <ShoppingCart className="h-3.5 w-3.5 mr-2" />
                Generar Orden de Compra
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Vista completa con listas expandibles
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Alertas de Inventario
              <Badge variant="destructive" className="ml-1">
                {totalAlertas}
              </Badge>
            </CardTitle>
            <CardDescription>
              Ingredientes que requieren atención inmediata
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={cargarAlertas}
              title="Actualizar alertas"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              onClick={handleGenerarOrden}
              disabled={generando}
            >
              {generando ? (
                <>
                  <Spinner className="h-3.5 w-3.5 mr-2" />
                  Generando...
                </>
              ) : (
                <>
                  <ShoppingCart className="h-3.5 w-3.5 mr-2" />
                  Generar Orden
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Sin Stock */}
        {(alertas?.sinStock.length ?? 0) > 0 && (
          <SeccionAlerta
            titulo="Sin Stock"
            icono={<PackageX className="h-4 w-4 text-destructive" />}
            colorTitulo="text-destructive"
            colorBadge="bg-destructive text-destructive-foreground"
            ingredientes={alertas!.sinStock}
            expandido={expandido.sinStock}
            onToggle={() => toggleSeccion('sinStock')}
            renderExtra={(ing) => (
              <span className="text-xs text-destructive font-semibold">
                0 {ing.unidadMedida}
              </span>
            )}
          />
        )}

        {/* Stock Bajo */}
        {(alertas?.stockBajo.length ?? 0) > 0 && (
          <SeccionAlerta
            titulo="Stock Bajo"
            icono={<AlertTriangle className="h-4 w-4 text-amber-500" />}
            colorTitulo="text-amber-600"
            colorBadge="bg-amber-100 text-amber-800"
            ingredientes={alertas!.stockBajo}
            expandido={expandido.stockBajo}
            onToggle={() => toggleSeccion('stockBajo')}
            renderExtra={(ing) => (
              <span className="text-xs text-amber-600">
                {ing.stockActual}/{ing.stockMinimo} {ing.unidadMedida}
              </span>
            )}
          />
        )}

        {/* Próximos a Vencer */}
        {(alertas?.proximosVencer.length ?? 0) > 0 && (
          <SeccionAlerta
            titulo="Próximos a Vencer"
            icono={<Clock className="h-4 w-4 text-orange-500" />}
            colorTitulo="text-orange-600"
            colorBadge="bg-orange-100 text-orange-800"
            ingredientes={alertas!.proximosVencer}
            expandido={expandido.proximosVencer}
            onToggle={() => toggleSeccion('proximosVencer')}
            renderExtra={(ing) => (
              <span className="text-xs text-orange-600">
                Vence{' '}
                {ing.fechaVencimiento
                  ? new Date(ing.fechaVencimiento).toLocaleDateString('es-MX', {
                      day: '2-digit',
                      month: '2-digit',
                    })
                  : '—'}
              </span>
            )}
          />
        )}

        <p className="text-xs text-muted-foreground text-center pt-1">
          La orden de compra se genera automáticamente hasta el stock máximo de cada ingrediente
        </p>
      </CardContent>
    </Card>
  );
}

// ---- Componente auxiliar de sección ----
interface SeccionAlertaProps {
  titulo: string;
  icono: React.ReactNode;
  colorTitulo: string;
  colorBadge: string;
  ingredientes: Ingrediente[];
  expandido: boolean;
  onToggle: () => void;
  renderExtra: (ing: Ingrediente) => React.ReactNode;
}

function SeccionAlerta({
  titulo,
  icono,
  colorTitulo,
  colorBadge,
  ingredientes,
  expandido,
  onToggle,
  renderExtra,
}: SeccionAlertaProps) {
  return (
    <div className="rounded-lg border overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/40 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          {icono}
          <span className={`text-sm font-medium ${colorTitulo}`}>{titulo}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${colorBadge}`}>
            {ingredientes.length}
          </span>
        </div>
        {expandido ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {expandido && (
        <div className="border-t">
          {ingredientes.map((ing) => (
            <div
              key={ing.id}
              className="flex items-center justify-between px-3 py-1.5 text-sm border-b last:border-0 hover:bg-muted/20"
            >
              <div>
                <span className="font-medium text-sm">{ing.nombre}</span>
                <span className="text-xs text-muted-foreground ml-2">
                  {ing.categoria}
                </span>
              </div>
              {renderExtra(ing)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
