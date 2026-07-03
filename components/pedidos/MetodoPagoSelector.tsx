'use client';

import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/currency-input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import {
  Banknote,
  CreditCard,
  Smartphone,
  DollarSign,
  ArrowRightLeft,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils/formatters';
import type { MetodoPago } from '@/lib/types/firestore';

interface MetodoPagoSelectorProps {
  metodoPago: MetodoPago | null;
  onMetodoPagoChange: (metodo: MetodoPago) => void;
  total: number;
  montoPagado: number;
  onMontoPagadoChange: (monto: number) => void;
}

const METODOS_PAGO = [
  {
    id: 'efectivo' as MetodoPago,
    nombre: 'Efectivo',
    descripcion: 'Pago en efectivo',
    icon: Banknote,
    color: 'text-green-600',
  },
  {
    id: 'tarjeta' as MetodoPago,
    nombre: 'Tarjeta',
    descripcion: 'Débito o crédito',
    icon: CreditCard,
    color: 'text-blue-600',
  },
  {
    id: 'transferencia' as MetodoPago,
    nombre: 'Transferencia',
    descripcion: 'Transferencia bancaria',
    icon: Smartphone,
    color: 'text-purple-600',
  },
];

export function MetodoPagoSelector({
  metodoPago,
  onMetodoPagoChange,
  total,
  montoPagado,
  onMontoPagadoChange,
}: MetodoPagoSelectorProps) {
  const cambio = montoPagado > total ? montoPagado - total : 0;
  const requiresCambio = metodoPago === 'efectivo';

  return (
    <div className="space-y-6">
      {/* Selector de método de pago */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">Método de Pago</Label>
        <RadioGroup
          value={metodoPago || ''}
          onValueChange={(value) => onMetodoPagoChange(value as MetodoPago)}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {METODOS_PAGO.map((metodo) => {
              const Icon = metodo.icon;
              const isSelected = metodoPago === metodo.id;

              return (
                <Card
                  key={metodo.id}
                  className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                    isSelected
                      ? 'border-primary ring-2 ring-primary ring-offset-2'
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => onMetodoPagoChange(metodo.id)}
                >
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value={metodo.id} id={metodo.id} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Icon className={`h-5 w-5 ${metodo.color}`} />
                        <Label
                          htmlFor={metodo.id}
                          className="font-semibold cursor-pointer"
                        >
                          {metodo.nombre}
                        </Label>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {metodo.descripcion}
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </RadioGroup>
      </div>

      {/* Cálculo de cambio (solo para efectivo) */}
      {requiresCambio && (
        <Card className="p-6 bg-accent/50">
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <ArrowRightLeft className="h-5 w-5 text-primary" />
              <Label className="text-base font-semibold">
                Cálculo de Cambio
              </Label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Total a pagar */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">
                  Total a Pagar
                </Label>
                <div className="flex items-center gap-2 p-3 bg-background rounded-lg border">
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                  <span className="text-xl font-bold">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>

              {/* Monto pagado */}
              <div className="space-y-2">
                <Label htmlFor="montoPagado" className="text-sm">
                  Con Cuánto Paga
                </Label>
                <CurrencyInput
                  id="montoPagado"
                  value={montoPagado}
                  onValueChange={onMontoPagadoChange}
                  className="text-lg font-semibold"
                />
              </div>
            </div>

            {/* Cambio */}
            {montoPagado > 0 && (
              <div className="mt-4 p-4 bg-background rounded-lg border-2 border-primary">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    Cambio a Entregar:
                  </span>
                  <div className="flex items-center gap-2">
                    {cambio > 0 ? (
                      <>
                        <Badge
                          variant="default"
                          className="text-lg px-3 py-1 bg-primary"
                        >
                          {formatCurrency(cambio)}
                        </Badge>
                      </>
                    ) : montoPagado < total ? (
                      <Badge variant="destructive" className="text-sm">
                        Falta: {formatCurrency(total - montoPagado)}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-sm">
                        Monto exacto
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Información para otros métodos */}
      {metodoPago && !requiresCambio && (
        <Card className="p-4 bg-muted/50">
          <p className="text-sm text-muted-foreground text-center">
            {metodoPago === 'tarjeta'
              ? 'Procesar pago con terminal de tarjeta'
              : 'Verificar que se haya recibido la transferencia'}
          </p>
        </Card>
      )}
    </div>
  );
}
