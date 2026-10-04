import React, { useState } from 'react';
import { usePushNotifications } from '../hooks/usePushNotifications';
import {
  Bell,
  BellRing,
  BellOff,
  CheckCircle2,
  AlertTriangle,
  Send,
  Smartphone,
  ShieldCheck,
  Calendar,
  Clock,
  Package
} from 'lucide-react';

export const PushNotificationManager: React.FC = () => {
  const {
    isSupported,
    permission,
    isSubscribed,
    loading,
    error,
    subscribe,
    unsubscribe,
    sendTestNotification,
  } = usePushNotifications();

  const [testResult, setTestResult] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleToggle = async () => {
    setActionError(null);
    setTestResult(null);
    try {
      if (isSubscribed) {
        await unsubscribe();
      } else {
        await subscribe();
      }
    } catch (e: any) {
      setActionError(e.message || 'Erro ao alterar estado de notificações.');
    }
  };

  const handleTest = async () => {
    setActionError(null);
    setTestResult(null);
    try {
      const res = await sendTestNotification();
      setTestResult(res.message || 'Notificação enviada com sucesso! Verifique a tela do seu aparelho.');
      setTimeout(() => setTestResult(null), 6000);
    } catch (e: any) {
      setActionError(e.message || 'Erro ao enviar notificação de teste.');
    }
  };

  if (!isSupported) {
    return (
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600 flex items-start gap-3">
        <BellOff className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
        <div>
          <strong className="block font-bold text-slate-800">Notificações Push não suportadas:</strong>
          Seu navegador atual ou janela anônima não suporta a Web Push API. Recomendamos utilizar o Google Chrome, Edge ou Safari para receber alertas.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Status Card */}
      <div
        className={`p-5 rounded-2xl border transition-all ${
          isSubscribed
            ? 'bg-emerald-50/60 border-emerald-300 shadow-2xs'
            : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                isSubscribed
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {isSubscribed ? <BellRing className="w-6 h-6" /> : <Bell className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-bold text-slate-900">
                  Notificações Push no Aparelho
                </h4>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                    isSubscribed
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  {isSubscribed ? 'Ativo neste dispositivo' : 'Desativado'}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Receba avisos instantâneos de atendimentos agendados, medicamentos com estoque baixo e retornos de vacinas diretamente na sua tela.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
            {isSubscribed && (
              <button
                type="button"
                onClick={handleTest}
                disabled={loading}
                className="px-3 py-2 text-xs font-bold rounded-xl bg-white border border-emerald-300 hover:bg-emerald-50 text-emerald-800 shadow-2xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Testar Notificação</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleToggle}
              disabled={loading}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer shadow-xs flex items-center gap-1.5 disabled:opacity-50 ${
                isSubscribed
                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                  : 'bg-emerald-700 hover:bg-emerald-800 text-white'
              }`}
            >
              {loading ? (
                <span>Processando...</span>
              ) : isSubscribed ? (
                <>
                  <BellOff className="w-3.5 h-3.5" />
                  <span>Desativar</span>
                </>
              ) : (
                <>
                  <BellRing className="w-3.5 h-3.5" />
                  <span>Ativar Notificações</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Feedback messages */}
        {testResult && (
          <div className="mt-4 p-3 bg-emerald-100/70 border border-emerald-300 rounded-xl text-xs text-emerald-900 font-semibold flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{testResult}</span>
          </div>
        )}

        {(actionError || error) && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{actionError || error}</span>
          </div>
        )}

        {permission === 'denied' && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>Notificações bloqueadas no navegador:</strong> Você bloqueou as permissões para este site. Para ativá-las, clique no ícone de cadeado na barra de endereços do seu navegador e altere a permissão de Notificações para <em>Permitir</em>.
            </div>
          </div>
        )}
      </div>

      {/* Tipos de Alertas Enviados */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <Calendar className="w-4 h-4 text-emerald-700" />
            <span>Consultas & Cirurgias</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Lembrete 30 minutos antes do horário de cada atendimento agendado.
          </p>
        </div>

        <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <Package className="w-4 h-4 text-amber-600" />
            <span>Estoque Crítico</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Avisos de medicamentos e insumos que atingiram o limite mínimo de frascos.
          </p>
        </div>

        <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <Clock className="w-4 h-4 text-blue-600" />
            <span>Retornos & Vacinas</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Alertas sobre datas de revacinação e acompanhamento pós-operatório.
          </p>
        </div>
      </div>
    </div>
  );
};
