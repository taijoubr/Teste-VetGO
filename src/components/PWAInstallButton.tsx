import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import {
  Download,
  Smartphone,
  X,
  CheckCircle2,
  Share2,
  PlusSquare,
  MoreVertical,
  Laptop,
  Sparkles,
  Zap,
  Bell,
  WifiOff
} from 'lucide-react';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<'android' | 'ios' | 'desktop'>(isIOS ? 'ios' : 'android');
  const [installSuccess, setInstallSuccess] = useState(false);

  if (!isOpen) return null;

  const handleDirectInstall = async () => {
    const success = await install();
    if (success) {
      setInstallSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-br from-emerald-800 to-emerald-950 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-emerald-200 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-2 flex items-center justify-center shrink-0">
              <img src="/logo.png" alt="Vetgo Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold tracking-tight">Instalar Vetgo no Celular</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
                  PWA App
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 mt-0.5">
                Tenha o sistema na tela inicial do seu aparelho com abertura instantânea
              </p>
            </div>
          </div>

          {/* Quick Benefits Pills */}
          <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-white/10 text-[11px]">
            <div className="flex items-center gap-1.5 text-emerald-100">
              <Zap className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span>Sem barra do navegador</span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-100">
              <Bell className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
              <span>Notificações push</span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-100">
              <WifiOff className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
              <span>Acesso rápido volante</span>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-slate-700 flex-1">
          {installSuccess ? (
            <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-emerald-900">Aplicativo Instalado com Sucesso!</h4>
              <p className="text-xs text-emerald-700">
                O ícone do Vetgo já está disponível na tela inicial do seu dispositivo.
              </p>
            </div>
          ) : (
            <>
              {/* Direct 1-Click Install Button when browser supports it */}
              {isInstallable && (
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-5 h-5 text-emerald-700 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-emerald-950">Seu navegador suporta instalação direta!</h4>
                      <p className="text-[11px] text-emerald-800">Basta 1 clique para fixar o aplicativo.</p>
                    </div>
                  </div>
                  <button
                    onClick={handleDirectInstall}
                    className="w-full sm:w-auto px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
                  >
                    <Download className="w-4 h-4" />
                    <span>Instalar Agora</span>
                  </button>
                </div>
              )}

              {/* Device Selector Tabs */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Escolha o seu aparelho para ver o passo a passo:
                </label>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl">
                  <button
                    onClick={() => setActiveTab('android')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      activeTab === 'android'
                        ? 'bg-white text-emerald-800 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>🤖 Android</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('ios')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      activeTab === 'ios'
                        ? 'bg-white text-emerald-800 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>🍎 iPhone / iPad</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('desktop')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      activeTab === 'desktop'
                        ? 'bg-white text-emerald-800 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>💻 Computador</span>
                  </button>
                </div>
              </div>

              {/* Instructions: Android */}
              {activeTab === 'android' && (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                        1
                      </span>
                      <div className="text-xs">
                        <strong className="text-slate-900">Abra o Vetgo no Google Chrome</strong>
                        <p className="text-slate-500 mt-0.5">Acesse o link do sistema pelo navegador do seu celular Android.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                        2
                      </span>
                      <div className="text-xs">
                        <strong className="text-slate-900 flex items-center gap-1.5">
                          Toque nos 3 pontinhos
                          <span className="inline-flex p-0.5 bg-slate-200 text-slate-700 rounded text-[10px]">
                            <MoreVertical className="w-3 h-3" />
                          </span>
                        </strong>
                        <p className="text-slate-500 mt-0.5">Fica no canto superior direito do navegador Chrome.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                        3
                      </span>
                      <div className="text-xs">
                        <strong className="text-slate-900">
                          Selecione "Instalar aplicativo" ou "Adicionar à tela inicial"
                        </strong>
                        <p className="text-slate-500 mt-0.5">
                          Em seguida, confirme em <strong>"Instalar"</strong> no pop-up do Android.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-50/70 border border-emerald-200/60 rounded-xl text-[11px] text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Pronto! O ícone do Vetgo aparecerá na tela do seu aparelho como um app nativo.</span>
                  </div>
                </div>
              )}

              {/* Instructions: iPhone / iPad */}
              {activeTab === 'ios' && (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                        1
                      </span>
                      <div className="text-xs">
                        <strong className="text-slate-900">Abra no navegador Safari</strong>
                        <p className="text-slate-500 mt-0.5">
                          A Apple exige o Safari para instalar aplicativos na tela inicial.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                        2
                      </span>
                      <div className="text-xs">
                        <strong className="text-slate-900 flex items-center gap-1.5">
                          Toque no botão Compartilhar
                          <span className="inline-flex p-1 bg-slate-200 text-slate-800 rounded text-[10px]">
                            <Share2 className="w-3 h-3" />
                          </span>
                        </strong>
                        <p className="text-slate-500 mt-0.5">
                          É o ícone de um quadrado com a seta para cima, na barra inferior do Safari.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                        3
                      </span>
                      <div className="text-xs">
                        <strong className="text-slate-900 flex items-center gap-1.5">
                          Selecione "Adicionar à Tela de Início"
                          <span className="inline-flex p-1 bg-slate-200 text-slate-800 rounded text-[10px]">
                            <PlusSquare className="w-3 h-3" />
                          </span>
                        </strong>
                        <p className="text-slate-500 mt-0.5">Role um pouco a lista de ações até encontrar essa opção.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                        4
                      </span>
                      <div className="text-xs">
                        <strong className="text-slate-900">Toque em "Adicionar"</strong>
                        <p className="text-slate-500 mt-0.5">No canto superior direito da tela do iPhone.</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-50/70 border border-emerald-200/60 rounded-xl text-[11px] text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>O Vetgo abrirá em tela cheia sem barras e com notificações habilitadas no iOS!</span>
                  </div>
                </div>
              )}

              {/* Instructions: Desktop */}
              {activeTab === 'desktop' && (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                        1
                      </span>
                      <div className="text-xs">
                        <strong className="text-slate-900">No Google Chrome, Edge ou Brave</strong>
                        <p className="text-slate-500 mt-0.5">Observe a barra de endereços no topo da tela.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                        2
                      </span>
                      <div className="text-xs">
                        <strong className="text-slate-900 flex items-center gap-1.5">
                          Clique no ícone de Instalar
                          <span className="inline-flex p-1 bg-slate-200 text-slate-800 rounded text-[10px]">
                            <Download className="w-3 h-3" />
                          </span>
                        </strong>
                        <p className="text-slate-500 mt-0.5">Fica ao lado do botão de favoritos (estrela) na barra de URL.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                        3
                      </span>
                      <div className="text-xs">
                        <strong className="text-slate-900">Clique em "Instalar"</strong>
                        <p className="text-slate-500 mt-0.5">O Vetgo se tornará uma janela própria na sua barra de tarefas.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);

  const handleClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (!accepted) {
        setShowModal(true);
      }
    } else {
      setShowModal(true);
    }
  };

  // Se já está instalado, podemos exibir um ícone informativo no header ou null
  if (isInstalled) {
    if (compact) {
      return (
        <span title="Vetgo instalado como aplicativo" className="p-1.5 text-emerald-600 rounded-lg">
          <CheckCircle2 className="w-4 h-4" />
        </span>
      );
    }
    return null;
  }

  return (
    <>
      {compact ? (
        <button
          onClick={handleClick}
          title="Instalar Vetgo no celular ou computador"
          className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition cursor-pointer flex items-center gap-1"
        >
          <Smartphone className="w-4 h-4 text-emerald-700" />
        </button>
      ) : (
        <button
          onClick={handleClick}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition cursor-pointer"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Instalar no Celular</span>
        </button>
      )}

      <PWAInstallModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
};

export const PWAInstallSidebarCard: React.FC = () => {
  const { isInstalled, isInstallable, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);

  if (isInstalled) return null;

  const handleClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (!accepted) {
        setShowModal(true);
      }
    } else {
      setShowModal(true);
    }
  };

  return (
    <>
      <div className="p-3 bg-gradient-to-br from-emerald-50 to-emerald-100/60 rounded-2xl border border-emerald-200/80 shadow-2xs space-y-2.5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-700 text-white rounded-xl shadow-xs shrink-0">
            <Smartphone className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-bold text-emerald-950 truncate">Instalar no Celular</h4>
            <p className="text-[10px] text-emerald-700 leading-tight">Salvar na tela como um aplicativo</p>
          </div>
        </div>

        <button
          onClick={handleClick}
          className="w-full py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{isInstallable ? 'Instalar Agora' : 'Como Instalar'}</span>
        </button>
      </div>

      <PWAInstallModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
};
