'use client';

/** Áreas visibles, con sus contadores. */

import { api } from '@/lib/api';
import { useAsync } from '@/lib/use-async';
import { useSession } from './session-provider';
import { Badge, Card, EmptyNote, ErrorNote, Spinner } from './ui';

export function AreasList() {
  const { session } = useSession();
  const { data, loading, error } = useAsync(() => api.areas(), []);

  const managedIds = new Set((session?.managed_areas ?? []).map((a) => a.id));
  const isAdmin = session?.permissions.is_admin ?? false;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Áreas</h1>
        <p className="mt-1 text-sm text-muted">
          {isAdmin
            ? 'Todas las áreas del sistema.'
            : 'Áreas que administras.'}
        </p>
      </div>

      {loading ? <Spinner /> : null}
      {error ? <ErrorNote message={error} /> : null}

      {!loading && !error ? (
        (data ?? []).length === 0 ? (
          <EmptyNote message="No hay áreas dentro de tu alcance." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(data ?? []).map((area) => (
              <Card key={area.id}>
                <div className="flex items-start justify-between gap-3">
                  <span
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-xs font-semibold"
                    style={{ background: `${area.color}22`, color: area.color }}
                    aria-hidden
                  >
                    {area.name.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="flex gap-1.5">
                    {area.status !== 'Activo' ? (
                      <Badge tone="warning">{area.status}</Badge>
                    ) : null}
                    {!isAdmin && managedIds.has(area.id) ? (
                      <Badge tone="success">Administras</Badge>
                    ) : null}
                  </div>
                </div>

                <p className="mt-3 truncate font-medium">{area.name}</p>
                <p className="mt-0.5 line-clamp-2 text-sm text-muted">
                  {area.description || 'Sin descripción.'}
                </p>

                <dl className="mt-4 flex gap-6 border-t border-border pt-3 text-sm">
                  <div>
                    <dt className="text-xs text-muted">Plataformas</dt>
                    <dd className="tabular-nums font-medium">
                      {area.platforms_count}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Usuarios</dt>
                    <dd className="tabular-nums font-medium">
                      {area.users_count}
                    </dd>
                  </div>
                </dl>
              </Card>
            ))}
          </div>
        )
      ) : null}
    </div>
  );
}
