'use client';

/** Cambio de contraseña obligatorio o voluntario conectado a AuthController. */
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { ApiError, authApi, clearTokens } from '@/lib/api';

type PasswordField = 'current' | 'next' | 'confirmation';

const inputClassName =
  'h-12 w-full rounded-xl border border-white/[0.12] bg-white/[0.07] pl-4 pr-12 text-sm text-white placeholder:text-white/25 transition-all focus:border-amber-500/60 focus:bg-white/[0.09] focus:outline-none focus:ring-2 focus:ring-amber-500/10';

export default function CambiarPasswordPage() {
  const router = useRouter();
  const status = useAuthStore((state) => state.status);
  const mustChangePassword = useAuthStore((state) => state.mustChangePassword);
  const bootstrap = useAuthStore((state) => state.bootstrap);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [visible, setVisible] = useState<Record<PasswordField, boolean>>({
    current: false,
    next: false,
    confirmation: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (!success && status === 'unauthenticated') router.replace('/login');
  }, [router, status, success]);

  const requirements = [
    {
      label: 'Entre 12 y 72 caracteres',
      valid: newPassword.length >= 12 && newPassword.length <= 72,
    },
    { label: 'Al menos una letra mayúscula', valid: /[A-Z]/.test(newPassword) },
    { label: 'Al menos una letra minúscula', valid: /[a-z]/.test(newPassword) },
    { label: 'Al menos un número', valid: /\d/.test(newPassword) },
    {
      label: 'Las contraseñas coinciden',
      valid: confirmation.length > 0 && newPassword === confirmation,
    },
  ];
  const canSubmit =
    currentPassword.length > 0 &&
    requirements.every((requirement) => requirement.valid) &&
    !loading;

  const toggleVisibility = (field: PasswordField) => {
    setVisible((current) => ({ ...current, [field]: !current[field] }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError('');

    try {
      await authApi.cambiarPassword({ currentPassword, newPassword });
      setSuccess(true);
      clearTokens();
      useAuthStore.setState({
        user: null,
        permisos: [],
        status: 'unauthenticated',
        isAuthenticated: false,
        mustChangePassword: false,
      });
      window.setTimeout(() => router.replace('/login'), 1800);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'No se pudo cambiar la contraseña.',
      );
      setLoading(false);
    }
  };

  if (status === 'idle' || status === 'loading') {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#0d0c0a]" role="status" aria-label="Cargando sesión">
        <div className="size-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0d0c0a] text-white">
      <div className="pointer-events-none absolute -left-24 top-12 size-80 rounded-full bg-amber-500/[0.07] blur-[110px]" />
      <div className="pointer-events-none absolute -bottom-20 right-0 size-96 rounded-full bg-amber-700/[0.08] blur-[120px]" />
      <div className="absolute inset-0 opacity-[0.035] [background-image:linear-gradient(rgba(255,255,255,.6)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.6)_1px,transparent_1px)] [background-size:42px_42px]" />

      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-6xl lg:grid-cols-[0.85fr_1.15fr]">
        <section className="flex flex-col border-white/10 px-6 pb-6 pt-7 sm:px-10 lg:border-r lg:px-12 lg:py-10">
          <div className="flex items-center justify-between">
            <Image
              src="/assets/barbeerLogo.png"
              alt="Bar Beer"
              width={112}
              height={112}
              className="size-20 object-contain drop-shadow-2xl sm:size-24"
              preload
            />
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] ${mustChangePassword ? 'border-amber-500/30 bg-amber-500/10 text-amber-300' : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'}`}>
              {mustChangePassword ? <ShieldAlert size={13} /> : <ShieldCheck size={13} />}
              {mustChangePassword ? 'Cambio obligatorio' : 'Cambio voluntario'}
            </span>
          </div>

          <div className="mt-7 lg:my-auto lg:mt-16">
            <div className="mb-5 hidden size-12 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-400 lg:flex">
              <LockKeyhole size={22} />
            </div>
            <h1 className="max-w-md text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
              Protege tu acceso a <span className="text-amber-400">Bar Beer</span>
            </h1>
            <p className="mt-4 max-w-md text-sm leading-6 text-white/45 sm:text-base">
              {mustChangePassword
                ? 'Tu contraseña es temporal o fue restablecida. Debes crear una nueva antes de continuar.'
                : 'Actualiza tu contraseña para mantener tu cuenta y tus sesiones protegidas.'}
            </p>
            <div className="mt-7 hidden space-y-3 text-sm text-white/50 lg:block">
              <p className="flex items-center gap-2"><Check size={15} className="text-amber-400" /> No compartas tu contraseña con nadie.</p>
              <p className="flex items-center gap-2"><Check size={15} className="text-amber-400" /> Evita reutilizar contraseñas de otros servicios.</p>
              <p className="flex items-center gap-2"><Check size={15} className="text-amber-400" /> Al cambiarla se cerrarán todas tus sesiones.</p>
            </div>
          </div>
          <p className="mt-8 hidden text-[11px] text-white/20 lg:block">
            © {new Date().getFullYear()} Bar Beer ERP. Acceso seguro.
          </p>
        </section>

        <section className="flex items-center justify-center px-6 pb-10 pt-2 sm:px-10 lg:px-16 lg:py-10">
          <div className="w-full max-w-[470px]">
            {success ? (
              <div role="status" className="rounded-3xl border border-white/10 bg-white/[0.045] p-6 text-center shadow-2xl backdrop-blur-sm animate-scale-in sm:p-9">
                <div className="mx-auto flex size-16 items-center justify-center rounded-full border border-emerald-400/20 bg-emerald-400/10 text-emerald-400">
                  <CheckCircle2 size={30} />
                </div>
                <h2 className="mt-6 text-2xl font-bold">Contraseña actualizada</h2>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-white/45">
                  Por seguridad se cerraron todas tus sesiones. Te redirigiremos para que vuelvas a iniciar sesión.
                </p>
              </div>
            ) : (
              <div className="animate-fade-in-up">
                <div className="mb-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-400/80">Seguridad de cuenta</p>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Crea una nueva contraseña</h2>
                  <p className="mt-1.5 text-sm text-white/40">Completa todos los requisitos para continuar.</p>
                </div>

                {mustChangePassword && (
                  <div className="mb-5 flex gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.08] px-4 py-3 text-sm text-amber-100/75">
                    <ShieldAlert size={18} className="mt-0.5 shrink-0 text-amber-400" />
                    <p>No podrás regresar al panel hasta completar este cambio obligatorio.</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                  <PasswordInput
                    id="current-password"
                    label="Contraseña actual"
                    value={currentPassword}
                    onChange={setCurrentPassword}
                    visible={visible.current}
                    onToggle={() => toggleVisibility('current')}
                    autoComplete="current-password"
                    placeholder="Ingresa tu contraseña actual"
                    maxLength={72}
                  />
                  <PasswordInput
                    id="new-password"
                    label="Nueva contraseña"
                    value={newPassword}
                    onChange={setNewPassword}
                    visible={visible.next}
                    onToggle={() => toggleVisibility('next')}
                    autoComplete="new-password"
                    placeholder="Crea una contraseña segura"
                    maxLength={72}
                  />
                  <PasswordInput
                    id="confirm-password"
                    label="Confirmar nueva contraseña"
                    value={confirmation}
                    onChange={setConfirmation}
                    visible={visible.confirmation}
                    onToggle={() => toggleVisibility('confirmation')}
                    autoComplete="new-password"
                    placeholder="Repite la nueva contraseña"
                    maxLength={72}
                  />

                  <div className="grid gap-2 rounded-xl border border-white/[0.08] bg-white/[0.035] p-4 sm:grid-cols-2">
                    {requirements.map((requirement) => (
                      <div key={requirement.label} className={`flex items-center gap-2 text-xs transition-colors ${requirement.valid ? 'text-emerald-400' : 'text-white/35'}`}>
                        <span className={`flex size-4 shrink-0 items-center justify-center rounded-full border ${requirement.valid ? 'border-emerald-400/40 bg-emerald-400/10' : 'border-white/15'}`}>
                          {requirement.valid && <Check size={10} strokeWidth={3} />}
                        </span>
                        {requirement.label}
                      </div>
                    ))}
                  </div>

                  {error && (
                    <p role="alert" aria-live="polite" className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="mt-2 flex h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-sm font-bold uppercase tracking-widest text-black shadow-[0_6px_24px_rgba(245,158,11,0.22)] transition-all hover:from-amber-400 hover:to-amber-500 disabled:cursor-not-allowed disabled:opacity-35 active:scale-[0.98]"
                  >
                    <KeyRound size={17} /> {loading ? 'Actualizando…' : 'Actualizar contraseña'}
                  </button>
                </form>

                {!mustChangePassword && (
                  <button type="button" onClick={() => router.push('/seguridad')} className="mx-auto mt-5 flex items-center gap-2 text-sm text-white/40 transition-colors hover:text-white/70">
                    <ArrowLeft size={15} /> Regresar sin cambiar
                  </button>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

interface PasswordInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  onToggle: () => void;
  autoComplete: string;
  placeholder: string;
  maxLength?: number;
}

function PasswordInput({
  id,
  label,
  value,
  onChange,
  visible,
  onToggle,
  autoComplete,
  placeholder,
  maxLength,
}: PasswordInputProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-xs font-semibold uppercase tracking-widest text-white/50">{label}</label>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          maxLength={maxLength}
          required
          className={inputClassName}
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={visible ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-white/30 transition-colors hover:text-white/70 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
        >
          {visible ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
    </div>
  );
}
