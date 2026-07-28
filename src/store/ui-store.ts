'use client';

import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  selectedSede: string;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleCollapsed: () => void;
  setSelectedSede: (sede: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: false,
  sidebarCollapsed: false,
  selectedSede: 'Zona Rosa',
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleCollapsed: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSelectedSede: (sede) => set({ selectedSede: sede }),
}));
