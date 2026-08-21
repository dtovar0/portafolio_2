/**
 * Cliente de la API v1.
 *
 * La sesión vive en la cookie que emite Flask, así que toda petición va con
 * `credentials: 'include'`. Nada de tokens en localStorage: el navegador no
 * puede leer la cookie y así el SSO de Authelia sigue siendo la autoridad.
 */

import type {
  Area, AuditEntry, ManagedUser, Platform, Session, Stats,
} from './types';

/** En el servidor hay que hablar con Flask directamente; en el navegador basta
 *  la ruta relativa, que Nginx (o el rewrite de dev) reenvía. */
const BASE = typeof window === 'undefined'
  ? (process.env.BACKEND_URL ?? 'http://127.0.0.1:5001')
  : '';

export class ApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }

  /** El usuario está autenticado pero no tiene permiso. */
  get isForbidden() {
    return this.status === 403;
  }

  /** No hay sesión: Flask redirige al login. */
  get isUnauthenticated() {
    return this.status === 401 || this.status === 302;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}/api/v1${path}`, {
    ...init,
    credentials: 'include',
    redirect: 'manual',
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });

  // Flask responde 302 al login cuando no hay sesión; `redirect: 'manual'`
  // lo deja como opaco (status 0) en el navegador.
  if (response.status === 0 || response.type === 'opaqueredirect') {
    throw new ApiError(401, 'Sesión no válida.');
  }

  if (!response.ok) {
    const message = await response
      .json()
      .then((body) => body?.message ?? body?.error)
      .catch(() => null);
    throw new ApiError(response.status, message ?? `Error ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  session: () => request<Session>('/me'),
  areas: () => request<Area[]>('/areas'),
  stats: () => request<Stats>('/stats'),
  users: () => request<ManagedUser[]>('/users'),
  audit: (limit = 100) => request<AuditEntry[]>(`/audit?limit=${limit}`),
  favorites: () => request<Platform[]>('/favorites'),

  platforms: (params: { areaId?: number; q?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.areaId) query.set('area_id', String(params.areaId));
    if (params.q) query.set('q', params.q);
    const suffix = query.toString();
    return request<Platform[]>(`/platforms${suffix ? `?${suffix}` : ''}`);
  },

  toggleFavorite: (platformId: number) =>
    request<{ status: string; is_favorite: boolean }>(
      `/platforms/${platformId}/favorite`, { method: 'POST' },
    ),

  registerVisit: (platformId: number) =>
    request<{ status: string; visits: number }>(
      `/platforms/${platformId}/visit`, { method: 'POST' },
    ),

  setUserAreas: (userId: number, areaIds: number[]) =>
    request<{ status: string; areas: Area[] }>(
      `/users/${userId}/areas`,
      { method: 'PUT', body: JSON.stringify({ area_ids: areaIds }) },
    ),
};
