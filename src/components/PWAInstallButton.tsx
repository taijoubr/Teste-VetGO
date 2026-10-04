import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, X, Check } from 'lucide-react';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // Se já está instalado ou rodando em modo standalone, oculta o botão
  if (isInstalled) {
    return null;
  }

  // Fluxo Chrome / Edge / Android
  if (isInstallable) {
    if (compact) {
      return (
        <button
          onClick={install}
          title="Instalar aplicativo no celular ou computador"
          className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
        >
          <Download className="w-4 h-4" />
        </button>
      );
    }

    return (
      <button
        onClick={install}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition cursor-pointer"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Instalar App</span>
      </button>
    );
  }

  // Fluxo iOS Safari (iPhone / iPad)
  if (isIOS) {
    return (
      <>
        {compact ? (
          <button
            onClick={() => setShowIOSGuide(true)}
            title="Instalar no iPhone"
            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
          >
            <Smartphone className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={() => setShowIOSGuide(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-300 hover:bg-slate-100 text-slate-700 transition cursor-pointer"
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-700" />
            <span>Instalar no iPhone</span>
          </button>
        )}

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-emerald-700" />
                  Instalar Vetgo no iPhone
                </h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="text-xs text-slate-600 space-y-3">
                <p>
                  Para ter o aplicativo com ícone próprio e notificações push no seu iPhone ou iPad:
                </p>
                <div className="p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-200">
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                      1
                    </span>
                    <span>No Safari, toque no botão <strong>Compartilhar</strong> (ícone de quadrado com seta para cima na barra inferior).</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                      2
                    </span>
                    <span>Role para baixo e selecione <strong>Adicionar à Tela de Início</strong>.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                      3
                    </span>
                    <span>Toque em <strong>Adicionar</strong> no canto superior direito.</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition"
              >
                Entendido
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
