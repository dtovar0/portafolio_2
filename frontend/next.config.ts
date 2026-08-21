import type { NextConfig } from 'next';

/**
 * El backend Flask es la única fuente de datos y de sesión.
 *
 * En desarrollo, `rewrites` reenvía /api/* y /auth/* a Flask para que el
 * navegador vea un mismo origen y la cookie de sesión viaje sin CORS.
 * En producción es Nginx quien enruta, y estas reglas quedan inertes.
 */
const BACKEND = process.env.BACKEND_URL ?? 'http://127.0.0.1:5001';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${BACKEND}/api/:path*` },
      { source: '/auth/:path*', destination: `${BACKEND}/auth/:path*` },
    ];
  },
};

export default nextConfig;
