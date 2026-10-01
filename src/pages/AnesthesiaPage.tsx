import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import {
  AnesthesiaRecord,
  Clinic,
  Surgeon,
  Patient,
  Tutor,
  MonitoringReading,
  AnestheticTimelineEvent,
  ProtocolDrugItem,
  PostAnesthesiaRecovery,
  ProcedureNature,
  ASACategory
} from '../types';
import {
  Activity,
  Play,
  Pause,
  Clock,
  Plus,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Printer,
  ChevronRight,
  Stethoscope,
  Heart,
  Droplet,
  Pill,
  Sparkles,
  Building2,
  UserCheck,
  PawPrint,
  Calendar,
  X,
  History,
  TrendingDown,
  ArrowRight,
  ShieldAlert,
  Edit3
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const AnesthesiaPage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const isAnesthesiaActive = Boolean(user?.specialty_anesthesia_enabled);
  const [anesthesias, setAnesthesias] = useState<AnesthesiaRecord[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [surgeons, setSurgeons] = useState<Surgeon[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(true);

  // Anestesia ativa selecionada / em atendimento
  const [activeAnesthesia, setActiveAnesthesia] = useState<AnesthesiaRecord | null>(null);

  // Estados do Cronômetro Persistente
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerRef = useRef<any>(null);

  // Contagem regressiva da próxima monitorização
  const [countdownSeconds, setCountdownSeconds] = useState(300); // 5 min padrão

  // Modais de ações rápidas
  const [showNewAnesthesiaModal, setShowNewAnesthesiaModal] = useState(false);
  const [showQuickSurgeonModal, setShowQuickSurgeonModal] = useState(false);
  const [showMonitoringModal, setShowMonitoringModal] = useState(false);
  const [showDrugModal, setShowDrugModal] = useState(false);
  const [showFluidModal, setShowFluidModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Visualização de tabs
  const [viewMode, setViewMode] = useState<'LIST' | 'ACTIVE_ROOM'>('LIST');
  const [roomTab, setRoomTab] = useState<'MONITORING' | 'GRAPH' | 'PROTOCOL' | 'TIMELINE' | 'PRE_EVAL'>('MONITORING');

  // Form de Nova Anestesia
  const [newForm, setNewForm] = useState({
    clinic_id: 0,
    surgeon_id: 0,
    patient_id: 0,
    tutor_id: 0,
    procedure_name: '',
    procedure_nature: 'ELETIVA' as ProcedureNature,
    scheduled_time: '09:00',
    // Pré-avaliação
    weight_kg: 10,
    fasting_food_hours: 8,
    fasting_water_hours: 2,
    consciousness_level: 'Alerta' as any,
    reflexes: 'Preservados' as any,
    mucous_membranes: 'Normocoradas' as any,
    hydration_status: 'Normal (Adequada)' as any,
    heart_rate_bpm: 100,
    respiratory_rate_mpm: 20,
    temperature_c: 38.5,
    capillary_refill_time_sec: 2,
    allergies: '',
    previous_diseases: '',
    lab_tests_summary: '',
    // ASA
    asa_category: 'ASA_I' as ASACategory,
    is_emergency: false,
    asa_justification: '',
    // Planejamento
    technique: 'Anestesia Geral Balanceada Inalatória',
    fluid_type: 'Ringer com Lactato',
    fluid_rate_ml_kg_h: 5,
    breathing_circuit: 'Baraka (Sem reinalação)',
    intubation: true,
    tube_size: 'Tubo 8.0 com cuff',
    ventilation_type: 'Espontânea' as any,
    monitoring_interval_minutes: 5
  });

  // Form de Cirurgião Rápido (embutido no fluxo)
  const [quickSurgeon, setQuickSurgeon] = useState({
    name: '',
    crmv: '',
    crmv_uf: 'SP',
    phone: ''
  });

  // Form de Parâmetros
  const [monForm, setMonForm] = useState({
    fc: 90,
    fr: 14,
    spo2: 99,
    etco2: 38,
    pas: 120,
    pam: 80,
    pad: 60,
    temperature: 37.8,
    ecg: 'Sinusal'
  });

  // Form de Medicamento Rápido
  const [drugForm, setDrugForm] = useState({
    stage: 'MANUTENCAO' as any,
    drug_name: '',
    presentation_type: 'LIQUIDO_ML' as 'LIQUIDO_ML' | 'COMPRIMIDO',
    dose_mg_kg: 0.1,
    concentration_mg_ml: 10,
    route: 'IV' as any,
    administered_volume: 1.0,
    is_tablets_fraction: false
  });

  // Form de Fluido
  const [fluidForm, setFluidForm] = useState({
    fluid_type: 'Ringer Lactato',
    rate_ml_kg_h: 5,
    bolus_ml: 0,
    notes: 'Manutenção de volemia'
  });

  // Form de Evento
  const [eventForm, setEventForm] = useState({
    title: 'Início da Incisão Cirúrgica',
    description: ''
  });

  // Form de Intercorrência
  const [incidentForm, setIncidentForm] = useState({
    incident_type: 'Hipotensão' as any,
    description: 'PAM abaixo de 60 mmHg',
    intervention: 'Redução do anestésico inalatório e bolus de fluidoterapia 10 ml/kg.',
    outcome: 'Pressão arterial normalizada com PAM em 75 mmHg.'
  });

  // Form de Recuperação
  const [recoveryForm, setRecoveryForm] = useState<PostAnesthesiaRecovery>({
    extubation_time: '10:30',
    consciousness_level: 'Alerta',
    heart_rate_bpm: 94,
    respiratory_rate_mpm: 18,
    spo2_percentage: 99,
    temperature_c: 37.6,
    pain_score: 'Sem dor',
    recovery_quality: 'Excelente (Calma/Suave)',
    complications: 'Nenhuma',
    post_op_medications: 'Dipirona 25mg/kg + Meloxicam 0,1mg/kg',
    discharge_notes: 'Paciente consciente e estável.'
  });

  useEffect(() => {
    loadAllData();
  }, []);

  // Efeito do Cronômetro Persistente
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => {
          const next = prev + 1;
          // Salva no localStorage para persistência
          if (activeAnesthesia) {
            localStorage.setItem(`vetgo_timer_${activeAnesthesia.id}`, String(next));
          }
          return next;
        });

        // Contagem regressiva da monitorização
        setCountdownSeconds((prev) => {
          if (prev <= 1) {
            return (activeAnesthesia?.monitoring_interval_minutes || 5) * 60;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isTimerRunning, activeAnesthesia]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [anesthesiasData, clinicsData, surgeonsData, patientsData, tutorsData] = await Promise.all([
        api.getAnesthesias(),
        api.getClinics(),
        api.getSurgeons(),
        api.getPatients(),
        api.getTutors()
      ]);
      setAnesthesias(anesthesiasData);
      setClinics(clinicsData);
      setSurgeons(surgeonsData);
      setPatients(patientsData);
      setTutors(tutorsData);

      // Se houver uma anestesia em andamento, recupera o cronômetro
      const inProgress = anesthesiasData.find((a) => a.status === 'EM_ANDAMENTO');
      if (inProgress) {
        setActiveAnesthesia(inProgress);
        const savedTime = localStorage.getItem(`vetgo_timer_${inProgress.id}`);
        if (savedTime) {
          setElapsedSeconds(Number(savedTime));
        }
        setIsTimerRunning(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const formatTimer = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const formatCountdown = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleStartAnesthesia = async () => {
    if (!activeAnesthesia) return;
    const nowRealTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    // Atualiza status para EM_ANDAMENTO
    const updated = await api.updateAnesthesia(activeAnesthesia.id, {
      status: 'EM_ANDAMENTO',
      times: {
        ...activeAnesthesia.times,
        anesthesia_start_time: nowRealTime
      }
    });

    // Registra evento de início da anestesia
    await api.addTimelineEvent(activeAnesthesia.id, {
      event_type: 'EVENTO',
      real_time: nowRealTime,
      elapsed_time: '00:00:00',
      title: 'Início Oficial da Anestesia',
      description: `Intubação e manutenção iniciadas pelo anestesista.`
    });

    setActiveAnesthesia(updated);
    setIsTimerRunning(true);
    setElapsedSeconds(0);
    setCountdownSeconds((updated.monitoring_interval_minutes || 5) * 60);
    loadAllData();
  };

  const handleOpenActiveRoom = (anesthesia: AnesthesiaRecord) => {
    setActiveAnesthesia(anesthesia);
    const savedTime = localStorage.getItem(`vetgo_timer_${anesthesia.id}`);
    if (savedTime) {
      setElapsedSeconds(Number(savedTime));
    }
    if (anesthesia.status === 'EM_ANDAMENTO') {
      setIsTimerRunning(true);
    } else {
      setIsTimerRunning(false);
    }
    setViewMode('ACTIVE_ROOM');
  };

  const handleSaveMonitoring = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAnesthesia) return;

    const currentElapsedMins = Math.floor(elapsedSeconds / 60);
    const nowRealTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const newReading = {
      timestamp: nowRealTime,
      elapsed_minutes: currentElapsedMins,
      heart_rate_bpm: Number(monForm.fc),
      respiratory_rate_mpm: Number(monForm.fr),
      spo2_percentage: Number(monForm.spo2),
      etco2_mmhg: Number(monForm.etco2),
      pas_mmhg: Number(monForm.pas),
      pam_mmhg: Number(monForm.pam),
      pad_mmhg: Number(monForm.pad),
      temperature_c: Number(monForm.temperature),
      ecg_rhythm: monForm.ecg
    };

    await api.addMonitoringReading(activeAnesthesia.id, newReading);
    setCountdownSeconds((activeAnesthesia.monitoring_interval_minutes || 5) * 60);
    setShowMonitoringModal(false);

    const refreshed = await api.getAnesthesia(activeAnesthesia.id);
    if (refreshed) setActiveAnesthesia(refreshed);
  };

  const handleSaveDrug = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAnesthesia) return;

    const currentWeight = activeAnesthesia.pre_evaluation.weight_kg || 10;
    const calcVolume = (currentWeight * drugForm.dose_mg_kg) / drugForm.concentration_mg_ml;
    const nowRealTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    // Regra Requisito 20: Comprimido fracionado baixa inteiro
    const isTablet = drugForm.presentation_type === 'COMPRIMIDO';
    const consumedStock = isTablet ? Math.ceil(drugForm.administered_volume) : drugForm.administered_volume;

    const drugItem: ProtocolDrugItem = {
      id: `drug-${Date.now()}`,
      stage: drugForm.stage,
      drug_name: drugForm.drug_name,
      presentation_type: drugForm.presentation_type,
      dose_mg_kg: drugForm.dose_mg_kg,
      concentration_mg_ml: drugForm.concentration_mg_ml,
      route: drugForm.route,
      calculated_volume_ml: calcVolume,
      administered_volume: drugForm.administered_volume,
      consumed_stock_units: consumedStock,
      billed_units: drugForm.administered_volume,
      administered_at_time: nowRealTime,
      anesthetic_elapsed_time: formatTimer(elapsedSeconds)
    };

    const updatedDrugs = [...activeAnesthesia.protocol_drugs, drugItem];
    await api.updateAnesthesia(activeAnesthesia.id, { protocol_drugs: updatedDrugs });

    // Registra na timeline
    await api.addTimelineEvent(activeAnesthesia.id, {
      event_type: 'MEDICAMENTO',
      real_time: nowRealTime,
      elapsed_time: formatTimer(elapsedSeconds),
      title: `Administração: ${drugForm.drug_name}`,
      description: `Dose: ${drugForm.dose_mg_kg} mg/kg | Volume: ${drugForm.administered_volume} (${drugForm.route}). Baixa no estoque: ${consumedStock} unidades.`
    });

    setShowDrugModal(false);
    const refreshed = await api.getAnesthesia(activeAnesthesia.id);
    if (refreshed) setActiveAnesthesia(refreshed);
  };

  const handleSaveIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAnesthesia) return;

    const nowRealTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    await api.addTimelineEvent(activeAnesthesia.id, {
      event_type: 'INTERCORRENCIA',
      real_time: nowRealTime,
      elapsed_time: formatTimer(elapsedSeconds),
      title: `INTERCORRÊNCIA: ${incidentForm.incident_type}`,
      description: incidentForm.description,
      intervention: incidentForm.intervention,
      outcome: incidentForm.outcome
    });

    setShowIncidentModal(false);
    const refreshed = await api.getAnesthesia(activeAnesthesia.id);
    if (refreshed) setActiveAnesthesia(refreshed);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAnesthesia) return;

    const nowRealTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    await api.addTimelineEvent(activeAnesthesia.id, {
      event_type: 'EVENTO',
      real_time: nowRealTime,
      elapsed_time: formatTimer(elapsedSeconds),
      title: eventForm.title,
      description: eventForm.description || 'Registrado na linha do tempo anestésica.'
    });

    setShowEventModal(false);
    const refreshed = await api.getAnesthesia(activeAnesthesia.id);
    if (refreshed) setActiveAnesthesia(refreshed);
  };

  const handleSaveFluid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAnesthesia) return;

    const nowRealTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    await api.addTimelineEvent(activeAnesthesia.id, {
      event_type: 'FLUIDO',
      real_time: nowRealTime,
      elapsed_time: formatTimer(elapsedSeconds),
      title: `Ajuste Fluidoterapia: ${fluidForm.fluid_type}`,
      description: `Taxa: ${fluidForm.rate_ml_kg_h} ml/kg/h ${fluidForm.bolus_ml > 0 ? `| Bolus: ${fluidForm.bolus_ml} ml` : ''}. ${fluidForm.notes}`
    });

    setShowFluidModal(false);
    const refreshed = await api.getAnesthesia(activeAnesthesia.id);
    if (refreshed) setActiveAnesthesia(refreshed);
  };

  const handleFinishAnesthesia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAnesthesia) return;

    const nowRealTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    setIsTimerRunning(false);

    const anestheticDurationMins = Math.floor(elapsedSeconds / 60);

    const timesData = {
      anesthesia_end_time: nowRealTime,
      extubation_time: recoveryForm.extubation_time,
      anesthetic_duration_minutes: anestheticDurationMins,
      procedure_duration_minutes: Math.max(10, anestheticDurationMins - 15)
    };

    const finished = await api.finishAnesthesia(activeAnesthesia.id, recoveryForm, timesData);
    setActiveAnesthesia(finished);
    setShowRecoveryModal(false);
    loadAllData();
  };

  const handleCreateAnesthesia = async (e: React.FormEvent) => {
    e.preventDefault();
    const clinic = clinics.find((c) => c.id === Number(newForm.clinic_id));
    const surgeon = surgeons.find((s) => s.id === Number(newForm.surgeon_id));
    const patient = patients.find((p) => p.id === Number(newForm.patient_id));
    const tutor = tutors.find((t) => t.id === Number(newForm.tutor_id));

    if (!clinic || !surgeon || !patient) {
      alert('Selecione Clínica, Cirurgião e Paciente.');
      return;
    }

    const created = await api.createAnesthesia({
      clinic_id: clinic.id,
      clinic_name: clinic.name,
      surgeon_id: surgeon.id,
      surgeon_name: `${surgeon.name} (${surgeon.code})`,
      patient_id: patient.id,
      patient_name: patient.name,
      patient_species: patient.species,
      patient_breed: patient.breed,
      tutor_id: tutor ? tutor.id : patient.tutor_id,
      tutor_name: tutor ? tutor.name : (patient.tutor_name || 'Tutor'),
      procedure_name: newForm.procedure_name,
      procedure_nature: newForm.procedure_nature,
      scheduled_time: newForm.scheduled_time,
      status: 'PLANEJAMENTO',
      pre_evaluation: {
        weight_kg: Number(newForm.weight_kg),
        fasting_food_hours: Number(newForm.fasting_food_hours),
        fasting_water_hours: Number(newForm.fasting_water_hours),
        consciousness_level: newForm.consciousness_level,
        reflexes: newForm.reflexes,
        mucous_membranes: newForm.mucous_membranes,
        hydration_status: newForm.hydration_status,
        heart_rate_bpm: Number(newForm.heart_rate_bpm),
        respiratory_rate_mpm: Number(newForm.respiratory_rate_mpm),
        temperature_c: Number(newForm.temperature_c),
        capillary_refill_time_sec: Number(newForm.capillary_refill_time_sec),
        allergies: newForm.allergies,
        previous_diseases: newForm.previous_diseases,
        lab_tests_summary: newForm.lab_tests_summary
      },
      asa_category: newForm.asa_category,
      is_emergency: newForm.is_emergency,
      asa_justification: newForm.asa_justification,
      planning: {
        technique: newForm.technique,
        fluid_type: newForm.fluid_type,
        fluid_rate_ml_kg_h: Number(newForm.fluid_rate_ml_kg_h),
        intubation: newForm.intubation,
        tube_size: newForm.tube_size,
        breathing_circuit: newForm.breathing_circuit,
        ventilation_type: newForm.ventilation_type
      },
      monitoring_interval_minutes: Number(newForm.monitoring_interval_minutes) || 5,
      protocol_drugs: [],
      monitorings: [],
      timeline_events: []
    });

    setShowNewAnesthesiaModal(false);
    loadAllData();
    handleOpenActiveRoom(created);
  };

  const handleCreateQuickSurgeon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickSurgeon.name || !quickSurgeon.crmv) return;

    const created = await api.createSurgeon({
      name: quickSurgeon.name,
      crmv: quickSurgeon.crmv,
      crmv_uf: quickSurgeon.crmv_uf,
      phone: quickSurgeon.phone,
      clinic_ids: newForm.clinic_id ? [Number(newForm.clinic_id)] : []
    });

    setSurgeons((prev) => [created, ...prev]);
    setNewForm((prev) => ({ ...prev, surgeon_id: created.id }));
    setShowQuickSurgeonModal(false);
    setQuickSurgeon({ name: '', crmv: '', crmv_uf: 'SP', phone: '' });
  };

  // Cirurgiões ordenados pela clínica selecionada (Requisito 2)
  const prioritizedSurgeons = [...surgeons].sort((a, b) => {
    const aLinked = a.clinic_ids.includes(Number(newForm.clinic_id));
    const bLinked = b.clinic_ids.includes(Number(newForm.clinic_id));
    if (aLinked && !bLinked) return -1;
    if (!aLinked && bLinked) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      {/* Top Banner / Breadcrumb */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-bold text-slate-900 leading-tight">
                Anestesiologia Veterinária
              </h1>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                isAnesthesiaActive
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {isAnesthesiaActive ? 'Especialidade Ativa' : 'Módulo Desativado'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Fluxo completo: Avaliação • ASA • Cronômetro persistente • Monitorização • Ficha Anestésica
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <Link
            to="/configuracoes?tab=especialidades"
            className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-emerald-800 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
            title="Gerenciar especialidades"
          >
            ⚙️ Módulos
          </Link>
          {viewMode === 'ACTIVE_ROOM' && (
            <button
              onClick={() => setViewMode('LIST')}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
            >
              Ver Todas
            </button>
          )}
          <button
            onClick={() => setShowNewAnesthesiaModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Novo Procedimento
          </button>
        </div>
      </div>

      {/* Banner de Aviso caso o veterinário tenha desativado a especialidade */}
      {!isAnesthesiaActive && (
        <div className="px-4 sm:px-6 lg:px-8 pt-4">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900 shadow-xs">
            <div className="flex items-start sm:items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <strong className="block sm:inline font-bold">Módulo de Anestesiologia Desativado:</strong> As opções deste módulo estão ocultas do menu lateral. Seus dados e fichas continuam salvos normalmente.
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <button
                type="button"
                onClick={async () => {
                  await api.updateUserProfile({ specialty_anesthesia_enabled: true });
                  await refreshUser();
                }}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow-2xs transition cursor-pointer"
              >
                Reativar no Menu
              </button>
              <Link
                to="/configuracoes?tab=especialidades"
                className="px-3 py-1.5 bg-white border border-amber-300 text-amber-900 font-semibold rounded-lg hover:bg-amber-100 transition"
              >
                Configurações
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Visão 1: Sala Anestésica Ativa (com Cronômetro Persistente) */}
      {viewMode === 'ACTIVE_ROOM' && activeAnesthesia && (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
          {/* HEADER CRONÔMETRO PERSISTENTE (Fixo/Sticky no celular e desktop) */}
          <div className="sticky top-2 z-30 bg-slate-900 text-white p-4 rounded-xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <Clock className="w-6 h-6 text-emerald-400 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-emerald-400 tracking-wider">
                    {activeAnesthesia.code}
                  </span>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-black uppercase rounded ${
                      activeAnesthesia.status === 'EM_ANDAMENTO'
                        ? 'bg-emerald-500 text-slate-950'
                        : activeAnesthesia.status === 'RECUPERACAO'
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-slate-700 text-white'
                    }`}
                  >
                    {activeAnesthesia.status.replace('_', ' ')}
                  </span>
                  <span className="text-[11px] text-slate-300">
                    ASA {activeAnesthesia.asa_category.replace('_', ' ')}
                    {activeAnesthesia.is_emergency ? '-E' : ''}
                  </span>
                </div>
                <h2 className="text-base font-bold tracking-tight text-white mt-0.5">
                  {activeAnesthesia.patient_name} ({activeAnesthesia.patient_species} • {activeAnesthesia.pre_evaluation.weight_kg} kg)
                </h2>
                <p className="text-xs text-slate-400">
                  {activeAnesthesia.procedure_name} • {activeAnesthesia.clinic_name} • {activeAnesthesia.surgeon_name}
                </p>
              </div>
            </div>

            {/* CRONÔMETRO CENTRAL */}
            <div className="flex flex-wrap items-center justify-between sm:justify-end gap-4 sm:gap-6 bg-slate-800/80 p-3 rounded-lg border border-slate-700/50">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Tempo Anestésico
                </span>
                <span className="text-2xl sm:text-3xl font-mono font-black text-emerald-400 tracking-wider">
                  {formatTimer(elapsedSeconds)}
                </span>
              </div>

              {activeAnesthesia.status === 'EM_ANDAMENTO' && (
                <div className="border-l border-slate-700 pl-3 sm:pl-4">
                  <span className="text-[10px] uppercase font-bold text-amber-400 block">
                    Próxima Monitorização
                  </span>
                  <span className="text-lg font-mono font-bold text-amber-300">
                    {formatCountdown(countdownSeconds)}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {activeAnesthesia.status === 'PLANEJAMENTO' && (
                  <button
                    onClick={handleStartAnesthesia}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-md shadow-emerald-950/30"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    INICIAR ANESTESIA
                  </button>
                )}

                {activeAnesthesia.status === 'EM_ANDAMENTO' && (
                  <>
                    <button
                      onClick={() => setShowRecoveryModal(true)}
                      className="w-full sm:w-auto px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-black transition shadow-sm text-center"
                    >
                      ENCERRAR ANESTESIA → RECUPERAÇÃO
                    </button>
                  </>
                )}

                {activeAnesthesia.status === 'FINALIZADA' && (
                  <button
                    onClick={() => setShowPrintModal(true)}
                    className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-bold transition"
                  >
                    <Printer className="w-4 h-4" />
                    Ficha Anestésica
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* BARRA DE AÇÕES RÁPIDAS (Requisito 12) */}
          <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">
              Ações Rápidas em Sala:
            </span>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              <button
                onClick={() => setShowMonitoringModal(true)}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-bold transition"
              >
                <Plus className="w-3.5 h-3.5" /> + Parâmetros
              </button>
              <button
                onClick={() => setShowDrugModal(true)}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-bold transition"
              >
                <Pill className="w-3.5 h-3.5" /> + Medicamento
              </button>
              <button
                onClick={() => setShowFluidModal(true)}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-cyan-50 text-cyan-800 hover:bg-cyan-100 border border-cyan-200 rounded-lg text-xs font-bold transition"
              >
                <Droplet className="w-3.5 h-3.5" /> + Fluido
              </button>
              <button
                onClick={() => setShowEventModal(true)}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200 rounded-lg text-xs font-bold transition"
              >
                <Clock className="w-3.5 h-3.5" /> + Evento
              </button>
              <button
                onClick={() => setShowIncidentModal(true)}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-bold transition"
              >
                <AlertTriangle className="w-3.5 h-3.5" /> + Intercorrência
              </button>
            </div>
          </div>

          {/* NAVEGAÇÃO DE TABS DA SALA COM SCROLL HORIZONTAL MOBILE */}
          <div className="flex border-b border-slate-200 gap-4 text-xs font-bold overflow-x-auto pb-1 whitespace-nowrap">
            <button
              onClick={() => setRoomTab('MONITORING')}
              className={`pb-2.5 border-b-2 transition ${
                roomTab === 'MONITORING'
                  ? 'border-emerald-700 text-emerald-800'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Monitorização Periódica ({activeAnesthesia.monitorings.length})
            </button>
            <button
              onClick={() => setRoomTab('GRAPH')}
              className={`pb-2.5 border-b-2 transition ${
                roomTab === 'GRAPH'
                  ? 'border-emerald-700 text-emerald-800'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Registro em Grade (Ficha Tradicional)
            </button>
            <button
              onClick={() => setRoomTab('PROTOCOL')}
              className={`pb-2.5 border-b-2 transition ${
                roomTab === 'PROTOCOL'
                  ? 'border-emerald-700 text-emerald-800'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Protocolo Anestésico ({activeAnesthesia.protocol_drugs.length})
            </button>
            <button
              onClick={() => setRoomTab('TIMELINE')}
              className={`pb-2.5 border-b-2 transition ${
                roomTab === 'TIMELINE'
                  ? 'border-emerald-700 text-emerald-800'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Linha Temporal ({activeAnesthesia.timeline_events.length})
            </button>
            <button
              onClick={() => setRoomTab('PRE_EVAL')}
              className={`pb-2.5 border-b-2 transition ${
                roomTab === 'PRE_EVAL'
                  ? 'border-emerald-700 text-emerald-800'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Avaliação Pré & ASA
            </button>
          </div>

          {/* CONTEÚDO TAB: MONITORIZAÇÃO */}
          {roomTab === 'MONITORING' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse min-w-[700px]">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Minuto</th>
                      <th className="py-3 px-4">Horário Real</th>
                      <th className="py-3 px-4 text-rose-700">FC (bpm)</th>
                      <th className="py-3 px-4 text-blue-700">PAS / PAM / PAD</th>
                      <th className="py-3 px-4 text-emerald-700">SpO₂ (%)</th>
                      <th className="py-3 px-4 text-amber-700">ETCO₂ (mmHg)</th>
                      <th className="py-3 px-4 text-cyan-700">FR (mpm)</th>
                      <th className="py-3 px-4 text-indigo-700">Temp (°C)</th>
                      <th className="py-3 px-4">Ritmo ECG</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeAnesthesia.monitorings.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-slate-400">
                          Nenhum parâmetro registrado ainda. Clique em "+ Parâmetros" para adicionar a primeira leitura.
                        </td>
                      </tr>
                    ) : (
                      activeAnesthesia.monitorings.map((m) => (
                        <tr key={m.id} className="hover:bg-slate-50/80 font-mono">
                          <td className="py-3 px-4 font-bold text-slate-900">{m.elapsed_minutes} min</td>
                          <td className="py-3 px-4 text-slate-500">{m.timestamp}</td>
                          <td className="py-3 px-4 font-bold text-rose-700">{m.heart_rate_bpm || '-'}</td>
                          <td className="py-3 px-4 font-bold text-blue-700">
                            {m.pas_mmhg || '-'}/{m.pam_mmhg || '-'}/{m.pad_mmhg || '-'}
                          </td>
                          <td className="py-3 px-4 font-bold text-emerald-700">{m.spo2_percentage ? `${m.spo2_percentage}%` : '-'}</td>
                          <td className="py-3 px-4 font-bold text-amber-700">{m.etco2_mmhg || '-'}</td>
                          <td className="py-3 px-4 font-bold text-cyan-700">{m.respiratory_rate_mpm || '-'}</td>
                          <td className="py-3 px-4 font-bold text-indigo-700">{m.temperature_c ? `${m.temperature_c}°C` : '-'}</td>
                          <td className="py-3 px-4 font-sans text-slate-600">{m.ecg_rhythm || 'Sinusal'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CONTEÚDO TAB: REGISTRO EM GRADE ESTILO FICHA TRADICIONAL (Requisito 16) */}
          {roomTab === 'GRAPH' && (
            <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-6 shadow-xs">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Grade Anestésica Tradicional (Modelo Prontuário Veterinário)
                </h3>
                <p className="text-xs text-slate-500">
                  Visualização em colunas temporais preservando a leitura clínica contínua dos sinais vitais.
                </p>
              </div>

              {/* Grade de Sinais Vitais Cardiovasculares */}
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-xs text-center border-collapse min-w-[650px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="py-2.5 px-3 text-left w-36">Parâmetro / Tempo</th>
                      {activeAnesthesia.monitorings.map((m) => (
                        <th key={m.id} className="py-2.5 px-3 font-mono border-l border-slate-200">
                          {m.elapsed_minutes}'<br />
                          <span className="text-[10px] font-normal text-slate-400">{m.timestamp}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    <tr className="bg-rose-50/40">
                      <td className="py-2 px-3 text-left font-bold text-rose-800 font-sans">FC (bpm)</td>
                      {activeAnesthesia.monitorings.map((m) => (
                        <td key={m.id} className="py-2 px-3 border-l border-slate-200 font-bold text-rose-700">
                          {m.heart_rate_bpm || '-'}
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-blue-50/40">
                      <td className="py-2 px-3 text-left font-bold text-blue-800 font-sans">PAS (mmHg)</td>
                      {activeAnesthesia.monitorings.map((m) => (
                        <td key={m.id} className="py-2 px-3 border-l border-slate-200 text-blue-900 font-semibold">
                          {m.pas_mmhg || '-'}
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-blue-100/50">
                      <td className="py-2 px-3 text-left font-bold text-blue-900 font-sans">PAM (mmHg)</td>
                      {activeAnesthesia.monitorings.map((m) => (
                        <td key={m.id} className="py-2 px-3 border-l border-slate-200 font-bold text-blue-900">
                          {m.pam_mmhg || '-'}
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-blue-50/40">
                      <td className="py-2 px-3 text-left font-bold text-blue-800 font-sans">PAD (mmHg)</td>
                      {activeAnesthesia.monitorings.map((m) => (
                        <td key={m.id} className="py-2 px-3 border-l border-slate-200 text-blue-900">
                          {m.pad_mmhg || '-'}
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-emerald-50/40">
                      <td className="py-2 px-3 text-left font-bold text-emerald-800 font-sans">SpO₂ (%)</td>
                      {activeAnesthesia.monitorings.map((m) => (
                        <td key={m.id} className="py-2 px-3 border-l border-slate-200 font-bold text-emerald-700">
                          {m.spo2_percentage || '-'}
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-amber-50/40">
                      <td className="py-2 px-3 text-left font-bold text-amber-800 font-sans">ETCO₂ (mmHg)</td>
                      {activeAnesthesia.monitorings.map((m) => (
                        <td key={m.id} className="py-2 px-3 border-l border-slate-200 font-bold text-amber-700">
                          {m.etco2_mmhg || '-'}
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-cyan-50/40">
                      <td className="py-2 px-3 text-left font-bold text-cyan-800 font-sans">FR (mpm)</td>
                      {activeAnesthesia.monitorings.map((m) => (
                        <td key={m.id} className="py-2 px-3 border-l border-slate-200 font-bold text-cyan-700">
                          {m.respiratory_rate_mpm || '-'}
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-indigo-50/40">
                      <td className="py-2 px-3 text-left font-bold text-indigo-800 font-sans">Temp (°C)</td>
                      {activeAnesthesia.monitorings.map((m) => (
                        <td key={m.id} className="py-2 px-3 border-l border-slate-200 font-bold text-indigo-700">
                          {m.temperature_c || '-'}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CONTEÚDO TAB: PROTOCOLO ANESTÉSICO (Requisito 8) */}
          {roomTab === 'PROTOCOL' && (
            <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Fármacos e Medicamentos Administrados</h3>
                  <p className="text-xs text-slate-500">
                    Cálculo automático: Volume = (Peso × Dose) / Concentração.
                  </p>
                </div>
                <button
                  onClick={() => setShowDrugModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 text-white rounded-lg text-xs font-bold"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar Fármaco
                </button>
              </div>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                {activeAnesthesia.protocol_drugs.map((drug) => (
                  <div key={drug.id} className="p-3.5 bg-white hover:bg-slate-50 flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                          {drug.stage}
                        </span>
                        <span className="font-bold text-slate-900 text-sm">{drug.drug_name}</span>
                        <span className="text-slate-400">({drug.route})</span>
                      </div>
                      <p className="text-slate-600">
                        Dose: <strong>{drug.dose_mg_kg} mg/kg</strong> • Conc: <strong>{drug.concentration_mg_ml} mg/ml</strong> • Vol. Calculado: <strong>{drug.calculated_volume_ml.toFixed(2)} ml</strong>
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-mono font-bold text-emerald-800 text-sm">
                        {drug.administered_volume} {drug.presentation_type === 'COMPRIMIDO' ? 'comp' : 'ml'}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {drug.administered_at_time} • T: {drug.anesthetic_elapsed_time}
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium">
                        Baixa estoque: {drug.consumed_stock_units} un.
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CONTEÚDO TAB: LINHA TEMPORAL */}
          {roomTab === 'TIMELINE' && (
            <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900">Linha Temporal e Intercorrências do Atendimento</h3>
              <div className="relative pl-6 border-l-2 border-slate-200 space-y-4">
                {activeAnesthesia.timeline_events.map((evt) => (
                  <div key={evt.id} className="relative group">
                    <div
                      className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 border-white ${
                        evt.event_type === 'INTERCORRENCIA'
                          ? 'bg-rose-500 ring-2 ring-rose-200'
                          : evt.event_type === 'MEDICAMENTO'
                          ? 'bg-blue-500'
                          : 'bg-emerald-500'
                      }`}
                    />
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 flex items-center gap-1.5">
                          {evt.event_type === 'INTERCORRENCIA' && (
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                          )}
                          {evt.title}
                        </span>
                        <span className="font-mono text-[11px] text-slate-400">
                          {evt.real_time} • {evt.elapsed_time}
                        </span>
                      </div>
                      <p className="text-slate-600">{evt.description}</p>
                      {evt.intervention && (
                        <p className="text-slate-700 bg-amber-50 p-2 rounded border border-amber-100">
                          <strong>Conduta tomada:</strong> {evt.intervention}
                        </p>
                      )}
                      {evt.outcome && (
                        <p className="text-emerald-700">
                          <strong>Evolução:</strong> {evt.outcome}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CONTEÚDO TAB: AVALIAÇÃO PRÉ-ANESTÉSICA & ASA */}
          {roomTab === 'PRE_EVAL' && (
            <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4 shadow-xs text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 space-y-2">
                  <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">
                    Avaliação Clínica & Sinais Pré-Operatórios
                  </span>
                  <p><strong>Peso:</strong> {activeAnesthesia.pre_evaluation.weight_kg} kg</p>
                  <p><strong>Jejum Alimentar:</strong> {activeAnesthesia.pre_evaluation.fasting_food_hours || '-'} horas</p>
                  <p><strong>Jejum Hídrico:</strong> {activeAnesthesia.pre_evaluation.fasting_water_hours || '-'} horas</p>
                  <p><strong>Nível de Consciência:</strong> {activeAnesthesia.pre_evaluation.consciousness_level}</p>
                  <p><strong>Reflexos:</strong> {activeAnesthesia.pre_evaluation.reflexes}</p>
                  <p><strong>Mucosas:</strong> {activeAnesthesia.pre_evaluation.mucous_membranes}</p>
                  <p><strong>Hidratação:</strong> {activeAnesthesia.pre_evaluation.hydration_status}</p>
                  <p><strong>Alergias:</strong> {activeAnesthesia.pre_evaluation.allergies || 'Sem relatos'}</p>
                </div>

                <div className="p-4 bg-emerald-50/50 rounded-lg border border-emerald-100 space-y-2">
                  <span className="font-bold text-emerald-900 uppercase tracking-wider text-[10px]">
                    Classificação ASA & Justificativa
                  </span>
                  <div className="text-base font-black text-emerald-900">
                    {activeAnesthesia.asa_category.replace('_', ' ')}
                    {activeAnesthesia.is_emergency ? ' (EMERGÊNCIA)' : ''}
                  </div>
                  <p className="text-slate-700 italic">
                    "{activeAnesthesia.asa_justification || 'Conforme avaliação clínica prévia do anestesiologista.'}"
                  </p>

                  <div className="pt-2 border-t border-emerald-200/60 mt-2">
                    <span className="font-bold text-emerald-900 uppercase tracking-wider text-[10px] block mb-1">
                      Planejamento Anestésico
                    </span>
                    <p><strong>Técnica:</strong> {activeAnesthesia.planning.technique}</p>
                    <p><strong>Circuito:</strong> {activeAnesthesia.planning.breathing_circuit}</p>
                    <p><strong>Intubação:</strong> {activeAnesthesia.planning.intubation ? `Sim (${activeAnesthesia.planning.tube_size || 'Com cuff'})` : 'Não'}</p>
                    <p><strong>Ventilação:</strong> {activeAnesthesia.planning.ventilation_type}</p>
                    <p><strong>Fluidoterapia:</strong> {activeAnesthesia.planning.fluid_type} a {activeAnesthesia.planning.fluid_rate_ml_kg_h} ml/kg/h</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Visão 2: Listagem Geral de Anestesias */}
      {viewMode === 'LIST' && (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Atendimentos Anestésicos</h2>
            <span className="text-xs text-slate-500">{anesthesias.length} procedimentos registrados</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {anesthesias.map((a) => (
              <div
                key={a.id}
                onClick={() => handleOpenActiveRoom(a)}
                className="bg-white p-5 rounded-xl border border-slate-200/90 hover:border-emerald-500 hover:shadow-md transition cursor-pointer flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-xs font-bold text-emerald-700">
                        {a.code}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 mt-0.5">
                        {a.patient_name}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {a.patient_species} • Tutor: {a.tutor_name}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-black rounded uppercase ${
                        a.status === 'EM_ANDAMENTO'
                          ? 'bg-emerald-100 text-emerald-800 animate-pulse'
                          : a.status === 'RECUPERACAO'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {a.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-lg text-xs space-y-1">
                    <p className="font-semibold text-slate-800 line-clamp-1">{a.procedure_name}</p>
                    <p className="text-slate-500">
                      <strong>Clínica:</strong> {a.clinic_name}
                    </p>
                    <p className="text-slate-500">
                      <strong>Cirurgião:</strong> {a.surgeon_name}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold">
                      {a.asa_category.replace('_', ' ')}
                      {a.is_emergency ? '-E' : ''}
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-500 font-medium">
                      {a.monitorings.length} leituras
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-500 font-medium">
                      {a.protocol_drugs.length} fármacos
                    </span>
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400">{a.date}</span>
                  <span className="font-bold text-emerald-800 flex items-center gap-1">
                    Acessar Sala <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: NOVO PROCEDIMENTO ANESTÉSICO */}
      {showNewAnesthesiaModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl max-h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-700" />
                <h3 className="text-base font-bold text-slate-900">
                  Novo Atendimento Anestésico
                </h3>
              </div>
              <button
                onClick={() => setShowNewAnesthesiaModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAnesthesia} className="p-5 overflow-y-auto flex-1 space-y-5 text-xs">
              {/* Etapa 1: Vínculo Clínica e Cirurgião */}
              <div className="space-y-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200/80">
                <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">
                  1. Local & Equipe Cirúrgica
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Clínica Parceira *</label>
                    <select
                      required
                      value={newForm.clinic_id}
                      onChange={(e) => setNewForm({ ...newForm, clinic_id: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                    >
                      <option value={0}>Selecione a Clínica...</option>
                      {clinics.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.code} - {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-semibold text-slate-700">Cirurgião *</label>
                      <button
                        type="button"
                        onClick={() => setShowQuickSurgeonModal(true)}
                        className="text-[10px] text-emerald-700 font-bold hover:underline"
                      >
                        + Cadastrar Cirurgião Rápido
                      </button>
                    </div>
                    <select
                      required
                      value={newForm.surgeon_id}
                      onChange={(e) => setNewForm({ ...newForm, surgeon_id: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                    >
                      <option value={0}>Selecione o Cirurgião...</option>
                      {prioritizedSurgeons.map((s) => {
                        const isLinked = s.clinic_ids.includes(Number(newForm.clinic_id));
                        return (
                          <option key={s.id} value={s.id}>
                            {s.code} - {s.name} (CRMV-{s.crmv_uf} {s.crmv}){isLinked ? ' ★ Vinculado' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
              </div>

              {/* Etapa 2: Paciente & Tutor */}
              <div className="space-y-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200/80">
                <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">
                  2. Paciente & Procedimento
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Paciente *</label>
                    <select
                      required
                      value={newForm.patient_id}
                      onChange={(e) => {
                        const pid = Number(e.target.value);
                        const pat = patients.find((p) => p.id === pid);
                        setNewForm({
                          ...newForm,
                          patient_id: pid,
                          tutor_id: pat ? pat.tutor_id : 0,
                          weight_kg: pat?.weight_kg || 10
                        });
                      }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                    >
                      <option value={0}>Selecione o Paciente...</option>
                      {patients.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.species} • {p.breed || 'SRD'}) - Tutor: {p.tutor_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Procedimento Cirúrgico *</label>
                    <input
                      type="text"
                      required
                      value={newForm.procedure_name}
                      onChange={(e) => setNewForm({ ...newForm, procedure_name: e.target.value })}
                      placeholder="Ex: OSH Terapêutica / Nodulectomia / Osteossíntese"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Caráter do Procedimento</label>
                    <select
                      value={newForm.procedure_nature}
                      onChange={(e) => setNewForm({ ...newForm, procedure_nature: e.target.value as any })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                    >
                      <option value="ELETIVA">Eletiva</option>
                      <option value="URGENCIA">Urgência</option>
                      <option value="EMERGENCIA">Emergência</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Peso do Paciente (kg) *</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={newForm.weight_kg}
                      onChange={(e) => setNewForm({ ...newForm, weight_kg: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Horário Previsto</label>
                    <input
                      type="time"
                      value={newForm.scheduled_time}
                      onChange={(e) => setNewForm({ ...newForm, scheduled_time: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Etapa 3: Avaliação Pré-Anestésica (Requisito 5) */}
              <div className="space-y-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200/80">
                <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">
                  3. Avaliação Pré-Anestésica
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block font-medium text-slate-600 mb-0.5">Jejum Alimentar (h)</label>
                    <input
                      type="number"
                      value={newForm.fasting_food_hours}
                      onChange={(e) => setNewForm({ ...newForm, fasting_food_hours: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-600 mb-0.5">Jejum Hídrico (h)</label>
                    <input
                      type="number"
                      value={newForm.fasting_water_hours}
                      onChange={(e) => setNewForm({ ...newForm, fasting_water_hours: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-600 mb-0.5">FC Prévia (bpm)</label>
                    <input
                      type="number"
                      value={newForm.heart_rate_bpm}
                      onChange={(e) => setNewForm({ ...newForm, heart_rate_bpm: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-600 mb-0.5">FR Prévia (mpm)</label>
                    <input
                      type="number"
                      value={newForm.respiratory_rate_mpm}
                      onChange={(e) => setNewForm({ ...newForm, respiratory_rate_mpm: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block font-medium text-slate-600 mb-0.5">Consciência</label>
                    <select
                      value={newForm.consciousness_level}
                      onChange={(e) => setNewForm({ ...newForm, consciousness_level: e.target.value as any })}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded bg-white"
                    >
                      <option value="Alerta">Alerta</option>
                      <option value="Apático">Apático</option>
                      <option value="Deprimido">Deprimido</option>
                      <option value="Estuporoso">Estuporoso</option>
                      <option value="Comatoso">Comatoso</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium text-slate-600 mb-0.5">Mucosas</label>
                    <select
                      value={newForm.mucous_membranes}
                      onChange={(e) => setNewForm({ ...newForm, mucous_membranes: e.target.value as any })}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded bg-white"
                    >
                      <option value="Normocoradas">Normocoradas</option>
                      <option value="Pálidas">Pálidas</option>
                      <option value="Cianóticas">Cianóticas</option>
                      <option value="Ictéricas">Ictéricas</option>
                      <option value="Congestas">Congestas</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium text-slate-600 mb-0.5">Hidratação</label>
                    <select
                      value={newForm.hydration_status}
                      onChange={(e) => setNewForm({ ...newForm, hydration_status: e.target.value as any })}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded bg-white"
                    >
                      <option value="Normal (Adequada)">Normal (Adequada)</option>
                      <option value="Leve (5-6%)">Leve (5-6%)</option>
                      <option value="Moderada (7-9%)">Moderada (7-9%)</option>
                      <option value="Grave (>10%)">Grave (&gt;10%)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newForm.allergies}
                    onChange={(e) => setNewForm({ ...newForm, allergies: e.target.value })}
                    placeholder="Histórico de alergias ou sensibilidade prévia..."
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded bg-white"
                  />
                  <input
                    type="text"
                    value={newForm.lab_tests_summary}
                    onChange={(e) => setNewForm({ ...newForm, lab_tests_summary: e.target.value })}
                    placeholder="Resumo exames laboratoriais (Hemograma, Ureia, Creat, ALT)..."
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded bg-white"
                  />
                </div>
              </div>

              {/* Etapa 4: Classificação ASA (Requisito 6 - Decisão exclusiva do veterinário) */}
              <div className="space-y-3 bg-emerald-50/60 p-3.5 rounded-lg border border-emerald-200/80">
                <span className="font-bold text-emerald-950 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-emerald-700" />
                  4. Classificação ASA (Decisão do Veterinário)
                </span>
                <p className="text-[10px] text-emerald-800">
                  O sistema não decide automaticamente a classificação ASA. Selecione a classe e justifique clinicamente.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Classificação ASA</label>
                    <select
                      value={newForm.asa_category}
                      onChange={(e) => setNewForm({ ...newForm, asa_category: e.target.value as any })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white font-bold text-emerald-900"
                    >
                      <option value="ASA_I">ASA I - Paciente hígido sem afecção sistêmica</option>
                      <option value="ASA_II">ASA II - Afecção sistêmica leve a moderada controlada</option>
                      <option value="ASA_III">ASA III - Afecção sistêmica grave com limitação funcional</option>
                      <option value="ASA_IV">ASA IV - Afecção sistêmica grave com ameaça constante à vida</option>
                      <option value="ASA_V">ASA V - Paciente moribundo com sobrevida improvável sem cirurgia</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-3 pt-4">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                      <input
                        type="checkbox"
                        checked={newForm.is_emergency}
                        onChange={(e) => setNewForm({ ...newForm, is_emergency: e.target.checked })}
                        className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                      />
                      <span>Indicação de Emergência (-E)</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Justificativa Clínica do ASA *</label>
                  <input
                    type="text"
                    required
                    value={newForm.asa_justification}
                    onChange={(e) => setNewForm({ ...newForm, asa_justification: e.target.value })}
                    placeholder="Ex: Paciente hígido com massa localizada / Nefrite crônica estável..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                  />
                </div>
              </div>

              {/* Etapa 5: Planejamento & Intervalo */}
              <div className="space-y-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200/80">
                <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">
                  5. Planejamento Anestésico & Monitorização
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Técnica Anestésica</label>
                    <input
                      type="text"
                      value={newForm.technique}
                      onChange={(e) => setNewForm({ ...newForm, technique: e.target.value })}
                      placeholder="Ex: TIVA, Inalatória balanceada..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Fluidoterapia</label>
                    <input
                      type="text"
                      value={newForm.fluid_type}
                      onChange={(e) => setNewForm({ ...newForm, fluid_type: e.target.value })}
                      placeholder="Ringer Lactato"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Intervalo de Monitorização</label>
                    <select
                      value={newForm.monitoring_interval_minutes}
                      onChange={(e) => setNewForm({ ...newForm, monitoring_interval_minutes: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white font-bold text-emerald-800"
                    >
                      <option value={5}>A cada 5 minutos</option>
                      <option value={10}>A cada 10 minutos</option>
                      <option value={15}>A cada 15 minutos</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50 -mx-5 -mb-5 mt-4">
                <button
                  type="button"
                  onClick={() => setShowNewAnesthesiaModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-100 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold shadow-sm"
                >
                  Criar Atendimento Anestésico
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CADASTRO RÁPIDO DE CIRURGIÃO DURANTE O ATENDIMENTO (Requisito 2) */}
      {showQuickSurgeonModal && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-emerald-800 text-white">
              <h4 className="text-sm font-bold">Cadastro Rápido de Cirurgião</h4>
              <button
                onClick={() => setShowQuickSurgeonModal(false)}
                className="p-1 text-emerald-200 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateQuickSurgeon} className="p-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nome do Cirurgião *</label>
                <input
                  type="text"
                  required
                  value={quickSurgeon.name}
                  onChange={(e) => setQuickSurgeon({ ...quickSurgeon, name: e.target.value })}
                  placeholder="Dr. Nome Sobrenome"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">CRMV *</label>
                  <input
                    type="text"
                    required
                    value={quickSurgeon.crmv}
                    onChange={(e) => setQuickSurgeon({ ...quickSurgeon, crmv: e.target.value })}
                    placeholder="23450"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">UF CRMV</label>
                  <select
                    value={quickSurgeon.crmv_uf}
                    onChange={(e) => setQuickSurgeon({ ...quickSurgeon, crmv_uf: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                  >
                    {['SP', 'RJ', 'MG', 'PR', 'SC', 'RS', 'GO', 'DF', 'BA'].map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowQuickSurgeonModal(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-700 text-white font-bold rounded-lg"
                >
                  Salvar e Selecionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: + PARÂMETROS MONITORIZAÇÃO */}
      {showMonitoringModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-600" />
                Registrar Nova Leitura de Parâmetros
              </h4>
              <button
                onClick={() => setShowMonitoringModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveMonitoring} className="p-4 space-y-3 text-xs">
              <p className="text-[11px] text-slate-500">
                Informe os valores lidos no monitor. O sistema nunca inventa nem repete automaticamente parâmetros.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-rose-700 mb-1">FC (bpm)</label>
                  <input
                    type="number"
                    required
                    value={monForm.fc}
                    onChange={(e) => setMonForm({ ...monForm, fc: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-cyan-700 mb-1">FR (mpm)</label>
                  <input
                    type="number"
                    required
                    value={monForm.fr}
                    onChange={(e) => setMonForm({ ...monForm, fr: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-blue-700 mb-1">PAS (mmHg)</label>
                  <input
                    type="number"
                    value={monForm.pas}
                    onChange={(e) => setMonForm({ ...monForm, pas: Number(e.target.value) })}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-blue-800 mb-1">PAM (mmHg)</label>
                  <input
                    type="number"
                    value={monForm.pam}
                    onChange={(e) => setMonForm({ ...monForm, pam: Number(e.target.value) })}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-blue-700 mb-1">PAD (mmHg)</label>
                  <input
                    type="number"
                    value={monForm.pad}
                    onChange={(e) => setMonForm({ ...monForm, pad: Number(e.target.value) })}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-emerald-700 mb-1">SpO₂ (%)</label>
                  <input
                    type="number"
                    value={monForm.spo2}
                    onChange={(e) => setMonForm({ ...monForm, spo2: Number(e.target.value) })}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-amber-700 mb-1">ETCO₂ (mmHg)</label>
                  <input
                    type="number"
                    value={monForm.etco2}
                    onChange={(e) => setMonForm({ ...monForm, etco2: Number(e.target.value) })}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-indigo-700 mb-1">Temp (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={monForm.temperature}
                    onChange={(e) => setMonForm({ ...monForm, temperature: Number(e.target.value) })}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ritmo ECG</label>
                <input
                  type="text"
                  value={monForm.ecg}
                  onChange={(e) => setMonForm({ ...monForm, ecg: e.target.value })}
                  placeholder="Ex: Sinusal normal, taquicardia sinusal, VPC isolada..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowMonitoringModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg shadow-sm"
                >
                  Salvar Leitura
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: + MEDICAMENTO RÁPIDO */}
      {showDrugModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-blue-700 text-white">
              <h4 className="text-sm font-bold flex items-center gap-2">
                <Pill className="w-4 h-4" /> Administrar Fármaco
              </h4>
              <button onClick={() => setShowDrugModal(false)} className="text-blue-200 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveDrug} className="p-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Etapa</label>
                  <select
                    value={drugForm.stage}
                    onChange={(e) => setDrugForm({ ...drugForm, stage: e.target.value as any })}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded bg-white"
                  >
                    <option value="MPA">MPA</option>
                    <option value="INDUCAO">Indução</option>
                    <option value="MANUTENCAO">Manutenção</option>
                    <option value="ANALGESIA">Analgesia</option>
                    <option value="BLOQUEIO">Bloqueio Locorregional</option>
                    <option value="OUTROS">Outros</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Forma Farmacêutica</label>
                  <select
                    value={drugForm.presentation_type}
                    onChange={(e) => setDrugForm({ ...drugForm, presentation_type: e.target.value as any })}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded bg-white font-medium"
                  >
                    <option value="LIQUIDO_ML">Líquido / Injetável (ml)</option>
                    <option value="COMPRIMIDO">Comprimido (unidade física)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nome do Medicamento *</label>
                <input
                  type="text"
                  required
                  value={drugForm.drug_name}
                  onChange={(e) => setDrugForm({ ...drugForm, drug_name: e.target.value })}
                  placeholder="Ex: Fentanil, Cetamina, Propofol, Dipirona..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Dose (mg/kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={drugForm.dose_mg_kg}
                    onChange={(e) => setDrugForm({ ...drugForm, dose_mg_kg: Number(e.target.value) })}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Conc. (mg/ml)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={drugForm.concentration_mg_ml}
                    onChange={(e) => setDrugForm({ ...drugForm, concentration_mg_ml: Number(e.target.value) })}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Via</label>
                  <select
                    value={drugForm.route}
                    onChange={(e) => setDrugForm({ ...drugForm, route: e.target.value as any })}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded bg-white"
                  >
                    <option value="IV">IV</option>
                    <option value="IM">IM</option>
                    <option value="SC">SC</option>
                    <option value="Epidural">Epidural</option>
                    <option value="Perineural">Perineural</option>
                    <option value="Inalatória">Inalatória</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border space-y-1">
                <span className="text-[11px] font-bold text-slate-700">Volume Efetivamente Administrado *</span>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={drugForm.administered_volume}
                  onChange={(e) => setDrugForm({ ...drugForm, administered_volume: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded font-mono font-bold text-slate-900 bg-white"
                />
                {drugForm.presentation_type === 'COMPRIMIDO' && (
                  <p className="text-[10px] text-amber-800 italic">
                    Regra Vetgo: frações clínicas (ex: 0.5 comp) dão baixa em comprimidos físicos inteiros ({Math.ceil(drugForm.administered_volume)} un) no estoque.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDrugModal(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-700 text-white font-bold rounded-lg shadow-sm"
                >
                  Registrar e Dar Baixa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: + FLUIDO */}
      {showFluidModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-cyan-700 text-white">
              <h4 className="text-sm font-bold flex items-center gap-2">
                <Droplet className="w-4 h-4" /> Ajustar Fluidoterapia
              </h4>
              <button onClick={() => setShowFluidModal(false)} className="text-cyan-200 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveFluid} className="p-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tipo de Solução</label>
                <input
                  type="text"
                  required
                  value={fluidForm.fluid_type}
                  onChange={(e) => setFluidForm({ ...fluidForm, fluid_type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Taxa (ml/kg/h)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={fluidForm.rate_ml_kg_h}
                    onChange={(e) => setFluidForm({ ...fluidForm, rate_ml_kg_h: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Bolus Rápido (ml)</label>
                  <input
                    type="number"
                    value={fluidForm.bolus_ml}
                    onChange={(e) => setFluidForm({ ...fluidForm, bolus_ml: Number(e.target.value) })}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Observações</label>
                <input
                  type="text"
                  value={fluidForm.notes}
                  onChange={(e) => setFluidForm({ ...fluidForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFluidModal(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-cyan-700 text-white font-bold rounded-lg shadow-sm"
                >
                  Registrar Fluido
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: + EVENTO */}
      {showEventModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-purple-700 text-white">
              <h4 className="text-sm font-bold flex items-center gap-2">
                <Clock className="w-4 h-4" /> Registrar Evento Cirúrgico
              </h4>
              <button onClick={() => setShowEventModal(false)} className="text-purple-200 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveEvent} className="p-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Título do Evento *</label>
                <input
                  type="text"
                  required
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  placeholder="Ex: Incisão cirúrgica, Clamp arterial, Sutura de pele..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Detalhes (Opcional)</label>
                <textarea
                  rows={2}
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  placeholder="Informações adicionais do momento..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEventModal(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-purple-700 text-white font-bold rounded-lg shadow-sm"
                >
                  Registrar na Linha Temporal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: + INTERCORRÊNCIA (Requisito 13) */}
      {showIncidentModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-rose-700 text-white">
              <h4 className="text-sm font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Registrar Intercorrência Anestésica
              </h4>
              <button onClick={() => setShowIncidentModal(false)} className="text-rose-200 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveIncident} className="p-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tipo de Intercorrência *</label>
                <select
                  value={incidentForm.incident_type}
                  onChange={(e) => setIncidentForm({ ...incidentForm, incident_type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white font-bold text-rose-800"
                >
                  <option value="Hipotensão">Hipotensão (PAM &lt; 60 mmHg)</option>
                  <option value="Bradicardia">Bradicardia</option>
                  <option value="Taquicardia">Taquicardia</option>
                  <option value="Hipoxemia">Hipoxemia (SpO₂ &lt; 95%)</option>
                  <option value="Hipercapnia">Hipercapnia (ETCO₂ &gt; 45 mmHg)</option>
                  <option value="Hipotermia">Hipotermia (&lt; 37.0°C)</option>
                  <option value="Apneia">Apneia</option>
                  <option value="Arritmia">Arritmia Cardíaca</option>
                  <option value="Outra">Outra Intercorrência</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Descrição do Quadro *</label>
                <textarea
                  rows={2}
                  required
                  value={incidentForm.description}
                  onChange={(e) => setIncidentForm({ ...incidentForm, description: e.target.value })}
                  placeholder="Ex: Queda abrupta de PAM para 55 mmHg logo após aprofundamento anestésico..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Conduta Tomada *</label>
                <textarea
                  rows={2}
                  required
                  value={incidentForm.intervention}
                  onChange={(e) => setIncidentForm({ ...incidentForm, intervention: e.target.value })}
                  placeholder="Ex: Redução da taxa de Isoflurano, bolus de fluido aquecido, efedrina 0.1 mg/kg IV..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Evolução do Paciente *</label>
                <input
                  type="text"
                  required
                  value={incidentForm.outcome}
                  onChange={(e) => setIncidentForm({ ...incidentForm, outcome: e.target.value })}
                  placeholder="Ex: PAM normalizada em 78 mmHg em 5 minutos; paciente estável."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowIncidentModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-lg shadow-sm"
                >
                  Salvar Intercorrência
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ENCERRAR ANESTESIA E RECUPERAÇÃO PÓS-ANESTÉSICA (Requisito 14) */}
      {showRecoveryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-amber-600 text-white">
              <h4 className="text-sm font-bold flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> Recuperação Pós-Anestésica (RPA)
              </h4>
              <button onClick={() => setShowRecoveryModal(false)} className="text-amber-200 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleFinishAnesthesia} className="p-4 space-y-3 text-xs">
              <p className="text-[11px] text-slate-500">
                Encerrar a anestesia inicia o monitoramento da recuperação. Registre os dados da alta pós-operatória.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Horário de Extubação *</label>
                  <input
                    type="time"
                    required
                    value={recoveryForm.extubation_time}
                    onChange={(e) => setRecoveryForm({ ...recoveryForm, extubation_time: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nível de Consciência</label>
                  <select
                    value={recoveryForm.consciousness_level}
                    onChange={(e) => setRecoveryForm({ ...recoveryForm, consciousness_level: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="Alerta">Alerta</option>
                    <option value="Sonolento">Sonolento</option>
                    <option value="Deprimido">Deprimido</option>
                    <option value="Estuporoso">Estuporoso</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Qualidade da Recuperação</label>
                  <select
                    value={recoveryForm.recovery_quality}
                    onChange={(e) => setRecoveryForm({ ...recoveryForm, recovery_quality: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white font-bold text-emerald-800"
                  >
                    <option value="Excelente (Calma/Suave)">Excelente (Calma / Suave)</option>
                    <option value="Boa (Pequena agitação)">Boa (Pequena agitação)</option>
                    <option value="Regular (Vocalização/Disforia)">Regular (Disforia)</option>
                    <option value="Ruim (Agitação intensa/Ataxia)">Ruim (Agitação intensa)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Escore de Dor</label>
                  <select
                    value={recoveryForm.pain_score}
                    onChange={(e) => setRecoveryForm({ ...recoveryForm, pain_score: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="Sem dor">Sem dor (Confortável)</option>
                    <option value="Leve">Leve</option>
                    <option value="Moderada">Moderada</option>
                    <option value="Severa">Severa</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Medicamentos Pós-Operatórios</label>
                <input
                  type="text"
                  value={recoveryForm.post_op_medications}
                  onChange={(e) => setRecoveryForm({ ...recoveryForm, post_op_medications: e.target.value })}
                  placeholder="Ex: Tramadol 3mg/kg + Meloxicam 0.1mg/kg SID..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Observações da Alta / Entrega</label>
                <textarea
                  rows={2}
                  value={recoveryForm.discharge_notes}
                  onChange={(e) => setRecoveryForm({ ...recoveryForm, discharge_notes: e.target.value })}
                  placeholder="Paciente entregue à equipe de internação com parâmetros normais..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRecoveryModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg shadow-sm"
                >
                  Concluir e Gerar Ficha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: FICHA ANESTÉSICA PRONTA PARA IMPRESSÃO / PDF (Requisito 15) */}
      {showPrintModal && activeAnesthesia && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl max-h-[92vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
            {/* Toolbar */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-700" />
                <h3 className="text-sm font-bold text-slate-900">
                  Ficha Anestésica Oficial ({activeAnesthesia.code})
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 text-white rounded-lg text-xs font-bold hover:bg-emerald-800 transition shadow-sm"
                >
                  <Printer className="w-4 h-4" /> Imprimir / PDF
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Ficha Documento Formatado A4 */}
            <div className="p-8 overflow-y-auto flex-1 text-slate-900 font-sans space-y-6 bg-white text-xs print:p-0">
              {/* Cabeçalho do Veterinário */}
              <div className="border-b-2 border-emerald-800 pb-4 flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-black text-emerald-950 uppercase tracking-wide">
                    Dra. Carolina Mendes
                  </h2>
                  <p className="text-xs font-bold text-emerald-800">
                    Médica Veterinária • CRMV-SP 34892
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Especialista em Anestesiologia Veterinária & Atendimento Volante
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xs font-black font-mono text-emerald-900 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                    FICHA Nº: {activeAnesthesia.code}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Data: {activeAnesthesia.date}</p>
                </div>
              </div>

              {/* Dados do Paciente e Procedimento */}
              <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="space-y-1">
                  <p><strong>Paciente:</strong> {activeAnesthesia.patient_name}</p>
                  <p><strong>Espécie/Raça:</strong> {activeAnesthesia.patient_species} • {activeAnesthesia.patient_breed || 'SRD'}</p>
                  <p><strong>Peso:</strong> {activeAnesthesia.pre_evaluation.weight_kg} kg</p>
                  <p><strong>Tutor:</strong> {activeAnesthesia.tutor_name}</p>
                </div>
                <div className="space-y-1">
                  <p><strong>Clínica:</strong> {activeAnesthesia.clinic_name}</p>
                  <p><strong>Cirurgião:</strong> {activeAnesthesia.surgeon_name}</p>
                  <p><strong>Procedimento:</strong> {activeAnesthesia.procedure_name}</p>
                  <p><strong>Caráter:</strong> {activeAnesthesia.procedure_nature} • <strong>ASA:</strong> {activeAnesthesia.asa_category.replace('_', ' ')}{activeAnesthesia.is_emergency ? '-E' : ''}</p>
                </div>
              </div>

              {/* Avaliação Pré & ASA */}
              <div className="space-y-1 border border-slate-200 p-3 rounded-lg">
                <h4 className="font-bold text-emerald-900 uppercase text-[11px]">Avaliação Pré-Anestésica & Planejamento</h4>
                <p><strong>Consciência:</strong> {activeAnesthesia.pre_evaluation.consciousness_level} | <strong>Reflexos:</strong> {activeAnesthesia.pre_evaluation.reflexes} | <strong>Mucosas:</strong> {activeAnesthesia.pre_evaluation.mucous_membranes} | <strong>TPC:</strong> {activeAnesthesia.pre_evaluation.capillary_refill_time_sec || 2}s</p>
                <p><strong>Técnica Anestésica:</strong> {activeAnesthesia.planning.technique} | <strong>Circuito:</strong> {activeAnesthesia.planning.breathing_circuit} | <strong>Tubo:</strong> {activeAnesthesia.planning.tube_size || 'Com cuff'}</p>
                <p className="italic text-slate-600"><strong>Justificativa ASA:</strong> {activeAnesthesia.asa_justification || '-'}</p>
              </div>

              {/* Protocolo de Fármacos */}
              <div className="space-y-2">
                <h4 className="font-bold text-emerald-900 uppercase text-[11px]">Protocolo Medicamentoso Administrado</h4>
                <table className="w-full text-xs text-left border border-slate-200">
                  <thead className="bg-slate-100 font-bold text-slate-700">
                    <tr>
                      <th className="p-2">Etapa</th>
                      <th className="p-2">Fármaco</th>
                      <th className="p-2">Dose (mg/kg)</th>
                      <th className="p-2">Via</th>
                      <th className="p-2 text-right">Volume / Quantidade</th>
                      <th className="p-2 text-right">Horário Real</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {activeAnesthesia.protocol_drugs.map((d) => (
                      <tr key={d.id}>
                        <td className="p-2 font-sans font-semibold">{d.stage}</td>
                        <td className="p-2 font-sans font-bold text-slate-800">{d.drug_name}</td>
                        <td className="p-2">{d.dose_mg_kg}</td>
                        <td className="p-2 font-sans">{d.route}</td>
                        <td className="p-2 text-right font-bold">{d.administered_volume} {d.presentation_type === 'COMPRIMIDO' ? 'comp' : 'ml'}</td>
                        <td className="p-2 text-right text-slate-500">{d.administered_at_time || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Grade de Monitorização */}
              <div className="space-y-2">
                <h4 className="font-bold text-emerald-900 uppercase text-[11px]">Monitorização Transoperatória</h4>
                <div className="overflow-x-auto border border-slate-200">
                  <table className="w-full text-center border-collapse text-[10px]">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-1.5 text-left w-20">Parâmetro</th>
                        {activeAnesthesia.monitorings.map((m) => (
                          <th key={m.id} className="p-1.5 border-l border-slate-200 font-mono">
                            {m.elapsed_minutes}'
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      <tr>
                        <td className="p-1.5 text-left font-bold text-rose-800 font-sans">FC (bpm)</td>
                        {activeAnesthesia.monitorings.map((m) => (
                          <td key={m.id} className="p-1.5 border-l border-slate-200">{m.heart_rate_bpm || '-'}</td>
                        ))}
                      </tr>
                      <tr>
                        <td className="p-1.5 text-left font-bold text-blue-800 font-sans">PAS/PAM/PAD</td>
                        {activeAnesthesia.monitorings.map((m) => (
                          <td key={m.id} className="p-1.5 border-l border-slate-200">
                            {m.pas_mmhg || '-'}/{m.pam_mmhg || '-'}/{m.pad_mmhg || '-'}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="p-1.5 text-left font-bold text-emerald-800 font-sans">SpO₂ (%)</td>
                        {activeAnesthesia.monitorings.map((m) => (
                          <td key={m.id} className="p-1.5 border-l border-slate-200">{m.spo2_percentage || '-'}</td>
                        ))}
                      </tr>
                      <tr>
                        <td className="p-1.5 text-left font-bold text-amber-800 font-sans">ETCO₂</td>
                        {activeAnesthesia.monitorings.map((m) => (
                          <td key={m.id} className="p-1.5 border-l border-slate-200">{m.etco2_mmhg || '-'}</td>
                        ))}
                      </tr>
                      <tr>
                        <td className="p-1.5 text-left font-bold text-cyan-800 font-sans">FR (mpm)</td>
                        {activeAnesthesia.monitorings.map((m) => (
                          <td key={m.id} className="p-1.5 border-l border-slate-200">{m.respiratory_rate_mpm || '-'}</td>
                        ))}
                      </tr>
                      <tr>
                        <td className="p-1.5 text-left font-bold text-indigo-800 font-sans">Temp (°C)</td>
                        {activeAnesthesia.monitorings.map((m) => (
                          <td key={m.id} className="p-1.5 border-l border-slate-200">{m.temperature_c || '-'}</td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recuperação Pós-Anestésica */}
              {activeAnesthesia.recovery && (
                <div className="border border-slate-200 p-3 rounded-lg bg-slate-50 space-y-1">
                  <h4 className="font-bold text-emerald-900 uppercase text-[11px]">Recuperação Pós-Anestésica</h4>
                  <p><strong>Extubação:</strong> {activeAnesthesia.recovery.extubation_time} | <strong>Consciência:</strong> {activeAnesthesia.recovery.consciousness_level} | <strong>Qualidade:</strong> {activeAnesthesia.recovery.recovery_quality}</p>
                  <p><strong>Pós-operatório:</strong> {activeAnesthesia.recovery.post_op_medications || 'Conforme prescrição médica'}</p>
                  <p className="text-slate-600 italic">{activeAnesthesia.recovery.discharge_notes}</p>
                </div>
              )}

              {/* Assinatura */}
              <div className="pt-10 flex items-center justify-between border-t border-slate-200">
                <div className="text-[10px] text-slate-400">
                  Gerado pelo Sistema Vetgo • Registro Clínico Seguro
                </div>
                <div className="text-center">
                  <div className="w-56 border-b border-slate-800 pb-1 font-bold text-xs text-slate-900">
                    Dra. Carolina Mendes
                  </div>
                  <span className="text-[10px] text-slate-500">CRMV-SP 34892 • Anestesiologia</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
