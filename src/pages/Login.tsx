import React, { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Lock, Mail, ArrowRight, CheckCircle2, KeyRound, X, AlertCircle, ArrowLeft } from 'lucide-react';
import { api } from '../services/api';
import { AppLogo } from '../components/AppLogo';
import { Footer } from '../components/Footer';
import { GoogleSignInButton, GoogleOrDivider } from '../components/GoogleSignInButton';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, isAdmin } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Password recovery states
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<'request' | 'verify' | 'done'>('request');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [forgotNewPass, setForgotNewPass] = useState('');
  const [forgotConfirmPass, setForgotConfirmPass] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);

  if (isAuthenticated) {
    return <Navigate to={isAdmin ? '/admin' : '/'} replace />;
  }

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotSuccess(null);
    setForgotLoading(true);

    try {
      const clean = forgotEmail.trim().toLowerCase();
      const res = await api.forgotPassword(clean);
      setForgotSuccess(res.message || 'Código de recuperação enviado com sucesso!');
      setForgotStep('verify');
    } catch (err: any) {
      setForgotError(err?.message || 'Falha ao solicitar código de recuperação.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);

    if (forgotNewPass.length < 6) {
      setForgotError('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (forgotNewPass !== forgotConfirmPass) {
      setForgotError('As senhas digitadas não coincidem.');
      return;
    }

    setForgotLoading(true);
    try {
      const cleanEmail = forgotEmail.trim().toLowerCase();
      const cleanCode = forgotCode.trim();
      await api.resetPassword(cleanEmail, cleanCode, forgotNewPass);
      setForgotStep('done');
    } catch (err: any) {
      setForgotError(err?.message || 'Código inválido ou erro ao alterar senha.');
    } finally {
      setForgotLoading(false);
    }
  };

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

            {/* BOTÃO CONTINUAR COM O GOOGLE */}
            <div className="mb-3">
              <GoogleSignInButton mode="login" onError={(err) => setError(err)} />
              <GoogleOrDivider />
            </div>

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
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(email || '');
                      setForgotCode('');
                      setForgotNewPass('');
                      setForgotConfirmPass('');
                      setForgotStep('request');
                      setForgotError(null);
                      setForgotSuccess(null);
                      setIsForgotOpen(true);
                    }}
                    className="text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold hover:underline cursor-pointer"
                  >
                    Esqueceu a senha?
                  </button>
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

            <div className="mt-4 text-center text-xs text-slate-500">
              Ainda não tem conta no Vetgo?{' '}
              <Link to="/cadastro" className="font-semibold text-emerald-700 hover:underline">
                Criar conta gratuita
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL DE RECUPERAÇÃO DE SENHA */}
      {isForgotOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 relative space-y-4">
            <button
              type="button"
              onClick={() => setIsForgotOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Recuperação de Senha</h3>
                <p className="text-xs text-slate-500">Redefina o acesso à sua conta Vetgo com segurança</p>
              </div>
            </div>

            {forgotError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{forgotError}</span>
              </div>
            )}

            {forgotStep === 'request' && (
              <form onSubmit={handleRequestReset} className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Informe o e-mail cadastrado na sua conta. Nós enviaremos um <strong>código de segurança de 6 dígitos</strong> para você cadastrar uma nova senha.
                </p>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    E-mail cadastrado
                  </label>
                  <div className="relative rounded-lg shadow-2xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="seu.email@exemplo.com"
                      className="block w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none transition"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsForgotOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 shadow-2xs disabled:opacity-50 transition cursor-pointer"
                  >
                    {forgotLoading ? 'Enviando código...' : 'Enviar Código por E-mail →'}
                  </button>
                </div>
              </form>
            )}

            {forgotStep === 'verify' && (
              <form onSubmit={handleConfirmReset} className="space-y-3.5">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Código de 6 dígitos enviado!
                  </div>
                  <p className="text-[11px] text-emerald-800">
                    Enviamos o código para <strong>{forgotEmail}</strong>. Verifique sua caixa de entrada ou spam.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Código de 6 dígitos recebido *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={forgotCode}
                    onChange={(e) => setForgotCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full px-3 py-2 text-center text-lg font-mono tracking-widest font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nova Senha (mínimo 6 caracteres) *
                  </label>
                  <div className="relative rounded-lg shadow-2xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={forgotNewPass}
                      onChange={(e) => setForgotNewPass(e.target.value)}
                      placeholder="••••••••"
                      className="block w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Confirmar Nova Senha *
                  </label>
                  <div className="relative rounded-lg shadow-2xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={forgotConfirmPass}
                      onChange={(e) => setForgotConfirmPass(e.target.value)}
                      placeholder="••••••••"
                      className="block w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none transition"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotStep('request')}
                    className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Trocar e-mail
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 shadow-2xs disabled:opacity-50 transition cursor-pointer"
                  >
                    {forgotLoading ? 'Salvando nova senha...' : 'Salvar Nova Senha'}
                  </button>
                </div>
              </form>
            )}

            {forgotStep === 'done' && (
              <div className="text-center py-4 space-y-4 animate-in fade-in">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900">Senha Redefinida com Sucesso!</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Sua nova senha já está ativa. Você agora pode fazer login no sistema com a nova credencial.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotOpen(false);
                    setEmail(forgotEmail);
                    setPassword('');
                  }}
                  className="w-full py-2.5 px-4 rounded-lg text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 shadow-xs transition cursor-pointer"
                >
                  Fazer Login Agora →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};
