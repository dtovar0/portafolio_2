'use client';

/** Áreas: consulta y, para el superadmin, administración. */

import { useState } from 'react';
import { api } from '@/lib/api';
import { useAsync } from '@/lib/use-async';
import type { Area, AreaInput } from '@/lib/types';
import { Button, Checkbox, ConfirmDialog, Field, Modal, TextArea, TextInput } from './form';
import { useSession } from './session-provider';
import { Badge, Card, EmptyNote, ErrorNote, Spinner } from './ui';

function AreaForm({
  area,
  onClose,
  onSaved,
}: {
  area: Area | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<AreaInput>(
    area
      ? {
          name: area.name,
          description: area.description ?? '',
          color: area.color,
          status: area.status,
        }
      : { name: '', description: '', color: '#6366f1', status: 'Activo' },
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!form.name?.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (area) await api.updateArea(area.id, form);
      else await api.createArea(form);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={area ? `Editar ${area.name}` : 'Nueva área'}
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

      <Field label="Nombre">
        <TextInput
          value={form.name ?? ''}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </Field>

      <Field label="Descripción">
        <TextArea
          rows={2}
          value={form.description ?? ''}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </Field>

      <Field label="Color">
        <TextInput
          type="color" className="h-10 p-1"
          value={form.color ?? '#6366f1'}
          onChange={(e) => setForm({ ...form, color: e.target.value })}
        />
      </Field>

      <Checkbox
        label="Activa"
        checked={form.status === 'Activo'}
        onChange={(e) => setForm({ ...form, status: e.target.checked ? 'Activo' : 'Inactivo' })}
      />
    </Modal>
  );
}

export function AreasList() {
  const { session } = useSession();
  const { data, loading, error, reload } = useAsync(() => api.areas(), []);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Area | null>(null);
  const [removing, setRemoving] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const isAdmin = session?.permissions.is_admin ?? false;
  const managedIds = new Set((session?.managed_areas ?? []).map((a) => a.id));

  async function remove() {
    if (!removing) return;
    setBusy(true);
    setProblem(null);
    try {
      await api.deleteArea(removing.id);
      setRemoving(null);
      reload();
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
          <h1 className="text-2xl font-semibold">Áreas</h1>
          <p className="mt-1 text-sm text-muted">
            {isAdmin ? 'Todas las áreas del sistema.' : 'Áreas que administras.'}
          </p>
        </div>
        {/* Crear un área es crear un tenant: solo el superadmin. */}
        {isAdmin ? <Button onClick={() => setCreating(true)}>Nueva área</Button> : null}
      </div>

      {problem ? <ErrorNote message={problem} /> : null}
      {loading ? <Spinner /> : null}
      {error ? <ErrorNote message={error} /> : null}

      {!loading && !error ? (
        (data ?? []).length === 0 ? (
          <EmptyNote message="No hay áreas dentro de tu alcance." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(data ?? []).map((area) => {
              const canEdit = isAdmin || managedIds.has(area.id);
              return (
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
                      <dd className="font-medium tabular-nums">{area.platforms_count}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">Usuarios</dt>
                      <dd className="font-medium tabular-nums">{area.users_count}</dd>
                    </div>
                  </dl>

                  {canEdit ? (
                    <div className="mt-3 flex gap-1 border-t border-border pt-3">
                      <button
                        type="button"
                        onClick={() => setEditing(area)}
                        className="rounded px-2 py-1 text-xs text-accent hover:bg-accent/10"
                      >
                        Editar
                      </button>
                      {isAdmin ? (
                        <button
                          type="button"
                          onClick={() => setRemoving(area)}
                          className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-500/10 dark:text-red-300"
                        >
                          Eliminar
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </Card>
              );
            })}
          </div>
        )
      ) : null}

      {creating ? (
        <AreaForm
          area={null}
          onClose={() => setCreating(false)}
          onSaved={() => { setCreating(false); reload(); }}
        />
      ) : null}

      {editing ? (
        <AreaForm
          area={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); reload(); }}
        />
      ) : null}

      {removing ? (
        <ConfirmDialog
          title="Eliminar área"
          message={`Se eliminará "${removing.name}". Si tiene plataformas asignadas, primero hay que reasignarlas.`}
          onConfirm={remove}
          onCancel={() => setRemoving(null)}
          busy={busy}
        />
      ) : null}
    </div>
  );
}
