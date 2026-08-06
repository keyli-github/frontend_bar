import { api } from './client';
import type { Paginated } from '@/types/api';
import type { CreateEtiquetaPayload, Etiqueta, EtiquetaQuery, UpdateEtiquetaPayload } from '@/types/ventas';

/** Billeteras disponibles para el usuario (globales + las de su sede). */
export async function listEtiquetas(query: EtiquetaQuery = {}): Promise<Paginated<Etiqueta>> {
  const { data } = await api.get<Paginated<Etiqueta>>('/etiquetas', {
    params: {
      pagina: query.pagina ?? 1,
      limite: query.limite ?? 50,
      sedeId: query.sedeId,
      soloActivas: query.soloActivas,
    },
  });
  return data;
}

/** Lista simplificada de etiquetas activas (para selector en conciliacion). */
export async function listEtiquetasActivas(sedeId?: string): Promise<Etiqueta[]> {
  const result = await listEtiquetas({ pagina: 1, limite: 50, soloActivas: true, sedeId });
  return result.data;
}

/** Crear billetera digital (ADMIN, SUPERADMIN). */
export async function createEtiqueta(payload: CreateEtiquetaPayload): Promise<Etiqueta> {
  const { data } = await api.post<Etiqueta>('/etiquetas', payload);
  return data;
}

/** Editar nombre, orden o requiereComprobante (ADMIN, SUPERADMIN). */
export async function updateEtiqueta(id: string, payload: UpdateEtiquetaPayload): Promise<Etiqueta> {
  const { data } = await api.patch<Etiqueta>(`/etiquetas/${id}`, payload);
  return data;
}

/** Activar o desactivar una billetera (ADMIN, SUPERADMIN). */
export async function toggleEtiqueta(id: string, activo: boolean): Promise<Etiqueta> {
  const { data } = await api.patch<Etiqueta>(`/etiquetas/${id}/estado`, { activo });
  return data;
}
