/**
 * Integración Nómina → Caja
 * Registra el pago de una nómina como egreso en el turno activo.
 *
 * Operación atómica (runTransaction):
 *   1. Crea el MovimientoCaja (egreso)
 *   2. Actualiza la Nómina: estado='pagada' + referencia al movimiento
 * Si cualquiera de los dos pasos falla, ninguno persiste.
 */
import {
  collection,
  doc,
  runTransaction,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { nominasService } from './nominas.service';
import { turnosService } from './turnos.service';

export interface PagarNominaParams {
  nominaId: string;
  empleadoNombre: string;
  monto: number;
  usuarioId: string;
  usuarioNombre: string;
}

export async function pagarNomina(params: PagarNominaParams): Promise<void> {
  const { nominaId, empleadoNombre, monto, usuarioId, usuarioNombre } = params;

  if (monto <= 0) throw new Error('El monto debe ser mayor a cero');

  const turno = await turnosService.getTurnoActivo();
  if (!turno) throw new Error('No hay turno activo. Abre un turno antes de pagar nóminas.');

  const movimientoRef = doc(collection(db, 'MovimientosCaja'));
  const nominaRef     = doc(db, 'Nominas', nominaId);

  await runTransaction(db, async (tx) => {
    // Verificar que la nómina existe y sigue pendiente
    const nominaSnap = await tx.get(nominaRef);
    if (!nominaSnap.exists()) throw new Error('La nómina no existe');

    const nominaData = nominaSnap.data();
    if (nominaData?.estado !== 'pendiente') {
      throw new Error(`La nómina ya está en estado "${nominaData?.estado}"`);
    }

    // 1. Crear MovimientoCaja
    tx.set(movimientoRef, {
      turno_id:    turno.id,
      tipo:        'egreso',
      monto,
      concepto:    'Pago de nómina',
      descripcion: `Nómina — ${empleadoNombre}`,
      fecha:       Timestamp.now(),
      usuario_id:  usuarioId,
    });

    // 2. Marcar Nómina como pagada
    tx.update(nominaRef, {
      estado:           'pagada',
      movimientoCajaId: movimientoRef.id,
      turnoId:          turno.id,
      pagadoPor:        usuarioId,
      pagadoPorNombre:  usuarioNombre,
      fechaPago:        Timestamp.now(),
      fechaActualizacion: Timestamp.now(),
    });
  });
}
