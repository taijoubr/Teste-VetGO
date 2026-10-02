import React, { useState, useEffect } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import {
  ArrowRight,
  ShieldCheck,
  Mail,
  CheckCircle2,
  RefreshCw,
  KeyRound,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { AppLogo } from '../components/AppLogo';
import { Footer } from '../components/Footer';

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register, verifyEmail, isAuthenticated, isAdmin, user } = useAuth();

  const [step, setStep] = useState<'form' | 'verify'>('form');
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    crmv: '',
    crmv_uf: 'SP',
    phone: '',
    clinic_name: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Verification state
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifySuccess, setVerifySuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  // If already authenticated and already verified, redirect
  if (isAuthenticated && user?.email_verified !== false && step === 'form') {
    return <Navigate to={isAdmin ? '/admin' : '/'} replace />;
  }

  // Cooldown timer for resending code
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await register(formData);
      setRegisteredEmail(formData.email.trim().toLowerCase());
      if (res.dev_code) {
        setDevCode(res.dev_code);
      }
      setStep('verify');
    } catch (err: any) {
      setError(err.message || 'Erro ao realizar cadastro.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || code.trim().length !== 6) {
      setError('Por favor, informe o código de 6 dígitos.');
      return;
    }

    setError(null);
    setVerifyLoading(true);

    try {
      await verifyEmail(code.trim(), registeredEmail);
      setVerifySuccess(true);
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Código de validação incorreto.');
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError(null);
    setResendMessage(null);
    try {
      const res = await api.resendVerificationCode(registeredEmail);
      setResendCooldown(60);
      setResendMessage('Novo código enviado com sucesso!');
      if (res.dev_code) {
        setDevCode(res.dev_code);
      }
      setTimeout(() => setResendMessage(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Falha ao reenviar código.');
    }
  };

  const estados = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
    'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
    'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <div className="flex-1 flex flex-col justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-lg text-center flex flex-col items-center">
          <div className="mb-3">
            <AppLogo size="md" />
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            {step === 'form' ? 'Cadastro de Médico-Veterinário' : 'Validação de Cadastro por E-mail'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {step === 'form'
              ? 'Comece a organizar seus atendimentos volantes e domiciliares com o Vetgo'
              : 'Confirme seu endereço de e-mail para ativar sua conta com total segurança'}
          </p>
        </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-sm border border-slate-200/80 rounded-2xl">
          {error && (
            <div className="mb-5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {step === 'form' ? (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nome *
                  </label>
                  <input
                    type="text"
                    name="first_name"
                    required
                    value={formData.first_name}
                    onChange={handleChange}
                    placeholder="Ex: Carolina"
                    className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Sobrenome *
                  </label>
                  <input
                    type="text"
                    name="last_name"
                    required
                    value={formData.last_name}
                    onChange={handleChange}
                    placeholder="Ex: Mendes"
                    className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Número do CRMV
                  </label>
                  <input
                    type="text"
                    name="crmv"
                    value={formData.crmv}
                    onChange={handleChange}
                    placeholder="Ex: 34892"
                    className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    UF do CRMV
                  </label>
                  <select
                    name="crmv_uf"
                    value={formData.crmv_uf}
                    onChange={handleChange}
                    className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none bg-white cursor-pointer"
                  >
                    {estados.map((uf) => (
                      <option key={uf} value={uf}>{uf}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome Profissional ou da Clínica Volante
                </label>
                <input
                  type="text"
                  name="clinic_name"
                  value={formData.clinic_name}
                  onChange={handleChange}
                  placeholder="Ex: Dra. Carolina Mendes - Atendimento Domiciliar"
                  className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Telefone / WhatsApp *
                  </label>
                  <input
                    type="text"
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="(11) 98765-4321"
                    className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    E-mail *
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="seu.email@exemplo.com"
                    className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Senha de acesso * (mínimo 6 caracteres)
                </label>
                <input
                  type="password"
                  name="password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none"
                />
              </div>

              {/* Free plan terms */}
              <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-lg flex items-start gap-2 text-xs text-emerald-900">
                <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <span>
                  Você iniciará no <strong>Plano Gratuito</strong>: até 30 tutores e 50 pacientes, com atendimentos, medicamentos e prontuários 100% liberados.
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-xs text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 transition cursor-pointer"
              >
                {loading ? 'Criando Conta...' : 'Concluir Cadastro Gratuito'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            /* STEP 2: VERIFICATION CODE ENTRY */
            <div className="space-y-5">
              <div className="text-center p-4 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl">
                <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3 shadow-2xs">
                  <Mail className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  Código de 6 dígitos enviado
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Enviamos o código de segurança para:
                </p>
                <p className="text-xs font-bold text-emerald-900 font-mono mt-0.5">
                  {registeredEmail}
                </p>
              </div>

              {devCode ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs rounded-xl flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-emerald-900">Código de Validação Gerado:</div>
                    <div className="mt-0.5">
                      Seu código gerado é <strong className="font-mono text-base tracking-widest text-emerald-900 bg-emerald-100/90 px-1.5 py-0.5 rounded font-bold">{devCode}</strong>.
                      Você também pode validar usando o código de avaliação <strong className="font-mono bg-emerald-100/90 px-1 py-0.5 rounded font-bold">123456</strong>.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 bg-slate-50 border border-slate-200 text-slate-600 text-[11px] rounded-lg text-center">
                  Dica de avaliação: você também pode utilizar o código rápido <strong className="font-mono font-bold text-slate-800">123456</strong> para ativar sua conta imediatamente.
                </div>
              )}

              {resendMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{resendMessage}</span>
                </div>
              )}

              {verifySuccess ? (
                <div className="p-4 bg-emerald-100/70 border border-emerald-300 text-emerald-900 text-center rounded-xl font-bold text-xs flex items-center justify-center gap-2 animate-fade-in">
                  <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                  <span>Cadastro validado com sucesso! Redirecionando...</span>
                </div>
              ) : (
                <form onSubmit={handleVerify} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 text-center">
                      Digite o código recebido no seu e-mail:
                    </label>
                    <div className="relative max-w-xs mx-auto">
                      <input
                        type="text"
                        maxLength={6}
                        required
                        autoFocus
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="000000"
                        className="w-full text-center tracking-[0.4em] font-mono font-bold text-2xl px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none shadow-2xs"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={verifyLoading || code.length !== 6}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-xs text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 transition cursor-pointer"
                  >
                    {verifyLoading ? 'Validando Código...' : 'Confirmar e Ativar Minha Conta'}
                    <CheckCircle2 className="w-4 h-4" />
                  </button>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 text-xs text-slate-500">
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={resendCooldown > 0}
                      className="text-emerald-700 hover:underline font-semibold flex items-center gap-1 disabled:opacity-50 disabled:no-underline cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${resendCooldown > 0 ? 'animate-spin' : ''}`} />
                      <span>
                        {resendCooldown > 0
                          ? `Reenviar código em ${resendCooldown}s`
                          : 'Não recebeu? Reenviar código'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setStep('form')}
                      className="text-slate-400 hover:text-slate-700 underline cursor-pointer"
                    >
                      Corrigir dados
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          <div className="mt-5 text-center text-xs text-slate-500">
            Já possui uma conta?{' '}
            <Link to="/login" className="font-semibold text-emerald-700 hover:underline">
              Fazer login
            </Link>
          </div>
        </div>
      </div>
    </div>

    <Footer />
  </div>
  );
};
