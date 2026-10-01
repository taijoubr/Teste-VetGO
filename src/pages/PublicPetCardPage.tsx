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
  Syringe
} from 'lucide-react';

interface PublicCardData {
  id: number;
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
  photo_url?: string;
  tutor_name: string;
  tutor_phone?: string;
  vet_name: string;
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

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 py-6 px-3 sm:px-6">
      <div className="max-w-lg mx-auto space-y-4">
        {/* Top Brand Bar */}
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Vetgo" className="w-8 h-8 object-contain" />
            <div>
              <span className="font-extrabold text-sm tracking-tight text-slate-900 block leading-tight">
                VETGO
              </span>
              <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider block">
                Carteira Digital de Vacinação
              </span>
            </div>
          </div>

          <button
            onClick={() => window.print()}
            className="p-2 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-xl shadow-2xs hover:bg-slate-50 transition cursor-pointer print:hidden"
            title="Imprimir Carteira"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>

        {/* Official Card Certificate Wrapper */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white p-6 relative overflow-hidden">
            <div className="absolute -right-6 -bottom-6 opacity-10">
              <ShieldCheck className="w-40 h-40" />
            </div>

            <div className="flex items-start justify-between relative z-10">
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 uppercase tracking-wide">
                  <ShieldCheck className="w-3 h-3 text-emerald-300" />
                  Documento Autêntico Verificado
                </span>
                <h1 className="text-2xl font-black tracking-tight">{data.name}</h1>
                <p className="text-emerald-100 text-xs">
                  {data.species} • {data.breed} {data.gender ? `• ${data.gender}` : ''}
                </p>
              </div>

              {data.photo_url ? (
                <img
                  src={data.photo_url}
                  alt={data.name}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-white/50 shadow-md shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-white/20 text-white flex items-center justify-center font-bold text-2xl border-2 border-white/40 shrink-0">
                  {data.name.charAt(0)}
                </div>
              )}
            </div>
          </div>

          {/* Patient Quick Info Pills */}
          <div className="p-5 border-b border-slate-100 bg-slate-50/70 grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-600 block uppercase">
                Idade
              </span>
              <strong className="text-xs font-bold text-slate-800">
                {data.approximate_age || 'Não inf.'}
              </strong>
            </div>

            <div className="p-2 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-600 block uppercase">
                Peso
              </span>
              <strong className="text-xs font-bold text-slate-800">
                {data.weight_kg ? `${data.weight_kg} kg` : 'Não inf.'}
              </strong>
            </div>

            <div className="p-2 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-600 block uppercase">
                Castrado(a)
              </span>
              <strong className="text-xs font-bold text-slate-800">
                {data.is_neutered ? 'Sim' : 'Não'}
              </strong>
            </div>
          </div>

          {/* Microchip & Tutor Details */}
          <div className="p-5 space-y-3 text-xs border-b border-slate-100">
            {data.microchip && (
              <div className="flex items-center justify-between p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-blue-900">
                <span className="font-semibold">Microchip Animal:</span>
                <span className="font-mono font-bold tracking-wider">{data.microchip}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-slate-600">
              <span>Tutor Responsável:</span>
              <strong className="text-slate-900">{data.tutor_name}</strong>
            </div>

            {data.tutor_phone && (
              <div className="flex items-center justify-between text-slate-600 pt-1">
                <span>Contato de Emergência:</span>
                <a
                  href={`tel:${data.tutor_phone.replace(/\D/g, '')}`}
                  className="inline-flex items-center gap-1 text-emerald-800 font-bold hover:underline"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>{data.tutor_phone}</span>
                </a>
              </div>
            )}
          </div>

          {/* Vaccine Records List */}
          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Syringe className="w-4 h-4 text-emerald-700" />
                Histórico de Vacinação ({data.vaccines.length})
              </h2>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Em Dia
              </span>
            </div>

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
          </div>

          {/* Veterinarian Signature Stamp */}
          <div className="p-5 bg-slate-50 border-t border-slate-200 text-xs space-y-1">
            <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider block">
              Médico-Veterinário Responsável
            </span>
            <div className="font-bold text-slate-900">{data.vet_name}</div>
            <div className="text-slate-600 font-mono text-[11px]">
              CRMV: {data.crmv || 'Ativo'} • {data.clinic_name}
            </div>
            <p className="text-[10px] text-slate-600 pt-2 border-t border-slate-200/60 leading-relaxed">
              Carteira emitida e autenticada digitalmente pela plataforma <strong>Vetgo</strong>. Em caso de dúvidas sobre autenticidade, consulte o CRMV do profissional emissor.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
