import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { api } from '../services/api';
import { generatePixPayload } from '../utils/pixPayload';
import {
  ClinicalConsultation,
  Patient,
  Tutor,
  PrescriptionItem,
  VaccineRecord,
  VitalSigns,
  ConsultationBillingItem,
  InventoryItem,
  PaymentMethod,
  ClinicalServiceItem
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
  QrCode,
  Microscope,
  DollarSign,
  Receipt,
  Package,
  Trash2,
  CreditCard,
  Copy,
  Check
} from 'lucide-react';
import { useSearchParams, Link } from 'react-router-dom';
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
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [services, setServices] = useState<ClinicalServiceItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Selected consultation for view / print
  const [viewingConsultation, setViewingConsultation] = useState<ClinicalConsultation | null>(null);
  const [viewingExamDoc, setViewingExamDoc] = useState<ClinicalConsultation | null>(null);
  const [viewingBudgetDoc, setViewingBudgetDoc] = useState<ClinicalConsultation | null>(null);
  const [viewingPrescriptionDoc, setViewingPrescriptionDoc] = useState<ClinicalConsultation | null>(null);
  const [budgetPixQr, setBudgetPixQr] = useState<string>('');
  const [budgetPixPayload, setBudgetPixPayload] = useState<string>('');
  const [budgetCopied, setBudgetCopied] = useState<boolean>(false);
  const [prescriptionCopied, setPrescriptionCopied] = useState<boolean>(false);

  // Search service in budget step
  const [searchServiceQuery, setSearchServiceQuery] = useState<string>('');
  const [showServiceDropdown, setShowServiceDropdown] = useState<boolean>(false);

  // Search exam in prescription step
  const [searchExamQuery, setSearchExamQuery] = useState<string>('');
  const [showExamDropdown, setShowExamDropdown] = useState<boolean>(false);

  // Modal new consultation state
  const [showModal, setShowModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [showPixModal, setShowPixModal] = useState(false);
  const [pixAmount, setPixAmount] = useState<number>(150);
  const [pixDesc, setPixDesc] = useState<string>('Consulta Veterinária');
  const [pixTutorPhone, setPixTutorPhone] = useState<string>('');
  const [pixPatientName, setPixPatientName] = useState<string>('');
  const [modalStep, setModalStep] = useState<'SOAP' | 'VITAIS' | 'PRESCRICAO' | 'ORCAMENTO'>('SOAP');
  const [selectedStockItemId, setSelectedStockItemId] = useState<number>(0);

  const [form, setForm] = useState({
    patient_id: 1,
    chief_complaint: '',
    symptom_onset_duration: '',
    symptom_evolution: 'Agudo' as 'Agudo' | 'Crônico' | 'Recorrente' | 'Progressivo',
    diet_type: 'Ração Seca Comercial',
    diet_details: '',
    water_intake: 'Normal' as 'Normal' | 'Aumentada (Polidipsia)' | 'Diminuída (Hipodipsia)',
    environment_lifestyle: 'Casa com quintal',
    other_animals_contact: 'Sem contato com outros animais',
    vaccine_status: 'Em dia' as 'Em dia' | 'Atrasada' | 'Incompleta' | 'Nunca vacinado' | 'Não sabe',
    vaccine_details: '',
    deworming_status: 'Em dia' as 'Em dia' | 'Atrasada' | 'Não administrado',
    deworming_date_product: '',
    ectoparasites_status: 'Em dia' as 'Em dia' | 'Atrasado' | 'Não administrado',
    ectoparasites_product: '',
    is_neutered_record: false,
    previous_surgeries: '',
    chronic_diseases: '',
    known_allergies: '',
    continuous_medications: '',
    system_digestive: '',
    system_respiratory: '',
    system_dermatological: '',
    system_urinary: '',
    system_locomotor_neuro: '',
    system_eyes_ears: '',
    system_others: '',
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
    requested_exams: '',
    requested_exams_justification: '',
    location_address: '',
    // Orçamento & Faturamento da Consulta
    billing_items: [
      {
        id: '1',
        description: 'Consulta Clínica Volante Domiciliar',
        category: 'CONSULTA' as const,
        unit_price: 180,
        quantity: 1,
        total_price: 180,
        deduct_from_stock: false
      }
    ] as ConsultationBillingItem[],
    discount_amount: 0,
    payment_method: 'PIX' as PaymentMethod,
    payment_status: 'PAGO' as 'PAGO' | 'PENDENTE'
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

  // Gera QR Code PIX oficial para o orçamento visualizado
  useEffect(() => {
    if (!viewingBudgetDoc) {
      setBudgetPixQr('');
      setBudgetPixPayload('');
      setBudgetCopied(false);
      return;
    }
    const pixKey = user?.pix_key || '';
    if (pixKey.trim()) {
      const receiverName = user?.pix_receiver_name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'VETERINARIO';
      const city = user?.pix_city || 'SAO PAULO';
      const amount = viewingBudgetDoc.total_amount && viewingBudgetDoc.total_amount > 0 ? viewingBudgetDoc.total_amount : undefined;
      const desc = `Atendimento - ${viewingBudgetDoc.patient_name}`;
      try {
        const payload = generatePixPayload({
          pixKey: pixKey.trim(),
          receiverName,
          city,
          amount,
          description: desc
        });
        setBudgetPixPayload(payload);
        QRCode.toDataURL(payload, {
          width: 240,
          margin: 1,
          color: { dark: '#0f172a', light: '#ffffff' }
        }).then((url) => setBudgetPixQr(url));
      } catch (err) {
        console.error('Erro ao gerar QR Code PIX do orçamento:', err);
      }
    }
  }, [viewingBudgetDoc, user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [cons, pts, tuts, inv, svcs] = await Promise.all([
        api.getConsultations(initialPatientId ? parseInt(initialPatientId) : undefined),
        api.getPatients(),
        api.getTutors(),
        api.getInventory(),
        api.getServices()
      ]);
      setConsultations(cons);
      setPatients(pts);
      setTutors(tuts);
      setInventory(inv);
      setServices(svcs);

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

  const handleAddStandardService = (description: string, unit_price: number, category: ConsultationBillingItem['category']) => {
    const newItem: ConsultationBillingItem = {
      id: `bill-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      description,
      category,
      unit_price,
      quantity: 1,
      total_price: unit_price,
      deduct_from_stock: false
    };
    setForm((prev) => ({
      ...prev,
      billing_items: [...prev.billing_items, newItem]
    }));
  };

  const handleAddFromInventory = (invItemId: number) => {
    const item = inventory.find((i) => i.id === invItemId);
    if (!item) return;
    const price = item.sale_price || item.cost_price || 0;
    const newItem: ConsultationBillingItem = {
      id: `bill-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      inventory_item_id: item.id,
      description: `${item.name} (${item.presentation || item.concentration || item.unit})`,
      category: item.category === 'Vacina' ? 'VACINA' : 'MEDICAMENTO',
      unit_price: price,
      quantity: 1,
      total_price: price,
      deduct_from_stock: true
    };
    setForm((prev) => ({
      ...prev,
      billing_items: [...prev.billing_items, newItem]
    }));
    setSelectedStockItemId(0);
  };

  const handleUpdateBillingItem = (idx: number, field: keyof ConsultationBillingItem, val: any) => {
    setForm((prev) => {
      const updated = [...prev.billing_items];
      const target = { ...updated[idx], [field]: val };
      if (field === 'quantity' || field === 'unit_price') {
        const qty = field === 'quantity' ? parseFloat(val) || 0 : target.quantity;
        const prc = field === 'unit_price' ? parseFloat(val) || 0 : target.unit_price;
        target.total_price = Math.round(qty * prc * 100) / 100;
      }
      updated[idx] = target;
      return { ...prev, billing_items: updated };
    });
  };

  const handleRemoveBillingItem = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      billing_items: prev.billing_items.filter((_, i) => i !== idx)
    }));
  };

  const handleAddCustomItem = () => {
    const newItem: ConsultationBillingItem = {
      id: `bill-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      description: '',
      category: 'PROCEDIMENTO',
      unit_price: 50,
      quantity: 1,
      total_price: 50,
      deduct_from_stock: false
    };
    setForm((prev) => ({
      ...prev,
      billing_items: [...prev.billing_items, newItem]
    }));
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

    const subtotal = form.billing_items.reduce((acc, it) => acc + (it.total_price || (it.unit_price * it.quantity)), 0);
    const finalTotal = Math.max(0, subtotal - (form.discount_amount || 0));

    const newCons = await api.createConsultation({
      patient_id: form.patient_id,
      patient_name: pt ? pt.name : 'Paciente',
      tutor_id: tut ? tut.id : 1,
      tutor_name: tut ? tut.name : 'Tutor',
      chief_complaint: form.chief_complaint,
      symptom_onset_duration: form.symptom_onset_duration,
      symptom_evolution: form.symptom_evolution,
      diet_type: form.diet_type,
      diet_details: form.diet_details,
      water_intake: form.water_intake,
      environment_lifestyle: form.environment_lifestyle,
      other_animals_contact: form.other_animals_contact,
      vaccine_status: form.vaccine_status,
      vaccine_details: form.vaccine_details,
      deworming_status: form.deworming_status,
      deworming_date_product: form.deworming_date_product,
      ectoparasites_status: form.ectoparasites_status,
      ectoparasites_product: form.ectoparasites_product,
      is_neutered_record: form.is_neutered_record,
      previous_surgeries: form.previous_surgeries,
      chronic_diseases: form.chronic_diseases,
      known_allergies: form.known_allergies,
      continuous_medications: form.continuous_medications,
      system_digestive: form.system_digestive,
      system_respiratory: form.system_respiratory,
      system_dermatological: form.system_dermatological,
      system_urinary: form.system_urinary,
      system_locomotor_neuro: form.system_locomotor_neuro,
      system_eyes_ears: form.system_eyes_ears,
      system_others: form.system_others,
      anamnesis: form.anamnesis,
      vital_signs: vitalSigns,
      physical_examination: form.physical_examination,
      diagnosis_suspicions: form.diagnosis_suspicions,
      prognosis: form.prognosis,
      conduct_plan: form.conduct_plan,
      requested_exams: form.requested_exams,
      requested_exams_justification: form.requested_exams_justification,
      prescriptions: validPrescriptions,
      billing_items: form.billing_items,
      subtotal_amount: subtotal,
      discount_amount: form.discount_amount,
      total_amount: finalTotal,
      payment_method: form.payment_method,
      payment_status: form.payment_status,
      location_address: form.location_address,
      status: 'FINALIZADO'
    });

    // Also register financial entry for the consultation with actual total and details
    await api.createFinancialEntry({
      entry_type: 'RECEITA',
      category: 'Consulta & Atendimento Volante',
      description: `Atendimento / Orçamento - ${pt?.name} (Tutor: ${tut?.name})`,
      amount: finalTotal > 0 ? finalTotal : 180.0,
      payment_method: form.payment_method,
      status: form.payment_status === 'PAGO' ? 'PAGO' : 'PENDENTE',
      tutor_id: tut?.id,
      tutor_name: tut?.name,
      patient_id: pt?.id,
      patient_name: pt?.name
    });

    // Gera automaticamente o documento de Receita Médica nos Documentos
    if (validPrescriptions.length > 0) {
      try {
        const rxLines = validPrescriptions.map((rx, idx) => 
          `${idx + 1}) ${rx.medication_name} (${rx.route})\n   Posologia: ${rx.dose} — ${rx.frequency} por ${rx.duration_days} dias\n   ${rx.instructions ? `Recomendações: ${rx.instructions}` : ''}`
        ).join('\n\n');

        const docBody = `RECEITUÁRIO MÉDICO VETERINÁRIO\n\nPaciente: ${pt?.name} (${pt?.species}, ${pt?.breed || 'SRD'}${pt?.weight_kg ? `, ${pt.weight_kg}kg` : ''})\nTutor(a): ${tut?.name}\nData: ${new Date().toLocaleDateString('pt-BR')}\n\nPRESCRIÇÃO FARMACOLÓGICA:\n${rxLines}\n\nORIENTAÇÕES GERAIS:\n${form.conduct_plan || 'Seguir estritamente as doses e horários prescritos. Em caso de reações adversas, contatar o médico veterinário imediatamente.'}`;

        await api.createDocument({
          doc_type: 'RECEITA_SIMPLES',
          title: `Receita Médica Veterinária - ${pt?.name}`,
          patient_id: pt?.id,
          patient_name: pt?.name,
          tutor_id: tut?.id,
          tutor_name: tut?.name,
          content: docBody
        });
      } catch (err) {
        console.warn('Erro ao salvar receita automática:', err);
      }
    }

    setShowModal(false);
    loadData();
    if (validPrescriptions.length > 0) {
      setViewingPrescriptionDoc(newCons);
    } else {
      setViewingBudgetDoc(newCons);
    }
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
                    {c.requested_exams && (
                      <button
                        type="button"
                        onClick={() => setViewingExamDoc(c)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 transition cursor-pointer"
                        title="Ver e Imprimir Guia Oficial de Requisição de Exames"
                      >
                        <Microscope className="w-3.5 h-3.5 text-amber-700" />
                        <span>Guia de Exames</span>
                      </button>
                    )}
                    {c.prescriptions && c.prescriptions.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setViewingPrescriptionDoc(c)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-50 text-purple-900 border border-purple-300 hover:bg-purple-100 transition cursor-pointer shadow-2xs"
                        title="Ver e Imprimir Receituário Médico Veterinário Oficial"
                      >
                        <Pill className="w-3.5 h-3.5 text-purple-700" />
                        <span>Receita Médica ({c.prescriptions.length})</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setViewingBudgetDoc(c)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition cursor-pointer shadow-2xs"
                      title="Ver e Imprimir Orçamento & Faturamento do Atendimento"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>Orçamento (R$ {(c.total_amount || 180).toFixed(2)})</span>
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
                  {c.requested_exams && (
                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-semibold flex items-center gap-1 text-[11px]">
                      <Microscope className="w-3 h-3 text-amber-700" />
                      Exames Requisitados
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-950 font-bold flex items-center gap-1 text-[11px]">
                    <DollarSign className="w-3 h-3 text-emerald-700" />
                    R$ {(c.total_amount || 180).toFixed(2)} • {c.payment_status === 'PAGO' ? 'Pago' : 'Pendente'} ({c.payment_method || 'PIX'})
                  </span>
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
                {viewingConsultation.requested_exams && (
                  <button
                    onClick={() => {
                      setViewingExamDoc(viewingConsultation);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white transition cursor-pointer"
                    title="Imprimir Guia Oficial de Requisição de Exames"
                  >
                    <Microscope className="w-3.5 h-3.5" />
                    <span>Guia de Exames</span>
                  </button>
                )}
                <button
                  onClick={() => setViewingBudgetDoc(viewingConsultation)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition cursor-pointer"
                  title="Ver e Imprimir Orçamento & Faturamento"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Orçamento / Recibo</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition cursor-pointer"
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
                  <h4 className="font-bold text-slate-900 border-b border-slate-200 pb-1 uppercase tracking-wide text-[11px] flex items-center justify-between">
                    <span>1. Queixa Principal & Anamnese Clínica Completa</span>
                    {viewingConsultation.symptom_evolution && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold uppercase">
                        {viewingConsultation.symptom_evolution}
                      </span>
                    )}
                  </h4>
                  
                  <div className="mt-2 space-y-2.5">
                    <div>
                      <strong className="text-slate-800">Motivo / Queixa: </strong>
                      <span className="text-slate-700">{viewingConsultation.chief_complaint}</span>
                      {viewingConsultation.symptom_onset_duration && (
                        <span className="text-slate-500 text-[11px] ml-1">
                          (Duração: {viewingConsultation.symptom_onset_duration})
                        </span>
                      )}
                    </div>

                    {/* Manejo & Profilaxia Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 bg-slate-50 border border-slate-200/80 rounded-lg text-[11px]">
                      <div>
                        <strong>Dieta & Água: </strong>
                        <span>{viewingConsultation.diet_type || 'Ração comercial'} • Água: {viewingConsultation.water_intake || 'Normal'}</span>
                      </div>
                      <div>
                        <strong>Ambiente & Contactantes: </strong>
                        <span>{viewingConsultation.environment_lifestyle || 'Não informado'} • {viewingConsultation.other_animals_contact || 'Sem outros contactantes'}</span>
                      </div>
                      <div>
                        <strong>Vacinação & Profilaxia: </strong>
                        <span>Vacinas: {viewingConsultation.vaccine_status || 'Em dia'} • Vermífugo: {viewingConsultation.deworming_status || 'Em dia'} • Ectoparasitas: {viewingConsultation.ectoparasites_status || 'Em dia'}</span>
                      </div>
                      <div>
                        <strong>Histórico Mórbido & Alergias: </strong>
                        <span>{viewingConsultation.chronic_diseases || 'Sem comorbidades crônicas'} • Alergias: {viewingConsultation.known_allergies || 'Nenhuma relatada'}</span>
                      </div>
                    </div>

                    {/* Revisão por Sistemas */}
                    {(viewingConsultation.system_digestive || viewingConsultation.system_respiratory || viewingConsultation.system_dermatological) && (
                      <div className="p-2.5 bg-emerald-50/40 border border-emerald-100 rounded-lg text-[11px] space-y-1">
                        <strong className="text-emerald-950 block text-[10px] uppercase tracking-wider">Revisão por Sistemas Semiológicos:</strong>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 text-slate-700">
                          {viewingConsultation.system_digestive && <div><strong>Digestório:</strong> {viewingConsultation.system_digestive}</div>}
                          {viewingConsultation.system_respiratory && <div><strong>Cardiorrespiratório:</strong> {viewingConsultation.system_respiratory}</div>}
                          {viewingConsultation.system_dermatological && <div><strong>Tegumentar/Pele:</strong> {viewingConsultation.system_dermatological}</div>}
                          {viewingConsultation.system_urinary && <div><strong>Geniturinário:</strong> {viewingConsultation.system_urinary}</div>}
                          {viewingConsultation.system_locomotor_neuro && <div><strong>Locomotor/Neuro:</strong> {viewingConsultation.system_locomotor_neuro}</div>}
                        </div>
                      </div>
                    )}

                    {viewingConsultation.anamnesis && (
                      <div className="pt-1">
                        <strong className="text-slate-800">Síntese do Relato: </strong>
                        <span className="text-slate-600 italic">{viewingConsultation.anamnesis}</span>
                      </div>
                    )}
                  </div>
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
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                      <h4 className="font-bold text-slate-900 uppercase tracking-wide text-[11px] flex items-center gap-1.5">
                        <Pill className="w-3.5 h-3.5 text-purple-700" />
                        4. Prescrição de Medicamentos
                      </h4>
                      <button
                        type="button"
                        onClick={() => setViewingPrescriptionDoc(viewingConsultation)}
                        className="text-[10px] font-bold text-purple-900 bg-purple-100 hover:bg-purple-200 px-2.5 py-0.5 rounded transition cursor-pointer print:hidden flex items-center gap-1"
                      >
                        <Printer className="w-3 h-3" />
                        Imprimir Receituário Médico →
                      </button>
                    </div>
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

                {/* 5. Exames Complementares Solicitados */}
                {viewingConsultation.requested_exams && (
                  <div>
                    <h4 className="font-bold text-slate-900 border-b border-slate-100 pb-1 uppercase tracking-wide text-[11px] flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Microscope className="w-3.5 h-3.5 text-amber-600" />
                        5. Exames Complementares Solicitados
                      </span>
                      <button
                        type="button"
                        onClick={() => setViewingExamDoc(viewingConsultation)}
                        className="text-[10px] font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded transition cursor-pointer print:hidden"
                      >
                        Imprimir Guia de Exames →
                      </button>
                    </h4>
                    <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-lg text-xs mt-2">
                      <strong className="text-amber-950 block text-[11px] mb-1">Exames Complementares Solicitados:</strong>
                      <p className="text-slate-800 whitespace-pre-wrap font-medium">{viewingConsultation.requested_exams}</p>
                    </div>
                  </div>
                )}

                {/* 6. Orçamento & Serviços do Atendimento */}
                {viewingConsultation.billing_items && viewingConsultation.billing_items.length > 0 && (
                  <div>
                    <h4 className="font-bold text-slate-900 border-b border-slate-100 pb-1 uppercase tracking-wide text-[11px] flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-700" />
                        6. Honorários, Medicamentos & Orçamento do Atendimento
                      </span>
                      <button
                        type="button"
                        onClick={() => setViewingBudgetDoc(viewingConsultation)}
                        className="text-[10px] font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-2 py-0.5 rounded transition cursor-pointer print:hidden"
                      >
                        Imprimir Orçamento do Tutor →
                      </button>
                    </h4>
                    <div className="mt-2 space-y-1 bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs">
                      {viewingConsultation.billing_items.map((it, idx) => (
                        <div key={idx} className="flex justify-between items-center py-1 border-b border-slate-100 last:border-none">
                          <div className="text-slate-800">
                            <span className="font-semibold">{it.description}</span>
                            <span className="text-slate-400 text-[11px] ml-1.5">
                              ({it.quantity}x a R$ {it.unit_price.toFixed(2)})
                            </span>
                            {it.deduct_from_stock && (
                              <span className="text-[10px] ml-1.5 px-1.5 py-0.2 bg-teal-50 text-teal-800 rounded font-medium">
                                Maleta volante
                              </span>
                            )}
                          </div>
                          <span className="font-mono font-bold text-slate-900">
                            R$ {(it.total_price || (it.unit_price * it.quantity)).toFixed(2)}
                          </span>
                        </div>
                      ))}
                      {viewingConsultation.discount_amount && viewingConsultation.discount_amount > 0 ? (
                        <div className="flex justify-between items-center text-[11px] text-rose-600 pt-1">
                          <span>Desconto concedido:</span>
                          <span className="font-mono">- R$ {viewingConsultation.discount_amount.toFixed(2)}</span>
                        </div>
                      ) : null}
                      <div className="pt-2 border-t border-slate-200 flex justify-between items-center font-bold text-xs">
                        <span className="text-slate-700">
                          Total do Atendimento ({viewingConsultation.payment_method || 'PIX'} • {viewingConsultation.payment_status || 'PAGO'}):
                        </span>
                        <span className="text-emerald-800 font-mono text-sm">
                          R$ {(viewingConsultation.total_amount || 180).toFixed(2)}
                        </span>
                      </div>
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

      {/* Guia Oficial de Requisição de Exames Modal */}
      {viewingExamDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 overflow-y-auto max-h-[90vh] space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 print:hidden">
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                <Microscope className="w-4 h-4 text-amber-600" />
                Guia Oficial de Requisição de Exames
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
                  onClick={() => setViewingExamDoc(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document sheet */}
            <div className="space-y-6 text-slate-800">
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
                <div className="mt-3 inline-block bg-slate-900 text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  Requisição de Exames Complementares
                </div>
              </div>

              {/* Patient & Tutor Info */}
              <div className="grid grid-cols-2 gap-4 p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                <div>
                  <div>
                    <strong className="text-slate-700">Paciente:</strong> {viewingExamDoc.patient_name}
                  </div>
                  <div>
                    <strong className="text-slate-700">Tutor(a):</strong> {viewingExamDoc.tutor_name}
                  </div>
                </div>
                <div>
                  <div>
                    <strong className="text-slate-700">Data da Requisição:</strong>{' '}
                    {new Date(viewingExamDoc.date_time).toLocaleDateString('pt-BR')}
                  </div>
                  <div>
                    <strong className="text-slate-700">Suspeita Clínica:</strong>{' '}
                    {viewingExamDoc.diagnosis_suspicions || 'Investigação clínica'}
                  </div>
                </div>
              </div>

              {/* Exames Solicitados */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 border-b border-slate-200 pb-1 uppercase tracking-wide text-xs">
                  Exames Requisitados
                </h4>
                <div className="space-y-2">
                  {viewingExamDoc.requested_exams
                    ?.split(',')
                    .map((item) => item.trim())
                    .filter(Boolean)
                    .map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 bg-white"
                      >
                        <div className="w-4 h-4 border-2 border-slate-400 rounded-xs flex-shrink-0"></div>
                        <span className="text-xs font-semibold text-slate-900">{item}</span>
                      </div>
                    ))}
                  {(!viewingExamDoc.requested_exams || viewingExamDoc.requested_exams.trim() === '') && (
                    <p className="text-xs text-slate-500 italic">Nenhum exame detalhado.</p>
                  )}
                </div>
              </div>

              {/* Informações adicionais ao laboratório */}
              <div className="text-[11px] text-slate-500 italic border-l-2 border-slate-300 pl-3">
                Solicitamos a gentileza de encaminhar o laudo e resultados para o e-mail ou WhatsApp do veterinário responsável indicado no cabeçalho.
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

              {/* Vetgo footer */}
              <div className="pt-6 border-t border-slate-200 text-center text-[10px] text-slate-400">
                Documento emitido via <strong>Vetgo</strong> • Plataforma Veterinária
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Orçamento & Faturamento do Atendimento Modal */}
      {viewingBudgetDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 overflow-y-auto max-h-[90vh] space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 print:hidden">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-emerald-600" />
                Orçamento & Faturamento de Atendimento
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                {viewingBudgetDoc.prescriptions && viewingBudgetDoc.prescriptions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setViewingPrescriptionDoc(viewingBudgetDoc);
                      setViewingBudgetDoc(null);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100 transition cursor-pointer"
                  >
                    <Pill className="w-3.5 h-3.5 text-purple-700" />
                    <span>Ver Receituário ({viewingBudgetDoc.prescriptions.length})</span>
                  </button>
                )}
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-700 text-white hover:bg-emerald-800 transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir / PDF</span>
                </button>
                <button
                  onClick={() => setViewingBudgetDoc(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document sheet */}
            <div className="space-y-6 text-slate-800">
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
                <div className="mt-3 inline-block bg-slate-900 text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  Orçamento de Serviços & Procedimentos
                </div>
              </div>

              {/* Patient & Tutor Info */}
              <div className="grid grid-cols-2 gap-4 p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                <div>
                  <div>
                    <strong className="text-slate-700">Paciente:</strong> {viewingBudgetDoc.patient_name}
                  </div>
                  <div>
                    <strong className="text-slate-700">Tutor(a):</strong> {viewingBudgetDoc.tutor_name}
                  </div>
                </div>
                <div>
                  <div>
                    <strong className="text-slate-700">Data do Atendimento:</strong>{' '}
                    {new Date(viewingBudgetDoc.date_time).toLocaleDateString('pt-BR')}
                  </div>
                  <div>
                    <strong className="text-slate-700">Status:</strong>{' '}
                    <span className="font-bold text-emerald-800">
                      {viewingBudgetDoc.payment_status === 'PAGO' ? 'PAGO' : 'AGUARDANDO PAGAMENTO'}
                    </span>{' '}
                    ({viewingBudgetDoc.payment_method || 'PIX'})
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 border-b border-slate-200 pb-1 uppercase tracking-wide text-xs">
                  Itens & Medicamentos Discriminados
                </h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-slate-700 text-[11px] uppercase tracking-wider font-semibold">
                      <tr>
                        <th className="p-2.5">Descrição</th>
                        <th className="p-2.5 text-center">Qtd</th>
                        <th className="p-2.5 text-right">Unitário</th>
                        <th className="p-2.5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(viewingBudgetDoc.billing_items && viewingBudgetDoc.billing_items.length > 0) ? (
                        viewingBudgetDoc.billing_items.map((it, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2.5">
                              <span className="font-semibold text-slate-900 block">{it.description}</span>
                              <span className="text-[10px] text-slate-400 capitalize">{it.category.toLowerCase()}</span>
                            </td>
                            <td className="p-2.5 text-center font-mono">{it.quantity}</td>
                            <td className="p-2.5 text-right font-mono text-slate-600">
                              R$ {it.unit_price.toFixed(2)}
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                              R$ {(it.total_price || (it.unit_price * it.quantity)).toFixed(2)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="p-2.5">
                            <span className="font-semibold text-slate-900">Consulta Veterinária Domiciliar</span>
                          </td>
                          <td className="p-2.5 text-center font-mono">1</td>
                          <td className="p-2.5 text-right font-mono text-slate-600">
                            R$ {(viewingBudgetDoc.total_amount || 180).toFixed(2)}
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                            R$ {(viewingBudgetDoc.total_amount || 180).toFixed(2)}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals Summary */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal dos itens:</span>
                  <span className="font-mono">
                    R$ {(viewingBudgetDoc.subtotal_amount || viewingBudgetDoc.total_amount || 180).toFixed(2)}
                  </span>
                </div>
                {viewingBudgetDoc.discount_amount && viewingBudgetDoc.discount_amount > 0 ? (
                  <div className="flex justify-between text-rose-600">
                    <span>Desconto aplicado:</span>
                    <span className="font-mono">- R$ {viewingBudgetDoc.discount_amount.toFixed(2)}</span>
                  </div>
                ) : null}
                <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-sm text-slate-900">
                  <span>Valor Total:</span>
                  <span className="text-emerald-800 font-mono text-base">
                    R$ {(viewingBudgetDoc.total_amount || 180).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Bloco de Pagamento PIX com QR Code Oficial */}
              {user?.pix_key && (
                <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5 uppercase tracking-wide">
                      <QrCode className="w-4 h-4 text-emerald-700" />
                      Pagamento via PIX (Banco Central do Brasil)
                    </span>
                    <span className="text-[11px] font-mono text-emerald-800">
                      Chave: {user.pix_key}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-3 rounded-lg border border-emerald-100">
                    {budgetPixQr && (
                      <div className="p-1 bg-white border border-slate-200 rounded-lg shadow-2xs flex-shrink-0">
                        <img
                          src={budgetPixQr}
                          alt="QR Code PIX do Orçamento"
                          className="w-32 h-32 object-contain"
                        />
                      </div>
                    )}
                    <div className="flex-1 space-y-2 text-center sm:text-left">
                      <div className="text-xs text-slate-600">
                        Aponte a câmera do aplicativo do banco para escanear o QR Code no valor exato de{' '}
                        <strong className="text-emerald-900 font-mono text-sm">
                          R$ {(viewingBudgetDoc.total_amount || 180).toFixed(2)}
                        </strong>.
                      </div>
                      {budgetPixPayload && (
                        <div className="space-y-1.5 print:hidden">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(budgetPixPayload);
                              setBudgetCopied(true);
                              setTimeout(() => setBudgetCopied(false), 2500);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white transition cursor-pointer"
                          >
                            {budgetCopied ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-300" />
                                <span>Código Copiado!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copiar Pix Copia e Cola</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

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

              {/* Vetgo footer */}
              <div className="pt-6 border-t border-slate-200 text-center text-[10px] text-slate-400">
                Documento emitido via <strong>Vetgo</strong> • Plataforma Veterinária
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Impressão Oficial de Receituário Médico Veterinário */}
      {viewingPrescriptionDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-4 sm:p-8 shadow-2xl border border-slate-200 overflow-y-auto max-h-[95vh] print:max-h-none print:shadow-none print:p-0 print:border-none">
            {/* Header com ações */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 print:hidden flex-wrap gap-2">
              <span className="text-xs font-bold text-purple-900 bg-purple-100 px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5">
                <Pill className="w-3.5 h-3.5 text-purple-700" />
                Receituário Médico Veterinário Oficial
              </span>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    const rxText = (viewingPrescriptionDoc.prescriptions || [])
                      .map((rx, idx) => `${idx + 1}) *${rx.medication_name}* (${rx.route})\n   Posologia: ${rx.dose} — ${rx.frequency} por ${rx.duration_days} dias${rx.instructions ? `\n   Instruções: ${rx.instructions}` : ''}`)
                      .join('\n\n');
                    const fullText = `*RECEITA MÉDICA VETERINÁRIA*\nPaciente: *${viewingPrescriptionDoc.patient_name}*\nTutor: ${viewingPrescriptionDoc.tutor_name}\nData: ${new Date(viewingPrescriptionDoc.date_time).toLocaleDateString('pt-BR')}\n\n${rxText}\n\n*Orientações:* ${viewingPrescriptionDoc.conduct_plan || 'Seguir as orientações prescritas.'}\n\nDr(a). ${user?.first_name} ${user?.last_name} (CRMV-${user?.crmv_uf || 'SP'} ${user?.crmv || ''})`;
                    navigator.clipboard.writeText(fullText);
                    setPrescriptionCopied(true);
                    setTimeout(() => setPrescriptionCopied(false), 2500);
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                  title="Copiar texto formatado para envio no WhatsApp"
                >
                  {prescriptionCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{prescriptionCopied ? 'Copiado!' : 'Copiar p/ WhatsApp'}</span>
                </button>

                {viewingPrescriptionDoc.billing_items && viewingPrescriptionDoc.billing_items.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setViewingBudgetDoc(viewingPrescriptionDoc);
                      setViewingPrescriptionDoc(null);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition cursor-pointer"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>Ver Orçamento</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-purple-700 hover:bg-purple-800 text-white transition cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir / PDF</span>
                </button>

                <button
                  onClick={() => setViewingPrescriptionDoc(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Banner de Geração Automática */}
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl flex items-center justify-between gap-2 text-xs text-purple-900 print:hidden mt-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-purple-700 shrink-0" />
                <span>
                  <strong>Receituário gerado automaticamente</strong> a partir da prescrição do atendimento! Salvo no histórico clínico e no módulo <strong>Documentos</strong>.
                </span>
              </div>
            </div>

            {/* Document sheet */}
            <div className="space-y-6 text-slate-800 pt-2">
              {/* Cabeçalho do Veterinário */}
              <div className="text-center border-b border-slate-300 pb-4">
                <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                  {user?.clinic_name || `${user?.first_name} ${user?.last_name}`}
                </h2>
                <div className="text-xs font-semibold text-purple-950 mt-0.5">
                  Médico(a) Veterinário(a) • CRMV-{user?.crmv_uf || 'SP'} {user?.crmv || '34892'}
                </div>
                {user?.phone && (
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    WhatsApp: {user.phone} • Atendimento Volante e Domiciliar
                  </div>
                )}
                <div className="mt-3 inline-block bg-purple-900 text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  Receituário Médico Veterinário
                </div>
              </div>

              {/* Informações do Paciente e Tutor */}
              <div className="grid grid-cols-2 gap-4 p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                <div>
                  <div>
                    <strong className="text-slate-700">Paciente:</strong> {viewingPrescriptionDoc.patient_name}
                  </div>
                  <div>
                    <strong className="text-slate-700">Tutor(a):</strong> {viewingPrescriptionDoc.tutor_name}
                  </div>
                </div>
                <div>
                  <div>
                    <strong className="text-slate-700">Data de Emissão:</strong>{' '}
                    {new Date(viewingPrescriptionDoc.date_time).toLocaleDateString('pt-BR')}
                  </div>
                  <div>
                    <strong className="text-slate-700">Local:</strong> Atendimento Volante Domiciliar
                  </div>
                </div>
              </div>

              {/* Lista Numerada de Medicamentos Prescritos */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 border-b border-slate-200 pb-1 uppercase tracking-wide text-xs">
                  Prescrição Farmacológica
                </h4>
                <div className="space-y-3">
                  {(viewingPrescriptionDoc.prescriptions || []).map((rx, idx) => (
                    <div
                      key={rx.id || idx}
                      className="p-3.5 rounded-xl border border-purple-100 bg-purple-50/30 text-xs space-y-1"
                    >
                      <div className="flex items-baseline justify-between flex-wrap gap-2">
                        <span className="font-bold text-slate-900 text-sm">
                          {idx + 1}. {rx.medication_name}
                        </span>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-purple-100 text-purple-900 rounded font-mono">
                          Via {rx.route}
                        </span>
                      </div>
                      <div className="text-slate-700 font-medium">
                        Posologia: <strong className="text-purple-950">{rx.dose}</strong> — {rx.frequency} por {rx.duration_days} dias
                      </div>
                      {rx.instructions && (
                        <div className="text-[11px] text-slate-600 italic pt-0.5">
                          Instruções: {rx.instructions}
                        </div>
                      )}
                    </div>
                  ))}

                  {(!viewingPrescriptionDoc.prescriptions || viewingPrescriptionDoc.prescriptions.length === 0) && (
                    <p className="text-xs text-slate-500 italic">Nenhum medicamento prescrito nesta consulta.</p>
                  )}
                </div>
              </div>

              {/* Orientações e Conduta Geral */}
              {viewingPrescriptionDoc.conduct_plan && (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                  <strong className="text-slate-800 font-bold block text-[11px] uppercase tracking-wider">
                    Recomendações e Orientações Gerais ao Tutor:
                  </strong>
                  <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{viewingPrescriptionDoc.conduct_plan}</p>
                </div>
              )}

              {/* Aviso legal e responsabilidade */}
              <div className="text-[11px] text-slate-500 italic border-l-2 border-purple-300 pl-3">
                Uso sob prescrição e orientação médica veterinária. Não altere as doses ou suspenda o tratamento sem prévia consulta. Em caso de reações adversas, contate imediatamente o médico veterinário.
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

              {/* Vetgo footer */}
              <div className="pt-6 border-t border-slate-200 text-center text-[10px] text-slate-400">
                Receituário emitido via <strong>Vetgo</strong> • Plataforma Veterinária
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

            {/* Steps tabs - Grid 2x2 no mobile, 4 colunas no tablet/desktop - ZERO ROLAGEM LATERAL */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 border-b border-slate-200 pb-3">
              <button
                type="button"
                onClick={() => setModalStep('SOAP')}
                className={`p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer text-left flex items-center gap-2 ${
                  modalStep === 'SOAP'
                    ? 'bg-emerald-50 border-emerald-700 text-emerald-900 shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono shrink-0 ${modalStep === 'SOAP' ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
                  1
                </span>
                <span className="truncate">1. Anamnese</span>
              </button>

              <button
                type="button"
                onClick={() => setModalStep('VITAIS')}
                className={`p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer text-left flex items-center gap-2 ${
                  modalStep === 'VITAIS'
                    ? 'bg-emerald-50 border-emerald-700 text-emerald-900 shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono shrink-0 ${modalStep === 'VITAIS' ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
                  2
                </span>
                <span className="truncate">2. Vitais</span>
              </button>

              <button
                type="button"
                onClick={() => setModalStep('PRESCRICAO')}
                className={`p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer text-left flex items-center gap-2 ${
                  modalStep === 'PRESCRICAO'
                    ? 'bg-emerald-50 border-emerald-700 text-emerald-900 shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono shrink-0 ${modalStep === 'PRESCRICAO' ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
                  3
                </span>
                <div className="min-w-0 flex-1 flex items-center justify-between">
                  <span className="truncate">3. Prescrição/Exames</span>
                  {form.requested_exams && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 ml-1"></span>
                  )}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setModalStep('ORCAMENTO')}
                className={`p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer text-left flex items-center gap-2 ${
                  modalStep === 'ORCAMENTO'
                    ? 'bg-emerald-50 border-emerald-700 text-emerald-900 shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono shrink-0 ${modalStep === 'ORCAMENTO' ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
                  4
                </span>
                <div className="min-w-0 flex-1 flex items-center justify-between">
                  <span className="truncate">4. Orçamento</span>
                  {form.billing_items && form.billing_items.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-bold shrink-0 ml-1 font-mono">
                      R${Math.max(0, form.billing_items.reduce((acc, it) => acc + (it.total_price || (it.unit_price * it.quantity)), 0) - (form.discount_amount || 0)).toFixed(0)}
                    </span>
                  )}
                </div>
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

                  {/* 1. Queixa Principal & Evolução */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center text-[10px]">
                        1
                      </span>
                      Queixa Principal & Evolução Temporal
                    </h4>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Motivo da Consulta / Queixa Principal do Tutor *
                      </label>
                      <textarea
                        required
                        rows={2}
                        placeholder="Ex: Prurido em orelhas e patas há 3 dias, vômitos pós-prandiais, tosse seca..."
                        value={form.chief_complaint}
                        onChange={(e) => setForm({ ...form, chief_complaint: e.target.value })}
                        className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none bg-white"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Início dos Sintomas / Duração
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: Há 3 dias / Início súbito hoje cedo"
                          value={form.symptom_onset_duration}
                          onChange={(e) => setForm({ ...form, symptom_onset_duration: e.target.value })}
                          className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Padrão de Evolução
                        </label>
                        <div className="grid grid-cols-4 gap-1">
                          {(['Agudo', 'Crônico', 'Recorrente', 'Progressivo'] as const).map((ev) => (
                            <button
                              key={ev}
                              type="button"
                              onClick={() => setForm({ ...form, symptom_evolution: ev })}
                              className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition cursor-pointer text-center ${
                                form.symptom_evolution === ev
                                  ? 'bg-emerald-700 text-white shadow-2xs'
                                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              {ev}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2. Manejo, Ambiente & Nutrição */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center text-[10px]">
                        2
                      </span>
                      Manejo, Ambiente & Nutrição
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Tipo de Alimentação
                        </label>
                        <select
                          value={form.diet_type}
                          onChange={(e) => setForm({ ...form, diet_type: e.target.value })}
                          className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none bg-white"
                        >
                          <option value="Ração Seca Comercial">Ração Seca Comercial</option>
                          <option value="Ração Úmida / Sachê / Lata">Ração Úmida / Sachê / Lata</option>
                          <option value="Alimentação Natural (AN Balanceada)">Alimentação Natural (AN Balanceada)</option>
                          <option value="Dieta Caseira (Comida humana)">Dieta Caseira (Comida humana)</option>
                          <option value="Alimentação Mista (Ração + AN/Sachê)">Alimentação Mista (Ração + AN/Sachê)</option>
                          <option value="Outra Dieta">Outra Dieta</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Consumo de Água (Ingestão Hídrica)
                        </label>
                        <div className="grid grid-cols-3 gap-1">
                          {(['Normal', 'Aumentada (Polidipsia)', 'Diminuída (Hipodipsia)'] as const).map((w) => (
                            <button
                              key={w}
                              type="button"
                              onClick={() => setForm({ ...form, water_intake: w })}
                              className={`py-1.5 px-1.5 rounded-lg text-[11px] font-semibold transition cursor-pointer text-center leading-tight ${
                                form.water_intake === w
                                  ? 'bg-emerald-700 text-white shadow-2xs'
                                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              {w.split(' ')[0]}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Ambiente / Estilo de Vida
                        </label>
                        <select
                          value={form.environment_lifestyle}
                          onChange={(e) => setForm({ ...form, environment_lifestyle: e.target.value })}
                          className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none bg-white"
                        >
                          <option value="Apartamento (Sem acesso à rua)">Apartamento (Sem acesso à rua)</option>
                          <option value="Casa com quintal fechado">Casa com quintal fechado</option>
                          <option value="Acesso livre à rua / Semienterrado">Acesso livre à rua / Semienterrado</option>
                          <option value="Área Rural / Sítio / Chácara">Área Rural / Sítio / Chácara</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Contato com Outros Animais
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: Único animal / Convive com 1 gato e 1 cão vacinados"
                          value={form.other_animals_contact}
                          onChange={(e) => setForm({ ...form, other_animals_contact: e.target.value })}
                          className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 3. Histórico Sanitário & Profilaxia */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center text-[10px]">
                        3
                      </span>
                      Histórico Profilático & Sanitário
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Status Vacinal
                        </label>
                        <select
                          value={form.vaccine_status}
                          onChange={(e) => setForm({ ...form, vaccine_status: e.target.value as any })}
                          className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none bg-white"
                        >
                          <option value="Em dia">Em dia (Polivalente + Raiva)</option>
                          <option value="Atrasada">Atrasada / Vencida</option>
                          <option value="Incompleta">Incompleta (Filhote em protocolo)</option>
                          <option value="Nunca vacinado">Nunca vacinado</option>
                          <option value="Não sabe">Tutor não sabe informar</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Vermifugação
                        </label>
                        <div className="flex gap-2">
                          <select
                            value={form.deworming_status}
                            onChange={(e) => setForm({ ...form, deworming_status: e.target.value as any })}
                            className="w-1/2 px-2 py-2 text-xs border border-slate-300 rounded-lg outline-none bg-white"
                          >
                            <option value="Em dia">Em dia</option>
                            <option value="Atrasada">Atrasada</option>
                            <option value="Não administrado">Não fez</option>
                          </select>
                          <input
                            type="text"
                            placeholder="Data / Produto"
                            value={form.deworming_date_product}
                            onChange={(e) => setForm({ ...form, deworming_date_product: e.target.value })}
                            className="w-1/2 px-2 py-2 text-xs border border-slate-300 rounded-lg outline-none bg-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Antipulgas / Carrapatos
                        </label>
                        <div className="flex gap-2">
                          <select
                            value={form.ectoparasites_status}
                            onChange={(e) => setForm({ ...form, ectoparasites_status: e.target.value as any })}
                            className="w-1/2 px-2 py-2 text-xs border border-slate-300 rounded-lg outline-none bg-white"
                          >
                            <option value="Em dia">Em dia</option>
                            <option value="Atrasado">Atrasado</option>
                            <option value="Não administrado">Não usa</option>
                          </select>
                          <input
                            type="text"
                            placeholder="Ex: Simparic / Bravecto"
                            value={form.ectoparasites_product}
                            onChange={(e) => setForm({ ...form, ectoparasites_product: e.target.value })}
                            className="w-1/2 px-2 py-2 text-xs border border-slate-300 rounded-lg outline-none bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 4. Histórico Mórbido Pregresso & Alergias */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center text-[10px]">
                        4
                      </span>
                      Histórico Mórbido, Alergias & Medicações Contínuas
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Doenças Crônicas / Preexistentes
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: Nenhuma / Insuficiência renal / Diabetes / Cardiopatia"
                          value={form.chronic_diseases}
                          onChange={(e) => setForm({ ...form, chronic_diseases: e.target.value })}
                          className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Alergias Conhecidas (Medicamentosa / Alimentar)
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: Sem histórico / Alergia a Dipirona / DAPP"
                          value={form.known_allergies}
                          onChange={(e) => setForm({ ...form, known_allergies: e.target.value })}
                          className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Medicamentos em Uso Contínuo
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: Nenhum / Enalapril 5mg / Omeprazol"
                          value={form.continuous_medications}
                          onChange={(e) => setForm({ ...form, continuous_medications: e.target.value })}
                          className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Cirurgias Anteriores / Castração
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: Castrado aos 7 meses / Nenhuma cirurgia prévia"
                          value={form.previous_surgeries}
                          onChange={(e) => setForm({ ...form, previous_surgeries: e.target.value })}
                          className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 5. Revisão Dirigida por Sistemas (Campos Escritos / Semiologia) */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3.5">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2 flex-wrap gap-1">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center text-[10px]">
                          5
                        </span>
                        Revisão Dirigida por Sistemas (Semiologia Clínica)
                      </h4>
                      <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded">
                        ✍️ Campos livres para escrita do exame
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500">
                      Descreva por escrito as anotações, achados e particularidades de cada sistema semiológico examinado.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {/* Sistema Gastrointestinal */}
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700 block">
                          Sistema Gastrointestinal / Digestório:
                        </label>
                        <textarea
                          rows={2}
                          value={form.system_digestive}
                          onChange={(e) => setForm({ ...form, system_digestive: e.target.value })}
                          placeholder="Apetite, deglutição, vômitos, regurgitação, consistência fecal, palpação de alças..."
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none bg-white font-medium text-slate-800 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                        />
                      </div>

                      {/* Sistema Cardiorrespiratório */}
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700 block">
                          Sistema Cardiorrespiratório:
                        </label>
                        <textarea
                          rows={2}
                          value={form.system_respiratory}
                          onChange={(e) => setForm({ ...form, system_respiratory: e.target.value })}
                          placeholder="Ausculta cardiopulmonar, sopros, arritmias, tosse, secreção nasal, padrão respiratório..."
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none bg-white font-medium text-slate-800 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                        />
                      </div>

                      {/* Sistema Tegumentar & Orelhas */}
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700 block">
                          Sistema Tegumentar & Anexos (Pele e Orelhas):
                        </label>
                        <textarea
                          rows={2}
                          value={form.system_dermatological}
                          onChange={(e) => setForm({ ...form, system_dermatological: e.target.value })}
                          placeholder="Prurido, ectoparasitas, lesões cutâneas, alopecia, descamação, condutos auditivos..."
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none bg-white font-medium text-slate-800 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                        />
                      </div>

                      {/* Sistema Geniturinário */}
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700 block">
                          Sistema Geniturinário:
                        </label>
                        <textarea
                          rows={2}
                          value={form.system_urinary}
                          onChange={(e) => setForm({ ...form, system_urinary: e.target.value })}
                          placeholder="Micção, disúria, hematúria, secreção vulvar/prepucial, palpação vesical e renal..."
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none bg-white font-medium text-slate-800 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                        />
                      </div>

                      {/* Locomotor, Coluna & Neurológico */}
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700 block">
                          Locomotor, Coluna & Neurológico:
                        </label>
                        <textarea
                          rows={2}
                          value={form.system_locomotor_neuro}
                          onChange={(e) => setForm({ ...form, system_locomotor_neuro: e.target.value })}
                          placeholder="Claudicação, apoio de membros, reflexos espinhais/propriocepção, dor à palpação vertebral, postura..."
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none bg-white font-medium text-slate-800 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                        />
                      </div>

                      {/* Olhos & Cavidade Oral / Anexos */}
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700 block">
                          Olhos, Ouvidos & Cavidade Oral:
                        </label>
                        <textarea
                          rows={2}
                          value={form.system_eyes_ears}
                          onChange={(e) => setForm({ ...form, system_eyes_ears: e.target.value })}
                          placeholder="Reflexo pupilar, secreção ocular, conjuntivas, dentição, cálculo dentário, halitose, gengivas..."
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none bg-white font-medium text-slate-800 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 6. Síntese Geral da Anamnese */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Síntese da Anamnese & Relato do Tutor
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Resumo geral das observações relatadas pelo tutor e histórico clínico prévio..."
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
                      className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none bg-white font-medium"
                    />
                  </div>

                  {/* Solicitação de Exames Complementares */}
                  <div className="p-3.5 bg-amber-50/40 border border-amber-200/80 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5 uppercase tracking-wide">
                        <Microscope className="w-4 h-4 text-amber-700" />
                        Solicitação de Exames Complementares
                      </span>
                      <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                        Gera Guia de Requisição Oficial
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Exames Solicitados (Laboratório, Diagnóstico por Imagem, etc.)
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Ex: Hemograma completo, Ureia, Creatinina, ALT, FA, Ultrassonografia abdominal..."
                        value={form.requested_exams}
                        onChange={(e) => setForm({ ...form, requested_exams: e.target.value })}
                        className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none bg-white font-medium text-slate-800 focus:border-amber-500"
                      />
                    </div>

                    {/* Busca e Adição de Exames do Catálogo Pré-Cadastrado (Sem atalhos fixos) */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                          <Search className="w-3.5 h-3.5 text-amber-700" />
                          Buscar Exame no Catálogo para Inserir:
                        </label>
                        <Link
                          to="/servicos"
                          target="_blank"
                          className="text-[10px] font-semibold text-amber-800 hover:underline"
                        >
                          Gerenciar Exames
                        </Link>
                      </div>

                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Digite para buscar exame cadastrado (ex: Hemograma, Ureia, Ultrassom...)"
                          value={searchExamQuery}
                          onChange={(e) => {
                            setSearchExamQuery(e.target.value);
                            setShowExamDropdown(true);
                          }}
                          onFocus={() => setShowExamDropdown(true)}
                          className="w-full pl-3 pr-8 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-500 font-medium"
                        />
                        {searchExamQuery && (
                          <button
                            type="button"
                            onClick={() => {
                              setSearchExamQuery('');
                              setShowExamDropdown(false);
                            }}
                            className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}

                        {showExamDropdown && searchExamQuery.trim().length > 0 && (
                          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 max-h-48 overflow-y-auto divide-y divide-slate-100">
                            {services
                              .filter((s) => s.is_active && s.category === 'EXAME' && s.name.toLowerCase().includes(searchExamQuery.toLowerCase()))
                              .map((exam) => (
                                <button
                                  key={`exam-sug-${exam.id}`}
                                  type="button"
                                  onClick={() => {
                                    const current = form.requested_exams.trim();
                                    const updatedExams = !current ? exam.name : current.includes(exam.name) ? current : `${current}, ${exam.name}`;
                                    setForm({ ...form, requested_exams: updatedExams });

                                    // Adiciona também ao orçamento caso ainda não esteja
                                    const alreadyInBilling = form.billing_items.some((b) => b.description.toLowerCase() === exam.name.toLowerCase());
                                    if (!alreadyInBilling) {
                                      handleAddStandardService(exam.name, exam.price, 'EXAME');
                                    }

                                    setSearchExamQuery('');
                                    setShowExamDropdown(false);
                                  }}
                                  className="w-full text-left p-2 hover:bg-amber-50/80 transition flex items-center justify-between gap-2 cursor-pointer group"
                                >
                                  <div>
                                    <span className="font-semibold text-slate-900 text-xs group-hover:text-amber-900">
                                      + {exam.name}
                                    </span>
                                    {exam.description && (
                                      <p className="text-[10px] text-slate-400">{exam.description}</p>
                                    )}
                                  </div>
                                  <span className="font-mono font-bold text-amber-800 text-[11px] shrink-0">
                                    R$ {exam.price.toFixed(2)}
                                  </span>
                                </button>
                              ))}

                            {/* Fallback option to add what was typed */}
                            <button
                              type="button"
                              onClick={() => {
                                const current = form.requested_exams.trim();
                                const val = searchExamQuery.trim();
                                const updatedExams = !current ? val : `${current}, ${val}`;
                                setForm({ ...form, requested_exams: updatedExams });
                                setSearchExamQuery('');
                                setShowExamDropdown(false);
                              }}
                              className="w-full text-left p-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5 text-amber-600" />
                              <span>Inserir <strong>"{searchExamQuery.trim()}"</strong> na requisição</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
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
                      className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                    >
                      ← Voltar (Vitais)
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setModalStep('ORCAMENTO')}
                        className="px-4 py-2 text-xs font-bold bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 shadow-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <span>Avançar para Orçamento & Itens (Estoque) →</span>
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 cursor-pointer"
                        title="Finalizar atendimento direto com os itens atuais"
                      >
                        Finalizar Direto
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {modalStep === 'ORCAMENTO' && (
                <div className="space-y-4">
                  {/* Top info badge */}
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-950">
                    <Receipt className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
                    <div>
                      <strong className="block font-bold">
                        Montagem Direta de Orçamento & Integração Automática (Financeiro e Estoque)
                      </strong>
                      <p className="text-slate-600 text-[11px] mt-0.5">
                        Adicione serviços pré-cadastrados ou medicamentos/materiais da sua maleta de estoque. Ao finalizar, o orçamento completo com QR Code PIX é gerado para o tutor, os itens selecionados são baixados do estoque e a receita financeira é registrada automaticamente.
                      </p>
                    </div>
                  </div>

                  {/* 1. Busca e Adição de Serviços, Exames e Medicamentos do Estoque (Sem atalhos estáticos) */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Search className="w-3.5 h-3.5 text-emerald-700" />
                        Buscar e Adicionar Item ao Orçamento (Serviço, Exame ou Estoque)
                      </label>
                      <Link
                        to="/servicos"
                        target="_blank"
                        className="text-[11px] font-semibold text-emerald-700 hover:underline flex items-center gap-1"
                      >
                        <span>⚙️ Catálogo de Serviços & Exames</span>
                      </Link>
                    </div>

                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Digite para buscar serviços, procedimentos, exames ou medicamentos..."
                        value={searchServiceQuery}
                        onChange={(e) => {
                          setSearchServiceQuery(e.target.value);
                          setShowServiceDropdown(true);
                        }}
                        onFocus={() => setShowServiceDropdown(true)}
                        className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-2xs font-medium"
                      />
                      {searchServiceQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchServiceQuery('');
                            setShowServiceDropdown(false);
                          }}
                          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Dropdown de sugestões e resultados em tempo real */}
                      {showServiceDropdown && searchServiceQuery.trim().length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 max-h-64 overflow-y-auto divide-y divide-slate-100">
                          {/* Matching Services */}
                          {services
                            .filter((s) => s.is_active && s.name.toLowerCase().includes(searchServiceQuery.toLowerCase()))
                            .map((svc) => (
                              <button
                                key={`svc-${svc.id}`}
                                type="button"
                                onClick={() => {
                                  handleAddStandardService(svc.name, svc.price, svc.category);
                                  setSearchServiceQuery('');
                                  setShowServiceDropdown(false);
                                }}
                                className="w-full text-left p-2.5 hover:bg-emerald-50/80 transition flex items-center justify-between gap-2 cursor-pointer group"
                              >
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-semibold text-slate-900 text-xs group-hover:text-emerald-900">{svc.name}</span>
                                    <span className="text-[9px] uppercase px-1.5 py-0.5 rounded font-bold bg-slate-100 text-slate-700">
                                      {svc.category}
                                    </span>
                                  </div>
                                  {svc.description && (
                                    <p className="text-[11px] text-slate-400 truncate mt-0.5">{svc.description}</p>
                                  )}
                                </div>
                                <span className="font-mono font-bold text-emerald-800 text-xs shrink-0">
                                  R$ {svc.price.toFixed(2)}
                                </span>
                              </button>
                            ))}

                          {/* Matching Inventory */}
                          {inventory
                            .filter((i) => i.name.toLowerCase().includes(searchServiceQuery.toLowerCase()) || (i.active_ingredient && i.active_ingredient.toLowerCase().includes(searchServiceQuery.toLowerCase())))
                            .map((inv) => (
                              <button
                                key={`inv-${inv.id}`}
                                type="button"
                                onClick={() => {
                                  handleAddFromInventory(inv.id);
                                  setSearchServiceQuery('');
                                  setShowServiceDropdown(false);
                                }}
                                className="w-full text-left p-2.5 hover:bg-teal-50/80 transition flex items-center justify-between gap-2 cursor-pointer group"
                              >
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-semibold text-slate-900 text-xs group-hover:text-teal-900">{inv.name}</span>
                                    <span className="text-[9px] uppercase px-1.5 py-0.5 rounded font-bold bg-teal-100 text-teal-800">
                                      {inv.category === 'Vacina' ? 'Vacina' : 'Estoque / Medicamento'}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-slate-400 mt-0.5">
                                    Saldo Maleta: <strong className="text-teal-800">{inv.quantity_in_kit}</strong> | Central: {inv.quantity_in_stock}
                                  </p>
                                </div>
                                <span className="font-mono font-bold text-teal-800 text-xs shrink-0">
                                  R$ {(inv.sale_price || inv.cost_price || 0).toFixed(2)}
                                </span>
                              </button>
                            ))}

                          {/* Fallback add as custom item */}
                          <button
                            type="button"
                            onClick={() => {
                              handleAddStandardService(searchServiceQuery.trim(), 50, 'PROCEDIMENTO');
                              setSearchServiceQuery('');
                              setShowServiceDropdown(false);
                            }}
                            className="w-full text-left p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Adicionar <strong>"{searchServiceQuery.trim()}"</strong> como novo item avulso</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 2. Lista de Itens Discriminados no Orçamento (Mobile-First Card List, ZERO rolagem lateral) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                        <Receipt className="w-3.5 h-3.5 text-emerald-700" />
                        Itens Discriminados no Orçamento ({form.billing_items.length})
                      </span>
                      <button
                        type="button"
                        onClick={handleAddCustomItem}
                        className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Adicionar Item Avulso
                      </button>
                    </div>

                    {form.billing_items.length === 0 ? (
                      <div className="p-6 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center text-xs text-slate-500">
                        Nenhum item adicionado ao orçamento. Digite acima no campo de busca para encontrar serviços, exames ou medicamentos.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {form.billing_items.map((it, idx) => (
                          <div
                            key={it.id || idx}
                            className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-2.5 hover:border-slate-300 transition"
                          >
                            {/* Top row: Description + Delete */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <input
                                  type="text"
                                  value={it.description}
                                  onChange={(e) => handleUpdateBillingItem(idx, 'description', e.target.value)}
                                  className="w-full px-2.5 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg focus:border-emerald-500 outline-none text-slate-900"
                                  placeholder="Descrição do serviço, exame ou medicamento"
                                />
                                {it.inventory_item_id && (
                                  <span className="text-[10px] text-teal-700 font-semibold block mt-0.5">
                                    ✓ Vinculado ao estoque (#ID {it.inventory_item_id}) — baixa automática
                                  </span>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() => handleRemoveBillingItem(idx)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer shrink-0"
                                title="Remover item"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                            {/* Bottom row: Category, Stock toggle, Unit Price, Qty, Total */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-100 text-xs items-center">
                              <div>
                                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-0.5">Categoria</label>
                                <select
                                  value={it.category}
                                  onChange={(e) => handleUpdateBillingItem(idx, 'category', e.target.value)}
                                  className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg outline-none bg-slate-50 font-medium"
                                >
                                  <option value="CONSULTA">Consulta</option>
                                  <option value="PROCEDIMENTO">Procedimento</option>
                                  <option value="MEDICAMENTO">Medicamento</option>
                                  <option value="VACINA">Vacina</option>
                                  <option value="EXAME">Exame</option>
                                  <option value="OUTROS">Outros</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-0.5">Baixar Estoque</label>
                                <label className="inline-flex items-center gap-1.5 cursor-pointer py-1">
                                  <input
                                    type="checkbox"
                                    checked={!!it.deduct_from_stock}
                                    onChange={(e) => handleUpdateBillingItem(idx, 'deduct_from_stock', e.target.checked)}
                                    className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                                  />
                                  <span className="text-xs text-slate-700">{it.deduct_from_stock ? 'Sim (Maleta)' : 'Não'}</span>
                                </label>
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-0.5">Preço Unit. (R$)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={it.unit_price}
                                  onChange={(e) => handleUpdateBillingItem(idx, 'unit_price', e.target.value)}
                                  className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg focus:border-emerald-500 outline-none font-mono"
                                />
                              </div>

                              <div className="flex items-center justify-between sm:justify-end gap-3">
                                <div>
                                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-0.5 text-center">Qtd</label>
                                  <input
                                    type="number"
                                    step="1"
                                    min="1"
                                    value={it.quantity}
                                    onChange={(e) => handleUpdateBillingItem(idx, 'quantity', e.target.value)}
                                    className="w-14 px-1.5 py-1 text-xs text-center border border-slate-200 rounded-lg focus:border-emerald-500 outline-none font-mono"
                                  />
                                </div>

                                <div className="text-right">
                                  <span className="block text-[10px] font-bold uppercase text-slate-400 mb-0.5">Total</span>
                                  <span className="font-mono font-bold text-slate-900 text-sm block">
                                    R$ {(it.total_price || (it.unit_price * it.quantity)).toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 4. Resumo de Valores e Forma de Pagamento */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Forma de Pagamento Prevista
                        </label>
                        <select
                          value={form.payment_method}
                          onChange={(e) => setForm({ ...form, payment_method: e.target.value as PaymentMethod })}
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none bg-white font-semibold text-slate-800"
                        >
                          <option value="PIX">PIX (Chave & QR Code Automático)</option>
                          <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                          <option value="CARTAO_DEBITO">Cartão de Débito</option>
                          <option value="DINHEIRO">Dinheiro</option>
                          <option value="TRANSFERENCIA">Transferência Bancária</option>
                          <option value="BOLETO">Boleto Bancário</option>
                          <option value="FATURAMENTO_CLINICA">Faturamento Clínica Parceira</option>
                          <option value="PENDENTE">A Combinar / Pendente</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Status do Pagamento
                        </label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setForm({ ...form, payment_status: 'PAGO' })}
                            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition cursor-pointer border ${
                              form.payment_status === 'PAGO'
                                ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            ✓ Recebido / Pago
                          </button>
                          <button
                            type="button"
                            onClick={() => setForm({ ...form, payment_status: 'PENDENTE' })}
                            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition cursor-pointer border ${
                              form.payment_status === 'PENDENTE'
                                ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            ⏳ Aguardando / Pendente
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 bg-white p-3.5 rounded-lg border border-slate-200">
                      <div className="flex justify-between text-slate-600">
                        <span>Subtotal dos itens:</span>
                        <span className="font-mono font-semibold">
                          R$ {form.billing_items.reduce((acc, it) => acc + (it.total_price || (it.unit_price * it.quantity)), 0).toFixed(2)}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-slate-600">
                        <span>Desconto (R$):</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={form.discount_amount}
                          onChange={(e) => setForm({ ...form, discount_amount: parseFloat(e.target.value) || 0 })}
                          className="w-24 px-2 py-1 text-xs text-right border border-slate-200 rounded outline-none font-mono"
                          placeholder="0,00"
                        />
                      </div>

                      <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-slate-900 font-bold text-sm">
                        <span>Total do Orçamento:</span>
                        <span className="text-emerald-800 font-mono text-lg">
                          R$ {Math.max(0, form.billing_items.reduce((acc, it) => acc + (it.total_price || (it.unit_price * it.quantity)), 0) - (form.discount_amount || 0)).toFixed(2)}
                        </span>
                      </div>

                      <p className="text-[10px] text-slate-500 pt-1 border-t border-slate-100 leading-tight">
                        💡 Lança automaticamente a receita no Financeiro, baixa itens do estoque e abre o orçamento oficial com QR Code PIX para o tutor.
                      </p>
                    </div>
                  </div>

                  {/* Bottom Navigation */}
                  <div className="flex justify-between pt-3 border-t border-slate-100 items-center">
                    <button
                      type="button"
                      onClick={() => setModalStep('PRESCRICAO')}
                      className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                    >
                      ← Voltar (Prescrição)
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg shadow-xs cursor-pointer flex items-center gap-2"
                    >
                      <Receipt className="w-4 h-4" />
                      <span>
                        Salvar Atendimento & Apresentar Orçamento ao Tutor (R${' '}
                        {Math.max(
                          0,
                          form.billing_items.reduce(
                            (acc, it) => acc + (it.total_price || it.unit_price * it.quantity),
                            0
                          ) - (form.discount_amount || 0)
                        ).toFixed(2)}
                        )
                      </span>
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
