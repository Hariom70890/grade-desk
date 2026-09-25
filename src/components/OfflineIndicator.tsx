import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff, CheckCircle2 } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2.5 rounded-xl bg-slate-900 border border-amber-500/40 px-3.5 py-2 text-xs font-semibold text-amber-200 shadow-xl backdrop-blur-md animate-in slide-in-from-bottom-2 duration-200">
      <WifiOff className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
      <div>
        <p className="leading-tight font-bold text-white">Offline Mode Active</p>
        <p className="text-[10px] text-slate-300">GradeDesk works 100% offline. All marks are saved locally on this device.</p>
      </div>
    </div>
  );
};
