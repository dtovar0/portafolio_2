/**
 * Cliente de la API v1.
 *
 * La sesión vive en la cookie que emite Flask, así que toda petición va con
 * `credentials: 'include'`. Nada de tokens en localStorage: el navegador no
 * puede leer la cookie y así el SSO de Authelia sigue siendo la autoridad.
 */

import type {
  Area, AreaInput, AppNotification, AuditEntry, AuthConfig, AuthContext,
  EmailTemplate,
  ManagedUser, Platform, PlatformInput, Session, SmtpConfig, Stats,
  SystemSettings, UserInput,
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

  // --- Áreas ---
  createArea: (input: AreaInput) =>
    request<{ status: string; area: Area }>(
      '/areas', { method: 'POST', body: JSON.stringify(input) }),
  updateArea: (id: number, input: AreaInput) =>
    request<{ status: string; area: Area }>(
      `/areas/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  deleteArea: (id: number) =>
    request<{ status: string }>(`/areas/${id}`, { method: 'DELETE' }),
  setAreaUsers: (id: number, userIds: number[]) =>
    request<{ status: string }>(`/areas/${id}/users`,
      { method: 'PUT', body: JSON.stringify({ user_ids: userIds }) }),

  // --- Plataformas ---
  createPlatform: (input: PlatformInput) =>
    request<{ status: string; platform: Platform }>(
      '/platforms', { method: 'POST', body: JSON.stringify(input) }),
  updatePlatform: (id: number, input: PlatformInput) =>
    request<{ status: string; platform: Platform }>(
      `/platforms/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  deletePlatform: (id: number) =>
    request<{ status: string }>(`/platforms/${id}`, { method: 'DELETE' }),
  setPlatformUsers: (id: number, userIds: number[]) =>
    request<{ status: string }>(`/platforms/${id}/users`,
      { method: 'PUT', body: JSON.stringify({ user_ids: userIds }) }),

  // --- Usuarios ---
  createUser: (input: UserInput) =>
    request<{ status: string; id: number }>(
      '/users', { method: 'POST', body: JSON.stringify(input) }),
  updateUser: (id: number, input: UserInput) =>
    request<{ status: string }>(
      `/users/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  deleteUser: (id: number) =>
    request<{ status: string }>(`/users/${id}`, { method: 'DELETE' }),
  setUserPlatforms: (id: number, platformIds: number[]) =>
    request<{ status: string }>(`/users/${id}/platforms`,
      { method: 'PUT', body: JSON.stringify({ platform_ids: platformIds }) }),

  // --- Preferencias ---
  savePreferences: (prefs: Partial<Session['preferences']>) =>
    request<{ status: string; preferences: Session['preferences'] }>(
      '/me/preferences', { method: 'PUT', body: JSON.stringify(prefs) }),

  // --- Configuración del sistema ---
  settings: () => request<SystemSettings>('/settings'),
  saveSettings: (input: Partial<SystemSettings>) =>
    request<{ status: string; settings: SystemSettings }>(
      '/settings', { method: 'PUT', body: JSON.stringify(input) }),

  smtp: () => request<SmtpConfig>('/smtp'),
  saveSmtp: (input: Partial<SmtpConfig> & { password?: string }) =>
    request<{ status: string; smtp: SmtpConfig }>(
      '/smtp', { method: 'PUT', body: JSON.stringify(input) }),
  testSmtp: (email: string) =>
    request<{ status: string; message?: string }>(
      '/smtp/test', { method: 'POST', body: JSON.stringify({ email }) }),

  templates: () => request<EmailTemplate[]>('/templates'),
  saveTemplate: (slug: string, input: Partial<EmailTemplate>) =>
    request<{ status: string; template: EmailTemplate }>(
      `/templates/${slug}`, { method: 'PUT', body: JSON.stringify(input) }),

  notifications: () => request<AppNotification[]>('/notifications'),
  markNotificationsRead: (ids?: number[]) =>
    request<{ status: string }>('/notifications/read',
      { method: 'POST', body: JSON.stringify(ids ? { ids } : {}) }),
  clearNotifications: () =>
    request<{ status: string }>('/notifications', { method: 'DELETE' }),

  // --- Autenticación ---
  authContext: () => request<AuthContext>('/auth/context'),
  ssoLogin: () =>
    request<{ status: string; role: string }>('/auth/sso', { method: 'POST' }),
  login: (email: string, password: string, method: 'directory' | 'local') =>
    request<{ status: string; role: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, method }),
    }),
  logout: () =>
    request<{ status: string; redirect: string | null }>(
      '/auth/logout', { method: 'POST' }),

  authConfig: () => request<AuthConfig>('/auth-config'),
  saveAuthConfig: (input: Partial<AuthConfig> & { ldap_pass?: string }) =>
    request<{ status: string; config: AuthConfig }>(
      '/auth-config', { method: 'PUT', body: JSON.stringify(input) }),
  testAuthConfig: (input?: Partial<AuthConfig> & { ldap_pass?: string }) =>
    request<{ status: string; message?: string }>(
      '/auth-config/test', { method: 'POST', body: JSON.stringify(input ?? {}) }),
};
