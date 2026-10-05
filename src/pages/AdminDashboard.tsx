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
  EyeOff,
  Copy,
  Phone,
  Mail,
  UserPlus,
  RotateCcw,
  Send,
  Server,
  ExternalLink
} from 'lucide-react';
import { api } from '../services/api';
import { GoogleLogoSvg } from '../components/GoogleSignInButton';

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

  // New Admin / User Modal
  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [newUserRole, setNewUserRole] = useState<'ADMIN' | 'VET'>('ADMIN');
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newCrmv, setNewCrmv] = useState('');
  const [newCrmvUf, setNewCrmvUf] = useState('SP');
  const [newPlan, setNewPlan] = useState<'FREE' | 'PRO'>('PRO');
  const [newIsLifetime, setNewIsLifetime] = useState(true);
  const [newUserNotes, setNewUserNotes] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);

  // New Announcement Modal
  const [showAnnModal, setShowAnnModal] = useState(false);
  const [annTitle, setAnnTitle] = useState('');

  // Database Reset Modal
  const [showResetDbModal, setShowResetDbModal] = useState(false);
  const [resetDbWord, setResetDbWord] = useState('');
  const [resettingDb, setResettingDb] = useState(false);
  const [resetDbSuccess, setResetDbSuccess] = useState<string | null>(null);

  const handleResetDatabase = async () => {
    if (resetDbWord.trim().toUpperCase() !== 'RESETAR') return;
    try {
      setResettingDb(true);
      const res = await api.resetTestData();
      setShowResetDbModal(false);
      setResetDbWord('');
      setResetDbSuccess(res.message || 'Base de dados de teste limpa com sucesso!');
      await loadAllData();
      setTimeout(() => setResetDbSuccess(null), 5000);
    } catch (e: any) {
      alert('Erro ao resetar banco de dados: ' + (e.message || e));
    } finally {
      setResettingDb(false);
    }
  };
  const [annMessage, setAnnMessage] = useState('');
  const [annType, setAnnType] = useState<'INFO' | 'WARNING' | 'ALERT' | 'SUCCESS'>('INFO');
  const [creatingAnn, setCreatingAnn] = useState(false);

  // SMTP / Email Server Settings (Admin Only)
  const [smtpForm, setSmtpForm] = useState({
    provider: 'gmail',
    user: '',
    pass: '',
    from_name: 'Vetgo',
    from_email: '',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    is_active: true,
  });
  const [smtpLoaded, setSmtpLoaded] = useState(false);
  const [smtpLoading, setSmtpLoading] = useState(false);
  const [smtpSaving, setSmtpSaving] = useState(false);
  const [testEmailTo, setTestEmailTo] = useState('admin@vetgo.com.br');
  const [testingEmail, setTestingEmail] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSmtpConfigured, setIsSmtpConfigured] = useState(false);
  const [smtpSuccessNotice, setSmtpSuccessNotice] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [copiedApiKey, setCopiedApiKey] = useState(false);

  // Google OAuth Settings State
  const [googleClientId, setGoogleClientId] = useState('');
  const [isGoogleConfigured, setIsGoogleConfigured] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleSaving, setGoogleSaving] = useState(false);
  const [googleSuccessNotice, setGoogleSuccessNotice] = useState<string | null>(null);

  const loadGoogleSettings = async () => {
    try {
      setGoogleLoading(true);
      const res = await api.getGoogleSettings();
      const finalId = res.client_id || '916489101501-qc2u92j7nhj0ou9j5et1frfu912eve3k.apps.googleusercontent.com';
      setGoogleClientId(finalId);
      setIsGoogleConfigured(Boolean(finalId && finalId.includes('.apps.googleusercontent.com')));
    } catch (e) {
      console.error('Erro ao carregar Google Client ID:', e);
      const fallbackId = '916489101501-qc2u92j7nhj0ou9j5et1frfu912eve3k.apps.googleusercontent.com';
      setGoogleClientId(fallbackId);
      setIsGoogleConfigured(true);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSaveGoogleSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setGoogleSaving(true);
      const res = await api.saveGoogleSettings(googleClientId);
      setIsGoogleConfigured(res.is_configured);
      setGoogleSuccessNotice(res.message || 'Configurações do Google salvas com sucesso!');
      setTimeout(() => setGoogleSuccessNotice(null), 4000);
    } catch (err: any) {
      alert('Erro ao salvar Google Client ID: ' + (err.message || err));
    } finally {
      setGoogleSaving(false);
    }
  };

  const loadAdminSmtpSettings = async () => {
    try {
      setSmtpLoading(true);
      const res = await api.getSMTPSettings();
      setSmtpForm({
        provider: res.provider || 'gmail',
        user: res.user || 'vetgoveterinarios@gmail.com',
        pass: res.pass || (res.has_password ? '••••••••' : 'zwhuxcxyfqtewqrb'),
        from_name: res.from_name || 'Vetgo',
        from_email: res.from_email || res.user || 'vetgoveterinarios@gmail.com',
        host: res.host || (res.provider === 'resend' ? 'smtp.resend.com' : 'smtp.gmail.com'),
        port: Number(res.port) || (res.provider === 'resend' ? 587 : 465),
        secure: res.secure !== false,
        is_active: res.is_active !== false,
      });
      setIsSmtpConfigured(res.is_configured);
      setSmtpLoaded(true);
    } catch (e) {
      console.error('Erro ao carregar configurações de SMTP no admin:', e);
      setSmtpForm({
        provider: 'gmail',
        user: 'vetgoveterinarios@gmail.com',
        pass: 'zwhuxcxyfqtewqrb',
        from_name: 'Vetgo',
        from_email: 'vetgoveterinarios@gmail.com',
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        is_active: true,
      });
      setIsSmtpConfigured(true);
      setSmtpLoaded(true);
    } finally {
      setSmtpLoading(false);
    }
  };

  const handleSaveAdminSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSmtpSaving(true);
      setSmtpSuccessNotice(null);
      const res = await api.saveSMTPSettings(smtpForm);
      setIsSmtpConfigured(res.is_configured);
      setSmtpSuccessNotice('Servidor de e-mails da plataforma configurado e salvo com sucesso!');
      setTimeout(() => setSmtpSuccessNotice(null), 5000);
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar configurações de e-mail.');
    } finally {
      setSmtpSaving(false);
    }
  };

  const handleSendAdminTestEmail = async () => {
    if (!testEmailTo.trim()) {
      alert('Informe um e-mail destinatário para o envio de teste.');
      return;
    }
    try {
      setTestingEmail(true);
      setTestEmailResult(null);
      const res = await api.sendTestEmail({
        to: testEmailTo.trim(),
        ...smtpForm,
      });
      setTestEmailResult({ success: true, message: res.message });
    } catch (err: any) {
      setTestEmailResult({
        success: false,
        message: err.message || 'Falha ao conectar com o servidor SMTP.',
      });
    } finally {
      setTestingEmail(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'smtp') {
      if (!smtpLoaded) {
        loadAdminSmtpSettings();
      }
      loadGoogleSettings();
    }
  }, [activeTab, smtpLoaded]);

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

  const handleDeleteUser = async (u: AdminUser) => {
    if (u.email === 'ncodestechnologies@gmail.com') {
      alert('Esta conta principal de administrador não pode ser excluída.');
      return;
    }
    const confirmMsg = `Tem certeza que deseja EXCLUIR permanentemente a conta de "${u.first_name} ${u.last_name || ''}" (${u.email})?\n\nEsta ação apagará o cadastro definitivamente do sistema.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await adminService.deleteUser(u.id);
      await loadAllData();
      alert(`Conta de ${u.email} excluída com sucesso!`);
    } catch (err: any) {
      alert(err?.message || 'Erro ao excluir usuário.');
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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserError(null);
    setCreatingUser(true);
    try {
      await adminService.createUser({
        email: newEmail,
        password: newPassword,
        first_name: newFirstName,
        last_name: newLastName,
        role: newUserRole,
        phone: newPhone || undefined,
        crmv: newUserRole === 'VET' ? newCrmv : undefined,
        crmv_uf: newUserRole === 'VET' ? newCrmvUf : undefined,
        plan: newUserRole === 'ADMIN' ? 'PRO' : newPlan,
        is_lifetime: newUserRole === 'ADMIN' ? true : newIsLifetime,
        admin_notes: newUserNotes || (newUserRole === 'ADMIN' ? 'Administrador cadastrado via controle interno' : undefined),
      });
      setShowNewUserModal(false);
      setNewFirstName('');
      setNewLastName('');
      setNewEmail('');
      setNewPassword('');
      setNewPhone('');
      setNewCrmv('');
      setNewUserNotes('');
      await loadAllData();
    } catch (err: any) {
      setUserError(err.message || 'Erro ao criar usuário.');
    } finally {
      setCreatingUser(false);
    }
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

              {/* Database Maintenance & Reset */}
              <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <RotateCcw className="w-4 h-4 text-rose-400" />
                    Manutenção & Base de Dados
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    Admin Only
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Opção restrita à administração para redefinir o banco de dados e apagar dados inseridos nos testes, restaurando o estado inicial limpo do sistema.
                </p>
                {resetDbSuccess && (
                  <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800 text-xs text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{resetDbSuccess}</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setResetDbWord('');
                    setShowResetDbModal(true);
                  }}
                  className="w-full py-2.5 px-3 text-xs font-bold bg-rose-600/15 hover:bg-rose-600/25 text-rose-400 border border-rose-500/30 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Resetar Base de Dados de Teste</span>
                </button>
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

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setNewUserRole('ADMIN');
                  setUserError(null);
                  setShowNewUserModal(true);
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 transition shadow-sm cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                Cadastrar Administrador / Usuário
              </button>
              <span className="text-xs text-slate-400 bg-slate-900 border border-slate-800 px-3 py-2 rounded-xl">
                Total: <strong className="text-white">{filteredUsers.length}</strong> usuários
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

                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                        {u.email !== 'ncodestechnologies@gmail.com' ? (
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u)}
                            className="text-xs font-semibold px-2 py-1 rounded transition border border-rose-900/60 text-rose-400 hover:bg-rose-950/50 flex items-center gap-1 cursor-pointer"
                            title="Excluir conta definitivamente"
                          >
                            <Trash2 className="w-3 h-3 text-rose-500" />
                            <span>Excluir</span>
                          </button>
                        ) : <div />}

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

                            {u.email !== 'ncodestechnologies@gmail.com' && (
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(u)}
                                className="p-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-800/60 transition cursor-pointer"
                                title="Excluir conta definitivamente"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                              </button>
                            )}
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

      {/* Tab Content 6: SMTP / EMAIL SERVER CONFIGURATION (EXCLUSIVO ADMIN) */}
      {activeTab === 'smtp' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <Mail className="w-6 h-6 text-blue-500" />
                Servidor de Envio de E-mails (Gmail / SMTP)
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Configuração restrita ao Administrador para disparo automático de e-mails em toda a plataforma Vetgo.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Restrito aos Administradores
              </span>
              {isSmtpConfigured ? (
                <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Servidor Conectado
                </span>
              ) : (
                <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Pendente de Configuração
                </span>
              )}
            </div>
          </div>

          {smtpSuccessNotice && (
            <div className="p-4 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-medium flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{smtpSuccessNotice}</span>
            </div>
          )}

          {/* Guia rápido Gmail */}
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Onde gerar a Senha de Aplicativo de 16 dígitos do Google:
            </h3>
            <ol className="list-decimal list-inside text-xs text-slate-300 space-y-2 pl-1 leading-relaxed">
              <li>
                <strong>Passo 1 (Obrigatório):</strong> Ative a <strong>Verificação em duas etapas (2FA)</strong> na sua Conta Google em{' '}
                <a
                  href="https://myaccount.google.com/signinoptions/two-step-verification"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-400 underline font-semibold hover:text-blue-300 inline-flex items-center gap-1"
                >
                  myaccount.google.com/security <ExternalLink className="w-3 h-3" />
                </a>.
                <span className="block text-[11px] text-amber-400/90 ml-4 mt-0.5">
                  ⚠️ Se a Verificação em duas etapas estiver desativada, o Google NÃO exibe a opção de Senha de App!
                </span>
              </li>
              <li>
                <strong>Passo 2:</strong> Acesse o link direto para criar a senha:{' '}
                <a
                  href="https://myaccount.google.com/apppasswords"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-400 underline font-semibold hover:text-blue-300 inline-flex items-center gap-1"
                >
                  myaccount.google.com/apppasswords <ExternalLink className="w-3 h-3" />
                </a>.
                <span className="block text-[11px] text-slate-400 ml-4 mt-0.5">
                  (Ou na barra de pesquisa no topo da sua Conta Google, pesquise por <em>"Senhas de app"</em>).
                </span>
              </li>
              <li>
                <strong>Passo 3:</strong> No campo <strong>"Nome do app"</strong>, digite <strong>Vetgo</strong> e clique em <strong>Criar</strong>.
              </li>
              <li>
                <strong>Passo 4:</strong> O Google gerará uma senha de <strong>16 letras minúsculas</strong> em uma caixa amarela (ex: <code className="bg-slate-950 px-1.5 py-0.5 rounded font-mono text-emerald-400 font-bold">abcd efgh ijkl mnop</code>).
              </li>
              <li>
                <strong>Passo 5:</strong> Cole o seu e-mail do Gmail e essa senha de 16 caracteres no formulário abaixo e clique em <strong>Salvar Configurações</strong>.
              </li>
            </ol>
          </div>

          {/* Formulário de Configuração SMTP */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 sm:p-6 space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Server className="w-4 h-4 text-blue-500" />
                Parâmetros de Conexão do Servidor
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Estes dados são compartilhados internamente pela API para entrega de validações de cadastro e alertas.
              </p>
            </div>

            <form onSubmit={handleSaveAdminSmtp} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Tipo de Provedor de E-mail
                  </label>
                  <select
                    value={smtpForm.provider}
                    onChange={(e) => {
                      const prov = e.target.value;
                      setSmtpForm({
                        ...smtpForm,
                        provider: prov,
                        from_email: prov === 'resend' ? (smtpForm.from_email || 'onboarding@resend.dev') : smtpForm.from_email,
                        host: prov === 'resend' ? 'smtp.resend.com' : (prov === 'gmail' ? 'smtp.gmail.com' : smtpForm.host),
                        port: prov === 'gmail' ? 465 : 587,
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white outline-none focus:border-blue-500"
                  >
                    <option value="resend">Resend (Recomendado - API Oficial com Alta Entregabilidade)</option>
                    <option value="gmail">Gmail (SMTP com Senha de Aplicativo Google)</option>
                    <option value="smtp">Servidor SMTP Personalizado (SendGrid, Mailgun, Amazon SES, cPanel)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nome do Remetente (Exibido aos destinatários)
                  </label>
                  <input
                    type="text"
                    required
                    value={smtpForm.from_name}
                    onChange={(e) => setSmtpForm({ ...smtpForm, from_name: e.target.value })}
                    placeholder="Ex: Vetgo • Gestão Veterinária"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {smtpForm.provider === 'resend' ? (
                /* RESEND API CONFIGURATION */
                <div className="space-y-4 pt-2 border-t border-slate-800">
                  <div className="p-3.5 bg-blue-950/40 border border-blue-800/60 rounded-xl text-xs space-y-2">
                    <div className="font-bold text-blue-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                      Como configurar o Resend em 2 minutos (3.000 envios/mês gratuitos):
                    </div>
                    <ol className="list-decimal list-inside text-slate-300 space-y-1 text-[11px]">
                      <li>Crie sua conta gratuita em <a href="https://resend.com" target="_blank" rel="noreferrer" className="text-blue-400 underline font-semibold">resend.com</a>.</li>
                      <li>Acesse o menu <strong>API Keys</strong> e crie uma chave (começa com <code className="bg-slate-900 px-1 py-0.5 rounded text-blue-300 font-mono">re_...</code>).</li>
                      <li>Para testes imediatos, utilize o remetente <code className="bg-slate-900 px-1 py-0.5 rounded text-blue-300 font-mono">onboarding@resend.dev</code> e dispare o teste para o mesmo e-mail da sua conta Resend.</li>
                      <li>Para enviar para qualquer pessoa em produção, verifique seu domínio próprio em <strong>Domains</strong> no painel do Resend.</li>
                    </ol>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-slate-300">
                          Chave de API do Resend (API Key) *
                        </label>
                        {smtpForm.pass && smtpForm.pass !== '••••••••' && (
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(smtpForm.pass);
                              setCopiedApiKey(true);
                              setTimeout(() => setCopiedApiKey(false), 2000);
                            }}
                            className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer transition"
                            title="Copiar chave de API"
                          >
                            {copiedApiKey ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedApiKey ? 'Copiada!' : 'Copiar Chave'}</span>
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <input
                          type={showApiKey ? 'text' : 'password'}
                          required
                          value={smtpForm.pass}
                          onChange={(e) => setSmtpForm({ ...smtpForm, pass: e.target.value })}
                          placeholder="re_123456789abcdef..."
                          className="w-full pl-3 pr-10 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white outline-none focus:border-blue-500 font-mono tracking-wider"
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 cursor-pointer transition"
                          title={showApiKey ? 'Ocultar chave' : 'Visualizar chave'}
                        >
                          {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      {smtpForm.pass && (
                        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>
                            Chave ativa e salva no servidor:{' '}
                            <strong className="font-mono text-emerald-300">
                              {smtpForm.pass.startsWith('re_')
                                ? `${smtpForm.pass.slice(0, 7)}...${smtpForm.pass.slice(-4)}`
                                : 're_H752...HKYj'}
                            </strong>
                          </span>
                        </div>
                      )}
                      <span className="text-[11px] text-slate-500 mt-1 block">
                        Sua chave começa com "re_". Ela <strong>nunca é resetada</strong> e permanece armazenada de forma segura no servidor.
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        E-mail Remetente (From) *
                      </label>
                      <input
                        type="text"
                        required
                        value={smtpForm.from_email || 'onboarding@resend.dev'}
                        onChange={(e) => setSmtpForm({ ...smtpForm, from_email: e.target.value, user: e.target.value })}
                        placeholder="onboarding@resend.dev ou contato@seudominio.com.br"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white outline-none focus:border-blue-500 font-mono"
                      />
                      <span className="text-[11px] text-slate-500 mt-1 block">
                        Use <strong className="text-slate-400">onboarding@resend.dev</strong> para testes rápidos, ou seu e-mail próprio verificado no Resend.
                      </span>
                      {/@(gmail|hotmail|outlook|yahoo)\.com/i.test(smtpForm.from_email) && (
                        <div className="mt-2 p-2 bg-amber-950/50 border border-amber-500/40 rounded-lg text-[11px] text-amber-300">
                          ⚠️ <strong>Atenção:</strong> O Resend não aceita e-mails gratuitos (como @gmail.com) no campo remetente. O sistema usará automaticamente <code>onboarding@resend.dev</code> para garantir a entrega sem erros de validação.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* GMAIL & SMTP CONFIGURATION */
                <div className="space-y-4 pt-2 border-t border-slate-800">
                  {smtpForm.provider === 'gmail' && (
                    <div className="p-3.5 bg-blue-950/40 border border-blue-800/60 rounded-xl text-xs space-y-2">
                      <div className="font-bold text-blue-300 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                          Onde criar a Senha de Aplicativo do Gmail:
                        </span>
                        <a
                          href="https://myaccount.google.com/apppasswords"
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-blue-400 underline font-semibold hover:text-blue-300 inline-flex items-center gap-1"
                        >
                          Abrir myaccount.google.com/apppasswords <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <div className="text-[11px] text-slate-300 space-y-1">
                        <p>
                          <strong>Importante:</strong> Se a página indicar que não está disponível, acesse{' '}
                          <a
                            href="https://myaccount.google.com/signinoptions/two-step-verification"
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-400 underline hover:text-blue-300"
                          >
                            Verificação em 2 etapas
                          </a>{' '}
                          e ative-a primeiro. Sem a verificação em 2 etapas ligada, o Google oculta essa opção.
                        </p>
                        <p className="text-slate-400">
                          Se preferir não mexer nas configurações da sua conta Google, você pode selecionar <strong>Resend</strong> acima (leva menos de 2 minutos e é gratuito).
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        E-mail do Remetente (Gmail ou Usuário SMTP) *
                      </label>
                      <input
                        type="email"
                        required
                        value={smtpForm.user}
                        onChange={(e) => setSmtpForm({ ...smtpForm, user: e.target.value, from_email: e.target.value })}
                        placeholder="admin@vetgo.com.br ou seuemail@gmail.com"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white outline-none focus:border-blue-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        {smtpForm.provider === 'gmail' ? 'Senha de Aplicativo Google (16 caracteres) *' : 'Senha do Servidor SMTP *'}
                      </label>
                      <input
                        type="password"
                        value={smtpForm.pass}
                        onChange={(e) => setSmtpForm({ ...smtpForm, pass: e.target.value })}
                        placeholder={smtpForm.provider === 'gmail' ? 'ex: abcd efgh ijkl mnop' : '••••••••'}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white outline-none focus:border-blue-500 font-mono"
                      />
                      <span className="text-[11px] text-slate-500 mt-1 block">
                        {smtpForm.provider === 'gmail'
                          ? 'Utilize a Senha de App criada no Google (16 caracteres), nunca sua senha normal.'
                          : 'Senha de autenticação do seu servidor SMTP.'}
                      </span>
                    </div>
                  </div>

                  {smtpForm.provider === 'smtp' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Host SMTP</label>
                        <input
                          type="text"
                          value={smtpForm.host}
                          onChange={(e) => setSmtpForm({ ...smtpForm, host: e.target.value })}
                          placeholder="smtp.seudominio.com"
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white outline-none focus:border-blue-500 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Porta SMTP</label>
                        <input
                          type="number"
                          value={smtpForm.port}
                          onChange={(e) => setSmtpForm({ ...smtpForm, port: Number(e.target.value) || 587 })}
                          placeholder="465 ou 587"
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white outline-none focus:border-blue-500 font-mono"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-slate-800 flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="admin-smtp-active"
                    checked={smtpForm.is_active}
                    onChange={(e) => setSmtpForm({ ...smtpForm, is_active: e.target.checked })}
                    className="rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="admin-smtp-active" className="text-xs font-semibold text-slate-300 cursor-pointer">
                    Habilitar envio automático de e-mails em produção
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={smtpSaving}
                  className="px-5 py-2.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  <Server className="w-3.5 h-3.5" />
                  <span>{smtpSaving ? 'Salvando Servidor...' : 'Salvar Configurações Globais'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Card de Teste de Disparo em Tempo Real */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 sm:p-6 space-y-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Send className="w-3.5 h-3.5 text-blue-500" />
                Disparo de Teste do Servidor em Tempo Real
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Dispare um e-mail de teste para verificar a comunicação com o provedor SMTP e a entrega na caixa de entrada.
              </p>
            </div>

            <div className="space-y-1.5 max-w-lg">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  value={testEmailTo}
                  onChange={(e) => setTestEmailTo(e.target.value)}
                  placeholder="destinatario@dominio.com"
                  className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white outline-none focus:border-blue-500 font-mono"
                />
                <button
                  type="button"
                  onClick={handleSendAdminTestEmail}
                  disabled={testingEmail || !testEmailTo.trim()}
                  className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 shrink-0"
                >
                  {testingEmail ? (
                    <span>Testando Conexão...</span>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Disparar E-mail de Teste</span>
                    </>
                  )}
                </button>
              </div>
              <span className="text-[11px] text-slate-500 block leading-relaxed">
                {smtpForm.provider === 'resend'
                  ? '💡 Dica: no modo sandbox do Resend (onboarding@resend.dev), envie o teste para o e-mail cadastrado na sua conta Resend (ex: vetgoveterinarios@gmail.com). Para enviar para qualquer e-mail, adicione seu domínio em resend.com/domains.'
                  : 'Informe o endereço de e-mail que receberá a mensagem de teste.'}
              </span>
            </div>

            {testEmailResult && (
              <div
                className={`p-3.5 rounded-xl text-xs flex items-start gap-2 border ${
                  testEmailResult.success
                    ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                    : 'bg-rose-950/60 text-rose-300 border-rose-500/40'
                }`}
              >
                {testEmailResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <span className="leading-relaxed">{testEmailResult.message}</span>
              </div>
            )}
          </div>

          {/* ------------------------------------------------------------- */}
          {/* GOOGLE SIGN-IN / OAUTH CONFIGURATION CARD */}
          {/* ------------------------------------------------------------- */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 sm:p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <GoogleLogoSvg className="w-5 h-5 shrink-0" />
                  Autenticação e Cadastro com Conta Google (Google Sign-In)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Configure o Google Client ID para permitir login e criação instantânea de contas com o Google oficial no Vetgo.
                </p>
              </div>

              <div>
                {isGoogleConfigured ? (
                  <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Google OAuth Conectado
                  </span>
                ) : (
                  <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Client ID Pendente
                  </span>
                )}
              </div>
            </div>

            {googleSuccessNotice && (
              <div className="p-4 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-medium flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{googleSuccessNotice}</span>
              </div>
            )}

            {/* Passo a Passo para criar no Google Cloud Console */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Como configurar seu Google Client ID (Gratuito - 2 minutos):
              </h4>
              <ol className="list-decimal list-inside text-xs text-slate-300 space-y-2 leading-relaxed">
                <li>
                  Acesse o painel oficial de credenciais do Google Cloud Console:{' '}
                  <a
                    href="https://console.cloud.google.com/apis/credentials"
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-400 underline font-semibold hover:text-blue-300 inline-flex items-center gap-1"
                  >
                    console.cloud.google.com/apis/credentials <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
                <li>
                  Crie ou selecione seu projeto (ex: <strong>Vetgo</strong>).
                </li>
                <li>
                  Se for seu primeiro acesso, configure a <strong>Tela de permissão OAuth</strong>: selecione <em>Externo</em>, preencha o Nome do aplicativo como <em>Vetgo</em> e o seu e-mail de suporte.
                </li>
                <li>
                  No menu <strong>Credenciais</strong>, clique no botão <strong>+ CRIAR CREDENCIAIS</strong> e selecione <strong>ID do cliente OAuth</strong>.
                </li>
                <li>
                  Escolha o Tipo de aplicativo: <strong>Aplicativo da Web</strong>.
                </li>
                <li>
                  No campo <strong>Origens JavaScript autorizadas</strong>, adicione as URLs do seu site:
                  <div className="mt-1.5 p-2 bg-slate-900 border border-slate-800 rounded font-mono text-[11px] text-emerald-400 space-y-1">
                    <div>https://teste-vetgo.vercel.app</div>
                    <div>http://localhost:3000</div>
                    <div>http://localhost:5173</div>
                  </div>
                </li>
                <li>
                  Clique em <strong>Criar</strong>. O Google exibirá seu <strong>ID do cliente</strong> (termina em <code className="text-blue-300 font-mono">.apps.googleusercontent.com</code>).
                </li>
                <li>
                  Cole o código gerado no campo abaixo e clique em <strong>Salvar Google Client ID</strong>!
                </li>
              </ol>
            </div>

            {/* Formulário de salvamento do Client ID */}
            <form onSubmit={handleSaveGoogleSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Google Client ID (ID do cliente OAuth 2.0 da Web)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={googleClientId}
                    onChange={(e) => setGoogleClientId(e.target.value.trim())}
                    placeholder="Ex: 123456789012-xxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com"
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white outline-none focus:border-blue-500 font-mono placeholder-slate-600"
                  />
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  💡 Este Client ID é salvo instantaneamente no sistema e ativa a autenticação Google oficial tanto no Login quanto no Cadastro.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="submit"
                  disabled={googleSaving}
                  className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {googleSaving ? (
                    <span>Salvando...</span>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Salvar Google Client ID</span>
                    </>
                  )}
                </button>
              </div>
            </form>
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

      {/* New Admin / User Modal (Controle Interno) */}
      {showNewUserModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Novo Cadastro no Controle Interno
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Cadastre novos administradores ou médicos-veterinários na plataforma.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewUserModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {userError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{userError}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Tipo de Acesso / Perfil
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNewUserRole('ADMIN');
                      setNewPlan('PRO');
                      setNewIsLifetime(true);
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      newUserRole === 'ADMIN'
                        ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Administrador (Backoffice)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewUserRole('VET');
                      setNewPlan('PRO');
                      setNewIsLifetime(false);
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      newUserRole === 'VET'
                        ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    Médico-Veterinário
                  </button>
                </div>
                {newUserRole === 'ADMIN' && (
                  <p className="text-[11px] text-blue-400/90 mt-1.5 bg-blue-950/40 border border-blue-900/40 p-2 rounded-lg">
                    🛡️ <strong>Administrador do Sistema:</strong> Terá acesso total ao controle interno, backoffice, métricas e gestão de usuários.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nome *
                  </label>
                  <input
                    type="text"
                    required
                    value={newFirstName}
                    onChange={(e) => setNewFirstName(e.target.value)}
                    placeholder="Ex: Nikolas"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Sobrenome
                  </label>
                  <input
                    type="text"
                    value={newLastName}
                    onChange={(e) => setNewLastName(e.target.value)}
                    placeholder="Ex: Silva"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    E-mail de Login *
                  </label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="ex: admin.novo@vetgo.com"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Senha de Acesso *
                  </label>
                  <input
                    type="text"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:border-blue-500 outline-none"
                  />
                </div>

                {newUserRole === 'VET' ? (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        CRMV
                      </label>
                      <input
                        type="text"
                        value={newCrmv}
                        onChange={(e) => setNewCrmv(e.target.value)}
                        placeholder="Ex: 12345"
                        className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        UF
                      </label>
                      <select
                        value={newCrmvUf}
                        onChange={(e) => setNewCrmvUf(e.target.value)}
                        className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:border-blue-500 outline-none"
                      >
                        {['SP', 'RJ', 'MG', 'RS', 'PR', 'SC', 'BA', 'PE', 'CE', 'GO', 'DF'].map((uf) => (
                          <option key={uf} value={uf}>{uf}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Plano Administrativo
                    </label>
                    <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Pro Vitalício (Acesso Irrestrito)
                    </div>
                  </div>
                )}
              </div>

              {newUserRole === 'VET' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Plano Inicial
                    </label>
                    <select
                      value={newPlan}
                      onChange={(e) => setNewPlan(e.target.value as 'FREE' | 'PRO')}
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:border-blue-500 outline-none"
                    >
                      <option value="FREE">Gratuito (Até 15 pacientes)</option>
                      <option value="PRO">Pro (Ilimitado - R$ 18/mês)</option>
                    </select>
                  </div>
                  <div className="flex items-end pb-1">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={newIsLifetime}
                        onChange={(e) => setNewIsLifetime(e.target.checked)}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-950 border-slate-700"
                      />
                      <span>Conceder acesso vitalício gratuito</span>
                    </label>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Notas Internas (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={newUserNotes}
                  onChange={(e) => setNewUserNotes(e.target.value)}
                  placeholder="Informações adicionais sobre o cadastro..."
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:border-blue-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewUserModal(false)}
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition cursor-pointer flex items-center gap-1.5"
                >
                  {creatingUser ? (
                    'Salvando...'
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      Cadastrar {newUserRole === 'ADMIN' ? 'Administrador' : 'Usuário'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmar Reset da Base de Dados */}
      {showResetDbModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-rose-500/50 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-white">
                  Resetar Base de Dados de Teste
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Atenção: Esta ação é irreversível. Todos os dados inseridos pelos veterinários nos testes (pacientes, tutores, atendimentos e financeiro) serão apagados para deixar a base 100% limpa.
                </p>
              </div>
            </div>

            <div className="p-3 bg-rose-950/40 border border-rose-900/60 rounded-xl space-y-1.5 text-xs text-rose-300">
              <div className="font-semibold text-rose-200">O que será resetado:</div>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-rose-300/90">
                <li>Todos os pacientes e tutores cadastrados</li>
                <li>Todos os atendimentos, orçamentos e fichas</li>
                <li>Todos os lançamentos do módulo financeiro</li>
                <li>Itens de estoque inseridos nos testes</li>
              </ul>
              <div className="pt-1 text-[11px] text-slate-400">
                * As contas de usuários oficiais e a tabela base de serviços são preservadas.
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Para confirmar, digite <span className="text-rose-400 font-bold font-mono">RESETAR</span> abaixo:
              </label>
              <input
                type="text"
                value={resetDbWord}
                onChange={(e) => setResetDbWord(e.target.value)}
                placeholder="RESETAR"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white font-mono placeholder-slate-600 focus:border-rose-500 outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setShowResetDbModal(false);
                  setResetDbWord('');
                }}
                disabled={resettingDb}
                className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleResetDatabase}
                disabled={resetDbWord.trim().toUpperCase() !== 'RESETAR' || resettingDb}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{resettingDb ? 'Limpando Base...' : 'Confirmar Limpeza Total'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};
