import React, { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Lock, Mail, ArrowRight, CheckCircle2, Shield, KeyRound, Copy } from 'lucide-react';
import { AppLogo } from '../components/AppLogo';
import { Footer } from '../components/Footer';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, isAdmin } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (isAuthenticated) {
    return <Navigate to={isAdmin ? '/admin' : '/'} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const user = await login(email, password);
      if (user.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'E-mail ou senha incorretos.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (type: 'VET' | 'ADMIN') => {
    setError(null);
    setLoading(true);
    try {
      let targetEmail = '';
      let targetPass = '';
      if (type === 'VET') {
        targetEmail = 'vetteste@gmail.com';
        targetPass = 'Nikolas13';
      } else {
        targetEmail = 'ncodestechnologies@gmail.com';
        targetPass = 'Taijou13!';
      }

      setEmail(targetEmail);
      setPassword(targetPass);
      const user = await login(targetEmail, targetPass);
      if (user.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao efetuar login.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillOnly = (type: 'VET' | 'ADMIN') => {
    if (type === 'VET') {
      setEmail('vetteste@gmail.com');
      setPassword('Nikolas13');
    } else {
      setEmail('ncodestechnologies@gmail.com');
      setPassword('Taijou13!');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <div className="flex-1 flex flex-col justify-center py-6 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center flex flex-col items-center">
          <div className="mb-1 sm:mb-2">
            <AppLogo size="lg" />
          </div>
          <p className="text-xs text-slate-500 font-medium max-w-xs sm:max-w-sm">
            Plataforma de gestão para médicos-veterinários autônomos e atendimentos volantes
          </p>
        </div>

        <div className="mt-4 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-5 px-5 sm:py-6 sm:px-8 shadow-xs border border-slate-200/80 rounded-2xl">
            {error && (
              <div className="mb-4 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                {error}
              </div>
            )}

            <form className="space-y-3.5" onSubmit={handleSubmit}>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  E-mail profissional
                </label>
                <div className="relative rounded-lg shadow-2xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@exemplo.com"
                    className="block w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Senha de acesso
                  </label>
                  <a href="#recuperar" className="text-[11px] text-emerald-700 hover:underline">
                    Esqueceu a senha?
                  </a>
                </div>
                <div className="relative rounded-lg shadow-2xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-1 flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-xs text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-600 disabled:opacity-50 transition cursor-pointer"
              >
                {loading ? 'Acessando...' : 'Entrar no Sistema'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Quick Demo Access shortcuts with explicit credentials visible */}
            <div className="mt-5 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">
                  Senhas de Teste & Acesso Rápido
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Toque para entrar</span>
              </div>

              <div className="space-y-2.5">
                {/* Vet Teste */}
                <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100/70 transition text-left flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-emerald-700 text-white flex items-center justify-center text-xs font-bold shrink-0">
                        V
                      </div>
                      <div>
                        <div className="text-xs font-bold text-emerald-950 leading-tight">Veterinário Teste (Atendimento Volante)</div>
                        <div className="text-[10px] text-emerald-700 leading-tight">CRMV-SP 12345 • Dados Zerados (Teste Manual)</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleQuickLogin('VET')}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition shadow-2xs shrink-0 cursor-pointer"
                    >
                      Entrar →
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-1 pt-1.5 border-t border-emerald-200/80 text-[11px] text-emerald-900 font-mono">
                    <span>E-mail: <strong className="font-semibold select-all">vetteste@gmail.com</strong></span>
                    <span>Senha: <strong className="font-semibold bg-emerald-100 px-1.5 py-0.5 rounded select-all">Nikolas13</strong></span>
                  </div>
                </div>

                {/* Admin NCodes Technologies */}
                <div className="p-3 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100/70 transition text-left flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-blue-700 text-white flex items-center justify-center text-xs font-bold shrink-0">
                        <Shield className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-blue-950 leading-tight">Administrador do Sistema (Programador)</div>
                        <div className="text-[10px] text-blue-700 leading-tight">NCodes Technologies • Controle Interno & Backoffice</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleQuickLogin('ADMIN')}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition shadow-2xs shrink-0 cursor-pointer"
                    >
                      Entrar →
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-1 pt-1.5 border-t border-blue-200/80 text-[11px] text-blue-900 font-mono">
                    <span>E-mail: <strong className="font-semibold select-all">ncodestechnologies@gmail.com</strong></span>
                    <span>Senha: <strong className="font-semibold bg-blue-100 px-1.5 py-0.5 rounded select-all">Taijou13!</strong></span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 text-center text-xs text-slate-500">
              Ainda não tem conta no Vetgo?{' '}
              <Link to="/cadastro" className="font-semibold text-emerald-700 hover:underline">
                Criar conta gratuita
              </Link>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};
