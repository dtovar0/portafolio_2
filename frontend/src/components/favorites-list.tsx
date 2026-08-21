'use client';

/** Plataformas marcadas como favoritas. */

import { api } from '@/lib/api';
import { useAsync } from '@/lib/use-async';
import { PlatformCard } from './platform-card';
import { EmptyNote, ErrorNote, Spinner } from './ui';

export function FavoritesList() {
  const { data, loading, error, reload } = useAsync(() => api.favorites(), []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Favoritos</h1>
        <p className="mt-1 text-sm text-muted">
          Tus accesos marcados para consulta rápida.
        </p>
      </div>

      {loading ? <Spinner /> : null}
      {error ? <ErrorNote message={error} /> : null}

      {!loading && !error ? (
        (data ?? []).length === 0 ? (
          <EmptyNote message="Todavía no has marcado ninguna plataforma como favorita." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {(data ?? []).map((platform) => (
              <PlatformCard
                key={platform.id}
                platform={{ ...platform, is_favorite: true }}
                // Al desmarcar, recargar para que salga de la lista.
                onFavoriteChange={(_, isFavorite) => {
                  if (!isFavorite) reload();
                }}
              />
            ))}
          </div>
        )
      ) : null}
    </div>
  );
}
