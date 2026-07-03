/**
 * Tests para la máscara de moneda (CurrencyInput)
 * Old Texas BBQ - CRM
 *
 * Cubre la lógica pura de components/ui/currency-input.tsx: parseo de
 * dígitos crudos a pesos (patrón "últimos 2 dígitos = centavos", estilo
 * calculadora/POS) y formateo estándar es-MX (coma miles, punto decimales).
 * No se renderiza el componente (el proyecto no tiene @testing-library/react
 * instalado); se testea la lógica de negocio pura, igual que el resto de la
 * suite (ver __tests__/utils/validators.test.ts).
 */

import { describe, it, expect } from '@jest/globals';
import { parseDigitsToPesos, formatPesos } from '@/components/ui/currency-input';

describe('CurrencyInput — parseDigitsToPesos', () => {
  it('trata los últimos 2 dígitos como centavos (patrón POS)', () => {
    expect(parseDigitsToPesos('8')).toBe(0.08);
    expect(parseDigitsToPesos('80')).toBe(0.8);
    expect(parseDigitsToPesos('800')).toBe(8);
    expect(parseDigitsToPesos('8000')).toBe(80);
    expect(parseDigitsToPesos('80000')).toBe(800);
  });

  it('retorna 0 cuando no hay dígitos', () => {
    expect(parseDigitsToPesos('')).toBe(0);
    expect(parseDigitsToPesos('$')).toBe(0);
    expect(parseDigitsToPesos('abc')).toBe(0);
  });

  it('ignora separadores de miles/decimales y símbolos — solo cuentan los dígitos', () => {
    // Simula reprocesar un valor ya formateado por el propio componente
    expect(parseDigitsToPesos('$1,234.56')).toBe(1234.56);
    expect(parseDigitsToPesos('800.00')).toBe(800);
    expect(parseDigitsToPesos('1,234.56')).toBe(1234.56);
  });

  it('ignora ceros a la izquierda', () => {
    expect(parseDigitsToPesos('008')).toBe(0.08);
    expect(parseDigitsToPesos('0000800')).toBe(8);
  });

  it('maneja montos grandes sin perder precisión', () => {
    expect(parseDigitsToPesos('99999999')).toBe(999999.99);
  });
});

describe('CurrencyInput — formatPesos', () => {
  it('formatea con coma de miles y 2 decimales (estándar es-MX)', () => {
    expect(formatPesos(800)).toBe('800.00');
    expect(formatPesos(1234.56)).toBe('1,234.56');
    expect(formatPesos(0)).toBe('0.00');
    expect(formatPesos(0.08)).toBe('0.08');
  });

  it('siempre muestra 2 decimales, incluso con montos "redondos"', () => {
    expect(formatPesos(1234.5)).toBe('1,234.50');
    expect(formatPesos(1000)).toBe('1,000.00');
  });

  it('inserta coma de miles en montos de 6+ cifras', () => {
    expect(formatPesos(1000000)).toBe('1,000,000.00');
  });
});

describe('CurrencyInput — round-trip formatear → re-parsear', () => {
  // Invariante crítica: si el componente formatea un valor y luego el
  // usuario sigue tecleando (o el valor se re-sincroniza desde afuera),
  // reprocesar el texto formateado debe devolver exactamente el mismo monto.
  // Si esto se rompe, la máscara "salta" o corrompe el monto mientras se edita.
  const montos = [0, 0.01, 0.08, 0.8, 8, 80, 800, 1234.56, 999999.99, 100000];

  it.each(montos)('formatPesos(%s) → parseDigitsToPesos(...) devuelve el mismo monto', (monto) => {
    const formateado = formatPesos(monto);
    const reparsed = parseDigitsToPesos(formateado);
    expect(reparsed).toBeCloseTo(monto, 2);
  });
});
