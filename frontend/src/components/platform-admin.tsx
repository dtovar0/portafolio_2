'use client';

/** Administración de plataformas: crear, editar y eliminar los enlaces. */

import { useState } from 'react';
import { api } from '@/lib/api';
import { useAsync } from '@/lib/use-async';
import type { Area, Platform, PlatformInput } from '@/lib/types';
import { Button, Checkbox, ConfirmDialog, Field, Modal, Select, TextArea, TextInput } from './form';
import { useSession } from './session-provider';
import { Badge, Card, EmptyNote, ErrorNote, Spinner } from './ui';

const EMPTY: PlatformInput = {
  name: '',
  description: '',
  direct_link: '',
  bg_color: '#6366f1',
  text_color: '#ffffff',
  status: 'Activo',
};

function PlatformForm({
  areas,
  platform,
  onClose,
  onSaved,
}: {
  areas: Area[];
  platform: Platform | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<PlatformInput>(
    platform
      ? {
          name: platform.name,
          description: platform.description,
          area_id: platform.area_id,
          direct_link: platform.direct_link ?? '',
          bg_color: platform.bg_color,
          text_color: platform.text_color,
          status: platform.status,
        }
      : { ...EMPTY, area_id: areas[0]?.id },
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof PlatformInput>(key: K, value: PlatformInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    if (!form.name?.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }
    if (!form.area_id) {
      setError('Selecciona un área.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (platform) await api.updatePlatform(platform.id, form);
      else await api.createPlatform(form);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={platform ? `Editar ${platform.name}` : 'Nueva plataforma'}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
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
          onChange={(e) => set('name', e.target.value)}
          placeholder="Nombre de la plataforma"
        />
      </Field>

      <Field label="Descripción">
        <TextArea
          rows={2}
          value={form.description ?? ''}
          onChange={(e) => set('description', e.target.value)}
        />
      </Field>

      <Field
        label="Enlace"
        hint="URL a la que lleva la tarjeta. Sin enlace, la plataforma se muestra pero no se puede abrir."
      >
        <TextInput
          type="url"
          value={form.direct_link ?? ''}
          onChange={(e) => set('direct_link', e.target.value)}
          placeholder="https://…"
        />
      </Field>

      <Field label="Área">
        <Select
          value={form.area_id ?? ''}
          onChange={(e) => set('area_id', Number(e.target.value))}
        >
          {areas.map((area) => (
            <option key={area.id} value={area.id}>
              {area.name}
            </option>
          ))}
        </Select>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Color de fondo">
          <TextInput
            type="color"
            value={form.bg_color ?? '#6366f1'}
            onChange={(e) => set('bg_color', e.target.value)}
            className="h-10 p-1"
          />
        </Field>
        <Field label="Color de texto">
          <TextInput
            type="color"
            value={form.text_color ?? '#ffffff'}
            onChange={(e) => set('text_color', e.target.value)}
            className="h-10 p-1"
          />
        </Field>
      </div>

      <Checkbox
        label="Activa"
        checked={form.status === 'Activo'}
        onChange={(e) => set('status', e.target.checked ? 'Activo' : 'Inactivo')}
      />
    </Modal>
  );
}

export function PlatformAdmin() {
  const { session } = useSession();
  const areas = useAsync(() => api.areas(), []);
  const platforms = useAsync(() => api.platforms(), []);
  const [editing, setEditing] = useState<Platform | null>(null);
  const [creating, setCreating] = useState(false);
  const [removing, setRemoving] = useState<Platform | null>(null);
  const [busy, setBusy] = useState(false);

  const canManage =
    session?.permissions.is_admin || session?.permissions.is_area_admin;

  async function remove() {
    if (!removing) return;
    setBusy(true);
    try {
      await api.deletePlatform(removing.id);
      setRemoving(null);
      platforms.reload();
    } finally {
      setBusy(false);
    }
  }

  const missingLink = (platforms.data ?? []).filter((p) => !p.direct_link);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Administrar plataformas</h1>
          <p className="mt-1 text-sm text-muted">
            Los enlaces del catálogo y a qué área pertenecen.
          </p>
        </div>
        {canManage ? (
          <Button onClick={() => setCreating(true)}>Nueva plataforma</Button>
        ) : null}
      </div>

      {missingLink.length > 0 ? (
        <Card className="border-amber-500/40 bg-amber-500/10">
          <p className="text-sm">
            <strong>{missingLink.length}</strong>{' '}
            {missingLink.length === 1 ? 'plataforma no tiene' : 'plataformas no tienen'}{' '}
            enlace configurado, así que no se pueden abrir desde el catálogo.
          </p>
        </Card>
      ) : null}

      {platforms.loading || areas.loading ? <Spinner /> : null}
      {platforms.error ? <ErrorNote message={platforms.error} /> : null}

      {!platforms.loading && !platforms.error ? (
        (platforms.data ?? []).length === 0 ? (
          <EmptyNote message="No hay plataformas en tu alcance." />
        ) : (
          <Card className="overflow-x-auto p-0">
            <table className="w-full min-w-[44rem] text-sm">
              <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Plataforma</th>
                  <th className="px-4 py-3 font-medium">Área</th>
                  <th className="px-4 py-3 font-medium">Enlace</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(platforms.data ?? []).map((platform) => (
                  <tr key={platform.id}>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="grid h-7 w-7 shrink-0 place-items-center rounded text-[10px] font-semibold"
                          style={{
                            background: platform.bg_color,
                            color: platform.text_color,
                          }}
                          aria-hidden
                        >
                          {platform.name.slice(0, 2).toUpperCase()}
                        </span>
                        <span className="truncate font-medium">{platform.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-muted">
                      {platform.area_name ?? '—'}
                    </td>
                    <td className="max-w-xs px-4 py-2.5">
                      {platform.direct_link ? (
                        <span className="block truncate text-muted" title={platform.direct_link}>
                          {platform.direct_link}
                        </span>
                      ) : (
                        <Badge tone="warning">Sin enlace</Badge>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge tone={platform.status === 'Activo' ? 'success' : 'warning'}>
                        {platform.status}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right">
                      {canManage ? (
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setEditing(platform)}
                            className="rounded px-2 py-1 text-xs text-accent hover:bg-accent/10"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => setRemoving(platform)}
                            className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-500/10 dark:text-red-300"
                          >
                            Eliminar
                          </button>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )
      ) : null}

      {creating ? (
        <PlatformForm
          areas={areas.data ?? []}
          platform={null}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            platforms.reload();
          }}
        />
      ) : null}

      {editing ? (
        <PlatformForm
          areas={areas.data ?? []}
          platform={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            platforms.reload();
          }}
        />
      ) : null}

      {removing ? (
        <ConfirmDialog
          title="Eliminar plataforma"
          message={`Se eliminará "${removing.name}". Esta acción no se puede deshacer.`}
          onConfirm={remove}
          onCancel={() => setRemoving(null)}
          busy={busy}
        />
      ) : null}
    </div>
  );
}
