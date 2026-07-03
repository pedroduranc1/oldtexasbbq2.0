'use client';

/**
 * useCierreTurnoForm
 * Old Texas BBQ - CRM
 *
 * Encapsula toda la lógica compartida del flujo de cierre de turno:
 * formulario, previsualización en vivo, clasificación de la diferencia,
 * detección de turno cruzado y el submit hacia crearCierre().
 *
 * Usado por el diálogo embebido (`components/caja/CierreTurno.tsx`) y la
 * vista de pantalla completa (`/caja/cierre`) para que ambos apliquen
 * siempre las mismas reglas de negocio y el mismo copy — antes esta lógica
 * estaba duplicada entera en los dos archivos.
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useCrearCierre, usePrevisualizarCierre } from '@/lib/hooks/useCaja';
import { useAuthStore } from '@/lib/stores/auth.store';
import type { Turno } from '@/lib/types/firestore';

export type NivelAlertaDescuadre = 'info' | 'warning' | 'critical';

/**
 * Niveles de alerta según magnitud de la diferencia del cierre.
 * Única fuente de verdad — antes duplicada en `CierreTurno.tsx` y `/caja/cierre/page.tsx`.
 */
export function nivelAlertaDescuadre(diff: number): NivelAlertaDescuadre | null {
  const abs = Math.abs(diff);
  if (abs === 0) return null;
  if (abs < 50) return 'info';
  if (abs < 200) return 'warning';
  return 'critical';
}

export interface CierreTurnoFormValues {
  montoReal: number;
  notas?: string;
}

/**
 * @param turno   Turno activo a cerrar.
 * @param activo  Controla si la previsualización debe correr (ej. solo
 *                cuando el diálogo está abierto, para no disparar queries
 *                de más mientras está cerrado).
 */
export function useCierreTurnoForm(turno: Turno, activo: boolean) {
  const { userData: usuario } = useAuthStore();
  const [montoRealPreview, setMontoRealPreview] = useState(0);

  const { mutate: crearCierreMutation, isPending } = useCrearCierre(turno.id);
  const { data: preview, isLoading: loadingPreview } = usePrevisualizarCierre(
    activo ? turno.id : undefined,
    montoRealPreview
  );

  const form = useForm<CierreTurnoFormValues>({ defaultValues: { montoReal: 0, notas: '' } });

  const handleMontoChange = (v: number) => setMontoRealPreview(isNaN(v) ? 0 : v);

  const diferencia = preview?.diferencia ?? 0;
  // previsualizarCierre() ya devuelve la clasificación — evitamos recalcularla.
  const clasificacion = preview?.clasificacion ?? null;
  const nivel = nivelAlertaDescuadre(diferencia);
  const notasObligatorias = Math.abs(diferencia) >= 50;

  const usuarioActualNombre = usuario
    ? [usuario.nombre, usuario.apellido].filter(Boolean).join(' ')
    : '';
  const turnoCruzado =
    !!usuario &&
    !!turno.cajeroNombre &&
    turno.cajeroNombre.trim().toLowerCase() !== usuarioActualNombre.trim().toLowerCase();

  function submitCierre(
    data: CierreTurnoFormValues,
    callbacks: { onSuccess: () => void; onError?: (err: unknown) => void }
  ) {
    if (!usuario) {
      toast.error('No hay sesión activa');
      return;
    }
    if (!usuarioActualNombre) {
      toast.error('No se pudo determinar tu nombre de usuario. Vuelve a iniciar sesión.');
      return;
    }
    if (notasObligatorias && !data.notas?.trim()) {
      toast.error('Debes agregar una nota para diferencias ≥ $50');
      return;
    }
    crearCierreMutation(
      {
        montoReal: data.montoReal,
        usuarioId: usuario.id,
        usuarioNombre: usuarioActualNombre,
        notas: data.notas,
      },
      {
        onSuccess: () => {
          toast.success('Turno cerrado correctamente');
          callbacks.onSuccess();
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : 'Error al cerrar el turno');
          callbacks.onError?.(err);
        },
      }
    );
  }

  return {
    form,
    isPending,
    preview,
    loadingPreview,
    diferencia,
    clasificacion,
    nivel,
    notasObligatorias,
    turnoCruzado,
    handleMontoChange,
    submitCierre,
  };
}
