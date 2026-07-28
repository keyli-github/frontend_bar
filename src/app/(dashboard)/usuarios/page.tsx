'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/header';
import { mockUsers } from '@/lib/mock-data';
import type { User } from '@/types';
import { Search, Plus, X, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const roleFilters = ['Todos', 'Superadmin', 'Administrador', 'Empleado'];

const roleBadge: Record<string, string> = {
  superadmin: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
  administrador: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
  empleado: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
};

const roleColors: Record<string, string> = {
  superadmin: 'bg-purple-600',
  administrador: 'bg-amber-600',
  empleado: 'bg-emerald-600',
};

export default function UsuariosPage() {
  const [roleFilter, setRoleFilter] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [sedeFilter, setSedeFilter] = useState('Todas las sedes');
  const [showNewUser, setShowNewUser] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);

  const filtered = mockUsers.filter((u) => {
    const matchRole = roleFilter === 'Todos' || u.role === roleFilter.toLowerCase();
    const matchSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchSede = sedeFilter === 'Todas las sedes' || u.sede === sedeFilter;
    return matchRole && matchSearch && matchSede;
  });

  const superadmins = mockUsers.filter((u) => u.role === 'superadmin').length;
  const admins = mockUsers.filter((u) => u.role === 'administrador').length;
  const empleados = mockUsers.filter((u) => u.role === 'empleado').length;
  const inactivos = mockUsers.filter((u) => u.estado === 'inactivo').length;

  const sedes = ['Todas las sedes', ...Array.from(new Set(mockUsers.map((u) => u.sede).filter((s) => s !== 'Todas')))];

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--background)" }}>
      <Header title="Usuarios" />

      <div className="p-3 sm:p-4 lg:p-6 space-y-4 lg:space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-fade-in-up">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Usuarios</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {mockUsers.filter((u) => u.estado === 'activo').length} usuarios activos en el sistema
            </p>
          </div>
          <button
            onClick={() => setShowNewUser(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm tracking-wide transition-all active:scale-[0.98] w-fit"
          >
            <Plus size={16} />
            NUEVO USUARIO
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger-children">
          {[
            { label: 'SUPERADMINS', value: String(superadmins), color: 'text-purple-400' },
            { label: 'ADMINISTRADORES', value: String(admins), color: 'text-amber-500' },
            { label: 'EMPLEADOS', value: String(empleados), color: 'text-emerald-400' },
            { label: 'INACTIVOS', value: String(inactivos), color: 'text-muted-foreground' },
          ].map((k) => (
            <div key={k.label} className="rounded-xl border border-border bg-card px-3 py-2 lg:px-4 lg:py-3">
              <p className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase">{k.label}</p>
              <p className={cn('text-base lg:text-lg font-bold font-mono mt-1', k.color)}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 animate-fade-in-up">
          <div className="relative max-w-xs flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre o correo..."
              className="w-full h-10 pl-9 pr-4 rounded-lg bg-card border border-border text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-amber-500/50 text-sm transition-all"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {roleFilters.map((f) => (
              <button
                key={f}
                onClick={() => setRoleFilter(f)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
                  roleFilter === f
                    ? 'bg-amber-500/15 border border-amber-500/30 text-amber-400'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="relative ml-auto">
            <select
              value={sedeFilter}
              onChange={(e) => setSedeFilter(e.target.value)}
              className="h-10 pl-3 pr-8 rounded-lg bg-card border border-border text-foreground focus:outline-none focus:border-amber-500/50 text-sm transition-all appearance-none"
            >
              {sedes.map((s) => <option key={s}>{s}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden animate-fade-in-up">
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {['Usuario', 'Correo', 'Rol', 'Sede', 'Estado', 'Ultimo acceso', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0', roleColors[user.role] || 'bg-zinc-600')}>
                          {user.initials}
                        </div>
                        <span className="text-foreground font-medium">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className={cn('px-2 py-0.5 rounded border text-[10px] font-bold uppercase', roleBadge[user.role])}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-sm">{user.sede}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className={cn('w-1.5 h-1.5 rounded-full', user.estado === 'activo' ? 'bg-emerald-500' : 'bg-zinc-500')} />
                        <span className={cn('text-xs capitalize', user.estado === 'activo' ? 'text-emerald-400' : 'text-muted-foreground')}>
                          {user.estado === 'activo' ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{user.ultimoAcceso}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditUser(user)}
                          className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium hover:bg-amber-500/20 transition-colors"
                        >
                          Editar
                        </button>
                        {user.role !== 'superadmin' && (
                          <button className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors">
                            Desactivar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Nuevo Usuario Modal */}
      {showNewUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowNewUser(false)} />
          <div className="relative w-full max-w-md bg-popover border border-border rounded-2xl p-6 animate-scale-in">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold text-foreground text-lg">NUEVO USUARIO</h3>
              <button onClick={() => setShowNewUser(false)}><X size={20} className="text-muted-foreground" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Nombre completo</label>
                <input placeholder="Nombre y apellido" className="w-full mt-1.5 h-10 px-3 rounded-lg bg-card border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-amber-500/50 transition-all text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Correo electronico</label>
                <input placeholder="correo@barbeer.com" type="email" className="w-full mt-1.5 h-10 px-3 rounded-lg bg-card border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-amber-500/50 transition-all text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Rol</label>
                  <select className="w-full mt-1.5 h-10 px-3 rounded-lg bg-card border border-border text-foreground focus:outline-none focus:border-amber-500/50 transition-all text-sm">
                    <option>Empleado</option>
                    <option>Administrador</option>
                    <option>Superadmin</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Sede</label>
                  <select className="w-full mt-1.5 h-10 px-3 rounded-lg bg-card border border-border text-foreground focus:outline-none focus:border-amber-500/50 transition-all text-sm">
                    <option>Zona Rosa</option>
                    <option>Chapinero</option>
                    <option>El Poblado</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Contrasena temporal</label>
                <input placeholder="Minimo 8 caracteres" type="password" className="w-full mt-1.5 h-10 px-3 rounded-lg bg-card border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-amber-500/50 transition-all text-sm" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowNewUser(false)} className="flex-1 h-10 rounded-lg bg-muted/60 border border-border text-foreground text-sm hover:bg-muted transition-colors">
                  Cancelar
                </button>
                <button onClick={() => setShowNewUser(false)} className="flex-1 h-10 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm tracking-wide transition-all">
                  CREAR USUARIO
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setEditUser(null)} />
          <div className="relative w-full max-w-md bg-popover border border-border rounded-2xl p-6 animate-scale-in">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold text-foreground text-lg">EDITAR USUARIO</h3>
              <button onClick={() => setEditUser(null)}><X size={20} className="text-muted-foreground" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Nombre completo</label>
                <input defaultValue={editUser.name} className="w-full mt-1.5 h-10 px-3 rounded-lg bg-card border border-border text-foreground focus:outline-none focus:border-amber-500/50 transition-all text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Correo electronico</label>
                <input defaultValue={editUser.email} className="w-full mt-1.5 h-10 px-3 rounded-lg bg-card border border-border text-foreground focus:outline-none focus:border-amber-500/50 transition-all text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Rol</label>
                  <select defaultValue={editUser.role} className="w-full mt-1.5 h-10 px-3 rounded-lg bg-card border border-border text-foreground focus:outline-none focus:border-amber-500/50 transition-all text-sm">
                    <option value="empleado">Empleado</option>
                    <option value="administrador">Administrador</option>
                    <option value="superadmin">Superadmin</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Sede</label>
                  <select defaultValue={editUser.sede} className="w-full mt-1.5 h-10 px-3 rounded-lg bg-card border border-border text-foreground focus:outline-none focus:border-amber-500/50 transition-all text-sm">
                    <option>Zona Rosa</option>
                    <option>Chapinero</option>
                    <option>El Poblado</option>
                    <option>Todas</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setEditUser(null)} className="flex-1 h-10 rounded-lg bg-muted/60 border border-border text-foreground text-sm hover:bg-muted transition-colors">
                  Cancelar
                </button>
                <button onClick={() => setEditUser(null)} className="flex-1 h-10 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm tracking-wide transition-all">
                  GUARDAR CAMBIOS
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
