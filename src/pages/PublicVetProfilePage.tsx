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
  Instagram,
  X,
  FileText,
  Sliders,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { api } from '../services/api';
import { PublicVetProfile, PublicConsultationRequest } from '../types';
import { AppLogo } from '../components/AppLogo';
import { Footer } from '../components/Footer';

export const PublicVetProfilePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [profile, setProfile] = useState<PublicVetProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active theme (can be overridden via query param ?layout=CLASSIC | BIOLINK | HOME_CARE for instant testing)
  const currentTheme = (searchParams.get('layout') || profile?.public_layout_theme || 'CLASSIC') as 'CLASSIC' | 'BIOLINK' | 'HOME_CARE';

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

  // BioLink Modals/Toggles
  const [bioLinkModalOpen, setBioLinkModalOpen] = useState<'NONE' | 'BOOKING' | 'SERVICES' | 'AREAS'>('NONE');

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
      if (currentTheme === 'BIOLINK') {
        setBioLinkModalOpen('BOOKING');
      }
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
            Carregando página profissional do veterinário...
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
        profile.custom_welcome_message || `Olá Dr(a). ${profile.first_name}! Gostaria de informações sobre atendimento veterinário.`
      )}`
    : null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Interactive Template Testing Bar (Allows instant switching between the 3 models) */}
      <div className="bg-slate-900 text-slate-100 py-2 px-3 sm:px-6 text-xs border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-emerald-400 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" />
              Testar Modelo de Layout:
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setSearchParams({ layout: 'CLASSIC' })}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                currentTheme === 'CLASSIC'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <Stethoscope className="w-3.5 h-3.5" />
              <span>1. Clínico Clássico</span>
            </button>

            <button
              onClick={() => setSearchParams({ layout: 'BIOLINK' })}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                currentTheme === 'BIOLINK'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>2. BioLink Mobile</span>
            </button>

            <button
              onClick={() => setSearchParams({ layout: 'HOME_CARE' })}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                currentTheme === 'HOME_CARE'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              <span>3. Visita Domiciliar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Top Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AppLogo size="sm" />
            <span className="hidden sm:inline-block text-xs font-medium text-slate-300">·</span>
            <span className="hidden sm:inline-block text-xs font-semibold text-slate-600">
              Página Profissional Oficial
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/configuracoes?tab=pagina_publica"
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
            >
              <span>← Painel / Ajustes</span>
            </Link>

            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-xs font-medium transition cursor-pointer"
              title="Copiar link da página"
            >
              <Share2 className="w-3.5 h-3.5 text-slate-500" />
              <span>{copiedLink ? 'Link copiado!' : 'Compartilhar'}</span>
            </button>

            {directWaUrl && (
              <a
                href={directWaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5 fill-current" />
                <span className="hidden sm:inline">WhatsApp</span>
              </a>
            )}
          </div>
        </div>
      </header>

      {/* RENDER THE SELECTED THEME */}
      {currentTheme === 'CLASSIC' && renderClassicTheme()}
      {currentTheme === 'BIOLINK' && renderBioLinkTheme()}
      {currentTheme === 'HOME_CARE' && renderHomeCareTheme()}

      <Footer />
    </div>
  );

  // =========================================================================
  // TEMPLATE 1: CLÍNICO CLÁSSICO (Institucional & Autoridade Médica)
  // =========================================================================
  function renderClassicTheme() {
    return (
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8">
        {/* Hero Card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="relative shrink-0">
              {profile!.logo_url ? (
                <img
                  src={profile!.logo_url}
                  alt={`Dr(a). ${profile!.first_name} ${profile!.last_name}`}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-2 border-emerald-100 shadow-sm"
                />
              ) : (
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-emerald-800 text-emerald-100 flex items-center justify-center font-bold text-2xl sm:text-3xl border-2 border-emerald-100 shadow-sm">
                  {profile!.first_name.charAt(0)}
                  {profile!.last_name.charAt(0)}
                </div>
              )}
              <div
                className="absolute -bottom-2 -right-2 bg-emerald-600 text-white p-1 rounded-full border-2 border-white shadow-xs"
                title="Profissional com cadastro ativo"
              >
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>

            <div className="flex-1 text-center sm:text-left space-y-2">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                  {profile!.clinic_name || 'Médico(a) Veterinário(a)'}
                </span>
                <span className="text-slate-300">·</span>
                <span className="text-xs font-medium text-slate-500">
                  {profile!.crmv ? `CRMV-${profile!.crmv_uf || 'SP'} ${profile!.crmv}` : 'CRMV Ativo'}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Dr(a). {profile!.first_name} {profile!.last_name}
              </h1>

              {profile!.active_specialties && profile!.active_specialties.length > 0 && (
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs text-slate-600 font-medium pt-1">
                  {profile!.active_specialties.map((spec, idx) => (
                    <React.Fragment key={spec}>
                      <span>{spec}</span>
                      {idx < profile!.active_specialties!.length - 1 && (
                        <span className="text-slate-300">·</span>
                      )}
                    </React.Fragment>
                  ))}
                  {profile!.specialty_anesthesia_enabled && (
                    <>
                      <span className="text-slate-300">·</span>
                      <span className="text-emerald-700 font-semibold">Anestesiologia Veterinária</span>
                    </>
                  )}
                </div>
              )}

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl pt-2">
                {profile!.bio}
              </p>

              <div className="pt-4 flex flex-wrap items-center justify-center sm:justify-start gap-3">
                <a
                  href="#agendamento"
                  className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Solicitar Consulta / Agendamento</span>
                </a>

                {directWaUrl && (
                  <a
                    href={directWaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition flex items-center gap-2 cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-600" />
                    <span>Falar no WhatsApp</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-600">
            {profile!.service_regions && (
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-800 block">Locais & Regiões de Atendimento</strong>
                  <span>{profile!.service_regions}</span>
                </div>
              </div>
            )}

            {profile!.opening_hours && (
              <div className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-800 block">Horários de Atendimento</strong>
                  <span>{profile!.opening_hours}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Services & Procedures */}
        {renderServicesSection()}

        {/* Clinics */}
        {renderClinicsSection()}

        {/* Booking Form Card */}
        <section id="agendamento" className="scroll-mt-20">
          {renderBookingFormCard()}
        </section>
      </main>
    );
  }

  // =========================================================================
  // TEMPLATE 2: BIOLINK MOBILE-FIRST (Estilo Link da Bio / Instagram)
  // =========================================================================
  function renderBioLinkTheme() {
    return (
      <main className="flex-1 max-w-md w-full mx-auto px-4 py-8 space-y-5">
        {/* Profile Card Center */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-md p-6 text-center space-y-3 relative overflow-hidden">
          <div className="w-full h-20 bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 absolute top-0 left-0"></div>

          <div className="relative pt-6">
            <div className="relative inline-block">
              {profile!.logo_url ? (
                <img
                  src={profile!.logo_url}
                  alt={`Dr(a). ${profile!.first_name} ${profile!.last_name}`}
                  className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md mx-auto"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-emerald-800 text-white flex items-center justify-center font-bold text-2xl border-4 border-white shadow-md mx-auto">
                  {profile!.first_name.charAt(0)}
                  {profile!.last_name.charAt(0)}
                </div>
              )}
              <div className="absolute bottom-0 right-0 bg-emerald-600 text-white p-1 rounded-full border-2 border-white shadow-xs">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          <div>
            <h1 className="text-xl font-extrabold text-slate-900">
              Dr(a). {profile!.first_name} {profile!.last_name}
            </h1>
            <p className="text-xs font-semibold text-emerald-700 mt-0.5">
              {profile!.crmv ? `CRMV-${profile!.crmv_uf || 'SP'} ${profile!.crmv}` : 'Médico(a) Veterinário(a)'}
            </p>
            <p className="text-xs text-slate-500 mt-2 line-clamp-3">
              {profile!.bio}
            </p>
          </div>
        </div>

        {/* Action Buttons Stack (BioLink Style) */}
        <div className="space-y-3">
          {/* Main Booking Action */}
          <button
            onClick={() => setBioLinkModalOpen('BOOKING')}
            className="w-full py-3.5 px-4 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm shadow-sm flex items-center justify-between transition cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-white" />
              </div>
              <span className="text-left font-bold">Solicitar Consulta / Agendamento</span>
            </div>
            <ChevronRight className="w-4 h-4 text-emerald-200 group-hover:translate-x-0.5 transition-transform" />
          </button>

          {/* WhatsApp Direct */}
          {directWaUrl && (
            <a
              href={directWaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-emerald-50 border border-emerald-300 text-emerald-800 font-bold text-xs sm:text-sm shadow-2xs flex items-center justify-between transition cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 fill-current" />
                </div>
                <span className="text-left font-bold">Conversar no WhatsApp</span>
              </div>
              <ChevronRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
            </a>
          )}

          {/* Services Modal Button */}
          {profile!.services && profile!.services.length > 0 && (
            <button
              onClick={() => setBioLinkModalOpen('SERVICES')}
              className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-bold text-xs sm:text-sm shadow-2xs flex items-center justify-between transition cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                  <Stethoscope className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <span className="block font-bold">Tabela de Serviços & Honorários</span>
                  <span className="text-[11px] font-normal text-slate-400">
                    {profile!.services.length} procedimentos disponíveis
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}

          {/* Service Areas Button */}
          {profile!.service_regions && (
            <button
              onClick={() => setBioLinkModalOpen('AREAS')}
              className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-bold text-xs sm:text-sm shadow-2xs flex items-center justify-between transition cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <span className="block font-bold">Onde Atendo & Horários</span>
                  <span className="text-[11px] font-normal text-slate-400">
                    Bairros e cidades cobertas
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}

          {/* Instagram Button */}
          {profile!.instagram && (
            <a
              href={`https://instagram.com/${profile!.instagram.replace('@', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-bold text-xs sm:text-sm shadow-2xs flex items-center justify-between transition cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Instagram className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <span className="block font-bold">Instagram Oficial</span>
                  <span className="text-[11px] font-normal text-slate-400">
                    {profile!.instagram}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </a>
          )}
        </div>

        {/* BioLink Modal Popups */}
        {bioLinkModalOpen !== 'NONE' && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl border border-slate-200 animate-in slide-in-from-bottom-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  {bioLinkModalOpen === 'BOOKING' && <Calendar className="w-4 h-4 text-emerald-700" />}
                  {bioLinkModalOpen === 'SERVICES' && <Stethoscope className="w-4 h-4 text-emerald-700" />}
                  {bioLinkModalOpen === 'AREAS' && <MapPin className="w-4 h-4 text-emerald-700" />}
                  <span>
                    {bioLinkModalOpen === 'BOOKING' && 'Solicitar Atendimento'}
                    {bioLinkModalOpen === 'SERVICES' && 'Tabela de Serviços & Honorários'}
                    {bioLinkModalOpen === 'AREAS' && 'Regiões & Horários'}
                  </span>
                </h3>
                <button
                  onClick={() => setBioLinkModalOpen('NONE')}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {bioLinkModalOpen === 'BOOKING' && renderBookingFormCard()}

              {bioLinkModalOpen === 'SERVICES' && (
                <div className="space-y-3">
                  {profile!.services.map((svc) => (
                    <div
                      key={svc.id}
                      className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-start justify-between gap-3 text-xs"
                    >
                      <div>
                        <h4 className="font-bold text-slate-900">{svc.name}</h4>
                        {svc.description && <p className="text-[11px] text-slate-500 mt-0.5">{svc.description}</p>}
                      </div>
                      <span className="font-bold text-emerald-700 shrink-0">
                        {svc.price > 0 ? `R$ ${svc.price.toFixed(2)}` : 'Sob consulta'}
                      </span>
                    </div>
                  ))}
                  <button
                    onClick={() => setBioLinkModalOpen('BOOKING')}
                    className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition mt-2 cursor-pointer"
                  >
                    Agendar um desses serviços
                  </button>
                </div>
              )}

              {bioLinkModalOpen === 'AREAS' && (
                <div className="space-y-4 text-xs">
                  {profile!.service_regions && (
                    <div className="p-3.5 bg-slate-50 rounded-xl space-y-1">
                      <strong className="text-slate-900 block font-bold">Bairros e Regiões:</strong>
                      <p className="text-slate-600">{profile!.service_regions}</p>
                    </div>
                  )}
                  {profile!.opening_hours && (
                    <div className="p-3.5 bg-slate-50 rounded-xl space-y-1">
                      <strong className="text-slate-900 block font-bold">Disponibilidade:</strong>
                      <p className="text-slate-600">{profile!.opening_hours}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    );
  }

  // =========================================================================
  // TEMPLATE 3: VISITA DOMICILIAR & ACOLHIMENTO (Landing Page de Conversão)
  // =========================================================================
  function renderHomeCareTheme() {
    return (
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-10">
        {/* Warm Comfort Hero Banner */}
        <div className="bg-gradient-to-br from-amber-50 via-emerald-50/50 to-white rounded-3xl border border-amber-200/80 p-6 sm:p-10 shadow-xs relative overflow-hidden">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold">
              <Heart className="w-3.5 h-3.5 text-amber-700 fill-current" />
              <span>Atendimento Veterinário Sem Estresse</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Cuidados veterinários no aconchego e segurança da sua casa.
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Sem estresse de trânsito, sem caixas de transporte desconfortáveis e sem salas de espera agitadas. Atendimento humanizado e personalizado pela <strong>Dr(a). {profile!.first_name} {profile!.last_name}</strong> (CRMV-{profile!.crmv_uf || 'SP'} {profile!.crmv || ''}).
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <a
                href="#agendamento"
                className="px-6 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-xs flex items-center gap-2 cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Solicitar Visita em Domicílio</span>
              </a>

              {directWaUrl && (
                <a
                  href={directWaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-3 rounded-xl border border-emerald-300 bg-white hover:bg-emerald-50 text-emerald-800 text-xs font-bold transition flex items-center gap-2 cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-600" />
                  <span>Tirar Dúvidas no WhatsApp</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* 3 Value Pillars */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              🏡
            </div>
            <h3 className="text-xs font-bold text-slate-900">Zero Estresse para o Pet</h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              O animal permanece calmo em seu território, evitando pânico no transporte e contaminação em salas de espera.
            </p>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              🩺
            </div>
            <h3 className="text-xs font-bold text-slate-900">Avaliação no Ambiente Real</h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Observação direta de rotina, alimentação, interação familiar e sinais clínicos sem o mascaramento pelo medo.
            </p>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
              ⏰
            </div>
            <h3 className="text-xs font-bold text-slate-900">Atenção Exclusiva & Sem Pressa</h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Tempo dedicado a ouvir as preocupações do tutor com orientações preventivas completas e esclarecimento de dúvidas.
            </p>
          </div>
        </section>

        {/* Split Section: Details & Booking Form */}
        <section id="agendamento" className="grid grid-cols-1 lg:grid-cols-12 gap-8 scroll-mt-20">
          <div className="lg:col-span-5 space-y-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                Atendimento Volante
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
                Serviços Realizados em Casa
              </h2>
            </div>

            <div className="space-y-3">
              {profile!.services.map((svc) => (
                <div
                  key={svc.id}
                  className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <h4 className="font-bold text-slate-900">{svc.name}</h4>
                    {svc.description && <p className="text-[11px] text-slate-500 mt-0.5">{svc.description}</p>}
                  </div>
                  <span className="font-bold text-emerald-700 shrink-0">
                    {svc.price > 0 ? `R$ ${svc.price.toFixed(2)}` : 'A consultar'}
                  </span>
                </div>
              ))}
            </div>

            {profile!.service_regions && (
              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 text-xs space-y-1">
                <strong className="text-emerald-950 font-bold block flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-700" />
                  Regiões Cobertas para Visita
                </strong>
                <p className="text-emerald-900">{profile!.service_regions}</p>
              </div>
            )}
          </div>

          <div className="lg:col-span-7">
            {renderBookingFormCard()}
          </div>
        </section>
      </main>
    );
  }

  // =========================================================================
  // SUB-COMPONENTS: SERVICES, CLINICS, FORM
  // =========================================================================
  function renderServicesSection() {
    if (!profile!.services || profile!.services.length === 0) return null;
    return (
      <section className="space-y-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            Serviços & Procedimentos
          </h2>
          <p className="text-xs text-slate-500">
            Principais atendimentos realizados em domicílio ou clínicas parceiras
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {profile!.services.slice(0, 8).map((svc) => (
            <div
              key={svc.id}
              className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:border-emerald-300 transition space-y-1.5"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-xs font-bold text-slate-900 leading-tight">
                  {svc.name}
                </h3>
                <span className="text-xs font-bold text-emerald-700 shrink-0">
                  {svc.price > 0
                    ? `R$ ${svc.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                    : 'Sob consulta'}
                </span>
              </div>
              {svc.description && (
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {svc.description}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>
    );
  }

  function renderClinicsSection() {
    if (!profile!.clinics || profile!.clinics.length === 0) return null;
    return (
      <section className="space-y-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            Clínicas e Hospitais Parceiros
          </h2>
          <p className="text-xs text-slate-500">
            Locais onde também realizamos cirurgias, internação e exames avançados
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {profile!.clinics.map((clinic) => (
            <div
              key={clinic.id}
              className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-center gap-3 text-xs"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">{clinic.name}</h4>
                <span className="text-[11px] text-slate-500">
                  {[clinic.neighborhood, clinic.city].filter(Boolean).join(', ') || 'Clínica Conveniada'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  function renderBookingFormCard() {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        <div>
          <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-1">
            <Stethoscope className="w-4 h-4" />
            <span>Solicitação de Atendimento</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Agende uma Consulta para seu Pet
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Preencha os dados abaixo. Sua solicitação será registrada e você poderá confirmar diretamente no WhatsApp da Dra./Dr. {profile!.first_name}.
          </p>
        </div>

        {bookingSuccess ? (
          <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-emerald-950">
                Solicitação Recebida com Sucesso!
              </h3>
              <p className="text-xs text-emerald-800 mt-1 max-w-md mx-auto leading-relaxed">
                Os dados foram registrados no sistema. Para uma confirmação imediata, clique no botão abaixo para abrir a conversa no WhatsApp com a mensagem pronta.
              </p>
            </div>

            {bookingSuccess.whatsapp_url && (
              <div className="pt-2">
                <a
                  href={bookingSuccess.whatsapp_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-xs"
                >
                  <MessageCircle className="w-4 h-4 fill-current" />
                  <span>Confirmar Horário no WhatsApp com o Veterinário</span>
                </a>
              </div>
            )}

            <button
              onClick={() => {
                setBookingSuccess(null);
                setForm({
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
              }}
              className="text-xs text-slate-500 hover:text-slate-800 font-semibold underline block mx-auto cursor-pointer"
            >
              Enviar outra solicitação
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Tutor Data */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-1.5">
                1. Dados do Tutor Responsável
              </h3>
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
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    WhatsApp / Celular com DDD *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="Ex: (11) 98765-4321"
                    value={form.tutor_phone}
                    onChange={(e) => setForm({ ...form, tutor_phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
                  />
                </div>
              </div>
            </div>

            {/* Pet Data */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-1.5">
                2. Dados do Paciente (Pet)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nome do Pet *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Thor, Mel, Pipoca"
                    value={form.pet_name}
                    onChange={(e) => setForm({ ...form, pet_name: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Espécie *
                  </label>
                  <select
                    value={form.pet_species}
                    onChange={(e) => setForm({ ...form, pet_species: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none focus:border-emerald-600 bg-white"
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
                    placeholder="Ex: Poodle, 3 anos"
                    value={form.pet_breed}
                    onChange={(e) => setForm({ ...form, pet_breed: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
                  />
                </div>
              </div>
            </div>

            {/* Consultation Details */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-1.5">
                3. Detalhes do Atendimento
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Modalidade Desejada
                  </label>
                  <select
                    value={form.consultation_type}
                    onChange={(e) => setForm({ ...form, consultation_type: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none focus:border-emerald-600 bg-white"
                  >
                    <option value="DOMICILIAR">Atendimento em Domicílio</option>
                    <option value="CLINICA">Em Clínica / Consultório</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Data de Preferência
                  </label>
                  <input
                    type="date"
                    value={form.preferred_date}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setForm({ ...form, preferred_date: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Período do Dia
                  </label>
                  <select
                    value={form.preferred_period}
                    onChange={(e) => setForm({ ...form, preferred_period: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none focus:border-emerald-600 bg-white"
                  >
                    <option value="MANHA">Manhã (08h às 12h)</option>
                    <option value="TARDE">Tarde (13h às 18h)</option>
                    <option value="NOITE">Noite / Final da tarde</option>
                    <option value="QUALQUER">Qualquer horário</option>
                  </select>
                </div>
              </div>

              {form.consultation_type === 'DOMICILIAR' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bairro / Cidade ou Endereço para Visita
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Moema, São Paulo - SP ou Rua..."
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Motivo da Consulta ou Sintomas Apresentados *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Ex: Vacina anual e checkup geral, ou vômito desde ontem..."
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 px-6 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Enviando solicitação...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Enviar Solicitação de Atendimento</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    );
  }
};
