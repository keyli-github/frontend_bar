'use client';

/**
 * Estado de sesion, conectado a `POST /api/auth/*` del backend NestJS.
 *
 * Reparto de responsabilidades:
 *   - Los TOKENS viven en `lib/api/token-store` (access en memoria, refresh en
 *     localStorage). Este store no los persiste.
 *   - Este store persiste unicamente la preferencia de avatar; la sesion se
 *     reconstruye en cada arranque con `bootstrap()`, canjeando el refresh
 *     token por un access token nuevo.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi, ApiError, forceRefresh, isSessionDead } from '@/lib/api';
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  onSessionEnded,
  setTokens,
} from '@/lib/api/token-store';
import { decodeJwt } from '@/lib/api/jwt';
import type { Permission } from '@/lib/roles';
import type { Perfil } from '@/types/api';

// ============================================================
// MODELO
// ============================================================

export interface SessionUser {
  id: string;
  username: string;
  /** Primeros dos caracteres del username para el avatar. */
  initials: string;
  /** Nombre del rol, incluido cualquier rol personalizado. */
  rol: string;
  /** Jerarquia del rol: SUPERADMIN=100, ADMIN=50, empleados=10. */
  nivel: number;
  sedeId: string | null;
  /** Nombre de la sede, o null si el usuario es global (SUPERADMIN). */
  sede: string | null;
  createdAt: string;
}

export type AuthStatus =
  /** Aun no se ha intentado restaurar la sesion. */
  | 'idle'
  /** `bootstrap()` o `login()` en curso. */
  | 'loading'
  | 'authenticated'
  | 'unauthenticated';

interface AuthState {
  user: SessionUser | null;
  /** Permisos `modulo:accion` extraidos del JWT. */
  permisos: Permission[];
  status: AuthStatus;
  /** Compatibilidad con los guards existentes. Derivado de `status`. */
  isAuthenticated: boolean;
  /** El backend obliga a cambiar la contrasena antes de operar. */
  mustChangePassword: boolean;
  /**
   * Mensaje cuando `bootstrap()` no pudo contactar con la API. Distingue
   * "no hay sesion" de "no se pudo comprobar", para no acusar de sesion
   * caducada lo que en realidad es un backend caido.
   */
  bootstrapError: string | null;
  profileImage: string | null;

  /**
   * @param remember `true` persiste la sesion entre reinicios del navegador;
   *   `false` la limita a la pestana actual.
   */
  login: (username: string, password: string, remember: boolean) => Promise<void>;
  logout: () => Promise<void>;
  /** Restaura la sesion al cargar la app. Idempotente. */
  bootstrap: () => Promise<void>;
  setProfileImage: (img: string | null) => void;
}

// ============================================================
// HELPERS
// ============================================================

function initialsOf(username: string): string {
  return username.trim().slice(0, 2).toUpperCase() || '?';
}

function toSessionUser(perfil: Perfil): SessionUser {
  return {
    id: perfil.id,
    username: perfil.username,
    initials: initialsOf(perfil.username),
    rol: perfil.rol,
    nivel: perfil.nivel,
    sedeId: perfil.sedeId,
    sede: perfil.sede,
    createdAt: perfil.createdAt,
  };
}

/** Lee permisos y flags del access token vigente. */
function readTokenClaims(): {
  permisos: Permission[];
  mustChangePassword: boolean;
} {
  const token = getAccessToken();
  const payload = token ? decodeJwt(token) : null;
  return {
    permisos: payload?.permisos ?? [],
    mustChangePassword: payload?.mustChangePassword ?? false,
  };
}

const LOGGED_OUT = {
  user: null,
  permisos: [] as Permission[],
  status: 'unauthenticated' as AuthStatus,
  isAuthenticated: false,
  mustChangePassword: false,
  bootstrapError: null as string | null,
};

// ============================================================
// STORE
// ============================================================

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      permisos: [],
      status: 'idle',
      isAuthenticated: false,
      mustChangePassword: false,
      bootstrapError: null,
      profileImage: null,

      login: async (username, password, remember) => {
        set({ status: 'loading', bootstrapError: null });
        try {
          const tokens = await authApi.login({ username, password });
          setTokens(tokens, remember);

          const claims = readTokenClaims();

          // Con mustChangePassword el backend bloquea casi todo (incluido
          // /auth/perfil), asi que no se intenta cargarlo todavia.
          if (tokens.mustChangePassword) {
            set({
              user: null,
              permisos: claims.permisos,
              status: 'authenticated',
              isAuthenticated: true,
              mustChangePassword: true,
            });
            return;
          }

          const perfil = await authApi.getPerfil();
          set({
            user: toSessionUser(perfil),
            permisos: claims.permisos,
            status: 'authenticated',
            isAuthenticated: true,
            mustChangePassword: false,
          });
        } catch (error) {
          clearTokens();
          set(LOGGED_OUT);
          throw error;
        }
      },

      logout: async () => {
        const refreshToken = getRefreshToken();
        if (refreshToken) await authApi.logout(refreshToken);
        clearTokens();
        set(LOGGED_OUT);
      },

      bootstrap: async () => {
        // Evita relanzarlo si ya hay una restauracion en curso o resuelta.
        if (get().status !== 'idle') return;

        if (!getRefreshToken()) {
          set(LOGGED_OUT);
          return;
        }

        set({ status: 'loading' });
        try {
          await forceRefresh();
          const claims = readTokenClaims();

          if (claims.mustChangePassword) {
            set({
              user: null,
              permisos: claims.permisos,
              status: 'authenticated',
              isAuthenticated: true,
              mustChangePassword: true,
            });
            return;
          }

          const perfil = await authApi.getPerfil();
          set({
            user: toSessionUser(perfil),
            permisos: claims.permisos,
            status: 'authenticated',
            isAuthenticated: true,
            mustChangePassword: false,
          });
        } catch (error) {
          // Solo se destruye la sesion si el SERVIDOR rechazo el refresh
          // token. Un backend caido o sin red es transitorio: se conserva el
          // token para que un recargar la pagina vuelva a intentarlo.
          if (isSessionDead(error)) {
            clearTokens();
            set(LOGGED_OUT);
            return;
          }
          set({
            ...LOGGED_OUT,
            bootstrapError:
              error instanceof ApiError
                ? error.message
                : 'No se pudo contactar con el servidor.',
          });
        }
      },

      setProfileImage: (img) => set({ profileImage: img }),
    }),
    {
      name: 'barbeer-auth',
      /**
       * v1 (mock) guardaba `{ user, isAuthenticated: true }` en esta misma
       * clave. Al rehidratar, zustand fusiona TODO lo que encuentre en
       * storage, asi que un navegador con el estado antiguo arrancaria con
       * `isAuthenticated: true` y un usuario falso — saltandose el guard hasta
       * que `bootstrap()` lo corrigiera. Subir la version descarta ese estado.
       */
      version: 2,
      migrate: (persisted, version) => {
        if (version < 2) {
          const old = persisted as { profileImage?: string | null } | null;
          // Solo se conserva la preferencia de avatar; el resto se descarta.
          return { profileImage: old?.profileImage ?? null };
        }
        return persisted as { profileImage: string | null };
      },
      // La sesion NO se persiste: se reconstruye desde el refresh token.
      partialize: (state) => ({ profileImage: state.profileImage }),
    },
  ),
);

// El cliente HTTP avisa cuando el refresh falla de forma irrecuperable
// (token reusado, familia revocada). Se limpia el estado sin acoplar axios a React.
onSessionEnded(() => {
  useAuthStore.setState(LOGGED_OUT);
});
