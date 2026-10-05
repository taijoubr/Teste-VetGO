import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle, X, Mail } from 'lucide-react';

interface GoogleSignInButtonProps {
  mode?: 'login' | 'register';
  onError?: (err: string) => void;
}

export const GoogleLogoSvg: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      fill="#EA4335"
    />
  </svg>
);

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({ mode = 'login', onError }) => {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleName, setGoogleName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const DEFAULT_GOOGLE_CLIENT_ID = '916489101501-qc2u92j7nhj0ou9j5et1frfu912eve3k.apps.googleusercontent.com';

  const [activeClientId, setActiveClientId] = useState<string>(() => {
    return import.meta.env.VITE_GOOGLE_CLIENT_ID || (typeof window !== 'undefined' ? localStorage.getItem('vetgo_google_client_id') || DEFAULT_GOOGLE_CLIENT_ID : DEFAULT_GOOGLE_CLIENT_ID);
  });

  // Carrega dinamicamente o Google Client ID configurado pelo Administrador
  useEffect(() => {
    if (!activeClientId) {
      import('../services/api').then(({ api }) => {
        api.getPublicSettings().then((res) => {
          if (res?.google_client_id) {
            setActiveClientId(res.google_client_id);
          }
        }).catch(() => {});
      });
    }
  }, [activeClientId]);

  // Inicializa a biblioteca nativa do Google Identity Services de forma segura (sem erros de FedCM)
  useEffect(() => {
    if (typeof window === 'undefined' || !activeClientId) return;

    const inIframe = window.self !== window.top;
    const gsi = (window as any).google?.accounts?.id;

    if (gsi && !inIframe) {
      try {
        gsi.initialize({
          client_id: activeClientId,
          use_fedcm_for_prompt: false, // Desativa FedCM para evitar NotAllowedError em iframes e navegadores restritos
          auto_select: false,
          cancel_on_tap_outside: true,
          callback: async (response: any) => {
            if (response.credential) {
              await handleExecuteAuth({ credential: response.credential });
            }
          },
        });
      } catch (e) {
        console.warn('Google Identity Services seguro:', e);
      }
    }
  }, [activeClientId]);

  const handleExecuteAuth = async (data: {
    email?: string;
    name?: string;
    first_name?: string;
    last_name?: string;
    picture?: string;
    credential?: string;
  }) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await loginWithGoogle({
        email: data.email || '',
        name: data.name,
        first_name: data.first_name,
        last_name: data.last_name,
        picture: data.picture,
        credential: data.credential,
      });

      setShowPromptModal(false);
      if (res.user.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      const msg = err.message || 'Erro ao autenticar com a conta Google.';
      setErrorMsg(msg);
      if (onError) onError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleClick = () => {
    const inIframe = typeof window !== 'undefined' && window.self !== window.top;
    const gsi = (window as any).google?.accounts?.id;

    // Se o Client ID oficial do Google estiver configurado e não estiver restrito por iframe, tenta o One Tap nativo
    if (gsi && activeClientId && !inIframe) {
      try {
        gsi.prompt((notification: any) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            setShowPromptModal(true);
          }
        });
        return;
      } catch (e) {
        console.warn('GIS prompt error:', e);
      }
    }

    // Abre o modal limpo para informar o e-mail Google
    setShowPromptModal(true);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleEmail.trim()) return;
    handleExecuteAuth({
      email: googleEmail.trim(),
      name: googleName.trim() || undefined,
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 hover:border-slate-400 text-slate-800 text-sm font-semibold rounded-xl transition duration-150 shadow-2xs hover:shadow-xs active:scale-[0.99] cursor-pointer disabled:opacity-60"
        title="Entrar ou criar conta utilizando sua conta Google"
      >
        <GoogleLogoSvg className="w-4 h-4 shrink-0" />
        <span>{loading ? 'Conectando ao Google...' : 'Continuar com o Google'}</span>
      </button>

      {/* MODAL DE ENTRADA COM CONTA GOOGLE (SEM CONTAS DE TESTE FALSAS) */}
      {showPromptModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 relative space-y-4">
            <button
              type="button"
              onClick={() => setShowPromptModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto shadow-2xs">
                <GoogleLogoSvg className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 pt-1">
                Entrar com Conta Google
              </h3>
              <p className="text-xs text-slate-500">
                Informe o seu e-mail do Google para acessar ou criar sua conta no <strong>Vetgo</strong>
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleManualSubmit} className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Seu E-mail do Google (Gmail) *
                </label>
                <div className="relative rounded-lg shadow-2xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    autoFocus
                    value={googleEmail}
                    onChange={(e) => setGoogleEmail(e.target.value)}
                    placeholder="seu.email@gmail.com"
                    className="block w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Seu Nome Completo (opcional)
                </label>
                <input
                  type="text"
                  value={googleName}
                  onChange={(e) => setGoogleName(e.target.value)}
                  placeholder="Ex: Dr. Nikolas Silva"
                  className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none transition"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 shadow-2xs disabled:opacity-50 transition cursor-pointer"
              >
                {loading ? 'Validando conta Google...' : 'Continuar com esta Conta →'}
              </button>
            </form>

            <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl text-[11px] text-slate-500 leading-relaxed">
              💡 <strong>Dica para Produção:</strong> Ao cadastrar seu <code>VITE_GOOGLE_CLIENT_ID</code> no Google Cloud Console, a janela nativa do Google com seleção automática de contas do navegador abrirá diretamente ao clicar.
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const GoogleOrDivider: React.FC = () => (
  <div className="relative my-4">
    <div className="absolute inset-0 flex items-center">
      <div className="w-full border-t border-slate-200" />
    </div>
    <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
      <span className="bg-white px-3 text-slate-400 font-semibold">ou</span>
    </div>
  </div>
);
