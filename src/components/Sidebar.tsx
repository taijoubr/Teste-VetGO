import React, { useState, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { AppLogo } from './AppLogo';
import { PWAInstallSidebarCard } from './PWAInstallButton';
import {
  LayoutDashboard,
  Calendar,
  Users,
  PawPrint,
  Stethoscope,
  Building2,
  UserCheck,
  Activity,
  DollarSign,
  Package,
  Truck,
  BarChart3,
  FileText,
  Settings,
  Sliders,
  X,
  Cloud,
  RefreshCw,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { FirestoreSyncStatusModal } from './FirestoreSyncStatusModal';
import { getFirestoreSyncStats, firestoreSync } from '../services/firebase';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const isAnesthesiaEnabled = Boolean(user?.specialty_anesthesia_enabled);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [syncStats, setSyncStats] = useState(getFirestoreSyncStats());
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchPending = async () => {
      try {
        const appts = await api.getAppointments();
        if (isMounted) {
          const count = appts.filter((a) => a.status === 'PENDENTE').length;
          setPendingCount(count);
        }
      } catch {}
    };

    fetchPending();
    const interval = setInterval(fetchPending, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Monitoramento contínuo dos eventos de sincronização com o Firestore
  useEffect(() => {
    const updateStats = () => {
      setSyncStats(getFirestoreSyncStats());
    };
    updateStats();

    window.addEventListener('vetgo_sync_event', updateStats);
    const interval = setInterval(updateStats, 10000);
    return () => {
      window.removeEventListener('vetgo_sync_event', updateStats);
      clearInterval(interval);
    };
  }, []);

  const handleQuickSync = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isManualSyncing) return;
    setIsManualSyncing(true);
    try {
      await firestoreSync.syncAllToFirestore(user?.id ? String(user.id) : undefined);
      setSyncStats(getFirestoreSyncStats());
    } finally {
      setIsManualSyncing(false);
    }
  };

  const anesthesiaNavItems = [
    { name: 'Fichas Anestésicas', path: '/anestesia', icon: Activity },
    { name: 'Clínicas Parceiras', path: '/clinicas', icon: Building2 },
    { name: 'Cirurgiões', path: '/cirurgioes', icon: UserCheck },
  ];

  const mainNavItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Agenda', path: '/agenda', icon: Calendar },
    { name: 'Tutores', path: '/tutores', icon: Users },
    { name: 'Pacientes', path: '/pacientes', icon: PawPrint },
    { name: 'Atendimentos', path: '/atendimentos', icon: Stethoscope },
  ];

  const managementNavItems = [
    { name: 'Financeiro', path: '/financeiro', icon: DollarSign },
    { name: 'Estoque & Produtos', path: '/estoque', icon: Package },
    { name: 'Serviços & Exames', path: '/servicos', icon: Stethoscope },
    { name: 'Fornecedores', path: '/fornecedores', icon: Truck },
  ];

  const toolsNavItems = [
    { name: 'Relatórios', path: '/relatorios', icon: BarChart3 },
    { name: 'Documentos', path: '/documentos', icon: FileText },
    { name: 'Configurações', path: '/configuracoes', icon: Settings },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-40 md:hidden backdrop-blur-xs transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 md:z-20 h-screen w-64 bg-white border-r border-slate-200/90 flex flex-col transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <NavLink to="/" className="flex flex-col group py-1" onClick={onClose}>
            <AppLogo size="lg" />
          </NavLink>

          <button
            onClick={onClose}
            className="md:hidden p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Nav List */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 text-sm">
          {/* Anestesiologia Group */}
          {isAnesthesiaEnabled && (
            <div>
              <div className="px-3 mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Anestesiologia
              </div>
              <nav className="space-y-0.5">
                {anesthesiaNavItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-800 font-semibold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`
                    }
                  >
                    <item.icon className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>{item.name}</span>
                  </NavLink>
                ))}
              </nav>
            </div>
          )}

          {/* Main Group */}
          <div>
            <div className="px-3 mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Clínica & Atendimento
            </div>
            <nav className="space-y-0.5">
              {mainNavItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-800 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`
                  }
                >
                  <item.icon className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span className="flex-1">{item.name}</span>
                  {item.path === '/agenda' && pendingCount > 0 && (
                    <span
                      title={`${pendingCount} solicitação(ões) pendente(s)`}
                      className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white animate-pulse shrink-0"
                    >
                      {pendingCount}
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>

          {/* Management Group */}
          <div>
            <div className="px-3 mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Gestão & Estoque
            </div>
            <nav className="space-y-0.5">
              {managementNavItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-800 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`
                  }
                >
                  <item.icon className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>{item.name}</span>
                </NavLink>
              ))}
            </nav>
          </div>

          {/* Tools & Config */}
          <div>
            <div className="px-3 mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Utilitários
            </div>
            <nav className="space-y-0.5">
              <NavLink
                to="/configuracoes?tab=especialidades"
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2 rounded-lg font-medium transition ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-800 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Sliders className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Especialidades</span>
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                  {isAnesthesiaEnabled ? '1 ativa' : '0 ativas'}
                </span>
              </NavLink>
              {toolsNavItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-800 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`
                  }
                >
                  <item.icon className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>{item.name}</span>
                </NavLink>
              ))}
            </nav>
          </div>

          {/* Quick PWA Install Card on Mobile/Desktop */}
          <div className="pt-2 px-1">
            <PWAInstallSidebarCard />
          </div>

          {/* Firestore Cloud Sync Status Widget */}
          <div className="pt-2 px-1">
            <div className="p-2.5 bg-slate-50 border border-slate-200/90 rounded-xl hover:border-emerald-300 transition-colors shadow-2xs">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsSyncModalOpen(true)}
                  className="flex items-center gap-2 text-left group flex-1 mr-1"
                  title="Clique para ver o histórico e logs de sincronização"
                >
                  <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100 transition shrink-0">
                    <Cloud className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5 truncate">
                      <span>Nuvem Firestore</span>
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          syncStats.errorCount > 0 ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'
                        }`}
                      />
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">
                      {syncStats.errorCount > 0
                        ? `${syncStats.errorCount} falha(s) • Verificar`
                        : `${syncStats.successCount} registros salvos`}
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleQuickSync}
                  disabled={isManualSyncing}
                  title="Sincronizar tutores e pacientes locais com o Firestore agora"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-white border border-transparent hover:border-slate-200 transition disabled:opacity-50 shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isManualSyncing ? 'animate-spin text-emerald-600' : ''}`} />
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsSyncModalOpen(true)}
                className="w-full mt-2 pt-1.5 border-t border-slate-200/60 text-[10px] font-semibold text-emerald-700 hover:text-emerald-800 flex items-center justify-between group"
              >
                <span>Logs e Painel de Nuvem</span>
                <span className="group-hover:translate-x-0.5 transition-transform text-xs">→</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Vetgo v1.0 • Volante</span>
          <button
            type="button"
            onClick={() => setIsSyncModalOpen(true)}
            className="text-[10px] font-medium text-slate-500 hover:text-emerald-700 underline"
          >
            Status Nuvem
          </button>
        </div>
      </aside>

      {/* Firestore Sync Diagnostics Modal */}
      <FirestoreSyncStatusModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
      />
    </>
  );
};
