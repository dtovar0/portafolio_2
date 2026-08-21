'use client';

/** Usuarios: alta, edición, baja y asignación de áreas y plataformas. */

import { useState } from 'react';
import { api } from '@/lib/api';
import { useAsync } from '@/lib/use-async';
import type { Area, ManagedUser, Platform, Role, UserInput } from '@/lib/types';
import { Button, Checkbox, ConfirmDialog, Field, Modal, Select, TextInput } from './form';
import { useSession } from './session-provider';
import { Badge, Card, EmptyNote, ErrorNote, Spinner } from './ui';

const ROLE_LABELS: Record<string, string> = {
  administrador: 'Admin global',
  admin_area: 'Admin de área',
  usuario: 'Usuario',
};

/** Selector de etiquetas múltiple. */
function TagPicker<T extends { id: number; name: string }>({
  options,
  selected,
  onChange,
  empty,
}: {
  options: T[];
  selected: number[];
  onChange: (ids: number[]) => void;
  empty: string;
}) {
  if (options.length === 0) {
    return <p className="text-xs text-muted">{empty}</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const on = selected.includes(option.id);
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={on}
            onClick={() =>
              onChange(on ? selected.filter((id) => id !== option.id) : [...selected, option.id])
            }
            className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
              on
                ? 'border-accent bg-accent/15 text-accent'
                : 'border-border text-muted hover:text-content'
            }`}
          >
            {option.name}
          </button>
        );
      })}
    </div>
  );
}

function UserForm({
  user,
  areas,
  platforms,
  onClose,
  onSaved,
}: {
  user: ManagedUser | null;
  areas: Area[];
  platforms: Platform[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { session } = useSession();
  const isAdmin = session?.permissions.is_admin ?? false;

  const [form, setForm] = useState<UserInput>(
    user
      ? { name: user.name, role: user.role, is_active: user.is_active }
      : { email: '', name: '', role: 'usuario', is_active: true, password: '' },
  );
  const [areaIds, setAreaIds] = useState<number[]>(
    (user?.areas ?? []).map((a) => a.id),
  );
  const [managedIds, setManagedIds] = useState<number[]>(
    (user?.managed_areas ?? []).map((a) => a.id),
  );
  const [platformIds, setPlatformIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!user && !form.email?.trim()) {
      setError('El correo es obligatorio.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (user) {
        await api.updateUser(user.id, {
          ...form,
          ...(form.role === 'admin_area' ? { managed_area_ids: managedIds } : {}),
        });
        await api.setUserAreas(user.id, areaIds);
        if (platformIds.length > 0) {
          await api.setUserPlatforms(user.id, platformIds);
        }
      } else {
        const created = await api.createUser({ ...form, area_ids: areaIds });
        if (form.role === 'admin_area' && managedIds.length > 0) {
          await api.updateUser(created.id, { managed_area_ids: managedIds });
        }
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={user ? `Editar ${user.name}` : 'Nuevo usuario'}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </>
      }
    >
      {error ? <ErrorNote message={error} /> : null}

      {!user ? (
        <Field label="Correo">
          <TextInput
            type="email"
            value={form.email ?? ''}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </Field>
      ) : null}

      <Field label="Nombre">
        <TextInput
          value={form.name ?? ''}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </Field>

      <Field
        label="Contraseña"
        hint={user ? 'Vacío conserva la actual.' : 'Si se deja vacío se usa la inicial por defecto.'}
      >
        <TextInput
          type="password" autoComplete="new-password"
          value={form.password ?? ''}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
      </Field>

      <Field
        label="Rol"
        hint={isAdmin ? undefined : 'Solo un administrador global puede asignar ese rol.'}
      >
        <Select
          value={form.role ?? 'usuario'}
          onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
        >
          <option value="usuario">Usuario</option>
          <option value="admin_area">Administrador de área</option>
          {/* El backend rechaza este rol si quien lo pide no es superadmin. */}
          {isAdmin ? <option value="administrador">Administrador global</option> : null}
        </Select>
      </Field>

      <Field label="Áreas a las que pertenece">
        <TagPicker
          options={areas} selected={areaIds} onChange={setAreaIds}
          empty="No hay áreas en tu alcance."
        />
      </Field>

      {form.role === 'admin_area' ? (
        <Field label="Áreas que administra" hint="Solo entre las de tu alcance.">
          <TagPicker
            options={areas} selected={managedIds} onChange={setManagedIds}
            empty="No hay áreas en tu alcance."
          />
        </Field>
      ) : null}

      {user ? (
        <Field label="Plataformas asignadas" hint="Vacío deja las actuales sin cambios.">
          <TagPicker
            options={platforms} selected={platformIds} onChange={setPlatformIds}
            empty="No hay plataformas en tu alcance."
          />
        </Field>
      ) : null}

      <Checkbox
        label="Cuenta activa"
        checked={Boolean(form.is_active)}
        onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
      />
    </Modal>
  );
}

export function UsersList() {
  const { session } = useSession();
  const users = useAsync(() => api.users(), []);
  const areas = useAsync(() => api.areas(), []);
  const platforms = useAsync(() => api.platforms(), []);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [removing, setRemoving] = useState<ManagedUser | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function remove() {
    if (!removing) return;
    setBusy(true);
    setProblem(null);
    try {
      await api.deleteUser(removing.id);
      setRemoving(null);
      users.reload();
    } catch (err) {
      setProblem(err instanceof Error ? err.message : 'No se pudo eliminar');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Usuarios</h1>
          <p className="mt-1 text-sm text-muted">
            {session?.permissions.is_admin
              ? 'Todos los usuarios del sistema.'
              : 'Usuarios de las áreas que administras.'}
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>Nuevo usuario</Button>
      </div>

      {problem ? <ErrorNote message={problem} /> : null}
      {users.loading ? <Spinner /> : null}
      {users.error ? <ErrorNote message={users.error} /> : null}

      {!users.loading && !users.error ? (
        (users.data ?? []).length === 0 ? (
          <EmptyNote message="No hay usuarios dentro de tu alcance." />
        ) : (
          <div className="space-y-3">
            {(users.data ?? []).map((user) => (
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
                  {user.managed_areas.length > 0 ? (
                    <Badge tone="success">
                      administra {user.managed_areas.length}
                    </Badge>
                  ) : null}
                </div>

                <div className="mt-3 flex gap-1 border-t border-border pt-3">
                  <button
                    type="button"
                    onClick={() => setEditing(user)}
                    className="rounded px-2 py-1 text-xs text-accent hover:bg-accent/10"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => setRemoving(user)}
                    className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-500/10 dark:text-red-300"
                  >
                    Eliminar
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )
      ) : null}

      {creating ? (
        <UserForm
          user={null} areas={areas.data ?? []} platforms={platforms.data ?? []}
          onClose={() => setCreating(false)}
          onSaved={() => { setCreating(false); users.reload(); }}
        />
      ) : null}

      {editing ? (
        <UserForm
          user={editing} areas={areas.data ?? []} platforms={platforms.data ?? []}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); users.reload(); }}
        />
      ) : null}

      {removing ? (
        <ConfirmDialog
          title="Eliminar usuario"
          message={`Se eliminará la cuenta de ${removing.email}. Esta acción no se puede deshacer.`}
          onConfirm={remove}
          onCancel={() => setRemoving(null)}
          busy={busy}
        />
      ) : null}
    </div>
  );
}
