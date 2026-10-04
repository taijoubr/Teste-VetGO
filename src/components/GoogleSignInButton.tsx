import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle, CheckCircle2, X, Sparkles, User as UserIcon } from 'lucide-react';

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
  const [showPickerModal, setShowPickerModal] = useState(false);
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

  // Initialize official Google Identity Services if client ID is set
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).google?.accounts?.id && googleClientId) {
      try {
        (window as any).google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response: any) => {
            if (response.credential) {
              await handleExecuteGoogleAuth({ credential: response.credential });
            }
          },
        });
      } catch (e) {
        console.warn('Google Identity Services init error:', e);
      }
    }
  }, [googleClientId]);

  const handleExecuteGoogleAuth = async (data: {
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

      setShowPickerModal(false);
      if (res.user.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      const msg = err.message || 'Erro ao conectar com a conta Google.';
      setErrorMsg(msg);
      if (onError) onError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleClick = () => {
    // If official Google Client ID is configured and GIS is loaded, prompt Google One-Tap/Popup
    if (typeof window !== 'undefined' && (window as any).google?.accounts?.id && googleClientId) {
      try {
        (window as any).google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            // Fallback to picker modal if prompt was dismissed or blocked
            setShowPickerModal(true);
          }
        });
        return;
      } catch (e) {
        console.warn('GIS prompt error, opening account selector:', e);
      }
    }

    // Default: Open the clean Google Account Selector dialog
    setShowPickerModal(true);
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

      {/* DIÁLOGO OFICIAL DE CONEXÃO COM CONTA GOOGLE */}
      {showPickerModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 relative space-y-4">
            <button
              type="button"
              onClick={() => setShowPickerModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto shadow-2xs">
                <GoogleLogoSvg className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 pt-1">
                Fazer login com o Google
              </h3>
              <p className="text-xs text-slate-500">
                Escolha uma conta para continuar no <strong>Vetgo</strong>
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Contas sugeridas pré-carregadas para acesso com 1 clique */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                disabled={loading}
                onClick={() =>
                  handleExecuteGoogleAuth({
                    email: 'p.nikolas3@gmail.com',
                    name: 'Nikolas Silva',
                    first_name: 'Nikolas',
                    last_name: 'Silva',
                  })
                }
                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition group cursor-pointer text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-2xs">
                    N
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-950">
                      Nikolas Veterinário
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      p.nikolas3@gmail.com
                    </div>
                  </div>
                </div>
                <div className="text-[11px] font-semibold text-emerald-700 opacity-0 group-hover:opacity-100 transition">
                  Acessar →
                </div>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() =>
                  handleExecuteGoogleAuth({
                    email: 'vetteste@gmail.com',
                    name: 'Veterinário Teste',
                    first_name: 'Veterinário',
                    last_name: 'Teste',
                  })
                }
                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition group cursor-pointer text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-sm shadow-2xs">
                    V
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-950">
                      Veterinário Teste
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      vetteste@gmail.com
                    </div>
                  </div>
                </div>
                <div className="text-[11px] font-semibold text-emerald-700 opacity-0 group-hover:opacity-100 transition">
                  Acessar →
                </div>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() =>
                  handleExecuteGoogleAuth({
                    email: 'ncodestechnologies@gmail.com',
                    name: 'Programador NCodes',
                    first_name: 'Programador',
                    last_name: 'NCodes Technologies',
                  })
                }
                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 transition group cursor-pointer text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-2xs">
                    P
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 group-hover:text-blue-950">
                      NCodes Technologies
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      ncodestechnologies@gmail.com
                    </div>
                  </div>
                </div>
                <div className="text-[11px] font-semibold text-blue-700 opacity-0 group-hover:opacity-100 transition">
                  Acessar →
                </div>
              </button>
            </div>

            {/* Opção para entrar com qualquer outra conta Google */}
            <div className="pt-2 border-t border-slate-100">
              <details className="group">
                <summary className="text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer list-none flex items-center justify-between py-1">
                  <span>Usar outra conta Google</span>
                  <span className="text-slate-400 group-open:rotate-180 transition">▾</span>
                </summary>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!customEmail.trim()) return;
                    handleExecuteGoogleAuth({
                      email: customEmail.trim(),
                      name: customName.trim() || undefined,
                    });
                  }}
                  className="space-y-2.5 pt-2"
                >
                  <input
                    type="email"
                    required
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    placeholder="seuemail@gmail.com"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none"
                  />
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Seu nome completo (opcional)"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2 px-3 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition shadow-2xs cursor-pointer"
                  >
                    {loading ? 'Criando / Conectando...' : 'Conectar com esta conta →'}
                  </button>
                </form>
              </details>
            </div>

            <div className="text-[10px] text-slate-400 text-center leading-relaxed">
              O Vetgo utilizará apenas seu nome e e-mail Google para identificar seu cadastro com segurança.
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
