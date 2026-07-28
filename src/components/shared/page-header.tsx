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
}

export function PageHeader({ title, subtitle, action, badge }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-fade-in-up">
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-lg sm:text-xl font-bold text-foreground">{title}</h1>
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
