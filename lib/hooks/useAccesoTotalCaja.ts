/**
 * useAccesoTotalCaja
 * Old Texas BBQ - CRM
 *
 * Indica si el usuario activo está en la lista de acceso total a Caja
 * (configuracion/general.caja.accesoTotalEmails). Estos correos pueden
 * operar cualquier turno sin restricción de "solo lectura para turno ajeno".
 */

import { useQuery } from '@tanstack/react-query';
import { getAccesoTotalCajaEmails } from '@/lib/services/accesoTotalCaja.service';
import { useAuthStore } from '@/lib/stores/auth.store';

export function useAccesoTotalCaja(): boolean {
  const { userData } = useAuthStore();

  const { data: emails = [] } = useQuery({
    queryKey: ['configuracion', 'acceso-total-caja'],
    queryFn: getAccesoTotalCajaEmails,
    staleTime: 5 * 60_000,
  });

  if (!userData?.email) return false;
  return emails.includes(userData.email.toLowerCase());
}
