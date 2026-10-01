import React, { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Lock, Mail, ArrowRight, CheckCircle2, Shield } from 'lucide-react';
import { AppLogo } from '../components/AppLogo';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, isAdmin } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      if (type === 'VET') {
        setEmail('dra.carolina@vetgo.com.br');
        setPassword('Vet@123456');
        const user = await login('dra.carolina@vetgo.com.br', 'Vet@123456');
        navigate('/');
      } else {
        setEmail('admin@vetgo.com.br');
        setPassword('Admin@123456');
        const user = await login('admin@vetgo.com.br', 'Admin@123456');
        navigate('/admin');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao efetuar login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-3 sm:py-6 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center flex flex-col items-center">
        <div className="mb-1 sm:mb-2">
          <AppLogo size="lg" />
        </div>
        <p className="text-xs text-slate-500 font-medium max-w-xs sm:max-w-sm">
          Plataforma de gestão para médicos-veterinários autônomos e atendimentos volantes
        </p>
      </div>

      <div className="mt-3 sm:mt-4 sm:mx-auto sm:w-full sm:max-w-md">
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
                  type="email"
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

          {/* Quick Demo Access shortcuts */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block text-center mb-2">
              Acesso Rápido para Avaliação
            </span>
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => handleQuickLogin('VET')}
                className="w-full flex items-center justify-between p-2 rounded-lg border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/60 text-emerald-900 transition text-left cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center text-[10px] font-bold">
                    C
                  </div>
                  <div>
                    <div className="text-xs font-bold leading-tight">Dra. Carolina Mendes (Veterinária)</div>
                    <div className="text-[10px] text-emerald-700 leading-tight">CRMV-SP 34892 • Atendimento Volante</div>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-emerald-700">Entrar →</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('ADMIN')}
                className="w-full flex items-center justify-between p-2 rounded-lg border border-blue-200 bg-blue-50/60 hover:bg-blue-100/60 text-blue-900 transition text-left cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-700 text-white flex items-center justify-center text-[10px] font-bold">
                    <Shield className="w-3 h-3" />
                  </div>
                  <div>
                    <div className="text-xs font-bold leading-tight">Administrador Vetgo (SaaS Admin)</div>
                    <div className="text-[10px] text-blue-700 leading-tight">Gestão de Usuários & Assinaturas</div>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-blue-700">Entrar →</span>
              </button>
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
  );
};
