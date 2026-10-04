import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff, RefreshCw, CheckCircle2, CloudUpload } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const { isOnline, pendingCount, isSyncing, syncFeedback, syncNow } = useOnlineStatus();

  // Se estiver online, sem pendências e sem mensagem de feedback, não exibe nada
  if (isOnline && pendingCount === 0 && !syncFeedback && !isSyncing) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 z-50 max-w-md animate-fade-in">
      {/* Toast de sucesso de sincronização */}
      {syncFeedback && (
        <div className="mb-2 p-3 bg-emerald-800 text-white rounded-xl shadow-lg border border-emerald-600 text-xs font-semibold flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
          <span>{syncFeedback}</span>
        </div>
      )}

      {/* Barra de Status Offline ou Sincronização Pendente */}
      <div
        className={`p-3.5 rounded-2xl shadow-xl border flex items-center justify-between gap-3 text-xs ${
          !isOnline
            ? 'bg-amber-900 text-amber-50 border-amber-700'
            : isSyncing
            ? 'bg-emerald-900 text-emerald-50 border-emerald-700'
            : 'bg-slate-900 text-slate-100 border-slate-700'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {!isOnline ? (
            <div className="w-7 h-7 rounded-lg bg-amber-800 flex items-center justify-center shrink-0 text-amber-300">
              <WifiOff className="w-4 h-4" />
            </div>
          ) : isSyncing ? (
            <div className="w-7 h-7 rounded-lg bg-emerald-800 flex items-center justify-center shrink-0 text-emerald-300">
              <RefreshCw className="w-4 h-4 animate-spin" />
            </div>
          ) : (
            <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 text-amber-400">
              <CloudUpload className="w-4 h-4" />
            </div>
          )}

          <div className="min-w-0">
            <div className="font-bold truncate">
              {!isOnline
                ? 'Modo Offline Ativado'
                : isSyncing
                ? 'Sincronizando com a Nuvem...'
                : 'Alterações Salvas Localmente'}
            </div>
            <p className="text-[11px] opacity-80 truncate">
              {!isOnline
                ? 'Seus dados estão gravados com segurança no aparelho.'
                : `${pendingCount} item(ns) aguardando sincronização.`}
            </p>
          </div>
        </div>

        {isOnline && pendingCount > 0 && !isSyncing && (
          <button
            onClick={syncNow}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-[11px] transition shadow-xs shrink-0 cursor-pointer flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Sincronizar</span>
          </button>
        )}
      </div>
    </div>
  );
};
