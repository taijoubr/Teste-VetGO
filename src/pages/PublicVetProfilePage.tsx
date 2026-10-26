import React, { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Phone,
  MessageCircle,
  MapPin,
  Heart,
  ShieldCheck,
  CheckCircle2,
  Stethoscope,
  Building2,
  Sparkles,
  AlertCircle,
  Share2,
  ChevronRight,
  Send,
  UserCheck,
  Smartphone,
  Home,
  Check,
  Info,
  Instagram,
  X,
  FileText,
  Sliders,
  ChevronLeft,
  Syringe,
  TestTube,
  Bandage,
  Star,
  Menu
} from 'lucide-react';
import { api } from '../services/api';
import { PublicVetProfile, PublicConsultationRequest } from '../types';
import { AppLogo } from '../components/AppLogo';

// High quality curated stock photos matching the reference layout
const ASSETS = {
  heroVetWithPets: 'https://images.unsplash.com/photo-1628009368231-7bb7cfcb0def?auto=format&fit=crop&w=1000&q=80',
  heroVetHuggingPets: 'https://images.unsplash.com/photo-1576201836106-db1758fd1c97?auto=format&fit=crop&w=1000&q=80',
  bannerDogAndCat: 'https://images.unsplash.com/photo-1548767797-d8c844163c4c?auto=format&fit=crop&w=1200&q=80',
  defaultVetDoctor: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=600&q=80',
  dogAvatar: 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=300&q=80',
  catAvatar: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=300&q=80',
  serviceConsultation: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=600&q=80',
  serviceVaccine: 'https://images.unsplash.com/photo-1628009368231-7bb7cfcb0def?auto=format&fit=crop&w=600&q=80',
  serviceExam: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=600&q=80',
  serviceProcedure: 'https://images.unsplash.com/photo-1548767797-d8c844163c4c?auto=format&fit=crop&w=600&q=80',
  tutorReviewer: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80'
};

export const PublicVetProfilePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [profile, setProfile] = useState<PublicVetProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active theme: CLASSIC (Modelo 1), MODERN (Modelo 2), BIOLINK (Modelo 3)
  const rawTheme = searchParams.get('layout') || profile?.public_layout_theme || 'CLASSIC';
  const currentTheme = rawTheme === 'HOME_CARE' ? 'MODERN' : (rawTheme as 'CLASSIC' | 'MODERN' | 'BIOLINK');

  // Test banner visibility (can be toggled or hidden for pure tutor view)
  const isExplicitTutor = searchParams.get('preview') === 'false';
  const [showTestBanner, setShowTestBanner] = useState(!isExplicitTutor);

  // Interactive booking modal
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  // Calendar selection state
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState<Date>(() => new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });
  const [selectedTime, setSelectedTime] = useState<string>('09:00');

  // Determina o status da data no calendário
  const getDayStatus = (dateStr: string): 'CONFIRMED' | 'REQUESTABLE' | 'BLOCKED' | 'PAST' => {
    if (!profile) return 'REQUESTABLE';
    const todayStr = new Date().toISOString().split('T')[0];
    if (dateStr < todayStr) {
      return 'PAST';
    }

    if (Array.isArray(profile.blocked_dates) && profile.blocked_dates.includes(dateStr)) {
      return 'BLOCKED';
    }

    const mode = profile.availability_mode || 'SPECIFIC_DATES';

    if (mode === 'SPECIFIC_DATES') {
      if (Array.isArray(profile.available_dates) && profile.available_dates.includes(dateStr)) {
        return 'CONFIRMED';
      }
      return 'REQUESTABLE';
    }

    if (mode === 'WEEKDAYS') {
      const parts = dateStr.split('-').map(Number);
      const dt = new Date(parts[0], parts[1] - 1, parts[2]);
      const dayOfWeek = dt.getDay();
      const weekdays = Array.isArray(profile.available_weekdays) && profile.available_weekdays.length > 0
        ? profile.available_weekdays
        : [1, 2, 3, 4, 5];
      if (weekdays.includes(dayOfWeek)) {
        return 'CONFIRMED';
      }
      return 'REQUESTABLE';
    }

    if (mode === 'ALL_REQUESTABLE') {
      return 'REQUESTABLE';
    }

    return 'REQUESTABLE';
  };

  // Booking Form State
  const [form, setForm] = useState<PublicConsultationRequest>({
    tutor_name: '',
    tutor_phone: '',
    tutor_email: '',
    pet_name: '',
    pet_species: 'Canina',
    pet_breed: '',
    pet_age: '',
    consultation_type: 'DOMICILIAR',
    address: '',
    preferred_date: '',
    preferred_period: 'MANHA',
    reason: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState<{
    message: string;
    whatsapp_url?: string | null;
  } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);

    api.getPublicVetProfile(slug)
      .then((data) => {
        setProfile(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Página profissional não encontrada.');
        setLoading(false);
      });
  }, [slug]);

  // Fecha o modal ao pressionar a tecla ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isBookingModalOpen) {
        setIsBookingModalOpen(false);
        setBookingSuccess(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isBookingModalOpen]);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug) return;

    if (!form.tutor_name.trim() || !form.tutor_phone.trim() || !form.pet_name.trim() || !form.reason.trim()) {
      setFormError('Por favor, preencha todos os campos obrigatórios marcados com asterisco (*).');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const res = await api.submitPublicConsultationRequest(slug, form);
      setBookingSuccess({
        message: res.message || 'Solicitação de consulta enviada com sucesso!',
        whatsapp_url: res.whatsapp_url,
      });
    } catch (err: any) {
      setFormError(err.message || 'Ocorreu um erro ao enviar sua solicitação. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-emerald-700 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-semibold text-slate-500">
            Carregando página profissional...
          </p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-xl border border-slate-200 space-y-4">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-100">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Página Não Encontrada</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            {error || 'O link informado não corresponde a uma página profissional ativa no sistema.'}
          </p>
          <div className="pt-2">
            <Link
              to="/login"
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition"
            >
              Conhecer o Vetgo
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const cleanPhone = (profile.whatsapp || profile.phone || '').replace(/\D/g, '');
  const directWaUrl = cleanPhone
    ? `https://wa.me/${cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`}?text=${encodeURIComponent(
        profile.custom_welcome_message || `Olá Dr(a). ${profile.first_name}! Gostaria de informações sobre atendimento veterinário domiciliar.`
      )}`
    : null;

  const vetFullName = `Dr(a). ${profile.first_name} ${profile.last_name}`.trim();
  const crmvLabel = profile.crmv ? `CRMV-${profile.crmv_uf || 'SP'} ${profile.crmv}` : 'CRMV Ativo';
  const regionLabel = profile.service_regions || 'Região de São Paulo - SP e Metropolitana';
  const vetPhoto = profile.about_image_url || profile.logo_url || ASSETS.defaultVetDoctor;
  const heroPhoto = profile.hero_image_url || ASSETS.heroVetWithPets;
  const bannerPhoto = profile.banner_image_url || ASSETS.bannerDogAndCat;

  const activeServices = (profile.services && profile.services.length > 0)
    ? profile.services.filter(s => s.show_on_public_page !== false)
    : [
        { id: 1, name: 'Consulta Clínica Domiciliar', category: 'CONSULTA', price: 180, description: 'Avaliação completa da saúde do seu pet no aconchego do lar' },
        { id: 2, name: 'Vacinação & Imunização', category: 'VACINA', price: 120, description: 'Protocolos vacinais completos e personalizados' },
        { id: 3, name: 'Coleta de Exames Laboratoriais', category: 'EXAME', price: 60, description: 'Coleta domiciliar com parceiros laboratoriais certificados' },
        { id: 4, name: 'Procedimentos Clínicos de Rotina', category: 'PROCEDIMENTO', price: 90, description: 'Curativos, medicações, higienização e outros procedimentos' },
      ];

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case 'VACINA': return Syringe;
      case 'EXAME': return TestTube;
      case 'CONSULTA': return Stethoscope;
      default: return Bandage;
    }
  };

  const getCategoryPhoto = (category?: string, customPhoto?: string | null) => {
    if (customPhoto) return customPhoto;
    switch (category) {
      case 'VACINA': return ASSETS.serviceVaccine;
      case 'EXAME': return ASSETS.serviceExam;
      case 'CONSULTA': return ASSETS.serviceConsultation;
      default: return ASSETS.serviceProcedure;
    }
  };

  const handleSelectService = (svc: any) => {
    setForm(prev => ({
      ...prev,
      service_id: svc.id,
      reason: `Solicitação para ${svc.name}`
    }));
    setIsBookingModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* ------------------------------------------------------------- */}
      {/* TEST / PREVIEW BAR (Toggle between the 3 models easily)       */}
      {/* ------------------------------------------------------------- */}
      {showTestBanner && (
        <div className="bg-slate-900 text-slate-100 py-2.5 px-3 sm:px-6 text-xs border-b border-slate-800 sticky top-0 z-50 shadow-md">
          <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5" />
                Alternar Modelo:
              </span>
              <span className="hidden md:inline text-slate-400">
                (Clique para testar cada um dos 3 modelos na prática)
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setSearchParams({ layout: 'CLASSIC' })}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  currentTheme === 'CLASSIC'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
              >
                <span>Modelo 1 — Profissional / Clínico</span>
              </button>

              <button
                onClick={() => setSearchParams({ layout: 'MODERN' })}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  currentTheme === 'MODERN'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
              >
                <span>Modelo 2 — Moderno / Visual</span>
              </button>

              <button
                onClick={() => setSearchParams({ layout: 'BIOLINK' })}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  currentTheme === 'BIOLINK'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
              >
                <span>Modelo 3 — Perfil / Cartão</span>
              </button>

              <button
                onClick={() => setShowTestBanner(false)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-white text-xs font-semibold ml-1 transition cursor-pointer flex items-center gap-1"
                title="Ocultar barra para ver exatamente o que o tutor vê"
              >
                <span>👁️ Ver como Tutor</span>
              </button>

              <Link
                to="/configuracoes?tab=pagina_publica"
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium ml-1 transition"
              >
                ← Ajustes
              </Link>

              <button
                onClick={() => setShowTestBanner(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition"
                title="Fechar barra"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating button to reopen the model switcher when hidden */}
      {!showTestBanner && (
        <button
          onClick={() => setShowTestBanner(true)}
          className="fixed bottom-4 right-4 z-40 bg-slate-900/90 hover:bg-slate-900 text-white text-[11px] font-bold py-2 px-3.5 rounded-full shadow-lg border border-slate-700 flex items-center gap-1.5 backdrop-blur-xs transition cursor-pointer"
          title="Reabrir alternador de modelos"
        >
          <Sliders className="w-3.5 h-3.5 text-emerald-400" />
          <span>Alternar Modelos</span>
        </button>
      )}

      {/* ------------------------------------------------------------- */}
      {/* RENDER THE SELECTED MODEL                                     */}
      {/* ------------------------------------------------------------- */}
      {currentTheme === 'CLASSIC' && renderModelo1ProfissionalClinico()}
      {currentTheme === 'MODERN' && renderModelo2ModernoVisual()}
      {currentTheme === 'BIOLINK' && renderModelo3PerfilCartao()}

      {/* ------------------------------------------------------------- */}
      {/* INTERACTIVE APPOINTMENT REQUEST MODAL                         */}
      {/* ------------------------------------------------------------- */}
      {isBookingModalOpen && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsBookingModalOpen(false);
              setBookingSuccess(null);
            }
          }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-xl rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 my-8 cursor-default"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 block">
                  Solicitação de Atendimento
                </span>
                <h3 className="text-lg font-bold text-slate-900">
                  Agende uma consulta com {vetFullName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsBookingModalOpen(false);
                  setBookingSuccess(null);
                }}
                className="p-2 text-slate-400 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition cursor-pointer"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {renderBookingFormInner()}
          </div>
        </div>
      )}
    </div>
  );

  // =========================================================================
  // CALENDÁRIO INTERATIVO DE DISPONIBILIDADE & VAGAS
  // =========================================================================
  function renderAvailabilityCalendar(variant: 'compact' | 'full' = 'full') {
    if (!profile) return null;

    if (profile.show_availability_calendar === false) {
      return (
        <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-center space-y-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Agendamento Sob Consulta</h4>
            <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
              Os horários são combinados diretamente conforme sua necessidade e a rota do dia.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsBookingModalOpen(true)}
            className="w-full py-2.5 px-3 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold transition shadow-2xs cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Solicitar Atendimento</span>
          </button>
        </div>
      );
    }

    const year = currentCalendarMonth.getFullYear();
    const month = currentCalendarMonth.getMonth();
    const monthName = currentCalendarMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const selectedStatus = getDayStatus(selectedCalendarDate);
    const availableSlots = profile.available_slots && profile.available_slots.length > 0
      ? profile.available_slots
      : ['08:00', '09:30', '11:00', '14:00', '15:30', '17:00'];

    const [sYear, sMonth, sDay] = selectedCalendarDate.split('-').map(Number);
    const selectedDateObj = new Date(sYear, sMonth - 1, sDay);
    const formattedSelectedDate = selectedDateObj.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

    const isCompact = variant === 'compact';

    return (
      <div className={`space-y-3.5 ${isCompact ? '' : 'max-w-4xl mx-auto'}`}>
        {!isCompact && (
          <div className="text-center space-y-1.5 mb-6">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
              📅 Agenda & Vagas
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Consulte a disponibilidade de datas
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto">
              Veja os dias com vagas confirmadas ou solicite atendimento para verificar disponibilidade na sua região.
            </p>
          </div>
        )}

        <div className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-6 shadow-xs space-y-4">
          {/* Calendar Header with Month Navigation */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
              <span className="text-xs sm:text-sm font-bold text-slate-900 capitalize">
                {monthName}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentCalendarMonth(new Date(year, month - 1, 1))}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                title="Mês Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentCalendarMonth(new Date())}
                className="px-2.5 py-1 text-[11px] font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg cursor-pointer"
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={() => setCurrentCalendarMonth(new Date(year, month + 1, 1))}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                title="Próximo Mês"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d, i) => (
              <span key={i} className="font-bold text-slate-400 py-1 text-[11px]">
                {d}
              </span>
            ))}

            {/* Empty days before 1st of month */}
            {[...Array(firstDayIndex)].map((_, i) => (
              <div key={`emp-${i}`} className="py-2"></div>
            ))}

            {/* Days of Month */}
            {[...Array(daysInMonth)].map((_, i) => {
              const day = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const status = getDayStatus(dateStr);
              const isSelected = selectedCalendarDate === dateStr;

              let style = 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100';
              let badge = '';

              if (status === 'PAST') {
                style = 'bg-slate-50/40 text-slate-300 border-transparent cursor-not-allowed opacity-40';
              } else if (status === 'BLOCKED') {
                style = 'bg-rose-50/60 text-rose-400 border-rose-100 cursor-not-allowed opacity-60';
                badge = 'Folga';
              } else if (status === 'CONFIRMED') {
                style = isSelected
                  ? 'bg-emerald-700 text-white border-emerald-800 shadow-sm font-black ring-2 ring-emerald-600'
                  : 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100 font-bold';
                badge = 'Vagas';
              } else {
                style = isSelected
                  ? 'bg-slate-800 text-white border-slate-900 shadow-sm font-bold ring-2 ring-slate-700'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400';
                badge = 'Consulta';
              }

              return (
                <button
                  key={dateStr}
                  type="button"
                  disabled={status === 'PAST' || status === 'BLOCKED'}
                  onClick={() => setSelectedCalendarDate(dateStr)}
                  className={`py-1.5 px-1 rounded-xl border text-xs font-semibold transition flex flex-col items-center justify-between min-h-[50px] sm:min-h-[54px] cursor-pointer ${style}`}
                >
                  <span className="text-xs leading-none">{day}</span>
                  {badge && (
                    <span
                      className={`text-[8px] sm:text-[9px] font-bold leading-tight uppercase px-1 py-0.5 rounded ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : status === 'CONFIRMED'
                          ? 'bg-emerald-200/80 text-emerald-900'
                          : status === 'BLOCKED'
                          ? 'bg-rose-100 text-rose-700'
                          : 'text-slate-400'
                      }`}
                    >
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legenda Informativa */}
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-600">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
              <strong>Vagas Confirmadas</strong>
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block border border-slate-400"></span>
              <strong>Sob Consulta</strong> (Verificar agendamento)
            </span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-200 inline-block"></span>
              Sem Atendimento
            </span>
          </div>

          {/* Card Dinâmico da Data Selecionada */}
          <div className="pt-2">
            <div
              className={`p-4 rounded-2xl border transition space-y-3 ${
                selectedStatus === 'CONFIRMED'
                  ? 'bg-emerald-50/70 border-emerald-300'
                  : selectedStatus === 'REQUESTABLE'
                  ? 'bg-slate-50 border-slate-200'
                  : 'bg-rose-50 border-rose-200'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Data Selecionada
                  </span>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 capitalize flex items-center gap-2">
                    <span>{formattedSelectedDate}</span>
                    {selectedStatus === 'CONFIRMED' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                        🟢 Vagas Abertas
                      </span>
                    )}
                    {selectedStatus === 'REQUESTABLE' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                        ⚪ Sob Consulta
                      </span>
                    )}
                  </h4>
                </div>

                <div className="sm:text-right">
                  <span className="text-[11px] text-slate-600">
                    {selectedStatus === 'CONFIRMED'
                      ? 'Escolha um horário para pré-agendar:'
                      : 'Solicite para verificar disponibilidade de rota'}
                  </span>
                </div>
              </div>

              {/* Se a data tem Vagas Confirmadas: exibe chips de horários */}
              {selectedStatus === 'CONFIRMED' && (
                <div className="space-y-2 pt-1 border-t border-emerald-200/60">
                  <span className="text-[11px] font-bold text-emerald-950 block">
                    Horários disponíveis para este dia:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {availableSlots.map((timeSlot) => (
                      <button
                        key={timeSlot}
                        type="button"
                        onClick={() => {
                          setSelectedTime(timeSlot);
                          const period = Number(timeSlot.split(':')[0]) < 12 ? 'MANHA' : Number(timeSlot.split(':')[0]) < 18 ? 'TARDE' : 'NOITE';
                          setForm((prev) => ({
                            ...prev,
                            preferred_date: selectedCalendarDate,
                            preferred_period: period,
                            reason: prev.reason || `Agendamento pré-selecionado para ${selectedCalendarDate} às ${timeSlot}`,
                          }));
                          setIsBookingModalOpen(true);
                        }}
                        className="py-2 px-2.5 rounded-xl text-xs font-bold bg-white hover:bg-emerald-800 hover:text-white border border-emerald-300 text-emerald-900 transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer group"
                      >
                        <Clock className="w-3.5 h-3.5 text-emerald-600 group-hover:text-white" />
                        <span>{timeSlot}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Se a data está Sob Consulta (Verificar Agendamento) */}
              {selectedStatus === 'REQUESTABLE' && (
                <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-slate-200/60">
                  <p className="text-[11px] text-slate-600 leading-relaxed max-w-md">
                    O(A) médico(a) veterinário(a) confirmará a viabilidade de horário na sua região via WhatsApp ou sistema.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setForm((prev) => ({
                        ...prev,
                        preferred_date: selectedCalendarDate,
                        preferred_period: 'QUALQUER',
                        reason: prev.reason || `Solicitação de verificação de atendimento para o dia ${selectedCalendarDate}`,
                      }));
                      setIsBookingModalOpen(true);
                    }}
                    className="py-2.5 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Verificar Agendamento neste Dia</span>
                  </button>
                </div>
              )}

              {/* Aviso customizado configurado pelo veterinário */}
              {profile.availability_notice && (
                <div className="pt-2 text-[11px] text-slate-500 italic border-t border-slate-100 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{profile.availability_notice}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // MODELO 1 — PROFISSIONAL / CLÍNICO (Mais sóbrio e institucional)
  // =========================================================================
  function renderModelo1ProfissionalClinico() {
    if (!profile) return null;
    return (
      <div className="flex-1 flex flex-col bg-white">
        {/* Navigation Bar */}
        <nav className="bg-white border-b border-slate-100 sticky top-0 z-40">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AppLogo size="sm" />
            </div>

            <div className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600">
              <a href="#inicio" className="hover:text-emerald-700 transition">Início</a>
              <a href="#sobre" className="hover:text-emerald-700 transition">Sobre</a>
              <a href="#servicos" className="hover:text-emerald-700 transition">Serviços</a>
              <a href="#depoimentos" className="hover:text-emerald-700 transition">Depoimentos</a>
              <a href="#contato" className="hover:text-emerald-700 transition">Contato</a>
            </div>

            <button
              onClick={() => setIsBookingModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold transition shadow-xs cursor-pointer"
            >
              Solicitar agendamento
            </button>
          </div>
        </nav>

        {/* Hero Section */}
        <section id="inicio" className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            <div className="lg:col-span-7 space-y-6">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Cuidado veterinário onde seu pet se sente em casa
              </h1>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl">
                Atendimento veterinário domiciliar com qualidade, segurança e muito carinho.
              </p>

              <div className="space-y-2.5 text-xs font-semibold text-slate-700 pt-1">
                <div className="flex items-center gap-2.5">
                  <Home className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Atendimento domiciliar</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Heart className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Cães e gatos</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <MapPin className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>{regionLabel}</span>
                </div>
              </div>

              <div className="pt-3">
                <button
                  onClick={() => setIsBookingModalOpen(true)}
                  className="px-6 py-3.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs sm:text-sm font-bold transition shadow-sm cursor-pointer inline-flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Solicitar agendamento</span>
                </button>
              </div>
            </div>

            <div className="lg:col-span-5 relative">
              <div className="rounded-3xl overflow-hidden shadow-lg border border-slate-100 bg-slate-50">
                <img
                  src={heroPhoto}
                  alt="Veterinária atendendo cão e gato em casa"
                  className="w-full h-80 sm:h-96 object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Quick Category Pill Cards */}
        <section className="bg-slate-50/70 border-y border-slate-100 py-6">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {[
                { label: 'Atendimento domiciliar', icon: Home },
                { label: 'Consulta clínica', icon: Stethoscope },
                { label: 'Vacinação', icon: Syringe },
                { label: 'Coleta de exames', icon: TestTube },
                { label: 'Procedimentos de rotina', icon: Bandage },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-2xl p-3.5 text-center border border-slate-200/80 shadow-2xs space-y-1.5 flex flex-col items-center justify-center hover:border-emerald-300 transition"
                >
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center">
                    <item.icon className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-800 leading-tight">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Sobre mim Section */}
        <section id="sobre" className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-10 shadow-xs">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
              <div className="md:col-span-4">
                <div className="relative rounded-2xl overflow-hidden shadow-md max-w-xs mx-auto border-2 border-emerald-100">
                  <img
                    src={vetPhoto}
                    alt={vetFullName}
                    className="w-full h-72 object-cover"
                  />
                  <div className="absolute top-2 right-2 bg-emerald-600 text-white p-1 rounded-full shadow-xs">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                </div>
              </div>

              <div className="md:col-span-8 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                  Sobre mim
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {vetFullName}
                </h2>
                <div className="inline-block text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">
                  {crmvLabel}
                </div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pt-2">
                  {profile.bio ||
                    'Sou médica veterinária especializada em clínica de pequenos animais, com foco em atendimento domiciliar. Acredito em um atendimento individualizado, com respeito, ética e muito carinho, proporcionando mais conforto e bem-estar para os pets e seus tutores.'}
                </p>
                <div className="pt-2 flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Atendimento sem estresse
                  </span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Horários flexíveis
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Serviços oferecidos */}
        <section id="servicos" className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Serviços oferecidos
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Atendimentos clínicos e preventivos realizados com estrutura completa
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {activeServices.map((svc) => {
              const IconComp = getCategoryIcon(svc.category);
              return (
                <div
                  key={svc.id}
                  onClick={() => handleSelectService(svc)}
                  className="bg-emerald-50/40 border border-emerald-100 rounded-2xl p-5 space-y-3 hover:border-emerald-300 transition cursor-pointer flex flex-col justify-between group shadow-2xs hover:shadow-xs"
                >
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-white text-emerald-800 flex items-center justify-center shadow-2xs group-hover:bg-emerald-700 group-hover:text-white transition">
                      <IconComp className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-900 transition">
                      {svc.name}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {svc.public_description || svc.description || 'Atendimento veterinário com rigor técnico, conforto e carinho.'}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-emerald-100/60 flex items-center justify-between text-[11px] font-bold text-emerald-700 group-hover:translate-x-0.5 transition">
                    <span>Solicitar este atendimento</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Calendário de Disponibilidade & Agendamento */}
        {profile.show_availability_calendar !== false && (
          <section id="disponibilidade" className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
            {renderAvailabilityCalendar('full')}
          </section>
        )}

        {/* Espécies atendidas & Área de atendimento */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Espécies */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 space-y-4">
              <h3 className="text-base font-bold text-slate-900">Espécies atendidas</h3>
              <div className="flex items-center gap-8 pt-2">
                <div className="text-center space-y-2">
                  <img
                    src={ASSETS.dogAvatar}
                    alt="Cães"
                    className="w-20 h-20 rounded-full object-cover border-3 border-emerald-100 shadow-xs mx-auto"
                  />
                  <span className="text-xs font-bold text-slate-800 block">Cães</span>
                </div>
                <div className="text-center space-y-2">
                  <img
                    src={ASSETS.catAvatar}
                    alt="Gatos"
                    className="w-20 h-20 rounded-full object-cover border-3 border-emerald-100 shadow-xs mx-auto"
                  />
                  <span className="text-xs font-bold text-slate-800 block">Gatos</span>
                </div>
              </div>
            </div>

            {/* Área de atendimento */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 space-y-4">
              <h3 className="text-base font-bold text-slate-900">Área de atendimento</h3>
              <div className="flex items-start gap-4 pt-1">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0 border border-emerald-100">
                  <MapPin className="w-6 h-6" />
                </div>
                <div className="space-y-1.5 text-xs text-slate-600">
                  <strong className="text-slate-900 font-bold block">Atendimento em domicílio:</strong>
                  <p className="leading-relaxed">
                    {profile.service_regions || 'São Paulo - SP · Guarulhos · Arujá · Mogi das Cruzes · Região metropolitana'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Depoimentos Carousel Card */}
        <section id="depoimentos" className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Depoimentos
            </h2>
            <div className="bg-emerald-50/50 border border-emerald-100 rounded-3xl p-6 sm:p-8 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <img
                  src={ASSETS.tutorReviewer}
                  alt="Carla Menezes"
                  className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-xs shrink-0"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-amber-500">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-current" />
                    ))}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-700 italic">
                    "Excelente profissional! Muito atenciosa, cuidadosa e meu pet se sentiu super à vontade em casa."
                  </p>
                  <span className="text-xs font-bold text-slate-900 block">Carla Menezes — Tutora do Bento</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final Dark Banner CTA */}
        <section id="contato" className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="bg-emerald-850 bg-gradient-to-r from-emerald-900 to-teal-900 text-white rounded-3xl p-6 sm:p-10 shadow-lg flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
            <div className="flex items-center gap-6">
              <img
                src={bannerPhoto}
                alt="Pet"
                className="w-24 h-20 rounded-2xl object-cover border-2 border-emerald-500/40 shrink-0 hidden sm:block"
              />
              <div className="space-y-1.5">
                <h3 className="text-xl sm:text-2xl font-extrabold">Agende um atendimento</h3>
                <p className="text-xs sm:text-sm text-emerald-100 max-w-md">
                  Preencha o formulário e envie sua solicitação. Retornarei o mais breve possível para confirmar o horário.
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsBookingModalOpen(true)}
              className="px-6 py-3 rounded-xl bg-white text-emerald-950 hover:bg-emerald-50 text-xs sm:text-sm font-bold transition shadow-sm cursor-pointer whitespace-nowrap"
            >
              Solicitar agendamento
            </button>
          </div>
        </section>

        {/* Footer */}
        {renderSharedFooter()}
      </div>
    );
  }

  // =========================================================================
  // MODELO 2 — MODERNO / VISUAL (Mais chamativo e moderno)
  // =========================================================================
  function renderModelo2ModernoVisual() {
    if (!profile) return null;
    return (
      <div className="flex-1 flex flex-col bg-white">
        {/* Navigation Bar */}
        <nav className="bg-white border-b border-slate-100 sticky top-0 z-40">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AppLogo size="sm" />
            </div>

            <div className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600">
              <a href="#inicio-m2" className="hover:text-emerald-700 transition">Início</a>
              <a href="#servicos-m2" className="hover:text-emerald-700 transition">Serviços</a>
              <a href="#sobre-m2" className="hover:text-emerald-700 transition">Sobre</a>
              <a href="#depoimentos-m2" className="hover:text-emerald-700 transition">Depoimentos</a>
              <a href="#contato-m2" className="hover:text-emerald-700 transition">Contato</a>
            </div>

            <button
              onClick={() => setIsBookingModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold transition shadow-xs cursor-pointer"
            >
              Agendar atendimento
            </button>
          </div>
        </nav>

        {/* Playful Hero Section */}
        <section id="inicio-m2" className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="space-y-2">
                <span className="text-emerald-600 font-serif italic text-lg sm:text-xl flex items-center gap-1.5">
                  Bem-estar para o seu pet,
                  <Heart className="w-5 h-5 text-emerald-600 fill-current inline" />
                </span>
                <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
                  sem sair de casa
                </h1>
              </div>

              <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl">
                Atendimento veterinário domiciliar com qualidade, conforto e muito carinho para cães e gatos.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={() => setIsBookingModalOpen(true)}
                  className="px-5 py-3 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs sm:text-sm font-bold transition shadow-xs cursor-pointer"
                >
                  Agendar atendimento
                </button>

                {directWaUrl && (
                  <a
                    href={directWaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold transition flex items-center gap-2 cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-600 fill-current" />
                    <span>Falar no WhatsApp</span>
                  </a>
                )}
              </div>
            </div>

            <div className="lg:col-span-5 relative">
              <div className="rounded-3xl overflow-hidden shadow-lg border border-slate-100 bg-emerald-50/50">
                <img
                  src={heroPhoto}
                  alt="Veterinária com cão e gato"
                  className="w-full h-80 sm:h-96 object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Category Icons Strip */}
        <section className="bg-slate-50 border-y border-slate-100 py-6">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {[
                { label: 'Consulta clínica', icon: Stethoscope },
                { label: 'Vacinação', icon: Syringe },
                { label: 'Exames', icon: TestTube },
                { label: 'Procedimentos', icon: Bandage },
                { label: 'Atendimento domiciliar', icon: Home },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-2xl p-3.5 text-center border border-slate-200/80 shadow-2xs space-y-1.5 flex flex-col items-center justify-center hover:border-emerald-300 transition"
                >
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center">
                    <item.icon className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-800 leading-tight">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Por que atendimento domiciliar? (4 circular cards) */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Por que atendimento domiciliar?
            </h2>
            <p className="text-xs text-slate-500">
              Menos estresse e muito mais conforto para o seu companheiro
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                title: 'Mais conforto para o seu pet',
                icon: Home,
                color: 'bg-emerald-50 text-emerald-700'
              },
              {
                title: 'Menos estresse',
                icon: Heart,
                color: 'bg-emerald-50 text-emerald-700'
              },
              {
                title: 'Atendimento personalizado',
                icon: UserCheck,
                color: 'bg-emerald-50 text-emerald-700'
              },
              {
                title: 'Qualidade e segurança',
                icon: ShieldCheck,
                color: 'bg-emerald-50 text-emerald-700'
              }
            ].map((card, idx) => (
              <div
                key={idx}
                className="bg-white border border-slate-200/80 rounded-2xl p-5 text-center space-y-3 shadow-2xs hover:border-emerald-300 transition"
              >
                <div className={`w-12 h-12 rounded-full ${card.color} flex items-center justify-center mx-auto`}>
                  <card.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xs font-bold text-slate-800">{card.title}</h3>
              </div>
            ))}
          </div>
        </section>

        {/* Sobre mim (Modern Layout with Heart Doodles) */}
        <section id="sobre-m2" className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="bg-emerald-50/30 border border-emerald-100 rounded-3xl p-6 sm:p-10 shadow-2xs">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
              <div className="md:col-span-5">
                <div className="rounded-2xl overflow-hidden shadow-md max-w-sm mx-auto">
                  <img
                    src={vetPhoto}
                    alt={vetFullName}
                    className="w-full h-80 object-cover"
                  />
                </div>
              </div>

              <div className="md:col-span-7 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                  Sobre mim
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {vetFullName}
                </h2>
                <div className="text-xs font-bold text-slate-500">
                  {crmvLabel}
                </div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pt-1">
                  {profile.bio ||
                    'Médica veterinária apaixonada por animais, com experiência em clínica de pequenos animais e atendimento domiciliar. Meu objetivo é oferecer um atendimento humanizado, com foco na saúde, bem-estar e qualidade de vida do seu pet.'}
                </p>
                <div className="pt-3">
                  <button
                    onClick={() => setIsBookingModalOpen(true)}
                    className="px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    Conheça minha história
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Principais serviços (Photographic Cards) */}
        <section id="servicos-m2" className="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Principais serviços
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Atendimentos completos com equipamentos portáteis modernos
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {activeServices.map((svc) => {
              const photo = getCategoryPhoto(svc.category, svc.photo_url);
              return (
                <div
                  key={svc.id}
                  onClick={() => handleSelectService(svc)}
                  className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs hover:shadow-md transition cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="relative h-36 w-full overflow-hidden bg-slate-100">
                      <img
                        src={photo}
                        alt={svc.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                    </div>
                    <div className="p-3 text-center space-y-1">
                      <h4 className="text-xs font-bold text-slate-900 group-hover:text-emerald-800 transition line-clamp-1">
                        {svc.name}
                      </h4>
                      <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">
                        {svc.public_description || svc.description || 'Atendimento domiciliar de excelência.'}
                      </p>
                    </div>
                  </div>
                  <div className="p-2.5 pt-0 text-center">
                    <span className="text-[10px] font-bold text-emerald-700 block">
                      Agendar Atendimento →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Calendário de Disponibilidade & Agendamento */}
        {profile.show_availability_calendar !== false && (
          <section id="disponibilidade-m2" className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
            {renderAvailabilityCalendar('full')}
          </section>
        )}

        {/* Agende um atendimento Card */}
        <section id="contato-m2" className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 sm:p-10 shadow-xs">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
              <div className="md:col-span-7 space-y-4">
                <h3 className="text-2xl sm:text-3xl font-extrabold text-emerald-950">
                  Agende um atendimento
                </h3>
                <p className="text-xs sm:text-sm text-emerald-800 leading-relaxed">
                  Escolha a data e horário e envie sua solicitação. Retornarei para confirmar.
                </p>
                <div>
                  <button
                    onClick={() => setIsBookingModalOpen(true)}
                    className="px-6 py-3 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs sm:text-sm font-bold transition shadow-xs cursor-pointer"
                  >
                    Agendar agora
                  </button>
                </div>
              </div>

              <div className="md:col-span-5">
                <img
                  src={bannerPhoto}
                  alt="Pet"
                  className="rounded-2xl object-cover shadow-sm w-full h-44"
                />
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-emerald-200/60 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-semibold text-emerald-900">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-emerald-700" />
                <span>Cães e gatos</span>
              </div>
              <div className="flex items-center gap-2">
                <Home className="w-4 h-4 text-emerald-700" />
                <span>Atendimento domiciliar</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-700" />
                <span>{regionLabel}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        {renderSharedFooter()}
      </div>
    );
  }

  // =========================================================================
  // MODELO 3 — PERFIL / CARTÃO PROFISSIONAL (BioLink - Mais compacto e direto)
  // =========================================================================
  function renderModelo3PerfilCartao() {
    if (!profile) return null;
    return (
      <div className="flex-1 flex flex-col bg-slate-50 py-4 sm:py-8">
        <main className="max-w-md w-full mx-auto px-4 space-y-4">
          {/* Card Container */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-md overflow-hidden">
            {/* Header / Brand */}
            <div className="px-5 py-3.5 flex items-center justify-between border-b border-slate-100">
              <AppLogo size="sm" />
              <button
                onClick={() => setIsBookingModalOpen(true)}
                className="text-slate-600 hover:text-slate-900 p-1 rounded-lg"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>

            {/* Top Banner (Dog and Cat) */}
            <div className="h-32 sm:h-36 w-full relative bg-slate-100 overflow-hidden">
              <img
                src={bannerPhoto}
                alt="Banner Pets"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Profile Avatar & Info Overlap */}
            <div className="px-5 pt-0 pb-6 space-y-4">
              <div className="flex items-end gap-3.5 -mt-10 relative z-10">
                <img
                  src={vetPhoto}
                  alt={vetFullName}
                  className="w-20 h-20 rounded-2xl object-cover border-4 border-white shadow-md bg-white shrink-0"
                />
                <div className="pb-1">
                  <div className="flex items-center gap-1.5">
                    <h1 className="text-base sm:text-lg font-extrabold text-slate-900 leading-tight">
                      {vetFullName}
                    </h1>
                    <span className="text-emerald-600 font-bold" title="Veterinário(a) Verificado(a)">
                      <CheckCircle2 className="w-4 h-4 fill-emerald-600 text-white" />
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-500 block">
                    {crmvLabel}
                  </span>
                  <span className="text-[11px] text-slate-600 block">
                    Atendimento veterinário domiciliar
                  </span>
                  <span className="text-[11px] text-emerald-800 font-medium flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-emerald-700" />
                    {regionLabel}
                  </span>
                </div>
              </div>

              {/* Bio snippet */}
              <p className="text-xs text-slate-600 leading-relaxed">
                {profile.bio ||
                  'Cuidado, saúde e bem-estar para o seu pet no conforto do seu lar. Atendimento humanizado, com muito carinho e profissionalismo.'}
              </p>

              {/* 2x2 Quick Action Buttons */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  onClick={() => setIsBookingModalOpen(true)}
                  className="py-2.5 px-3 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Solicitar atendimento</span>
                </button>

                {directWaUrl ? (
                  <a
                    href={directWaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 px-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600 fill-current" />
                    <span>WhatsApp</span>
                  </a>
                ) : (
                  <button
                    onClick={() => setIsBookingModalOpen(true)}
                    className="py-2.5 px-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Contato</span>
                  </button>
                )}

                {profile.instagram ? (
                  <a
                    href={`https://instagram.com/${profile.instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 px-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Instagram className="w-3.5 h-3.5 text-rose-600" />
                    <span>Instagram</span>
                  </a>
                ) : (
                  <button
                    onClick={handleShare}
                    className="py-2.5 px-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>{copiedLink ? 'Copiado!' : 'Compartilhar'}</span>
                  </button>
                )}

                <button
                  onClick={() => setIsBookingModalOpen(true)}
                  className="py-2.5 px-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Stethoscope className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Ver serviços</span>
                </button>
              </div>

              {/* Serviços Strip */}
              <div className="pt-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900">Serviços</h3>
                  <button
                    onClick={() => setIsBookingModalOpen(true)}
                    className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
                  >
                    Ver todos &gt;
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {activeServices.slice(0, 4).map((s) => {
                    const IconComp = getCategoryIcon(s.category);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleSelectService(s)}
                        className="p-2.5 bg-slate-50 hover:bg-emerald-50/70 border border-slate-200/80 rounded-xl text-center space-y-1.5 transition cursor-pointer flex flex-col items-center justify-between"
                      >
                        <div className="w-8 h-8 rounded-lg bg-white border border-slate-200/80 flex items-center justify-center text-emerald-800 shadow-2xs">
                          <IconComp className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-bold text-slate-800 block leading-tight line-clamp-1">
                          {s.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Calendário de Disponibilidade & Agendamento */}
              <div className="pt-2">
                {renderAvailabilityCalendar('compact')}
              </div>

              {/* Espécies atendidas */}
              <div className="pt-2 space-y-2">
                <h3 className="text-xs font-bold text-slate-900">Espécies atendidas</h3>
                <div className="flex items-center gap-6">
                  <div className="text-center space-y-1">
                    <img
                      src={ASSETS.dogAvatar}
                      alt="Cães"
                      className="w-14 h-14 rounded-full object-cover border-2 border-emerald-100 shadow-2xs mx-auto"
                    />
                    <span className="text-[11px] font-bold text-slate-800 block">Cães</span>
                  </div>
                  <div className="text-center space-y-1">
                    <img
                      src={ASSETS.catAvatar}
                      alt="Gatos"
                      className="w-14 h-14 rounded-full object-cover border-2 border-emerald-100 shadow-2xs mx-auto"
                    />
                    <span className="text-[11px] font-bold text-slate-800 block">Gatos</span>
                  </div>
                </div>
              </div>

              {/* Área de atendimento pill */}
              <div className="pt-2 space-y-1.5">
                <h3 className="text-xs font-bold text-slate-900">Área de atendimento</h3>
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between text-xs font-medium text-slate-700">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-700" />
                    <span>{regionLabel}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>

              {/* Disponibilidade: Calendário & Horários Interativos (Configurável pelo Veterinário) */}
              <div className="pt-3">
                {renderAvailabilityCalendar('compact')}
              </div>

              {/* Avaliações de tutores */}
              <div className="pt-2 space-y-2">
                <h3 className="text-xs font-bold text-slate-900">Avaliações de tutores</h3>
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center gap-3">
                  <img
                    src={ASSETS.tutorReviewer}
                    alt="Carla Menezes"
                    className="w-10 h-10 rounded-full object-cover shrink-0"
                  />
                  <div className="space-y-0.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900">Carla Menezes</span>
                      <div className="flex text-amber-500">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-current" />
                        ))}
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-600 line-clamp-2">
                      "Excelente profissional! Muito atenciosa e meu pet se sentiu super à vontade em casa."
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Micro Footer inside Card */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <AppLogo size="sm" />
              <div className="flex items-center gap-2 text-slate-600">
                <Instagram className="w-4 h-4 cursor-pointer hover:text-emerald-700" />
                <MessageCircle className="w-4 h-4 cursor-pointer hover:text-emerald-700" />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // =========================================================================
  // SHARED FOOTER
  // =========================================================================
  function renderSharedFooter() {
    if (!profile) return null;
    return (
      <footer className="bg-slate-50 border-t border-slate-200 py-8 mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <AppLogo size="sm" />
            <span className="text-slate-300">·</span>
            <span className="text-xs text-slate-500">Veterinária onde você precisa</span>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
            <a href="#inicio" className="hover:text-emerald-800 transition">Início</a>
            <a href="#sobre" className="hover:text-emerald-800 transition">Sobre</a>
            <a href="#servicos" className="hover:text-emerald-800 transition">Serviços</a>
            <a href="#depoimentos" className="hover:text-emerald-800 transition">Depoimentos</a>
            <a href="#contato" className="hover:text-emerald-800 transition">Contato</a>
          </div>

          <div className="flex items-center gap-3 text-slate-600">
            <Instagram className="w-4 h-4 hover:text-emerald-700 cursor-pointer transition" />
            <MessageCircle className="w-4 h-4 hover:text-emerald-700 cursor-pointer transition" />
          </div>
        </div>
      </footer>
    );
  }

  // =========================================================================
  // INNER BOOKING FORM (USED IN MODAL AND PAGE)
  // =========================================================================
  function renderBookingFormInner() {
    if (bookingSuccess) {
      return (
        <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-emerald-950">
              Solicitação Recebida com Sucesso!
            </h3>
            <p className="text-xs text-emerald-800 mt-1 max-w-md mx-auto leading-relaxed">
              Os dados foram registrados no sistema de atendimento de {vetFullName}. Para uma confirmação imediata de horário, clique no botão abaixo para abrir a conversa no WhatsApp com a mensagem pronta.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
            {bookingSuccess.whatsapp_url && (
              <a
                href={bookingSuccess.whatsapp_url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold transition shadow-xs"
              >
                <MessageCircle className="w-4 h-4 fill-current" />
                <span>Confirmar Horário no WhatsApp</span>
              </a>
            )}

            <button
              type="button"
              onClick={() => {
                setBookingSuccess(null);
                setIsBookingModalOpen(false);
              }}
              className="w-full sm:w-auto px-5 py-3 rounded-xl border border-emerald-300 hover:bg-emerald-100/60 text-emerald-900 text-xs font-bold transition cursor-pointer"
            >
              Concluir e Fechar
            </button>
          </div>
        </div>
      );
    }

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {/* Section 1: Tutor */}
        <div className="space-y-2.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-1">
            1. Seus Dados
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Seu Nome Completo *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Mariana Costa"
                value={form.tutor_name}
                onChange={(e) => setForm({ ...form, tutor_name: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                WhatsApp com DDD *
              </label>
              <input
                type="tel"
                required
                placeholder="Ex: (11) 98765-4321"
                value={form.tutor_phone}
                onChange={(e) => setForm({ ...form, tutor_phone: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Pet */}
        <div className="space-y-2.5 pt-1">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-1">
            2. Dados do Pet
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nome do Pet *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Bento, Thor, Mel"
                value={form.pet_name}
                onChange={(e) => setForm({ ...form, pet_name: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Espécie *
              </label>
              <select
                value={form.pet_species}
                onChange={(e) => setForm({ ...form, pet_species: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none bg-white"
              >
                <option value="Canina">Canina (Cão)</option>
                <option value="Felina">Felina (Gato)</option>
                <option value="Outra">Outra espécie</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Raça / Idade
              </label>
              <input
                type="text"
                placeholder="Ex: Golden, 3 anos"
                value={form.pet_breed}
                onChange={(e) => setForm({ ...form, pet_breed: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Consultation */}
        <div className="space-y-2.5 pt-1">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-1">
            3. Atendimento Desejado
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Modalidade
              </label>
              <select
                value={form.consultation_type}
                onChange={(e) => setForm({ ...form, consultation_type: e.target.value as any })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none bg-white"
              >
                <option value="DOMICILIAR">Atendimento em Domicílio</option>
                <option value="CLINICA">Em Clínica / Consultório</option>
              </select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Data Desejada
                </label>
                {form.preferred_date && (
                  (() => {
                    const status = getDayStatus(form.preferred_date);
                    if (status === 'CONFIRMED') {
                      return (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          🟢 Com Vagas
                        </span>
                      );
                    }
                    if (status === 'REQUESTABLE') {
                      return (
                        <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                          ⚪ Sob Consulta
                        </span>
                      );
                    }
                    if (status === 'BLOCKED') {
                      return (
                        <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                          🚫 Folga / Indisponível
                        </span>
                      );
                    }
                    return null;
                  })()
                )}
              </div>
              <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={form.preferred_date}
                onChange={(e) => setForm({ ...form, preferred_date: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Período Preferido
              </label>
              <select
                value={form.preferred_period}
                onChange={(e) => setForm({ ...form, preferred_period: e.target.value as any })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none bg-white"
              >
                <option value="MANHA">Manhã (08h às 12h)</option>
                <option value="TARDE">Tarde (13h às 18h)</option>
                <option value="NOITE">Noite / Fim de tarde</option>
                <option value="QUALQUER">Qualquer horário</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Endereço / Bairro (para visita em casa)
            </label>
            <input
              type="text"
              placeholder="Ex: Moema, São Paulo - SP ou Rua..."
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none"
            />
          </div>

          {/* Seleção do Serviço Cadastrado */}
          {activeServices.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Serviço / Atendimento Desejado
              </label>
              <select
                value={form.service_id || ''}
                onChange={(e) => {
                  const id = Number(e.target.value);
                  const selectedSvc = activeServices.find((s) => s.id === id);
                  setForm({
                    ...form,
                    service_id: id || undefined,
                    reason: selectedSvc ? `Solicitação para ${selectedSvc.name}` : form.reason
                  });
                }}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none bg-white font-medium"
              >
                <option value="">Selecione um serviço ou especifique no motivo abaixo...</option>
                {activeServices.map((svc) => (
                  <option key={svc.id} value={svc.id}>
                    {svc.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Motivo da Consulta ou Observações *
            </label>
            <textarea
              required
              rows={2}
              placeholder="Ex: Vacinação e checkup anual, ou vômito desde ontem..."
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none"
            />
          </div>
        </div>

        <div className="pt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setIsBookingModalOpen(false);
              setBookingSuccess(null);
            }}
            className="w-1/3 py-3 px-4 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 py-3 px-6 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold transition shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Enviando solicitação...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Enviar Solicitação</span>
              </>
            )}
          </button>
        </div>
      </form>
    );
  }
};
