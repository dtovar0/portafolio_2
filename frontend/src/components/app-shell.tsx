'use client';

/** Marco de la aplicación: navegación lateral y cabecera con la sesión. */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SessionProvider, useSession } from './session-provider';
import { ErrorNote, Spinner } from './ui';

interface NavItem {
  href: string;
  label: string;
  /** Permiso mínimo; sin él el enlace no se muestra. */
  requires?: 'any_admin' | 'admin';
}

const NAV: NavItem[] = [
  { href: '/', label: 'Panel' },
  { href: '/platforms', label: 'Plataformas' },
  { href: '/favorites', label: 'Favoritos' },
  { href: '/notifications', label: 'Notificaciones' },
  { href: '/admin/platforms', label: 'Administrar plataformas', requires: 'any_admin' },
  { href: '/areas', label: 'Áreas', requires: 'any_admin' },
  { href: '/users', label: 'Usuarios', requires: 'any_admin' },
  { href: '/audit', label: 'Auditoría' },
  { href: '/settings', label: 'Ajustes' },
];

function Nav() {
  const { session } = useSession();
  const pathname = usePathname();
  if (!session) return null;

  const { is_admin: isAdmin, is_area_admin: isAreaAdmin } = session.permissions;
  const visible = NAV.filter((item) => {
    if (item.requires === 'admin') return isAdmin;
    if (item.requires === 'any_admin') return isAdmin || isAreaAdmin;
    return true;
  });

  return (
    <nav className="flex flex-col gap-1" aria-label="Principal">
      {visible.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`rounded-lg px-3 py-2 text-sm transition-colors ${
              active
                ? 'bg-accent/15 font-medium text-accent'
                : 'text-muted hover:bg-border/40 hover:text-content'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function RoleLabel({ role }: { role: string }) {
  const labels: Record<string, string> = {
    administrador: 'Administrador global',
    admin_area: 'Administrador de área',
    usuario: 'Usuario',
  };
  return <>{labels[role] ?? role}</>;
}

function Frame({ children }: { children: React.ReactNode }) {
  const { session, loading, error } = useSession();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Spinner label="Cargando sesión…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg p-8">
        <ErrorNote message={error} />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 border-r border-border bg-panel p-4 md:block">
        <p className="px-3 pb-4 text-lg font-semibold">Nexus</p>
        <Nav />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-border bg-panel px-6 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{session.name}</p>
            <p className="truncate text-xs text-muted">
              <RoleLabel role={session.role} />
              {session.managed_areas.length > 0
                ? ` · ${session.managed_areas.length} área(s)`
                : ''}
            </p>
          </div>
          <a
            href="/auth/logout"
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted hover:text-content"
          >
            Salir
          </a>
        </header>

        <main className="min-w-0 flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <Frame>{children}</Frame>
    </SessionProvider>
  );
}
