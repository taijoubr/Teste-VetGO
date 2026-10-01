export type UserRole = 'VET' | 'ADMIN';
export type SubscriptionPlan = 'FREE' | 'PRO';
export type SubscriptionStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED';

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  whatsapp?: string;
  crmv?: string;
  crmv_uf?: string;
  clinic_name?: string;
  logo_url?: string;
  role: UserRole;
  is_active: boolean;
  plan: SubscriptionPlan;
  subscription_status: SubscriptionStatus;
  is_lifetime: boolean;
  subscription_start?: string;
  subscription_end?: string;
  created_at: string;
  specialty_anesthesia_enabled?: boolean;
  active_specialties?: string[];
  email_verified?: boolean;
  verification_code?: string;
  pix_key?: string;
  pix_receiver_name?: string;
  pix_city?: string;
}

export interface PlanUsage {
  plan: SubscriptionPlan;
  is_lifetime: boolean;
  is_expired: boolean;
  tutors_count: number;
  tutors_limit?: number | null;
  tutors_limit_reached: boolean;
  patients_count: number;
  patients_limit?: number | null;
  patients_limit_reached: boolean;
}

export interface Tutor {
  id: number;
  owner_id: number;
  name: string;
  cpf?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  address_number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  patients_count?: number;
}

export type Species = 
  | 'Canina'
  | 'Felina'
  | 'Equina'
  | 'Bovina'
  | 'Ovina'
  | 'Caprina'
  | 'Suína'
  | 'Lagomorfa'
  | 'Roedores'
  | 'Aves'
  | 'Répteis'
  | 'Anfíbios'
  | 'Mustelídeos'
  | 'Silvestres/Exóticos'
  | 'Outra';

export type MicrochipOption = 'NAO' | 'SIM' | 'NAO_INFORMADO';

export interface Patient {
  id: number;
  owner_id: number;
  tutor_id: number;
  tutor_name?: string;
  name: string;
  species: Species;
  custom_species?: string;
  breed?: string;
  scientific_name?: string;
  gender: 'Macho' | 'Fêmea' | 'Indefinido';
  birth_date?: string;
  approximate_age?: string;
  weight_kg?: number;
  coat_color?: string;
  is_neutered: boolean;
  // Microchip Requisito 23
  microchip_status?: MicrochipOption;
  microchip_number?: string;
  microchip?: string;
  microchip_date?: string;
  microchip_site?: string;
  microchip_notes?: string;
  photo_url?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
}

// -------------------------------------------------------------
// REQUISITO 1: MÓDULO DE CLÍNICAS
// -------------------------------------------------------------
export type ClinicBillingType = 'POR_ATENDIMENTO' | 'FATURAMENTO_PERIODICO';
export type ClinicPriceTableType = 'PADRAO' | 'ESPECIFICA';

export interface Clinic {
  id: number;
  owner_id: number;
  code: string; // Ex: CL-01, CL-02
  name: string;
  corporate_name?: string; // Razão Social
  cnpj?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  address_number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  manager_name?: string; // Responsável pela clínica
  contact_notes?: string;
  financial_contact?: string; // Contato financeiro
  payment_terms?: string; // Condições de pagamento (ex: 15 dias após fechamento)
  billing_type: ClinicBillingType; // Cobrança por atendimento ou faturamento periódico
  billing_closing_day?: number; // Dia de fechamento (ex: 25)
  billing_due_day?: number; // Dia de vencimento (ex: 5)
  price_table_type: ClinicPriceTableType;
  custom_price_table?: Record<string, number>;
  notes?: string;
  is_active: boolean;
  created_at: string;
  // Métricas agregadas
  total_procedures?: number;
  total_billed?: number;
}

// -------------------------------------------------------------
// REQUISITO 2: CIRURGIÕES (identificador PR-xx)
// -------------------------------------------------------------
export interface Surgeon {
  id: number;
  owner_id: number;
  code: string; // Ex: PR-42
  name: string;
  crmv: string;
  crmv_uf: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  notes?: string;
  clinic_ids: number[]; // Clínicas vinculadas
  is_active: boolean;
  created_at: string;
}

// -------------------------------------------------------------
// REQUISITOS 4 a 17: MÓDULO DE ANESTESIOLOGIA VETERINÁRIA
// -------------------------------------------------------------
export type ASACategory = 'ASA_I' | 'ASA_II' | 'ASA_III' | 'ASA_IV' | 'ASA_V';
export type ProcedureNature = 'ELETIVA' | 'URGENCIA' | 'EMERGENCIA';
export type AnesthesiaStatus = 
  | 'PLANEJAMENTO'
  | 'EM_ANDAMENTO'
  | 'RECUPERACAO'
  | 'FINALIZADA'
  | 'CANCELADA';

export interface PreAnestheticEvaluation {
  weight_kg: number;
  fasting_food_hours?: number;
  fasting_water_hours?: number;
  consciousness_level: 'Alerta' | 'Apático' | 'Deprimido' | 'Estuporoso' | 'Comatoso';
  reflexes: 'Preservados' | 'Diminuídos' | 'Ausentes';
  heart_rate_bpm?: number;
  respiratory_rate_mpm?: number;
  temperature_c?: number;
  mucous_membranes: 'Normocoradas' | 'Pálidas' | 'Cianóticas' | 'Ictéricas' | 'Congestas';
  capillary_refill_time_sec?: number;
  hydration_status: 'Normal (Adequada)' | 'Leve (5-6%)' | 'Moderada (7-9%)' | 'Grave (>10%)';
  previous_diseases?: string;
  previous_hospitalizations?: string;
  previous_surgeries?: string;
  trauma_history?: string;
  syncope_history?: string;
  allergies?: string;
  continuous_medications?: string;
  previous_anesthesias?: string;
  previous_complications?: string;
  lab_tests_summary?: string;
  ecg_summary?: string;
  echocardiogram_summary?: string;
  attachments?: string[];
  notes?: string;
}

export interface AnestheticPlanning {
  technique: string; // Ex: TIVA, Inalatória, Balanceada, Bloqueio Locorregional
  venous_access_site?: string; // Ex: Veia Cefálica Direita, Cateter 22G
  fluid_type: string; // Ex: Ringer Lactato, NaCl 0.9%
  fluid_rate_ml_kg_h: number; // Ex: 5 ml/kg/h
  oxygen_flow_l_min?: number;
  intubation: boolean;
  tube_size?: string; // Ex: Tubo endotraqueal com cuff nº 6.5
  breathing_circuit: string; // Ex: Sem reinalação (Baraka), Circular com reinalação
  ventilation_type: 'Espontânea' | 'Assistida' | 'Controlada (Pressão)' | 'Controlada (Volume)';
  maintenance_agent?: string; // Ex: Isoflurano, Propofol Alvo Controlado
}

export type ProtocolStage = 'MPA' | 'INDUCAO' | 'MANUTENCAO' | 'ANALGESIA' | 'BLOQUEIO' | 'OUTROS';

export interface ProtocolDrugItem {
  id: string;
  stage: ProtocolStage;
  drug_name: string;
  active_ingredient?: string;
  presentation_type: 'LIQUIDO_ML' | 'COMPRIMIDO'; // Requisito 20: ml proporcional vs comprimido físico
  dose_mg_kg: number;
  concentration_mg_ml: number;
  route: 'IV' | 'IM' | 'SC' | 'Epidural' | 'Perineural' | 'Oral' | 'Inalatória';
  calculated_volume_ml: number; // Volume teórico
  administered_volume: number; // Volume real administrado
  // Requisito 20: Quantidade física consumida no estoque (ex: 0.5 comp -> 1 comp no estoque)
  consumed_stock_units: number;
  billed_units: number; // Quantidade cobrada ao tutor/clínica
  administered_at_time?: string; // Horário real
  anesthetic_elapsed_time?: string; // Tempo no cronômetro (ex: 00:05:12)
  notes?: string;
}

export interface ProcedureTimes {
  mpa_time?: string; // Horário da MPA
  induction_time?: string; // Horário de indução
  anesthesia_start_time?: string; // Início oficial da anestesia (dispara cronômetro)
  procedure_start_time?: string; // Início do ato cirúrgico
  procedure_end_time?: string; // Fim do ato cirúrgico
  anesthesia_end_time?: string; // Fim da anestesia
  extubation_time?: string; // Horário da extubação
  recovery_end_time?: string; // Alta da RPA
  // Durações calculadas em minutos
  anesthetic_duration_minutes?: number;
  procedure_duration_minutes?: number;
  time_to_extubation_minutes?: number;
  recovery_duration_minutes?: number;
}

export interface MonitoringReading {
  id: string;
  timestamp: string; // Horário real (ex: 14:15)
  elapsed_minutes: number; // Minuto 0, 5, 10, 15, 20...
  heart_rate_bpm?: number;
  respiratory_rate_mpm?: number;
  spo2_percentage?: number;
  etco2_mmhg?: number;
  pas_mmhg?: number; // Pressão Arterial Sistólica
  pam_mmhg?: number; // Pressão Arterial Média
  pad_mmhg?: number; // Pressão Arterial Diastólica
  temperature_c?: number;
  ecg_rhythm?: string; // Ritmo: Sinusal, Taquicardia, Bradicardia, VPCs, etc.
}

export type TimelineEventType = 'PARAMETRO' | 'MEDICAMENTO' | 'FLUIDO' | 'EVENTO' | 'INTERCORRENCIA';

export interface AnestheticTimelineEvent {
  id: string;
  event_type: TimelineEventType;
  real_time: string; // Horário real (ex: 14:22:10)
  elapsed_time: string; // Tempo decorrido no cronômetro (ex: 00:22:10)
  title: string;
  description: string;
  intervention?: string; // Conduta tomada
  outcome?: string; // Evolução
}

export interface PostAnesthesiaRecovery {
  extubation_time?: string;
  consciousness_level: 'Comatoso' | 'Estuporoso' | 'Deprimido' | 'Sonolento' | 'Alerta';
  heart_rate_bpm?: number;
  respiratory_rate_mpm?: number;
  spo2_percentage?: number;
  temperature_c?: number;
  pain_score?: 'Sem dor' | 'Leve' | 'Moderada' | 'Severa';
  recovery_quality: 'Excelente (Calma/Suave)' | 'Boa (Pequena agitação)' | 'Regular (Vocalização/Disforia)' | 'Ruim (Agitação intensa/Ataxia)';
  complications?: string;
  post_op_medications?: string;
  discharge_notes?: string;
}

export interface AnesthesiaRecord {
  id: number;
  owner_id: number;
  code: string; // Ex: AN-2026-001
  // Vínculos
  clinic_id: number;
  clinic_name: string;
  surgeon_id: number;
  surgeon_name: string;
  patient_id: number;
  patient_name: string;
  patient_species: string;
  patient_breed?: string;
  tutor_id: number;
  tutor_name: string;
  procedure_name: string;
  procedure_nature: ProcedureNature;
  date: string;
  scheduled_time: string;
  status: AnesthesiaStatus;

  // Avaliação e ASA
  pre_evaluation: PreAnestheticEvaluation;
  asa_category: ASACategory;
  is_emergency: boolean;
  asa_justification?: string;

  // Planejamento e Protocolo
  planning: AnestheticPlanning;
  protocol_drugs: ProtocolDrugItem[];

  // Tempos e Cronômetro
  times: ProcedureTimes;
  monitoring_interval_minutes: number; // 5, 10, 15 ou personalizado
  monitorings: MonitoringReading[];
  timeline_events: AnestheticTimelineEvent[];

  // Recuperação e Desfecho
  recovery?: PostAnesthesiaRecovery;

  // Faturamento e Custos
  total_billed_amount?: number;
  billing_status?: 'PENDENTE' | 'FATURADO' | 'PAGO';

  notes?: string;
  created_at: string;
}

// -------------------------------------------------------------
// APPOINTMENTS & CONSULTATIONS
// -------------------------------------------------------------
export type AppointmentStatus = 'AGENDADO' | 'CONFIRMADO' | 'EM_ATENDIMENTO' | 'CONCLUIDO' | 'CANCELADO';
export type AppointmentType = 'Domiciliar / Volante' | 'Consultório / Clínica Parceira' | 'Emergência' | 'Retorno' | 'Vacinação' | 'Procedimento' | 'Anestesia' | 'Outro';

export interface Appointment {
  id: number;
  owner_id: number;
  tutor_id: number;
  tutor_name?: string;
  patient_id: number;
  patient_name?: string;
  patient_species?: string;
  clinic_id?: number;
  clinic_name?: string;
  date_time: string;
  duration_minutes: number;
  address?: string;
  appointment_type: AppointmentType;
  status: AppointmentStatus;
  reason?: string;
  notes?: string;
  created_at: string;
}

export interface VitalSigns {
  temperature_c?: number;
  heart_rate_bpm?: number;
  respiratory_rate_mpm?: number;
  capillary_refill_time_sec?: number;
  blood_pressure?: string;
  body_condition_score?: number;
  hydration_status?: 'Normal (Adequada)' | 'Leve (5-6%)' | 'Moderada (7-9%)' | 'Grave (>10%)';
  mucous_membranes?: 'Normocoradas' | 'Pálidas' | 'Cianóticas' | 'Ictéricas' | 'Congestas';
}

export interface PrescriptionItem {
  id: string;
  medication_name: string;
  active_ingredient?: string;
  dose: string;
  frequency: string;
  duration_days: number;
  route: 'Oral' | 'Subcutânea' | 'Intramuscular' | 'Intravenosa' | 'Tópica' | 'Oftálmica' | 'Otológica' | 'Inalatória';
  instructions: string;
}

export interface VaccineRecord {
  id: string;
  vaccine_name: string;
  manufacturer?: string;
  batch_number: string;
  application_date: string;
  next_booster_date: string;
  route: string;
  applied_by?: string;
}

export interface ClinicalConsultation {
  id: number;
  owner_id: number;
  patient_id: number;
  patient_name: string;
  tutor_id: number;
  tutor_name: string;
  appointment_id?: number;
  clinic_id?: number;
  clinic_name?: string;
  date_time: string;
  chief_complaint: string;
  anamnesis: string;
  vital_signs: VitalSigns;
  physical_examination: string;
  diagnosis_suspicions: string;
  prognosis?: 'Favorável' | 'Reservado' | 'Desfavorável' | 'Infausto';
  conduct_plan: string;
  prescriptions: PrescriptionItem[];
  vaccines: VaccineRecord[];
  is_volante: boolean;
  location_address?: string;
  status: 'EM_ANDAMENTO' | 'FINALIZADO';
  created_at: string;
}

// -------------------------------------------------------------
// GESTÃO FINANCEIRA
// -------------------------------------------------------------
export type FinancialEntryType = 'RECEITA' | 'DESPESA';
export type PaymentMethod = 'PIX' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | 'DINHEIRO' | 'TRANSFERENCIA' | 'BOLETO' | 'FATURAMENTO_CLINICA' | 'PENDENTE';
export type FinancialStatus = 'PAGO' | 'PENDENTE' | 'CANCELADO';

export interface FinancialEntry {
  id: number;
  owner_id: number;
  entry_type: FinancialEntryType;
  category: string;
  description: string;
  amount: number;
  payment_method: PaymentMethod;
  status: FinancialStatus;
  date: string;
  due_date?: string;
  tutor_id?: number;
  tutor_name?: string;
  patient_id?: number;
  patient_name?: string;
  clinic_id?: number;
  clinic_name?: string;
  anesthesia_id?: number;
  appointment_id?: number;
  notes?: string;
  receipt_number?: string;
  created_at: string;
}

// -------------------------------------------------------------
// ESTOQUE, LOTES & MEDICAMENTOS (Requisitos 18, 19, 20)
// -------------------------------------------------------------
export type InventoryCategory = 'Medicamento' | 'Vacina' | 'Material Cirúrgico' | 'Descartável' | 'Nutracêutico' | 'Outro';
export type StockLocation = 'ESTOQUE_CENTRAL' | 'MALETA_VOLANTE';

export interface InventoryBatchEntry {
  id: string;
  item_id: number;
  batch_number: string;
  expiration_date: string;
  quantity_purchased: number;
  quantity_remaining: number;
  unit_cost: number;
  supplier_name?: string;
  purchase_date: string;
  target_location: StockLocation;
  created_at: string;
}

export interface InventoryItem {
  id: number;
  owner_id: number;
  name: string;
  category: InventoryCategory;
  active_ingredient?: string;
  presentation?: string;
  concentration?: string;
  presentation_type: 'LIQUIDO_ML' | 'COMPRIMIDO' | 'AMPOLA' | 'UNIDADE';
  batch_number?: string;
  expiration_date?: string;
  quantity_in_kit: number; // Na maleta volante
  quantity_in_stock: number; // No estoque central
  unit: string;
  min_alert_quantity: number;
  cost_price: number;
  sale_price?: number;
  supplier_name?: string;
  is_controlled_substance: boolean;
  notes?: string;
  batches?: InventoryBatchEntry[]; // Histórico permanente de entradas/lotes
  created_at: string;
}

// -------------------------------------------------------------
// DOCUMENTOS E TERMOS
// -------------------------------------------------------------
export type DocumentType = 
  | 'RECEITA_SIMPLES'
  | 'RECEITA_CONTROLE_ESPECIAL'
  | 'ATESTADO_SAUDE'
  | 'ATESTADO_VACINACAO'
  | 'TERMO_CONSENTIMENTO_LIVRE'
  | 'TERMO_EUTANASIA'
  | 'AUTORIZACAO_SEDACAO'
  | 'FICHA_ANESTESICA'
  | 'RECIBO_PAGAMENTO';

export interface DocumentRecord {
  id: number;
  owner_id: number;
  doc_type: DocumentType;
  title: string;
  patient_id?: number;
  patient_name?: string;
  tutor_id?: number;
  tutor_name?: string;
  clinic_id?: number;
  clinic_name?: string;
  content: string;
  metadata_json?: any;
  created_at: string;
}

export interface FinancialSummary {
  total_receitas_mes: number;
  total_despesas_mes: number;
  saldo_mes: number;
  contas_pendentes_count: number;
  contas_pendentes_valor: number;
}

export interface DashboardStats {
  plan_usage: PlanUsage;
  today_appointments_count: number;
  upcoming_appointments_count: number;
  total_patients_count: number;
  total_tutors_count: number;
  total_clinics_count?: number;
  total_anesthesias_count?: number;
  financial_summary: FinancialSummary;
  today_appointments: Appointment[];
  recent_patients: Patient[];
  recent_tutors: Tutor[];
  low_stock_count: number;
}

// -------------------------------------------------------------
// ADMINISTRAÇÃO PLATAFORMA (Requisito 25)
// -------------------------------------------------------------
export interface AdminUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  crmv?: string;
  crmv_uf?: string;
  phone?: string;
  role: UserRole;
  plan: SubscriptionPlan;
  subscription_status: SubscriptionStatus;
  is_lifetime: boolean;
  subscription_start?: string;
  subscription_end?: string;
  is_active: boolean;
  created_at: string;
  tutors_count: number;
  patients_count: number;
}

export interface AdminAuditLog {
  id: number;
  admin_name?: string;
  target_user_name?: string;
  action: string;
  details?: string;
  created_at: string;
}

export interface AdminStats {
  total_users: number;
  total_vets: number;
  total_free_users: number;
  total_pro_users: number;
  total_lifetime_users: number;
  total_active_subscriptions: number;
  estimated_mrr: number;
  conversion_rate: number;
  monthly_churn_rate: number;
}

export interface PlatformPlan {
  id: string;
  name: string;
  code: 'FREE' | 'PRO' | 'LIFETIME';
  price_monthly: number;
  price_annual: number;
  max_patients: number | 'ILIMITADO';
  has_anesthesia: boolean;
  has_clinics: boolean;
  has_financial: boolean;
  has_custom_logo: boolean;
  badge?: string;
  is_active: boolean;
}

export interface GlobalAnnouncement {
  id: number;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'ALERT' | 'SUCCESS';
  is_active: boolean;
  created_at: string;
  created_by: string;
}
