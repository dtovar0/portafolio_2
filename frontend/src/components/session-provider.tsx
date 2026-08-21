'use client';

/**
 * Sesión compartida por toda la app.
 *
 * Se pide una sola vez a /api/v1/me y de ahí sale tanto la identidad como los
 * permisos que deciden qué se muestra. Ocultar algo en la interfaz no lo
 * protege: cada endpoint vuelve a comprobar el permiso en el backend.
 */

import { createContext, useContext, useEffect, useState } from 'react';
import { ApiError, api } from '@/lib/api';
import type { Session } from '@/lib/types';

interface SessionState {
  session: Session | null;
  loading: boolean;
  error: string | null;
}

const SessionContext = createContext<SessionState>({
  session: null,
  loading: true,
  error: null,
});

/** Pantalla de acceso. Flask sigue emitiendo la sesión, pero la interfaz
 *  de login vive ya en el frontend. */
const LOGIN_URL = '/login';

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SessionState>({
    session: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let active = true;

    api.session()
      .then((session) => {
        if (active) setState({ session, loading: false, error: null });
      })
      .catch((error: unknown) => {
        if (!active) return;
        // Sin sesión válida, a la pantalla de acceso.
        if (error instanceof ApiError && error.isUnauthenticated) {
          window.location.href = LOGIN_URL;
          return;
        }
        setState({
          session: null,
          loading: false,
          error: error instanceof Error ? error.message : 'Error de sesión',
        });
      });

    return () => { active = false; };
  }, []);

  return (
    <SessionContext.Provider value={state}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
