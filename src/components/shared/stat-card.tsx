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
    <div className="relative overflow-hidden rounded-xl border border-border bg-card px-3 py-2.5 lg:px-4 lg:py-3 shadow-sm dark:shadow-none transition-all duration-300 hover:shadow-md dark:hover:shadow-none group">
      <div className="flex items-start justify-between">
        {icon && (
          <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-amber-500">
            {icon}
          </div>
        )}
        {badge && (
          <span className={cn(
            'px-2 py-0.5 rounded text-[9px] font-bold tracking-wide',
            badge.type === 'success' && 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400',
            badge.type === 'warning' && 'bg-amber-500/12 text-amber-600 dark:text-amber-400',
            badge.type === 'danger'  && 'bg-red-500/12 text-red-600 dark:text-red-400',
            badge.type === 'info'    && 'bg-blue-500/12 text-blue-600 dark:text-blue-400',
          )}>
            {badge.text}
          </span>
        )}
      </div>
      <div className="mt-2">
        <p className="text-[9px] font-semibold text-muted-foreground tracking-widest uppercase">{label}</p>
        <p className={cn('text-base lg:text-lg font-bold mt-0.5 font-mono', valueColor || 'text-foreground')}>
          {value}
        </p>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}
