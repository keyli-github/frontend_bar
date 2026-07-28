'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/header';
import { mockEmployees, mockAttendanceRecords } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

const statusStyle: Record<string, string> = {
  PRESENTE: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
  TARDANZA: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
  AUSENTE: 'bg-red-500/10 border-red-500/30 text-red-400',
  'DIA LIBRE': 'bg-zinc-500/10 border-zinc-500/30 text-zinc-400',
};

const recordTypeStyle: Record<string, string> = {
  ENTRADA: 'text-emerald-400',
  TARDANZA: 'text-amber-400',
  SALIDA: 'text-red-400',
};

export default function AsistenciaPage() {
  const [activeView, setActiveView] = useState<'resumen' | 'historial'>('resumen');

  const presentes = mockEmployees.filter((e) => e.status === 'PRESENTE').length;
  const ausentes = mockEmployees.filter((e) => e.status === 'AUSENTE').length;
  const tardanza = mockEmployees.filter((e) => e.status === 'TARDANZA').length;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--background)" }}>
      <Header title="Asistencia" />

      <div className="p-3 sm:p-4 lg:p-6 space-y-4 lg:space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-fade-in-up">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Asistencia</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveView('resumen')}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                activeView === 'resumen'
                  ? 'bg-amber-500 text-black'
                  : 'bg-muted/60 text-muted-foreground hover:text-foreground border border-border'
              )}
            >
              Resumen Del Dia
            </button>
            <button
              onClick={() => setActiveView('historial')}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                activeView === 'historial'
                  ? 'bg-amber-500 text-black'
                  : 'bg-muted/60 text-muted-foreground hover:text-foreground border border-border'
              )}
            >
              Historial
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger-children">
          {[
            { label: 'TOTAL PLANILLA', value: String(mockEmployees.length), color: 'text-foreground' },
            { label: 'PRESENTES', value: String(presentes), color: 'text-emerald-400' },
            { label: 'AUSENTES', value: String(ausentes), color: 'text-red-400' },
            { label: 'CON TARDANZA', value: String(tardanza), color: 'text-amber-500' },
          ].map((k) => (
            <div key={k.label} className="rounded-xl border border-border bg-card px-3 py-2 lg:px-4 lg:py-3">
              <p className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase">{k.label}</p>
              <p className={cn('text-base lg:text-lg font-bold font-mono mt-1', k.color)}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Resumen view */}
        {activeView === 'resumen' && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
            {mockEmployees.map((emp) => (
              <div
                key={emp.id}
                className="rounded-xl border border-border bg-card p-4 hover:border-border transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white', emp.color)}>
                      {emp.initials}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm">{emp.name}</p>
                      <p className="text-xs text-muted-foreground">{emp.role}</p>
                    </div>
                  </div>
                  <span className={cn('px-2 py-0.5 rounded border text-[10px] font-bold', statusStyle[emp.status])}>
                    {emp.status}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Turno', value: emp.turno },
                    { label: 'Entrada', value: emp.entrada || '—' },
                    { label: 'Horas', value: emp.horas },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-lg bg-muted/60 p-2 text-center">
                      <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                      <p className={cn(
                        'text-xs font-semibold mt-0.5',
                        stat.label === 'Entrada' && emp.status !== 'AUSENTE' ? 'text-emerald-400' : 'text-foreground'
                      )}>{stat.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Historial view */}
        {activeView === 'historial' && (
          <div className="rounded-xl border border-border bg-card overflow-hidden animate-fade-in-up">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground">Registros de hoy</h2>
            </div>
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {['Hora', 'Empleado', 'Accion', 'Tipo'].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {mockAttendanceRecords.map((rec, i) => (
                    <tr key={i} className="hover:bg-muted/40 transition-colors">
                      <td className="px-5 py-4 text-muted-foreground font-mono">{rec.hora}</td>
                      <td className="px-5 py-4 text-foreground font-medium">{rec.empleado}</td>
                      <td className="px-5 py-4 text-muted-foreground">{rec.accion}</td>
                      <td className="px-5 py-4">
                        <span className={cn('text-xs font-bold tracking-wide', recordTypeStyle[rec.tipo])}>
                          {rec.tipo}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
