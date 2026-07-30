'use client';

import { useRef, useEffect, useState, useId } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronDown, Sun, Moon, User, LogOut, MapPin } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { useThemeStore } from '@/store/theme-store';
import { getRouteTitle } from '@/lib/navigation';
import { SidebarToggle } from './sidebar';
import { cn } from '@/lib/utils';
import { getRoleLabel } from '@/lib/roles';

/**
 * Menu desplegable accesible.
 * Cierra al hacer click fuera y con Escape, y expone `aria-expanded`
 * para lectores de pantalla (antes faltaba en ambos menus).
 */
function Menu({
  label,
  trigger,
  children,
  align = 'end',
  disabled,
  className,
}: {
  label: string;
  trigger: (state: { open: boolean }) => React.ReactNode;
  children: (close: () => void) => React.ReactNode;
  align?: 'start' | 'end';
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className={cn('relative', className)} ref={ref}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={label}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="disabled:cursor-default disabled:opacity-80"
      >
        {trigger({ open })}
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          className={cn(
            'absolute top-full mt-1.5 w-52 surface-overlay overflow-hidden animate-scale-in z-50',
            align === 'end' ? 'right-0' : 'left-0',
          )}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

const menuItem =
  'w-full flex items-center gap-3 px-4 min-h-control-lg py-2.5 text-sm transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none';

export function Header({ title: titleOverride }: { title?: string } = {}) {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { theme, toggleTheme } = useThemeStore();
  const router = useRouter();

  const title = titleOverride ?? getRouteTitle(pathname);

  /**
   * Alcance de sede: es un INDICADOR, no un selector.
   *
   * El backend deriva el alcance del JWT (`sedeId`) y filtra en cada service;
   * un SUPERADMIN tiene `sedeId = null` y ve todo. Cambiar de sede desde el
   * cliente no tendria efecto sobre las respuestas de la API, asi que antes
   * habia aqui un desplegable puramente decorativo.
   */
  const scopeLabel =
    user?.rol === 'SUPERADMIN' ? 'Todas las sedes' : (user?.sede ?? 'Sin sede');

  const handleLogout = async () => {
    // Revoca la familia de refresh tokens en el backend antes de salir.
    await logout();
    router.replace('/login');
  };

  return (
    <header className="sticky top-0 z-30 h-14 shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border flex items-center gap-2 px-3 sm:px-4 lg:px-6">
      <SidebarToggle />

      {/* `truncate` + `min-w-0` evitan que un titulo largo empuje las
          acciones fuera de la pantalla en moviles estrechos. */}
      <h1 className="flex-1 min-w-0 truncate text-base font-semibold text-foreground">
        {title}
      </h1>

      <div className="flex items-center gap-1 sm:gap-2">
        {/* Indicador del alcance de sede que impone el backend. */}
        <span
          title={`Alcance de datos: ${scopeLabel}`}
          className="flex h-control items-center gap-1.5 rounded-lg border border-border px-2 text-sm text-muted-foreground sm:px-3"
        >
          <MapPin size={14} aria-hidden="true" />
          <span className="hidden max-w-[10rem] truncate sm:inline">{scopeLabel}</span>
        </span>

        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}
          className="grid size-control place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        {/* Aqui iba una campana de notificaciones con un punto rojo fijo:
            no habia backend de notificaciones detras, asi que anunciaba
            novedades inexistentes. Se retira hasta que exista el modulo. */}

        <Menu
          label="Menú de usuario"
          className="ml-0.5"
          trigger={({ open }) => (
            <span className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-1.5 sm:pr-2 transition-colors hover:bg-muted">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {user?.initials ?? '··'}
              </span>
              <span className="hidden sm:block max-w-[8rem] truncate text-sm font-medium text-foreground">
                {user?.username ?? 'Usuario'}
              </span>
              <ChevronDown
                size={13}
                aria-hidden="true"
                className={cn('text-muted-foreground transition-transform', open && 'rotate-180')}
              />
            </span>
          )}
        >
          {(close) => (
            <>
              <div className="border-b border-border px-4 py-3">
                <p className="truncate text-sm font-semibold text-foreground">
                  {user?.username}
                </p>
                <p className="text-xs text-muted-foreground">
                  {user ? getRoleLabel(user.rol) : ''}
                </p>
              </div>
              <button
                role="menuitem"
                onClick={() => {
                  close();
                  router.push('/perfil');
                }}
                className={cn(menuItem, 'text-foreground')}
              >
                <User size={15} className="text-muted-foreground" aria-hidden="true" /> Ver perfil
              </button>
              <button
                role="menuitem"
                onClick={() => {
                  close();
                  void handleLogout();
                }}
                className={cn(menuItem, 'text-destructive hover:bg-destructive/10')}
              >
                <LogOut size={15} aria-hidden="true" /> Cerrar sesión
              </button>
            </>
          )}
        </Menu>
      </div>
    </header>
  );
}
