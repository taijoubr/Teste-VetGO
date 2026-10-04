// Vetgo Offline Storage & Synchronization Manager
// Isolamento multi-tenant estrito: cada chave é prefixada com o ID exclusivo do médico-veterinário logado.

export interface PendingMutation {
  id: string;
  userId: number;
  url: string;
  method: string;
  body?: any;
  description: string;
  createdAt: string;
}

const SYNC_QUEUE_KEY = 'vetgo_sync_queue_';
const CACHE_PREFIX = 'vetgo_cache_u';

export const offlineStorage = {
  // Salva no cache local do usuário logado
  saveData<T>(userId: number, key: string, data: T): void {
    if (!userId) return;
    try {
      const storageKey = `${CACHE_PREFIX}${userId}_${key}`;
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          data,
          updatedAt: new Date().toISOString(),
        })
      );
    } catch (e) {
      console.warn('Erro ao salvar no cache offline local:', e);
    }
  },

  // Lê do cache local isolado do usuário
  getData<T>(userId: number, key: string): T | null {
    if (!userId) return null;
    try {
      const storageKey = `${CACHE_PREFIX}${userId}_${key}`;
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed.data as T;
    } catch {
      return null;
    }
  },

  // Adiciona uma operação pendente à fila de sincronização offline
  queueMutation(
    userId: number,
    mutation: { url: string; method: string; body?: any; description: string }
  ): PendingMutation {
    const queue = this.getPendingMutations(userId);
    const newMutation: PendingMutation = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      userId,
      url: mutation.url,
      method: mutation.method,
      body: mutation.body,
      description: mutation.description,
      createdAt: new Date().toISOString(),
    };

    queue.push(newMutation);
    try {
      localStorage.setItem(`${SYNC_QUEUE_KEY}${userId}`, JSON.stringify(queue));
      window.dispatchEvent(new CustomEvent('vetgo_offline_queue_changed', { detail: { count: queue.length } }));
    } catch (e) {
      console.warn('Erro ao enfileirar mutação offline:', e);
    }
    return newMutation;
  },

  // Obtém lista de operações pendentes do usuário
  getPendingMutations(userId: number): PendingMutation[] {
    if (!userId) return [];
    try {
      const raw = localStorage.getItem(`${SYNC_QUEUE_KEY}${userId}`);
      if (!raw) return [];
      return JSON.parse(raw) as PendingMutation[];
    } catch {
      return [];
    }
  },

  // Remove uma mutação da fila após ser sincronizada
  removeMutation(userId: number, mutationId: string): void {
    const queue = this.getPendingMutations(userId).filter((m) => m.id !== mutationId);
    try {
      localStorage.setItem(`${SYNC_QUEUE_KEY}${userId}`, JSON.stringify(queue));
      window.dispatchEvent(new CustomEvent('vetgo_offline_queue_changed', { detail: { count: queue.length } }));
    } catch {}
  },

  // Sincroniza todas as alterações pendentes com o servidor quando a conexão voltar
  async syncAllPending(
    userId: number,
    token: string
  ): Promise<{ syncedCount: number; failedCount: number; errors: string[] }> {
    const queue = this.getPendingMutations(userId);
    if (queue.length === 0) {
      return { syncedCount: 0, failedCount: 0, errors: [] };
    }

    let syncedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const item of [...queue]) {
      try {
        const response = await fetch(item.url, {
          method: item.method,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: item.body ? JSON.stringify(item.body) : undefined,
        });

        if (response.ok) {
          this.removeMutation(userId, item.id);
          syncedCount++;
        } else {
          failedCount++;
          errors.push(`Falha ao sincronizar: ${item.description}`);
        }
      } catch (err: any) {
        failedCount++;
        errors.push(`Erro de rede ao sincronizar: ${item.description}`);
        break; // Se a rede cair novamente, interrompe a fila para tentar mais tarde
      }
    }

    return { syncedCount, failedCount, errors };
  },

  // Limpeza de segurança (ao fazer logout, remove todos os dados locais do usuário)
  clearUserData(userId?: number): void {
    try {
      if (userId) {
        localStorage.removeItem(`${SYNC_QUEUE_KEY}${userId}`);
        const prefix = `${CACHE_PREFIX}${userId}_`;
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key && (key.startsWith(prefix) || key.startsWith(`${SYNC_QUEUE_KEY}${userId}`))) {
            localStorage.removeItem(key);
          }
        }
      } else {
        // Remove qualquer chave do Vetgo se não souber o ID
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('vetgo_cache_') || key.startsWith(SYNC_QUEUE_KEY))) {
            localStorage.removeItem(key);
          }
        }
      }
    } catch (e) {
      console.warn('Erro ao limpar dados locais no logout:', e);
    }
  },
};
