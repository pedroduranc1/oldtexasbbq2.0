/**
 * Hooks React Query — Módulo Caja
 * Old Texas BBQ - CRM
 *
 * Envuelve los servicios de turnos, movimientos y cierre con React Query.
 * Sigue el patrón del proyecto: queryKey + mutación + invalidación.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { turnosService } from '@/lib/services/turnos.service';
import {
  registrarMovimiento,
  corregirMovimiento,
  getMovimientosPorTurno,
  getTotalesPorTurno,
  getEgresosPorConcepto,
} from '@/lib/services/movimientosCaja.service';
import {
  crearCierre,
  getCierrePorTurno,
  previsualizarCierre,
} from '@/lib/services/cierreCaja.service';
import type { TipoTurno, NuevoMovimientoCaja } from '@/lib/types/firestore';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const cajaKeys = {
  turnoActivo: ['caja', 'turno-activo'] as const,
  turnosCerrados: ['caja', 'turnos-cerrados'] as const,
  movimientos: (turnoId: string) => ['caja', 'movimientos', turnoId] as const,
  totales: (turnoId: string) => ['caja', 'totales', turnoId] as const,
  egresosPorConcepto: (turnoId: string) => ['caja', 'egresos-concepto', turnoId] as const,
  cierre: (turnoId: string) => ['caja', 'cierre', turnoId] as const,
  previsualizacion: (turnoId: string, monto: number) =>
    ['caja', 'previsualizacion', turnoId, monto] as const,
};

// ============================================================================
// TURNO ACTIVO
// ============================================================================

/** Turno actualmente abierto. Refresca cada 30 s. */
export function useTurnoActivo() {
  return useQuery({
    queryKey: cajaKeys.turnoActivo,
    queryFn: () => turnosService.getTurnoActivo(),
    refetchInterval: 30_000,
  });
}

/** Todos los turnos cerrados (histórico). */
export function useTurnosCerrados() {
  return useQuery({
    queryKey: cajaKeys.turnosCerrados,
    queryFn: () => turnosService.getTurnosCerrados(),
  });
}

// ============================================================================
// APERTURA
// ============================================================================

export function useAbrirTurno() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      tipo,
      cajeroId,
      cajeroNombre,
      fondoInicial,
      encargadoId,
      encargadoNombre,
    }: {
      tipo: TipoTurno;
      cajeroId: string;
      cajeroNombre: string;
      fondoInicial: number;
      encargadoId?: string;
      encargadoNombre?: string;
    }) =>
      turnosService.abrirTurno(
        tipo,
        cajeroId,
        cajeroNombre,
        fondoInicial,
        encargadoId,
        encargadoNombre
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: cajaKeys.turnoActivo });
      qc.invalidateQueries({ queryKey: cajaKeys.turnosCerrados });
    },
  });
}

// ============================================================================
// MOVIMIENTOS
// ============================================================================

/** Lista de movimientos de un turno. */
export function useMovimientosTurno(turnoId: string | undefined) {
  return useQuery({
    queryKey: cajaKeys.movimientos(turnoId ?? ''),
    queryFn: () => getMovimientosPorTurno(turnoId!),
    enabled: !!turnoId,
  });
}

/** Totales (ingresos, egresos, saldo neto) de un turno. */
export function useTotalesTurno(turnoId: string | undefined) {
  return useQuery({
    queryKey: cajaKeys.totales(turnoId ?? ''),
    queryFn: () => getTotalesPorTurno(turnoId!),
    enabled: !!turnoId,
  });
}

/** Egresos agrupados por concepto de un turno. */
export function useEgresosPorConcepto(turnoId: string | undefined) {
  return useQuery({
    queryKey: cajaKeys.egresosPorConcepto(turnoId ?? ''),
    queryFn: () => getEgresosPorConcepto(turnoId!),
    enabled: !!turnoId,
  });
}

/** Registra un ingreso o egreso. Invalida movimientos y totales del turno. */
export function useRegistrarMovimiento(turnoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: NuevoMovimientoCaja) => registrarMovimiento(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: cajaKeys.movimientos(turnoId) });
      qc.invalidateQueries({ queryKey: cajaKeys.totales(turnoId) });
      qc.invalidateQueries({ queryKey: cajaKeys.egresosPorConcepto(turnoId) });
    },
  });
}

/**
 * Corrige un movimiento erróneo creando su inverso (MovimientosCaja es
 * inmutable). Invalida movimientos y totales del turno.
 */
export function useCorregirMovimiento(turnoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      movimientoId,
      usuarioId,
      motivo,
    }: {
      movimientoId: string;
      usuarioId: string;
      motivo: string;
    }) => corregirMovimiento(movimientoId, usuarioId, motivo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: cajaKeys.movimientos(turnoId) });
      qc.invalidateQueries({ queryKey: cajaKeys.totales(turnoId) });
      qc.invalidateQueries({ queryKey: cajaKeys.egresosPorConcepto(turnoId) });
    },
  });
}

// ============================================================================
// CIERRE
// ============================================================================

/** Cierre existente de un turno (lectura). */
export function useCierreTurno(turnoId: string | undefined) {
  return useQuery({
    queryKey: cajaKeys.cierre(turnoId ?? ''),
    queryFn: () => getCierrePorTurno(turnoId!),
    enabled: !!turnoId,
  });
}

/** Vista previa del cierre sin persistir. */
export function usePrevisualizarCierre(
  turnoId: string | undefined,
  montoReal: number
) {
  return useQuery({
    queryKey: cajaKeys.previsualizacion(turnoId ?? '', montoReal),
    queryFn: () => previsualizarCierre(turnoId!, montoReal),
    enabled: !!turnoId && montoReal >= 0,
  });
}

/** Justifica el descuadre de un turno cerrado. Invalida la lista de turnos cerrados. */
export function useJustificarDescuadre() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      turnoId,
      justificacion,
      justificadoPor,
    }: {
      turnoId: string;
      justificacion: string;
      justificadoPor: string;
    }) => turnosService.justificarDescuadre(turnoId, justificacion, justificadoPor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: cajaKeys.turnosCerrados });
    },
  });
}

/** Turno activo que lleva más de N horas abierto (default 10h). */
export function useTurnoVencido(horas: number = 10) {
  return useQuery({
    queryKey: ['caja', 'turno-vencido', horas],
    queryFn: () => turnosService.getTurnosAbiertosVencidos(horas),
    refetchInterval: 5 * 60_000, // re-check each 5 min
  });
}

/** Crea el cierre. Invalida turno activo, cierres y totales. */
export function useCrearCierre(turnoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      montoReal,
      usuarioId,
      usuarioNombre,
      notas,
    }: {
      montoReal: number;
      usuarioId: string;
      usuarioNombre: string;
      notas?: string;
    }) => crearCierre(turnoId, montoReal, usuarioId, usuarioNombre, notas),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: cajaKeys.turnoActivo });
      qc.invalidateQueries({ queryKey: cajaKeys.turnosCerrados });
      qc.invalidateQueries({ queryKey: cajaKeys.cierre(turnoId) });
      qc.invalidateQueries({ queryKey: cajaKeys.totales(turnoId) });
    },
  });
}
