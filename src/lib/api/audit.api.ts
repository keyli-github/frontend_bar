/**
 * Endpoint de `AuditController` (`@Controller('audit')`).
 *
 * Requiere permiso `audit:leer`. Un ADMIN solo ve los registros de su sede.
 */
import { api } from './client';
import type { AuditLog, AuditQuery, Paginated } from '@/types/api';

/** `GET /audit` — paginado, limite maximo 100 (por defecto 50). */
export async function listAuditLogs(
  query: AuditQuery = {},
): Promise<Paginated<AuditLog>> {
  const { data } = await api.get<Paginated<AuditLog>>('/audit', {
    params: {
      ...query,
      pagina: query.pagina ?? 1,
      limite: query.limite ?? 50,
    },
  });
  return data;
}
