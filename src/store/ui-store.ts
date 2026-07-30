'use client';

import { create } from 'zustand';

interface UIState {
  /** Cajon de navegacion en movil (<lg). */
  sidebarOpen: boolean;
  /** Sidebar reducido a iconos en escritorio (>=lg). */
  sidebarCollapsed: boolean;
  /**
   * Acordeones abiertos/cerrados por el usuario.
   * Solo contiene los modulos que se han tocado explicitamente; el resto
   * se deriva de la ruta activa. Asi el estado por defecto sigue a la
   * navegacion sin necesidad de sincronizarlo con un efecto.
   */
  expandedModules: Record<string, boolean>;

  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleCollapsed: () => void;
  toggleModule: (id: string, open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: false,
  sidebarCollapsed: false,
  expandedModules: {},

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleCollapsed: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  toggleModule: (id, open) =>
    set((s) => ({ expandedModules: { ...s.expandedModules, [id]: open } })),
}));
