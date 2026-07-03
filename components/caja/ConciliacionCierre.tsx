'use client';

/**
 * Piezas visuales compartidas del flujo de cierre de turno.
 * Old Texas BBQ - CRM
 *
 * Usadas por el diálogo embebido (`CierreTurno.tsx`) y la vista de pantalla
 * completa (`/caja/cierre`) para que ambos muestren siempre el mismo bloque
 * de conciliación, las mismas alertas de descuadre y el mismo aviso de
 * turno cruzado — antes cada pantalla tenía su propia copia de este JSX.
 */

import { Controller, type Control, type FieldError } from 'react-hook-form';
import { AlertTriangle, CheckCircle2, Info, TrendingDown, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { CurrencyInput } from '@/components/ui/currency-input';
import type { CierreTurnoFormValues, NivelAlertaDescuadre } from '@/lib/hooks/useCierreTurnoForm';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);

interface PreviewCierre {
  fondoInicial: number;
  totalIngresos: number;
  totalEgresos: number;
  montoEsperado: number;
  montoReal: number;
}

interface ConciliacionPreviewProps {
  preview: PreviewCierre;
  diferencia: number;
  clasificacion: 'cuadre' | 'sobrante' | 'faltante';
}

/** Bloque fondo/ingresos/egresos → esperado vs. contado → diferencia clasificada. */
export function ConciliacionPreview({ preview, diferencia, clasificacion }: ConciliacionPreviewProps) {
  const colorDiferencia =
    clasificacion === 'cuadre'
      ? 'text-green-600'
      : clasificacion === 'sobrante'
      ? 'text-blue-600'
      : 'text-destructive';

  const iconoDiferencia =
    clasificacion === 'cuadre' ? (
      <CheckCircle2 className="h-4 w-4 text-green-600" />
    ) : clasificacion === 'sobrante' ? (
      <TrendingUp className="h-4 w-4 text-blue-600" />
    ) : (
      <TrendingDown className="h-4 w-4 text-destructive" />
    );

  return (
    <div className="rounded-lg border bg-muted/40 p-3 space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Fondo inicial</span>
        <span>{fmt(preview.fondoInicial)}</span>
      </div>
      <div className="flex justify-between text-green-600">
        <span>+ Ingresos</span>
        <span>{fmt(preview.totalIngresos)}</span>
      </div>
      <div className="flex justify-between text-destructive">
        <span>− Egresos</span>
        <span>{fmt(preview.totalEgresos)}</span>
      </div>
      <Separator />
      <div className="flex justify-between font-medium">
        <span>Esperado en caja</span>
        <span>{fmt(preview.montoEsperado)}</span>
      </div>
      <div className="flex justify-between font-medium">
        <span>Contado en caja</span>
        <span>{fmt(preview.montoReal)}</span>
      </div>
      <Separator />
      <div className="flex justify-between font-bold items-center">
        <span className="flex items-center gap-1">
          {iconoDiferencia}
          Diferencia
        </span>
        <span className={colorDiferencia}>
          {diferencia > 0 ? '+' : ''}
          {fmt(diferencia)}
        </span>
      </div>
      <Badge
        variant={
          clasificacion === 'cuadre' ? 'default' : clasificacion === 'sobrante' ? 'outline' : 'destructive'
        }
        className="w-full justify-center"
      >
        {clasificacion === 'cuadre'
          ? '✓ Cuadre exacto'
          : clasificacion === 'sobrante'
          ? `↑ Sobrante de ${fmt(diferencia)}`
          : `↓ Faltante de ${fmt(Math.abs(diferencia))}`}
      </Badge>
    </div>
  );
}

/** Alertas por nivel de descuadre — mismos 3 umbrales en diálogo y pantalla completa. */
export function AlertaNivelDescuadre({ nivel }: { nivel: NivelAlertaDescuadre | null }) {
  if (nivel === 'info') {
    return (
      <div className="flex gap-2 p-3 bg-blue-500/10 rounded-lg text-sm text-blue-700 dark:text-blue-400">
        <Info className="h-4 w-4 shrink-0 mt-0.5" />
        <p>Diferencia menor a $50 — sin impacto operativo.</p>
      </div>
    );
  }
  if (nivel === 'warning') {
    return (
      <div className="flex gap-2 p-3 bg-amber-500/10 rounded-lg text-sm text-amber-700 dark:text-amber-400">
        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
        <p>Diferencia entre $50 y $199 — agrega una nota explicativa obligatoria.</p>
      </div>
    );
  }
  if (nivel === 'critical') {
    return (
      <div className="flex gap-2 p-3 bg-destructive/10 rounded-lg text-sm text-destructive">
        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
        <p>Diferencia ≥ $200 — requiere revisión inmediata y nota detallada obligatoria.</p>
      </div>
    );
  }
  return null;
}

/** Aviso de turno cruzado (quien cierra ≠ quien abrió). */
export function AvisoTurnoCruzado({ cajeroNombre }: { cajeroNombre: string }) {
  return (
    <div className="flex gap-2 p-3 bg-amber-500/10 rounded-lg text-sm text-amber-700 dark:text-amber-400 border border-amber-500/30">
      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
      <p>
        Este turno fue abierto por <strong>{cajeroNombre}</strong>. Asegúrate de haber verificado la
        caja con el cajero de apertura antes de continuar.
      </p>
    </div>
  );
}

interface MontoRealInputProps {
  control: Control<CierreTurnoFormValues>;
  error?: FieldError;
  /** Notifica el nuevo valor para recalcular la previsualización en vivo. */
  onAmountChange: (value: number) => void;
  autoFocus?: boolean;
}

/**
 * Campo "Efectivo contado en caja" con máscara de moneda MXN.
 * Compartido entre el diálogo de cierre y `/caja/cierre`.
 */
export function MontoRealInput({ control, error, onAmountChange, autoFocus }: MontoRealInputProps) {
  return (
    <div className="space-y-1">
      <Label htmlFor="montoReal">Efectivo contado en caja ($)</Label>
      <Controller
        name="montoReal"
        control={control}
        rules={{
          required: 'El monto es requerido',
          min: { value: 0, message: 'No puede ser negativo' },
        }}
        render={({ field }) => (
          <CurrencyInput
            id="montoReal"
            ref={field.ref}
            autoFocus={autoFocus}
            value={field.value}
            onValueChange={(v) => {
              field.onChange(v);
              onAmountChange(v);
            }}
            onBlur={field.onBlur}
          />
        )}
      />
      {error && <p className="text-sm text-destructive">{error.message}</p>}
    </div>
  );
}
