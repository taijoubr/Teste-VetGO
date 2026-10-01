import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import {
  User as UserIcon,
  Shield,
  CreditCard,
  Image as ImageIcon,
  FileText,
  Key,
  CheckCircle2,
  Sparkles,
  ArrowUpRight,
  ExternalLink,
  Activity,
  Building2,
  UserCheck,
  Stethoscope,
  HeartPulse,
  Sliders,
  Check,
  Info,
  ChevronDown,
  Bell,
  QrCode,
  Send,
  MessageCircle,
  ThumbsUp
} from 'lucide-react';
import { useSearchParams, Link } from 'react-router-dom';
import { PushNotificationManager } from '../components/PushNotificationManager';

export const SettingsPage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'perfil';

  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  // Specialty state
  const isAnesthesiaActive = Boolean(user?.specialty_anesthesia_enabled);
  const [isUpdatingSpecialty, setIsUpdatingSpecialty] = useState(false);

  const handleToggleAnesthesia = async () => {
    setIsUpdatingSpecialty(true);
    const newValue = !isAnesthesiaActive;
    try {
      await api.updateUserProfile({
        specialty_anesthesia_enabled: newValue
      });
      await refreshUser();
      setSavedMessage(
        newValue
          ? 'Módulo de Anestesiologia & Cirurgia ATIVADO com sucesso! As opções foram adicionadas ao menu lateral.'
          : 'Módulo de Anestesiologia DESATIVADO com sucesso! O menu lateral foi simplificado.'
      );
      setTimeout(() => setSavedMessage(null), 4000);
    } catch {
      setSavedMessage('Erro ao atualizar especialidade. Tente novamente.');
    } finally {
      setIsUpdatingSpecialty(false);
    }
  };

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    phone: user?.phone || '',
    whatsapp: user?.whatsapp || '',
    clinic_name: user?.clinic_name || ''
  });

  // Professional Form State
  const [profForm, setProfForm] = useState({
    crmv: user?.crmv || '',
    crmv_uf: user?.crmv_uf || 'SP'
  });

  // PIX Form State
  const [pixForm, setPixForm] = useState({
    pix_key: user?.pix_key || '',
    pix_receiver_name: user?.pix_receiver_name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim(),
    pix_city: user?.pix_city || 'SAO PAULO',
  });

  // Specialty Request State
  const [requestedSpecialty, setRequestedSpecialty] = useState('');
  const [specialtyDetails, setSpecialtyDetails] = useState('');
  const [specialtySubmitted, setSpecialtySubmitted] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.updateUserProfile({ ...profileForm, ...profForm, ...pixForm });
    await refreshUser();
    setSavedMessage('Alterações salvas com sucesso!');
    setTimeout(() => setSavedMessage(null), 3000);
  };

  const tabs = [
    { id: 'perfil', name: 'Perfil Pessoal', icon: UserIcon },
    { id: 'servicos', name: 'Serviços & Exames', icon: Stethoscope },
    { id: 'especialidades', name: 'Especialidades & Módulos', icon: Activity },
    { id: 'profissional', name: 'Dados Profissionais', icon: Shield },
    { id: 'identidade', name: 'Identidade Visual & Logo', icon: ImageIcon },
    { id: 'documentos', name: 'Documentos & Rodapé', icon: FileText },
    { id: 'notificacoes', name: 'Notificações Push', icon: Bell },
    { id: 'seguranca', name: 'Conta & Senha', icon: Key },
    { id: 'assinatura', name: 'Assinatura & Plano', icon: CreditCard },
  ];

  return (
    <div className="p-3 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6 w-full min-w-0">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Configurações da Conta
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Gerencie suas preferências profissionais, documentos, dados de acesso e plano
        </p>
      </div>

      {savedMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{savedMessage}</span>
        </div>
      )}

      {/* Mobile Selector Dropdown (Eliminates horizontal scrolling on mobile entirely) */}
      <div className="sm:hidden w-full">
        <label htmlFor="settings-tab-select" className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
          Seção das Configurações
        </label>
        <div className="relative">
          <select
            id="settings-tab-select"
            value={activeTab}
            onChange={(e) => setSearchParams({ tab: e.target.value })}
            className="w-full appearance-none bg-white border border-slate-300 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 shadow-2xs outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 pr-10 cursor-pointer"
          >
            {tabs.map((tab) => (
              <option key={tab.id} value={tab.id}>
                {tab.name}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-500">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Responsive Wrapping Navigation Pills (No overflow-x-auto, wraps cleanly without horizontal scroll) */}
      <div className="flex flex-wrap gap-1.5 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/80">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSearchParams({ tab: tab.id })}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                isActive
                  ? 'bg-white text-emerald-800 shadow-xs border border-emerald-600/30'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <tab.icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-emerald-700' : 'text-slate-400'}`} />
              <span>{tab.name}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 sm:p-6 shadow-2xs w-full min-w-0">
        {activeTab === 'perfil' && (
          <form onSubmit={handleSaveProfile} className="space-y-4 max-w-lg">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Informações de Contato</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nome</label>
                <input
                  type="text"
                  value={profileForm.first_name}
                  onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Sobrenome</label>
                <input
                  type="text"
                  value={profileForm.last_name}
                  onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">E-mail (Login)</label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 bg-slate-50 rounded-lg text-slate-500 cursor-not-allowed"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Telefone Principal</label>
                <input
                  type="text"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">WhatsApp para Tutores</label>
                <input
                  type="text"
                  value={profileForm.whatsapp}
                  onChange={(e) => setProfileForm({ ...profileForm, whatsapp: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nome Fantasia / Clínica Volante</label>
              <input
                type="text"
                value={profileForm.clinic_name}
                onChange={(e) => setProfileForm({ ...profileForm, clinic_name: e.target.value })}
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none"
              />
            </div>

            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white transition cursor-pointer"
            >
              Salvar Alterações
            </button>
          </form>
        )}

        {/* TAB: CATÁLOGO DE SERVIÇOS, PROCEDIMENTOS & EXAMES */}
        {activeTab === 'servicos' && (
          <div className="space-y-6 max-w-3xl">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-emerald-700" />
                Catálogo de Serviços, Procedimentos & Exames
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Cadastre seus honorários de consultas, procedimentos ambulatoriais, vacinas e exames complementares com preços padrão para busca rápida durante o atendimento e montagem de orçamento.
              </p>
            </div>

            <div className="p-5 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h4 className="text-sm font-bold text-emerald-950">
                    Gerenciador Central de Serviços & Exames
                  </h4>
                  <p className="text-xs text-slate-600 mt-1 max-w-xl">
                    Todos os itens cadastrados aqui aparecem instantaneamente na busca preditiva ao montar o orçamento do paciente durante a consulta volante, sem necessidade de atalhos fixos.
                  </p>
                </div>
                <Link
                  to="/servicos"
                  className="px-4 py-2.5 rounded-xl font-bold text-xs bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition flex items-center gap-2 cursor-pointer"
                >
                  <Stethoscope className="w-4 h-4" />
                  <span>Acessar Cadastro de Serviços & Exames</span>
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-emerald-200/60 text-xs">
                <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-2xs">
                  <span className="font-bold text-slate-800 block mb-0.5">🩺 Consultas & Visitas</span>
                  <span className="text-slate-500 text-[11px]">Honorários domiciliares, retorno e plantão.</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-2xs">
                  <span className="font-bold text-slate-800 block mb-0.5">🔬 Exames Complementares</span>
                  <span className="text-slate-500 text-[11px]">Hemograma, perfis bioquímicos, ultrassom e ECG.</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-2xs">
                  <span className="font-bold text-slate-800 block mb-0.5">💉 Procedimentos & Vacinas</span>
                  <span className="text-slate-500 text-[11px]">Curativos, injeções, fluidoterapia e imunização.</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: ESPECIALIDADES & MÓDULOS CLÍNICOS */}
        {activeTab === 'especialidades' && (
          <div className="space-y-6 max-w-3xl">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-emerald-700" />
                Módulos de Especialidades Veterinárias
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Ligue ou desligue módulos de acordo com o seu perfil de atendimento.
                Desativar uma especialidade simplifica o menu de navegação e as opções do aplicativo, mantendo o ambiente focado em sua rotina clínica.
              </p>
            </div>

            {/* Módulo Principal: Anestesiologia & Cirurgia Volante */}
            <div className={`p-5 rounded-2xl border transition-all ${
              isAnesthesiaActive
                ? 'bg-emerald-950/5 border-emerald-500/40 shadow-xs'
                : 'bg-slate-50/80 border-slate-200'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                    isAnesthesiaActive
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-slate-200 text-slate-500'
                  }`}>
                    <Activity className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-slate-900">
                        Anestesiologia & Cirurgia Volante
                      </h4>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                        isAnesthesiaActive
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-slate-200 text-slate-600'
                      }`}>
                        {isAnesthesiaActive ? 'Módulo Ativado' : 'Módulo Desativado'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Voltado para médicos-veterinários anestesiologistas, cirurgiões e volantes que prestam serviços em clínicas parceiras e hospitais.
                    </p>
                  </div>
                </div>

                {/* Switch Button */}
                <div className="flex items-center sm:self-center">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isAnesthesiaActive}
                    disabled={isUpdatingSpecialty}
                    onClick={handleToggleAnesthesia}
                    className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 ${
                      isAnesthesiaActive ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                  >
                    <span className="sr-only">Ligar ou desligar Anestesiologia</span>
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        isAnesthesiaActive ? 'translate-x-7' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* O que o módulo inclui */}
              <div className="mt-4 pt-4 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600">
                <div className="flex items-start gap-2">
                  <Check className={`w-4 h-4 shrink-0 mt-0.5 ${isAnesthesiaActive ? 'text-emerald-700' : 'text-slate-400'}`} />
                  <span><strong>Ficha Anestésica Perioperatória</strong> com cronômetro contínuo em sala cirúrgica</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className={`w-4 h-4 shrink-0 mt-0.5 ${isAnesthesiaActive ? 'text-emerald-700' : 'text-slate-400'}`} />
                  <span><strong>Monitoramento Multiparamétrico</strong> (FC, ECG, PAS/PAM/PAD, SpO₂, EtCO₂, FR, Temp)</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className={`w-4 h-4 shrink-0 mt-0.5 ${isAnesthesiaActive ? 'text-emerald-700' : 'text-slate-400'}`} />
                  <span><strong>Calculadora Anestésica</strong> de doses, MPA, indução, manutenção e taxa de infusão (CRI)</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className={`w-4 h-4 shrink-0 mt-0.5 ${isAnesthesiaActive ? 'text-emerald-700' : 'text-slate-400'}`} />
                  <span><strong>Gestão de Clínicas Parceiras & Cirurgiões</strong> com código de parceiro (PR-xx)</span>
                </div>
              </div>

              {/* Aviso dinâmico de visibilidade */}
              <div className={`mt-4 p-3 rounded-lg text-xs flex items-center gap-2.5 ${
                isAnesthesiaActive
                  ? 'bg-emerald-100/60 text-emerald-900 border border-emerald-200'
                  : 'bg-amber-50 text-amber-900 border border-amber-200'
              }`}>
                <Info className="w-4 h-4 shrink-0 text-current" />
                <span>
                  {isAnesthesiaActive
                    ? 'As seções "Anestesiologia", "Clínicas Parceiras" e "Cirurgiões" estão visíveis no seu menu lateral.'
                    : 'As seções de Anestesiologia estão ocultas do menu lateral. Seus dados e fichas continuam salvos e seguros.'}
                </span>
              </div>
            </div>

            {/* Solicite sua Especialidade (Ecossistema Modular) */}
            <div className="pt-2">
              <div className="bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 rounded-2xl p-5 sm:p-6 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                  <Sparkles className="w-36 h-36 text-emerald-300" />
                </div>

                <div className="relative z-10 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Construído para a sua Prática Clínica</span>
                      </div>
                      <h3 className="text-base sm:text-lg font-extrabold tracking-tight text-white">
                        Solicite sua Especialidade no Vetgo
                      </h3>
                      <p className="text-xs text-emerald-100/80 max-w-xl leading-relaxed">
                        Não encontrou a sua área de atuação? Desenvolvemos prontuários, calculadoras e fichas sob medida para especialistas que atendem em campo ou em clínicas parceiras.
                      </p>
                    </div>
                  </div>

                  {specialtySubmitted ? (
                    <div className="p-4 bg-emerald-800/60 border border-emerald-500/40 rounded-xl space-y-2 animate-fade-in">
                      <div className="flex items-center gap-2 text-emerald-200 font-bold text-xs">
                        <ThumbsUp className="w-4 h-4 text-emerald-300" />
                        <span>Solicitação registrada com sucesso!</span>
                      </div>
                      <p className="text-xs text-emerald-100/90 leading-relaxed">
                        Muito obrigado pela sua sugestão! Nossa equipe de engenharia analisa a demanda de cada especialidade para priorizar o desenvolvimento dos próximos módulos clínicos.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setSpecialtySubmitted(false);
                          setRequestedSpecialty('');
                          setSpecialtyDetails('');
                        }}
                        className="text-[11px] text-emerald-300 hover:text-white underline font-semibold mt-1 cursor-pointer"
                      >
                        Enviar outra sugestão
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3.5 bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/15">
                      {/* Sugestões Rápidas em Chips */}
                      <div>
                        <span className="text-[11px] font-bold text-emerald-200 uppercase tracking-wider block mb-2">
                          Toque em uma especialidade frequente ou digite a sua:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            { name: 'Oftalmologia', icon: '👁️' },
                            { name: 'Ortopedia & Traumatologia', icon: '🦴' },
                            { name: 'Silvestres & Exóticos', icon: '🦜' },
                            { name: 'Dermatologia Veterinária', icon: '🧴' },
                            { name: 'Medicina Felina (Cat-Friendly)', icon: '🐱' },
                            { name: 'Cardiologia & Eletro', icon: '🫀' },
                            { name: 'Fisioterapia & Reabilitação', icon: '⚡' },
                            { name: 'Acupuntura & Ozonioterapia', icon: '🌿' },
                            { name: 'Odontologia Veterinária', icon: '🦷' },
                            { name: 'Oncologia Veterinária', icon: '🔬' },
                            { name: 'Nefrologia & Urologia', icon: '💧' },
                            { name: 'Neurologia', icon: '🧠' },
                          ].map((spec) => (
                            <button
                              key={spec.name}
                              type="button"
                              onClick={() => setRequestedSpecialty(spec.name)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                                requestedSpecialty === spec.name
                                  ? 'bg-emerald-500 text-white font-bold shadow-xs'
                                  : 'bg-white/10 text-emerald-100 hover:bg-white/20'
                              }`}
                            >
                              <span>{spec.icon}</span>
                              <span>{spec.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Inputs */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-emerald-100 mb-1">
                            Nome da Especialidade *
                          </label>
                          <input
                            type="text"
                            placeholder="Ex: Oftalmologia Veterinária"
                            value={requestedSpecialty}
                            onChange={(e) => setRequestedSpecialty(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-900/60 border border-emerald-500/30 rounded-lg text-xs text-white placeholder:text-slate-400 outline-none focus:border-emerald-400"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-emerald-100 mb-1">
                            O que não pode faltar no seu prontuário? (Opcional)
                          </label>
                          <input
                            type="text"
                            placeholder="Ex: Teste de Schirmer, tonometria e anexar fotos"
                            value={specialtyDetails}
                            onChange={(e) => setSpecialtyDetails(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-900/60 border border-emerald-500/30 rounded-lg text-xs text-white placeholder:text-slate-400 outline-none focus:border-emerald-400"
                          />
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
                        <span className="text-[11px] text-emerald-200/80">
                          Sua sugestão ajuda a priorizar os próximos módulos clínicos.
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const msg = encodeURIComponent(
                                `Olá equipe Vetgo! Sou o(a) Dr(a). ${user?.first_name || 'Veterinário(a)'} e gostaria de sugerir o módulo de *${requestedSpecialty || 'Especialidade Veterinária'}* no sistema.` +
                                (specialtyDetails ? `\n\nDetalhes:\n${specialtyDetails}` : '')
                              );
                              window.open(`https://wa.me/5511999999999?text=${msg}`, '_blank');
                            }}
                            className="px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-400/30 transition flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>Pedir no WhatsApp</span>
                          </button>

                          <button
                            type="button"
                            disabled={!requestedSpecialty.trim()}
                            onClick={() => {
                              if (requestedSpecialty.trim()) {
                                setSpecialtySubmitted(true);
                              }
                            }}
                            className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Enviar Solicitação</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'profissional' && (
          <form onSubmit={handleSaveProfile} className="space-y-4 max-w-lg">
            <h3 className="text-sm font-bold text-slate-900 mb-2">Registro Profissional</h3>
            <p className="text-xs text-slate-500 mb-4">
              Estes dados serão emitidos no cabeçalho de atestados, receitas e receituários de controle especial.
            </p>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Número do CRMV</label>
                <input
                  type="text"
                  value={profForm.crmv}
                  onChange={(e) => setProfForm({ ...profForm, crmv: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">UF do CRMV</label>
                <input
                  type="text"
                  maxLength={2}
                  value={profForm.crmv_uf}
                  onChange={(e) => setProfForm({ ...profForm, crmv_uf: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none uppercase font-mono"
                />
              </div>
            </div>

            {/* Configuração da Chave PIX */}
            <div className="pt-4 border-t border-slate-200 space-y-3">
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-emerald-700" />
                  Chave PIX para Cobrança por QR Code
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Utilizada para gerar o QR Code oficial do Banco Central na tela de consultas e financeiro.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Chave PIX
                </label>
                <input
                  type="text"
                  placeholder="Ex: CPF, CNPJ, Celular, E-mail ou Chave Aleatória"
                  value={pixForm.pix_key}
                  onChange={(e) => setPixForm({ ...pixForm, pix_key: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nome do Titular da Conta
                  </label>
                  <input
                    type="text"
                    maxLength={25}
                    placeholder="Ex: CAROLINE MENDES"
                    value={pixForm.pix_receiver_name}
                    onChange={(e) => setPixForm({ ...pixForm, pix_receiver_name: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cidade da Conta
                  </label>
                  <input
                    type="text"
                    maxLength={15}
                    placeholder="Ex: SAO PAULO"
                    value={pixForm.pix_city}
                    onChange={(e) => setPixForm({ ...pixForm, pix_city: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white transition cursor-pointer"
            >
              Salvar Dados Profissionais & PIX
            </button>
          </form>
        )}

        {activeTab === 'identidade' && (
          <div className="space-y-4 max-w-lg">
            <h3 className="text-sm font-bold text-slate-900 mb-2">Logomarca Profissional</h3>
            <p className="text-xs text-slate-500">
              Faça upload do seu logotipo para personalização dos documentos emitidos pelo sistema.
            </p>

            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50">
              <ImageIcon className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <div className="text-xs font-semibold text-slate-700">
                Arraste seu logo em PNG ou JPG até aqui
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Recomendado: fundo transparente, até 2MB</div>
              <button
                type="button"
                className="mt-3 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
              >
                Selecionar Arquivo
              </button>
            </div>
          </div>
        )}

        {activeTab === 'documentos' && (
          <div className="space-y-4 max-w-lg">
            <h3 className="text-sm font-bold text-slate-900 mb-2">Padrão de Documentos Impressos e PDF</h3>
            <p className="text-xs text-slate-500">
              Conforme as diretrizes da plataforma, a identidade visual do médico-veterinário é predominante nos cabeçalhos, contendo apenas identificação discreta do Vetgo no rodapé.
            </p>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2">
              <div className="font-semibold text-slate-800">Visualização do Rodapé Padrão:</div>
              <div className="p-3 bg-white border border-slate-200 rounded text-center text-[11px] text-slate-400">
                Documento emitido via Vetgo • Gestão Veterinária Integrada
              </div>
            </div>
          </div>
        )}

        {activeTab === 'seguranca' && (
          <div className="space-y-4 max-w-lg">
            <h3 className="text-sm font-bold text-slate-900 mb-2">Alteração de Senha</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Senha Atual</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nova Senha</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Confirmar Nova Senha</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none"
                />
              </div>
              <button
                type="button"
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white transition cursor-pointer"
              >
                Atualizar Senha
              </button>
            </div>
          </div>
        )}

        {activeTab === 'notificacoes' && (
          <div className="space-y-4 max-w-3xl">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Central de Notificações Push
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure e teste o recebimento de alertas em tempo real no seu smartphone ou computador
              </p>
            </div>
            <PushNotificationManager />
          </div>
        )}

        {activeTab === 'assinatura' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Assinatura do Vetgo
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Gerencie seu plano atual e libere cadastros ilimitados para sua rotina
              </p>
            </div>

            {/* Plan Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Free Plan details */}
              <div
                className={`p-6 rounded-2xl border ${
                  user?.plan === 'FREE' && !user.is_lifetime
                    ? 'border-emerald-600 bg-emerald-50/20 shadow-xs'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs uppercase font-bold tracking-wider text-slate-500">
                      Plano Gratuito
                    </span>
                    <div className="text-2xl font-black text-slate-900 mt-1">R$ 0,00</div>
                  </div>
                  {user?.plan === 'FREE' && !user.is_lifetime && (
                    <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800">
                      Plano Atual
                    </span>
                  )}
                </div>

                <div className="mt-4 space-y-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Até 30 tutores cadastrados (ativos e inativos)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Até 50 pacientes cadastrados (ativos e inativos)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Atendimentos e agendamentos ilimitados</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Catálogo de medicamentos completo</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Prontuários e fichas clínicas completas</span>
                  </div>
                  <div className="flex items-center gap-2 font-medium text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Módulo de Anestesiologia & Cirurgia liberado para todos</span>
                  </div>
                </div>
              </div>

              {/* Pro Plan Card */}
              <div
                className={`p-6 rounded-2xl border ${
                  user?.plan === 'PRO' || user?.is_lifetime
                    ? 'border-emerald-600 bg-emerald-50/30 shadow-xs'
                    : 'border-emerald-300 bg-linear-to-b from-white to-emerald-50/20'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs uppercase font-bold tracking-wider text-emerald-700">
                        Vetgo Pro
                      </span>
                      {user?.is_lifetime && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-purple-100 text-purple-800">
                          Vitalício
                        </span>
                      )}
                    </div>
                    <div className="text-2xl font-black text-emerald-900 mt-1">
                      R$ 18,00<span className="text-xs font-normal text-slate-500">/mês</span>
                    </div>
                  </div>
                  {(user?.plan === 'PRO' || user?.is_lifetime) && (
                    <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-600 text-white">
                      Ativo
                    </span>
                  )}
                </div>

                <div className="mt-4 space-y-2 text-xs text-slate-700">
                  <div className="flex items-center gap-2 font-semibold text-emerald-800">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>Tutores ILIMITADOS</span>
                  </div>
                  <div className="flex items-center gap-2 font-semibold text-emerald-800">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>Pacientes ILIMITADOS</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Relatórios financeiros detalhados</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Emissão de receitas com logo personalizada</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Suporte prioritário via WhatsApp</span>
                  </div>
                </div>

                {user?.plan === 'FREE' && !user?.is_lifetime && (
                  <div className="mt-5">
                    <button
                      type="button"
                      onClick={() => alert('Para assinar o Vetgo Pro por R$ 18,00/mês, contate o administrador ou utilize o fluxo de pagamento.')}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-bold text-xs bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition cursor-pointer"
                    >
                      <span>Fazer Upgrade Agora (R$ 18/mês)</span>
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
