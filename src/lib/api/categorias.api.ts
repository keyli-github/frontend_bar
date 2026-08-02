import { api } from './client';
import type {
  Categoria,
  CategoriaQuery,
  CreateCategoriaPayload,
  MessageResponse,
  Paginated,
  UpdateCategoriaPayload,
} from '@/types/api';

export async function listCategorias(
  query: CategoriaQuery = {},
): Promise<Paginated<Categoria>> {
  const { data } = await api.get<Paginated<Categoria>>('/categorias', {
    params: {
      ...query,
      pagina: query.pagina ?? 1,
      limite: query.limite ?? 25,
    },
  });
  return data;
}

export async function getCategoria(id: string): Promise<Categoria> {
  const { data } = await api.get<Categoria>(`/categorias/${id}`);
  return data;
}

export async function createCategoria(
  payload: CreateCategoriaPayload,
): Promise<Categoria> {
  const { data } = await api.post<Categoria>('/categorias', payload);
  return data;
}

export async function updateCategoria(
  id: string,
  payload: UpdateCategoriaPayload,
): Promise<Categoria> {
  const { data } = await api.patch<Categoria>(`/categorias/${id}`, payload);
  return data;
}

export async function deleteCategoria(id: string): Promise<MessageResponse> {
  const { data } = await api.delete<MessageResponse>(`/categorias/${id}`);
  return data;
}
