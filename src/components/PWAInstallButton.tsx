import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, Share, PlusSquare, Check, X } from 'lucide-react';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'header' | 'banner' | 'compact';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ 
  className = '',
  variant = 'header'
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // If already running in standalone mode on device
  if (isInstalled) {
    return (
      <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold">
        <Check className="w-3.5 h-3.5 text-emerald-400" />
        <span>Installed PWA</span>
      </div>
    );
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      setIsInstalling(true);
      try {
        await install();
      } finally {
        setIsInstalling(false);
      }
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  // Chromium / Android / Desktop flow OR iOS
  return (
    <>
      {isInstallable ? (
        <button
          onClick={handleInstallClick}
          disabled={isInstalling}
          className={`flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 px-3 py-1.5 text-xs font-black shadow-md hover:shadow-lg transition-all active:scale-95 ${className}`}
          title="Install GradeDesk on your Phone / Desktop for fast offline access"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install App</span>
        </button>
      ) : isIOS ? (
        <button
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 px-3 py-1.5 text-xs font-bold transition-all shadow-xs ${className}`}
          title="Install on iPhone / iPad"
        >
          <Smartphone className="w-3.5 h-3.5 text-amber-400" />
          <span>Install on iOS</span>
        </button>
      ) : null}

      {/* iOS Safari Installation Modal Guide */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-6 text-white shadow-2xl relative">
            <button
              onClick={() => setShowIOSGuide(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                <Smartphone className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Install GradeDesk</h3>
                <p className="text-xs text-slate-400">Add to iPhone / iPad Home Screen</p>
              </div>
            </div>

            <div className="space-y-3.5 text-xs text-slate-300 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  Tap the <span className="inline-flex items-center gap-1 font-bold text-white bg-slate-800 px-1.5 py-0.5 rounded"><Share className="w-3 h-3 text-sky-400 inline" /> Share</span> button in Safari's bottom toolbar.
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  Scroll down the menu and tap <span className="inline-flex items-center gap-1 font-bold text-white bg-slate-800 px-1.5 py-0.5 rounded"><PlusSquare className="w-3 h-3 text-amber-400 inline" /> Add to Home Screen</span>.
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  Tap <span className="font-bold text-white">Add</span> in the top right corner. GradeDesk will launch like a native app with zero browser bars!
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full rounded-xl bg-amber-500 hover:bg-amber-400 py-2.5 text-xs font-bold text-slate-950 transition-colors"
            >
              Got it, close
            </button>
          </div>
        </div>
      )}
    </>
  );
};
