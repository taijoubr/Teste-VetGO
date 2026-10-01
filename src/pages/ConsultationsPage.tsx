import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  ClinicalConsultation,
  Patient,
  Tutor,
  PrescriptionItem,
  VaccineRecord,
  VitalSigns
} from '../types';
import {
  Stethoscope,
  Plus,
  Search,
  PawPrint,
  Clock,
  Calendar,
  FileText,
  Printer,
  Share2,
  X,
  AlertCircle,
  Pill,
  ShieldCheck,
  ChevronDown,
  CheckCircle2,
  MapPin,
  Sparkles,
  QrCode
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AIAssistantModal } from '../components/AIAssistantModal';
import { PixPaymentModal } from '../components/PixPaymentModal';

export const ConsultationsPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const initialPatientId = searchParams.get('patient_id');

  const [consultations, setConsultations] = useState<ClinicalConsultation[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Selected consultation for view / print
  const [viewingConsultation, setViewingConsultation] = useState<ClinicalConsultation | null>(null);

  // Modal new consultation state
  const [showModal, setShowModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [showPixModal, setShowPixModal] = useState(false);
  const [pixAmount, setPixAmount] = useState<number>(150);
  const [pixDesc, setPixDesc] = useState<string>('Consulta Veterinária');
  const [pixTutorPhone, setPixTutorPhone] = useState<string>('');
  const [pixPatientName, setPixPatientName] = useState<string>('');
  const [modalStep, setModalStep] = useState<'SOAP' | 'VITAIS' | 'PRESCRICAO'>('SOAP');

  const [form, setForm] = useState({
    patient_id: 1,
    chief_complaint: '',
    anamnesis: '',
    temperature_c: 38.5,
    heart_rate_bpm: 110,
    respiratory_rate_mpm: 24,
    capillary_refill_time_sec: 2,
    body_condition_score: 5,
    hydration_status: 'Normal (Adequada)' as any,
    mucous_membranes: 'Normocoradas' as any,
    physical_examination: '',
    diagnosis_suspicions: '',
    prognosis: 'Favorável' as any,
    conduct_plan: '',
    location_address: ''
  });

  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([
    {
      id: '1',
      medication_name: '',
      dose: '',
      frequency: '',
      duration_days: 7,
      route: 'Oral',
      instructions: ''
    }
  ]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [cons, pts, tuts] = await Promise.all([
        api.getConsultations(initialPatientId ? parseInt(initialPatientId) : undefined),
        api.getPatients(),
        api.getTutors()
      ]);
      setConsultations(cons);
      setPatients(pts);
      setTutors(tuts);

      if (pts.length > 0) {
        const targetPt = initialPatientId
          ? pts.find((p) => p.id === parseInt(initialPatientId)) || pts[0]
          : pts[0];
        const relatedTutor = tuts.find((t) => t.id === targetPt.tutor_id);
        setForm((prev) => ({
          ...prev,
          patient_id: targetPt.id,
          location_address: relatedTutor?.address ? `${relatedTutor.address}, ${relatedTutor.address_number || ''}` : ''
        }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handlePatientSelect = (pId: number) => {
    const pt = patients.find((p) => p.id === pId);
    const tut = tutors.find((t) => t.id === pt?.tutor_id);
    setForm({
      ...form,
      patient_id: pId,
      location_address: tut?.address ? `${tut.address}, ${tut.address_number || ''}` : ''
    });
  };

  const handleAddPrescriptionItem = () => {
    setPrescriptions([
      ...prescriptions,
      {
        id: Date.now().toString(),
        medication_name: '',
        dose: '',
        frequency: '',
        duration_days: 7,
        route: 'Oral',
        instructions: ''
      }
    ]);
  };

  const handleRemovePrescriptionItem = (index: number) => {
    setPrescriptions(prescriptions.filter((_, i) => i !== index));
  };

  const handleUpdatePrescriptionItem = (index: number, field: keyof PrescriptionItem, val: any) => {
    const updated = [...prescriptions];
    updated[index] = { ...updated[index], [field]: val };
    setPrescriptions(updated);
  };

  const handleCreateConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    const pt = patients.find((p) => p.id === form.patient_id);
    const tut = tutors.find((t) => t.id === pt?.tutor_id);

    const validPrescriptions = prescriptions.filter((p) => p.medication_name.trim() !== '');

    const vitalSigns: VitalSigns = {
      temperature_c: form.temperature_c,
      heart_rate_bpm: form.heart_rate_bpm,
      respiratory_rate_mpm: form.respiratory_rate_mpm,
      capillary_refill_time_sec: form.capillary_refill_time_sec,
      body_condition_score: form.body_condition_score,
      hydration_status: form.hydration_status,
      mucous_membranes: form.mucous_membranes
    };

    const newCons = await api.createConsultation({
      patient_id: form.patient_id,
      patient_name: pt ? pt.name : 'Paciente',
      tutor_id: tut ? tut.id : 1,
      tutor_name: tut ? tut.name : 'Tutor',
      chief_complaint: form.chief_complaint,
      anamnesis: form.anamnesis,
      vital_signs: vitalSigns,
      physical_examination: form.physical_examination,
      diagnosis_suspicions: form.diagnosis_suspicions,
      prognosis: form.prognosis,
      conduct_plan: form.conduct_plan,
      prescriptions: validPrescriptions,
      location_address: form.location_address,
      status: 'FINALIZADO'
    });

    // Also register financial entry for the consultation
    await api.createFinancialEntry({
      entry_type: 'RECEITA',
      category: 'Consulta Volante Domiciliar',
      description: `Atendimento Clínico - ${pt?.name} (Tutor: ${tut?.name})`,
      amount: 250.0,
      payment_method: 'PIX',
      status: 'PAGO',
      tutor_id: tut?.id,
      tutor_name: tut?.name,
      patient_id: pt?.id,
      patient_name: pt?.name
    });

    setShowModal(false);
    loadData();
    setViewingConsultation(newCons);
  };

  const filtered = consultations.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.patient_name.toLowerCase().includes(q) ||
      c.tutor_name.toLowerCase().includes(q) ||
      c.chief_complaint.toLowerCase().includes(q) ||
      c.diagnosis_suspicions.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Stethoscope className="w-6 h-6 text-emerald-700" />
            Atendimentos & Prontuário Clínico
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Registro SOAP, parâmetros vitais, prescrições e histórico clínico volante
          </p>
        </div>

        <button
          onClick={() => {
            setShowModal(true);
            setModalStep('SOAP');
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Atendimento Clínico</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        <input
          type="text"
          placeholder="Pesquisar por paciente, tutor, sintoma ou diagnóstico..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-600 shadow-2xs"
        />
      </div>

      {/* Consultations List */}
      {loading ? (
        <div className="p-8 text-center text-xs text-slate-400">Carregando prontuários...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200/80 p-8 text-center">
          <Stethoscope className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">Nenhum atendimento registrado.</p>
          <p className="text-xs text-slate-400 mt-1">
            Clique no botão acima para iniciar um novo registro clínico volante.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs hover:border-emerald-500/50 transition space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                    {c.patient_name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">{c.patient_name}</span>
                      <span className="text-xs text-slate-400">• Tutor(a):</span>
                      <span className="text-xs font-semibold text-slate-700">{c.tutor_name}</span>
                    </div>
                    {c.location_address && (
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-emerald-700" />
                        <span>{c.location_address}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-slate-400">
                    {new Date(c.date_time).toLocaleDateString('pt-BR')} às{' '}
                    {new Date(c.date_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        const relatedTutor = tutors.find((t) => t.id === c.tutor_id);
                        setPixAmount(150);
                        setPixDesc(`Atendimento - ${c.patient_name}`);
                        setPixTutorPhone(relatedTutor?.phone || relatedTutor?.whatsapp || '');
                        setPixPatientName(c.patient_name);
                        setShowPixModal(true);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition cursor-pointer shadow-2xs"
                      title="Gerar QR Code PIX para recebimento desta consulta"
                    >
                      <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Cobrar PIX</span>
                    </button>
                    <button
                      onClick={() => setViewingConsultation(c)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Ver Prontuário / Receita</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Clinical Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="font-bold text-slate-700 block mb-0.5">Queixa Principal:</span>
                  <p className="text-slate-600 bg-slate-50 p-2 rounded-lg">{c.chief_complaint}</p>
                </div>

                <div>
                  <span className="font-bold text-slate-700 block mb-0.5">Diagnóstico / Suspeitas:</span>
                  <p className="text-slate-600 bg-slate-50 p-2 rounded-lg">
                    {c.diagnosis_suspicions || 'Em investigação clínica.'}
                  </p>
                </div>
              </div>

              {/* Vital Signs Pill Bar */}
              {c.vital_signs && (
                <div className="flex items-center gap-2 flex-wrap text-[11px] pt-1">
                  {c.vital_signs.temperature_c && (
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono">
                      T: {c.vital_signs.temperature_c}°C
                    </span>
                  )}
                  {c.vital_signs.heart_rate_bpm && (
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono">
                      FC: {c.vital_signs.heart_rate_bpm} bpm
                    </span>
                  )}
                  {c.vital_signs.respiratory_rate_mpm && (
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono">
                      FR: {c.vital_signs.respiratory_rate_mpm} mpm
                    </span>
                  )}
                  {c.vital_signs.body_condition_score && (
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      ECC: {c.vital_signs.body_condition_score}/9
                    </span>
                  )}
                  {c.prescriptions && c.prescriptions.length > 0 && (
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-semibold flex items-center gap-1">
                      <Pill className="w-3 h-3" />
                      {c.prescriptions.length} medicamento(s) prescrito(s)
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* View & Print Record Modal */}
      {viewingConsultation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 overflow-y-auto max-h-[90vh] space-y-6">
            {/* Action buttons at top */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 print:hidden">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Prontuário de Atendimento Volante
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-700 text-white hover:bg-emerald-800 transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir / PDF</span>
                </button>
                <button
                  onClick={() => setViewingConsultation(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Document Body with Professional Header & Discrete Vetgo Footer */}
            <div className="space-y-6 text-slate-800">
              {/* Professional Vet Header */}
              <div className="text-center border-b border-slate-300 pb-4">
                <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                  {user?.clinic_name || `${user?.first_name} ${user?.last_name}`}
                </h2>
                <div className="text-xs font-semibold text-emerald-800 mt-0.5">
                  Médico(a) Veterinário(a) • CRMV-{user?.crmv_uf || 'SP'} {user?.crmv || '34892'}
                </div>
                {user?.phone && (
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    WhatsApp: {user.phone} • Atendimento Volante e Domiciliar
                  </div>
                )}
              </div>

              {/* Patient & Tutor Info */}
              <div className="grid grid-cols-2 gap-4 p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                <div>
                  <div>
                    <strong className="text-slate-700">Paciente:</strong> {viewingConsultation.patient_name}
                  </div>
                  <div>
                    <strong className="text-slate-700">Tutor(a):</strong> {viewingConsultation.tutor_name}
                  </div>
                </div>
                <div>
                  <div>
                    <strong className="text-slate-700">Data do Atendimento:</strong>{' '}
                    {new Date(viewingConsultation.date_time).toLocaleDateString('pt-BR')}
                  </div>
                  <div>
                    <strong className="text-slate-700">Local:</strong>{' '}
                    {viewingConsultation.location_address || 'Atendimento Domiciliar'}
                  </div>
                </div>
              </div>

              {/* Clinical Details */}
              <div className="space-y-3 text-xs">
                <div>
                  <h4 className="font-bold text-slate-900 border-b border-slate-100 pb-1 uppercase tracking-wide text-[11px]">
                    1. Queixa Principal e Anamnese
                  </h4>
                  <p className="mt-1 text-slate-700 leading-relaxed">{viewingConsultation.chief_complaint}</p>
                  {viewingConsultation.anamnesis && (
                    <p className="mt-1 text-slate-600 italic leading-relaxed">{viewingConsultation.anamnesis}</p>
                  )}
                </div>

                {viewingConsultation.vital_signs && (
                  <div>
                    <h4 className="font-bold text-slate-900 border-b border-slate-100 pb-1 uppercase tracking-wide text-[11px]">
                      2. Exame Físico e Parâmetros Vitais
                    </h4>
                    <div className="grid grid-cols-3 gap-2 mt-1.5 p-2.5 bg-slate-50 rounded-lg text-[11px]">
                      <div>Temperatura: {viewingConsultation.vital_signs.temperature_c}°C</div>
                      <div>Freq. Cardíaca: {viewingConsultation.vital_signs.heart_rate_bpm} bpm</div>
                      <div>Freq. Respiratória: {viewingConsultation.vital_signs.respiratory_rate_mpm} mpm</div>
                      <div>TPC: {viewingConsultation.vital_signs.capillary_refill_time_sec} seg</div>
                      <div>Escore Corporal: {viewingConsultation.vital_signs.body_condition_score}/9</div>
                      <div>Hidratação: {viewingConsultation.vital_signs.hydration_status}</div>
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="font-bold text-slate-900 border-b border-slate-100 pb-1 uppercase tracking-wide text-[11px]">
                    3. Diagnóstico e Conduta Clínica
                  </h4>
                  <p className="mt-1 text-slate-700 font-medium">
                    Diagnóstico: {viewingConsultation.diagnosis_suspicions}
                  </p>
                  {viewingConsultation.conduct_plan && (
                    <p className="mt-1 text-slate-600 leading-relaxed">{viewingConsultation.conduct_plan}</p>
                  )}
                </div>

                {viewingConsultation.prescriptions && viewingConsultation.prescriptions.length > 0 && (
                  <div>
                    <h4 className="font-bold text-slate-900 border-b border-slate-100 pb-1 uppercase tracking-wide text-[11px]">
                      4. Prescrição de Medicamentos
                    </h4>
                    <div className="space-y-2 mt-2">
                      {viewingConsultation.prescriptions.map((rx, idx) => (
                        <div key={idx} className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-lg">
                          <div className="font-bold text-emerald-950 text-xs">
                            {idx + 1}. {rx.medication_name} ({rx.route})
                          </div>
                          <div className="text-slate-700 font-medium mt-0.5">Dose: {rx.dose}</div>
                          <div className="text-slate-600">Posologia: {rx.frequency}</div>
                          {rx.instructions && (
                            <div className="text-[11px] text-slate-500 italic mt-0.5">Obs: {rx.instructions}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Signature line */}
              <div className="pt-10 text-center">
                <div className="w-56 border-t border-slate-400 mx-auto"></div>
                <div className="text-xs font-bold text-slate-800 mt-1">
                  Dr(a). {user?.first_name} {user?.last_name}
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  Médico(a) Veterinário(a) • CRMV-{user?.crmv_uf || 'SP'} {user?.crmv || '34892'}
                </div>
              </div>

              {/* Discrete Vetgo Footer */}
              <div className="pt-6 border-t border-slate-200 text-center text-[10px] text-slate-400">
                Documento emitido via <strong>Vetgo</strong> • Veterinária onde você precisa
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Consultation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 gap-2 flex-wrap">
              <div>
                <h3 className="text-base font-bold text-slate-900">Novo Atendimento Clínico (SOAP)</h3>
                <p className="text-[11px] text-slate-500">
                  Preencha a anamnese, exame físico e prescrições do atendimento volante
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAIModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-800 hover:to-teal-800 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
                  title="Ditar por voz ou relatar para preencher automaticamente"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Assistente IA (Voz ou Relato)</span>
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Steps tabs */}
            <div className="flex border-b border-slate-200 mt-4 gap-2">
              <button
                type="button"
                onClick={() => setModalStep('SOAP')}
                className={`pb-2 px-3 text-xs font-bold border-b-2 cursor-pointer ${
                  modalStep === 'SOAP'
                    ? 'border-emerald-700 text-emerald-800'
                    : 'border-transparent text-slate-400'
                }`}
              >
                1. Anamnese & Queixa
              </button>
              <button
                type="button"
                onClick={() => setModalStep('VITAIS')}
                className={`pb-2 px-3 text-xs font-bold border-b-2 cursor-pointer ${
                  modalStep === 'VITAIS'
                    ? 'border-emerald-700 text-emerald-800'
                    : 'border-transparent text-slate-400'
                }`}
              >
                2. Parâmetros Vitais
              </button>
              <button
                type="button"
                onClick={() => setModalStep('PRESCRICAO')}
                className={`pb-2 px-3 text-xs font-bold border-b-2 cursor-pointer ${
                  modalStep === 'PRESCRICAO'
                    ? 'border-emerald-700 text-emerald-800'
                    : 'border-transparent text-slate-400'
                }`}
              >
                3. Prescrição & Conduta
              </button>
            </div>

            <form onSubmit={handleCreateConsultation} className="mt-4 space-y-4">
              {modalStep === 'SOAP' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Paciente Selecionado *
                    </label>
                    <select
                      value={form.patient_id}
                      onChange={(e) => handlePatientSelect(parseInt(e.target.value))}
                      className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none bg-white"
                    >
                      {patients.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.species} • {p.breed || 'SRD'} - Tutor: {p.tutor_name})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Local / Endereço do Atendimento Volante
                    </label>
                    <input
                      type="text"
                      value={form.location_address}
                      onChange={(e) => setForm({ ...form, location_address: e.target.value })}
                      placeholder="Rua, número, complemento (domicílio do tutor)"
                      className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Queixa Principal do Tutor *
                    </label>
                    <textarea
                      required
                      rows={2}
                      placeholder="Ex: Prurido em orelhas e patas há 3 dias, vômitos esporádicos..."
                      value={form.chief_complaint}
                      onChange={(e) => setForm({ ...form, chief_complaint: e.target.value })}
                      className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Anamnese e Histórico Pregresso
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Alimentação, vacinas prévias, ambiente, contato com outros animais..."
                      value={form.anamnesis}
                      onChange={(e) => setForm({ ...form, anamnesis: e.target.value })}
                      className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setModalStep('VITAIS')}
                      className="px-4 py-2 text-xs font-semibold bg-emerald-700 text-white rounded-lg hover:bg-emerald-800"
                    >
                      Avançar para Parâmetros Vitais →
                    </button>
                  </div>
                </div>
              )}

              {modalStep === 'VITAIS' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Temp (°C)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={form.temperature_c}
                        onChange={(e) => setForm({ ...form, temperature_c: parseFloat(e.target.value) || 38.5 })}
                        className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">FC (bpm)</label>
                      <input
                        type="number"
                        value={form.heart_rate_bpm}
                        onChange={(e) => setForm({ ...form, heart_rate_bpm: parseInt(e.target.value) || 100 })}
                        className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">FR (mpm)</label>
                      <input
                        type="number"
                        value={form.respiratory_rate_mpm}
                        onChange={(e) => setForm({ ...form, respiratory_rate_mpm: parseInt(e.target.value) || 24 })}
                        className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">TPC (segundos)</label>
                      <input
                        type="number"
                        value={form.capillary_refill_time_sec}
                        onChange={(e) => setForm({ ...form, capillary_refill_time_sec: parseInt(e.target.value) || 2 })}
                        className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Escore Corp. (ECC 1-9)</label>
                      <input
                        type="number"
                        min={1}
                        max={9}
                        value={form.body_condition_score}
                        onChange={(e) => setForm({ ...form, body_condition_score: parseInt(e.target.value) || 5 })}
                        className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Hidratação</label>
                      <select
                        value={form.hydration_status}
                        onChange={(e) => setForm({ ...form, hydration_status: e.target.value as any })}
                        className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none bg-white"
                      >
                        <option value="Normal (Adequada)">Normal (Adequada)</option>
                        <option value="Leve (5-6%)">Leve (5-6%)</option>
                        <option value="Moderada (7-9%)">Moderada (7-9%)</option>
                        <option value="Grave (>10%)">Grave (&gt;10%)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Achados do Exame Físico Geral e Específico
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Palpação abdominal, ausculta cardiopulmonar, linfonodos, pele..."
                      value={form.physical_examination}
                      onChange={(e) => setForm({ ...form, physical_examination: e.target.value })}
                      className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none"
                    />
                  </div>

                  <div className="flex justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setModalStep('SOAP')}
                      className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                    >
                      ← Voltar
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalStep('PRESCRICAO')}
                      className="px-4 py-2 text-xs font-semibold bg-emerald-700 text-white rounded-lg hover:bg-emerald-800"
                    >
                      Avançar para Prescrição →
                    </button>
                  </div>
                </div>
              )}

              {modalStep === 'PRESCRICAO' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Diagnóstico Clínico / Suspeitas *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Dermatite Atópica Canina / Gastroenterite aguda"
                      value={form.diagnosis_suspicions}
                      onChange={(e) => setForm({ ...form, diagnosis_suspicions: e.target.value })}
                      className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none"
                    />
                  </div>

                  {/* Prescription Items */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">
                        Prescrição de Medicamentos
                      </span>
                      <button
                        type="button"
                        onClick={handleAddPrescriptionItem}
                        className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Adicionar Medicamento
                      </button>
                    </div>

                    {prescriptions.map((rx, idx) => (
                      <div key={rx.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700">Item #{idx + 1}</span>
                          {prescriptions.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemovePrescriptionItem(idx)}
                              className="text-xs text-rose-600 hover:underline"
                            >
                              Remover
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Nome do medicamento (Ex: Apoquel 16mg)"
                            value={rx.medication_name}
                            onChange={(e) => handleUpdatePrescriptionItem(idx, 'medication_name', e.target.value)}
                            className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-none"
                          />
                          <select
                            value={rx.route}
                            onChange={(e) => handleUpdatePrescriptionItem(idx, 'route', e.target.value)}
                            className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-none"
                          >
                            <option value="Oral">Oral</option>
                            <option value="Tópica">Tópica</option>
                            <option value="Otológica">Otológica</option>
                            <option value="Oftálmica">Oftálmica</option>
                            <option value="Subcutânea">Subcutânea</option>
                            <option value="Intramuscular">Intramuscular</option>
                            <option value="Intravenosa">Intravenosa</option>
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Dose (Ex: 1 comp)"
                            value={rx.dose}
                            onChange={(e) => handleUpdatePrescriptionItem(idx, 'dose', e.target.value)}
                            className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-none"
                          />
                          <input
                            type="text"
                            placeholder="Frequência (Ex: A cada 12h por 14 dias)"
                            value={rx.frequency}
                            onChange={(e) => handleUpdatePrescriptionItem(idx, 'frequency', e.target.value)}
                            className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-none"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Orientações e Conduta Geral ao Tutor
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Retorno em 15 dias, cuidados de higiene, dieta especial..."
                      value={form.conduct_plan}
                      onChange={(e) => setForm({ ...form, conduct_plan: e.target.value })}
                      className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none"
                    />
                  </div>

                  <div className="flex justify-between pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setModalStep('VITAIS')}
                      className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                    >
                      ← Voltar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 text-xs font-bold bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 shadow-xs cursor-pointer"
                    >
                      Salvar Atendimento & Finalizar
                    </button>
                  </div>
                </div>
              )}
            </form>

            {/* Modal do Assistente de IA */}
            <AIAssistantModal
              isOpen={showAIModal}
              onClose={() => setShowAIModal(false)}
              onApply={(aiData) => {
                setForm((prev) => ({
                  ...prev,
                  chief_complaint: aiData.chief_complaint || prev.chief_complaint,
                  anamnesis: aiData.anamnesis || prev.anamnesis,
                  physical_examination: aiData.physical_exam || prev.physical_examination,
                  diagnosis_suspicions: aiData.diagnostic_hypothesis || prev.diagnosis_suspicions,
                  conduct_plan: aiData.treatment_plan || prev.conduct_plan,
                }));
              }}
              patientContext={
                (() => {
                  const pt = patients.find((p) => p.id === form.patient_id);
                  return pt
                    ? {
                        name: pt.name,
                        species: pt.species,
                        breed: pt.breed,
                        weight_kg: pt.weight_kg,
                        age: pt.approximate_age,
                      }
                    : undefined;
                })()
              }
            />
          </div>
        </div>
      )}

      {/* Modal de Cobrança PIX com QR Code */}
      <PixPaymentModal
        isOpen={showPixModal}
        onClose={() => setShowPixModal(false)}
        defaultAmount={pixAmount}
        description={pixDesc}
        tutorPhone={pixTutorPhone}
        patientName={pixPatientName}
      />
    </div>
  );
};
