/**
 * usePagination — Hook reutilizable de paginación
 * Usado en: Inventario, Kardex, Compras, Usuarios, Productos
 */
'use client';
import { useState, useMemo } from 'react';

interface UsePaginationOptions {
  pageSize?: number;
}

export function usePagination<T>(items: T[], { pageSize = 10 }: UsePaginationOptions = {}) {
  const [page, setPage] = useState(1);

  const total      = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Resetear a página 1 si los items cambian (búsqueda/filtro)
  const paginated  = useMemo(() => {
    const safeP = Math.min(page, totalPages);
    return items.slice((safeP - 1) * pageSize, safeP * pageSize);
  }, [items, page, pageSize, totalPages]);

  const goTo  = (p: number) => setPage(Math.max(1, Math.min(p, totalPages)));
  const reset = () => setPage(1);

  return { page, totalPages, total, paginated, goTo, reset };
}
