import Link from 'next/link';

/** 404 del frontend. Sustituye a templates/errors/404.html. */
export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center p-4">
      <div className="max-w-md text-center">
        <p className="text-5xl font-semibold tabular-nums text-muted">404</p>
        <h1 className="mt-3 text-xl font-medium">Página no encontrada</h1>
        <p className="mt-2 text-sm text-muted">
          La dirección no existe o el recurso se ha movido.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
