import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ShieldCheck,
  Calendar,
  Phone,
  User,
  Heart,
  AlertTriangle,
  Printer,
  Sparkles,
  Award,
  Clock,
  CheckCircle2,
  Syringe,
  Download,
  FileText,
  BadgeCheck,
  Building2,
  MapPin,
  ExternalLink,
  MessageCircle,
  HelpCircle
} from 'lucide-react';
import { printElement, exportToPdf } from '../utils/printHelper';

interface PublicCardData {
  id: number;
  code?: string;
  name: string;
  species: string;
  breed: string;
  gender: string;
  birth_date?: string;
  approximate_age?: string;
  weight_kg?: number;
  coat_color?: string;
  is_neutered: boolean;
  microchip?: string;
  microchip_status?: string;
  photo_url?: string;
  notes?: string;
  created_at?: string;
  tutor_id?: number;
  tutor_name: string;
  tutor_phone?: string;
  tutor_email?: string;
  tutor_city?: string;
  vet_name: string;
  vet_logo_url?: string;
  vet_phone?: string;
  vet_email?: string;
  vet_signature_url?: string;
  crmv?: string;
  clinic_name?: string;
  vaccines: {
    id: string;
    vaccine_name: string;
    manufacturer?: string;
    batch_number: string;
    application_date: string;
    next_booster_date: string;
    route: string;
    applied_by?: string;
  }[];
  has_vaccines?: boolean;
  verified_at: string;
}

export const PublicPetCardPage: React.FC = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const [data, setData] = useState<PublicCardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!patientId) return;

    fetch(`/api/v1/public/patients/${patientId}/card`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error('Carteirinha não encontrada ou paciente inativo.');
        }
        return res.json();
      })
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Erro ao carregar carteirinha.');
        setLoading(false);
      });
  }, [patientId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-emerald-700 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-semibold text-slate-500">
            Carregando Carteirinha Digital Oficial...
          </p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full text-center shadow-xl border border-slate-200 space-y-4">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-100">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Carteirinha Não Encontrada</h2>
          <p className="text-xs text-slate-600">
            {error || 'Não foi possível localizar os registros deste paciente.'}
          </p>
          <Link
            to="/"
            className="inline-block px-5 py-2.5 bg-emerald-700 text-white rounded-xl text-xs font-bold hover:bg-emerald-800 transition"
          >
            Acessar Plataforma Vetgo
          </Link>
        </div>
      </div>
    );
  }

  const hasVaccines = Array.isArray(data.vaccines) && data.vaccines.length > 0;

  const vetWhatsAppUrl = data.vet_phone
    ? `https://wa.me/55${data.vet_phone.replace(/\D/g, '')}?text=${encodeURIComponent(
        `Olá Dra./Dr. ${data.vet_name}! Gostaria de tirar dúvidas ou agendar a vacinação do pet ${data.name} (Prontuário #${data.code || data.id}).`
      )}`
    : null;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 py-6 px-3 sm:px-6">
      <div className="max-w-lg mx-auto space-y-4">
        {/* TOP BRAND BAR - PRIORITIZES THE VETERINARIAN / CLINIC */}
        <header className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/90 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {data.vet_logo_url ? (
              <img
                src={data.vet_logo_url}
                alt={data.clinic_name || data.vet_name}
                className="w-12 h-12 rounded-xl object-contain border border-slate-100 p-0.5 bg-slate-50 shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center font-bold text-lg shadow-2xs shrink-0">
                <Building2 className="w-6 h-6 text-emerald-100" />
              </div>
            )}
            <div className="min-w-0">
              <h2 className="font-extrabold text-sm sm:text-base tracking-tight text-slate-900 truncate leading-snug">
                {data.clinic_name || data.vet_name}
              </h2>
              <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-semibold truncate">
                <span>{data.vet_name}</span>
                {data.crmv && (
                  <span className="font-mono text-[11px] bg-emerald-50 text-emerald-900 px-1.5 py-0.2 rounded border border-emerald-200">
                    CRMV {data.crmv}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                Carteira Digital de Saúde e Vacinação
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 print:hidden">
            <button
              type="button"
              onClick={() => exportToPdf('printable-public-pet-card', `Carteira_Vacinacao_${data.name}`)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-2xs transition cursor-pointer"
              title="Baixar PDF da Carteira de Vacinação"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Baixar PDF</span>
            </button>
            <button
              type="button"
              onClick={() => printElement('printable-public-pet-card', `Carteira_Vacinacao_${data.name}`)}
              className="p-2 text-slate-700 hover:text-slate-900 bg-white border border-slate-200 rounded-xl shadow-2xs hover:bg-slate-50 transition cursor-pointer"
              title="Imprimir Carteira Limpa em A4"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* OFFICIAL CARD CERTIFICATE WRAPPER */}
        <div id="printable-public-pet-card" className="printable-document bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white p-6 relative overflow-hidden">
            <div className="absolute -right-6 -bottom-6 opacity-10">
              <ShieldCheck className="w-44 h-44" />
            </div>

            <div className="flex items-start justify-between relative z-10 gap-3">
              <div className="space-y-1.5">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 uppercase tracking-wide">
                  <ShieldCheck className="w-3 h-3 text-emerald-300" />
                  Prontuário e Identificação Oficial
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-950/50 text-emerald-200 border border-emerald-400/30">
                    #{data.code || `PAC-${String(data.id).padStart(4, '0')}`}
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{data.name}</h1>
                </div>
                <p className="text-emerald-100 text-xs font-medium">
                  {data.species} • {data.breed} {data.gender ? `• ${data.gender}` : ''}
                </p>
                {data.coat_color && (
                  <p className="text-emerald-200/90 text-[11px]">
                    Pelagem: <span className="font-semibold text-white">{data.coat_color}</span>
                  </p>
                )}
              </div>

              {data.photo_url ? (
                <img
                  src={data.photo_url}
                  alt={data.name}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-white/60 shadow-lg shrink-0 bg-white"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-white/20 text-white flex items-center justify-center font-black text-3xl border-2 border-white/40 shadow-lg shrink-0">
                  {data.name.charAt(0)}
                </div>
              )}
            </div>
          </div>

          {/* Patient Quick Info Pills */}
          <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/80 grid grid-cols-4 gap-2 text-center">
            <div className="p-2 bg-white rounded-xl border border-slate-200/90 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 block uppercase">
                Idade
              </span>
              <strong className="text-xs font-bold text-slate-900 block truncate">
                {data.approximate_age || 'Não inf.'}
              </strong>
            </div>

            <div className="p-2 bg-white rounded-xl border border-slate-200/90 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 block uppercase">
                Peso
              </span>
              <strong className="text-xs font-bold text-slate-900 block truncate">
                {data.weight_kg ? `${data.weight_kg} kg` : 'Aferindo'}
              </strong>
            </div>

            <div className="p-2 bg-white rounded-xl border border-slate-200/90 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 block uppercase">
                Castrado(a)
              </span>
              <strong className="text-xs font-bold text-slate-900 block">
                {data.is_neutered ? 'Sim' : 'Não'}
              </strong>
            </div>

            <div className="p-2 bg-white rounded-xl border border-slate-200/90 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 block uppercase">
                Espécie
              </span>
              <strong className="text-xs font-bold text-slate-900 block truncate">
                {data.species}
              </strong>
            </div>
          </div>

          {/* Microchip & Tutor Details */}
          <div className="p-5 space-y-3 text-xs border-b border-slate-100">
            {/* Microchip Card */}
            {data.microchip ? (
              <div className="flex items-center justify-between p-3 bg-blue-50/80 border border-blue-200 rounded-2xl text-blue-950">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                    <BadgeCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-extrabold text-xs block text-blue-900">Microchip Animal Cadastrado</span>
                    <span className="font-mono text-xs font-bold tracking-wider">{data.microchip}</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full border border-blue-200">
                  Verificado
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 text-[11px]">
                <span className="font-medium">Microchip Animal:</span>
                <span className="text-slate-500 font-semibold">Sem microchip cadastrado</span>
              </div>
            )}

            {/* Tutor Info */}
            <div className="p-3 bg-slate-50/70 border border-slate-200/80 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-slate-600">
                <span className="flex items-center gap-1.5 font-medium">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  Tutor Responsável:
                </span>
                <strong className="text-slate-900 font-bold">{data.tutor_name}</strong>
              </div>

              {data.tutor_phone && (
                <div className="flex items-center justify-between text-slate-600 pt-1 border-t border-slate-200/60">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    Contato:
                  </span>
                  <a
                    href={`tel:${data.tutor_phone.replace(/\D/g, '')}`}
                    className="inline-flex items-center gap-1 text-emerald-800 font-bold hover:underline"
                  >
                    <span>{data.tutor_phone}</span>
                  </a>
                </div>
              )}

              {data.tutor_city && (
                <div className="flex items-center justify-between text-slate-600 pt-1 border-t border-slate-200/60 text-[11px]">
                  <span className="flex items-center gap-1.5 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    Região de Atendimento:
                  </span>
                  <span className="font-semibold text-slate-800">{data.tutor_city}</span>
                </div>
              )}
            </div>
          </div>

          {/* VACCINATION & HEALTH SECTION */}
          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Syringe className="w-4 h-4 text-emerald-700" />
                Histórico Sanitário & Vacinal
              </h2>
              {hasVaccines ? (
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  {data.vaccines.length} doses registradas
                </span>
              ) : (
                <span className="text-[10px] font-bold text-emerald-850 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  Prontuário Ativo
                </span>
              )}
            </div>

            {hasVaccines ? (
              /* Actual Vaccine Records */
              <div className="space-y-2.5">
                {data.vaccines.map((vac) => (
                  <div
                    key={vac.id}
                    className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-emerald-300 transition shadow-2xs space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-xs text-slate-900">
                          {vac.vaccine_name}
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Lote: <span className="font-mono">{vac.batch_number}</span> • {vac.manufacturer || 'Fabricante Oficial'}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 shrink-0">
                        <CheckCircle2 className="w-3 h-3" />
                        Aplicada
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-100 text-slate-600">
                      <div>
                        <span className="block text-[10px] text-slate-400">Data de Aplicação</span>
                        <strong>{new Date(vac.application_date).toLocaleDateString('pt-BR')}</strong>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-400">Próximo Reforço</span>
                        <strong className="text-emerald-800">
                          {new Date(vac.next_booster_date).toLocaleDateString('pt-BR')}
                        </strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* MENSAGEM LIMPA E CONCISA SOBRE A IMPORTÂNCIA DA VACINAÇÃO */
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50/90 via-teal-50/70 to-emerald-50/80 border border-emerald-200/90 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center shadow-2xs shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-emerald-950">
                      A Importância da Vacinação
                    </h3>
                    <span className="text-[10px] text-emerald-800 font-medium block">
                      Proteção e longevidade para {data.name}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-emerald-950/90 leading-relaxed">
                  A vacinação é a forma mais eficaz e segura de prevenir doenças infecciosas graves e transmissíveis. Manter as vacinas em dia fortalece o sistema imunológico do seu pet e garante que ele cresça e viva com saúde e bem-estar. Converse com o médico-veterinário para planejar e iniciar o cronograma de vacinação ideal.
                </p>

                {vetWhatsAppUrl && (
                  <div className="pt-1 print:hidden">
                    <a
                      href={vetWhatsAppUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Falar com o Veterinário sobre Vacinação</span>
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* VETERINARIAN SIGNATURE & AUTHENTICATION STAMP */}
          <div className="p-5 bg-slate-50 border-t border-slate-200 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                Médico(a) Veterinário(a) Responsável
              </span>
              <span className="text-[9px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Autenticação Digital Ativa
              </span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-black text-slate-900 text-sm">{data.vet_name}</div>
                <div className="text-slate-600 font-mono text-xs">
                  CRMV: {data.crmv || 'Ativo'} • {data.clinic_name}
                </div>
                {data.vet_phone && (
                  <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span>WhatsApp: {data.vet_phone}</span>
                  </div>
                )}
              </div>

              {data.vet_signature_url && (
                <div className="text-right shrink-0">
                  <img
                    src={data.vet_signature_url}
                    alt="Assinatura Digital"
                    className="max-h-12 max-w-[140px] object-contain ml-auto filter drop-shadow-2xs"
                  />
                  <span className="text-[9px] text-slate-400 block font-mono">Assinado digitalmente</span>
                </div>
              )}
            </div>

            <p className="text-[10px] text-slate-500 pt-2 border-t border-slate-200/70 leading-relaxed">
              Documento expedido em conformidade com as boas práticas médico-veterinárias. Para validar a autenticidade, consulte o CRMV do profissional emissor nos registros oficiais do CFMV/CRMV.
            </p>
          </div>
        </div>

        {/* PLATFORM FOOTER NOTE - VETGO IS THE PLATFORM, VETERINARIAN IS THE PRIMARY ENTITY */}
        <footer className="text-center py-4 px-2 space-y-1 print:hidden text-[11px] text-slate-500">
          <p>
            Esta carteira digital de saúde animal é emitida pelo(a) <strong>{data.clinic_name || data.vet_name}</strong>.
          </p>
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400">
            <span>Tecnologia e infraestrutura providas por</span>
            <span className="font-bold text-slate-700 tracking-tight">Vetgo Gestão Veterinária</span>
            <span>• Todos os direitos reservados</span>
          </div>
        </footer>
      </div>
    </div>
  );
};
