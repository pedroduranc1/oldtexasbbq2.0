/**
 * Integración Nómina → Caja
 * Registra el pago de una nómina como egreso en el turno activo.
 */
import { registrarMovimiento } from './movimientosCaja.service';
import { nominasService } from './nominas.service';
import { turnosService } from './turnos.service';

export interface PagarNominaParams {
  nominaId: string;
  empleadoNombre: string;
  monto: number;
  usuarioId: string;
  usuarioNombre: string;
}

/**
 * Paga una nómina:
 * 1. Verifica que haya turno activo
 * 2. Registra egreso en MovimientosCaja
 * 3. Marca la nómina como pagada con referencia al movimiento
 */
export async function pagarNomina(params: PagarNominaParams): Promise<void> {
  const { nominaId, empleadoNombre, monto, usuarioId, usuarioNombre } = params;

  const turno = await turnosService.getTurnoActivo();
  if (!turno) throw new Error('No hay turno activo. Abre un turno antes de pagar nóminas.');

  const movimientoId = await registrarMovimiento({
    turno_id: turno.id,
    tipo: 'egreso',
    monto,
    concepto: 'Pago de nómina',
    descripcion: `Nómina — ${empleadoNombre}`,
    fecha: null as any,
    usuario_id: usuarioId,
  });

  await nominasService.marcarPagada(nominaId, movimientoId, turno.id, usuarioId, usuarioNombre);
}
