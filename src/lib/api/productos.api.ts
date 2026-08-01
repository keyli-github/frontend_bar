/**
 * Endpoints de `ProductosController` (`@Controller('productos')`).
 *
 * Catalogo GLOBAL (sin sede): un maestro de productos compartido por todas
 * las sedes. El stock por sede vive en `inventario`.
 *
 * Lectura: `productos:leer`. Alta: `productos:crear`.
 * Edicion: `productos:editar`. Baja (soft-delete): `productos:eliminar`.
 */
import { api } from './client';
import type {
  CreateProductoPayload,
  MessageResponse,
  Paginated,
  Producto,
  ProductoQuery,
  UpdateProductoPayload,
} from '@/types/api';

/** `GET /productos` — catalogo paginado. */
export async function listProductos(
  query: ProductoQuery = {},
): Promise<Paginated<Producto>> {
  const { data } = await api.get<Paginated<Producto>>('/productos', {
    params: {
      ...query,
      pagina: query.pagina ?? 1,
      limite: query.limite ?? 25,
    },
  });
  return data;
}

/** `GET /productos/:id` */
export async function getProducto(id: string): Promise<Producto> {
  const { data } = await api.get<Producto>(`/productos/${id}`);
  return data;
}

/** `POST /productos` — alta. `codigo` debe ser unico. */
export async function createProducto(
  payload: CreateProductoPayload,
): Promise<Producto> {
  const { data } = await api.post<Producto>('/productos', payload);
  return data;
}

/** `PATCH /productos/:id` */
export async function updateProducto(
  id: string,
  payload: UpdateProductoPayload,
): Promise<Producto> {
  const { data } = await api.patch<Producto>(`/productos/${id}`, payload);
  return data;
}

/** `DELETE /productos/:id` — baja logica (activo = false). */
export async function deleteProducto(id: string): Promise<MessageResponse> {
  const { data } = await api.delete<MessageResponse>(`/productos/${id}`);
  return data;
}
