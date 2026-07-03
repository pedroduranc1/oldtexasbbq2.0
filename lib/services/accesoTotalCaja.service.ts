/**
 * accesoTotalCaja.service.ts
 * Old Texas BBQ - CRM
 *
 * Lee la lista de correos con acceso total al módulo de Caja desde
 * `configuracion/general.caja.accesoTotalEmails`. Estos usuarios pueden
 * operar (registrar/cerrar) cualquier turno activo, sin importar quién
 * lo abrió — el resto de admin/encargado solo puede consultar turnos
 * que no abrieron ellos mismos.
 */

import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

const CONFIG_DOC = 'configuracion/general';

export async function getAccesoTotalCajaEmails(): Promise<string[]> {
  if (!db) throw new Error('Firestore no disponible');
  const snap = await getDoc(doc(db, CONFIG_DOC));
  if (!snap.exists()) return [];
  const data = snap.data();
  return data?.caja?.accesoTotalEmails ?? [];
}
