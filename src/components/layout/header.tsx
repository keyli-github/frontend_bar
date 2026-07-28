'use client';

import { useRef, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, ChevronDown, Sun, Moon, User, LogOut, Check } from 'lucide-react';
import { useUIStore } from '@/store/ui-store';
import { useAuthStore } from '@/store/auth-store';
import { useThemeStore } from '@/store/theme-store';
import { SidebarToggle } from './sidebar';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/lib/roles';

const SEDES = ['Zona Rosa', 'Chapinero', 'El Poblado', 'Todas las sedes'];

export function Header({ title }: { title: string }) {
  const { selectedSede, setSelectedSede } = useUIStore();
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const router = useRouter();
  const role = (user?.role ?? 'empleado') as UserRole;

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [sedeMenuOpen, setSedeMenuOpen] = useState(false);
  const userRef = useRef<HTMLDivElement>(null);
  const sedeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserMenuOpen(false);
      if (sedeRef.current && !sedeRef.current.contains(e.target as Node)) setSedeMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => { logout(); setUserMenuOpen(false); router.push('/login'); };

  // Sedes disponibles según rol
  const availableSedes = role === 'superadmin' ? SEDES : [user?.sede || 'Zona Rosa'];
  const canChangeSede = availableSedes.length > 1;

  return (
    <header className="sticky top-0 z-30 h-14 bg-background flex items-center justify-between px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <SidebarToggle />
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
      </div>

      <div className="flex items-center gap-2">
        {/* ── Sede selector ── */}
        <div className="relative hidden md:block" ref={sedeRef}>
          <button
            onClick={() => canChangeSede && setSedeMenuOpen((v) => !v)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm text-foreground transition-colors',
              canChangeSede ? 'hover:bg-muted cursor-pointer' : 'cursor-default opacity-80'
            )}
          >
            {selectedSede}
            {canChangeSede && <ChevronDown size={13} className={cn('text-muted-foreground transition-transform', sedeMenuOpen && 'rotate-180')} />}
          </button>

          {sedeMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-popover border border-border rounded-xl shadow-xl overflow-hidden animate-scale-in z-50">
              {availableSedes.map((s) => (
                <button
                  key={s}
                  onClick={() => { setSelectedSede(s); setSedeMenuOpen(false); }}
                  className={cn(
                    'w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-muted transition-colors',
                    s === selectedSede ? 'text-amber-500 font-medium' : 'text-foreground'
                  )}
                >
                  {s}
                  {s === selectedSede && <Check size={14} className="text-amber-500" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Theme toggle — inmediato */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
          <Bell size={18} className="text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-500" />
        </button>

        {/* User dropdown */}
        <div className="relative" ref={userRef}>
          <button
            onClick={() => setUserMenuOpen((v) => !v)}
            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg hover:bg-muted transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-amber-600 flex items-center justify-center text-xs font-bold text-white">
              {user?.initials || 'CM'}
            </div>
            <span className="hidden sm:block text-sm font-medium text-foreground">
              {user?.name?.split(' ')[0] || 'Carlos'}
            </span>
            <ChevronDown size={13} className={cn('text-muted-foreground transition-transform', userMenuOpen && 'rotate-180')} />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-48 bg-popover border border-border rounded-xl shadow-xl overflow-hidden animate-scale-in z-50">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-sm font-semibold text-foreground">{user?.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
              </div>
              <button
                onClick={() => { router.push('/perfil'); setUserMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
              >
                <User size={15} className="text-muted-foreground" /> Ver perfil
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-500/5 transition-colors"
              >
                <LogOut size={15} /> Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
