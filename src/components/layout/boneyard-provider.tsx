'use client';

import type { ReactNode } from 'react';
import '@/bones/registry';

/** Garantiza que el registry autogenerado se ejecute en el bundle cliente. */
export function BoneyardProvider({ children }: { children: ReactNode }) {
  return children;
}
