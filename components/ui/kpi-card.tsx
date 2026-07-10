import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export interface KpiItem {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  color?: 'default' | 'green' | 'blue' | 'orange' | 'red' | 'purple';
  onClick?: () => void;
  active?: boolean;
}

const colorMap: Record<NonNullable<KpiItem['color']>, string> = {
  default: 'text-foreground',
  green:   'text-emerald-600 dark:text-emerald-400',
  blue:    'text-blue-600 dark:text-blue-400',
  orange:  'text-orange-600 dark:text-orange-400',
  red:     'text-red-600 dark:text-red-400',
  purple:  'text-purple-600 dark:text-purple-400',
};

const iconBgMap: Record<NonNullable<KpiItem['color']>, string> = {
  default: 'bg-muted',
  green:   'bg-emerald-500/10',
  blue:    'bg-blue-500/10',
  orange:  'bg-orange-500/10',
  red:     'bg-red-500/10',
  purple:  'bg-purple-500/10',
};

function KpiCard({ label, value, icon: Icon, color = 'default', onClick, active }: KpiItem) {
  const textColor = colorMap[color];
  const iconBg   = iconBgMap[color];
  const isClickable = !!onClick;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!isClickable}
      className={cn(
        'rounded-xl border border-border bg-card p-4 text-left transition-colors',
        isClickable && 'cursor-pointer hover:bg-muted/50',
        !isClickable && 'cursor-default',
        active && 'ring-2 ring-primary ring-offset-1',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground leading-tight">{label}</p>
        {Icon && (
          <div className={cn('shrink-0 rounded-lg p-1.5', iconBg, textColor)}>
            <Icon className="h-3.5 w-3.5" />
          </div>
        )}
      </div>
      <p className={cn('mt-2 text-2xl font-bold', textColor)}>{value}</p>
    </button>
  );
}

interface KpiGridProps {
  kpis: KpiItem[];
  cols?: 2 | 3 | 4;
  isLoading?: boolean;
  className?: string;
}

export function KpiGrid({ kpis, cols = 4, isLoading, className }: KpiGridProps) {
  const gridClass = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-4',
  }[cols];

  if (isLoading) {
    return (
      <div className={cn('grid gap-3', gridClass, className)}>
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className={cn('grid gap-3', gridClass, className)}>
      {kpis.map((kpi, i) => (
        <KpiCard key={i} {...kpi} />
      ))}
    </div>
  );
}
