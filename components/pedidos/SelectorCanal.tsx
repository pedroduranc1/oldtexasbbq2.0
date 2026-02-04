'use client';

import { CanalVenta } from '@/lib/types/firestore';
import {
  MessageCircle,
  Store,
  Car,
  Bike,
  Phone,
  LucideIcon
} from 'lucide-react';

interface SelectorCanalProps {
  value: CanalVenta | null;
  onChange: (canal: CanalVenta) => void;
}

interface CanalOption {
  value: CanalVenta;
  label: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  description: string;
}

const canales: CanalOption[] = [
  {
    value: 'whatsapp',
    label: 'WhatsApp',
    icon: MessageCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-50 hover:bg-green-100 border-green-200',
    description: 'Pedido recibido por WhatsApp',
  },
  {
    value: 'mostrador',
    label: 'Mostrador',
    icon: Store,
    color: 'text-navy',
    bgColor: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
    description: 'Cliente en el local',
  },
  {
    value: 'uber',
    label: 'Uber Eats',
    icon: Car,
    color: 'text-navy',
    bgColor: 'bg-gray-50 hover:bg-gray-100 border-gray-200',
    description: 'Pedido de Uber Eats',
  },
  {
    value: 'didi',
    label: 'Didi Food',
    icon: Bike,
    color: 'text-red',
    bgColor: 'bg-red-50 hover:bg-red-100 border-red-200',
    description: 'Pedido de Didi Food',
  },
  {
    value: 'llamada',
    label: 'Llamada',
    icon: Phone,
    color: 'text-gold',
    bgColor: 'bg-amber-50 hover:bg-amber-100 border-amber-200',
    description: 'Pedido telefónico',
  },
];

export function SelectorCanal({ value, onChange }: SelectorCanalProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {canales.map((canal) => {
        const Icon = canal.icon;
        const isSelected = value === canal.value;

        return (
          <button
            key={canal.value}
            onClick={() => onChange(canal.value)}
            className={`
              relative p-4 rounded-xl border-2 transition-all min-h-[140px]
              ${isSelected
                ? 'bg-primary/10 ring-4 ring-primary/30 border-primary shadow-lg scale-105'
                : 'bg-card hover:bg-muted/50 border-border hover:border-primary/50'
              }
            `}
          >
            {/* Badge seleccionado */}
            {isSelected && (
              <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-md">
                ✓
              </div>
            )}

            {/* Icono */}
            <div className="flex flex-col items-center justify-center gap-2 h-full">
              <div className={`
                p-2.5 rounded-full transition-all
                ${isSelected
                  ? 'bg-primary/20'
                  : 'bg-muted/50 group-hover:bg-muted'
                }
              `}>
                <Icon
                  className={`h-7 w-7 ${isSelected ? 'text-primary' : canal.color}`}
                />
              </div>
              <div className="text-center">
                <p className={`font-bold text-sm ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                  {canal.label}
                </p>
                <p className={`text-xs mt-1 line-clamp-2 ${isSelected ? 'text-primary/70' : 'text-muted-foreground'}`}>
                  {canal.description}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
