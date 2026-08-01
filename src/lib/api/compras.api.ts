/**
 * Endpoints de `ComprasController` (`@Controller('compras')`).
 *
 * Ordenes de compra + proveedores. Al pasar una orden a RECIBIDA el backend
 * genera las entradas de inventario y kardex de cada item. Alcance por sede en
 * el servidor; SUPERADMIN puede pasar `sedeId`.
 *
 * Ordenes: lectura `compras:leer`, alta `compras:crear`, cambio de estado
 * `compras:editar`. Proveedores comparten los mismos permisos.
 *
 * OJO: las rutas de proveedores van ANTES que `/:id` en el backend, por eso
 * `/compras/proveedores` no colisiona con `/compras/:id`.
 */
import { api } from './client';
import type {
  CambiarEstadoCompraPayload,
  Compra,
  CompraQuery,
  CreateCompraPayload,
  CreateProveedorPayload,
  Paginated,
  Proveedor,
  ProveedorBase,
  ProveedorQuery,
  UpdateProveedorPayload,
} from '@/types/api';

// ---------- Ordenes de compra ----------

/** `GET /compras` — ordenes paginadas (sin items). */
export async function listCompras(
  query: CompraQuery = {},
): Promise<Paginated<Compra>> {
  const { data } = await api.get<Paginated<Compra>>('/compras', {
    params: {
      ...query,
      pagina: query.pagina ?? 1,
      limite: query.limite ?? 25,
    },
  });
  return data;
}

/** `GET /compras/:id` — orden con `items[]`. */
export async function getCompra(id: string): Promise<Compra> {
  const { data } = await api.get<Compra>(`/compras/${id}`);
  return data;
}

/** `POST /compras` — crea la orden en estado PENDIENTE. */
export async function createCompra(
  payload: CreateCompraPayload,
): Promise<Compra> {
  const { data } = await api.post<Compra>('/compras', payload);
  return data;
}

/**
 * `PATCH /compras/:id/estado` — transicion de estado. RECIBIDA dispara las
 * entradas de inventario/kardex; RECIBIDA y CANCELADA son terminales.
 */
export async function cambiarEstadoCompra(
  id: string,
  payload: CambiarEstadoCompraPayload,
): Promise<Compra> {
  const { data } = await api.patch<Compra>(`/compras/${id}/estado`, payload);
  return data;
}

// ---------- Proveedores ----------

/** `GET /compras/proveedores` — proveedores paginados con conteos. */
export async function listProveedores(
  query: ProveedorQuery = {},
): Promise<Paginated<Proveedor>> {
  const { data } = await api.get<Paginated<Proveedor>>('/compras/proveedores', {
    params: {
      ...query,
      pagina: query.pagina ?? 1,
      limite: query.limite ?? 25,
    },
  });
  return data;
}

/** `POST /compras/proveedores` — alta. */
export async function createProveedor(
  payload: CreateProveedorPayload,
): Promise<ProveedorBase> {
  const { data } = await api.post<ProveedorBase>(
    '/compras/proveedores',
    payload,
  );
  return data;
}

/** `PATCH /compras/proveedores/:id` */
export async function updateProveedor(
  id: string,
  payload: UpdateProveedorPayload,
): Promise<ProveedorBase> {
  const { data } = await api.patch<ProveedorBase>(
    `/compras/proveedores/${id}`,
    payload,
  );
  return data;
}
