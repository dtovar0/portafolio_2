import type { Metadata } from 'next';
// El orden importa: primero los tokens del portal, que definen las variables;
// después sus clases; y al final las utilidades de Tailwind, que las consumen.
import '../styles/tokens.css';
import '../styles/global.css';
import '../styles/components.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nexus',
  description: 'Catálogo centralizado de plataformas',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
