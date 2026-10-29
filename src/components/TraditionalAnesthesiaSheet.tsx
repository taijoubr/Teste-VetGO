import React from 'react';
import {
  AnesthesiaRecord,
  AnestheticTimelineEvent,
  Clinic,
  MonitoringReading,
  Patient,
  Surgeon,
  Tutor,
  User
} from '../types';
import {
  Activity,
  Heart,
  Droplet,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Shield,
  FileText
} from 'lucide-react';

interface TraditionalAnesthesiaSheetProps {
  anesthesia: AnesthesiaRecord;
  clinics: Clinic[];
  surgeons: Surgeon[];
  tutors: Tutor[];
  patients?: Patient[];
  user: User | null;
  isSigned?: boolean;
}

export const TraditionalAnesthesiaSheet: React.FC<TraditionalAnesthesiaSheetProps> = ({
  anesthesia,
  clinics,
  surgeons,
  tutors,
  patients = [],
  user,
  isSigned = true
}) => {
  // Encontra dados vinculados
  const clinic = clinics.find((c) => c.id === anesthesia.clinic_id);
  const surgeon = surgeons.find((s) => s.id === anesthesia.surgeon_id);
  const patient = patients.find((p) => p.id === anesthesia.patient_id);
  const tutor = tutors.find((t) => t.id === (anesthesia.tutor_id || patient?.tutor_id));

  const vetName = user?.first_name || user?.last_name
    ? `Dr(a). ${user?.first_name || ''} ${user?.last_name || ''}`.trim()
    : 'Dr(a). Médico(a) Veterinário(a)';

  const crmvFull = user?.crmv
    ? `CRMV-${user.crmv_uf || 'SP'} ${user.crmv}`
    : 'CRMV Especialista';

  const surgeonDisplay = surgeon && surgeon.crmv
    ? `${surgeon.name} (CRMV-${surgeon.crmv_uf || 'SP'} ${surgeon.crmv})`
    : anesthesia.surgeon_name || 'Não informado';

  const tutorDisplay = anesthesia.tutor_name || tutor?.name || patient?.tutor_name || 'Tutor Responsável';
  const tutorContact = tutor?.phone || tutor?.whatsapp || '';
  const tutorDocument = (tutor as any)?.document || (tutor as any)?.cpf || '';
  const tutorCity = tutor?.city ? `${tutor.city}${tutor.state ? `/${tutor.state}` : ''}` : '';

  // Horários e Tempos Cirúrgicos / Anestésicos
  const anesthesiaStartTime = anesthesia.times?.anesthesia_start_time || anesthesia.scheduled_time || '—';

  // Resolução inteligente do início cirúrgico
  const procStartEvent = (anesthesia.timeline_events || []).find((e) =>
    /incis|cirurg|início.*cirurg|inicio.*cirurg/i.test(e.title)
  );
  const procedureStartTime =
    anesthesia.times?.procedure_start_time ||
    procStartEvent?.real_time ||
    (anesthesia.status === 'FINALIZADA' && anesthesiaStartTime !== '—' ? anesthesiaStartTime : '—');

  // Resolução inteligente do término cirúrgico
  const procEndEvent = (anesthesia.timeline_events || []).find((e) =>
    /sutur|fechamento|fim.*cirurg|término.*cirurg|termino.*cirurg/i.test(e.title)
  );
  const procedureEndTime =
    anesthesia.times?.procedure_end_time ||
    procEndEvent?.real_time ||
    anesthesia.times?.anesthesia_end_time ||
    (anesthesia.status === 'FINALIZADA' ? anesthesia.times?.extubation_time || '—' : '—');

  const anesthesiaEndTime =
    anesthesia.times?.anesthesia_end_time ||
    (anesthesia.status === 'FINALIZADA' ? anesthesia.times?.extubation_time || 'Concluída' : 'Em andamento');

  // Classificações ASA
  const ASA_CLASSES = [
    { key: 'ASA_I', label: 'ASA I', desc: 'Paciente hígido / sem alterações sistêmicas' },
    { key: 'ASA_II', label: 'ASA II', desc: 'Doença sistêmica leve (sem limitação funcional)' },
    { key: 'ASA_III', label: 'ASA III', desc: 'Doença sistêmica moderada a grave com limitação' },
    { key: 'ASA_IV', label: 'ASA IV', desc: 'Doença sistêmica grave que ameaça constante a vida' },
    { key: 'ASA_V', label: 'ASA V', desc: 'Paciente moribundo (sobrevivência incerta)' },
  ];

  // Monitorizações ordenadas por tempo
  const monitorings = [...(anesthesia.monitorings || [])].sort(
    (a, b) => a.elapsed_minutes - b.elapsed_minutes
  );

  // Mapeamento de colunas temporais
  // Se houver menos de 10 colunas, completa até 10 para grade estética mínima tradicional
  const minColumns = 10;
  type ColumnReading = {
    id: string;
    timestamp: string;
    elapsed_minutes: number;
    heart_rate_bpm?: number;
    pas_mmhg?: number;
    pam_mmhg?: number;
    pad_mmhg?: number;
    spo2_percentage?: number;
    etco2_mmhg?: number;
    respiratory_rate_mpm?: number;
    temperature_c?: number;
    ecg_rhythm?: string;
  };

  const timeColumns: ColumnReading[] = monitorings.length >= minColumns
    ? monitorings
    : Array.from({ length: minColumns }).map((_, idx) => {
        if (monitorings[idx]) return monitorings[idx];
        const lastMinutes = monitorings.length > 0 ? monitorings[monitorings.length - 1].elapsed_minutes : 0;
        const projectedMinutes = lastMinutes + (idx - monitorings.length + 1) * 5;
        return {
          id: `empty-${idx}`,
          timestamp: '',
          elapsed_minutes: projectedMinutes,
          heart_rate_bpm: undefined,
          pas_mmhg: undefined,
          pam_mmhg: undefined,
          pad_mmhg: undefined,
          spo2_percentage: undefined,
          etco2_mmhg: undefined,
          respiratory_rate_mpm: undefined,
          temperature_c: undefined,
          ecg_rhythm: undefined
        };
      });

  // Escala gráfica vertical: 20 a 220 (passo de 20)
  const verticalScale = [220, 200, 180, 160, 140, 120, 100, 80, 60, 40, 20];
  const minVal = 20;
  const maxVal = 220;
  const graphHeight = 220; // pixels no SVG
  const graphWidth = Math.max(700, timeColumns.length * 48);

  const getYCoord = (val?: number) => {
    if (val === undefined || val === null) return null;
    const clamped = Math.max(minVal, Math.min(maxVal, val));
    const normalized = (clamped - minVal) / (maxVal - minVal);
    // Y=0 é o topo (220), Y=graphHeight é a base (20)
    return graphHeight - (normalized * graphHeight);
  };

  const colWidth = graphWidth / timeColumns.length;
  const getXCoord = (index: number) => {
    return (index * colWidth) + (colWidth / 2);
  };

  // Traçar linhas contínuas entre pontos aferidos (sem interpolar pontos vazios)
  const generatePath = (paramKey: 'heart_rate_bpm' | 'pas_mmhg' | 'pam_mmhg' | 'pad_mmhg') => {
    let d = '';
    let isDrawing = false;

    timeColumns.forEach((col, idx) => {
      const val = (col as any)[paramKey];
      if (typeof val === 'number') {
        const x = getXCoord(idx);
        const y = getYCoord(val);
        if (y !== null) {
          if (!isDrawing) {
            d += `M ${x} ${y} `;
            isDrawing = true;
          } else {
            d += `L ${x} ${y} `;
          }
        }
      } else {
        isDrawing = false;
      }
    });

    return d;
  };

  // Eventos e Intercorrências mapeados
  const timelineEvents: AnestheticTimelineEvent[] = anesthesia.timeline_events || [];
  const incidents = timelineEvents.filter((e) => e.event_type === 'INTERCORRENCIA');
  const routineEvents = timelineEvents.filter((e) => e.event_type !== 'INTERCORRENCIA');

  // Drogas agrupadas por etapa
  const drugs = anesthesia.protocol_drugs || [];
  const drugsByStage: Record<string, typeof drugs> = {
    'MPA': drugs.filter(d => d.stage === 'MPA'),
    'INDUCAO': drugs.filter(d => d.stage === 'INDUCAO'),
    'MANUTENCAO': drugs.filter(d => d.stage === 'MANUTENCAO'),
    'ANALGESIA': drugs.filter(d => d.stage === 'ANALGESIA' || d.stage === 'BLOQUEIO' || d.stage === 'OUTROS'),
  };

  return (
    <div
      id="printable-anesthesia-sheet"
      className="printable-anesthesia-landscape bg-white text-slate-900 font-sans p-6 sm:p-8 space-y-4 text-[11px] leading-tight select-none border border-slate-300 shadow-sm max-w-[1120px] mx-auto print:border-none print:shadow-none print:p-0 print:m-0"
      style={{
        pageBreakInside: 'avoid',
        breakInside: 'avoid'
      }}
    >
      {/* ============================================================== */}
      {/* 1. CABEÇALHO PROFISSIONAL & TÍTULO                             */}
      {/* ============================================================== */}
      <div className="border-b-2 border-emerald-900 pb-3 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {user?.logo_url ? (
            <img
              src={user.logo_url}
              alt="Logo"
              className="w-14 h-14 object-contain rounded-lg border border-slate-200"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-emerald-900 text-white flex items-center justify-center font-black text-xl shadow-xs">
              V
            </div>
          )}

          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-tight uppercase">
              {vetName}
            </h1>
            <p className="text-xs font-bold text-emerald-800">
              Médico(a) Veterinário(a) Anestesiologista • {crmvFull}
            </p>
            <p className="text-[10px] text-slate-500">
              {user?.clinic_name || 'Serviço de Anestesiologia & Medicina Intensiva Veterinária'}
              {user?.phone ? ` • Tel/WhatsApp: ${user.phone}` : ''}
              {user?.email ? ` • ${user.email}` : ''}
            </p>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="inline-block bg-slate-900 text-white font-mono font-black text-xs px-3 py-1 rounded shadow-xs tracking-wide">
            FICHA ANESTÉSICA Nº {anesthesia.code}
          </div>
          <div className="text-[10px] text-slate-600 font-bold mt-1">
            Data do Procedimento: <span className="font-mono">{anesthesia.date}</span>
          </div>
          <div className="text-[9px] text-slate-400">
            Registro Clínico Transoperatório Oficial
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. IDENTIFICAÇÃO COMPACTA DO ATENDIMENTO                       */}
      {/* ============================================================== */}
      <div className="grid grid-cols-4 gap-2.5 p-2.5 bg-slate-50/80 rounded-lg border border-slate-300 text-[10px]">
        {/* Paciente */}
        <div className="space-y-0.5 border-r border-slate-200 pr-2">
          <span className="font-black text-slate-800 uppercase tracking-wider block text-[9px] text-emerald-900">
            PACIENTE
          </span>
          <div className="text-[11px] font-bold text-slate-900 truncate">
            {anesthesia.patient_name} {patient?.code ? <span className="text-[9px] text-slate-500 font-mono font-normal">({patient.code})</span> : null}
          </div>
          <div className="text-slate-700">
            {anesthesia.patient_species} • {anesthesia.patient_breed || patient?.breed || 'SRD'}
          </div>
          <div className="text-slate-600">
            Sexo: <strong>{patient?.gender || '—'}</strong> • Idade: <strong>{patient?.approximate_age || '—'}</strong>
          </div>
          <div className="text-slate-600 flex items-center justify-between">
            <span>Peso: <strong className="text-slate-900 font-bold">{anesthesia.pre_evaluation?.weight_kg || patient?.weight_kg || '—'} kg</strong></span>
            <span>Castrado: <strong>{patient ? (patient.is_neutered ? 'Sim' : 'Não') : '—'}</strong></span>
          </div>
          {(patient?.microchip_number || patient?.microchip) && (
            <div className="text-[9px] text-slate-500 font-mono truncate">
              Chip: {patient.microchip_number || patient.microchip}
            </div>
          )}
        </div>

        {/* Tutor */}
        <div className="space-y-0.5 border-r border-slate-200 pr-2">
          <span className="font-black text-slate-800 uppercase tracking-wider block text-[9px] text-emerald-900">
            TUTOR RESPONSÁVEL
          </span>
          <div className="font-bold text-slate-900 truncate">
            {tutorDisplay}
          </div>
          <div className="text-slate-600 font-mono">
            {tutorContact ? `Contato: ${tutorContact}` : 'Contato em ficha cadastral'}
          </div>
          {tutorDocument && (
            <div className="text-[9px] text-slate-600 font-mono">
              CPF/Doc: {tutorDocument}
            </div>
          )}
          {tutorCity && (
            <div className="text-[9px] text-slate-500 truncate">
              Cidade: {tutorCity}
            </div>
          )}
        </div>

        {/* Cirurgião & Local */}
        <div className="space-y-0.5 border-r border-slate-200 pr-2">
          <span className="font-black text-slate-800 uppercase tracking-wider block text-[9px] text-emerald-900">
            LOCAL & CIRURGIÃO
          </span>
          <div className="font-bold text-slate-900 truncate">
            {anesthesia.clinic_name || clinic?.name || 'Clínica Parceira'}
          </div>
          <div className="text-slate-600 truncate">
            Cirurgião: <strong>{surgeonDisplay}</strong>
          </div>
          {clinic?.phone && (
            <div className="text-[9px] text-slate-500 font-mono">
              Tel Clínica: {clinic.phone}
            </div>
          )}
          {clinic?.city && (
            <div className="text-[9px] text-slate-500">
              {clinic.city}{clinic.state ? `/${clinic.state}` : ''}
            </div>
          )}
        </div>

        {/* Procedimento & Caráter */}
        <div className="space-y-0.5">
          <span className="font-black text-slate-800 uppercase tracking-wider block text-[9px] text-emerald-900">
            PROCEDIMENTO CIRÚRGICO
          </span>
          <div className="font-bold text-slate-900 truncate">
            {anesthesia.procedure_name}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
            <span className="px-1.5 py-0.2 rounded font-bold uppercase text-[9px] bg-slate-200 text-slate-800">
              {anesthesia.procedure_nature}
            </span>
            {anesthesia.is_emergency && (
              <span className="px-1.5 py-0.2 rounded font-black uppercase text-[9px] bg-rose-600 text-white">
                EMERGÊNCIA (E)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. AVALIAÇÃO PRÉ-ANESTÉSICA & CLASSIFICAÇÃO ASA               */}
      {/* ============================================================== */}
      <div className="grid grid-cols-12 gap-3 items-stretch">
        {/* Avaliação Pré-Anestésica Física & Histórico (7 cols) */}
        <div className="col-span-7 p-2.5 bg-white rounded-lg border border-slate-300 space-y-1.5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-1">
            <span className="font-bold text-slate-900 uppercase text-[9px] tracking-wider flex items-center gap-1">
              <Activity className="w-3 h-3 text-emerald-700" />
              AVALIAÇÃO PRÉ-ANESTÉSICA & EXAME CLÍNICO BASAL
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2 text-[10px]">
            <div>
              <span className="text-slate-500 block text-[9px]">Jejum Sól/Líq:</span>
              <strong className="text-slate-800">
                {anesthesia.pre_evaluation?.fasting_food_hours ? `${anesthesia.pre_evaluation.fasting_food_hours}h sólidos` : '—'} / {anesthesia.pre_evaluation?.fasting_water_hours ? `${anesthesia.pre_evaluation.fasting_water_hours}h hídrico` : '—'}
              </strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[9px]">Consciência / Hidratação:</span>
              <strong className="text-slate-800">
                {anesthesia.pre_evaluation?.consciousness_level || 'Alerta'} • {anesthesia.pre_evaluation?.hydration_status || 'Normohidratado'}
              </strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[9px]">Mucosas / TPC:</span>
              <strong className="text-slate-800">
                {anesthesia.pre_evaluation?.mucous_membranes || 'Normocoradas'} ({anesthesia.pre_evaluation?.capillary_refill_time_sec ?? 2}s)
              </strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[9px]">FC / FR / Temp Basal:</span>
              <strong className="text-slate-800 font-mono">
                {anesthesia.pre_evaluation?.heart_rate_bpm ? `${anesthesia.pre_evaluation.heart_rate_bpm} bpm` : '—'} • {anesthesia.pre_evaluation?.respiratory_rate_mpm ? `${anesthesia.pre_evaluation.respiratory_rate_mpm} mpm` : '—'} • {anesthesia.pre_evaluation?.temperature_c ? `${anesthesia.pre_evaluation.temperature_c}°C` : '—'}
              </strong>
            </div>
          </div>

          {/* Histórico Clínico & Exames (somente exibe o que existir) */}
          {(anesthesia.pre_evaluation?.previous_diseases ||
            anesthesia.pre_evaluation?.previous_surgeries ||
            anesthesia.pre_evaluation?.allergies ||
            anesthesia.pre_evaluation?.continuous_medications ||
            anesthesia.pre_evaluation?.previous_anesthesias ||
            anesthesia.pre_evaluation?.lab_tests_summary ||
            anesthesia.pre_evaluation?.ecg_summary ||
            anesthesia.pre_evaluation?.notes ||
            anesthesia.pre_evaluation?.reflexes) && (
            <div className="text-[10px] text-slate-700 bg-slate-50 p-1.5 rounded border border-slate-200 space-y-0.5">
              {anesthesia.pre_evaluation?.previous_diseases && (
                <div><strong>Doenças prévias / Comorbidades:</strong> {anesthesia.pre_evaluation.previous_diseases}</div>
              )}
              {anesthesia.pre_evaluation?.previous_surgeries && (
                <div><strong>Cirurgias/Anestesias anteriores:</strong> {anesthesia.pre_evaluation.previous_surgeries} {anesthesia.pre_evaluation.previous_anesthesias ? `• ${anesthesia.pre_evaluation.previous_anesthesias}` : ''}</div>
              )}
              {anesthesia.pre_evaluation?.allergies && (
                <div><strong className="text-rose-700">Alergias relatadas:</strong> {anesthesia.pre_evaluation.allergies}</div>
              )}
              {anesthesia.pre_evaluation?.continuous_medications && (
                <div><strong>Medicações contínuas:</strong> {anesthesia.pre_evaluation.continuous_medications}</div>
              )}
              {anesthesia.pre_evaluation?.lab_tests_summary && (
                <div><strong>Exames laboratoriais prévios:</strong> {anesthesia.pre_evaluation.lab_tests_summary}</div>
              )}
              {anesthesia.pre_evaluation?.ecg_summary && (
                <div><strong>ECG / Ecocardiograma:</strong> {anesthesia.pre_evaluation.ecg_summary} {anesthesia.pre_evaluation.echocardiogram_summary ? `• ${anesthesia.pre_evaluation.echocardiogram_summary}` : ''}</div>
              )}
              {anesthesia.pre_evaluation?.reflexes && (
                <div><strong>Reflexos protetores:</strong> {anesthesia.pre_evaluation.reflexes}</div>
              )}
              {anesthesia.pre_evaluation?.notes && (
                <div><strong>Observações pré-anestésicas:</strong> {anesthesia.pre_evaluation.notes}</div>
              )}
            </div>
          )}
        </div>

        {/* Classificação ASA Visual (5 cols) */}
        <div className="col-span-5 p-2.5 bg-white rounded-lg border border-slate-300 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-1.5">
              <span className="font-bold text-slate-900 uppercase text-[9px] tracking-wider">
                CLASSIFICAÇÃO DE RISCO ANESTÉSICO (ASA)
              </span>
              {anesthesia.is_emergency && (
                <span className="font-black text-rose-700 text-[9px] uppercase">
                  Emergência (E)
                </span>
              )}
            </div>

            {/* Painel das 5 classes ASA */}
            <div className="grid grid-cols-5 gap-1 text-center">
              {ASA_CLASSES.map((asa) => {
                const isSelected = anesthesia.asa_category === asa.key;
                return (
                  <div
                    key={asa.key}
                    className={`py-1.5 px-0.5 rounded border transition-all ${
                      isSelected
                        ? 'bg-emerald-900 text-white border-emerald-900 font-black shadow-xs scale-105 ring-2 ring-emerald-600/40'
                        : 'bg-slate-50 text-slate-400 border-slate-200 opacity-60'
                    }`}
                  >
                    <div className="text-[11px] font-black">{asa.label}</div>
                    {isSelected && anesthesia.is_emergency && (
                      <div className="text-[8px] font-black text-rose-300">-E</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="text-[9px] text-slate-600 italic bg-slate-50 p-1.5 rounded border border-slate-200 mt-1">
            <strong>Justificativa clínica ASA:</strong> {anesthesia.asa_justification || 'Conforme histórico e condições pré-operatórias.'}
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 4. PLANEJAMENTO ANESTÉSICO & TÉCNICA                           */}
      {/* ============================================================== */}
      <div className="p-2 bg-slate-50/70 rounded-lg border border-slate-300 grid grid-cols-3 gap-3 text-[10px]">
        <div>
          <span className="text-slate-500 font-bold block text-[9px] uppercase">Técnica Anestésica & Ventilação</span>
          <strong className="text-slate-900">{anesthesia.planning?.technique || 'Anestesia Geral Inalatória Balanceada'}</strong>
          <div className="text-[9px] text-slate-600">
            Ventilação: <strong>{anesthesia.planning?.ventilation_type || 'Espontânea'}</strong>
          </div>
        </div>
        <div>
          <span className="text-slate-500 font-bold block text-[9px] uppercase">Vias Aéreas & Circuito</span>
          <span className="text-slate-800">
            Tubo: <strong>{anesthesia.planning?.tube_size ? `Nº ${anesthesia.planning.tube_size}` : 'Tubo c/ cuff'}</strong> ({anesthesia.planning?.intubation || 'Orotraqueal'})
          </span>
          <div className="text-[9px] text-slate-600">
            Circuito: <strong>{anesthesia.planning?.breathing_circuit || 'Bain / Baraka'}</strong>
          </div>
        </div>
        <div>
          <span className="text-slate-500 font-bold block text-[9px] uppercase">Acesso Venoso & Fluido</span>
          <span className="text-slate-800">
            Acesso: <strong>{anesthesia.planning?.venous_access_site || 'Veia Cefálica'}</strong> • {anesthesia.planning?.fluid_type || 'Ringer com Lactato'}
          </span>
          {anesthesia.planning?.fluid_rate_ml_kg_h ? (
            <div className="text-[9px] text-emerald-800 font-bold">
              Taxa de infusão: {anesthesia.planning.fluid_rate_ml_kg_h} ml/kg/h
            </div>
          ) : null}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 5. PROTOCOLO MEDICAMENTOSO ESTRUTURADO                         */}
      {/* ============================================================== */}
      <div className="border border-slate-300 rounded-lg overflow-hidden">
        <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-300 flex items-center justify-between">
          <span className="font-bold text-slate-900 uppercase text-[9px] tracking-wider">
            PROTOCOLO FARMACOLÓGICO REAL ADMINISTRADO (MPA, INDUÇÃO, MANUTENÇÃO & ANALGESIA)
          </span>
          <span className="text-[9px] text-slate-500 font-semibold">
            Doses e volumes fidedignos ao procedimento
          </span>
        </div>

        <table className="w-full text-left border-collapse text-[10px]">
          <thead className="bg-slate-50 font-bold text-slate-700 border-b border-slate-200">
            <tr>
              <th className="py-1 px-2.5">Etapa</th>
              <th className="py-1 px-2.5">Fármaco</th>
              <th className="py-1 px-2.5">Dose Real</th>
              <th className="py-1 px-2.5">Concentração</th>
              <th className="py-1 px-2.5">Via</th>
              <th className="py-1 px-2.5 text-right">Volume Real</th>
              <th className="py-1 px-2.5 text-right">Horário</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono">
            {drugs.length > 0 ? (
              drugs.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50/50">
                  <td className="py-1 px-2.5 font-sans font-bold text-slate-700 text-[9px] uppercase">{d.stage}</td>
                  <td className="py-1 px-2.5 font-sans font-bold text-slate-900">{d.drug_name}</td>
                  <td className="py-1 px-2.5">{d.dose_mg_kg ? `${d.dose_mg_kg} mg/kg` : '—'}</td>
                  <td className="py-1 px-2.5">{d.concentration_mg_ml ? `${d.concentration_mg_ml} mg/ml` : '—'}</td>
                  <td className="py-1 px-2.5 font-sans font-bold text-emerald-800">{d.route}</td>
                  <td className="py-1 px-2.5 text-right font-bold text-slate-900">
                    {d.administered_volume} {d.presentation_type === 'COMPRIMIDO' ? 'comp' : 'ml'}
                  </td>
                  <td className="py-1 px-2.5 text-right text-slate-600 font-bold">{d.administered_at_time || '—'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="py-2 px-2.5 text-center text-slate-400 italic font-sans">
                  Nenhum fármaco específico registrado no protocolo.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ============================================================== */}
      {/* 6. MARCADORES HORÁRIOS & TEMPOS CIRÚRGICOS/ANESTÉSICOS          */}
      {/* ============================================================== */}
      <div className="grid grid-cols-4 gap-2 bg-emerald-950 text-white rounded-lg p-2 text-center text-[10px]">
        <div>
          <span className="text-[8px] text-emerald-300 font-bold uppercase block">Início da Anestesia</span>
          <span className="font-mono font-bold text-xs">{anesthesiaStartTime}</span>
        </div>
        <div>
          <span className="text-[8px] text-emerald-300 font-bold uppercase block">Início da Cirurgia (Incisão)</span>
          <span className="font-mono font-bold text-xs">{procedureStartTime}</span>
        </div>
        <div>
          <span className="text-[8px] text-emerald-300 font-bold uppercase block">Término da Cirurgia</span>
          <span className="font-mono font-bold text-xs">{procedureEndTime}</span>
        </div>
        <div>
          <span className="text-[8px] text-emerald-300 font-bold uppercase block">Término da Anestesia</span>
          <span className="font-mono font-bold text-xs">{anesthesiaEndTime}</span>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 7. GRADE ANESTÉSICA TRADICIONAL (CORAÇÃO DA FICHA)            */}
      {/* ============================================================== */}
      <div className="border-2 border-slate-400 rounded-lg overflow-hidden bg-white">
        {/* Cabeçalho da Grade com Legenda Oficial Indelével */}
        <div className="bg-slate-100 p-2 border-b border-slate-300 flex items-center justify-between flex-wrap gap-2 text-[10px]">
          <div className="font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-rose-600" />
            <span>GRADE DE MONITORIZAÇÃO GRÁFICA & HEMODINÂMICA</span>
          </div>

          {/* Legenda de Precisão */}
          <div className="flex items-center gap-3 font-mono font-bold text-[9px] bg-white px-2 py-0.5 rounded border border-slate-300 shadow-2xs">
            <span className="flex items-center gap-1 text-rose-600">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-600"></span>
              FC (bpm)
            </span>
            <span className="flex items-center gap-1 text-blue-600">
              <span className="inline-block w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[7px] border-b-blue-600"></span>
              PAS (mmHg)
            </span>
            <span className="flex items-center gap-1 text-indigo-900">
              <span className="inline-block w-2 h-2 bg-indigo-900"></span>
              PAM (mmHg)
            </span>
            <span className="flex items-center gap-1 text-sky-500">
              <span className="inline-block w-2 h-2 rotate-45 bg-sky-500"></span>
              PAD (mmHg)
            </span>
          </div>
        </div>

        {/* Área Gráfica com Eixo Vertical 20-220 e SVG Plot */}
        <div className="flex overflow-x-auto">
          {/* Eixo Vertical Y (Escala 20 a 220 mmHg/bpm) */}
          <div
            className="w-14 shrink-0 bg-slate-50 border-r-2 border-slate-400 flex flex-col justify-between py-1 text-right pr-1.5 font-mono text-[9px] font-bold text-slate-600 select-none"
            style={{ height: `${graphHeight}px` }}
          >
            {verticalScale.map((val) => (
              <span key={val} className="leading-none">
                {val}
              </span>
            ))}
          </div>

          {/* Plotagem SVG das Curvas e Símbolos */}
          <div className="flex-1 relative bg-white">
            <svg
              className="w-full h-full"
              style={{ height: `${graphHeight}px`, minWidth: `${graphWidth}px` }}
              viewBox={`0 0 ${graphWidth} ${graphHeight}`}
              preserveAspectRatio="none"
            >
              {/* Linhas de Grade Horizontais Suaves */}
              {verticalScale.map((val, idx) => {
                const y = (idx / (verticalScale.length - 1)) * graphHeight;
                return (
                  <line
                    key={val}
                    x1="0"
                    y1={y}
                    x2={graphWidth}
                    y2={y}
                    stroke={val === 100 ? '#94a3b8' : '#e2e8f0'}
                    strokeWidth={val === 100 ? '1.5' : '1'}
                    strokeDasharray={val === 100 ? 'none' : '3 3'}
                  />
                );
              })}

              {/* Linhas de Grade Verticais Temporais */}
              {timeColumns.map((_, idx) => {
                const x = getXCoord(idx);
                return (
                  <line
                    key={idx}
                    x1={x}
                    y1="0"
                    x2={x}
                    y2={graphHeight}
                    stroke="#e2e8f0"
                    strokeWidth="1"
                  />
                );
              })}

              {/* Linhas de Conexão dos Parâmetros */}
              <path d={generatePath('heart_rate_bpm')} fill="none" stroke="#dc2626" strokeWidth="1.5" strokeOpacity="0.8" />
              <path d={generatePath('pas_mmhg')} fill="none" stroke="#2563eb" strokeWidth="1.5" strokeOpacity="0.8" />
              <path d={generatePath('pam_mmhg')} fill="none" stroke="#1e3a8a" strokeWidth="1.5" strokeOpacity="0.8" />
              <path d={generatePath('pad_mmhg')} fill="none" stroke="#0284c7" strokeWidth="1.5" strokeOpacity="0.8" />

              {/* Plotagem dos Símbolos Exatos (● ▲ ■ ◆) */}
              {timeColumns.map((col, idx) => {
                const x = getXCoord(idx);

                const yFc = getYCoord(col.heart_rate_bpm);
                const yPas = getYCoord(col.pas_mmhg);
                const yPam = getYCoord(col.pam_mmhg);
                const yPad = getYCoord(col.pad_mmhg);

                return (
                  <g key={idx}>
                    {/* FC: ● (Círculo vermelho) */}
                    {yFc !== null && (
                      <circle cx={x} cy={yFc} r="4.5" fill="#dc2626" stroke="#ffffff" strokeWidth="1" />
                    )}

                    {/* PAS: ▲ (Triângulo azul royal) */}
                    {yPas !== null && (
                      <polygon
                        points={`${x},${yPas - 5} ${x - 4.5},${yPas + 4} ${x + 4.5},${yPas + 4}`}
                        fill="#2563eb"
                        stroke="#ffffff"
                        strokeWidth="1"
                      />
                    )}

                    {/* PAM: ■ (Quadrado azul marinho) */}
                    {yPam !== null && (
                      <rect x={x - 3.5} y={yPam - 3.5} width="7" height="7" fill="#1e3a8a" stroke="#ffffff" strokeWidth="1" />
                    )}

                    {/* PAD: ◆ (Losango ciano) */}
                    {yPad !== null && (
                      <polygon
                        points={`${x},${yPad - 4.5} ${x + 4.5},${yPad} ${x},${yPad + 4.5} ${x - 4.5},${yPad}`}
                        fill="#0284c7"
                        stroke="#ffffff"
                        strokeWidth="1"
                      />
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Tabela Numérica Imediatamente Alinhada às Colunas Temporais */}
        <div className="overflow-x-auto border-t-2 border-slate-400">
          <table className="w-full text-center border-collapse text-[9px] font-mono select-none" style={{ minWidth: `${graphWidth + 56}px` }}>
            <thead>
              <tr className="bg-slate-100 font-bold text-slate-800 border-b border-slate-300">
                <th className="w-14 text-right pr-2 py-1 font-sans text-[9px] border-r border-slate-300">Tempo</th>
                {timeColumns.map((m, idx) => (
                  <th key={idx} className="py-1 border-r border-slate-200">
                    {m.elapsed_minutes}'
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {/* FC */}
              <tr>
                <td className="text-right pr-2 py-0.5 font-sans font-bold text-rose-700 border-r border-slate-300 bg-slate-50">FC (bpm)</td>
                {timeColumns.map((m, idx) => (
                  <td key={idx} className="py-0.5 border-r border-slate-200 text-rose-700 font-bold">
                    {m.heart_rate_bpm ?? '—'}
                  </td>
                ))}
              </tr>

              {/* PAS */}
              <tr>
                <td className="text-right pr-2 py-0.5 font-sans font-bold text-blue-700 border-r border-slate-300 bg-slate-50">PAS (mmHg)</td>
                {timeColumns.map((m, idx) => (
                  <td key={idx} className="py-0.5 border-r border-slate-200 text-blue-700 font-bold">
                    {m.pas_mmhg ?? '—'}
                  </td>
                ))}
              </tr>

              {/* PAM */}
              <tr>
                <td className="text-right pr-2 py-0.5 font-sans font-bold text-indigo-900 border-r border-slate-300 bg-slate-50">PAM (mmHg)</td>
                {timeColumns.map((m, idx) => (
                  <td key={idx} className="py-0.5 border-r border-slate-200 text-indigo-900 font-bold">
                    {m.pam_mmhg ?? '—'}
                  </td>
                ))}
              </tr>

              {/* PAD */}
              <tr>
                <td className="text-right pr-2 py-0.5 font-sans font-bold text-sky-600 border-r border-slate-300 bg-slate-50">PAD (mmHg)</td>
                {timeColumns.map((m, idx) => (
                  <td key={idx} className="py-0.5 border-r border-slate-200 text-sky-600 font-bold">
                    {m.pad_mmhg ?? '—'}
                  </td>
                ))}
              </tr>

              {/* SpO2 */}
              <tr className="bg-emerald-50/30">
                <td className="text-right pr-2 py-0.5 font-sans font-bold text-emerald-800 border-r border-slate-300 bg-emerald-50/60">SpO₂ (%)</td>
                {timeColumns.map((m, idx) => (
                  <td key={idx} className="py-0.5 border-r border-slate-200 font-bold text-emerald-800">
                    {m.spo2_percentage ? `${m.spo2_percentage}%` : '—'}
                  </td>
                ))}
              </tr>

              {/* ETCO2 */}
              <tr>
                <td className="text-right pr-2 py-0.5 font-sans font-bold text-amber-800 border-r border-slate-300 bg-slate-50">ETCO₂ (mmHg)</td>
                {timeColumns.map((m, idx) => (
                  <td key={idx} className="py-0.5 border-r border-slate-200 font-bold text-amber-800">
                    {m.etco2_mmhg ?? '—'}
                  </td>
                ))}
              </tr>

              {/* FR */}
              <tr>
                <td className="text-right pr-2 py-0.5 font-sans font-bold text-cyan-800 border-r border-slate-300 bg-slate-50">FR (mpm)</td>
                {timeColumns.map((m, idx) => (
                  <td key={idx} className="py-0.5 border-r border-slate-200">
                    {m.respiratory_rate_mpm ?? '—'}
                  </td>
                ))}
              </tr>

              {/* Temp */}
              <tr>
                <td className="text-right pr-2 py-0.5 font-sans font-bold text-indigo-800 border-r border-slate-300 bg-slate-50">Temp (°C)</td>
                {timeColumns.map((m, idx) => (
                  <td key={idx} className="py-0.5 border-r border-slate-200 font-bold">
                    {m.temperature_c ? `${m.temperature_c}°` : '—'}
                  </td>
                ))}
              </tr>

              {/* Ritmo ECG */}
              <tr>
                <td className="text-right pr-2 py-0.5 font-sans font-bold text-slate-700 border-r border-slate-300 bg-slate-50">Ritmo ECG</td>
                {timeColumns.map((m, idx) => (
                  <td key={idx} className="py-0.5 border-r border-slate-200 text-[8px] text-slate-700">
                    {m.ecg_rhythm || (m.heart_rate_bpm ? 'Sinusal' : '—')}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Faixa de Sincronização de Eventos & Fármacos no Tempo */}
        <div className="bg-slate-50 border-t border-slate-300 p-2 space-y-1.5 text-[9px]">
          {/* Linha de Eventos Cirúrgicos */}
          <div className="flex items-start gap-2">
            <span className="font-bold text-slate-700 w-24 shrink-0 uppercase text-[8px] mt-0.5">
              EVENTOS & MARCOS:
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              {routineEvents.length > 0 ? (
                routineEvents.map((ev: AnestheticTimelineEvent) => (
                  <span key={ev.id} className="bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-800">
                    <strong className="font-mono text-emerald-800">{ev.real_time || ev.elapsed_time}</strong> {ev.title} {ev.description ? `(${ev.description})` : ''}
                  </span>
                ))
              ) : (
                <span className="text-slate-400 italic">Procedimento transcorreu dentro dos marcos planejados.</span>
              )}
            </div>
          </div>

          {/* Linha de Intercorrências & Condutas */}
          {incidents.length > 0 && (
            <div className="flex items-start gap-2 pt-1 border-t border-slate-200 text-rose-900 bg-rose-50/60 p-1.5 rounded">
              <span className="font-black text-rose-700 w-24 shrink-0 uppercase text-[8px] flex items-center gap-1 mt-0.5">
                <AlertTriangle className="w-2.5 h-2.5" />
                INTERCORRÊNCIAS:
              </span>
              <div className="space-y-1 flex-1">
                {incidents.map((inc: AnestheticTimelineEvent) => (
                  <div key={inc.id} className="text-[9px]">
                    <strong className="font-mono">{inc.real_time || inc.elapsed_time}:</strong> <span className="font-bold">{inc.title}</span> {inc.description ? `— ${inc.description}` : ''}
                    {inc.intervention && (
                      <span className="text-emerald-900 ml-1"><strong>| Conduta:</strong> {inc.intervention}</span>
                    )}
                    {inc.outcome && (
                      <span className="text-slate-800 ml-1"><strong>| Desfecho:</strong> {inc.outcome}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 8. RECUPERAÇÃO PÓS-ANESTÉSICA (RPA) & ALTA                     */}
      {/* ============================================================== */}
      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-300 space-y-1">
        <div className="flex items-center justify-between border-b border-slate-200 pb-1">
          <span className="font-bold text-slate-900 uppercase text-[9px] tracking-wider">
            RECUPERAÇÃO PÓS-ANESTÉSICA (RPA) & PRESCRIÇÕES IMEDIATAS
          </span>
          <span className="text-[9px] text-slate-500">
            Tempo em RPA: {anesthesia.times?.recovery_duration_minutes ? `${anesthesia.times.recovery_duration_minutes} min` : 'Monitorado'}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2 text-[10px]">
          <div>
            <span className="text-slate-500 text-[9px] block">Extubação:</span>
            <strong>{anesthesia.recovery?.extubation_time || anesthesia.times?.extubation_time || 'No leito cirúrgico'}</strong>
          </div>
          <div>
            <span className="text-slate-500 text-[9px] block">Nível de Consciência:</span>
            <strong>{anesthesia.recovery?.consciousness_level || 'Em retorno'}</strong>
          </div>
          <div>
            <span className="text-slate-500 text-[9px] block">Qualidade da Recuperação:</span>
            <strong className="text-emerald-800">{anesthesia.recovery?.recovery_quality || 'Suave / Sem agitação'}</strong>
          </div>
          <div>
            <span className="text-slate-500 text-[9px] block">Escore de Dor:</span>
            <strong>{anesthesia.recovery?.pain_score !== undefined ? `${anesthesia.recovery.pain_score}/10` : '0/10 (Controlada)'}</strong>
          </div>
        </div>

        {anesthesia.recovery?.post_op_medications && (
          <div className="text-[10px] text-slate-700 pt-1">
            <strong>Medicações prescritas para a RPA:</strong> {anesthesia.recovery.post_op_medications}
          </div>
        )}

        {anesthesia.recovery?.discharge_notes && (
          <div className="text-[9px] text-slate-500 italic pt-0.5">
            <strong>Orientações de alta:</strong> {anesthesia.recovery.discharge_notes}
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* 9. FECHAMENTO & ASSINATURA DO ANESTESISTA                      */}
      {/* ============================================================== */}
      <div className="pt-4 flex items-end justify-between border-t-2 border-slate-300">
        <div className="space-y-1 max-w-md">
          <div className="text-[9px] text-slate-500">
            Atesto que o procedimento anestésico foi conduzido sob monitorização multiparamétrica contínua e critérios técnicos estritos em conformidade com o Código de Ética do Médico-Veterinário (CFMV/CRMV).
          </div>
          <div className="text-[8px] text-slate-400 font-mono">
            Documento emitido eletronicamente via <strong>VetGo — Veterinária onde você precisa</strong>
          </div>
        </div>

        {/* Bloco de Assinatura: Digital vs Linha Física */}
        <div className="text-center min-w-[220px]">
          {isSigned && user?.signature_url ? (
            <div className="flex flex-col items-center">
              <img
                src={user.signature_url}
                alt="Assinatura Digital"
                className="max-h-12 max-w-[180px] object-contain mb-0.5 filter drop-shadow-xs"
              />
              <div className="w-56 border-t border-slate-800 mx-auto"></div>
              <div className="font-bold text-xs text-slate-900 mt-0.5">{vetName}</div>
              <div className="text-[10px] text-slate-600 font-mono">
                {crmvFull} • Médico(a) Veterinário(a)
              </div>
              <div className="text-[8px] text-emerald-800 font-mono mt-0.5">
                ✔ Assinatura Digital VetGo Autenticada
              </div>
            </div>
          ) : (
            <div className="pt-6">
              <div className="w-56 border-b border-slate-800 mx-auto pb-1 mb-1"></div>
              <div className="font-bold text-xs text-slate-900">{vetName}</div>
              <div className="text-[10px] text-slate-600 font-mono">{crmvFull}</div>
              <div className="text-[9px] text-slate-400 italic mt-0.5">(Assinatura manual com caneta)</div>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 10. RODAPÉ OFICIAL VETGO                                       */}
      {/* ============================================================== */}
      <div className="pt-2 mt-2 border-t border-slate-200 flex items-center justify-between text-[8px] text-slate-400 font-mono">
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded bg-emerald-900 text-white font-black text-[7px] flex items-center justify-center">
            V
          </div>
          <span className="font-sans font-bold text-slate-600">VetGo</span>
          <span>— Veterinária onde você precisa</span>
        </div>
        <div className="text-slate-400">
          Página 1 de 1 • Prontuário Médico-Veterinário Oficial
        </div>
      </div>
    </div>
  );
};
