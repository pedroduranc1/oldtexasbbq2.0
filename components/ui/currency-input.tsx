'use client';

/**
 * CurrencyInput
 * Old Texas BBQ - CRM
 *
 * Input de monto en pesos mexicanos con máscara automática, estilo
 * calculadora/POS: el usuario solo teclea dígitos (sin fijarse en el punto
 * decimal ni en los separadores de miles) y el campo va formateando solo.
 * Los últimos 2 dígitos tecleados siempre son los centavos.
 *
 * Ej.: teclear "8","0","0","0","0" muestra 0.08 → 0.80 → 8.00 → 80.00 → 800.00
 *
 * Formato: coma para miles, punto para decimales (estándar es-MX, el mismo
 * que ya usa `Intl.NumberFormat('es-MX', ...)` en el resto de la app), para
 * que un monto se vea igual mientras se escribe que cuando se consulta
 * después en resúmenes, tablas y PDFs.
 *
 * El valor que maneja el componente hacia afuera (`value` / `onValueChange`)
 * siempre es el número real en pesos (ej. 1234.56), nunca el texto formateado.
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Formatea un monto en pesos al estándar es-MX: coma para miles, punto para
 * 2 decimales (ej. 1234.5 → "1,234.50"). Exportada por separado para poder
 * testearla sin renderizar el componente (ver __tests__/utils/currency-input.test.ts).
 */
export const formatPesos = (n: number) =>
  new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

/**
 * Convierte el texto crudo de un input (con o sin formato previo) al monto
 * en pesos, tratando los últimos 2 dígitos como centavos — el corazón de la
 * máscara estilo POS. Ignora cualquier carácter que no sea dígito, así que
 * es seguro reprocesar un valor ya formateado (ej. "1,234.56" → 1234.56).
 */
export const parseDigitsToPesos = (rawValue: string): number => {
  const digits = rawValue.replace(/\D/g, '');
  const cents = digits === '' ? 0 : parseInt(digits, 10);
  return cents / 100;
};

export interface CurrencyInputProps
  extends Omit<React.ComponentProps<'input'>, 'value' | 'onChange' | 'type'> {
  /** Valor numérico actual en pesos (ej. 1234.56). */
  value: number | null | undefined;
  /** Se llama con el nuevo valor numérico en pesos cada vez que el usuario escribe. */
  onValueChange: (value: number) => void;
}

export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onValueChange, onFocus, onBlur, className, ...props }, ref) => {
    const [display, setDisplay] = React.useState(() =>
      value ? formatPesos(value) : ''
    );
    const focused = React.useRef(false);

    // Si el valor cambia desde afuera (reset de formulario, edición de un
    // registro existente, etc.) y el usuario no está escribiendo en este
    // momento, sincronizamos el texto mostrado.
    React.useEffect(() => {
      if (!focused.current) {
        setDisplay(value ? formatPesos(value) : '');
      }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const pesos = parseDigitsToPesos(e.target.value);
      setDisplay(pesos === 0 ? '' : formatPesos(pesos));
      onValueChange(pesos);
    };

    return (
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          $
        </span>
        <input
          ref={ref}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0.00"
          value={display}
          onChange={handleChange}
          onFocus={(e) => {
            focused.current = true;
            onFocus?.(e);
          }}
          onBlur={(e) => {
            focused.current = false;
            onBlur?.(e);
          }}
          className={cn(
            'flex h-9 w-full rounded-md border border-input bg-transparent py-1 pl-7 pr-3 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
            className
          )}
          {...props}
        />
      </div>
    );
  }
);
CurrencyInput.displayName = 'CurrencyInput';
