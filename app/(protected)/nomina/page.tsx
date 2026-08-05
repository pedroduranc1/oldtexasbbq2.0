'use client';

import { useState } from 'react';
import { Users, Receipt, CalendarDays } from 'lucide-react';

import { ListaEmpleados }     from '@/components/nomina/ListaEmpleados';
import { GeneradorNomina }    from '@/components/nomina/GeneradorNomina';
import { RegistroAsistencia } from '@/components/nomina/RegistroAsistencia';

const TABS = [
  { id: 'empleados',  label: 'Empleados',  icon: Users },
  { id: 'nominas',    label: 'Nóminas',    icon: Receipt },
  { id: 'asistencia', label: 'Asistencia', icon: CalendarDays },
] as const;

type Tab = (typeof TABS)[number]['id'];

export default function NominaPage() {
  const [tab, setTab] = useState<Tab>('empleados');

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Nómina</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gestión de empleados, pagos y asistencia semanal
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'empleados'  && <ListaEmpleados />}
      {tab === 'nominas'    && <GeneradorNomina />}
      {tab === 'asistencia' && <RegistroAsistencia />}
    </div>
  );
}
