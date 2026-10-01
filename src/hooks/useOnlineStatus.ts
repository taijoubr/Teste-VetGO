import { useState, useEffect, useCallback } from 'react';
import { offlineStorage } from '../services/offlineStorage';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export function useOnlineStatus() {
  const { user } = useAuth();
  const userId = user?.id || 0;

  const [isOnline, setIsOnline] = useState(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });

  const [pendingCount, setPendingCount] = useState(() => {
    return userId ? offlineStorage.getPendingMutations(userId).length : 0;
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Atualiza contador de pendências
  const updatePendingCount = useCallback(() => {
    if (userId) {
      setPendingCount(offlineStorage.getPendingMutations(userId).length);
    }
  }, [userId]);

  // Função para executar a sincronização agora
  const syncNow = useCallback(async () => {
    if (!userId || !navigator.onLine || isSyncing) return;

    const token = api.getToken();
    if (!token) return;

    setIsSyncing(true);
    setSyncFeedback(null);

    try {
      const result = await offlineStorage.syncAllPending(userId, token);
      updatePendingCount();

      if (result.syncedCount > 0) {
        setSyncFeedback(`Sincronização concluída: ${result.syncedCount} item(ns) salvos na nuvem!`);
        setTimeout(() => setSyncFeedback(null), 5000);
      }
    } catch (e) {
      console.warn('Falha durante sincronização automática:', e);
    } finally {
      setIsSyncing(false);
    }
  }, [userId, isSyncing, updatePendingCount]);

  useEffect(() => {
    updatePendingCount();

    const handleOnline = () => {
      setIsOnline(true);
      // Ao voltar a conexão, sincroniza automaticamente
      syncNow();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    const handleQueueChange = () => {
      updatePendingCount();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('vetgo_offline_queue_changed', handleQueueChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('vetgo_offline_queue_changed', handleQueueChange);
    };
  }, [updatePendingCount, syncNow]);

  return {
    isOnline,
    pendingCount,
    isSyncing,
    syncFeedback,
    syncNow,
  };
}
