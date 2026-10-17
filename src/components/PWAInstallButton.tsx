import React, { useState, useEffect } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import {
  Download,
  Smartphone,
  X,
  CheckCircle2,
  Share2,
  PlusSquare,
  Sparkles,
  Zap,
  Bell,
  WifiOff
} from 'lucide-react';

interface PWAInstallPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Modal direto para quando o navegador exige confirmação (especialmente iOS)
 */
export const PWAInstallPromptModal: React.FC<PWAInstallPromptModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isIOS, install } = usePWAInstall();
  const [installed, setInstalled] = useState(false);

  if (!isOpen) return null;

  const handleInstall = async () => {
    const success = await install();
    if (success) {
      setInstalled(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-sm rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 bg-gradient-to-br from-emerald-800 to-emerald-950 text-white relative">
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
              <h3 className="text-base font-extrabold tracking-tight">Instalar App Vetgo</h3>
              <p className="text-xs text-emerald-100/90 mt-0.5">
                Adicione o aplicativo à sua tela inicial
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-slate-700">
          {installed ? (
            <div className="py-4 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-emerald-950">Aplicativo Instalado!</h4>
              <p className="text-xs text-emerald-700">
                O ícone já está disponível na sua tela de início.
              </p>
            </div>
          ) : isInstallable ? (
            <div className="space-y-3">
              <p className="text-xs text-slate-600">
                Clique no botão abaixo para fixar o Vetgo automaticamente na tela do seu aparelho com abertura em tela cheia e notificações.
              </p>
              <button
                onClick={handleInstall}
                className="w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Instalar Agora</span>
              </button>
            </div>
          ) : isIOS ? (
            <div className="space-y-3">
              <p className="text-xs text-slate-600">
                No iPhone, o iOS solicita 2 toques rápidos para fixar o app:
              </p>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-700 text-white text-[10px] font-bold flex items-center justify-center shrink-0">1</span>
                  <span>Toque no botão <strong>Compartilhar</strong> <Share2 className="w-3.5 h-3.5 inline text-slate-700 ml-1" /> na barra inferior</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-700 text-white text-[10px] font-bold flex items-center justify-center shrink-0">2</span>
                  <span>Selecione <strong>Adicionar à Tela de Início</strong> <PlusSquare className="w-3.5 h-3.5 inline text-slate-700 ml-1" /></span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-slate-600">
                Para fixar o Vetgo na tela, use o menu do seu navegador e clique em <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Botão de Instalação Direta 1-Click
 */
export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [showPrompt, setShowPrompt] = useState(false);

  const handleClick = async () => {
    if (isInstallable) {
      const ok = await install();
      if (!ok) {
        setShowPrompt(true);
      }
      return;
    }
    setShowPrompt(true);
  };

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
          <Download className="w-3.5 h-3.5" />
          <span>Instalar Aplicativo</span>
        </button>
      )}

      <PWAInstallPromptModal isOpen={showPrompt} onClose={() => setShowPrompt(false)} />
    </>
  );
};

/**
 * Card Direto de Instalação no Menu Lateral (sem tutoriais)
 */
export const PWAInstallSidebarCard: React.FC = () => {
  const { isInstalled, isInstallable, install } = usePWAInstall();
  const [showPrompt, setShowPrompt] = useState(false);

  if (isInstalled) return null;

  const handleClick = async () => {
    if (isInstallable) {
      const ok = await install();
      if (!ok) {
        setShowPrompt(true);
      }
      return;
    }
    setShowPrompt(true);
  };

  return (
    <>
      <div className="p-3 bg-emerald-50/80 rounded-2xl border border-emerald-200/80 shadow-2xs space-y-2">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-emerald-700 text-white rounded-lg shadow-xs shrink-0">
            <Smartphone className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-bold text-emerald-950 truncate">App Vetgo</h4>
            <p className="text-[10px] text-emerald-700 leading-tight">Instalar na tela inicial</p>
          </div>
        </div>

        <button
          onClick={handleClick}
          className="w-full py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Instalar Aplicativo</span>
        </button>
      </div>

      <PWAInstallPromptModal isOpen={showPrompt} onClose={() => setShowPrompt(false)} />
    </>
  );
};
