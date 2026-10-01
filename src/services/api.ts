import {
  User,
  Tutor,
  Patient,
  Clinic,
  Surgeon,
  AnesthesiaRecord,
  MonitoringReading,
  AnestheticTimelineEvent,
  PostAnesthesiaRecovery,
  ProcedureTimes,
  Appointment,
  DashboardStats,
  AdminUser,
  AdminAuditLog,
  AdminStats,
  PlatformPlan,
  GlobalAnnouncement,
  PlanUsage,
  ClinicalConsultation,
  FinancialEntry,
  InventoryItem,
  InventoryBatchEntry,
  StockLocation,
  DocumentRecord
} from '../types';
import { adminService } from './adminService';
import { offlineStorage } from './offlineStorage';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const api = {
  // Token management
  getToken(): string | null {
    return localStorage.getItem('vetgo_token');
  },
  setToken(token: string) {
    localStorage.setItem('vetgo_token', token);
  },
  getCachedUser(): User | null {
    const raw = localStorage.getItem('vetgo_current_user');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },
  removeToken() {
    const cached = this.getCachedUser();
    if (cached?.id) {
      offlineStorage.clearUserData(cached.id);
    }
    localStorage.setItem('vetgo_token', '');
    localStorage.removeItem('vetgo_token');
    localStorage.removeItem('vetgo_current_user');
  },

  // Central Request Handler with Bearer token, error handling, session management, and Offline Support
  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const cachedUser = this.getCachedUser();
    const isGet = !options.method || options.method === 'GET';

    try {
      const res = await fetch(url, { ...options, headers });

      if (res.status === 401) {
        this.removeToken();
        throw new Error('Sessão expirada. Faça login novamente.');
      }

      if (!res.ok) {
        let errMsg = 'Erro na requisição ao servidor.';
        try {
          const errorData = await res.json();
          if (errorData?.detail) {
            errMsg =
              typeof errorData.detail === 'string'
                ? errorData.detail
                : Array.isArray(errorData.detail)
                ? errorData.detail.map((e: any) => e.msg || e).join(', ')
                : JSON.stringify(errorData.detail);
          }
        } catch {
          // Not JSON
        }
        throw new Error(errMsg);
      }

      if (res.status === 204) {
        return {} as T;
      }
      const data = await res.json();

      // Salva resposta GET no cache isolado do veterinário logado
      if (isGet && cachedUser?.id) {
        offlineStorage.saveData(cachedUser.id, endpoint, data);
      }

      return data;
    } catch (err: any) {
      // Se a rede falhar ou estiver sem internet:
      if (cachedUser?.id) {
        // Fallback 1: Retorna do cache local para requisições GET
        if (isGet) {
          const cachedData = offlineStorage.getData<T>(cachedUser.id, endpoint);
          if (cachedData !== null) {
            return cachedData;
          }
        }

        // Fallback 2: Enfileira mutações POST/PUT para sincronização automática quando a rede voltar
        if (options.method === 'POST' || options.method === 'PUT') {
          let bodyObj: any = null;
          try {
            if (options.body) bodyObj = JSON.parse(options.body as string);
          } catch {}

          offlineStorage.queueMutation(cachedUser.id, {
            url,
            method: options.method,
            body: bodyObj,
            description: `${options.method} ${endpoint}`,
          });

          // Retorno otimista simulado para que a interface não trave
          return {
            id: Date.now(),
            ...bodyObj,
            _offline_saved: true,
          } as unknown as T;
        }
      }

      throw err;
    }
  },

  // Auth
  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      let errMsg = 'E-mail ou senha incorretos.';
      try {
        const errJson = await res.json();
        if (errJson?.detail) errMsg = errJson.detail;
      } catch {}
      throw new Error(errMsg);
    }
    const data = await res.json();
    this.setToken(data.access_token);
    // Preserva ou inicializa a preferência de especialidade (padrão true se não definido)
    const savedUserStr = localStorage.getItem('vetgo_current_user');
    let specialtyEnabled = typeof data.user.specialty_anesthesia_enabled === 'boolean'
      ? data.user.specialty_anesthesia_enabled
      : false;
    if (savedUserStr) {
      try {
        const parsed = JSON.parse(savedUserStr);
        if (parsed.id === data.user.id && typeof parsed.specialty_anesthesia_enabled === 'boolean') {
          specialtyEnabled = parsed.specialty_anesthesia_enabled;
        }
      } catch {}
    }
    const user = {
      ...data.user,
      specialty_anesthesia_enabled: specialtyEnabled
    };
    localStorage.setItem('vetgo_current_user', JSON.stringify(user));
    return { user, token: data.access_token };
  },

  async register(data: any): Promise<{ user: User; token: string; email_sent?: boolean; dev_code?: string }> {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      let errMsg = 'Erro ao cadastrar usuário.';
      try {
        const errJson = await res.json();
        if (errJson?.detail) {
          errMsg = typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail);
        }
      } catch {}
      throw new Error(errMsg);
    }
    const result = await res.json();
    this.setToken(result.access_token);
    // Novo usuário inicia obrigatoriamente com o módulo de anestesia desligado
    const user = {
      ...result.user,
      specialty_anesthesia_enabled: false
    };
    localStorage.setItem('vetgo_current_user', JSON.stringify(user));
    return {
      user,
      token: result.access_token,
      email_sent: result.email_sent,
      dev_code: result.dev_code
    };
  },

  async verifyEmail(email: string, code: string): Promise<{ message: string; user: User }> {
    const res = await fetch(`${API_BASE_URL}/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code })
    });
    if (!res.ok) {
      let errMsg = 'Código de validação incorreto ou expirado.';
      try {
        const errJson = await res.json();
        if (errJson?.detail) errMsg = errJson.detail;
      } catch {}
      throw new Error(errMsg);
    }
    const data = await res.json();
    if (data.user) {
      const savedUserStr = localStorage.getItem('vetgo_current_user');
      let current = data.user;
      if (savedUserStr) {
        try {
          const parsed = JSON.parse(savedUserStr);
          current = { ...parsed, ...data.user, email_verified: true };
        } catch {}
      }
      localStorage.setItem('vetgo_current_user', JSON.stringify(current));
    }
    return data;
  },

  async resendVerificationCode(email: string): Promise<{ message: string; email_sent: boolean; dev_code?: string }> {
    const res = await fetch(`${API_BASE_URL}/auth/resend-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    if (!res.ok) {
      let errMsg = 'Erro ao reenviar código.';
      try {
        const errJson = await res.json();
        if (errJson?.detail) errMsg = errJson.detail;
      } catch {}
      throw new Error(errMsg);
    }
    return res.json();
  },

  async getVapidPublicKey(): Promise<string> {
    const res = await this.request<{ publicKey: string }>('/notifications/vapid-public-key');
    return res.publicKey;
  },

  async getNotificationStatus(): Promise<{ has_active_subscription: boolean; subscriptions_count: number }> {
    return this.request<{ has_active_subscription: boolean; subscriptions_count: number }>('/notifications/status');
  },

  async subscribePush(subscription: any): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>('/notifications/subscribe', {
      method: 'POST',
      body: JSON.stringify({ subscription, user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null })
    });
  },

  async unsubscribePush(endpoint: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>('/notifications/unsubscribe', {
      method: 'POST',
      body: JSON.stringify({ endpoint })
    });
  },

  async sendTestPushNotification(): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>('/notifications/send-test', {
      method: 'POST'
    });
  },

  async structureConsultation(raw_text: string, patient_context?: any): Promise<{
    success: boolean;
    data: {
      chief_complaint: string;
      anamnesis: string;
      physical_exam: string;
      diagnostic_hypothesis: string;
      treatment_plan: string;
      prescription: string;
      summary: string;
    };
  }> {
    return this.request('/ai/structure-consultation', {
      method: 'POST',
      body: JSON.stringify({ raw_text, patient_context }),
    });
  },

  async generateDocumentDraft(params: {
    doc_type: string;
    prompt: string;
    patient_name?: string;
    tutor_name?: string;
    species?: string;
    breed?: string;
  }): Promise<{ success: boolean; text: string }> {
    return this.request('/ai/generate-document-draft', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async getCurrentUser(): Promise<User | null> {
    const token = this.getToken();
    if (!token) {
      return null;
    }
    try {
      const user = await this.request<User>('/auth/me');
      // Preservar a escolha do usuário ou usar o valor do perfil (padrão desligado para novos)
      let specialtyEnabled = typeof user.specialty_anesthesia_enabled === 'boolean'
        ? user.specialty_anesthesia_enabled
        : false;
      const cached = localStorage.getItem('vetgo_current_user');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed.id === user.id && typeof parsed.specialty_anesthesia_enabled === 'boolean') {
            specialtyEnabled = parsed.specialty_anesthesia_enabled;
          }
        } catch {}
      }
      const finalUser = {
        ...user,
        specialty_anesthesia_enabled: specialtyEnabled
      };
      localStorage.setItem('vetgo_current_user', JSON.stringify(finalUser));
      return finalUser;
    } catch {
      this.removeToken();
      return null;
    }
  },

  async updateProfile(updates: Partial<User>): Promise<User> {
    const updated = await this.request<User>('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
    // Recupera valor prévio ou valor atualizado caso tenha vindo em updates
    let specialtyEnabled = false;
    if (typeof updates.specialty_anesthesia_enabled === 'boolean') {
      specialtyEnabled = updates.specialty_anesthesia_enabled;
    } else if (typeof updated.specialty_anesthesia_enabled === 'boolean') {
      specialtyEnabled = updated.specialty_anesthesia_enabled;
    } else {
      const cached = localStorage.getItem('vetgo_current_user');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (typeof parsed.specialty_anesthesia_enabled === 'boolean') {
            specialtyEnabled = parsed.specialty_anesthesia_enabled;
          }
        } catch {}
      }
    }
    const finalUser = {
      ...updated,
      specialty_anesthesia_enabled: specialtyEnabled
    };
    localStorage.setItem('vetgo_current_user', JSON.stringify(finalUser));
    return finalUser;
  },

  async changePassword(passwordData: { current_password: string; new_password: string }): Promise<{ message: string }> {
    return this.request<{ message: string }>('/users/password', {
      method: 'PUT',
      body: JSON.stringify(passwordData)
    });
  },

  // Dashboard Stats & Quotas (real backend queries)
  async getDashboardStats(): Promise<DashboardStats> {
    return this.request<DashboardStats>('/dashboard/stats');
  },

  async getPlanUsage(): Promise<PlanUsage> {
    return this.request<PlanUsage>('/dashboard/plan-usage');
  },

  // Tutors
  async getTutors(): Promise<Tutor[]> {
    return this.request<Tutor[]>('/tutors');
  },

  async createTutor(tutorData: Partial<Tutor>): Promise<Tutor> {
    return this.request<Tutor>('/tutors', {
      method: 'POST',
      body: JSON.stringify(tutorData)
    });
  },

  async updateTutor(id: number, updates: Partial<Tutor>): Promise<Tutor> {
    return this.request<Tutor>(`/tutors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  async toggleTutorStatus(id: number): Promise<{ message: string; is_active: boolean }> {
    return this.request<{ message: string; is_active: boolean }>(`/tutors/${id}/toggle-status`, {
      method: 'PATCH'
    });
  },

  async checkTutorCpfDuplicate(cpf: string, excludeTutorId?: number): Promise<Tutor | null> {
    const clean = cpf.replace(/\D/g, '');
    if (!clean) return null;
    try {
      const tutors = await this.getTutors();
      return tutors.find(
        (t) => t.id !== excludeTutorId && t.cpf && t.cpf.replace(/\D/g, '') === clean
      ) || null;
    } catch {
      return null;
    }
  },

  // Patients
  async getPatients(tutorId?: number): Promise<Patient[]> {
    const query = tutorId ? `?tutor_id=${tutorId}` : '';
    return this.request<Patient[]>(`/patients${query}`);
  },

  async createPatient(patientData: Partial<Patient>): Promise<Patient> {
    return this.request<Patient>('/patients', {
      method: 'POST',
      body: JSON.stringify(patientData)
    });
  },

  async updatePatient(id: number, updates: Partial<Patient>): Promise<Patient> {
    return this.request<Patient>(`/patients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  async togglePatientStatus(id: number): Promise<{ message: string; is_active: boolean }> {
    return this.request<{ message: string; is_active: boolean }>(`/patients/${id}/toggle-status`, {
      method: 'PATCH'
    });
  },

  async checkMicrochipDuplicate(microchipNumber: string, excludePatientId?: number): Promise<Patient | null> {
    const clean = microchipNumber.trim().toLowerCase();
    if (!clean) return null;
    try {
      const patients = await this.getPatients();
      return patients.find(
        (p) =>
          p.id !== excludePatientId &&
          ((p.microchip && p.microchip.trim().toLowerCase() === clean) ||
           (p.microchip_number && p.microchip_number.trim().toLowerCase() === clean))
      ) || null;
    } catch {
      return null;
    }
  },

  // -----------------------------------------------------------------
  // REQUISITO 1: MÓDULO DE CLÍNICAS
  // -----------------------------------------------------------------
  async checkClinicCnpjDuplicate(cnpj: string, excludeClinicId?: number): Promise<Clinic | null> {
    const clean = cnpj.replace(/\D/g, '');
    if (!clean) return null;
    const clinics = await this.getClinics();
    return clinics.find(
      (c) => c.id !== excludeClinicId && c.cnpj && c.cnpj.replace(/\D/g, '') === clean
    ) || null;
  },

  async getClinics(): Promise<Clinic[]> {
    const local = localStorage.getItem('vetgo_clinics');
    if (local) return JSON.parse(local);

    const defaultClinics: Clinic[] = [
      {
        id: 1,
        owner_id: 2,
        code: 'CL-01',
        name: 'Hospital Veterinário Jardins 24h',
        corporate_name: 'Jardins Medicina Veterinária Integrada Ltda',
        cnpj: '12.345.678/0001-90',
        phone: '(11) 3088-1200',
        whatsapp: '(11) 99887-1200',
        email: 'cirurgia@hospjardins.com.br',
        address: 'Av. Brigadeiro Luís Antônio',
        address_number: '3450',
        neighborhood: 'Jardins',
        city: 'São Paulo',
        state: 'SP',
        postal_code: '01402-001',
        manager_name: 'Dra. Camila Nogueira (Diretora Clínica)',
        financial_contact: 'Mariana Financeiro (ramal 204) - financeiro@hospjardins.com.br',
        payment_terms: 'Fechamento dia 25 de cada mês, pagamento até o 5º dia útil via Pix/TED.',
        billing_type: 'FATURAMENTO_PERIODICO',
        billing_closing_day: 25,
        billing_due_day: 5,
        price_table_type: 'ESPECIFICA',
        custom_price_table: {
          'Anestesia Geral Cirurgia Porte Médio': 480.0,
          'Anestesia Geral Cirurgia Porte Grande': 650.0,
          'Sedação / Procedimento Curto': 280.0,
          'Monitorização Especializada': 180.0
        },
        notes: 'Hospital com estrutura completa, arco cirúrgico e monitor multiparamétrico próprio no Bloco 2.',
        is_active: true,
        created_at: new Date().toISOString(),
        total_procedures: 14,
        total_billed: 7420.0
      },
      {
        id: 2,
        owner_id: 2,
        code: 'CL-02',
        name: 'Clínica Pet & Cia Moema',
        corporate_name: 'Pet & Cia Centro Veterinário Ltda - ME',
        cnpj: '98.765.432/0001-10',
        phone: '(11) 5051-8899',
        whatsapp: '(11) 98112-3344',
        email: 'contato@petciamoema.com.br',
        address: 'Rua Canário',
        address_number: '420',
        neighborhood: 'Moema',
        city: 'São Paulo',
        state: 'SP',
        postal_code: '04521-002',
        manager_name: 'Dr. Paulo Esteves',
        financial_contact: 'Dona Lúcia - adm@petciamoema.com.br',
        payment_terms: 'Cobrança direta por atendimento ao final do procedimento via Pix ou Cartão.',
        billing_type: 'POR_ATENDIMENTO',
        price_table_type: 'PADRAO',
        notes: 'Clínica de atendimento volante parceira. Realizam castrações e pequenas cirurgias às terças e quintas.',
        is_active: true,
        created_at: new Date().toISOString(),
        total_procedures: 8,
        total_billed: 3200.0
      },
      {
        id: 3,
        owner_id: 2,
        code: 'CL-03',
        name: 'Centro Cirúrgico VetCare Vila Mariana',
        corporate_name: 'VetCare Centro Especializado em Cirurgia Animal Ltda',
        cnpj: '45.123.890/0001-77',
        phone: '(11) 5572-9090',
        whatsapp: '(11) 97654-1122',
        email: 'adm@vetcarevm.com.br',
        address: 'Rua Domingos de Morais',
        address_number: '1850',
        neighborhood: 'Vila Mariana',
        city: 'São Paulo',
        state: 'SP',
        postal_code: '04010-200',
        manager_name: 'Dra. Beatriz Fontana',
        financial_contact: 'Carlos Contabilidade - financeiro@vetcarevm.com.br',
        payment_terms: 'Faturamento quinzenal (dias 15 e 30).',
        billing_type: 'FATURAMENTO_PERIODICO',
        billing_closing_day: 30,
        billing_due_day: 10,
        price_table_type: 'PADRAO',
        notes: 'Especialistas em ortopedia e neurocirurgia.',
        is_active: true,
        created_at: new Date().toISOString(),
        total_procedures: 6,
        total_billed: 4100.0
      }
    ];
    localStorage.setItem('vetgo_clinics', JSON.stringify(defaultClinics));
    return defaultClinics;
  },

  async getClinic(id: number): Promise<Clinic | null> {
    const clinics = await this.getClinics();
    return clinics.find((c) => c.id === id) || null;
  },

  async createClinic(data: Partial<Clinic>): Promise<Clinic> {
    const clinics = await this.getClinics();
    const nextNum = clinics.length + 1;
    const code = data.code || `CL-${String(nextNum).padStart(2, '0')}`;

    const newClinic: Clinic = {
      id: Date.now(),
      owner_id: 2,
      code,
      name: data.name || '',
      corporate_name: data.corporate_name,
      cnpj: data.cnpj,
      phone: data.phone,
      whatsapp: data.whatsapp || data.phone,
      email: data.email,
      address: data.address,
      address_number: data.address_number,
      complement: data.complement,
      neighborhood: data.neighborhood,
      city: data.city || 'São Paulo',
      state: data.state || 'SP',
      postal_code: data.postal_code,
      manager_name: data.manager_name,
      financial_contact: data.financial_contact,
      payment_terms: data.payment_terms,
      billing_type: data.billing_type || 'POR_ATENDIMENTO',
      billing_closing_day: data.billing_closing_day,
      billing_due_day: data.billing_due_day,
      price_table_type: data.price_table_type || 'PADRAO',
      custom_price_table: data.custom_price_table,
      notes: data.notes,
      is_active: data.is_active !== false,
      created_at: new Date().toISOString(),
      total_procedures: 0,
      total_billed: 0
    };
    clinics.unshift(newClinic);
    localStorage.setItem('vetgo_clinics', JSON.stringify(clinics));
    return newClinic;
  },

  async updateClinic(id: number, updates: Partial<Clinic>): Promise<Clinic> {
    const clinics = await this.getClinics();
    const idx = clinics.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error('Clínica não encontrada');
    clinics[idx] = { ...clinics[idx], ...updates };
    localStorage.setItem('vetgo_clinics', JSON.stringify(clinics));
    return clinics[idx];
  },

  async deleteClinic(id: number): Promise<void> {
    const clinics = await this.getClinics();
    const filtered = clinics.filter((c) => c.id !== id);
    localStorage.setItem('vetgo_clinics', JSON.stringify(filtered));
  },

  // -----------------------------------------------------------------
  // REQUISITO 2: CIRURGIÕES (identificador PR-xx)
  // -----------------------------------------------------------------
  async getSurgeons(clinicId?: number): Promise<Surgeon[]> {
    const local = localStorage.getItem('vetgo_surgeons');
    let list: Surgeon[] = [];

    if (local) {
      list = JSON.parse(local);
    } else {
      list = [
        {
          id: 1,
          owner_id: 2,
          code: 'PR-42',
          name: 'Dr. Roberto Martins de Castro',
          crmv: '21450',
          crmv_uf: 'SP',
          phone: '(11) 98321-4567',
          whatsapp: '(11) 98321-4567',
          email: 'roberto.castro.cirurgia@gmail.com',
          notes: 'Cirurgião especialista em tecidos moles e oncologia cirúrgica.',
          clinic_ids: [1, 3], // Hospital Jardins e VetCare
          is_active: true,
          created_at: new Date().toISOString()
        },
        {
          id: 2,
          owner_id: 2,
          code: 'PR-18',
          name: 'Dra. Vanessa Meireles',
          crmv: '32104',
          crmv_uf: 'SP',
          phone: '(11) 97234-8899',
          whatsapp: '(11) 97234-8899',
          email: 'dra.vanessameireles@gmail.com',
          notes: 'Cirurgiã geral e procedimentos eletivos (ovariosalpingohisterectomia, orquiectomia).',
          clinic_ids: [1, 2], // Hospital Jardins e Pet & Cia
          is_active: true,
          created_at: new Date().toISOString()
        },
        {
          id: 3,
          owner_id: 2,
          code: 'PR-09',
          name: 'Dr. Fernando Siqueira',
          crmv: '19882',
          crmv_uf: 'SP',
          phone: '(11) 99123-5566',
          whatsapp: '(11) 99123-5566',
          email: 'dr.fernando.siqueira@cirurgiavet.com',
          notes: 'Ortopedista e neurocirurgião veterinário.',
          clinic_ids: [2, 3], // Pet & Cia e VetCare
          is_active: true,
          created_at: new Date().toISOString()
        }
      ];
      localStorage.setItem('vetgo_surgeons', JSON.stringify(list));
    }

    if (clinicId) {
      // Ordena mostrando prioritariamente os cirurgiões vinculados à clínica
      return [...list].sort((a, b) => {
        const aLinked = a.clinic_ids.includes(clinicId);
        const bLinked = b.clinic_ids.includes(clinicId);
        if (aLinked && !bLinked) return -1;
        if (!aLinked && bLinked) return 1;
        return a.name.localeCompare(b.name);
      });
    }

    return list;
  },

  async createSurgeon(data: Partial<Surgeon>): Promise<Surgeon> {
    const list = await this.getSurgeons();
    const nextNum = list.length + 1;
    const code = data.code || `PR-${Math.floor(10 + Math.random() * 89)}`;

    const newSurgeon: Surgeon = {
      id: Date.now(),
      owner_id: 2,
      code,
      name: data.name || '',
      crmv: data.crmv || '',
      crmv_uf: data.crmv_uf || 'SP',
      phone: data.phone,
      whatsapp: data.whatsapp || data.phone,
      email: data.email,
      notes: data.notes,
      clinic_ids: data.clinic_ids || [],
      is_active: data.is_active !== false,
      created_at: new Date().toISOString()
    };
    list.unshift(newSurgeon);
    localStorage.setItem('vetgo_surgeons', JSON.stringify(list));
    return newSurgeon;
  },

  async updateSurgeon(id: number, updates: Partial<Surgeon>): Promise<Surgeon> {
    const list = await this.getSurgeons();
    const idx = list.findIndex((s) => s.id === id);
    if (idx === -1) throw new Error('Cirurgião não encontrado');
    list[idx] = { ...list[idx], ...updates };
    localStorage.setItem('vetgo_surgeons', JSON.stringify(list));
    return list[idx];
  },

  async deleteSurgeon(id: number): Promise<void> {
    const list = await this.getSurgeons();
    const filtered = list.filter((s) => s.id !== id);
    localStorage.setItem('vetgo_surgeons', JSON.stringify(filtered));
  },

  // -----------------------------------------------------------------
  // REQUISITOS 4 a 17: MÓDULO DE ANESTESIOLOGIA VETERINÁRIA
  // -----------------------------------------------------------------
  async getAnesthesias(filters?: { clinicId?: number; patientId?: number }): Promise<AnesthesiaRecord[]> {
    const local = localStorage.getItem('vetgo_anesthesias');
    let list: AnesthesiaRecord[] = [];

    if (local) {
      list = JSON.parse(local);
    } else {
      list = [
        {
          id: 1,
          owner_id: 2,
          code: 'AN-2026-001',
          clinic_id: 1,
          clinic_name: 'Hospital Veterinário Jardins 24h',
          surgeon_id: 1,
          surgeon_name: 'Dr. Roberto Martins de Castro (PR-42)',
          patient_id: 1,
          patient_name: 'Thor',
          patient_species: 'Canina',
          patient_breed: 'Golden Retriever',
          tutor_id: 1,
          tutor_name: 'Mariana Silveira Ramos',
          procedure_name: 'Mastocitoma em Região Lombar (Ressecção Cirúrgica com Margem Ampla)',
          procedure_nature: 'ELETIVA',
          date: new Date().toISOString().split('T')[0],
          scheduled_time: '09:00',
          status: 'FINALIZADA',
          pre_evaluation: {
            weight_kg: 34.5,
            fasting_food_hours: 8,
            fasting_water_hours: 2,
            consciousness_level: 'Alerta',
            reflexes: 'Preservados',
            heart_rate_bpm: 96,
            respiratory_rate_mpm: 22,
            temperature_c: 38.4,
            mucous_membranes: 'Normocoradas',
            capillary_refill_time_sec: 2,
            hydration_status: 'Normal (Adequada)',
            previous_diseases: 'Dermatite atópica sob controle',
            allergies: 'Sem relatos de reações prévias a anestésicos',
            continuous_medications: 'Nenhum no momento',
            previous_anesthesias: 'Orquiectomia aos 8 meses sem intercorrências',
            lab_tests_summary: 'Hemograma completo sem alterações; Função renal (Ureia 35, Creat 1.1) e hepática (ALT 42, FA 88) normais',
            ecg_summary: 'Ritmo sinusal normal, sem bloqueios ou extrassístoles',
            notes: 'Paciente cooperativo. Acesso venoso fácil.'
          },
          asa_category: 'ASA_II',
          is_emergency: false,
          asa_justification: 'Paciente hígido com afecção sistêmica localizada (neoplasia cutânea sem metástase ou comprometimento funcional grave).',
          planning: {
            technique: 'Anestesia Geral Balanceada com Bloqueio Tumescente Locorregional',
            venous_access_site: 'Veia cefálica direita (Cateter 20G)',
            fluid_type: 'Ringer com Lactato',
            fluid_rate_ml_kg_h: 5.0,
            oxygen_flow_l_min: 1.5,
            intubation: true,
            tube_size: 'Tubo endotraqueal com cuff nº 9.5',
            breathing_circuit: 'Circular com absorvedor de CO2 (cal sodada)',
            ventilation_type: 'Assistida',
            maintenance_agent: 'Isoflurano vaporizado em 100% O2'
          },
          protocol_drugs: [
            {
              id: 'drug-1',
              stage: 'MPA',
              drug_name: 'Metadona 10mg/ml + Acepromazina 0,2%',
              active_ingredient: 'Cloridrato de Metadona + Acepromazina',
              presentation_type: 'LIQUIDO_ML',
              dose_mg_kg: 0.3,
              concentration_mg_ml: 10,
              route: 'IM',
              calculated_volume_ml: 1.03,
              administered_volume: 1.0,
              consumed_stock_units: 1.0,
              billed_units: 1.0,
              administered_at_time: '08:45',
              anesthetic_elapsed_time: '00:00:00',
              notes: 'Sedação e analgesia inicial excelente'
            },
            {
              id: 'drug-2',
              stage: 'INDUCAO',
              drug_name: 'Propofol 10mg/ml (1%)',
              active_ingredient: 'Propofol',
              presentation_type: 'LIQUIDO_ML',
              dose_mg_kg: 4.0,
              concentration_mg_ml: 10,
              route: 'IV',
              calculated_volume_ml: 13.8,
              administered_volume: 12.0,
              consumed_stock_units: 1.0,
              billed_units: 1.0,
              administered_at_time: '09:05',
              anesthetic_elapsed_time: '00:05:00',
              notes: 'Administração lenta até perda de reflexo palpebral'
            },
            {
              id: 'drug-3',
              stage: 'ANALGESIA',
              drug_name: 'Dipirona Sódica 500mg/ml',
              active_ingredient: 'Dipirona',
              presentation_type: 'LIQUIDO_ML',
              dose_mg_kg: 25.0,
              concentration_mg_ml: 500,
              route: 'IV',
              calculated_volume_ml: 1.72,
              administered_volume: 1.8,
              consumed_stock_units: 1.8,
              billed_units: 1.8,
              administered_at_time: '09:40',
              anesthetic_elapsed_time: '00:40:00'
            }
          ],
          times: {
            mpa_time: '08:45',
            induction_time: '09:00',
            anesthesia_start_time: '09:05',
            procedure_start_time: '09:20',
            procedure_end_time: '10:15',
            anesthesia_end_time: '10:20',
            extubation_time: '10:32',
            recovery_end_time: '11:15',
            anesthetic_duration_minutes: 75,
            procedure_duration_minutes: 55,
            time_to_extubation_minutes: 12,
            recovery_duration_minutes: 43
          },
          monitoring_interval_minutes: 5,
          monitorings: [
            {
              id: 'm-0',
              timestamp: '09:05',
              elapsed_minutes: 0,
              heart_rate_bpm: 88,
              respiratory_rate_mpm: 14,
              spo2_percentage: 99,
              etco2_mmhg: 38,
              pas_mmhg: 125,
              pam_mmhg: 85,
              pad_mmhg: 65,
              temperature_c: 38.1,
              ecg_rhythm: 'Sinusal'
            },
            {
              id: 'm-5',
              timestamp: '09:10',
              elapsed_minutes: 5,
              heart_rate_bpm: 86,
              respiratory_rate_mpm: 12,
              spo2_percentage: 99,
              etco2_mmhg: 39,
              pas_mmhg: 120,
              pam_mmhg: 82,
              pad_mmhg: 62,
              temperature_c: 38.0,
              ecg_rhythm: 'Sinusal'
            },
            {
              id: 'm-10',
              timestamp: '09:15',
              elapsed_minutes: 10,
              heart_rate_bpm: 84,
              respiratory_rate_mpm: 12,
              spo2_percentage: 98,
              etco2_mmhg: 40,
              pas_mmhg: 115,
              pam_mmhg: 78,
              pad_mmhg: 60,
              temperature_c: 37.9,
              ecg_rhythm: 'Sinusal'
            },
            {
              id: 'm-15',
              timestamp: '09:20',
              elapsed_minutes: 15,
              heart_rate_bpm: 92,
              respiratory_rate_mpm: 14,
              spo2_percentage: 99,
              etco2_mmhg: 41,
              pas_mmhg: 128,
              pam_mmhg: 88,
              pad_mmhg: 68,
              temperature_c: 37.8,
              ecg_rhythm: 'Sinusal (Início incisão)'
            },
            {
              id: 'm-25',
              timestamp: '09:30',
              elapsed_minutes: 25,
              heart_rate_bpm: 78,
              respiratory_rate_mpm: 10,
              spo2_percentage: 98,
              etco2_mmhg: 42,
              pas_mmhg: 98,
              pam_mmhg: 64,
              pad_mmhg: 48,
              temperature_c: 37.6,
              ecg_rhythm: 'Sinusal'
            },
            {
              id: 'm-35',
              timestamp: '09:40',
              elapsed_minutes: 35,
              heart_rate_bpm: 86,
              respiratory_rate_mpm: 14,
              spo2_percentage: 99,
              etco2_mmhg: 38,
              pas_mmhg: 118,
              pam_mmhg: 80,
              pad_mmhg: 62,
              temperature_c: 37.5,
              ecg_rhythm: 'Sinusal'
            },
            {
              id: 'm-55',
              timestamp: '10:00',
              elapsed_minutes: 55,
              heart_rate_bpm: 88,
              respiratory_rate_mpm: 16,
              spo2_percentage: 99,
              etco2_mmhg: 36,
              pas_mmhg: 122,
              pam_mmhg: 84,
              pad_mmhg: 64,
              temperature_c: 37.4,
              ecg_rhythm: 'Sinusal'
            },
            {
              id: 'm-75',
              timestamp: '10:20',
              elapsed_minutes: 75,
              heart_rate_bpm: 94,
              respiratory_rate_mpm: 18,
              spo2_percentage: 99,
              etco2_mmhg: 35,
              pas_mmhg: 126,
              pam_mmhg: 86,
              pad_mmhg: 66,
              temperature_c: 37.3,
              ecg_rhythm: 'Sinusal (Fim anestesia)'
            }
          ],
          timeline_events: [
            {
              id: 'evt-1',
              event_type: 'EVENTO',
              real_time: '09:05:00',
              elapsed_time: '00:00:00',
              title: 'Início da Anestesia',
              description: 'Intubação traqueal bem-sucedida com tubo 9.5 com cuff insuflado.'
            },
            {
              id: 'evt-2',
              event_type: 'EVENTO',
              real_time: '09:20:00',
              elapsed_time: '00:15:00',
              title: 'Início do Procedimento',
              description: 'Incisão cirúrgica inicial pelo cirurgião Dr. Roberto.'
            },
            {
              id: 'evt-3',
              event_type: 'INTERCORRENCIA',
              real_time: '09:30:15',
              elapsed_time: '00:25:15',
              title: 'Hipotensão Transitória',
              description: 'PAM atingiu 64 mmHg após aprofundamento com Isoflurano.',
              intervention: 'Redução da fração expirada de Isoflurano para 1.1% e bolus de Ringer Lactato 10 ml/kg em 10 min.',
              outcome: 'Pressão arterial normalizada com PAM em 80 mmHg após 8 minutos.'
            },
            {
              id: 'evt-4',
              event_type: 'MEDICAMENTO',
              real_time: '09:40:00',
              elapsed_time: '00:35:00',
              title: 'Administração de Dipirona',
              description: 'Dipirona 25 mg/kg IV lenta para reforço analgésico transoperatório.'
            },
            {
              id: 'evt-5',
              event_type: 'EVENTO',
              real_time: '10:15:00',
              elapsed_time: '01:10:00',
              title: 'Fim do Procedimento',
              description: 'Sutura de pele concluída sem intercorrências cirúrgicas.'
            },
            {
              id: 'evt-6',
              event_type: 'EVENTO',
              real_time: '10:20:00',
              elapsed_time: '01:15:00',
              title: 'Fim da Anestesia',
              description: 'Vaporizador fechado, mantido em 100% O2 até retorno de deglutição.'
            }
          ],
          recovery: {
            extubation_time: '10:32',
            consciousness_level: 'Alerta',
            heart_rate_bpm: 98,
            respiratory_rate_mpm: 20,
            spo2_percentage: 99,
            temperature_c: 37.4,
            pain_score: 'Sem dor',
            recovery_quality: 'Excelente (Calma/Suave)',
            complications: 'Nenhuma complicação na sala de recuperação pós-anestésica.',
            post_op_medications: 'Meloxicam 0,1 mg/kg SID + Tramadol 3 mg/kg TID por 3 dias.',
            discharge_notes: 'Paciente entregue consciente, com reflexos normais e parâmetros estáveis à equipe de internação.'
          },
          total_billed_amount: 550.0,
          billing_status: 'PAGO',
          notes: 'Ficha anestésica finalizada com sucesso e assinada digitalmente.',
          created_at: new Date().toISOString()
        }
      ];
      localStorage.setItem('vetgo_anesthesias', JSON.stringify(list));
    }

    if (filters?.clinicId) {
      list = list.filter((a) => a.clinic_id === filters.clinicId);
    }
    if (filters?.patientId) {
      list = list.filter((a) => a.patient_id === filters.patientId);
    }
    return list;
  },

  async getAnesthesia(id: number): Promise<AnesthesiaRecord | null> {
    const list = await this.getAnesthesias();
    return list.find((a) => a.id === id) || null;
  },

  async createAnesthesia(data: Partial<AnesthesiaRecord>): Promise<AnesthesiaRecord> {
    const list = await this.getAnesthesias();
    const year = new Date().getFullYear();
    const nextCode = `AN-${year}-${String(list.length + 1).padStart(3, '0')}`;

    const newRecord: AnesthesiaRecord = {
      id: Date.now(),
      owner_id: 2,
      code: data.code || nextCode,
      clinic_id: data.clinic_id || 1,
      clinic_name: data.clinic_name || '',
      surgeon_id: data.surgeon_id || 1,
      surgeon_name: data.surgeon_name || '',
      patient_id: data.patient_id || 1,
      patient_name: data.patient_name || '',
      patient_species: data.patient_species || 'Canina',
      patient_breed: data.patient_breed,
      tutor_id: data.tutor_id || 1,
      tutor_name: data.tutor_name || '',
      procedure_name: data.procedure_name || 'Procedimento Cirúrgico',
      procedure_nature: data.procedure_nature || 'ELETIVA',
      date: data.date || new Date().toISOString().split('T')[0],
      scheduled_time: data.scheduled_time || '09:00',
      status: data.status || 'PLANEJAMENTO',
      pre_evaluation: data.pre_evaluation || {
        weight_kg: 10,
        consciousness_level: 'Alerta',
        reflexes: 'Preservados',
        mucous_membranes: 'Normocoradas',
        hydration_status: 'Normal (Adequada)'
      },
      asa_category: data.asa_category || 'ASA_I',
      is_emergency: !!data.is_emergency,
      asa_justification: data.asa_justification,
      planning: data.planning || {
        technique: 'Anestesia Geral Balanceada',
        fluid_type: 'Ringer com Lactato',
        fluid_rate_ml_kg_h: 5.0,
        intubation: true,
        breathing_circuit: 'Baraka',
        ventilation_type: 'Espontânea'
      },
      protocol_drugs: data.protocol_drugs || [],
      times: data.times || {},
      monitoring_interval_minutes: data.monitoring_interval_minutes || 5,
      monitorings: data.monitorings || [],
      timeline_events: data.timeline_events || [],
      recovery: data.recovery,
      total_billed_amount: data.total_billed_amount || 450.0,
      billing_status: data.billing_status || 'PENDENTE',
      notes: data.notes,
      created_at: new Date().toISOString()
    };

    list.unshift(newRecord);
    localStorage.setItem('vetgo_anesthesias', JSON.stringify(list));

    // Atualiza contadores na clínica
    const clinics = await this.getClinics();
    const clinicIdx = clinics.findIndex((c) => c.id === newRecord.clinic_id);
    if (clinicIdx >= 0) {
      clinics[clinicIdx].total_procedures = (clinics[clinicIdx].total_procedures || 0) + 1;
      clinics[clinicIdx].total_billed = (clinics[clinicIdx].total_billed || 0) + (newRecord.total_billed_amount || 0);
      localStorage.setItem('vetgo_clinics', JSON.stringify(clinics));
    }

    return newRecord;
  },

  async updateAnesthesia(id: number, updates: Partial<AnesthesiaRecord>): Promise<AnesthesiaRecord> {
    const list = await this.getAnesthesias();
    const idx = list.findIndex((a) => a.id === id);
    if (idx === -1) throw new Error('Anestesia não encontrada');
    list[idx] = { ...list[idx], ...updates };
    localStorage.setItem('vetgo_anesthesias', JSON.stringify(list));
    return list[idx];
  },

  async addMonitoringReading(anesthesiaId: number, reading: Omit<MonitoringReading, 'id'>): Promise<MonitoringReading> {
    const list = await this.getAnesthesias();
    const idx = list.findIndex((a) => a.id === anesthesiaId);
    if (idx === -1) throw new Error('Anestesia não encontrada');

    const newReading: MonitoringReading = {
      ...reading,
      id: `m-${Date.now()}`
    };
    list[idx].monitorings.push(newReading);

    // Também cria entrada na timeline se tiver valores vitais registrados
    const timeEvent: AnestheticTimelineEvent = {
      id: `evt-m-${Date.now()}`,
      event_type: 'PARAMETRO',
      real_time: newReading.timestamp,
      elapsed_time: `${String(Math.floor(newReading.elapsed_minutes / 60)).padStart(2, '0')}:${String(
        newReading.elapsed_minutes % 60
      ).padStart(2, '0')}:00`,
      title: `Monitorização aos ${newReading.elapsed_minutes} min`,
      description: `FC: ${newReading.heart_rate_bpm || '-'} bpm | PAS/PAM/PAD: ${newReading.pas_mmhg || '-'}/${
        newReading.pam_mmhg || '-'
      }/${newReading.pad_mmhg || '-'} mmHg | SpO2: ${newReading.spo2_percentage || '-'}% | FR: ${
        newReading.respiratory_rate_mpm || '-'
      } mpm | Temp: ${newReading.temperature_c || '-'}°C`
    };
    list[idx].timeline_events.push(timeEvent);

    localStorage.setItem('vetgo_anesthesias', JSON.stringify(list));
    return newReading;
  },

  async addTimelineEvent(
    anesthesiaId: number,
    eventData: Omit<AnestheticTimelineEvent, 'id'>
  ): Promise<AnestheticTimelineEvent> {
    const list = await this.getAnesthesias();
    const idx = list.findIndex((a) => a.id === anesthesiaId);
    if (idx === -1) throw new Error('Anestesia não encontrada');

    const newEvent: AnestheticTimelineEvent = {
      ...eventData,
      id: `evt-${Date.now()}`
    };
    list[idx].timeline_events.push(newEvent);
    localStorage.setItem('vetgo_anesthesias', JSON.stringify(list));
    return newEvent;
  },

  async finishAnesthesia(
    anesthesiaId: number,
    recoveryData: PostAnesthesiaRecovery,
    timesData: Partial<ProcedureTimes>
  ): Promise<AnesthesiaRecord> {
    const list = await this.getAnesthesias();
    const idx = list.findIndex((a) => a.id === anesthesiaId);
    if (idx === -1) throw new Error('Anestesia não encontrada');

    list[idx].status = 'FINALIZADA';
    list[idx].recovery = recoveryData;
    list[idx].times = { ...list[idx].times, ...timesData };

    // Registra evento de alta da recuperação
    list[idx].timeline_events.push({
      id: `evt-fin-${Date.now()}`,
      event_type: 'EVENTO',
      real_time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      elapsed_time: 'Fim',
      title: 'Alta da Recuperação Pós-Anestésica',
      description: `Paciente entregue com consciência: ${recoveryData.consciousness_level}. Qualidade da recuperação: ${recoveryData.recovery_quality}.`
    });

    localStorage.setItem('vetgo_anesthesias', JSON.stringify(list));

    // Gera automaticamente o registro no financeiro (vinculado à clínica e ao atendimento)
    const financialEntries = await this.getFinancialEntries();
    financialEntries.unshift({
      id: Date.now(),
      owner_id: 2,
      entry_type: 'RECEITA',
      category: 'Procedimento Anestésico',
      description: `Ficha ${list[idx].code} - ${list[idx].procedure_name} (${list[idx].patient_name} / ${list[idx].clinic_name})`,
      amount: list[idx].total_billed_amount || 480.0,
      payment_method: 'FATURAMENTO_CLINICA',
      status: 'PENDENTE',
      date: new Date().toISOString().split('T')[0],
      tutor_id: list[idx].tutor_id,
      tutor_name: list[idx].tutor_name,
      patient_id: list[idx].patient_id,
      patient_name: list[idx].patient_name,
      clinic_id: list[idx].clinic_id,
      clinic_name: list[idx].clinic_name,
      anesthesia_id: list[idx].id,
      receipt_number: `FAT-${list[idx].code}`,
      created_at: new Date().toISOString()
    });
    localStorage.setItem('vetgo_financial', JSON.stringify(financialEntries));

    return list[idx];
  },

  // -----------------------------------------------------------------
  // REQUISITOS 18, 19 e 20: ESTOQUE, LOTES, TRANSFERÊNCIA & CONSUMO
  // -----------------------------------------------------------------
  async getInventory(): Promise<InventoryItem[]> {
    const local = localStorage.getItem('vetgo_inventory');
    if (local) return JSON.parse(local);

    const defaultInventory: InventoryItem[] = [
      {
        id: 1,
        owner_id: 2,
        name: 'Zoletil 50 (Tiletamina + Zolazepam)',
        category: 'Medicamento',
        active_ingredient: 'Cloridrato de Tiletamina + Zolazepam',
        presentation: 'Frasco ampola 5ml',
        concentration: '50mg/ml',
        presentation_type: 'LIQUIDO_ML',
        batch_number: 'ZT-9941A',
        expiration_date: '2027-08-30',
        quantity_in_kit: 2, // Na maleta volante
        quantity_in_stock: 4, // No estoque central
        unit: 'Frasco',
        min_alert_quantity: 2,
        cost_price: 185.0,
        sale_price: 240.0,
        supplier_name: 'Virbac Distribuidora',
        is_controlled_substance: true,
        notes: 'Medicamento de controle especial MAPA. Manter refrigerado.',
        batches: [
          {
            id: 'b-1',
            item_id: 1,
            batch_number: 'ZT-9941A',
            expiration_date: '2027-08-30',
            quantity_purchased: 6,
            quantity_remaining: 6,
            unit_cost: 185.0,
            supplier_name: 'Virbac Distribuidora',
            purchase_date: '2026-08-10',
            target_location: 'ESTOQUE_CENTRAL',
            created_at: new Date().toISOString()
          }
        ],
        created_at: new Date().toISOString()
      },
      {
        id: 2,
        owner_id: 2,
        name: 'Propofol 1% Injetável',
        category: 'Medicamento',
        active_ingredient: 'Propofol',
        presentation: 'Frasco ampola 20ml',
        concentration: '10mg/ml',
        presentation_type: 'LIQUIDO_ML',
        batch_number: 'PP-2026-B4',
        expiration_date: '2027-05-18',
        quantity_in_kit: 3,
        quantity_in_stock: 8,
        unit: 'Frasco',
        min_alert_quantity: 3,
        cost_price: 28.0,
        sale_price: 65.0,
        supplier_name: 'Fresenius Kabi',
        is_controlled_substance: true,
        notes: 'Uso intravenoso para indução anestésica.',
        batches: [
          {
            id: 'b-2',
            item_id: 2,
            batch_number: 'PP-2026-B4',
            expiration_date: '2027-05-18',
            quantity_purchased: 12,
            quantity_remaining: 11,
            unit_cost: 28.0,
            supplier_name: 'Fresenius Kabi',
            purchase_date: '2026-07-20',
            target_location: 'ESTOQUE_CENTRAL',
            created_at: new Date().toISOString()
          }
        ],
        created_at: new Date().toISOString()
      },
      {
        id: 3,
        owner_id: 2,
        name: 'Apoquel (Oclacitinib) 16mg Comprimidos',
        category: 'Medicamento',
        active_ingredient: 'Oclacitinib',
        presentation: 'Cartela com 20 comprimidos',
        concentration: '16mg',
        presentation_type: 'COMPRIMIDO',
        batch_number: 'APQ-8820',
        expiration_date: '2027-10-30',
        quantity_in_kit: 10, // 10 comprimidos físicos na maleta
        quantity_in_stock: 30, // 30 comprimidos físicos na central
        unit: 'Comprimido',
        min_alert_quantity: 8,
        cost_price: 9.5,
        sale_price: 18.0,
        supplier_name: 'Zoetis Brasil',
        is_controlled_substance: false,
        notes: 'Comprimido sulcado e fracionável. Frações (ex: 1/2 comp) geram baixa de 1 comprimido físico no estoque.',
        batches: [
          {
            id: 'b-3',
            item_id: 3,
            batch_number: 'APQ-8820',
            expiration_date: '2027-10-30',
            quantity_purchased: 40,
            quantity_remaining: 40,
            unit_cost: 9.5,
            supplier_name: 'Zoetis Brasil',
            purchase_date: '2026-08-01',
            target_location: 'ESTOQUE_CENTRAL',
            created_at: new Date().toISOString()
          }
        ],
        created_at: new Date().toISOString()
      },
      {
        id: 4,
        owner_id: 2,
        name: 'Meloxicam Injetável 0,2%',
        category: 'Medicamento',
        active_ingredient: 'Meloxicam',
        presentation: 'Frasco 20ml',
        concentration: '2mg/ml',
        presentation_type: 'LIQUIDO_ML',
        batch_number: 'MX-4401',
        expiration_date: '2027-11-20',
        quantity_in_kit: 2,
        quantity_in_stock: 4,
        unit: 'Frasco',
        min_alert_quantity: 2,
        cost_price: 42.0,
        sale_price: 75.0,
        supplier_name: 'Ourofino Pet',
        is_controlled_substance: false,
        created_at: new Date().toISOString()
      },
      {
        id: 5,
        owner_id: 2,
        name: 'Tubos Traqueais com Cuff (Kits variados nº 5 a 10)',
        category: 'Material Cirúrgico',
        presentation: 'Caixa com 10 unidades esterilizadas',
        presentation_type: 'UNIDADE',
        quantity_in_kit: 4,
        quantity_in_stock: 12,
        unit: 'Unidade',
        min_alert_quantity: 3,
        cost_price: 16.0,
        supplier_name: 'Cirúrgica Fernandes',
        is_controlled_substance: false,
        created_at: new Date().toISOString()
      }
    ];
    localStorage.setItem('vetgo_inventory', JSON.stringify(defaultInventory));
    return defaultInventory;
  },

  // Requisito 18: Transferência entre estoque central e maleta (NÃO É CONSUMO)
  async transferStock(
    itemId: number,
    from: StockLocation,
    to: StockLocation,
    quantity: number
  ): Promise<InventoryItem> {
    const list = await this.getInventory();
    const idx = list.findIndex((i) => i.id === itemId);
    if (idx === -1) throw new Error('Item de estoque não encontrado');

    const item = list[idx];
    if (from === 'ESTOQUE_CENTRAL' && to === 'MALETA_VOLANTE') {
      if (item.quantity_in_stock < quantity) {
        throw new Error(`Saldo insuficiente no Estoque Central (${item.quantity_in_stock} disponíveis).`);
      }
      item.quantity_in_stock -= quantity;
      item.quantity_in_kit += quantity;
    } else if (from === 'MALETA_VOLANTE' && to === 'ESTOQUE_CENTRAL') {
      if (item.quantity_in_kit < quantity) {
        throw new Error(`Saldo insuficiente na Maleta Volante (${item.quantity_in_kit} disponíveis).`);
      }
      item.quantity_in_kit -= quantity;
      item.quantity_in_stock += quantity;
    }

    localStorage.setItem('vetgo_inventory', JSON.stringify(list));
    return item;
  },

  // Requisito 20: Consumo durante atendimento
  // Medicamentos líquidos usam consumo proporcional por ml
  // Comprimidos: fração clínica dá baixa em comprimidos físicos inteiros (Math.ceil)
  async consumeStock(
    itemId: number,
    location: StockLocation,
    clinicalQuantityUsed: number,
    isTabletFraction: boolean = false
  ): Promise<{
    item: InventoryItem;
    administeredDose: number;
    consumedPhysicalStock: number;
    billedQuantity: number;
  }> {
    const list = await this.getInventory();
    const idx = list.findIndex((i) => i.id === itemId);
    if (idx === -1) throw new Error('Item de estoque não encontrado');

    const item = list[idx];
    const physicalDeduction = isTabletFraction ? Math.ceil(clinicalQuantityUsed) : clinicalQuantityUsed;

    if (location === 'MALETA_VOLANTE') {
      item.quantity_in_kit = Math.max(0, item.quantity_in_kit - physicalDeduction);
    } else {
      item.quantity_in_stock = Math.max(0, item.quantity_in_stock - physicalDeduction);
    }

    localStorage.setItem('vetgo_inventory', JSON.stringify(list));
    return {
      item,
      administeredDose: clinicalQuantityUsed,
      consumedPhysicalStock: physicalDeduction,
      billedQuantity: clinicalQuantityUsed
    };
  },

  async addInventoryBatch(itemId: number, batchData: Omit<InventoryBatchEntry, 'id' | 'item_id' | 'created_at'>): Promise<InventoryItem> {
    const list = await this.getInventory();
    const idx = list.findIndex((i) => i.id === itemId);
    if (idx === -1) throw new Error('Item não encontrado');

    const item = list[idx];
    if (!item.batches) item.batches = [];

    const newBatch: InventoryBatchEntry = {
      ...batchData,
      id: `batch-${Date.now()}`,
      item_id: itemId,
      created_at: new Date().toISOString()
    };
    item.batches.unshift(newBatch);

    if (batchData.target_location === 'MALETA_VOLANTE') {
      item.quantity_in_kit += batchData.quantity_purchased;
    } else {
      item.quantity_in_stock += batchData.quantity_purchased;
    }

    item.batch_number = batchData.batch_number;
    item.expiration_date = batchData.expiration_date;
    item.cost_price = batchData.unit_cost;

    localStorage.setItem('vetgo_inventory', JSON.stringify(list));
    return item;
  },

  async createInventoryItem(data: Partial<InventoryItem>): Promise<InventoryItem> {
    const list = await this.getInventory();
    const newItem: InventoryItem = {
      id: Date.now(),
      owner_id: 2,
      name: data.name || '',
      category: data.category || 'Medicamento',
      active_ingredient: data.active_ingredient,
      presentation: data.presentation,
      concentration: data.concentration,
      presentation_type: data.presentation_type || 'LIQUIDO_ML',
      batch_number: data.batch_number,
      expiration_date: data.expiration_date,
      quantity_in_kit: data.quantity_in_kit || 0,
      quantity_in_stock: data.quantity_in_stock || 0,
      unit: data.unit || 'Unidade',
      min_alert_quantity: data.min_alert_quantity || 2,
      cost_price: data.cost_price || 0,
      sale_price: data.sale_price,
      supplier_name: data.supplier_name,
      is_controlled_substance: !!data.is_controlled_substance,
      notes: data.notes,
      batches: data.batches || [],
      created_at: new Date().toISOString()
    };
    list.unshift(newItem);
    localStorage.setItem('vetgo_inventory', JSON.stringify(list));
    return newItem;
  },

  async updateInventoryItem(id: number, updates: Partial<InventoryItem>): Promise<void> {
    const list = await this.getInventory();
    const idx = list.findIndex((i) => i.id === id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...updates };
      localStorage.setItem('vetgo_inventory', JSON.stringify(list));
    }
  },

  // -----------------------------------------------------------------
  // CONSULTAS, AGENDAMENTOS, FINANCEIRO & DOCUMENTOS
  // -----------------------------------------------------------------
  async getAppointments(): Promise<Appointment[]> {
    return this.request<Appointment[]>('/appointments');
  },

  async createAppointment(data: Partial<Appointment>): Promise<Appointment> {
    return this.request<Appointment>('/appointments', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateAppointment(id: number, updates: Partial<Appointment>): Promise<Appointment> {
    return this.request<Appointment>(`/appointments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  async deleteAppointment(id: number): Promise<void> {
    await this.request<{ message: string }>(`/appointments/${id}`, {
      method: 'DELETE'
    });
  },

  async getConsultations(patientId?: number): Promise<ClinicalConsultation[]> {
    const local = localStorage.getItem('vetgo_consultations');
    let list: ClinicalConsultation[] = [];
    if (local) {
      list = JSON.parse(local);
    } else {
      list = [
        {
          id: 1,
          owner_id: 2,
          patient_id: 1,
          patient_name: 'Thor',
          tutor_id: 1,
          tutor_name: 'Mariana Silveira Ramos',
          date_time: new Date().toISOString(),
          chief_complaint: 'Avaliação pré-anestésica para ressecção de mastocitoma',
          anamnesis: 'Animal ativo, histórico de alergia cutânea, sem outras comorbidades.',
          vital_signs: {
            temperature_c: 38.4,
            heart_rate_bpm: 96,
            respiratory_rate_mpm: 22,
            capillary_refill_time_sec: 2,
            blood_pressure: '125/85',
            body_condition_score: 5,
            hydration_status: 'Normal (Adequada)',
            mucous_membranes: 'Normocoradas'
          },
          physical_examination: 'Nódulo cutâneo único em dorso lombar (2.5 cm). Ausculta cardiopulmonar fisiológica.',
          diagnosis_suspicions: 'Mastocitoma cutâneo grau II',
          prognosis: 'Favorável',
          conduct_plan: 'Cirurgia agendada no Hosp. Jardins sob anestesia geral balanceada com Dr. Roberto.',
          prescriptions: [],
          vaccines: [],
          is_volante: true,
          status: 'FINALIZADO',
          created_at: new Date().toISOString()
        }
      ];
      localStorage.setItem('vetgo_consultations', JSON.stringify(list));
    }
    if (patientId) {
      return list.filter((c) => c.patient_id === patientId);
    }
    return list;
  },

  async createConsultation(data: Partial<ClinicalConsultation>): Promise<ClinicalConsultation> {
    const list = await this.getConsultations();
    const newConsultation: ClinicalConsultation = {
      id: Date.now(),
      owner_id: 2,
      patient_id: data.patient_id || 1,
      patient_name: data.patient_name || 'Paciente',
      tutor_id: data.tutor_id || 1,
      tutor_name: data.tutor_name || 'Tutor',
      appointment_id: data.appointment_id,
      clinic_id: data.clinic_id,
      clinic_name: data.clinic_name,
      date_time: data.date_time || new Date().toISOString(),
      chief_complaint: data.chief_complaint || '',
      anamnesis: data.anamnesis || '',
      vital_signs: data.vital_signs || {},
      physical_examination: data.physical_examination || '',
      diagnosis_suspicions: data.diagnosis_suspicions || '',
      prognosis: data.prognosis || 'Favorável',
      conduct_plan: data.conduct_plan || '',
      prescriptions: data.prescriptions || [],
      vaccines: data.vaccines || [],
      is_volante: true,
      location_address: data.location_address,
      status: 'FINALIZADO',
      created_at: new Date().toISOString()
    };
    list.unshift(newConsultation);
    localStorage.setItem('vetgo_consultations', JSON.stringify(list));
    return newConsultation;
  },

  async getFinancialEntries(): Promise<FinancialEntry[]> {
    const local = localStorage.getItem('vetgo_financial');
    if (local) return JSON.parse(local);

    const defaultEntries: FinancialEntry[] = [
      {
        id: 1,
        owner_id: 2,
        entry_type: 'RECEITA',
        category: 'Procedimento Anestésico',
        description: 'Anestesia Mastocitoma - Thor (Hosp. Jardins / Dr. Roberto)',
        amount: 550.0,
        payment_method: 'PIX',
        status: 'PAGO',
        date: new Date().toISOString().split('T')[0],
        tutor_id: 1,
        tutor_name: 'Mariana Silveira Ramos',
        patient_id: 1,
        patient_name: 'Thor',
        clinic_id: 1,
        clinic_name: 'Hospital Veterinário Jardins 24h',
        receipt_number: 'REC-2026-001',
        created_at: new Date().toISOString()
      },
      {
        id: 2,
        owner_id: 2,
        entry_type: 'RECEITA',
        category: 'Procedimento Anestésico',
        description: 'Faturamento periódico quinzenal - VetCare Vila Mariana',
        amount: 1850.0,
        payment_method: 'FATURAMENTO_CLINICA',
        status: 'PENDENTE',
        date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 3600000 * 24 * 7).toISOString().split('T')[0],
        clinic_id: 3,
        clinic_name: 'Centro Cirúrgico VetCare Vila Mariana',
        receipt_number: 'FAT-CL03-0926',
        created_at: new Date().toISOString()
      },
      {
        id: 3,
        owner_id: 2,
        entry_type: 'DESPESA',
        category: 'Reposição de Anestésicos e Fármacos',
        description: 'Compra de Propofol 1% e Zoletil - Virbac & Fresenius',
        amount: 480.0,
        payment_method: 'PIX',
        status: 'PAGO',
        date: new Date().toISOString().split('T')[0],
        notes: 'Entrada de lote registrada no estoque.',
        created_at: new Date().toISOString()
      }
    ];
    localStorage.setItem('vetgo_financial', JSON.stringify(defaultEntries));
    return defaultEntries;
  },

  async createFinancialEntry(data: Partial<FinancialEntry>): Promise<FinancialEntry> {
    const entries = await this.getFinancialEntries();
    const newEntry: FinancialEntry = {
      id: Date.now(),
      owner_id: 2,
      entry_type: data.entry_type || 'RECEITA',
      category: data.category || 'Atendimento',
      description: data.description || '',
      amount: data.amount || 0,
      payment_method: data.payment_method || 'PIX',
      status: data.status || 'PAGO',
      date: data.date || new Date().toISOString().split('T')[0],
      due_date: data.due_date,
      tutor_id: data.tutor_id,
      tutor_name: data.tutor_name,
      patient_id: data.patient_id,
      patient_name: data.patient_name,
      clinic_id: data.clinic_id,
      clinic_name: data.clinic_name,
      anesthesia_id: data.anesthesia_id,
      notes: data.notes,
      receipt_number: `REC-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      created_at: new Date().toISOString()
    };
    entries.unshift(newEntry);
    localStorage.setItem('vetgo_financial', JSON.stringify(entries));
    return newEntry;
  },

  async deleteFinancialEntry(id: number): Promise<boolean> {
    const entries = await this.getFinancialEntries();
    const filtered = entries.filter((e) => e.id !== id);
    localStorage.setItem('vetgo_financial', JSON.stringify(filtered));
    return true;
  },

  async getDocuments(): Promise<DocumentRecord[]> {
    const local = localStorage.getItem('vetgo_documents');
    if (local) return JSON.parse(local);

    const defaultDocs: DocumentRecord[] = [
      {
        id: 1,
        owner_id: 2,
        doc_type: 'FICHA_ANESTESICA',
        title: 'Ficha Anestésica - Thor (AN-2026-001)',
        patient_id: 1,
        patient_name: 'Thor',
        tutor_id: 1,
        tutor_name: 'Mariana Silveira Ramos',
        clinic_id: 1,
        clinic_name: 'Hospital Veterinário Jardins 24h',
        content: 'Ficha Anestésica Completa gerada automaticamente no sistema.',
        created_at: new Date().toISOString()
      }
    ];
    localStorage.setItem('vetgo_documents', JSON.stringify(defaultDocs));
    return defaultDocs;
  },

  async createDocument(data: Partial<DocumentRecord>): Promise<DocumentRecord> {
    const list = await this.getDocuments();
    const newDoc: DocumentRecord = {
      id: Date.now(),
      owner_id: 2,
      doc_type: data.doc_type || 'FICHA_ANESTESICA',
      title: data.title || 'Documento Veterinário',
      patient_id: data.patient_id,
      patient_name: data.patient_name,
      tutor_id: data.tutor_id,
      tutor_name: data.tutor_name,
      clinic_id: data.clinic_id,
      clinic_name: data.clinic_name,
      content: data.content || '',
      metadata_json: data.metadata_json,
      created_at: new Date().toISOString()
    };
    list.unshift(newDoc);
    localStorage.setItem('vetgo_documents', JSON.stringify(list));
    return newDoc;
  },

  // -----------------------------------------------------------------
  // REQUISITO 25: ADMINISTRAÇÃO PLATAFORMA VETGO (Delegado para adminService)
  // -----------------------------------------------------------------
  async getAdminStats(): Promise<AdminStats> {
    return adminService.getAdminStats();
  },

  async getAdminUsers(): Promise<AdminUser[]> {
    return adminService.getAdminUsers();
  },

  async updateAdminSubscription(
    userId: number,
    updates: {
      plan?: 'FREE' | 'PRO';
      is_lifetime?: boolean;
      subscription_status?: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
      admin_notes?: string;
    }
  ): Promise<void> {
    return adminService.updateAdminSubscription(userId, updates);
  },

  async toggleUserStatus(userId: number, reason: string): Promise<boolean> {
    return adminService.toggleUserStatus(userId, reason);
  },

  async getPlatformPlans(): Promise<PlatformPlan[]> {
    return adminService.getPlatformPlans();
  },

  async updatePlatformPlan(id: string, updates: Partial<PlatformPlan>): Promise<PlatformPlan> {
    return adminService.updatePlatformPlan(id, updates);
  },

  async getGlobalAnnouncements(): Promise<GlobalAnnouncement[]> {
    return adminService.getGlobalAnnouncements();
  },

  async createGlobalAnnouncement(data: Partial<GlobalAnnouncement>): Promise<GlobalAnnouncement> {
    return adminService.createGlobalAnnouncement(data);
  },

  async deleteGlobalAnnouncement(id: number): Promise<boolean> {
    return adminService.deleteGlobalAnnouncement(id);
  },

  async getAdminAuditLogs(): Promise<AdminAuditLog[]> {
    return adminService.getAdminAuditLogs();
  },

  async updateUserProfile(data: Partial<User>): Promise<User> {
    return this.updateProfile(data);
  }
};
