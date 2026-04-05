'use client';

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-4">📡</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Sin conexión</h1>
        <p className="text-gray-600 mb-6">
          No hay conexión a internet. Verifica tu red e intenta de nuevo.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="btn-primary"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
