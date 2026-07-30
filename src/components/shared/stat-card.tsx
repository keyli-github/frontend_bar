'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string;
  subtitle?: string;
  badge?: { text: string; type: 'success' | 'warning' | 'danger' | 'info' };
  icon?: ReactNode;
  valueColor?: string;
}

export function StatCard({ label, value, subtitle, badge, icon, valueColor }: StatCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 lg:px-4 lg:py-3 transition-colors hover:bg-muted/20">
      <div className="flex min-w-0 items-center gap-1.5">
        {icon && <span className="flex-shrink-0 text-amber-500">{icon}</span>}
        <p className="min-w-0 truncate text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
        {badge && (
          <span className={cn(
            'ml-auto flex-shrink-0 rounded px-1.5 py-0.5 text-[8px] font-bold tracking-wide',
            badge.type === 'success' && 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400',
            badge.type === 'warning' && 'bg-amber-500/12 text-amber-600 dark:text-amber-400',
            badge.type === 'danger'  && 'bg-red-500/12 text-red-600 dark:text-red-400',
            badge.type === 'info'    && 'bg-blue-500/12 text-blue-600 dark:text-blue-400',
          )}>
            {badge.text}
          </span>
        )}
      </div>
      <div className="mt-1 flex min-w-0 items-baseline gap-2">
        <p className={cn('flex-shrink-0 font-mono text-base font-bold lg:text-lg', valueColor || 'text-foreground')}>
          {value}
        </p>
        {subtitle && <p className="min-w-0 truncate text-[10px] text-muted-foreground lg:text-xs">{subtitle}</p>}
      </div>
    </div>
  );
}
