import React, { useState, useEffect } from 'react';
import {
  Cloud,
  RefreshCw,
  Database,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Trash2,
  Copy,
  Check,
  Search,
  Download,
  UploadCloud,
  ShieldCheck,
  X,
  Clock,
  Info
} from 'lucide-react';
import {
  getFirestoreSyncLogs,
  clearFirestoreSyncLogs,
  getFirestoreSyncStats,
  firestoreSync,
  FirestoreSyncLogEntry,
} from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';

interface FirestoreSyncStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FirestoreSyncStatusModal: React.FC<FirestoreSyncStatusModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<FirestoreSyncLogEntry[]>([]);
  const [stats, setStats] = useState(getFirestoreSyncStats());
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'SUCCESS' | 'ERROR'>('ALL');
  const [filterCollection, setFilterCollection] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Load logs and subscribe to real-time events
  useEffect(() => {
    const refreshData = () => {
      setLogs(getFirestoreSyncLogs());
      setStats(getFirestoreSyncStats());
    };

    refreshData();

    const handleSyncEvent = () => {
      refreshData();
    };

    window.addEventListener('vetgo_sync_event', handleSyncEvent);
    return () => {
      window.removeEventListener('vetgo_sync_event', handleSyncEvent);
    };
  }, []);

  if (!isOpen) return null;

  const handleSyncAll = async () => {
    setIsSyncing(true);
    setActionMessage(null);
    try {
      const res = await firestoreSync.syncAllToFirestore(user?.id ? String(user.id) : undefined);
      setLogs(getFirestoreSyncLogs());
      setStats(getFirestoreSyncStats());
      if (res.success) {
        setActionMessage({
          type: 'success',
          text: `Sincronização concluída com sucesso! ${res.syncedCount} itens gravados permanentemente no Firestore.`,
        });
      } else {
        setActionMessage({
          type: 'error',
          text: `Sincronização parcial: ${res.syncedCount} itens salvos, ${res.errorsCount} falharam. Verifique os logs abaixo.`,
        });
      }
    } catch (e: any) {
      setActionMessage({
        type: 'error',
        text: `Falha ao executar sincronização: ${e.message}`,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRestore = async () => {
    if (!confirm('Deseja restaurar tutores e pacientes salvos na nuvem do Firestore? Dados locais serão mesclados.')) {
      return;
    }
    setIsRestoring(true);
    setActionMessage(null);
    try {
      const res = await firestoreSync.restoreFromFirestore(user?.id ? String(user.id) : undefined);
      setLogs(getFirestoreSyncLogs());
      setStats(getFirestoreSyncStats());
      setActionMessage({
        type: 'success',
        text: res.message,
      });
    } catch (e: any) {
      setActionMessage({
        type: 'error',
        text: `Falha na restauração: ${e.message}`,
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const handleClear = () => {
    if (confirm('Limpar histórico visual de logs de sincronização? (Os dados no banco não serão afetados)')) {
      clearFirestoreSyncLogs();
      setLogs([]);
      setStats(getFirestoreSyncStats());
      setActionMessage({ type: 'info', text: 'Histórico de logs limpo com sucesso.' });
    }
  };

  const handleCopyDiagnostics = () => {
    const diagnosticPayload = {
      timestamp: new Date().toISOString(),
      stats,
      user_id: user?.id,
      user_email: user?.email,
      logs_count: logs.length,
      recent_logs: logs.slice(0, 30),
    };
    navigator.clipboard.writeText(JSON.stringify(diagnosticPayload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    if (filterStatus !== 'ALL' && log.status !== filterStatus) return false;
    if (filterCollection !== 'ALL' && log.collection !== filterCollection) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchDoc = log.docId.toLowerCase().includes(q);
      const matchCol = log.collection.toLowerCase().includes(q);
      const matchSummary = (log.itemSummary || '').toLowerCase().includes(q);
      const matchDetails = (log.details || '').toLowerCase().includes(q);
      const matchError = (log.error || '').toLowerCase().includes(q);
      return matchDoc || matchCol || matchSummary || matchDetails || matchError;
    }
    return true;
  });

  const formatTimestamp = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex items-start justify-between bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-white/10 text-emerald-400 shrink-0">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Status de Sincronização & Logs Firestore
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Nuvem Conectada
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-xl">
                Monitore a gravação em tempo real de tutores, pacientes e dados no Firestore do Google Cloud.
                Garante que nenhum registro seja perdido entre novos commits ou deploys.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informative Banner explaining container deploys */}
        <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-200/70 text-amber-900 text-xs flex items-center gap-2">
          <Info className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Por que dados podiam sumir antes?</strong> No ambiente de nuvem efêmero (Cloud Run), arquivos locais reiniciam com novos commits. Agora, o sistema grava automaticamente no Firestore e no cofre do navegador. Use o botão <strong>Sincronizar Tudo</strong> para forçar a gravação completa na nuvem.
          </span>
        </div>

        {/* Quick Stats Grid */}
        <div className="p-4 sm:p-6 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/70 border-b border-slate-100">
          <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total de Eventos</div>
            <div className="text-2xl font-bold text-slate-800 mt-0.5">{stats.total}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Operações registradas</div>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
            <div className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Sucessos
            </div>
            <div className="text-2xl font-bold text-emerald-700 mt-0.5">{stats.successCount}</div>
            <div className="text-[10px] text-emerald-600 mt-0.5">Gravados na nuvem</div>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
            <div className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              Falhas
            </div>
            <div className="text-2xl font-bold text-rose-700 mt-0.5">{stats.errorCount}</div>
            <div className="text-[10px] text-rose-600 mt-0.5">{stats.errorCount === 0 ? 'Zero falhas' : 'Requer atenção'}</div>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Último Envio
            </div>
            <div className="text-sm font-semibold text-slate-800 mt-1 truncate">
              {stats.lastSyncTime ? formatTimestamp(stats.lastSyncTime) : 'Nenhum recente'}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Automático & Contínuo</div>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 bg-white">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleSyncAll}
              disabled={isSyncing || isRestoring}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-2xs transition disabled:opacity-50"
            >
              <UploadCloud className={`w-4 h-4 ${isSyncing ? 'animate-bounce' : ''}`} />
              <span>{isSyncing ? 'Sincronizando Nuvem...' : 'Sincronizar Tudo Agora'}</span>
            </button>

            <button
              onClick={handleRestore}
              disabled={isSyncing || isRestoring}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-900 active:bg-black text-white shadow-2xs transition disabled:opacity-50"
              title="Baixa tutores e pacientes gravados no Firestore para a sessão atual"
            >
              <Download className={`w-4 h-4 ${isRestoring ? 'animate-spin' : ''}`} />
              <span>{isRestoring ? 'Restaurando...' : 'Restaurar da Nuvem'}</span>
            </button>

            <button
              onClick={handleCopyDiagnostics}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              title="Copia relatório JSON para suporte e verificação técnica"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copiado!' : 'Copiar Diagnóstico'}</span>
            </button>
          </div>

          <button
            onClick={handleClear}
            disabled={logs.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition disabled:opacity-30"
          >
            <Trash2 className="w-4 h-4" />
            <span>Limpar Histórico</span>
          </button>
        </div>

        {/* Feedback message banner if triggered */}
        {actionMessage && (
          <div
            className={`px-4 py-2.5 text-xs font-medium flex items-center justify-between border-b ${
              actionMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : actionMessage.type === 'error'
                ? 'bg-rose-50 text-rose-800 border-rose-200'
                : 'bg-blue-50 text-blue-800 border-blue-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {actionMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
              {actionMessage.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
              {actionMessage.type === 'info' && <Info className="w-4 h-4 text-blue-600 shrink-0" />}
              <span>{actionMessage.text}</span>
            </div>
            <button
              onClick={() => setActionMessage(null)}
              className="text-slate-400 hover:text-slate-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Filters and Search Bar */}
        <div className="p-3 sm:px-6 sm:py-3 bg-slate-50/50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Status:</span>
            <div className="flex bg-slate-200/70 p-0.5 rounded-lg">
              <button
                onClick={() => setFilterStatus('ALL')}
                className={`px-2.5 py-1 rounded-md font-medium transition ${
                  filterStatus === 'ALL' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todos ({logs.length})
              </button>
              <button
                onClick={() => setFilterStatus('SUCCESS')}
                className={`px-2.5 py-1 rounded-md font-medium transition ${
                  filterStatus === 'SUCCESS' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 hover:text-emerald-700'
                }`}
              >
                Sucesso ({stats.successCount})
              </button>
              <button
                onClick={() => setFilterStatus('ERROR')}
                className={`px-2.5 py-1 rounded-md font-medium transition ${
                  filterStatus === 'ERROR' ? 'bg-rose-600 text-white shadow-2xs' : 'text-slate-600 hover:text-rose-700'
                }`}
              >
                Erros ({stats.errorCount})
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filterCollection}
              onChange={(e) => setFilterCollection(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden"
            >
              <option value="ALL">Todas as coleções</option>
              <option value="tutors">Tutores (tutors)</option>
              <option value="patients">Pacientes (patients)</option>
              <option value="users">Perfil (users)</option>
              <option value="appointments">Agenda (appointments)</option>
              <option value="all">Sincronização em Lote</option>
            </select>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por nome, id..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden w-44 sm:w-56"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Logs List Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2.5 bg-slate-50/30">
          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200/80">
              <Database className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-slate-700">Nenhum evento registrado</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {logs.length === 0
                  ? 'Os eventos de sincronização com o Firestore aparecerão aqui automaticamente quando tutores e pacientes forem criados ou editados.'
                  : 'Nenhum log corresponde aos filtros ou à busca selecionada.'}
              </p>
              {logs.length === 0 && (
                <button
                  onClick={handleSyncAll}
                  className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs inline-flex items-center gap-2"
                >
                  <UploadCloud className="w-4 h-4" />
                  Testar Gravação no Firestore
                </button>
              )}
            </div>
          ) : (
            filteredLogs.map((log) => {
              const isSuccess = log.status === 'SUCCESS';
              const isError = log.status === 'ERROR';

              return (
                <div
                  key={log.id}
                  className={`p-3.5 rounded-xl border transition bg-white shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isSuccess
                      ? 'border-slate-200 hover:border-emerald-300'
                      : isError
                      ? 'border-rose-300 bg-rose-50/20'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                        isSuccess
                          ? 'bg-emerald-50 text-emerald-600'
                          : isError
                          ? 'bg-rose-100 text-rose-600'
                          : 'bg-blue-50 text-blue-600'
                      }`}
                    >
                      {isSuccess && <CheckCircle2 className="w-4 h-4" />}
                      {isError && <AlertTriangle className="w-4 h-4" />}
                      {!isSuccess && !isError && <Info className="w-4 h-4" />}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-slate-800">
                          {log.itemSummary || `${log.collection} #${log.docId}`}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {log.collection}/{log.docId}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            log.action === 'SAVE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : log.action === 'DELETE'
                              ? 'bg-rose-100 text-rose-800'
                              : log.action === 'RESTORE'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {log.action}
                        </span>
                      </div>

                      <div className="text-xs text-slate-600 mt-1">
                        {log.details || (isSuccess ? 'Gravado no Firestore' : 'Falha na gravação')}
                      </div>

                      {log.error && (
                        <div className="mt-1.5 p-2 rounded bg-rose-50 border border-rose-200 text-[11px] font-mono text-rose-700 break-all">
                          Erro: {log.error}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center text-[11px] text-slate-400 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <span className="font-mono text-slate-600 font-medium">
                      {formatTimestamp(log.timestamp)}
                    </span>
                    {typeof log.durationMs === 'number' && (
                      <span className="text-[10px] text-slate-400">
                        {log.durationMs}ms
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:px-6 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>
              Segurança Firestore ativa • Banco: <code className="text-slate-700 font-mono">vetgo</code>
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg font-medium text-slate-700 hover:bg-slate-200 transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
