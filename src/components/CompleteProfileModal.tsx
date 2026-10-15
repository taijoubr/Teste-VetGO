import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { Shield, Sparkles, CheckCircle2, AlertCircle, X, Phone, Building } from 'lucide-react';

const ESTADOS_BRASIL = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export const CompleteProfileModal: React.FC = () => {
  const { user, isVet, refreshUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [crmv, setCrmv] = useState('');
  const [crmvUf, setCrmvUf] = useState('SP');
  const [phone, setPhone] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Exibe o modal se for veterinário e ainda não tiver cadastrado o CRMV
    if (isVet && user && !user.crmv) {
      const dismissed = sessionStorage.getItem('vetgo_dismissed_crmv_modal');
      if (!dismissed) {
        setIsOpen(true);
        if (user.phone) setPhone(user.phone);
        if (user.clinic_name) setClinicName(user.clinic_name);
        if (user.crmv_uf) setCrmvUf(user.crmv_uf);
      }
    }
  }, [user, isVet]);

  if (!isOpen) return null;

  const handleDismiss = () => {
    sessionStorage.setItem('vetgo_dismissed_crmv_modal', 'true');
    setIsOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!crmv.trim()) {
      setError('Por favor, informe seu número de CRMV.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.updateUserProfile({
        crmv: crmv.trim(),
        crmv_uf: crmvUf,
        phone: phone.trim() || undefined,
        whatsapp: phone.trim() || undefined,
        clinic_name: clinicName.trim() || undefined,
      });

      await refreshUser();
      setSuccess(true);
      setTimeout(() => {
        setIsOpen(false);
      }, 1500);
    } catch (err: any) {
      setError(err?.message || 'Falha ao salvar dados profissionais.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 relative space-y-4">
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          title="Preencher mais tarde"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-2xs">
            <Shield className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 pt-1">
            Complete seu Perfil Profissional
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            Sua conta Google foi validada com sucesso! Para que suas <strong>receitas</strong>, <strong>laudos</strong> e <strong>carteirinhas</strong> tenham validade com sua assinatura, informe seu CRMV.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Dados profissionais cadastrados com sucesso!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
          <div className="grid grid-cols-3 gap-2.5">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Número do CRMV *
              </label>
              <input
                type="text"
                required
                autoFocus
                value={crmv}
                onChange={(e) => setCrmv(e.target.value)}
                placeholder="Ex: 34892"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Estado (UF) *
              </label>
              <select
                value={crmvUf}
                onChange={(e) => setCrmvUf(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none font-semibold bg-white"
              >
                {ESTADOS_BRASIL.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              WhatsApp / Telefone de Atendimento
            </label>
            <div className="relative rounded-lg shadow-2xs">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Phone className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ex: (11) 98765-4321"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nome da Clínica ou Atendimento Volante (Opcional)
            </label>
            <div className="relative rounded-lg shadow-2xs">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Building className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                placeholder="Ex: Vet Volante Dra. Carolina"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none"
              />
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <button
              type="submit"
              disabled={loading || success}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-2xs disabled:opacity-50 transition cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Salvando Dados...</span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Salvar Dados Profissionais</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDismiss}
              className="w-full py-1.5 text-[11px] font-semibold text-slate-400 hover:text-slate-600 transition cursor-pointer"
            >
              Preencher depois em Configurações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
