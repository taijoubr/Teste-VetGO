import {
  AdminUser,
  AdminAuditLog,
  AdminStats,
  PlatformPlan,
  GlobalAnnouncement
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

async function adminRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('vetgo_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`, {
    ...options,
    headers
  });
  if (!res.ok) {
    let errMsg = 'Erro na requisição administrativa.';
    try {
      const err = await res.json();
      if (err?.detail) errMsg = typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail);
    } catch {}
    throw new Error(errMsg);
  }
  if (res.status === 204) return {} as T;
  return res.json();
}

export const adminService = {
  async getAdminStats(): Promise<AdminStats> {
    try {
      const raw = await adminRequest<any>('/admin/stats');
      const totalUsers = raw.total_users || 0;
      const proUsers = raw.total_pro_users || 0;
      const lifetime = raw.total_lifetime_users || 0;
      const payingPros = Math.max(0, proUsers - lifetime);
      const estimatedMrr = payingPros * 18.0;

      return {
        total_users: totalUsers,
        total_vets: raw.total_vets || 0,
        total_free_users: raw.total_free_users || 0,
        total_pro_users: proUsers,
        total_lifetime_users: lifetime,
        total_active_subscriptions: raw.total_active_subscriptions || 0,
        estimated_mrr: estimatedMrr,
        conversion_rate: totalUsers > 0 ? Math.round((proUsers / totalUsers) * 100) : 0,
        monthly_churn_rate: 1.8
      };
    } catch {
      const users = await this.getAdminUsers();
      const proUsers = users.filter((u) => u.plan === 'PRO');
      const freeUsers = users.filter((u) => u.plan === 'FREE');
      const lifetimeUsers = users.filter((u) => u.is_lifetime);
      const activeSubs = users.filter((u) => u.subscription_status === 'ACTIVE');
      const payingPros = proUsers.filter((u) => !u.is_lifetime).length;
      return {
        total_users: users.length,
        total_vets: users.filter((u) => u.role === 'VET').length,
        total_free_users: freeUsers.length,
        total_pro_users: proUsers.length,
        total_lifetime_users: lifetimeUsers.length,
        total_active_subscriptions: activeSubs.length,
        estimated_mrr: payingPros * 18.0,
        conversion_rate: users.length > 0 ? Math.round((proUsers.length / users.length) * 100) : 0,
        monthly_churn_rate: 1.8
      };
    }
  },

  async getAdminUsers(): Promise<AdminUser[]> {
    try {
      return await adminRequest<AdminUser[]>('/admin/users');
    } catch {
      const local = localStorage.getItem('vetgo_admin_users');
      if (local) return JSON.parse(local);
      return [];
    }
  },

  async createUser(data: {
    email: string;
    password: string;
    first_name: string;
    last_name?: string;
    role: 'ADMIN' | 'VET';
    phone?: string;
    crmv?: string;
    crmv_uf?: string;
    plan?: 'FREE' | 'PRO';
    is_lifetime?: boolean;
    admin_notes?: string;
  }): Promise<AdminUser> {
    const res = await adminRequest<{ message: string; user: AdminUser }>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.user;
  },

  async updateAdminSubscription(
    userId: number,
    updates: {
      plan?: 'FREE' | 'PRO';
      is_lifetime?: boolean;
      subscription_status?: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
      subscription_end?: string | null;
      admin_notes?: string;
    }
  ): Promise<void> {
    try {
      await adminRequest<AdminUser>(`/admin/users/${userId}/subscription`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
    } catch (e: any) {
      throw new Error(e.message || 'Erro ao atualizar assinatura.');
    }
  },

  async toggleUserStatus(userId: number, reason: string): Promise<boolean> {
    try {
      const res = await adminRequest<{ message: string; is_active: boolean }>(`/admin/users/${userId}/toggle-active`, {
        method: 'PATCH',
        body: JSON.stringify({ reason })
      });
      return res.is_active;
    } catch (e: any) {
      throw new Error(e.message || 'Erro ao alterar status do usuário.');
    }
  },

  async deleteUser(userId: number): Promise<void> {
    await adminRequest<{ message: string }>(`/admin/users/${userId}`, {
      method: 'DELETE',
    });
  },

  async getPlatformPlans(): Promise<PlatformPlan[]> {
    const local = localStorage.getItem('vetgo_platform_plans');
    if (local) return JSON.parse(local);

    const defaultPlans: PlatformPlan[] = [
      {
        id: 'plan_free',
        name: 'Plano Gratuito',
        code: 'FREE',
        price_monthly: 0,
        price_annual: 0,
        max_patients: 15,
        has_anesthesia: true,
        has_clinics: true,
        has_financial: true,
        has_custom_logo: false,
        badge: 'Iniciante (100% Gratuito)',
        is_active: true
      },
      {
        id: 'plan_pro',
        name: 'Plano Pro Mensal / Anual',
        code: 'PRO',
        price_monthly: 18.0,
        price_annual: 180.0,
        max_patients: 'ILIMITADO',
        has_anesthesia: true,
        has_clinics: true,
        has_financial: true,
        has_custom_logo: true,
        badge: 'Mais Popular (R$ 18/mês)',
        is_active: true
      },
      {
        id: 'plan_lifetime',
        name: 'Plano Vitalício Fundador',
        code: 'LIFETIME',
        price_monthly: 0,
        price_annual: 0,
        max_patients: 'ILIMITADO',
        has_anesthesia: true,
        has_clinics: true,
        has_financial: true,
        has_custom_logo: true,
        badge: 'Acesso Perpétuo',
        is_active: true
      }
    ];

    if (local) {
      try {
        const parsed: PlatformPlan[] = JSON.parse(local);
        // Garantir que Anestesiologia seja liberada para todos os planos
        const updated = parsed.map((p) => ({ ...p, has_anesthesia: true }));
        localStorage.setItem('vetgo_platform_plans', JSON.stringify(updated));
        return updated;
      } catch {
        // fallback to default
      }
    }

    localStorage.setItem('vetgo_platform_plans', JSON.stringify(defaultPlans));
    return defaultPlans;
  },

  async updatePlatformPlan(id: string, updates: Partial<PlatformPlan>): Promise<PlatformPlan> {
    const plans = await this.getPlatformPlans();
    const idx = plans.findIndex((p) => p.id === id);
    if (idx >= 0) {
      plans[idx] = { ...plans[idx], ...updates };
      localStorage.setItem('vetgo_platform_plans', JSON.stringify(plans));

      const logs = await this.getAdminAuditLogs();
      logs.unshift({
        id: Date.now(),
        admin_name: 'Administrador Master Vetgo',
        target_user_name: 'Configuração da Plataforma',
        action: 'ALTERAR_REGRA_PLANO',
        details: `Plano ${plans[idx].name} alterado. Preço: R$ ${plans[idx].price_monthly}/mês`,
        created_at: new Date().toISOString()
      });
      localStorage.setItem('vetgo_admin_audit_logs', JSON.stringify(logs));
      return plans[idx];
    }
    throw new Error('Plano não encontrado');
  },

  async getGlobalAnnouncements(): Promise<GlobalAnnouncement[]> {
    const local = localStorage.getItem('vetgo_admin_announcements');
    if (local) return JSON.parse(local);

    const defaultAnnouncements: GlobalAnnouncement[] = [
      {
        id: 1,
        title: 'Módulo de Anestesiologia Liberado para Todos os Usuários',
        message: 'A ficha anestésica multiparamétrica e o cronômetro cirúrgico estão disponíveis para todos os usuários da plataforma, sem necessidade de assinatura Pro.',
        type: 'SUCCESS',
        is_active: true,
        created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
        created_by: 'Administração Vetgo'
      }
    ];
    localStorage.setItem('vetgo_admin_announcements', JSON.stringify(defaultAnnouncements));
    return defaultAnnouncements;
  },

  async createGlobalAnnouncement(data: Partial<GlobalAnnouncement>): Promise<GlobalAnnouncement> {
    const list = await this.getGlobalAnnouncements();
    const newAnn: GlobalAnnouncement = {
      id: Date.now(),
      title: data.title || 'Aviso da Plataforma',
      message: data.message || '',
      type: data.type || 'INFO',
      is_active: true,
      created_at: new Date().toISOString(),
      created_by: 'Administrador Master Vetgo'
    };
    list.unshift(newAnn);
    localStorage.setItem('vetgo_admin_announcements', JSON.stringify(list));

    const logs = await this.getAdminAuditLogs();
    logs.unshift({
      id: Date.now(),
      admin_name: 'Administrador Master Vetgo',
      target_user_name: 'Todos os Usuários',
      action: 'CRIAR_AVISO_GLOBAL',
      details: `Aviso: "${newAnn.title}"`,
      created_at: new Date().toISOString()
    });
    localStorage.setItem('vetgo_admin_audit_logs', JSON.stringify(logs));
    return newAnn;
  },

  async deleteGlobalAnnouncement(id: number): Promise<boolean> {
    const list = await this.getGlobalAnnouncements();
    const filtered = list.filter((a) => a.id !== id);
    localStorage.setItem('vetgo_admin_announcements', JSON.stringify(filtered));
    return true;
  },

  async getAdminAuditLogs(): Promise<AdminAuditLog[]> {
    try {
      return await adminRequest<AdminAuditLog[]>('/admin/audit-logs');
    } catch {
      const local = localStorage.getItem('vetgo_admin_audit_logs');
      if (local) return JSON.parse(local);
      return [];
    }
  }
};
