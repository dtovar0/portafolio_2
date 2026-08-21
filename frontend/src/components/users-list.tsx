'use client';

/** Usuarios administrables, con edición de sus áreas. */

import { useState } from 'react';
import { api } from '@/lib/api';
import { useAsync } from '@/lib/use-async';
import type { ManagedUser } from '@/lib/types';
import { useSession } from './session-provider';
import { Badge, Card, EmptyNote, ErrorNote, Spinner } from './ui';

const ROLE_LABELS: Record<string, string> = {
  administrador: 'Admin global',
  admin_area: 'Admin de área',
  usuario: 'Usuario',
};

function AreaEditor({
  user,
  onDone,
}: {
  user: ManagedUser;
  onDone: () => void;
}) {
  const areas = useAsync(() => api.areas(), []);
  const [selected, setSelected] = useState<number[]>(
    user.areas.map((a) => a.id),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await api.setUserAreas(user.id, selected);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-3 border-t border-border pt-3">
      {areas.loading ? <Spinner label="Cargando áreas…" /> : null}
      {error ? <ErrorNote message={error} /> : null}

      <div className="flex flex-wrap gap-2">
        {(areas.data ?? []).map((area) => {
          const on = selected.includes(area.id);
          return (
            <button
              key={area.id}
              type="button"
              aria-pressed={on}
              onClick={() =>
                setSelected((prev) =>
                  on ? prev.filter((id) => id !== area.id) : [...prev, area.id],
                )
              }
              className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                on
                  ? 'border-accent bg-accent/15 text-accent'
                  : 'border-border text-muted hover:text-content'
              }`}
            >
              {area.name}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

export function UsersList() {
  const { session } = useSession();
  const { data, loading, error, reload } = useAsync(() => api.users(), []);
  const [editing, setEditing] = useState<number | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Usuarios</h1>
        <p className="mt-1 text-sm text-muted">
          {session?.permissions.is_admin
            ? 'Todos los usuarios del sistema.'
            : 'Usuarios de las áreas que administras.'}
        </p>
      </div>

      {loading ? <Spinner /> : null}
      {error ? <ErrorNote message={error} /> : null}

      {!loading && !error ? (
        (data ?? []).length === 0 ? (
          <EmptyNote message="No hay usuarios dentro de tu alcance." />
        ) : (
          <div className="space-y-3">
            {(data ?? []).map((user) => (
              <Card key={user.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{user.name}</p>
                    <p className="truncate text-sm text-muted">{user.email}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge>{ROLE_LABELS[user.role] ?? user.role}</Badge>
                    <Badge tone={user.is_active ? 'success' : 'warning'}>
                      {user.is_active ? 'Activo' : 'Inactivo'}
                    </Badge>
                    <Badge>{user.auth_source}</Badge>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {user.areas.length === 0 ? (
                    <span className="text-xs text-muted">Sin áreas asignadas</span>
                  ) : (
                    user.areas.map((area) => (
                      <span
                        key={area.id}
                        className="rounded-full bg-border/60 px-2 py-0.5 text-xs text-muted"
                      >
                        {area.name}
                      </span>
                    ))
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      setEditing(editing === user.id ? null : user.id)
                    }
                    className="ml-1 text-xs text-accent hover:underline"
                  >
                    {editing === user.id ? 'Cerrar' : 'Editar áreas'}
                  </button>
                </div>

                {editing === user.id ? (
                  <AreaEditor
                    user={user}
                    onDone={() => {
                      setEditing(null);
                      reload();
                    }}
                  />
                ) : null}
              </Card>
            ))}
          </div>
        )
      ) : null}
    </div>
  );
}
