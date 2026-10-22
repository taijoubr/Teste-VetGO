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
  DocumentRecord,
  DocumentTemplate,
  SystemDocumentTemplate,
  ClinicalServiceItem,
  Supplier,
  SupplierOrder,
  PatientExam
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
    const legacyKeys = [
      'vetgo_financial',
      'vetgo_clinics',
      'vetgo_surgeons',
      'vetgo_anesthesias',
      'vetgo_inventory',
      'vetgo_consultations',
      'vetgo_documents',
      'vetgo_services',
    ];
    legacyKeys.forEach((k) => localStorage.removeItem(k));
  },

  // Central Request Handler with Bearer token, error handling, session management, and Offline Support
  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      ...(options.headers as Record<string, string>),
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const isGet = !options.method || options.method === 'GET';
    let url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    if (isGet) {
      const sep = url.includes('?') ? '&' : '?';
      url = `${url}${sep}_t=${Date.now()}`;
    }
    const cachedUser = this.getCachedUser();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);
    const signal = options.signal || controller.signal;

    let isServerResponseError = false;

    try {
      const res = await fetch(url, {
        ...options,
        cache: 'no-store',
        headers,
        signal,
      });
      clearTimeout(timeoutId);

      if (res.status === 401) {
        this.removeToken();
        throw new Error('Sessão expirada. Faça login novamente.');
      }

      if (!res.ok) {
        isServerResponseError = true;
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

      if (data && (data as any).is_offline) {
        throw new Error('Modo Offline: Dados indisponíveis no momento.');
      }

      // Salva resposta GET no cache isolado do veterinário logado
      if (isGet && cachedUser?.id) {
        offlineStorage.saveData(cachedUser.id, endpoint, data);
      }
 else if (!isGet) {
        // Notifica o Service Worker para limpar o cache da API em mutações
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_API_CACHE' });
        }
        if (cachedUser?.id) {
          // Invalida cache após mutações bem-sucedidas para garantir dados frescos
          if (endpoint.includes('tutor')) {
            offlineStorage.removeData(cachedUser.id, 'tutor');
            offlineStorage.removeData(cachedUser.id, 'dashboard');
          } else if (endpoint.includes('patient')) {
            offlineStorage.removeData(cachedUser.id, 'patient');
            offlineStorage.removeData(cachedUser.id, 'dashboard');
          } else if (endpoint.includes('appointment')) {
            offlineStorage.removeData(cachedUser.id, 'appointment');
            offlineStorage.removeData(cachedUser.id, 'dashboard');
          } else if (endpoint.includes('consultation')) {
            offlineStorage.removeData(cachedUser.id, 'consultation');
            offlineStorage.removeData(cachedUser.id, 'dashboard');
          }
        }
      }

      return data;
    } catch (err: any) {
      clearTimeout(timeoutId);

      // Se o servidor respondeu com status de erro (4xx/5xx): NUNCA simule sucesso offline!
      if (isServerResponseError) {
        throw err;
      }

      // Se estiver offline de fato (sem conexão com a internet) e for GET:
      if (cachedUser?.id && isGet && (!navigator.onLine || err.message?.includes('Failed to fetch'))) {
        const cachedData = offlineStorage.getData<T>(cachedUser.id, endpoint);
        if (cachedData !== null) {
          return cachedData;
        }
      }

      // Se estiver verdadeiramente sem sinal (offline real) e for mutação:
      if (cachedUser?.id && !isGet && !navigator.onLine && (options.method === 'POST' || options.method === 'PUT')) {
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

        // Retorno otimista simulado para que a interface não trave APENAS quando sem internet
        return {
          id: Date.now(),
          ...bodyObj,
          _offline_saved: true,
        } as unknown as T;
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
    if (savedUserStr) {
      try {
        const parsed = JSON.parse(savedUserStr);
        if (parsed.id !== data.user.id) {
          const legacyKeys = [
            'vetgo_financial',
            'vetgo_clinics',
            'vetgo_surgeons',
            'vetgo_anesthesias',
            'vetgo_inventory',
            'vetgo_consultations',
            'vetgo_documents',
            'vetgo_services',
          ];
          legacyKeys.forEach((k) => localStorage.removeItem(k));
        }
      } catch {}
    }
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

  async loginWithGoogle(payload: {
    email: string;
    name?: string;
    first_name?: string;
    last_name?: string;
    picture?: string;
    credential?: string;
    crmv?: string;
    crmv_uf?: string;
    phone?: string;
    whatsapp?: string;
    clinic_name?: string;
  }): Promise<{ user: User; token: string; is_new?: boolean }> {
    const res = await fetch(`${API_BASE_URL}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      let errMsg = 'Falha ao autenticar com a conta Google.';
      try {
        const errJson = await res.json();
        if (errJson?.detail) errMsg = errJson.detail;
      } catch {}
      throw new Error(errMsg);
    }
    const data = await res.json();
    this.setToken(data.access_token);
    const user: User = {
      ...data.user,
      specialty_anesthesia_enabled: data.user.specialty_anesthesia_enabled !== false
    };
    localStorage.setItem('vetgo_current_user', JSON.stringify(user));
    return { user, token: data.access_token, is_new: data.is_new };
  },

  async register(data: any): Promise<{ user: User; token: string; email_sent?: boolean; dev_code?: string }> {
    // Limpa caches e estados anteriores para garantir isolamento absoluto da nova conta
    const legacyKeys = [
      'vetgo_financial',
      'vetgo_clinics',
      'vetgo_surgeons',
      'vetgo_anesthesias',
      'vetgo_inventory',
      'vetgo_consultations',
      'vetgo_documents',
      'vetgo_services',
      'vetgo_tutors',
      'vetgo_patients',
      'vetgo_appointments'
    ];
    legacyKeys.forEach((k) => localStorage.removeItem(k));
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('vetgo_financial_u') || key.startsWith('vetgo_inventory_u') || key.startsWith('vetgo_offline_') || key.startsWith('offline_queue_')) {
        localStorage.removeItem(key);
      }
    });

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

  async forgotPassword(email: string): Promise<{ message: string; email_sent?: boolean }> {
    const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      let errMsg = 'Erro ao solicitar recuperação de senha.';
      try {
        const errJson = await res.json();
        if (errJson?.detail) errMsg = errJson.detail;
      } catch {}
      throw new Error(errMsg);
    }
    return res.json();
  },

  async resetPassword(email: string, code: string, newPassword: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code, new_password: newPassword }),
    });
    if (!res.ok) {
      let errMsg = 'Erro ao redefinir senha.';
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

  async sendAppointmentTestPushNotification(): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>('/notifications/send-appointment-test', {
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
    } catch (err: any) {
      // Se for erro explícito de 401/Sessão expirada, remove credenciais
      if (err?.message?.includes('Sessão expirada') || err?.message?.includes('401')) {
        this.removeToken();
        return null;
      }
      // Se for falha de rede/offline, retorna o usuário em cache para permitir uso sem internet
      const cached = localStorage.getItem('vetgo_current_user');
      if (cached) {
        try {
          return JSON.parse(cached) as User;
        } catch {}
      }
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

  // Dashboard Stats & Quotas (real backend queries with resilient fallback)
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      const res = await this.request<DashboardStats>('/dashboard/stats');
      if (res && res.plan_usage) return res;
    } catch (e) {
      console.warn('Endpoint /dashboard/stats returned error or unreachable. Generating resilient dashboard stats:', e);
    }

    try {
      const [tutors, patients, appointments, financial] = await Promise.all([
        this.getTutors().catch(() => []),
        this.getPatients().catch(() => []),
        this.getAppointments().catch(() => []),
        this.getFinancialEntries().catch(() => []),
      ]);

      const todayStr = new Date().toISOString().split('T')[0];
      const todayAppts = appointments.filter((a) => a.date_time?.startsWith(todayStr));
      
      const receitasMes = financial
        .filter((f) => f.entry_type === 'RECEITA' && f.status === 'PAGO')
        .reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
      const despesasMes = financial
        .filter((f) => f.entry_type === 'DESPESA' && f.status === 'PAGO')
        .reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
      const pendentes = financial.filter((f) => f.status === 'PENDENTE');
      const pendentesValor = pendentes.reduce((sum, f) => sum + (Number(f.amount) || 0), 0);

      return {
        plan_usage: {
          plan: 'FREE',
          is_lifetime: false,
          is_expired: false,
          tutors_count: tutors.length,
          tutors_limit: 30,
          tutors_limit_reached: tutors.length >= 30,
          patients_count: patients.length,
          patients_limit: 50,
          patients_limit_reached: patients.length >= 50,
        },
        today_appointments_count: todayAppts.length,
        upcoming_appointments_count: appointments.length,
        total_patients_count: patients.length,
        total_tutors_count: tutors.length,
        total_clinics_count: 0,
        total_anesthesias_count: 0,
        financial_summary: {
          total_receitas_mes: receitasMes,
          total_despesas_mes: despesasMes,
          saldo_mes: receitasMes - despesasMes,
          contas_pendentes_count: pendentes.length,
          contas_pendentes_valor: pendentesValor,
        },
        today_appointments: todayAppts,
        recent_patients: patients.slice(0, 5),
        recent_tutors: tutors.slice(0, 5),
        low_stock_count: 0,
      };
    } catch {
      return {
        plan_usage: {
          plan: 'FREE',
          is_lifetime: false,
          is_expired: false,
          tutors_count: 0,
          tutors_limit: 30,
          tutors_limit_reached: false,
          patients_count: 0,
          patients_limit: 50,
          patients_limit_reached: false,
        },
        today_appointments_count: 0,
        upcoming_appointments_count: 0,
        total_patients_count: 0,
        total_tutors_count: 0,
        total_clinics_count: 0,
        total_anesthesias_count: 0,
        financial_summary: {
          total_receitas_mes: 0,
          total_despesas_mes: 0,
          saldo_mes: 0,
          contas_pendentes_count: 0,
          contas_pendentes_valor: 0,
        },
        today_appointments: [],
        recent_patients: [],
        recent_tutors: [],
        low_stock_count: 0,
      };
    }
  },

  // Reset test data endpoint
  async resetTestData(): Promise<{ success: boolean; message: string }> {
    try {
      await fetch(`${API_BASE_URL}/reset-test-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }).catch(() => null);
    } catch {}

    const cached = this.getCachedUser();
    if (cached?.id) {
      offlineStorage.clearUserData(cached.id);
    }

    localStorage.removeItem('vetgo_consultations');
    localStorage.removeItem('vetgo_financial');
    localStorage.removeItem('vetgo_documents');
    localStorage.removeItem('vetgo_inventory');
    localStorage.removeItem('vetgo_tutors');
    localStorage.removeItem('vetgo_patients');
    localStorage.removeItem('vetgo_appointments');

    // Remove chaves de cache offline
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('vetgo_offline_') || key.startsWith('offline_queue_')) {
        localStorage.removeItem(key);
      }
    });

    return {
      success: true,
      message: 'Dados de teste restaurados com sucesso!'
    };
  },

  async getPlanUsage(): Promise<PlanUsage> {
    return this.request<PlanUsage>('/dashboard/plan-usage');
  },

  // Helper local storage keys
  getTutorsStorageKey(): string {
    const user = this.getCachedUser();
    return user?.id ? `vetgo_tutors_u${user.id}` : 'vetgo_tutors';
  },

  getPatientsStorageKey(): string {
    const user = this.getCachedUser();
    return user?.id ? `vetgo_patients_u${user.id}` : 'vetgo_patients';
  },

  getAppointmentsStorageKey(): string {
    const user = this.getCachedUser();
    return user?.id ? `vetgo_appointments_u${user.id}` : 'vetgo_appointments';
  },

  // Tutors with reliable server sync, tombstone tracking, and local-first persistence
  async getTutors(): Promise<Tutor[]> {
    const key = this.getTutorsStorageKey();
    const deletedKey = `${key}_deleted`;

    let deletedIds = new Set<number>();
    try {
      const delRaw = localStorage.getItem(deletedKey);
      if (delRaw) {
        deletedIds = new Set(JSON.parse(delRaw).map(Number));
      }
    } catch {}

    let localList: Tutor[] = [];
    const local = localStorage.getItem(key);
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) {
          localList = parsed.filter((t) => t && t.id && !deletedIds.has(Number(t.id)));
        }
      } catch {}
    }

    try {
      const serverList = await this.request<Tutor[]>('/tutors');
      if (Array.isArray(serverList)) {
        const validServerList = serverList.filter((t) => t && t.id && !deletedIds.has(Number(t.id)));
        const map = new Map<number, Tutor>();
        // 1. Inicia com a lista local (mantém cadastros recentes locais)
        for (const loc of localList) {
          if (loc && loc.id) map.set(Number(loc.id), loc);
        }
        // 2. Mescla itens do servidor preservando contagens e campos atualizados
        for (const srv of validServerList) {
          const srvId = Number(srv.id);
          const existing = map.get(srvId);
          if (existing) {
            map.set(srvId, { ...existing, ...srv });
          } else {
            map.set(srvId, srv);
          }
        }
        const merged = Array.from(map.values()).sort((a, b) => {
          const tA = new Date(a.created_at || 0).getTime();
          const tB = new Date(b.created_at || 0).getTime();
          return tB - tA;
        });

        localStorage.setItem(key, JSON.stringify(merged));
        return merged;
      }
    } catch (err) {
      console.warn('Erro ao carregar tutores do servidor, usando persistência local:', err);
    }

    return localList;
  },

  async createTutor(tutorData: Partial<Tutor>): Promise<Tutor> {
    const key = this.getTutorsStorageKey();
    const deletedKey = `${key}_deleted`;

    let created: Tutor | null = null;
    try {
      created = await this.request<Tutor>('/tutors', {
        method: 'POST',
        body: JSON.stringify(tutorData)
      });
    } catch (err) {
      console.warn('Requisição de tutor no servidor falhou/offline, persistindo localmente:', err);
    }

    const tutorId = created?.id || Date.now();
    const tutorItem: Tutor = {
      ...tutorData,
      ...(created || {}),
      id: tutorId,
      code: created?.code || `TUT-${String(tutorId).slice(-4).padStart(4, '0')}`,
      created_at: created?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_active: created?.is_active !== false,
      patients_count: 0,
    } as Tutor;

    // Remove da lista de excluídos caso ID tenha sido reciclado
    try {
      const delRaw = localStorage.getItem(deletedKey);
      if (delRaw) {
        const delList = JSON.parse(delRaw).filter((id: any) => Number(id) !== Number(tutorId));
        localStorage.setItem(deletedKey, JSON.stringify(delList));
      }
    } catch {}

    // Salva imediatamente no espelho local antes de qualquer requisição subsequente
    try {
      const local = localStorage.getItem(key);
      const list = local ? JSON.parse(local) : [];
      const nextList = [tutorItem, ...list.filter((t: any) => Number(t.id) !== Number(tutorId))];
      localStorage.setItem(key, JSON.stringify(nextList));
    } catch {}

    return tutorItem;
  },

  async updateTutor(id: number, updates: Partial<Tutor>): Promise<Tutor> {
    const key = this.getTutorsStorageKey();
    let updated: Tutor | null = null;
    try {
      updated = await this.request<Tutor>(`/tutors/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
    } catch (e) {
      console.warn('Erro na requisição PUT tutor, atualizando localmente:', e);
    }

    const mergedTutor: Tutor = {
      ...updates,
      ...(updated || {}),
      id: Number(id),
      updated_at: new Date().toISOString(),
    } as Tutor;

    try {
      const local = localStorage.getItem(key);
      const list = local ? JSON.parse(local) : [];
      const nextList = list.map((t: any) => Number(t.id) === Number(id) ? { ...t, ...mergedTutor } : t);
      localStorage.setItem(key, JSON.stringify(nextList));
    } catch {}

    return mergedTutor;
  },

  async deleteTutor(id: number): Promise<void> {
    const key = this.getTutorsStorageKey();
    const deletedKey = `${key}_deleted`;

    // 1. Registra tombstone de exclusão para nunca ressuscitar
    try {
      const delRaw = localStorage.getItem(deletedKey);
      const delList: number[] = delRaw ? JSON.parse(delRaw) : [];
      if (!delList.includes(Number(id))) {
        delList.push(Number(id));
        localStorage.setItem(deletedKey, JSON.stringify(delList));
      }
    } catch {}

    // 2. Remove imediatamente da lista local
    try {
      const local = localStorage.getItem(key);
      if (local) {
        const list = JSON.parse(local);
        const nextList = list.filter((t: any) => Number(t.id) !== Number(id));
        localStorage.setItem(key, JSON.stringify(nextList));
      }
    } catch {}

    // 3. Notifica o servidor
    try {
      await this.request(`/tutors/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('Erro ao deletar tutor no servidor, mantido removido localmente:', e);
    }
  },

  async toggleTutorStatus(id: number): Promise<{ message: string; is_active: boolean }> {
    const key = this.getTutorsStorageKey();
    const res = await this.request<{ message: string; is_active: boolean }>(`/tutors/${id}/toggle-status`, {
      method: 'PATCH'
    });
    try {
      const local = localStorage.getItem(key);
      if (local) {
        const list = JSON.parse(local);
        const nextList = list.map((t: any) => Number(t.id) === Number(id) ? { ...t, is_active: res.is_active } : t);
        localStorage.setItem(key, JSON.stringify(nextList));
      }
    } catch {}
    return res;
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

  // Patients with reliable server sync, tombstone tracking, and local-first persistence
  async getPatients(tutorId?: number): Promise<Patient[]> {
    const key = this.getPatientsStorageKey();
    const deletedKey = `${key}_deleted`;

    let deletedIds = new Set<number>();
    try {
      const delRaw = localStorage.getItem(deletedKey);
      if (delRaw) {
        deletedIds = new Set(JSON.parse(delRaw).map(Number));
      }
    } catch {}

    let localList: Patient[] = [];
    const local = localStorage.getItem(key);
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) {
          localList = parsed.filter((p) => p && p.id && !deletedIds.has(Number(p.id)));
        }
      } catch {}
    }

    const query = tutorId ? `?tutor_id=${tutorId}` : '';
    try {
      const serverList = await this.request<Patient[]>(`/patients${query}`);
      if (Array.isArray(serverList)) {
        const validServerList = serverList.filter((p) => p && p.id && !deletedIds.has(Number(p.id)));
        const map = new Map<number, Patient>();
        for (const loc of localList) {
          if (loc && loc.id) map.set(Number(loc.id), loc);
        }
        for (const srv of validServerList) {
          const srvId = Number(srv.id);
          const existing = map.get(srvId);
          if (existing) {
            map.set(srvId, { ...existing, ...srv });
          } else {
            map.set(srvId, srv);
          }
        }
        const merged = Array.from(map.values()).sort((a, b) => {
          const tA = new Date(a.created_at || 0).getTime();
          const tB = new Date(b.created_at || 0).getTime();
          return tB - tA;
        });

        localStorage.setItem(key, JSON.stringify(merged));
        if (tutorId) {
          return merged.filter((p) => Number(p.tutor_id) === Number(tutorId));
        }
        return merged;
      }
    } catch (err) {
      console.warn('Erro ao carregar pacientes do servidor, usando persistência local:', err);
    }

    if (tutorId) {
      return localList.filter((p) => Number(p.tutor_id) === Number(tutorId));
    }
    return localList;
  },

  async createPatient(patientData: Partial<Patient>): Promise<Patient> {
    const key = this.getPatientsStorageKey();
    const deletedKey = `${key}_deleted`;

    let created: Patient | null = null;
    try {
      created = await this.request<Patient>('/patients', {
        method: 'POST',
        body: JSON.stringify(patientData)
      });
    } catch (err) {
      console.warn('Requisição de paciente no servidor falhou/offline, persistindo localmente:', err);
    }

    const patientId = created?.id || Date.now();
    const patientItem: Patient = {
      ...patientData,
      ...(created || {}),
      id: patientId,
      created_at: created?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_active: created?.is_active !== false,
    } as Patient;

    // Remove da lista de excluídos caso ID tenha sido reciclado
    try {
      const delRaw = localStorage.getItem(deletedKey);
      if (delRaw) {
        const delList = JSON.parse(delRaw).filter((id: any) => Number(id) !== Number(patientId));
        localStorage.setItem(deletedKey, JSON.stringify(delList));
      }
    } catch {}

    // Salva imediatamente no espelho local antes de qualquer requisição subsequente
    try {
      const local = localStorage.getItem(key);
      const list = local ? JSON.parse(local) : [];
      const nextList = [patientItem, ...list.filter((p: any) => Number(p.id) !== Number(patientId))];
      localStorage.setItem(key, JSON.stringify(nextList));
    } catch {}

    return patientItem;
  },

  async updatePatient(id: number, updates: Partial<Patient>): Promise<Patient> {
    const key = this.getPatientsStorageKey();
    let updated: Patient | null = null;
    try {
      updated = await this.request<Patient>(`/patients/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
    } catch (e) {
      console.warn('Erro na requisição PUT paciente, atualizando localmente:', e);
    }

    const mergedPatient: Patient = {
      ...updates,
      ...(updated || {}),
      id: Number(id),
      updated_at: new Date().toISOString(),
    } as Patient;

    try {
      const local = localStorage.getItem(key);
      const list = local ? JSON.parse(local) : [];
      const nextList = list.map((p: any) => Number(p.id) === Number(id) ? { ...p, ...mergedPatient } : p);
      localStorage.setItem(key, JSON.stringify(nextList));
    } catch {}

    return mergedPatient;
  },

  async deletePatient(id: number): Promise<void> {
    const key = this.getPatientsStorageKey();
    const deletedKey = `${key}_deleted`;

    // 1. Registra tombstone de exclusão para nunca ressuscitar
    try {
      const delRaw = localStorage.getItem(deletedKey);
      const delList: number[] = delRaw ? JSON.parse(delRaw) : [];
      if (!delList.includes(Number(id))) {
        delList.push(Number(id));
        localStorage.setItem(deletedKey, JSON.stringify(delList));
      }
    } catch {}

    // 2. Remove imediatamente da lista local
    try {
      const local = localStorage.getItem(key);
      if (local) {
        const list = JSON.parse(local);
        const nextList = list.filter((p: any) => Number(p.id) !== Number(id));
        localStorage.setItem(key, JSON.stringify(nextList));
      }
    } catch {}

    // 3. Notifica o servidor
    try {
      await this.request(`/patients/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('Erro ao deletar paciente no servidor, mantido removido localmente:', e);
    }
  },

  async togglePatientStatus(id: number): Promise<{ message: string; is_active: boolean }> {
    const key = this.getPatientsStorageKey();
    const res = await this.request<{ message: string; is_active: boolean }>(`/patients/${id}/toggle-status`, {
      method: 'PATCH'
    });
    try {
      const local = localStorage.getItem(key);
      if (local) {
        const list = JSON.parse(local);
        const nextList = list.map((p: any) => Number(p.id) === Number(id) ? { ...p, is_active: res.is_active } : p);
        localStorage.setItem(key, JSON.stringify(nextList));
      }
    } catch {}
    return res;
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

  async getFullMedicalRecord(patientId: number): Promise<any> {
    return this.request<any>(`/patients/${patientId}/medical-record`);
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
    try {
      const serverList = await this.request<Clinic[]>('/clinics');
      if (Array.isArray(serverList)) {
        localStorage.setItem('vetgo_clinics', JSON.stringify(serverList));
        return serverList;
      }
    } catch {
      // Fallback
    }

    const local = localStorage.getItem('vetgo_clinics');
    if (local) return JSON.parse(local);

    return [];
  },

  async getClinic(id: number): Promise<Clinic | null> {
    const clinics = await this.getClinics();
    return clinics.find((c) => c.id === id) || null;
  },

  async createClinic(data: Partial<Clinic>): Promise<Clinic> {
    try {
      const created = await this.request<Clinic>('/clinics', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (created && created.id) {
        const clinics = await this.getClinics();
        const nextList = [created, ...clinics.filter((c) => c.id !== created.id)];
        localStorage.setItem('vetgo_clinics', JSON.stringify(nextList));
        return created;
      }
    } catch (e) {
      console.warn('Erro ao criar clínica no servidor, criando localmente:', e);
    }

    const clinics = await this.getClinics();
    const user = this.getCachedUser();
    const nextNum = clinics.length + 1;
    const code = data.code || `CL-${String(nextNum).padStart(2, '0')}`;
    const newClinic: Clinic = {
      id: Date.now(),
      owner_id: user?.id || 1,
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
      total_billed: 0,
    };
    clinics.unshift(newClinic);
    localStorage.setItem('vetgo_clinics', JSON.stringify(clinics));
    return newClinic;
  },

  async updateClinic(id: number, updates: Partial<Clinic>): Promise<Clinic> {
    try {
      const updated = await this.request<Clinic>(`/clinics/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      if (updated) {
        const clinics = await this.getClinics();
        const nextList = clinics.map((c) => c.id === id ? { ...c, ...updated } : c);
        localStorage.setItem('vetgo_clinics', JSON.stringify(nextList));
        return updated;
      }
    } catch (e) {
      console.warn('Erro ao atualizar clínica no servidor, atualizando localmente:', e);
    }
    const clinics = await this.getClinics();
    const idx = clinics.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error('Clínica não encontrada');
    clinics[idx] = { ...clinics[idx], ...updates };
    localStorage.setItem('vetgo_clinics', JSON.stringify(clinics));
    return clinics[idx];
  },

  async deleteClinic(id: number): Promise<void> {
    try {
      await this.request(`/clinics/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('Erro ao remover clínica no servidor, removendo localmente:', e);
    }
    const clinics = await this.getClinics();
    const filtered = clinics.filter((c) => c.id !== id);
    localStorage.setItem('vetgo_clinics', JSON.stringify(filtered));
  },

  // -----------------------------------------------------------------
  // REQUISITO 2: CIRURGIÕES (identificador PR-xx)
  // -----------------------------------------------------------------
  async getSurgeons(clinicId?: number): Promise<Surgeon[]> {
    try {
      const serverList = await this.request<Surgeon[]>('/surgeons');
      if (Array.isArray(serverList)) {
        localStorage.setItem('vetgo_surgeons', JSON.stringify(serverList));
        if (clinicId) return serverList.filter((s) => (s.clinic_ids && s.clinic_ids.includes(clinicId)) || (s as any).primary_clinic_id === clinicId);
        return serverList;
      }
    } catch {
      // Fallback
    }

    const local = localStorage.getItem('vetgo_surgeons');
    let list: Surgeon[] = [];

    if (local) {
      list = JSON.parse(local);
    }

    if (clinicId) {
      return [...list].sort((a, b) => {
        const aLinked = (a.clinic_ids || []).includes(clinicId);
        const bLinked = (b.clinic_ids || []).includes(clinicId);
        if (aLinked && !bLinked) return -1;
        if (!aLinked && bLinked) return 1;
        return a.name.localeCompare(b.name);
      });
    }

    return list;
  },

  async createSurgeon(data: Partial<Surgeon>): Promise<Surgeon> {
    try {
      const created = await this.request<Surgeon>('/surgeons', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (created && created.id) {
        const list = await this.getSurgeons();
        const nextList = [created, ...list.filter((s) => s.id !== created.id)];
        localStorage.setItem('vetgo_surgeons', JSON.stringify(nextList));
        return created;
      }
    } catch (e) {
      console.warn('Erro ao criar cirurgião no servidor, criando localmente:', e);
    }

    const list = await this.getSurgeons();
    const user = this.getCachedUser();
    const nextNum = list.length + 1;
    const code = data.code || `PR-${Math.floor(10 + Math.random() * 89)}`;

    const newSurgeon: Surgeon = {
      id: Date.now(),
      owner_id: user?.id || 1,
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
    try {
      const updated = await this.request<Surgeon>(`/surgeons/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      if (updated) {
        const list = await this.getSurgeons();
        const nextList = list.map((s) => s.id === id ? { ...s, ...updated } : s);
        localStorage.setItem('vetgo_surgeons', JSON.stringify(nextList));
        return updated;
      }
    } catch (e) {
      console.warn('Erro ao atualizar cirurgião no servidor, atualizando localmente:', e);
    }
    const list = await this.getSurgeons();
    const idx = list.findIndex((s) => s.id === id);
    if (idx === -1) throw new Error('Cirurgião não encontrado');
    list[idx] = { ...list[idx], ...updates };
    localStorage.setItem('vetgo_surgeons', JSON.stringify(list));
    return list[idx];
  },

  async deleteSurgeon(id: number): Promise<void> {
    try {
      await this.request(`/surgeons/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('Erro ao remover cirurgião no servidor, removendo localmente:', e);
    }
    const list = await this.getSurgeons();
    const filtered = list.filter((s) => s.id !== id);
    localStorage.setItem('vetgo_surgeons', JSON.stringify(filtered));
  },

  // -----------------------------------------------------------------
  // REQUISITOS 4 a 17: MÓDULO DE ANESTESIOLOGIA VETERINÁRIA
  // -----------------------------------------------------------------
  async getAnesthesias(filters?: { clinicId?: number; patientId?: number }): Promise<AnesthesiaRecord[]> {
    try {
      const serverList = await this.request<AnesthesiaRecord[]>("/anesthesias");
      if (Array.isArray(serverList)) {
        localStorage.setItem("vetgo_anesthesias", JSON.stringify(serverList));
        let list = serverList;
        if (filters?.clinicId) list = list.filter((a) => a.clinic_id === filters.clinicId);
        if (filters?.patientId) list = list.filter((a) => a.patient_id === filters.patientId);
        return list;
      }
    } catch {
      // Fallback
    }

    const local = localStorage.getItem("vetgo_anesthesias");
    let list: AnesthesiaRecord[] = [];
    if (local) {
      list = JSON.parse(local);
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
    const user = this.getCachedUser();
    const list = await this.getAnesthesias();
    const year = new Date().getFullYear();
    const nextCode = `AN-${year}-${String(list.length + 1).padStart(3, '0')}`;

    const newRecord: AnesthesiaRecord = {
      id: Date.now(),
      owner_id: user?.id || 1,
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
      total_billed_amount: typeof data.total_billed_amount === 'number' ? data.total_billed_amount : 0.0,
      billing_status: data.billing_status || 'PENDENTE',
      notes: data.notes,
      created_at: new Date().toISOString()
    };

    try {
      const created = await this.request<AnesthesiaRecord>('/anesthesias', {
        method: 'POST',
        body: JSON.stringify(newRecord),
      });
      if (created && created.id) {
        Object.assign(newRecord, created);
      }
    } catch (e) {
      console.warn('Erro ao salvar ficha anestésica no servidor, salvando localmente:', e);
    }

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
    try {
      await this.request<AnesthesiaRecord>(`/anesthesias/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    } catch (e) {
      console.warn('Erro ao atualizar ficha anestésica no servidor, atualizando localmente:', e);
    }
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

    // Se houver valor faturado cadastrado, gera o registro no financeiro
    const billedAmount = Number(list[idx].total_billed_amount) || 0;
    if (billedAmount > 0) {
      const user = this.getCachedUser();
      const financialEntries = await this.getFinancialEntries();
      financialEntries.unshift({
        id: Date.now(),
        owner_id: user?.id || 1,
        entry_type: 'RECEITA',
        category: 'Procedimento Anestésico',
        description: `Ficha ${list[idx].code} - ${list[idx].procedure_name} (${list[idx].patient_name} / ${list[idx].clinic_name})`,
        amount: billedAmount,
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
      const finUserKey = user?.id ? `vetgo_financial_u${user.id}` : 'vetgo_financial';
      localStorage.setItem(finUserKey, JSON.stringify(financialEntries));
    }

    return list[idx];
  },

  // -----------------------------------------------------------------
  // REQUISITOS 18, 19 e 20: ESTOQUE, LOTES, TRANSFERÊNCIA & CONSUMO
  // -----------------------------------------------------------------
  async getInventory(): Promise<InventoryItem[]> {
    const user = this.getCachedUser();
    const userKey = user?.id ? `vetgo_inventory_u${user.id}` : 'vetgo_inventory';
    try {
      const serverList = await this.request<InventoryItem[]>('/inventory');
      if (Array.isArray(serverList)) {
        localStorage.setItem(userKey, JSON.stringify(serverList));
        return serverList;
      }
    } catch {
      // Fallback
    }

    const local = localStorage.getItem(userKey) || localStorage.getItem('vetgo_inventory');
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) {
          return user?.id ? parsed.filter((i: any) => i.owner_id === user.id || !i.owner_id) : parsed;
        }
      } catch {}
    }
    return [];
  },

  async transferStock(
    itemId: number,
    from: 'ESTOQUE_CENTRAL' | 'MALETA_VOLANTE',
    to: 'ESTOQUE_CENTRAL' | 'MALETA_VOLANTE',
    quantity: number
  ): Promise<void> {
    const list = await this.getInventory();
    const idx = list.findIndex((i) => i.id === itemId);
    if (idx === -1) throw new Error('Item de estoque não encontrado');

    const item = list[idx];
    let newKit = item.quantity_in_kit;
    let newStock = item.quantity_in_stock;

    if (from === 'ESTOQUE_CENTRAL' && to === 'MALETA_VOLANTE') {
      if (item.quantity_in_stock < quantity) {
        throw new Error(`Saldo insuficiente no Estoque Central (${item.quantity_in_stock} disponíveis).`);
      }
      newStock = Math.round((item.quantity_in_stock - quantity) * 1000) / 1000;
      newKit = Math.round((item.quantity_in_kit + quantity) * 1000) / 1000;
    } else if (from === 'MALETA_VOLANTE' && to === 'ESTOQUE_CENTRAL') {
      if (item.quantity_in_kit < quantity) {
        throw new Error(`Saldo insuficiente na Maleta Volante (${item.quantity_in_kit} disponíveis).`);
      }
      newKit = Math.round((item.quantity_in_kit - quantity) * 1000) / 1000;
      newStock = Math.round((item.quantity_in_stock + quantity) * 1000) / 1000;
    }
    await this.updateInventoryItem(itemId, {
      quantity_in_kit: newKit,
      quantity_in_stock: newStock,
    });
  },

  async createInventoryItem(data: Partial<InventoryItem>): Promise<InventoryItem> {
    const user = this.getCachedUser();
    const userKey = user?.id ? `vetgo_inventory_u${user.id}` : 'vetgo_inventory';
    try {
      const created = await this.request<InventoryItem>('/inventory', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (created && created.id) {
        const list = await this.getInventory();
        const updated = [created, ...list.filter((i) => i.id !== created.id)];
        localStorage.setItem(userKey, JSON.stringify(updated));
        return created;
      }
    } catch (e) {
      console.warn('Fallback creating inventory item locally:', e);
    }

    const list = await this.getInventory();
    const newItem: InventoryItem = {
      id: Date.now(),
      owner_id: user?.id || 2,
      name: data.name || 'Novo Insumo / Medicamento',
      category: data.category || 'Medicamento',
      active_ingredient: data.active_ingredient,
      presentation: data.presentation,
      concentration: data.concentration,
      presentation_type: data.presentation_type || 'LIQUIDO_ML',
      batch_number: data.batch_number,
      expiration_date: data.expiration_date,
      quantity_in_kit: Number(data.quantity_in_kit) || 0,
      quantity_in_stock: Number(data.quantity_in_stock) || 0,
      unit: data.unit || 'mL',
      min_alert_quantity: Number(data.min_alert_quantity) || 2,
      cost_price: Number(data.cost_price) || 0,
      sale_price: data.sale_price !== undefined ? Number(data.sale_price) : undefined,
      supplier_name: data.supplier_name,
      is_controlled_substance: Boolean(data.is_controlled_substance),
      notes: data.notes,
      batches: data.batches || [],
      created_at: new Date().toISOString(),
    };
    list.unshift(newItem);
    localStorage.setItem(userKey, JSON.stringify(list));
    return newItem;
  },

  async updateInventoryItem(id: number, updates: Partial<InventoryItem>): Promise<void> {
    const user = this.getCachedUser();
    const userKey = user?.id ? `vetgo_inventory_u${user.id}` : 'vetgo_inventory';
    try {
      await this.request<InventoryItem>(`/inventory/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    } catch (e) {
      console.warn('Fallback updating inventory item locally:', e);
    }
    const list = await this.getInventory();
    const idx = list.findIndex((i) => i.id === id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...updates };
      localStorage.setItem(userKey, JSON.stringify(list));
    }
  },

  async deleteInventoryItem(id: number): Promise<boolean> {
    const user = this.getCachedUser();
    const userKey = user?.id ? `vetgo_inventory_u${user.id}` : 'vetgo_inventory';
    try {
      await this.request(`/inventory/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('Fallback deleting inventory item locally:', e);
    }
    const list = await this.getInventory();
    const filtered = list.filter((i) => i.id !== id);
    localStorage.setItem(userKey, JSON.stringify(filtered));
    localStorage.removeItem('vetgo_inventory');
    return true;
  },

  async getAppointments(): Promise<Appointment[]> {
    const key = this.getAppointmentsStorageKey();
    const deletedKey = `${key}_deleted`;

    let deletedIds = new Set<number>();
    try {
      const delRaw = localStorage.getItem(deletedKey);
      if (delRaw) {
        deletedIds = new Set(JSON.parse(delRaw).map(Number));
      }
    } catch {}

    let localList: Appointment[] = [];
    const local = localStorage.getItem(key);
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) {
          localList = parsed.filter((a) => a && a.id && !deletedIds.has(Number(a.id)));
        }
      } catch {}
    }

    try {
      const serverList = await this.request<Appointment[]>('/appointments');
      if (Array.isArray(serverList)) {
        const validServerList = serverList.filter((a) => a && a.id && !deletedIds.has(Number(a.id)));
        const map = new Map<number, Appointment>();
        for (const loc of localList) {
          if (loc && loc.id) map.set(Number(loc.id), loc);
        }
        for (const srv of validServerList) {
          const srvId = Number(srv.id);
          const existing = map.get(srvId);
          if (existing) {
            map.set(srvId, { ...existing, ...srv });
          } else {
            map.set(srvId, srv);
          }
        }
        const merged = Array.from(map.values()).sort((a, b) => {
          return (b.date_time || '').localeCompare(a.date_time || '');
        });
        localStorage.setItem(key, JSON.stringify(merged));
        return merged;
      }
    } catch (err) {
      console.warn('Erro ao carregar agendamentos do servidor, usando persistência local:', err);
    }

    return localList;
  },

  async createAppointment(data: Partial<Appointment>): Promise<Appointment> {
    const key = this.getAppointmentsStorageKey();
    const deletedKey = `${key}_deleted`;

    let created: Appointment | null = null;
    try {
      created = await this.request<Appointment>('/appointments', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (err) {
      console.warn('Requisição de agendamento no servidor falhou/offline, persistindo localmente:', err);
    }

    const apptId = created?.id || Date.now();
    const newAppt: Appointment = {
      ...data,
      ...(created || {}),
      id: apptId,
      created_at: created?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as Appointment;

    try {
      const delRaw = localStorage.getItem(deletedKey);
      if (delRaw) {
        const delList = JSON.parse(delRaw).filter((id: any) => Number(id) !== Number(apptId));
        localStorage.setItem(deletedKey, JSON.stringify(delList));
      }
    } catch {}

    try {
      const local = localStorage.getItem(key);
      const list = local ? JSON.parse(local) : [];
      const nextList = [newAppt, ...list.filter((a: any) => Number(a.id) !== Number(apptId))];
      localStorage.setItem(key, JSON.stringify(nextList));
    } catch {}

    return newAppt;
  },

  async updateAppointment(id: number, updates: Partial<Appointment>): Promise<Appointment> {
    const key = this.getAppointmentsStorageKey();
    let updated: Appointment | null = null;
    try {
      updated = await this.request<Appointment>(`/appointments/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    } catch (e) {
      console.warn('Erro ao atualizar agendamento no servidor, atualizando localmente:', e);
    }

    const mergedAppt: Appointment = {
      ...updates,
      ...(updated || {}),
      id: Number(id),
      updated_at: new Date().toISOString(),
    } as Appointment;

    try {
      const local = localStorage.getItem(key);
      const list = local ? JSON.parse(local) : [];
      const nextList = list.map((a: any) => Number(a.id) === Number(id) ? { ...a, ...mergedAppt } : a);
      localStorage.setItem(key, JSON.stringify(nextList));
    } catch {}

    return mergedAppt;
  },

  async deleteAppointment(id: number): Promise<void> {
    const key = this.getAppointmentsStorageKey();
    const deletedKey = `${key}_deleted`;

    try {
      const delRaw = localStorage.getItem(deletedKey);
      const delList: number[] = delRaw ? JSON.parse(delRaw) : [];
      if (!delList.includes(Number(id))) {
        delList.push(Number(id));
        localStorage.setItem(deletedKey, JSON.stringify(delList));
      }
    } catch {}

    try {
      const local = localStorage.getItem(key);
      if (local) {
        const list = JSON.parse(local);
        const nextList = list.filter((a: any) => Number(a.id) !== Number(id));
        localStorage.setItem(key, JSON.stringify(nextList));
      }
    } catch {}

    try {
      await this.request(`/appointments/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('Erro ao deletar agendamento no servidor, mantido removido localmente:', e);
    }
  },

  async getConsultations(patientId?: number): Promise<ClinicalConsultation[]> {
    try {
      const query = patientId ? `?patient_id=${patientId}` : '';
      const serverList = await this.request<ClinicalConsultation[]>(`/consultations${query}`);
      if (Array.isArray(serverList)) {
        if (!patientId) {
          localStorage.setItem('vetgo_consultations', JSON.stringify(serverList));
        }
        return serverList;
      }
    } catch {
      // Fallback
    }

    const local = localStorage.getItem('vetgo_consultations');
    if (local) {
      const list: ClinicalConsultation[] = JSON.parse(local);
      if (patientId) return list.filter((c) => c.patient_id === patientId);
      return list;
    }
    return [];
  },

  async createConsultation(data: Partial<ClinicalConsultation>): Promise<ClinicalConsultation> {
    const user = this.getCachedUser();
    try {
      const serverCreated = await this.request<ClinicalConsultation>('/consultations', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (serverCreated && serverCreated.id) {
        const list = await this.getConsultations();
        const updated = [serverCreated, ...list.filter((c) => c.id !== serverCreated.id)];
        localStorage.setItem('vetgo_consultations', JSON.stringify(updated));

        // Deduct inventory only if NOT an estimate
        if (!data.is_estimate && data.billing_items && data.billing_items.length > 0) {
          try {
            const inventory = await this.getInventory();
            let changed = false;
            for (const item of data.billing_items) {
              if (item.deduct_from_stock && item.inventory_item_id) {
                const idx = inventory.findIndex((inv) => inv.id === item.inventory_item_id);
                if (idx !== -1) {
                  const qty = item.quantity || 1;
                  if (inventory[idx].quantity_in_kit >= qty) {
                    inventory[idx].quantity_in_kit = Math.round((inventory[idx].quantity_in_kit - qty) * 1000) / 1000;
                  } else {
                    const remainder = qty - inventory[idx].quantity_in_kit;
                    inventory[idx].quantity_in_kit = 0;
                    inventory[idx].quantity_in_stock = Math.max(0, Math.round((inventory[idx].quantity_in_stock - remainder) * 1000) / 1000);
                  }
                  changed = true;
                }
              }
            }
            if (changed) {
              const userKey = user?.id ? `vetgo_inventory_u${user.id}` : 'vetgo_inventory';
              localStorage.setItem(userKey, JSON.stringify(inventory));
            }
          } catch (e) {
            console.warn('Erro ao abater itens do estoque:', e);
          }
        }
        return serverCreated;
      }
    } catch (e) {
      console.warn('Fallback creating consultation locally:', e);
    }

    const list = await this.getConsultations();
    const newConsultation: ClinicalConsultation = {
      id: Date.now(),
      owner_id: user?.id || 2,
      patient_id: data.patient_id || 1,
      patient_name: data.patient_name || 'Paciente',
      tutor_id: data.tutor_id || 1,
      tutor_name: data.tutor_name || 'Tutor',
      appointment_id: data.appointment_id,
      clinic_id: data.clinic_id,
      clinic_name: data.clinic_name,
      date_time: data.date_time || new Date().toISOString(),
      chief_complaint: data.chief_complaint || (data.is_estimate ? 'Orçamento Clínico' : ''),
      symptom_onset_duration: data.symptom_onset_duration,
      symptom_evolution: data.symptom_evolution,
      diet_type: data.diet_type,
      diet_details: data.diet_details,
      water_intake: data.water_intake,
      environment_lifestyle: data.environment_lifestyle,
      other_animals_contact: data.other_animals_contact,
      vaccine_status: data.vaccine_status,
      vaccine_details: data.vaccine_details,
      deworming_status: data.deworming_status,
      deworming_date_product: data.deworming_date_product,
      ectoparasites_status: data.ectoparasites_status,
      ectoparasites_product: data.ectoparasites_product,
      is_neutered_record: data.is_neutered_record,
      previous_surgeries: data.previous_surgeries,
      chronic_diseases: data.chronic_diseases,
      known_allergies: data.known_allergies,
      continuous_medications: data.continuous_medications,
      system_digestive: data.system_digestive,
      system_respiratory: data.system_respiratory,
      system_dermatological: data.system_dermatological,
      system_urinary: data.system_urinary,
      system_locomotor_neuro: data.system_locomotor_neuro,
      system_eyes_ears: data.system_eyes_ears,
      system_others: data.system_others,
      anamnesis: data.anamnesis || '',
      vital_signs: data.vital_signs || {},
      physical_examination: data.physical_examination || '',
      diagnosis_suspicions: data.diagnosis_suspicions || '',
      prognosis: data.prognosis || 'Favorável',
      conduct_plan: data.conduct_plan || '',
      requested_exams: data.requested_exams || '',
      requested_exams_justification: data.requested_exams_justification || '',
      prescriptions: data.prescriptions || [],
      vaccines: data.vaccines || [],
      billing_items: data.billing_items || [],
      subtotal_amount: data.subtotal_amount ?? 0,
      discount_amount: data.discount_amount ?? 0,
      discount_rate: data.discount_rate,
      discount_type: data.discount_type || 'FIXED',
      card_fee_amount: data.card_fee_amount ?? 0,
      card_fee_rate: data.card_fee_rate,
      card_fee_type: data.card_fee_type || 'PERCENT',
      total_amount: data.total_amount ?? 0,
      payment_method: data.payment_method || 'PIX',
      payment_status: data.payment_status || (data.is_estimate ? 'PENDENTE' : 'PAGO'),
      is_volante: true,
      location_address: data.location_address,
      is_estimate: Boolean(data.is_estimate),
      estimate_validity_days: data.estimate_validity_days || 15,
      estimate_valid_until: data.estimate_valid_until,
      status: data.is_estimate ? 'ORCAMENTO' : (data.status || 'FINALIZADO'),
      created_at: new Date().toISOString(),
    };

    list.unshift(newConsultation);
    localStorage.setItem('vetgo_consultations', JSON.stringify(list));

    if (!data.is_estimate && data.billing_items && data.billing_items.length > 0) {
      try {
        const inventory = await this.getInventory();
        let changed = false;
        for (const item of data.billing_items) {
          if (item.deduct_from_stock && item.inventory_item_id) {
            const idx = inventory.findIndex((inv) => inv.id === item.inventory_item_id);
            if (idx !== -1) {
              const qty = item.quantity || 1;
              if (inventory[idx].quantity_in_kit >= qty) {
                inventory[idx].quantity_in_kit = Math.round((inventory[idx].quantity_in_kit - qty) * 1000) / 1000;
              } else {
                const remainder = qty - inventory[idx].quantity_in_kit;
                inventory[idx].quantity_in_kit = 0;
                inventory[idx].quantity_in_stock = Math.max(0, Math.round((inventory[idx].quantity_in_stock - remainder) * 1000) / 1000);
              }
              changed = true;
            }
          }
        }
        if (changed) {
          const userKey = user?.id ? `vetgo_inventory_u${user.id}` : 'vetgo_inventory';
          localStorage.setItem(userKey, JSON.stringify(inventory));
        }
      } catch (e) {
        console.warn('Erro ao abater itens do estoque:', e);
      }
    }

    return newConsultation;
  },

  async updateConsultation(id: number, data: Partial<ClinicalConsultation>): Promise<ClinicalConsultation> {
    const user = this.getCachedUser();
    let updatedConsultation: ClinicalConsultation | null = null;
    try {
      updatedConsultation = await this.request<ClinicalConsultation>(`/consultations/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    } catch (e) {
      console.warn('Fallback update consultation:', e);
    }

    const list = await this.getConsultations();
    const idx = list.findIndex((c) => c.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...data, ...(updatedConsultation || {}) };
      localStorage.setItem('vetgo_consultations', JSON.stringify(list));
      if (!data.is_estimate && list[idx].billing_items && list[idx].billing_items.length > 0) {
        try {
          const inventory = await this.getInventory();
          let changed = false;
          for (const item of list[idx].billing_items) {
            if (item.deduct_from_stock && item.inventory_item_id) {
              const invIdx = inventory.findIndex((inv) => inv.id === item.inventory_item_id);
              if (invIdx !== -1) {
                const qty = item.quantity || 1;
                if (inventory[invIdx].quantity_in_kit >= qty) {
                  inventory[invIdx].quantity_in_kit = Math.round((inventory[invIdx].quantity_in_kit - qty) * 1000) / 1000;
                } else {
                  const remainder = qty - inventory[invIdx].quantity_in_kit;
                  inventory[invIdx].quantity_in_kit = 0;
                  inventory[invIdx].quantity_in_stock = Math.max(0, Math.round((inventory[invIdx].quantity_in_stock - remainder) * 1000) / 1000);
                }
                changed = true;
              }
            }
          }
          if (changed) {
            const userKey = user?.id ? `vetgo_inventory_u${user.id}` : 'vetgo_inventory';
            localStorage.setItem(userKey, JSON.stringify(inventory));
          }
        } catch (err) {
          console.warn('Erro ao atualizar estoque:', err);
        }
      }
      return list[idx];
    }
    return updatedConsultation || (data as ClinicalConsultation);
  },

  async deleteConsultation(id: number): Promise<boolean> {
    try {
      await this.request<{ message: string }>(`/consultations/${id}`, {
        method: 'DELETE',
      });
    } catch (e) {
      console.warn('Fallback delete consultation:', e);
    }
    const list = await this.getConsultations();
    const filtered = list.filter((c) => c.id !== id);
    localStorage.setItem('vetgo_consultations', JSON.stringify(filtered));
    return true;
  },

  async getFinancialEntries(): Promise<FinancialEntry[]> {
    const user = this.getCachedUser();
    const userKey = user?.id ? `vetgo_financial_u${user.id}` : 'vetgo_financial';
    try {
      const serverList = await this.request<FinancialEntry[]>('/financial');
      if (Array.isArray(serverList)) {
        localStorage.setItem(userKey, JSON.stringify(serverList));
        return serverList;
      }
    } catch {
      // Fallback local
    }

    const local = localStorage.getItem(userKey);
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) {
          return user?.id ? parsed.filter((p: any) => p.owner_id === user.id) : parsed;
        }
      } catch {}
    }
    return [];
  },

  async createFinancialEntry(data: Partial<FinancialEntry>): Promise<FinancialEntry> {
    const user = this.getCachedUser();
    try {
      const created = await this.request<FinancialEntry>('/financial', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (created && created.id) {
        return created;
      }
    } catch (e) {
      console.warn('Fallback to local financial entry creation:', e);
    }

    const userKey = user?.id ? `vetgo_financial_u${user.id}` : 'vetgo_financial';
    const entries = await this.getFinancialEntries();
    const newEntry: FinancialEntry = {
      id: Date.now(),
      owner_id: user?.id || 2,
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
      created_at: new Date().toISOString(),
    };
    entries.unshift(newEntry);
    localStorage.setItem(userKey, JSON.stringify(entries));
    return newEntry;
  },

  async updateFinancialEntry(id: number, data: Partial<FinancialEntry>): Promise<FinancialEntry> {
    const user = this.getCachedUser();
    const userKey = user?.id ? `vetgo_financial_u${user.id}` : 'vetgo_financial';
    const entries = await this.getFinancialEntries();
    const idx = entries.findIndex((e) => Number(e.id) === Number(id));

    let updated: FinancialEntry;
    if (idx !== -1) {
      updated = { ...entries[idx], ...data, updated_at: new Date().toISOString() };
      entries[idx] = updated;
    } else {
      updated = {
        id,
        owner_id: user?.id || 1,
        entry_type: data.entry_type || 'RECEITA',
        category: data.category || 'Atendimento',
        description: data.description || '',
        amount: data.amount || 0,
        payment_method: data.payment_method || 'PIX',
        status: data.status || 'PAGO',
        date: data.date || new Date().toISOString().split('T')[0],
        created_at: data.created_at || new Date().toISOString(),
        ...data
      };
      entries.unshift(updated);
    }
    localStorage.setItem(userKey, JSON.stringify(entries));

    try {
      await this.request<FinancialEntry>(`/financial/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    } catch (e) {
      console.warn('Fallback updating financial entry locally:', e);
    }

    return updated;
  },

  async deleteFinancialEntry(id: number): Promise<boolean> {
    try {
      await this.request(`/financial/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('Fallback deleting financial entry locally:', e);
    }
    const user = this.getCachedUser();
    const userKey = user?.id ? `vetgo_financial_u${user.id}` : 'vetgo_financial';
    const entries = await this.getFinancialEntries();
    const filtered = entries.filter((e) => e.id !== id);
    localStorage.setItem(userKey, JSON.stringify(filtered));
    return true;
  },

  // -----------------------------------------------------------------
  // MÓDULO DE EXAMES LABORATORIAIS E COMPLEMENTARES
  // -----------------------------------------------------------------
  async getPatientExams(patientId?: number): Promise<PatientExam[]> {
    const user = this.getCachedUser();
    const key = user?.id ? `vetgo_exams_u${user.id}` : 'vetgo_exams';
    try {
      const query = patientId ? `?patient_id=${patientId}` : '';
      const serverList = await this.request<PatientExam[]>(`/exams${query}`);
      if (Array.isArray(serverList)) {
        localStorage.setItem(key, JSON.stringify(serverList));
        return serverList;
      }
    } catch (e) {
      console.warn('Fallback to local exams:', e);
    }

    try {
      const raw = localStorage.getItem(key);
      const list: PatientExam[] = raw ? JSON.parse(raw) : [];
      if (patientId) {
        return list.filter((e) => Number(e.patient_id) === Number(patientId));
      }
      return list;
    } catch {
      return [];
    }
  },

  async createPatientExam(data: Partial<PatientExam>): Promise<PatientExam> {
    const user = this.getCachedUser();
    const key = user?.id ? `vetgo_exams_u${user.id}` : 'vetgo_exams';
    const exams = await this.getPatientExams();

    const newExam: PatientExam = {
      id: Date.now(),
      owner_id: user?.id || 1,
      patient_id: Number(data.patient_id),
      patient_name: data.patient_name || 'Paciente',
      tutor_id: data.tutor_id,
      tutor_name: data.tutor_name,
      exam_type: data.exam_type || 'Exame Complementar',
      date: data.date || new Date().toISOString().split('T')[0],
      laboratory: data.laboratory || '',
      status: data.status || 'CONCLUIDO',
      results: data.results || '',
      reference_values: data.reference_values || '',
      attachments: data.attachments || [],
      notes: data.notes || '',
      price: Number(data.price) || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    try {
      const created = await this.request<PatientExam>('/exams', {
        method: 'POST',
        body: JSON.stringify(newExam)
      });
      if (created && created.id) {
        Object.assign(newExam, created);
      }
    } catch (e) {
      console.warn('Fallback creating exam locally:', e);
    }

    exams.unshift(newExam);
    localStorage.setItem(key, JSON.stringify(exams));
    return newExam;
  },

  async updatePatientExam(id: number, data: Partial<PatientExam>): Promise<PatientExam> {
    const user = this.getCachedUser();
    const key = user?.id ? `vetgo_exams_u${user.id}` : 'vetgo_exams';
    const exams = await this.getPatientExams();
    const idx = exams.findIndex((e) => Number(e.id) === Number(id));

    let updated: PatientExam;
    if (idx !== -1) {
      updated = { ...exams[idx], ...data, updated_at: new Date().toISOString() };
      exams[idx] = updated;
    } else {
      updated = {
        id,
        patient_id: Number(data.patient_id) || 1,
        exam_type: data.exam_type || 'Exame Complementar',
        date: data.date || new Date().toISOString().split('T')[0],
        status: data.status || 'CONCLUIDO',
        created_at: new Date().toISOString(),
        ...data
      };
      exams.unshift(updated);
    }
    localStorage.setItem(key, JSON.stringify(exams));

    try {
      await this.request<PatientExam>(`/exams/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    } catch (e) {
      console.warn('Fallback updating exam locally:', e);
    }

    return updated;
  },

  async deletePatientExam(id: number): Promise<boolean> {
    try {
      await this.request(`/exams/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('Fallback deleting exam locally:', e);
    }
    const user = this.getCachedUser();
    const key = user?.id ? `vetgo_exams_u${user.id}` : 'vetgo_exams';
    const exams = await this.getPatientExams();
    const filtered = exams.filter((e) => Number(e.id) !== Number(id));
    localStorage.setItem(key, JSON.stringify(filtered));
    return true;
  },

  async getDocuments(): Promise<DocumentRecord[]> {
    try {
      const serverList = await this.request<DocumentRecord[]>('/documents');
      if (Array.isArray(serverList)) {
        localStorage.setItem('vetgo_documents', JSON.stringify(serverList));
        return serverList;
      }
    } catch {
      // Fallback
    }

    const local = localStorage.getItem('vetgo_documents');
    if (local) return JSON.parse(local);
    return [];
  },

  async createDocument(data: Partial<DocumentRecord>): Promise<DocumentRecord> {
    try {
      const serverDoc = await this.request<DocumentRecord>('/documents', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      if (serverDoc) {
        const docs = await this.getDocuments();
        const existingIdx = docs.findIndex(d => d.id === serverDoc.id);
        if (existingIdx >= 0) docs[existingIdx] = serverDoc;
        else docs.unshift(serverDoc);
        localStorage.setItem('vetgo_documents', JSON.stringify(docs));
        return serverDoc;
      }
    } catch (e) {
      console.warn('Backend createDocument error, using local fallback:', e);
    }

    const docs = await this.getDocuments();
    const newDoc: DocumentRecord = {
      id: Date.now(),
      owner_id: 2,
      doc_type: data.doc_type || 'RECEITA_SIMPLES',
      title: data.title || 'Documento Veterinário',
      patient_id: data.patient_id,
      patient_name: data.patient_name,
      tutor_id: data.tutor_id,
      tutor_name: data.tutor_name,
      clinic_id: data.clinic_id,
      clinic_name: data.clinic_name,
      content: data.content || '',
      metadata_json: data.metadata_json,
      created_at: new Date().toISOString(),
    };
    docs.unshift(newDoc);
    localStorage.setItem('vetgo_documents', JSON.stringify(docs));
    return newDoc;
  },

  async deleteDocument(id: number): Promise<{ message: string }> {
    try {
      await this.request(`/documents/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('Backend deleteDocument error, proceeding with local update:', e);
    }
    const docs = await this.getDocuments();
    const filtered = docs.filter(d => Number(d.id) !== Number(id));
    localStorage.setItem('vetgo_documents', JSON.stringify(filtered));
    return { message: 'Documento excluído com sucesso.' };
  },

  // Document Templates (Textos Padrão / Modelos Customizáveis com Variáveis)
  async getDocumentTemplates(): Promise<DocumentTemplate[]> {
    try {
      const serverList = await this.request<DocumentTemplate[]>('/document-templates');
      if (Array.isArray(serverList)) {
        localStorage.setItem('vetgo_document_templates', JSON.stringify(serverList));
        return serverList;
      }
    } catch (e) {
      console.warn('Backend getDocumentTemplates error, falling back to local cache:', e);
    }

    const local = localStorage.getItem('vetgo_document_templates');
    if (local) {
      try {
        return JSON.parse(local);
      } catch {}
    }
    return [];
  },

  async createDocumentTemplate(data: {
    title: string;
    category?: string;
    description?: string;
    content: string;
  }): Promise<DocumentTemplate> {
    try {
      const serverTemplate = await this.request<DocumentTemplate>('/document-templates', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      if (serverTemplate) {
        const templates = await this.getDocumentTemplates();
        templates.unshift(serverTemplate);
        localStorage.setItem('vetgo_document_templates', JSON.stringify(templates));
        return serverTemplate;
      }
    } catch (e) {
      console.warn('Backend createDocumentTemplate error, saving locally:', e);
    }

    const templates = await this.getDocumentTemplates();
    const newTemplate: DocumentTemplate = {
      id: Date.now(),
      owner_id: 2,
      title: data.title,
      category: (data.category as any) || 'OUTRO',
      description: data.description || '',
      content: data.content,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    templates.unshift(newTemplate);
    localStorage.setItem('vetgo_document_templates', JSON.stringify(templates));
    return newTemplate;
  },

  async updateDocumentTemplate(
    id: number,
    updates: Partial<DocumentTemplate>
  ): Promise<DocumentTemplate> {
    try {
      const updated = await this.request<DocumentTemplate>(`/document-templates/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
      if (updated) {
        const templates = await this.getDocumentTemplates();
        const idx = templates.findIndex(t => Number(t.id) === Number(id));
        if (idx >= 0) templates[idx] = updated;
        localStorage.setItem('vetgo_document_templates', JSON.stringify(templates));
        return updated;
      }
    } catch (e) {
      console.warn('Backend updateDocumentTemplate error, saving locally:', e);
    }

    const templates = await this.getDocumentTemplates();
    const idx = templates.findIndex(t => Number(t.id) === Number(id));
    if (idx >= 0) {
      templates[idx] = { ...templates[idx], ...updates, updated_at: new Date().toISOString() };
      localStorage.setItem('vetgo_document_templates', JSON.stringify(templates));
      return templates[idx];
    }
    throw new Error('Modelo não encontrado.');
  },

  async deleteDocumentTemplate(id: number): Promise<{ message: string }> {
    try {
      await this.request(`/document-templates/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('Backend deleteDocumentTemplate error, proceeding locally:', e);
    }
    const templates = await this.getDocumentTemplates();
    const filtered = templates.filter(t => Number(t.id) !== Number(id));
    localStorage.setItem('vetgo_document_templates', JSON.stringify(filtered));
    return { message: 'Modelo excluído com sucesso.' };
  },

  async getSystemTemplates(): Promise<SystemDocumentTemplate[]> {
    try {
      const serverList = await this.request<SystemDocumentTemplate[]>('/system-templates');
      if (Array.isArray(serverList)) {
        localStorage.setItem('vetgo_system_document_templates', JSON.stringify(serverList));
        return serverList;
      }
    } catch (e) {
      console.warn('Backend getSystemTemplates error, using local cache:', e);
    }
    const local = localStorage.getItem('vetgo_system_document_templates');
    if (local) {
      try { return JSON.parse(local); } catch {}
    }
    return [];
  },


  // Delegated admin service methods
  async getAdminStats() {
    return adminService.getAdminStats();
  },
  async getAdminUsers() {
    return adminService.getAdminUsers();
  },
  async updateAdminSubscription(userId: number, updates: any) {
    return adminService.updateAdminSubscription(userId, updates);
  },
  async toggleUserStatus(userId: number, reason: string) {
    return adminService.toggleUserStatus(userId, reason);
  },
  async getPlatformPlans() {
    return adminService.getPlatformPlans();
  },
  async updatePlatformPlan(id: string, updates: any) {
    return adminService.updatePlatformPlan(id as any, updates);
  },
  async getGlobalAnnouncements() {
    return adminService.getGlobalAnnouncements();
  },
  async createGlobalAnnouncement(data: any) {
    return adminService.createGlobalAnnouncement(data);
  },
  async deleteGlobalAnnouncement(id: number) {
    return adminService.deleteGlobalAnnouncement(id);
  },
  async getAdminAuditLogs() {
    return adminService.getAdminAuditLogs();
  },
  async updateUserProfile(updates: any) {
    return this.updateProfile(updates);
  },

  async getServices(): Promise<ClinicalServiceItem[]> {
    try {
      const serverList = await this.request<ClinicalServiceItem[]>('/services');
      if (Array.isArray(serverList)) {
        localStorage.setItem('vetgo_services', JSON.stringify(serverList));
        return serverList;
      }
    } catch {
      // Fallback
    }

    const local = localStorage.getItem('vetgo_services');
    if (local) {
      try {
        return JSON.parse(local);
      } catch {}
    }

    return [];
  },

  async createService(data: Partial<ClinicalServiceItem>): Promise<ClinicalServiceItem> {
    try {
      const created = await this.request<ClinicalServiceItem>('/services', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (created && created.id) {
        return created;
      }
    } catch (e) {
      console.warn('Fallback creating service locally:', e);
    }
    const list = await this.getServices();
    const newService: ClinicalServiceItem = {
      id: Date.now(),
      name: data.name?.trim() || 'Novo Serviço',
      category: data.category || 'PROCEDIMENTO',
      price: data.price === undefined ? 50 : Number(data.price),
      description: data.description?.trim() || '',
      is_active: data.is_active === undefined ? true : data.is_active,
    };
    list.unshift(newService);
    localStorage.setItem('vetgo_services', JSON.stringify(list));
    return newService;
  },

  async updateService(id: number, updates: Partial<ClinicalServiceItem>): Promise<ClinicalServiceItem> {
    try {
      const updated = await this.request<ClinicalServiceItem>(`/services/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      if (updated && updated.id) {
        return updated;
      }
    } catch (e) {
      console.warn('Fallback updating service locally:', e);
    }
    const list = await this.getServices();
    const idx = list.findIndex((s) => s.id === id);
    if (idx === -1) throw new Error('Serviço não encontrado');
    list[idx] = {
      ...list[idx],
      ...updates,
      price: updates.price === undefined ? list[idx].price : Number(updates.price),
    };
    localStorage.setItem('vetgo_services', JSON.stringify(list));
    return list[idx];
  },

  async deleteService(id: number): Promise<boolean> {
    try {
      await this.request(`/services/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('Fallback deleting service locally:', e);
    }
    const local = localStorage.getItem('vetgo_services');
    if (local) {
      try {
        const list: ClinicalServiceItem[] = JSON.parse(local);
        const filtered = list.filter((s) => s.id !== id);
        localStorage.setItem('vetgo_services', JSON.stringify(filtered));
      } catch {}
    }
    return true;
  },

  async getSMTPSettings(): Promise<{
    provider: string;
    user: string;
    from_name: string;
    from_email: string;
    host: string;
    port: number;
    secure: boolean;
    is_active: boolean;
    is_configured: boolean;
    has_password: boolean;
    pass?: string;
  }> {
    try {
      const res = await this.request<any>('/settings/smtp');
      if (res && res.user) {
        localStorage.setItem('vetgo_smtp_settings', JSON.stringify(res));
      }
      return res;
    } catch (err) {
      console.warn('Fallback to local SMTP settings:', err);
      const local = localStorage.getItem('vetgo_smtp_settings');
      if (local) {
        try {
          return JSON.parse(local);
        } catch {}
      }
      return {
        provider: 'gmail',
        user: 'vetgoveterinarios@gmail.com',
        from_name: 'Vetgo',
        from_email: 'vetgoveterinarios@gmail.com',
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        is_active: true,
        is_configured: true,
        has_password: true,
        pass: 'zwhuxcxyfqtewqrb'
      };
    }
  },

  async saveSMTPSettings(data: {
    provider: string;
    user: string;
    pass?: string;
    from_name?: string;
    from_email?: string;
    host?: string;
    port?: number;
    secure?: boolean;
    is_active?: boolean;
  }): Promise<{ message: string; is_configured: boolean }> {
    localStorage.setItem('vetgo_smtp_settings', JSON.stringify({
      ...data,
      is_configured: !!(data.user && data.pass),
      has_password: !!data.pass
    }));
    try {
      return await this.request('/settings/smtp', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (err: any) {
      console.warn('API save SMTP failed, saved locally:', err);
      return {
        message: 'Configurações SMTP salvas com sucesso!',
        is_configured: true
      };
    }
  },

  async sendTestEmail(payload: {
    to: string;
    provider?: string;
    user?: string;
    pass?: string;
    from_name?: string;
    from_email?: string;
    host?: string;
    port?: number;
    secure?: boolean;
  }): Promise<{ success: boolean; message: string }> {
    return this.request('/settings/smtp/test', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getPublicSettings(): Promise<{ google_client_id?: string }> {
    try {
      const res = await this.request<{ google_client_id?: string }>('/settings/public');
      if (res?.google_client_id) {
        localStorage.setItem('vetgo_google_client_id', res.google_client_id);
      }
      return res;
    } catch {
      const local = localStorage.getItem('vetgo_google_client_id');
      return { google_client_id: local || '' };
    }
  },

  async getGoogleSettings(): Promise<{ client_id: string; is_configured: boolean }> {
    try {
      const res = await this.request<{ client_id: string; is_configured: boolean }>('/settings/google');
      if (res?.client_id) {
        localStorage.setItem('vetgo_google_client_id', res.client_id);
      }
      return res;
    } catch (err) {
      const local = localStorage.getItem('vetgo_google_client_id') || '';
      return {
        client_id: local,
        is_configured: Boolean(local && local.includes('.apps.googleusercontent.com')),
      };
    }
  },

  async saveGoogleSettings(clientId: string): Promise<{ message: string; client_id: string; is_configured: boolean }> {
    localStorage.setItem('vetgo_google_client_id', clientId.trim());
    try {
      return await this.request('/settings/google', {
        method: 'POST',
        body: JSON.stringify({ client_id: clientId.trim() }),
      });
    } catch (err: any) {
      return {
        message: 'Google Client ID salvo localmente com sucesso!',
        client_id: clientId.trim(),
        is_configured: Boolean(clientId && clientId.includes('.apps.googleusercontent.com')),
      };
    }
  },

  // -------------------------------------------------------------
  // SUPPLIERS & PARTNERS (FORNECEDORES E LABORATÓRIOS)
  // -------------------------------------------------------------
  async getSuppliers(): Promise<Supplier[]> {
    try {
      const data = await this.request<Supplier[]>('/suppliers');
      if (Array.isArray(data)) {
        localStorage.setItem('vetgo_suppliers', JSON.stringify(data));
        return data;
      }
    } catch (e) {
      console.warn('Fallback to local suppliers:', e);
    }

    const local = localStorage.getItem('vetgo_suppliers');
    if (local) {
      try {
        return JSON.parse(local);
      } catch {}
    }

    // Dados iniciais de demonstração para o veterinário
    const initialSuppliers: Supplier[] = [
      {
        id: 1,
        owner_id: 1,
        name: 'Distribuidora VetPrime Farmacêutica',
        category: 'DISTRIBUIDORA',
        representative_name: 'Carlos Henrique',
        phone: '(11) 3456-7890',
        whatsapp: '11987654321',
        email: 'pedidos@vetprime.com.br',
        city: 'São Paulo',
        state: 'SP',
        pix_key: 'financeiro@vetprime.com.br',
        delivery_time: '24 a 48 horas',
        minimum_order: 350,
        notes: 'Frete grátis para pedidos acima de R$ 500. Condições de 28 dias no boleto.',
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: 2,
        owner_id: 1,
        name: 'Laboratório VetPat - Diagnósticos & Biópsias',
        category: 'LABORATORIO',
        representative_name: 'Dra. Fernanda (Patologista)',
        phone: '(11) 2345-6789',
        whatsapp: '11998877665',
        email: 'laudos@vetpatlab.com.br',
        city: 'São Paulo',
        state: 'SP',
        pix_key: 'pix@vetpatlab.com.br',
        delivery_time: 'Hemograma em 4h / Citologia em 24h',
        notes: 'Motoboy retira amostras em domicílio até às 17h. Enviar sangue em tubo EDTA roxo refrigerado.',
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: 3,
        owner_id: 1,
        name: 'DrogaVet - Farmácia de Manipulação Veterinária',
        category: 'MANIPULACAO',
        representative_name: 'Atendimento Farmacêutico',
        phone: '(11) 4004-1234',
        whatsapp: '11977665544',
        email: 'receitas@drogavet.com.br',
        city: 'São Paulo',
        state: 'SP',
        pix_key: 'financeiro@drogavet.com.br',
        delivery_time: '24 a 48 horas',
        notes: 'Manipulação de biscoitos medicamentosos palatáveis, pastas orais e colírios especiais. Desconto de parceiro para clientes indicados.',
        is_active: true,
        created_at: new Date().toISOString()
      }
    ];

    localStorage.setItem('vetgo_suppliers', JSON.stringify(initialSuppliers));
    return initialSuppliers;
  },

  async createSupplier(data: Partial<Supplier>): Promise<Supplier> {
    const localSuppliers = await this.getSuppliers();
    const newSupplier: Supplier = {
      id: Date.now(),
      owner_id: 1,
      name: data.name || '',
      category: data.category || 'DISTRIBUIDORA',
      representative_name: data.representative_name || '',
      phone: data.phone || '',
      whatsapp: data.whatsapp || '',
      email: data.email || '',
      website: data.website || '',
      city: data.city || '',
      state: data.state || 'SP',
      pix_key: data.pix_key || '',
      delivery_time: data.delivery_time || '',
      minimum_order: data.minimum_order || undefined,
      notes: data.notes || '',
      is_active: data.is_active !== false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...data
    };

    try {
      const serverRes = await this.request<Supplier>('/suppliers', {
        method: 'POST',
        body: JSON.stringify(newSupplier)
      });
      if (serverRes) {
        localSuppliers.unshift(serverRes);
        localStorage.setItem('vetgo_suppliers', JSON.stringify(localSuppliers));
        return serverRes;
      }
    } catch {}

    localSuppliers.unshift(newSupplier);
    localStorage.setItem('vetgo_suppliers', JSON.stringify(localSuppliers));
    return newSupplier;
  },

  async updateSupplier(id: number, updates: Partial<Supplier>): Promise<Supplier> {
    const list = await this.getSuppliers();
    const idx = list.findIndex(s => s.id === id);
    const updated: Supplier = {
      ...(idx !== -1 ? list[idx] : ({} as Supplier)),
      ...updates,
      id,
      updated_at: new Date().toISOString()
    };

    try {
      await this.request<Supplier>(`/suppliers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
    } catch {}

    if (idx !== -1) {
      list[idx] = updated;
    } else {
      list.push(updated);
    }
    localStorage.setItem('vetgo_suppliers', JSON.stringify(list));
    return updated;
  },

  async deleteSupplier(id: number): Promise<{ message: string }> {
    try {
      await this.request(`/suppliers/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('Backend deleteSupplier error, proceeding with local update:', e);
    }

    const local = localStorage.getItem('vetgo_suppliers');
    if (local) {
      try {
        const list = JSON.parse(local);
        const filtered = list.filter((s: any) => Number(s.id) !== Number(id));
        localStorage.setItem('vetgo_suppliers', JSON.stringify(filtered));
      } catch {}
    }
    return { message: 'Fornecedor excluído com sucesso.' };
  },

  // -------------------------------------------------------------
  // SUPPLIER ORDERS & PURCHASES
  // -------------------------------------------------------------
  async getSupplierOrders(): Promise<SupplierOrder[]> {
    try {
      const data = await this.request<SupplierOrder[]>('/supplier-orders');
      if (Array.isArray(data)) {
        localStorage.setItem('vetgo_supplier_orders', JSON.stringify(data));
        return data;
      }
    } catch (e) {
      console.warn('Fallback to local supplier orders:', e);
    }

    const local = localStorage.getItem('vetgo_supplier_orders');
    if (local) {
      try {
        return JSON.parse(local);
      } catch {}
    }

    return [];
  },

  async createSupplierOrder(data: Partial<SupplierOrder>): Promise<SupplierOrder> {
    const localOrders = await this.getSupplierOrders();
    const newOrder: SupplierOrder = {
      id: Date.now(),
      owner_id: 1,
      order_number: data.order_number || `PED-${Math.floor(1000 + Math.random() * 9000)}`,
      supplier_id: data.supplier_id || 1,
      supplier_name: data.supplier_name || 'Distribuidora',
      supplier_category: data.supplier_category || 'DISTRIBUIDORA',
      representative_name: data.representative_name,
      representative_phone: data.representative_phone,
      items: data.items || [],
      total_amount: data.total_amount || 0,
      status: data.status || 'PENDENTE',
      urgency: data.urgency || 'NORMAL',
      expected_delivery_date: data.expected_delivery_date,
      delivery_tracking_code: data.delivery_tracking_code,
      payment_method: data.payment_method,
      notes: data.notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...data
    };

    try {
      const serverRes = await this.request<SupplierOrder>('/supplier-orders', {
        method: 'POST',
        body: JSON.stringify(newOrder)
      });
      if (serverRes) {
        localOrders.unshift(serverRes);
        localStorage.setItem('vetgo_supplier_orders', JSON.stringify(localOrders));
        return serverRes;
      }
    } catch {}

    localOrders.unshift(newOrder);
    localStorage.setItem('vetgo_supplier_orders', JSON.stringify(localOrders));
    return newOrder;
  },

  async updateSupplierOrder(id: number, updates: Partial<SupplierOrder>): Promise<SupplierOrder> {
    const list = await this.getSupplierOrders();
    const idx = list.findIndex(o => o.id === id);
    const updated: SupplierOrder = {
      ...(idx !== -1 ? list[idx] : ({} as SupplierOrder)),
      ...updates,
      id,
      updated_at: new Date().toISOString()
    };

    try {
      await this.request<SupplierOrder>(`/supplier-orders/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
    } catch {}

    if (idx !== -1) {
      list[idx] = updated;
    } else {
      list.push(updated);
    }
    localStorage.setItem('vetgo_supplier_orders', JSON.stringify(list));
    return updated;
  },

  async deleteSupplierOrder(id: number): Promise<{ message: string }> {
    try {
      await this.request(`/supplier-orders/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('Backend deleteSupplierOrder error, proceeding with local update:', e);
    }

    const local = localStorage.getItem('vetgo_supplier_orders');
    if (local) {
      try {
        const list = JSON.parse(local);
        const filtered = list.filter((o: any) => Number(o.id) !== Number(id));
        localStorage.setItem('vetgo_supplier_orders', JSON.stringify(filtered));
      } catch {}
    }
    return { message: 'Pedido excluído com sucesso.' };
  }
};
