import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Check if already dismissed recently
    const dismissedAt = localStorage.getItem('sah-install-dismissed');
    if (dismissedAt) {
      const elapsed = Date.now() - Number(dismissedAt);
      // Don't show again for 7 days after dismissal
      if (elapsed < 7 * 24 * 60 * 60 * 1000) {
        setDismissed(true);
        return;
      }
    }

    // Check if already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Listen for successful install
    window.addEventListener('appinstalled', () => {
      setInstalled(true);
      setDeferredPrompt(null);
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('sah-install-dismissed', String(Date.now()));
  };

  // Don't render if already installed, dismissed, or no prompt available
  if (installed || dismissed || !deferredPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-sm z-40 animate-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 flex items-start gap-4">
        <div className="size-10 shrink-0 bg-brand-accent/10 rounded-xl flex items-center justify-center text-lg">
          📲
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-800 mb-0.5">Install SAH Command</p>
          <p className="text-xs text-slate-500 leading-relaxed">
            Add to your home screen for instant access — works offline too!
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleInstall}
              className="px-4 py-1.5 bg-brand-accent text-white text-xs font-bold rounded-lg hover:bg-brand-accent/90 transition-colors shadow-sm"
            >
              Install
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 text-slate-400 text-xs font-medium hover:text-slate-600 transition-colors"
            >
              Not now
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-slate-300 hover:text-slate-500 transition-colors p-1 shrink-0"
          aria-label="Dismiss"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
}
