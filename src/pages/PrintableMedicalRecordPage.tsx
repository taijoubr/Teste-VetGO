import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { printElement } from '../utils/printHelper';
import {
  Printer,
  Share2,
  ArrowLeft,
  FileText,
  ShieldCheck,
  Calendar,
  User,
  Heart,
  Syringe,
  Activity,
  AlertCircle,
  FileCheck2,
  Clock,
  Sparkles,
  CheckCircle2
} from 'lucide-react';

export const PrintableMedicalRecordPage: React.FC = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (patientId) {
      loadRecord(parseInt(patientId, 10));
    }
  }, [patientId]);

  const loadRecord = async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getFullMedicalRecord(id);
      setData(res);
      if (searchParams.get('auto') === 'true') {
        setTimeout(() => {
          handlePrint();
        }, 600);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar prontuário do paciente.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    printElement('printable-medical-record-document', `Prontuario_${data?.patient?.name || 'Paciente'}`);
  };

  const handleShareWhatsApp = () => {
    if (!data) return;
    const { patient, tutor, vet, consultations, vaccines } = data;
    const phone = tutor?.whatsapp || tutor?.phone || '';
    const cleanPhone = phone.replace(/\D/g, '');
    const phoneParam = cleanPhone ? `55${cleanPhone}` : '';

    const text = encodeURIComponent(
      `🐾 *PRONTUÁRIO CLÍNICO VETERINÁRIO UNIFICADO*\n` +
      `*Paciente:* ${patient.name} (${patient.species} - ${patient.breed || 'SRD'})\n` +
      `*Código:* #${patient.code || `PAC-${String(patient.id).padStart(4, '0')}`}\n` +
      `*Tutor(a):* ${tutor?.name || 'Tutor Responsável'}\n` +
      `*Médico(a) Veterinário(a):* Dra./Dr. ${vet?.first_name} ${vet?.last_name || ''} (${vet?.crmv ? `CRMV-${vet.crmv_uf || 'SP'} ${vet.crmv}` : 'CRMV Ativo'})\n` +
      `*Total de Atendimentos:* ${consultations?.length || 0}\n` +
      `*Vacinas Registradas:* ${vaccines?.length || 0}\n\n` +
      `O documento completo e oficial foi gerado e está arquivado no prontuário digital Vetgo.`
    );

    window.open(`https://wa.me/${phoneParam}?text=${text}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white text-slate-800 print:text-black">
      {/* Top Floating Action Bar (Hidden on print) */}
      <header className="sticky top-0 z-40 bg-slate-900 text-white shadow-md px-4 py-3 print:hidden">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar</span>
          </button>

          <div className="text-center hidden sm:block">
            <h1 className="text-sm font-bold truncate">
              {data?.patient ? `Prontuário Oficial: ${data.patient.name} (#${data.patient.code})` : 'Prontuário Médico-Veterinário'}
            </h1>
            <p className="text-[10px] text-slate-400">Layout Oficial A4 para Impressão e Salvamento em PDF</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShareWhatsApp}
              disabled={loading || !data}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-700/80 hover:bg-emerald-600 text-white transition cursor-pointer disabled:opacity-50"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={loading || !data}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Salvar PDF</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="p-4 sm:p-8 max-w-4xl mx-auto print:p-0 print:m-0 print:max-w-none">
        {loading ? (
          <div className="py-24 text-center space-y-3">
            <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs font-semibold text-slate-500">
              Preparando prontuário unificado para impressão...
            </p>
          </div>
        ) : error ? (
          <div className="p-8 bg-white border border-slate-200 rounded-2xl text-center space-y-3 shadow-xs">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
            <h2 className="text-base font-bold text-slate-800">Erro ao carregar prontuário</h2>
            <p className="text-xs text-slate-500">{error}</p>
            <button
              onClick={() => patientId && loadRecord(parseInt(patientId, 10))}
              className="px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold hover:bg-emerald-800 cursor-pointer"
            >
              Tentar novamente
            </button>
          </div>
        ) : data ? (
          /* THE OFFICIAL PRINTABLE MEDICAL RECORD */
          <div
            id="printable-medical-record-document"
            className="printable-document bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 shadow-sm print:border-none print:p-0 print:shadow-none space-y-6"
          >
            {/* DOCUMENT HEADER / TIMBRADO */}
            <div className="border-b-2 border-emerald-800 pb-5 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <img
                  src={data.vet?.logo_url || '/logo.png'}
                  alt="Logo Clínica"
                  className="w-14 h-14 object-contain rounded-xl border border-slate-200 p-1"
                />
                <div>
                  <h1 className="text-lg font-black tracking-tight text-slate-900 print:text-black leading-tight">
                    {data.vet?.clinic_name || 'VETGO • ATENDIMENTO MÉDICO-VETERINÁRIO'}
                  </h1>
                  <p className="text-xs font-semibold text-emerald-800 print:text-emerald-900">
                    Dr(a). {data.vet?.first_name} {data.vet?.last_name || ''}
                    {data.vet?.crmv && ` • CRMV-${data.vet?.crmv_uf || 'SP'} ${data.vet?.crmv}`}
                  </p>
                  <div className="text-[11px] text-slate-500 print:text-slate-700 flex items-center gap-3 mt-1 flex-wrap">
                    {data.vet?.phone && <span>Tel: {data.vet.phone}</span>}
                    {data.vet?.email && <span>Email: {data.vet.email}</span>}
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="inline-block px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-[10px] font-extrabold uppercase tracking-wide">
                  Prontuário Médico-Veterinário
                </span>
                <div className="text-[10px] text-slate-400 print:text-slate-600 mt-1">
                  Emissão: {new Date(data.emitted_at).toLocaleDateString('pt-BR')} às {new Date(data.emitted_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>

            {/* DOSSIER: PACIENTE & TUTOR (2 COLUNAS) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 border border-slate-200/80 rounded-xl p-4 print:bg-slate-50/50">
              {/* Dados do Paciente */}
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                  <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                    Dados do Paciente
                  </span>
                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                    #{data.patient?.code}
                  </span>
                </div>
                <div><strong>Nome:</strong> <span className="font-bold text-slate-900">{data.patient?.name}</span></div>
                <div><strong>Espécie / Raça:</strong> {data.patient?.species} • {data.patient?.breed || 'SRD'}</div>
                <div className="grid grid-cols-2 gap-2">
                  <div><strong>Sexo:</strong> {data.patient?.gender}</div>
                  <div><strong>Castrado:</strong> {data.patient?.is_neutered ? 'Sim' : 'Não'}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><strong>Idade:</strong> {data.patient?.approximate_age || 'Não informada'}</div>
                  <div><strong>Peso Atual:</strong> {data.patient?.weight_kg ? `${data.patient.weight_kg} kg` : 'Não registrado'}</div>
                </div>
                {data.patient?.coat_color && <div><strong>Pelagem:</strong> {data.patient.coat_color}</div>}
                <div>
                  <strong>Microchip:</strong>{' '}
                  {data.patient?.microchip || data.patient?.microchip_number ? (
                    <span className="font-mono text-emerald-800 font-bold">
                      {data.patient.microchip || data.patient.microchip_number}
                    </span>
                  ) : (
                    <span className="text-slate-400">Sem microchip</span>
                  )}
                </div>
              </div>

              {/* Dados do Tutor */}
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                  <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                    Tutor Responsável
                  </span>
                  {data.tutor?.code && (
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-200 text-slate-700">
                      #{data.tutor.code}
                    </span>
                  )}
                </div>
                <div><strong>Nome:</strong> <span className="font-bold text-slate-900">{data.tutor?.name || 'Não informado'}</span></div>
                <div><strong>CPF:</strong> <span className="font-mono">{data.tutor?.cpf || 'Não informado'}</span></div>
                <div><strong>Telefone / WhatsApp:</strong> {data.tutor?.phone || data.tutor?.whatsapp || 'Não informado'}</div>
                {data.tutor?.email && <div><strong>E-mail:</strong> {data.tutor.email}</div>}
                {data.tutor?.address && (
                  <div>
                    <strong>Endereço:</strong> {data.tutor.address}, {data.tutor.address_number || 'S/N'}{' '}
                    {data.tutor.neighborhood && `• ${data.tutor.neighborhood}`}{' '}
                    ({data.tutor.city || 'São Paulo'}-{data.tutor.state || 'SP'})
                  </div>
                )}
              </div>
            </div>

            {/* SEÇÃO 1: HISTÓRICO DE VACINAÇÃO */}
            <div className="space-y-2.5 break-inside-avoid">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
                <Syringe className="w-4 h-4 text-emerald-700" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Histórico Oficial de Imunização (Vacinas)
                </h2>
              </div>

              {data.vaccines && data.vaccines.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="p-2 border-b">Vacina</th>
                        <th className="p-2 border-b">Fabricante / Lote</th>
                        <th className="p-2 border-b">Aplicação</th>
                        <th className="p-2 border-b">Próx. Reforço</th>
                        <th className="p-2 border-b">Aplicador</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {data.vaccines.map((v: any, idx: number) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                          <td className="p-2 font-bold text-slate-900">{v.vaccine_name}</td>
                          <td className="p-2">{v.manufacturer || 'Lab'} • {v.batch_number || 'Lote padrão'}</td>
                          <td className="p-2 font-mono">{v.application_date ? new Date(v.application_date).toLocaleDateString('pt-BR') : '—'}</td>
                          <td className="p-2 font-mono font-bold text-emerald-800">
                            {v.next_booster_date ? new Date(v.next_booster_date).toLocaleDateString('pt-BR') : '—'}
                          </td>
                          <td className="p-2 text-[11px]">{v.applied_by || `Dr(a). ${data.vet?.first_name}`}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  Nenhuma vacina registrada até o momento no sistema.
                </p>
              )}
            </div>

            {/* SEÇÃO 2: HISTÓRICO CRONOLÓGICO DE ATENDIMENTOS & CONSULTAS */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
                <Activity className="w-4 h-4 text-emerald-700" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Histórico Clínico e Evolução de Consultas ({data.consultations?.length || 0})
                </h2>
              </div>

              {data.consultations && data.consultations.length > 0 ? (
                <div className="space-y-4">
                  {data.consultations.map((c: any, index: number) => (
                    <div
                      key={c.id || index}
                      className="border border-slate-200 rounded-xl p-4 space-y-2.5 break-inside-avoid bg-white shadow-2xs print:shadow-none"
                    >
                      {/* Header do Atendimento */}
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          <span className="font-bold text-xs text-slate-900">
                            Atendimento em {new Date(c.date_time || c.created_at).toLocaleDateString('pt-BR')} às{' '}
                            {new Date(c.date_time || c.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                            {c.status || 'CONCLUÍDO'}
                          </span>
                        </div>

                        {/* Parâmetros Vitais */}
                        <div className="flex items-center gap-2.5 text-[11px] text-slate-500 flex-wrap">
                          {c.weight_kg && <span>Peso: <strong>{c.weight_kg}kg</strong></span>}
                          {c.temperature_c && <span>Temp: <strong>{c.temperature_c}°C</strong></span>}
                          {c.heart_rate_bpm && <span>FC: <strong>{c.heart_rate_bpm} bpm</strong></span>}
                          {c.resp_rate_mpm && <span>FR: <strong>{c.resp_rate_mpm} mpm</strong></span>}
                          {c.mucosa && <span>Mucosas: <strong>{c.mucosa}</strong></span>}
                        </div>
                      </div>

                      {/* Queixa Principal */}
                      {c.chief_complaint && (
                        <div className="text-xs">
                          <strong className="text-slate-800">Queixa Principal / Motivo:</strong>
                          <p className="text-slate-600 mt-0.5">{c.chief_complaint}</p>
                        </div>
                      )}

                      {/* Anamnese */}
                      {c.anamnesis && (
                        <div className="text-xs">
                          <strong className="text-slate-800">Anamnese & Histórico do Caso:</strong>
                          <p className="text-slate-600 mt-0.5 whitespace-pre-line">{c.anamnesis}</p>
                        </div>
                      )}

                      {/* Exame Físico */}
                      {c.physical_exam && (
                        <div className="text-xs">
                          <strong className="text-slate-800">Achados do Exame Físico:</strong>
                          <p className="text-slate-600 mt-0.5 whitespace-pre-line">{c.physical_exam}</p>
                        </div>
                      )}

                      {/* Diagnóstico */}
                      {(c.diagnosis || c.presumptive_diagnosis) && (
                        <div className="text-xs p-2.5 bg-emerald-50/70 border border-emerald-200/80 rounded-lg">
                          <strong className="text-emerald-900">Diagnóstico Clínico:</strong>
                          <p className="text-emerald-800 mt-0.5 font-medium">
                            {c.diagnosis || c.presumptive_diagnosis}
                          </p>
                        </div>
                      )}

                      {/* Conduta e Tratamento */}
                      {c.treatment_plan && (
                        <div className="text-xs">
                          <strong className="text-slate-800">Conduta & Plano Terapêutico:</strong>
                          <p className="text-slate-600 mt-0.5 whitespace-pre-line">{c.treatment_plan}</p>
                        </div>
                      )}

                      {/* Prescrições / Receituário */}
                      {c.prescriptions && c.prescriptions.length > 0 && (
                        <div className="text-xs pt-1 border-t border-slate-100">
                          <strong className="text-slate-800">Prescrições Realizadas:</strong>
                          <ul className="list-disc list-inside text-slate-600 mt-1 space-y-0.5">
                            {c.prescriptions.map((p: any, pIdx: number) => (
                              <li key={pIdx}>
                                <strong>{p.name || p.medication}</strong> - {p.dosage || ''} {p.frequency || ''} {p.duration ? `(${p.duration})` : ''}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  Nenhum atendimento clínico cadastrado ainda para este paciente.
                </p>
              )}
            </div>

            {/* SEÇÃO 3: FICHAS CIRÚRGICAS / ANESTÉSICAS */}
            {data.anesthesia_records && data.anesthesia_records.length > 0 && (
              <div className="space-y-2.5 break-inside-avoid">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
                  <Heart className="w-4 h-4 text-emerald-700" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Procedimentos Anestésicos & Cirúrgicos ({data.anesthesia_records.length})
                  </h2>
                </div>
                <div className="space-y-2">
                  {data.anesthesia_records.map((a: any, aIdx: number) => (
                    <div key={aIdx} className="p-3 border border-slate-200 rounded-lg text-xs space-y-1">
                      <div className="flex items-center justify-between font-bold">
                        <span>{a.procedure_name || 'Procedimento Cirúrgico'}</span>
                        <span className="text-emerald-800 font-mono">
                          {a.date ? new Date(a.date).toLocaleDateString('pt-BR') : ''}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Cirurgião: {a.surgeon_name || 'Equipe'} • Classificação ASA: {a.asa_classification || 'ASA I'}
                      </div>
                      {a.notes && <p className="text-slate-600 italic">"{a.notes}"</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SEÇÃO 4: DOCUMENTOS E TERMOS EMITIDOS */}
            {data.documents && data.documents.length > 0 && (
              <div className="space-y-2.5 break-inside-avoid">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
                  <FileCheck2 className="w-4 h-4 text-emerald-700" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Documentos & Termos Emitidos ({data.documents.length})
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {data.documents.map((d: any, dIdx: number) => (
                    <div key={dIdx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                      <div className="font-bold text-slate-900 truncate">{d.title}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Tipo: {d.type} • Emitido em: {new Date(d.created_at).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* DOCUMENT FOOTER & CARIMBO/ASSINATURA */}
            <div className="pt-8 border-t-2 border-slate-200 break-inside-avoid space-y-8">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
                <div className="space-y-1 text-xs text-slate-500 print:text-slate-700">
                  <div className="flex items-center gap-1.5 justify-center sm:justify-start font-bold text-slate-800">
                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                    <span>Documento Oficial de Registro Médico-Veterinário</span>
                  </div>
                  <p className="text-[11px] max-w-sm">
                    Este prontuário foi consolidado digitalmente a partir do histórico clínico oficial da plataforma Vetgo, em conformidade com as diretrizes éticas do CFMV/CRMV.
                  </p>
                </div>

                {/* Assinatura / Carimbo */}
                <div className="flex flex-col items-center">
                  {data.vet?.signature_url && (
                    <img
                      src={data.vet.signature_url}
                      alt="Assinatura Digital"
                      className="max-h-14 max-w-[180px] object-contain mb-1"
                    />
                  )}
                  <div className="w-56 border-b border-slate-400 mb-1.5"></div>
                  <div className="text-xs font-bold text-slate-900 print:text-black">
                    Dr(a). {data.vet?.first_name} {data.vet?.last_name || ''}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    {data.vet?.crmv ? `CRMV-${data.vet?.crmv_uf || 'SP'} ${data.vet?.crmv}` : 'Médico(a) Veterinário(a)'}
                  </div>
                  {data.vet?.signature_url && (
                    <div className="text-[9px] text-emerald-800 font-mono mt-0.5">
                      ✔ Autenticado com Assinatura Digital do Veterinário
                    </div>
                  )}
                </div>
              </div>

              <div className="text-center text-[10px] text-slate-400 print:text-slate-500">
                Vetgo Software de Gestão Veterinária • Documento emitido eletronicamente em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>

          </div>
        ) : null}
      </main>
    </div>
  );
};
