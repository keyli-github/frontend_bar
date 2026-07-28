'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  updateProfile: (data: Partial<User>) => void;
  profileImage: string | null;
  setProfileImage: (img: string | null) => void;
}

/**
 * Usuarios demo:
 *   superadmin   → admin@barbeer.com      / admin123
 *   administrador → andrea@barbeer.com    / andrea123
 *   empleado     → miguel@barbeer.com     / miguel123
 */
const DEMO_USERS: { email: string; password: string; user: User }[] = [
  {
    email: 'keyli@barbeer.com',
    password: 'keyli123',
    user: { id: '1', name: 'Keyli Mendoza', email: 'keyli@barbeer.com', role: 'superadmin', sede: 'Todas', initials: 'KM', estado: 'activo', ultimoAcceso: 'Hace 5 min' },
  },
  {
    email: 'charly@barbeer.com',
    password: 'charly123',
    user: { id: '2', name: 'Charly Torres', email: 'charly@barbeer.com', role: 'administrador', sede: 'Zona Rosa', initials: 'CT', estado: 'activo', ultimoAcceso: 'Hace 2 horas' },
  },
  {
    email: 'frank@barbeer.com',
    password: 'frank123',
    user: { id: '5', name: 'Frank Ríos', email: 'frank@barbeer.com', role: 'empleado', sede: 'Zona Rosa', initials: 'FR', estado: 'activo', ultimoAcceso: 'Hace 10 min' },
  },
];

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      profileImage: null,

      login: (email, password) => {
        const found = DEMO_USERS.find(
          (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
        );
        if (found) {
          set({ user: found.user, isAuthenticated: true });
          return true;
        }
        // fallback: cualquier email con >=4 chars de password → superadmin demo
        if (email && password.length >= 4) {
          set({ user: DEMO_USERS[0].user, isAuthenticated: true });
          return true;
        }
        return false;
      },

      logout: () => set({ user: null, isAuthenticated: false }),

      updateProfile: (data) =>
        set((s) => ({ user: s.user ? { ...s.user, ...data } : null })),

      setProfileImage: (img) => set({ profileImage: img }),
    }),
    { name: 'barbeer-auth' }
  )
);
