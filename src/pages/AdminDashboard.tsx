import React, { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import {
  AdminUser,
  AdminStats,
  AdminAuditLog,
  PlatformPlan,
  GlobalAnnouncement
} from '../types';
import { AdminLayout } from '../components/admin/AdminLayout';
import {
  ShieldCheck,
  Users,
  CreditCard,
  Sparkles,
  Search,
  Clock,
  CheckCircle2,
  AlertTriangle,
  History,
  X,
  Megaphone,
  Plus,
  Trash2,
  DollarSign,
  TrendingUp,
  UserCheck,
  UserX,
  Lock,
  Unlock,
  Check,
  Filter,
  ChevronDown,
  ChevronUp,
  Eye,
  Phone,
  Mail
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [plans, setPlans] = useState<PlatformPlan[]>([]);
  const [announcements, setAnnouncements] = useState<GlobalAnnouncement[]>([]);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState<'ALL' | 'FREE' | 'PRO' | 'LIFETIME'>('ALL');
  const [loading, setLoading] = useState(true);
  const [expandedUserIds, setExpandedUserIds] = useState<Record<number, boolean>>({});

  const toggleUserExpanded = (userId: number) => {
    setExpandedUserIds(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  // Edit Subscription Modal
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [editPlan, setEditPlan] = useState<'FREE' | 'PRO'>('PRO');
  const [isLifetime, setIsLifetime] = useState(false);
  const [durationPreset, setDurationPreset] = useState<'1M' | '3M' | '6M' | '1Y' | 'CUSTOM' | 'NONE'>('1M');
  const [customMonths, setCustomMonths] = useState(1);
  const [customExpiryDate, setCustomExpiryDate] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Toggle User Active Modal
  const [toggleUserTarget, setToggleUserTarget] = useState<AdminUser | null>(null);
  const [toggleReason, setToggleReason] = useState('');
  const [toggling, setToggling] = useState(false);

  // New Announcement Modal
  const [showAnnModal, setShowAnnModal] = useState(false);
  const [annTitle, setAnnTitle] = useState('');
  const [annMessage, setAnnMessage] = useState('');
  const [annType, setAnnType] = useState<'INFO' | 'WARNING' | 'ALERT' | 'SUCCESS'>('INFO');
  const [creatingAnn, setCreatingAnn] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [st, usrs, logs, plns, anns] = await Promise.all([
        adminService.getAdminStats(),
        adminService.getAdminUsers(),
        adminService.getAdminAuditLogs(),
        adminService.getPlatformPlans(),
        adminService.getGlobalAnnouncements()
      ]);
      setStats(st);
      setUsers(usrs);
      setAuditLogs(logs);
      setPlans(plns);
      setAnnouncements(anns);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditModal = (user: AdminUser) => {
    setSelectedUser(user);
    setEditPlan(user.plan);
    setIsLifetime(user.is_lifetime);
    if (user.is_lifetime) {
      setDurationPreset('NONE');
    } else if (user.subscription_end) {
      setDurationPreset('CUSTOM');
      setCustomExpiryDate(user.subscription_end.split('T')[0]);
    } else {
      setDurationPreset('1M');
      const d = new Date();
      d.setMonth(d.getMonth() + 1);
      setCustomExpiryDate(d.toISOString().split('T')[0]);
    }
    setCustomMonths(1);
    setAdminNotes('');
  };

  const handleSaveSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setSaving(true);

    let calculatedEnd: string | null = null;
    if (editPlan === 'PRO' && !isLifetime) {
      if (durationPreset === 'CUSTOM' && customExpiryDate) {
        calculatedEnd = new Date(customExpiryDate + 'T23:59:59').toISOString();
      } else if (durationPreset === '1M') {
        const d = new Date();
        d.setMonth(d.getMonth() + 1);
        calculatedEnd = d.toISOString();
      } else if (durationPreset === '3M') {
        const d = new Date();
        d.setMonth(d.getMonth() + 3);
        calculatedEnd = d.toISOString();
      } else if (durationPreset === '6M') {
        const d = new Date();
        d.setMonth(d.getMonth() + 6);
        calculatedEnd = d.toISOString();
      } else if (durationPreset === '1Y') {
        const d = new Date();
        d.setFullYear(d.getFullYear() + 1);
        calculatedEnd = d.toISOString();
      }
    } else if (isLifetime || editPlan === 'FREE') {
      calculatedEnd = null;
    }

    try {
      await adminService.updateAdminSubscription(selectedUser.id, {
        plan: editPlan,
        is_lifetime: isLifetime,
        subscription_status: 'ACTIVE',
        subscription_end: calculatedEnd,
        admin_notes: adminNotes || `Ativação manual (${isLifetime ? 'Vitalício' : durationPreset})`
      });
      setSelectedUser(null);
      await loadAllData();
    } finally {
      setSaving(false);
    }
  };

  const handleToggleUserActive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toggleUserTarget) return;
    setToggling(true);
    try {
      await adminService.toggleUserStatus(toggleUserTarget.id, toggleReason || 'Ação do administrador');
      setToggleUserTarget(null);
      setToggleReason('');
      await loadAllData();
    } finally {
      setToggling(false);
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim()) return;
    setCreatingAnn(true);
    try {
      await adminService.createGlobalAnnouncement({
        title: annTitle,
        message: annMessage,
        type: annType
      });
      setShowAnnModal(false);
      setAnnTitle('');
      setAnnMessage('');
      setAnnType('INFO');
      await loadAllData();
    } finally {
      setCreatingAnn(false);
    }
  };

  const handleDeleteAnnouncement = async (id: number) => {
    if (!confirm('Deseja excluir este comunicado da plataforma?')) return;
    await adminService.deleteGlobalAnnouncement(id);
    await loadAllData();
  };

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    const matchQuery =
      u.email.toLowerCase().includes(q) ||
      u.first_name.toLowerCase().includes(q) ||
      u.last_name.toLowerCase().includes(q) ||
      (u.crmv && u.crmv.includes(q));

    const matchPlan =
      planFilter === 'ALL' ||
      (planFilter === 'LIFETIME' && u.is_lifetime) ||
      (planFilter === 'PRO' && u.plan === 'PRO' && !u.is_lifetime) ||
      (planFilter === 'FREE' && u.plan === 'FREE');

    return matchQuery && matchPlan;
  });

  return (
    <AdminLayout activeTab={activeTab} onSelectTab={(tab) => setActiveTab(tab)}>
      {/* Tab Content 1: OVERVIEW & SAAS METRICS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
                <ShieldCheck className="w-7 h-7 text-blue-500" />
                Painel de Controle SaaS Vetgo
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Visão consolidada de assinantes, receita recorrente (MRR), planos e integridade da infraestrutura.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('users')}
                className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-blue-500/20 cursor-pointer"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Gerenciar Veterinários ({users.length})</span>
              </button>
            </div>
          </div>

          {/* Metric KPI Cards */}
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">Total de Veterinários</span>
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2 text-3xl font-black text-white">{stats.total_vets}</div>
                <div className="mt-1 text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  <span>100% autônomos e volantes</span>
                </div>
              </div>

              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">MRR Recorrente Estimado</span>
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2 text-3xl font-black text-emerald-400">
                  R$ {stats.estimated_mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <div className="mt-1 text-[11px] text-slate-400">
                  Baseado em assinaturas Pro ativas (R$ 18/mês)
                </div>
              </div>

              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">Assinaturas Pro & Vitalícias</span>
                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <Sparkles className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2 text-3xl font-black text-purple-400">
                  {stats.total_pro_users}{' '}
                  <span className="text-sm font-semibold text-slate-400">
                    ({stats.total_lifetime_users} vitalícias)
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-slate-400">
                  {stats.total_free_users} contas no plano gratuito
                </div>
              </div>

              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">Taxa de Conversão Pro</span>
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <CreditCard className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2 text-3xl font-black text-amber-400">{stats.conversion_rate}%</div>
                <div className="mt-1 text-[11px] text-slate-400">
                  Churn mensal estimado: {stats.monthly_churn_rate}%
                </div>
              </div>
            </div>
          )}

          {/* Quick Shortcuts & Platform Status */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Quick Actions */}
            <div className="lg:col-span-2 bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-400" />
                  Últimos Médicos-Veterinários Cadastrados
                </h2>
                <button
                  onClick={() => setActiveTab('users')}
                  className="text-xs font-semibold text-blue-400 hover:text-blue-300"
                >
                  Ver todos ({users.length}) →
                </button>
              </div>

              <div className="divide-y divide-slate-800">
                {users.slice(0, 4).map((u) => (
                  <div key={u.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-800 text-blue-400 flex items-center justify-center font-bold text-xs border border-slate-700 shrink-0">
                        {u.first_name[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white flex flex-wrap items-center gap-1.5 leading-tight">
                          <span className="truncate">
                            {u.first_name} {u.last_name}
                          </span>
                          {u.crmv && (
                            <span className="text-[10px] text-slate-400 font-mono shrink-0">
                              CRMV-{u.crmv_uf} {u.crmv}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">{u.email}</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pl-10.5 sm:pl-0">
                      {u.is_lifetime ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-purple-500/10 text-purple-300 border border-purple-500/20 whitespace-nowrap">
                          Vitalício
                        </span>
                      ) : u.plan === 'PRO' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 whitespace-nowrap">
                          Pro
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700 whitespace-nowrap">
                          Gratuito
                        </span>
                      )}

                      <button
                        onClick={() => {
                          setActiveTab('users');
                          handleOpenEditModal(u);
                        }}
                        className="px-2.5 py-1 text-[11px] font-semibold text-blue-400 hover:text-white hover:bg-slate-800 rounded border border-slate-700 transition cursor-pointer whitespace-nowrap"
                      >
                        Gerenciar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Security & Platform Health */}
            <div className="space-y-4">
              <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Saúde do Sistema & Segurança
                </h3>
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between p-2 rounded bg-slate-950/60 border border-slate-800/80">
                    <span className="text-slate-300">Autenticação JWT / Sessão</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Normal
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-slate-950/60 border border-slate-800/80">
                    <span className="text-slate-300">Banco de Dados Vetgo</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Conectado
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-slate-950/60 border border-slate-800/80">
                    <span className="text-slate-300">Regras de Preços & Anestesia</span>
                    <span className="text-blue-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> R$ 18/mês
                    </span>
                  </div>
                </div>
              </div>

              {/* Announcements preview */}
              <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Megaphone className="w-3.5 h-3.5 text-amber-400" />
                    Comunicados Ativos
                  </h3>
                  <button
                    onClick={() => setActiveTab('announcements')}
                    className="text-[11px] text-blue-400 font-semibold hover:underline"
                  >
                    Gerenciar ({announcements.length})
                  </button>
                </div>
                {announcements.length > 0 ? (
                  <div className="p-3 rounded-lg bg-blue-950/30 border border-blue-900/50 text-xs">
                    <div className="font-bold text-blue-300">{announcements[0].title}</div>
                    <div className="text-[11px] text-slate-400 mt-1">{announcements[0].message}</div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Nenhum aviso ativo no momento.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content 2: USERS & SUBSCRIBERS */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <Users className="w-6 h-6 text-blue-500" />
                Médicos-Veterinários & Assinantes
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Controle de planos, concessão manual de assinaturas vitalícias e bloqueio temporário de acesso.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
                Total: <strong className="text-white">{filteredUsers.length}</strong> veterinários
              </span>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 bg-slate-900 p-3 rounded-xl border border-slate-800">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome, e-mail ou CRMV..."
                className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:border-blue-500 outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              <Filter className="w-3.5 h-3.5 text-slate-400 ml-1 shrink-0" />
              {(['ALL', 'FREE', 'PRO', 'LIFETIME'] as const).map((pl) => (
                <button
                  key={pl}
                  onClick={() => setPlanFilter(pl)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 ${
                    planFilter === pl
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {pl === 'ALL'
                    ? 'Todos'
                    : pl === 'FREE'
                    ? 'Gratuito'
                    : pl === 'PRO'
                    ? 'Pro'
                    : 'Vitalício'}
                </button>
              ))}
            </div>
          </div>

          {/* Lista Móvel (Card Compacto sem NENHUMA rolagem para o lado) */}
          <div className="block md:hidden space-y-2.5">
            {filteredUsers.map((u) => {
              const isExpanded = !!expandedUserIds[u.id];
              return (
                <div
                  key={u.id}
                  className={`bg-slate-900 border rounded-xl p-3 transition ${
                    isExpanded ? 'border-blue-500/60 bg-slate-900/95' : 'border-slate-800'
                  }`}
                >
                  {/* Linha Principal: Avatar, Nome, Plano e Botão de Ação */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 text-blue-400 flex items-center justify-center font-bold text-xs border border-slate-700 shrink-0">
                        {u.first_name[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-white text-xs truncate">
                          {u.first_name} {u.last_name}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {u.is_lifetime ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-purple-500/10 text-purple-300 border border-purple-500/30">
                              <Sparkles className="w-2.5 h-2.5 text-purple-400" />
                              Vitalício
                            </span>
                          ) : u.plan === 'PRO' ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                              <Check className="w-2.5 h-2.5 text-emerald-400" />
                              Pro
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                              Gratuito
                            </span>
                          )}
                          {!u.is_active && (
                            <span className="text-[10px] font-bold text-rose-400">
                              • Suspensa
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(u)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition shadow-xs cursor-pointer"
                      >
                        Plano
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleUserExpanded(u.id)}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800/80 border border-slate-700 transition cursor-pointer"
                        title={isExpanded ? 'Recolher' : 'Ver mais detalhes'}
                        aria-label={isExpanded ? 'Recolher' : 'Ver mais'}
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-blue-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Detalhes Expandidos (Apenas sob demanda) */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-slate-800 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-slate-500 text-[11px]">E-mail:</span>
                        <span className="text-slate-200 truncate max-w-[200px] font-mono text-[11px]">{u.email}</span>
                      </div>

                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-slate-500 text-[11px]">CRMV:</span>
                        <span className="text-blue-400 font-mono text-[11px]">
                          {u.crmv ? `CRMV-${u.crmv_uf} ${u.crmv}` : 'Não informado'}
                        </span>
                      </div>

                      {u.phone && (
                        <div className="flex items-center justify-between text-slate-300">
                          <span className="text-slate-500 text-[11px]">Telefone:</span>
                          <span className="text-slate-200 text-[11px]">{u.phone}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-slate-500 text-[11px]">Uso Clínico:</span>
                        <span className="text-slate-200 text-[11px]">
                          <strong>{u.tutors_count || 0}</strong> tutores • <strong>{u.patients_count || 0}</strong> pacientes
                        </span>
                      </div>

                      {u.plan === 'PRO' && u.subscription_end && !u.is_lifetime && (
                        <div className="flex items-center justify-between text-slate-300">
                          <span className="text-slate-500 text-[11px]">Validade:</span>
                          <span className="text-blue-400 font-mono text-[11px]">
                            Até {new Date(u.subscription_end).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      )}

                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setToggleUserTarget(u);
                            setToggleReason('');
                          }}
                          className={`text-xs font-semibold px-2 py-1 rounded transition border cursor-pointer ${
                            u.is_active
                              ? 'border-rose-800/80 text-rose-400 hover:bg-rose-950/40'
                              : 'border-emerald-800/80 text-emerald-400 hover:bg-emerald-950/40'
                          }`}
                        >
                          {u.is_active ? 'Suspender Conta' : 'Reativar Conta'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {filteredUsers.length === 0 && (
              <div className="py-8 text-center text-slate-500 text-xs bg-slate-900 border border-slate-800 rounded-xl">
                Nenhum médico-veterinário encontrado.
              </div>
            )}
          </div>

          {/* Desktop Users Table (visível apenas em md: ou superior) */}
          <div className="hidden md:block bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-sm">
            <div className="w-full">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Veterinário(a)</th>
                    <th className="py-3 px-4">Plano</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredUsers.map((u) => {
                    const isExpanded = !!expandedUserIds[u.id];
                    return (
                      <React.Fragment key={u.id}>
                        <tr className={`hover:bg-slate-800/40 transition ${isExpanded ? 'bg-slate-800/20' : ''}`}>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => toggleUserExpanded(u.id)}
                                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition cursor-pointer"
                                title={isExpanded ? 'Recolher detalhes' : 'Ver mais detalhes do usuário'}
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4 text-blue-400" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </button>
                              <div className="w-8 h-8 rounded-lg bg-slate-800 text-blue-400 flex items-center justify-center font-bold text-xs border border-slate-700 shrink-0">
                                {u.first_name[0]}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-white text-xs truncate">
                                  {u.first_name} {u.last_name}
                                </div>
                                <div className="text-[11px] text-slate-400 truncate">{u.email}</div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            {u.is_lifetime ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-500/10 text-purple-300 border border-purple-500/30 whitespace-nowrap">
                                <Sparkles className="w-3 h-3 text-purple-400" />
                                Vitalício
                              </span>
                            ) : u.plan === 'PRO' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 whitespace-nowrap">
                                <Check className="w-3 h-3 text-emerald-400" />
                                Pro
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700 whitespace-nowrap">
                                Gratuito
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            {u.is_active ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                Ativa
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                                Suspensa
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                            <button
                              onClick={() => toggleUserExpanded(u.id)}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer inline-flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>{isExpanded ? 'Menos' : 'Detalhes'}</span>
                            </button>

                            <button
                              onClick={() => handleOpenEditModal(u)}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition shadow-xs cursor-pointer"
                            >
                              Plano
                            </button>

                            <button
                              onClick={() => {
                                setToggleUserTarget(u);
                                setToggleReason('');
                              }}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer border ${
                                u.is_active
                                  ? 'border-rose-800/80 text-rose-400 hover:bg-rose-950/40'
                                  : 'border-emerald-800/80 text-emerald-400 hover:bg-emerald-950/40'
                              }`}
                            >
                              {u.is_active ? 'Suspender' : 'Reativar'}
                            </button>
                          </td>
                        </tr>

                        {/* Linha de Detalhes Expandidos sob Demanda */}
                        {isExpanded && (
                          <tr className="bg-slate-950/60 border-b border-slate-800/60">
                            <td colSpan={4} className="py-3 px-4">
                              <div className="grid grid-cols-3 gap-3 p-3 bg-slate-900/90 rounded-lg border border-slate-800 text-xs">
                                <div>
                                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">
                                    CRMV & Contato
                                  </span>
                                  <div className="font-mono text-blue-400 text-xs">
                                    {u.crmv ? `CRMV-${u.crmv_uf} ${u.crmv}` : 'Não informado'}
                                  </div>
                                  <div className="text-slate-300 mt-1 flex items-center gap-1.5 text-[11px]">
                                    <Phone className="w-3 h-3 text-slate-400" />
                                    <span>{u.phone || 'Sem telefone'}</span>
                                  </div>
                                  <div className="text-slate-400 text-[11px] flex items-center gap-1.5 mt-0.5">
                                    <Mail className="w-3 h-3 text-slate-400" />
                                    <span className="truncate">{u.email}</span>
                                  </div>
                                </div>

                                <div>
                                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">
                                    Uso e Cadastros
                                  </span>
                                  <div className="text-slate-200">
                                    <strong className="text-white">{u.tutors_count || 0}</strong> tutores cadastrados
                                  </div>
                                  <div className="text-slate-200 mt-0.5">
                                    <strong className="text-white">{u.patients_count || 0}</strong> pacientes cadastrados
                                  </div>
                                  <div className="text-slate-400 text-[10px] mt-1">
                                    Cadastro: {new Date(u.created_at).toLocaleDateString('pt-BR')}
                                  </div>
                                </div>

                                <div>
                                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">
                                    Assinatura & Validade
                                  </span>
                                  <div className="text-slate-300">
                                    {u.is_lifetime ? (
                                      <span className="text-purple-300 font-semibold">Acesso Vitalício Fundador</span>
                                    ) : u.plan === 'PRO' ? (
                                      <div>
                                        <span className="text-emerald-400 font-semibold">Pro Ativo</span>
                                        {u.subscription_end && (
                                          <div className="text-[11px] text-slate-400 mt-0.5">
                                            Expira em {new Date(u.subscription_end).toLocaleDateString('pt-BR')}
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-slate-400">Plano Gratuito (limites padrão)</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}

                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-500 text-xs">
                        Nenhum médico-veterinário encontrado com os filtros selecionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content 3: PLANS & PRICING CONFIGURATION */}
      {activeTab === 'plans' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <CreditCard className="w-6 h-6 text-blue-500" />
                Planos & Precificação da Plataforma
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Configuração das permissões, precificação oficial do SaaS Vetgo e regras de acesso aos módulos.
              </p>
            </div>

            <button
              onClick={() => setActiveTab('users')}
              className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer self-start sm:self-auto"
            >
              <Users className="w-4 h-4" />
              <span>Ativar Plano para Veterinário</span>
            </button>
          </div>

          {/* Dica sobre ativação com tempo configurável */}
          <div className="p-3.5 bg-blue-950/40 border border-blue-800/60 rounded-xl flex items-start gap-3 text-xs text-blue-200">
            <Clock className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block mb-0.5">Tempo de Ativação Manual Disponível:</strong>
              Para conceder ou alterar o tempo de um veterinário (1 Mês, 3 Meses, 6 Meses, 1 Ano ou data personalizada), acesse a aba{' '}
              <button
                onClick={() => setActiveTab('users')}
                className="underline font-bold text-blue-300 hover:text-white cursor-pointer"
              >
                Veterinários
              </button>{' '}
              e clique no botão <span className="font-semibold text-white">"Plano"</span> na linha do profissional.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((p) => (
              <div
                key={p.id}
                className={`bg-slate-900 rounded-2xl border p-6 flex flex-col justify-between relative shadow-sm ${
                  p.code === 'PRO'
                    ? 'border-blue-500 shadow-blue-500/10'
                    : p.code === 'LIFETIME'
                    ? 'border-purple-500/60'
                    : 'border-slate-800'
                }`}
              >
                {p.badge && (
                  <span
                    className={`absolute -top-3 left-6 px-3 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                      p.code === 'PRO'
                        ? 'bg-blue-600 text-white'
                        : p.code === 'LIFETIME'
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {p.badge}
                  </span>
                )}

                <div>
                  <div className="text-base font-bold text-white mt-1">{p.name}</div>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-black text-white">
                      R$ {p.price_monthly.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-xs text-slate-400">/mês</span>
                  </div>
                  {p.price_annual > 0 && (
                    <div className="text-[11px] text-emerald-400 mt-0.5">
                      ou R$ {p.price_annual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} /ano (15% desc)
                    </div>
                  )}

                  <div className="mt-6 space-y-2.5 border-t border-slate-800 pt-4 text-xs">
                    <div className="flex items-center justify-between text-slate-300">
                      <span>Limite de Pacientes</span>
                      <strong className="text-white">{p.max_patients}</strong>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span>Módulo de Anestesiologia</span>
                      {p.has_anesthesia ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Incluso
                        </span>
                      ) : (
                        <span className="text-slate-500">Bloqueado</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span>Módulo de Clínicas & Cirurgiões</span>
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Incluso
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span>Faturamento e Recibos</span>
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Incluso
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span>Logo Customizado em Documentos</span>
                      {p.has_custom_logo ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Incluso
                        </span>
                      ) : (
                        <span className="text-slate-500">Não incluso</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800">
                  <div className="text-[11px] text-slate-400 text-center">
                    Regra oficial do plano ativa no sistema
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Content 4: GLOBAL ANNOUNCEMENTS */}
      {activeTab === 'announcements' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <Megaphone className="w-6 h-6 text-blue-500" />
                Comunicados Globais da Plataforma
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Avisos e comunicados transmitidos aos médicos-veterinários logados no Vetgo.
              </p>
            </div>

            <button
              onClick={() => setShowAnnModal(true)}
              className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-blue-500/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Comunicado</span>
            </button>
          </div>

          <div className="space-y-3">
            {announcements.map((ann) => (
              <div
                key={ann.id}
                className="bg-slate-900 rounded-xl border border-slate-800 p-4 flex items-start justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        ann.type === 'SUCCESS'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : ann.type === 'WARNING'
                          ? 'bg-amber-500/20 text-amber-400'
                          : ann.type === 'ALERT'
                          ? 'bg-rose-500/20 text-rose-400'
                          : 'bg-blue-500/20 text-blue-400'
                      }`}
                    >
                      {ann.type}
                    </span>
                    <h3 className="text-sm font-bold text-white">{ann.title}</h3>
                  </div>
                  <p className="text-xs text-slate-300">{ann.message}</p>
                  <div className="text-[10px] text-slate-500 pt-1">
                    Publicado por: {ann.created_by} • {new Date(ann.created_at).toLocaleDateString('pt-BR')}
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteAnnouncement(ann.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition"
                  title="Excluir comunicado"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}

            {announcements.length === 0 && (
              <div className="bg-slate-900 rounded-xl border border-slate-800 p-8 text-center text-slate-500 text-xs">
                Nenhum comunicado ativo na plataforma.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Content 5: AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <History className="w-6 h-6 text-blue-500" />
                Trilha de Auditoria & Segurança
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Registro inalterável de todas as ações administrativas realizadas no Backoffice do Vetgo.
              </p>
            </div>
          </div>

          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Data & Horário</th>
                    <th className="py-3 px-4">Operador Admin</th>
                    <th className="py-3 px-4">Ação Executada</th>
                    <th className="py-3 px-4">Alvo</th>
                    <th className="py-3 px-4">Justificativa & Detalhes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('pt-BR')}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-white">{log.admin_name || 'Admin'}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 font-medium">
                        {log.target_user_name || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 text-xs">{log.details || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Edit Subscription Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-500" />
                Gerenciar Assinatura
              </h3>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
              <div>
                <strong>Veterinário(a):</strong> {selectedUser.first_name} {selectedUser.last_name}
              </div>
              <div>
                <strong>E-mail:</strong> {selectedUser.email}
              </div>
              {selectedUser.crmv && (
                <div>
                  <strong>CRMV:</strong> {selectedUser.crmv_uf}-{selectedUser.crmv}
                </div>
              )}
            </div>

            <form onSubmit={handleSaveSubscription} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Plano da Plataforma
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditPlan('FREE')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer text-center ${
                      editPlan === 'FREE'
                        ? 'bg-blue-600 text-white border-blue-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    Plano Gratuito
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditPlan('PRO')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer text-center ${
                      editPlan === 'PRO'
                        ? 'bg-blue-600 text-white border-blue-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    Plano Pro (R$ 18/mês)
                  </button>
                </div>
              </div>

              {/* Lifetime Switch */}
              <div className="p-3 bg-purple-950/20 border border-purple-900/40 rounded-xl">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <div className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      Conceder Assinatura Vitalícia
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Isenta o usuário de qualquer cobrança recorrente para sempre.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={isLifetime}
                    onChange={(e) => {
                      setIsLifetime(e.target.checked);
                      if (e.target.checked) {
                        setDurationPreset('NONE');
                      } else {
                        setDurationPreset('1M');
                      }
                    }}
                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-slate-950 border-slate-700"
                  />
                </label>
              </div>

              {/* Duração / Tempo de Ativação (quando não for vitalício e plano for PRO) */}
              {editPlan === 'PRO' && !isLifetime && (
                <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-blue-400 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-400" />
                      Tempo de Ativação do Plano Pro
                    </label>
                    <span className="text-[10px] text-slate-400 font-medium">Vigência Manual</span>
                  </div>

                  {/* Presets de Tempo */}
                  <div className="grid grid-cols-5 gap-1.5">
                    {[
                      { id: '1M', label: '1 Mês' },
                      { id: '3M', label: '3 Meses' },
                      { id: '6M', label: '6 Meses' },
                      { id: '1Y', label: '1 Ano' },
                      { id: 'CUSTOM', label: 'Outro' }
                    ].map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setDurationPreset(preset.id as any);
                          if (preset.id !== 'CUSTOM') {
                            const d = new Date();
                            if (preset.id === '1M') d.setMonth(d.getMonth() + 1);
                            if (preset.id === '3M') d.setMonth(d.getMonth() + 3);
                            if (preset.id === '6M') d.setMonth(d.getMonth() + 6);
                            if (preset.id === '1Y') d.setFullYear(d.getFullYear() + 1);
                            setCustomExpiryDate(d.toISOString().split('T')[0]);
                          }
                        }}
                        className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition text-center cursor-pointer ${
                          durationPreset === preset.id
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  {/* Data de Vencimento Específica */}
                  <div className="pt-1.5">
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Data Limite de Expiração:
                    </label>
                    <input
                      type="date"
                      value={customExpiryDate}
                      onChange={(e) => {
                        setCustomExpiryDate(e.target.value);
                        setDurationPreset('CUSTOM');
                      }}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:border-blue-500 outline-none"
                    />
                    {customExpiryDate && (
                      <p className="text-[10px] text-emerald-400 mt-1">
                        ✓ O acesso Pro será válido até {new Date(customExpiryDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Justification note */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Justificativa Obrigatória (para Trilha de Auditoria)
                </label>
                <textarea
                  required
                  rows={2}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Ex: Parceria institucional, early adopter ou teste..."
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:border-blue-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition cursor-pointer"
                >
                  {saving ? 'Salvando...' : 'Confirmar Alteração'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Suspend / Activate Modal */}
      {toggleUserTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                {toggleUserTarget.is_active ? (
                  <UserX className="w-5 h-5 text-rose-500" />
                ) : (
                  <UserCheck className="w-5 h-5 text-emerald-500" />
                )}
                {toggleUserTarget.is_active ? 'Suspender Acesso' : 'Reativar Conta'}
              </h3>
              <button
                onClick={() => setToggleUserTarget(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              {toggleUserTarget.is_active
                ? `Você está prestes a suspender a conta de ${toggleUserTarget.first_name} ${toggleUserTarget.last_name}. Ele não poderá acessar a área clínica enquanto estiver suspenso.`
                : `Você está reativando o acesso de ${toggleUserTarget.first_name} ${toggleUserTarget.last_name}.`}
            </p>

            <form onSubmit={handleToggleUserActive} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Motivo da Ação
                </label>
                <input
                  type="text"
                  required
                  value={toggleReason}
                  onChange={(e) => setToggleReason(e.target.value)}
                  placeholder="Ex: Solicitação do usuário, inadimplência, etc..."
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:border-blue-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setToggleUserTarget(null)}
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={toggling}
                  className={`px-4 py-2 rounded-lg text-xs font-bold text-white transition cursor-pointer ${
                    toggleUserTarget.is_active ? 'bg-rose-600 hover:bg-rose-500' : 'bg-emerald-600 hover:bg-emerald-500'
                  }`}
                >
                  {toggling ? 'Processando...' : toggleUserTarget.is_active ? 'Suspender Conta' : 'Reativar Conta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Announcement Modal */}
      {showAnnModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-blue-500" />
                Criar Comunicado da Plataforma
              </h3>
              <button
                onClick={() => setShowAnnModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAnnouncement} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Título do Comunicado
                </label>
                <input
                  type="text"
                  required
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  placeholder="Ex: Atualização do Módulo de Anestesia"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Mensagem Detalhada
                </label>
                <textarea
                  required
                  rows={3}
                  value={annMessage}
                  onChange={(e) => setAnnMessage(e.target.value)}
                  placeholder="Instruções ou informações para os veterinários..."
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Tipo de Comunicado
                </label>
                <select
                  value={annType}
                  onChange={(e) => setAnnType(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:border-blue-500 outline-none"
                >
                  <option value="INFO">Informativo (Azul)</option>
                  <option value="SUCCESS">Sucesso / Novidade (Verde)</option>
                  <option value="WARNING">Aviso / Manutenção (Amarelo)</option>
                  <option value="ALERT">Urgente / Alerta Crítico (Vermelho)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAnnModal(false)}
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingAnn}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition cursor-pointer"
                >
                  {creatingAnn ? 'Publicando...' : 'Publicar Comunicado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};
