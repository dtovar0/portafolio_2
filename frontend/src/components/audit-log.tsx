'use client';

/** Registros de auditoría dentro del alcance del usuario. */

import { useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useAsync } from '@/lib/use-async';
import { Badge, Card, EmptyNote, ErrorNote, Spinner } from './ui';

const TONES: Record<string, 'slate' | 'success' | 'warning' | 'error'> = {
  success: 'success',
  error: 'error',
  warning: 'warning',
  info: 'slate',
};

export function AuditLog() {
  const [term, setTerm] = useState('');
  const { data, loading, error } = useAsync(() => api.audit(200), []);

  const rows = useMemo(() => {
    const list = data ?? [];
    const needle = term.trim().toLowerCase();
    if (!needle) return list;
    return list.filter((row) =>
      [row.user, row.action, row.module, row.target, row.detail]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(needle)),
    );
  }, [data, term]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Auditoría</h1>
        <p className="mt-1 text-sm text-label">
          Registro de acciones sobre el sistema.
        </p>
      </div>

      <input
        type="search"
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        placeholder="Filtrar por usuario, acción o módulo…"
        aria-label="Filtrar registros"
        className="w-full max-w-md rounded-lg border border-panel-border bg-panel-fill px-3 py-2 text-sm outline-none placeholder:text-label focus:border-primary"
      />

      {loading ? <Spinner /> : null}
      {error ? <ErrorNote message={error} /> : null}

      {!loading && !error ? (
        rows.length === 0 ? (
          <EmptyNote
            message={
              term
                ? 'Ningún registro coincide con el filtro.'
                : 'No hay registros dentro de tu alcance.'
            }
          />
        ) : (
          <Card className="overflow-x-auto p-0">
            <table className="w-full min-w-[52rem] text-sm">
              <thead className="border-b border-panel-border text-left text-xs uppercase tracking-wide text-label">
                <tr>
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Usuario</th>
                  <th className="px-4 py-3 font-medium">Acción</th>
                  <th className="px-4 py-3 font-medium">Módulo</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-panel-border">
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-label">
                      {row.time}
                    </td>
                    <td className="px-4 py-2.5">{row.user}</td>
                    <td className="px-4 py-2.5">
                      <span className="block max-w-md truncate" title={row.detail ?? undefined}>
                        {row.action}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-label">{row.module ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      <Badge tone={TONES[row.status] ?? 'slate'}>
                        {row.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )
      ) : null}
    </div>
  );
}
