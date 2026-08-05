/**
 * PageHeader — Cabecera de página reutilizable
 * Usado en: TODAS las páginas del dashboard
 */
'use client';
import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  badge?: ReactNode;
  /** Optional id applied to the h1 — lets modals reference it via aria-labelledby. */
  id?: string;
}

export function PageHeader({ title, subtitle, action, badge, id }: PageHeaderProps) {
  return (
    <div className="animate-fade-in-up flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <div className="flex items-center gap-2.5">
          <h1 id={id} className="text-lg sm:text-xl font-bold text-foreground">{title}</h1>
          {badge}
        </div>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>
      {action && <div className="flex gap-2 items-center flex-shrink-0">{action}</div>}
    </div>
  );
}
