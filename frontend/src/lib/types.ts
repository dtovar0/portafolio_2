/** Tipos del contrato con la API v1 de Flask (`app/modules/api/routes.py`). */

export type Role = 'administrador' | 'admin_area' | 'usuario';

export interface AreaRef {
  id: number;
  name: string;
}

export interface Session {
  id: number;
  email: string;
  name: string;
  role: Role;
  auth_source: string;
  areas: AreaRef[];
  managed_areas: AreaRef[];
  permissions: {
    is_admin: boolean;
    is_area_admin: boolean;
    can_manage_areas: boolean;
    can_manage_system: boolean;
  };
  preferences: {
    notifications: boolean;
    email_notifications: boolean;
    refresh_interval: number;
    tour_enabled: boolean;
  };
}

export interface Area {
  id: number;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  status: string;
  platforms_count: number;
  users_count: number;
}

export interface Platform {
  id: number;
  name: string;
  description: string;
  area_id: number;
  area_name: string | null;
  area_color: string;
  area_icon: string;
  direct_link: string | null;
  icon: string;
  logo_url: string | null;
  bg_color: string;
  text_color: string;
  status: string;
  visits: number;
  is_favorite: boolean;
}

export interface ManagedUser {
  id: number;
  email: string;
  name: string;
  role: Role;
  is_active: boolean;
  auth_source: string;
  areas: AreaRef[];
  managed_areas: AreaRef[];
  last_login_at: string | null;
}

export interface Stats {
  areas: number;
  platforms: number;
  visits: number;
  users?: number;
  most_visited: { id: number; name: string; visits: number }[];
  platforms_by_area: { area: string; color: string; count: number }[];
}

export interface AuditEntry {
  id: number;
  time: string;
  user: string;
  action: string;
  module: string | null;
  target: string | null;
  detail: string | null;
  ip: string | null;
  status: string;
}
