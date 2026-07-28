'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { DayPicker } from 'react-day-picker';
import { es } from 'date-fns/locale';
import { format } from 'date-fns';
import { CalendarIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DatePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
}

const CAL_W = 296;
const CAL_H = 370;

export function DatePicker({ value, onChange, placeholder = 'dd/mm/aaaa' }: DatePickerProps) {
  const [open, setOpen]   = useState(false);
  const [pos, setPos]     = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  // Necesario para createPortal en SSR
  useEffect(() => { setMounted(true); }, []);

  // Calcula posición óptima: nunca sale del viewport
  const calcPos = useCallback(() => {
    if (!btnRef.current) return;
    const r   = btnRef.current.getBoundingClientRect();
    const vw  = window.innerWidth;
    const vh  = window.innerHeight;
    const GAP = 8;

    // Horizontal: alinear borde derecho calendar con borde derecho botón
    let left = r.right - CAL_W;
    if (left < GAP)                  left = GAP;
    if (left + CAL_W > vw - GAP)    left = vw - CAL_W - GAP;

    // Vertical: mostrar SIEMPRE ENCIMA del botón
    // → solo si no cabe arriba, mostrar debajo
    const spaceAbove = r.top;
    const spaceBelow = vh - r.bottom;
    let top: number;

    if (spaceAbove >= CAL_H + GAP) {
      // Hay espacio arriba → mostrar arriba
      top = r.top - CAL_H - GAP;
    } else if (spaceBelow >= CAL_H + GAP) {
      // No cabe arriba, mostrar abajo
      top = r.bottom + GAP;
    } else {
      // Ni arriba ni abajo caben completamente → arriba con ajuste
      top = Math.max(GAP, r.top - CAL_H - GAP);
    }

    setPos({ top, left });
  }, []);

  useEffect(() => {
    if (!open) return;
    calcPos();
    window.addEventListener('scroll', calcPos, true);
    window.addEventListener('resize', calcPos);
    return () => {
      window.removeEventListener('scroll', calcPos, true);
      window.removeEventListener('resize', calcPos);
    };
  }, [open, calcPos]);

  // Cerrar al click fuera
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        popRef.current  && !popRef.current.contains(e.target as Node) &&
        btnRef.current  && !btnRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    // Usar capture para interceptar antes que cualquier otro handler
    document.addEventListener('mousedown', handler, true);
    return () => document.removeEventListener('mousedown', handler, true);
  }, [open]);

  const calendar = (
    <div
      ref={popRef}
      className="fixed z-[99999] bg-popover border border-border rounded-2xl shadow-2xl overflow-hidden animate-scale-in"
      style={{
        top:   pos.top,
        left:  pos.left,
        width: CAL_W,
        // Forzar nuevo stacking context propio
        isolation: 'isolate',
      }}
    >
      <div className="p-3">
        <DayPicker
          mode="single"
          selected={value}
          onSelect={(d) => { onChange(d); if (d) setOpen(false); }}
          locale={es}
          showOutsideDays
          classNames={{
            root:           'text-sm select-none',
            months:         '',
            month:          '',
            month_caption:  'flex justify-between items-center px-1 pb-2',
            caption_label:  'text-sm font-semibold text-foreground',
            nav:            'flex items-center gap-1',
            button_previous:'w-7 h-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors',
            button_next:    'w-7 h-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors',
            month_grid:     'w-full border-collapse',
            weekdays:       'flex mb-1',
            weekday:        'text-muted-foreground text-[11px] font-medium w-9 text-center',
            weeks:          '',
            week:           'flex',
            day:            'p-0',
            day_button:     'w-9 h-9 rounded-xl text-sm text-foreground hover:bg-muted transition-colors flex items-center justify-center focus:outline-none mx-auto',
          }}
          modifiersClassNames={{
            selected: '!bg-amber-500 !text-black !font-bold hover:!bg-amber-400',
            today:    '!text-amber-500 !font-bold',
            outside:  '!text-muted-foreground/30',
            disabled: '!opacity-25 cursor-not-allowed',
          }}
        />
      </div>

      <div className="flex justify-between items-center px-4 py-2.5 border-t border-border bg-muted/20">
        <button
          onClick={() => { onChange(undefined); setOpen(false); }}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Borrar
        </button>
        <button
          onClick={() => { onChange(new Date()); setOpen(false); }}
          className="text-xs font-semibold text-amber-500 hover:text-amber-400 transition-colors"
        >
          Hoy
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Botón trigger */}
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-card text-sm transition-all',
          'hover:border-amber-500/50 focus:outline-none',
          open  ? 'border-amber-500/60 bg-amber-500/5 text-foreground' : '',
          value ? 'text-foreground' : 'text-muted-foreground'
        )}
      >
        <CalendarIcon size={14} className="text-muted-foreground flex-shrink-0" />
        <span className="whitespace-nowrap">
          {value ? format(value, 'dd/MM/yyyy') : placeholder}
        </span>
        {value && (
          <span
            onClick={(e) => { e.stopPropagation(); onChange(undefined); }}
            className="ml-0.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={11} />
          </span>
        )}
      </button>

      {/* Portal: renderiza DIRECTAMENTE en document.body, fuera de cualquier stacking context */}
      {mounted && open && createPortal(calendar, document.body)}
    </>
  );
}
