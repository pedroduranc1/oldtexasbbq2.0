import { AlertTriangle, Info, XCircle, CheckCircle, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type AlertLevel = 'info' | 'warning' | 'error' | 'success';

const config: Record<AlertLevel, { icon: LucideIcon; classes: string }> = {
  info:    { icon: Info,          classes: 'bg-blue-500/10   border-blue-500/30   text-blue-700   dark:text-blue-400'   },
  warning: { icon: AlertTriangle, classes: 'bg-amber-500/10  border-amber-500/30  text-amber-700  dark:text-amber-400'  },
  error:   { icon: XCircle,       classes: 'bg-red-500/10    border-red-500/30    text-red-700    dark:text-red-400'    },
  success: { icon: CheckCircle,   classes: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400' },
};

interface AlertBoxProps {
  level?: AlertLevel;
  message: string;
  icon?: LucideIcon;
  className?: string;
}

export function AlertBox({ level = 'info', message, icon, className }: AlertBoxProps) {
  const { icon: DefaultIcon, classes } = config[level];
  const Icon = icon ?? DefaultIcon;

  return (
    <div className={cn('flex gap-2 rounded-lg border p-3 text-sm', classes, className)}>
      <Icon className="h-4 w-4 shrink-0 mt-0.5" />
      <p>{message}</p>
    </div>
  );
}
