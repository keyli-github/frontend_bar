'use client';

/**
 * Cambio de contrasena obligatorio.
 *
 * El backend marca `mustChangePassword` en el primer acceso y tras un reseteo
 * hecho por un administrador. Mientras el flag este activo, el
 * `PasswordChangeGuard` rechaza todas las rutas salvo las decoradas con
 * `@AllowPasswordChange()`, asi que esta pantalla vive FUERA del grupo
 * (dashboard): su layout exige una sesion ya operativa.
 *
 * Al cambiarla, el backend revoca todas las familias de refresh tokens
 * (auth.service.ts:354), por lo que hay que volver a iniciar sesion.
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { authApi, ApiError, clearTokens } from '@/lib/api';
import { Eye, EyeOff, KeyRound, Check, X } from 'lucide-react';

/** Reglas de `ChangePasswordDto` en el backend. */
const RULES = [
  { label: 'Al menos 12 caracteres', test: (v: string) => v.length >= 12 },
  { label: 'Una letra minúscula', test: (v: string) => /[a-z]/.test(v) },
  { label: 'Una letra mayúscula', test: (v: string) => /[A-Z]/.test(v) },
  { label: 'Un número', test: (v: string) => /\d/.test(v) },
];

export default function CambiarPasswordPage() {
  const router = useRouter();
  const status = useAuthStore((s) => s.status);
  const mustChangePassword = useAuthStore((s) => s.mustChangePassword);
  const bootstrap = useAuthStore((s) => s.bootstrap);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  // Sin sesion no hay nada que cambiar. `done` evita rebotar durante el exito.
  useEffect(() => {
    if (!done && status === 'unauthenticated') router.replace('/login');
  }, [done, status, router]);

  const rulesOk = RULES.every((r) => r.test(newPassword));
  const matches = newPassword.length > 0 && newPassword === confirm;
  const canSubmit = !!currentPassword && rulesOk && matches && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError('');
    setLoading(true);

    try {
      await authApi.cambiarPassword({ currentPassword, newPassword });
      setDone(true);
      // Todas las sesiones quedaron revocadas: limpiamos y volvemos al login.
      clearTokens();
      useAuthStore.setState({
        user: null,
        permisos: [],
        status: 'unauthenticated',
        isAuthenticated: false,
        mustChangePassword: false,
      });
      setTimeout(() => router.replace('/login'), 1600);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'No se pudo cambiar la contraseña.',
      );
      setLoading(false);
    }
  };

  if (status === 'idle' || status === 'loading') {
    return (
      <div
        className="flex min-h-dvh items-center justify-center bg-[#0d0c0a]"
        role="status"
        aria-label="Cargando"
      >
        <div className="size-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0d0c0a] p-6">
        <div className="w-full max-w-[420px] text-center animate-scale-in">
          <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-success/15 border border-success/25">
            <Check className="text-success" size={26} />
          </div>
          <h2 className="text-2xl font-bold text-white">Contraseña actualizada</h2>
          <p className="mt-2 text-sm text-white/40">
            Por seguridad se cerraron todas tus sesiones. Redirigiendo al inicio
            de sesión…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#0d0c0a] p-6">
      <div className="relative z-10 w-full max-w-[440px] animate-scale-in">
        <div className="mb-8">
          <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-primary/10 border border-primary/25">
            <KeyRound className="text-primary-text" size={20} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {mustChangePassword ? 'Actualiza tu contraseña' : 'Cambiar contraseña'}
          </h1>
          <p className="mt-1.5 text-sm text-white/40">
            {mustChangePassword
              ? 'Debes definir una contraseña propia antes de continuar.'
              : 'Elige una contraseña nueva para tu cuenta.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="current-password"
              className="mb-2 block text-xs font-semibold uppercase tracking-widest text-white/50"
            >
              Contraseña actual
            </label>
            <input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              maxLength={72}
              required
              className="h-12 w-full rounded-xl border border-white/[0.12] bg-white/[0.07] px-4 text-sm text-white placeholder:text-white/25 transition-all focus:border-primary/60 focus:bg-white/[0.09] focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="new-password"
              className="mb-2 block text-xs font-semibold uppercase tracking-widest text-white/50"
            >
              Nueva contraseña
            </label>
            <div className="relative">
              <input
                id="new-password"
                type={showPass ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                maxLength={72}
                required
                aria-describedby="password-rules"
                className="h-12 w-full rounded-xl border border-white/[0.12] bg-white/[0.07] pl-4 pr-12 text-sm text-white placeholder:text-white/25 transition-all focus:border-primary/60 focus:bg-white/[0.09] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 transition-colors hover:text-white/70"
              >
                {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>

            <ul id="password-rules" className="mt-3 space-y-1.5">
              {RULES.map((rule) => {
                const ok = rule.test(newPassword);
                return (
                  <li
                    key={rule.label}
                    className={`flex items-center gap-2 text-xs transition-colors ${
                      ok ? 'text-success' : 'text-white/30'
                    }`}
                  >
                    {ok ? <Check size={13} /> : <X size={13} />}
                    {rule.label}
                  </li>
                );
              })}
            </ul>
          </div>

          <div>
            <label
              htmlFor="confirm-password"
              className="mb-2 block text-xs font-semibold uppercase tracking-widest text-white/50"
            >
              Repetir nueva contraseña
            </label>
            <input
              id="confirm-password"
              type={showPass ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              maxLength={72}
              required
              className="h-12 w-full rounded-xl border border-white/[0.12] bg-white/[0.07] px-4 text-sm text-white placeholder:text-white/25 transition-all focus:border-primary/60 focus:bg-white/[0.09] focus:outline-none"
            />
            {confirm.length > 0 && !matches && (
              <p className="mt-2 text-xs text-destructive">
                Las contraseñas no coinciden.
              </p>
            )}
          </div>

          {error && (
            <p
              role="alert"
              aria-live="polite"
              className="animate-fade-in rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-2.5 text-sm text-destructive"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="mt-2 flex h-12 w-full items-center justify-center gap-2.5 rounded-xl text-sm font-bold uppercase tracking-widest text-primary-foreground transition-all duration-200 active:scale-[0.98] disabled:opacity-40"
            style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              boxShadow: '0 6px 24px rgba(245,158,11,0.25)',
            }}
          >
            {loading ? 'Guardando…' : 'Guardar contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
}
