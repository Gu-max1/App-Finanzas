import './globals.css';

export const metadata = {
  title: 'FinTrack Panama',
  description: 'Controla tus finanzas y quincenas 100% estilo panameño',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
