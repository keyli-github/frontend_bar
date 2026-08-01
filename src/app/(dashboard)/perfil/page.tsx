'use client';

/**
 * Perfil del usuario autenticado.
 *
 * Conectado a:
 *   GET    /api/auth/perfil        (via auth-store)
 *   PATCH  /api/auth/cambiar-password
 *   PATCH  /api/usuarios/:id       (solo si el rol tiene `usuarios:editar`)
 *
 * La gestion de sesiones/dispositivos vive ahora en `/seguridad`.
 *
 * El backend no expone un endpoint de auto-edicion, asi que los datos
 * personales solo son editables por quien ya tiene permiso de gestion de
 * usuarios. Para el resto, la tarjeta es de solo lectura.
 */
import { useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth-store';
import { authApi, ApiError, clearTokens } from '@/lib/api';
import { getRoleLabel } from '@/lib/roles';
import {
  AtSign,
  Shield,
  Building,
  Clock,
  Camera,
} from 'lucide-react';

const dateFmt = new Intl.DateTimeFormat('es-PE', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const formatDate = (iso: string | null): string =>
  iso ? dateFmt.format(new Date(iso)) : '—';

export default function PerfilPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const profileImage = useAuthStore((s) => s.profileImage);
  const setProfileImage = useAuthStore((s) => s.setProfileImage);

  // ── Datos personales (solo lectura) ───────────────────────
  //
  // El backend NO tiene endpoint de auto-edicion. `PATCH /usuarios/:id`
  // rechaza siempre editarse a uno mismo:
  //   - usuarios.service.ts:219 -> prohibido tocar al SUPERADMIN.
  //   - usuarios.service.ts:231 -> prohibido editar a alguien de nivel >= al
  //     tuyo, y tu propio nivel siempre cumple esa condicion.
  // Antes se pintaba un formulario editable con "Guardar cambios" que
  // devolvia 403 a todo el mundo. Se muestra en solo lectura hasta que exista
  // un endpoint del tipo `PATCH /auth/perfil`.
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Cambio de contrasena ──────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPass, setChangingPass] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError(null);

    if (newPassword !== confirmPassword) {
      setPassError('Las contraseñas nuevas no coinciden.');
      return;
    }

    setChangingPass(true);
    try {
      await authApi.cambiarPassword({ currentPassword, newPassword });
      // El backend revoca todas las sesiones tras el cambio.
      clearTokens();
      useAuthStore.setState({
        user: null,
        permisos: [],
        status: 'unauthenticated',
        isAuthenticated: false,
        mustChangePassword: false,
      });
      router.replace('/login');
    } catch (err) {
      setPassError(
        err instanceof ApiError ? err.message : 'No se pudo cambiar la contraseña.',
      );
      setChangingPass(false);
    }
  };

  /**
   * El avatar se guarda como data-URL en localStorage (zustand persist), el
   * MISMO almacen donde vive el refresh token. Una foto de camara de 3 MB se
   * convierte en ~4 MB de base64 y agota la cuota (~5 MB), lo que hace fallar
   * la escritura del token y tumba la sesion. De ahi el limite y la
   * validacion de tipo.
   */
  const MAX_AVATAR_BYTES = 512 * 1024;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Permite volver a elegir el mismo archivo tras un error.
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('El archivo debe ser una imagen.');
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error(
        `La imagen supera los 512 KB (pesa ${Math.round(file.size / 1024)} KB).`,
      );
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => toast.error('No se pudo leer la imagen.');
    reader.onload = () => {
      try {
        setProfileImage(reader.result as string);
      } catch {
        toast.error('No hay espacio de almacenamiento para la imagen.');
      }
    };
    reader.readAsDataURL(file);
  };

  const readOnlyInput =
    'w-full h-10 px-3 rounded-lg bg-muted/30 border border-border text-muted-foreground text-sm cursor-not-allowed';
  const editableInput =
    'w-full h-10 px-3 rounded-lg bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/10 transition-all disabled:cursor-not-allowed disabled:bg-muted/30 disabled:text-muted-foreground';
  const labelClass =
    'text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-1.5';

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 lg:space-y-5">
      {/* ── Cabecera ── */}
      <div className="surface p-6 lg:p-8 animate-fade-in-up">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="relative group">
            <div className="relative w-24 h-24 rounded-full overflow-hidden bg-primary flex items-center justify-center text-2xl font-bold text-white flex-shrink-0">
              {profileImage ? (
                <Image src={profileImage} alt="Perfil" fill className="object-cover" />
              ) : (
                <span>{user?.initials ?? '··'}</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              aria-label="Cambiar foto de perfil"
              className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
            >
              <Camera size={20} className="text-white" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>

          <div className="text-center sm:text-left">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">
              {user?.username ?? '—'}
            </h1>
            <p className="text-sm text-primary-text font-semibold mt-0.5">
              {user ? getRoleLabel(user.rol) : '—'}
            </p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5 justify-center sm:justify-start">
              <Clock size={12} /> Miembro desde {formatDate(user?.createdAt ?? null)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Sede:{' '}
              <span className="text-foreground font-medium">
                {user?.sede ?? 'Todas las sedes'}
              </span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* ── Datos de cuenta ── */}
        <div
          className="surface p-5 lg:p-6 space-y-5 animate-fade-in-up"
          style={{ animationDelay: '60ms' }}
        >
          <div>
            <h2 className="font-semibold text-foreground text-base">Información de cuenta</h2>
            <p className="text-xs text-muted-foreground mt-1">
              El personal se identifica únicamente por su nombre de usuario.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="perfil-username" className={labelClass}>
                <AtSign size={11} /> Usuario
              </label>
              <input
                id="perfil-username"
                readOnly
                value={user?.username ?? ''}
                className={readOnlyInput}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="perfil-rol" className={labelClass}>
                  <Shield size={11} /> Rol
                </label>
                <input
                  id="perfil-rol"
                  readOnly
                  value={user ? getRoleLabel(user.rol) : ''}
                  className={readOnlyInput}
                />
              </div>
              <div>
                <label htmlFor="perfil-sede" className={labelClass}>
                  <Building size={11} /> Sede
                </label>
                <input
                  id="perfil-sede"
                  readOnly
                  value={user?.sede ?? 'Todas las sedes'}
                  className={readOnlyInput}
                />
              </div>
            </div>

          </div>
        </div>

        {/* ── Cambio de contrasena ── */}
        <form
          onSubmit={handleChangePassword}
          className="surface p-5 lg:p-6 space-y-5 animate-fade-in-up"
          style={{ animationDelay: '120ms' }}
        >
          <div>
            <h2 className="font-semibold text-foreground text-base">Cambiar contraseña</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Mínimo 12 caracteres, con mayúscula, minúscula y número. Al cambiarla
              se cerrarán todas tus sesiones.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="pwd-actual" className={labelClass}>
                Contraseña actual
              </label>
              <input
                id="pwd-actual"
                type="password"
                autoComplete="current-password"
                maxLength={72}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={editableInput}
              />
            </div>
            <div>
              <label htmlFor="pwd-nueva" className={labelClass}>
                Nueva contraseña
              </label>
              <input
                id="pwd-nueva"
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={72}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={editableInput}
              />
            </div>
            <div>
              <label htmlFor="pwd-confirmar" className={labelClass}>
                Confirmar nueva contraseña
              </label>
              <input
                id="pwd-confirmar"
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={72}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={editableInput}
              />
            </div>

            {passError && (
              <p role="alert" className="text-sm text-destructive">
                {passError}
              </p>
            )}

            <button
              type="submit"
              disabled={changingPass}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border bg-muted/50 hover:bg-muted text-foreground font-medium text-sm transition-all disabled:opacity-50"
            >
              {changingPass ? 'Actualizando…' : 'Actualizar contraseña'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
