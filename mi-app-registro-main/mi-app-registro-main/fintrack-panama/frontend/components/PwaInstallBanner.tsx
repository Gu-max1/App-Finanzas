'use client';
import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PwaInstallBanner() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in window.navigator && (window.navigator as {standalone?: boolean}).standalone === true);
    setIsStandalone(standalone);

    // iOS detection
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIos(ios);

    // Already dismissed?
    const wasDismissed = localStorage.getItem('pwa_install_dismissed');
    if (wasDismissed) setDismissed(true);

    // Android/Chrome install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') setInstallPrompt(null);
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('pwa_install_dismissed', '1');
  };

  // Don't show if: already installed, dismissed, or no prompt available
  if (isStandalone || dismissed) return null;
  if (!installPrompt && !isIos) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-sm mx-auto">
      <div className="bg-white border border-primary-200 rounded-2xl shadow-lg p-4 flex items-start gap-3">
        <div className="text-3xl">📱</div>
        <div className="flex-1">
          <p className="font-semibold text-gray-900 text-sm">Instala FinTrack Panama</p>
          {isIos ? (
            <p className="text-xs text-gray-600 mt-0.5">
              Toca <strong>Compartir</strong> y luego <strong>"Agregar a pantalla de inicio"</strong> para instalarla.
            </p>
          ) : (
            <p className="text-xs text-gray-600 mt-0.5">
              Instala la app en tu móvil para acceso rápido sin abrir el navegador.
            </p>
          )}
          {!isIos && (
            <button
              onClick={handleInstall}
              className="mt-2 btn-primary text-xs py-1.5 px-3"
            >
              Instalar app
            </button>
          )}
        </div>
        <button
          onClick={handleDismiss}
          className="text-gray-400 hover:text-gray-600 text-lg leading-none"
          aria-label="Cerrar"
        >
          ×
        </button>
      </div>
    </div>
  );
}
