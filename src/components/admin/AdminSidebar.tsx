import React from 'react';
import {
  ShieldCheck,
  LayoutDashboard,
  Users,
  CreditCard,
  History,
  Megaphone,
  X,
  Server
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { AppLogo } from '../AppLogo';

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab?: string;
  onSelectTab?: (tab: string) => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  isOpen,
  onClose,
  activeTab,
  onSelectTab
}) => {
  const { user } = useAuth();

  const navItems = [
    {
      id: 'overview',
      name: 'Métricas & KPIs SaaS',
      icon: LayoutDashboard,
      badge: 'Tempo Real'
    },
    {
      id: 'users',
      name: 'Veterinários & Assinantes',
      icon: Users,
      badge: 'Contas'
    },
    {
      id: 'plans',
      name: 'Planos & Precificação',
      icon: CreditCard,
      badge: 'R$ 18/mês'
    },
    {
      id: 'announcements',
      name: 'Comunicados Globais',
      icon: Megaphone
    },
    {
      id: 'audit',
      name: 'Trilha de Auditoria',
      icon: History,
      badge: 'Segurança'
    }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs md:hidden"
          onClick={onClose}
        />
      )}

      {/* Admin Sidebar Container */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-100 flex flex-col transition-transform duration-200 ease-in-out border-r border-slate-800 ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-20 flex items-center justify-between px-5 border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-2">
            <AppLogo size="md" variant="light" badge="Admin" />
          </div>

          <button
            onClick={onClose}
            className="md:hidden p-1.5 text-slate-400 hover:text-white rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Environment Alert Banner */}
        <div className="px-4 py-2.5 bg-blue-950/40 border-b border-blue-900/40">
          <div className="flex items-center gap-2 text-xs text-blue-300 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Ambiente Superadmin Ativo</span>
          </div>
          <p className="text-[10px] text-blue-400/80 mt-0.5 leading-tight">
            Gestão restrita aos operadores da plataforma
          </p>
        </div>

        {/* Nav Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Administração da Plataforma
          </div>

          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (onSelectTab) onSelectTab(item.id);
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon
                    className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`}
                  />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                      isActive
                        ? 'bg-blue-500 text-white'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer & Account Switcher for Testing */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 space-y-2">
          {/* Quick profile switch for evaluation */}
          <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-[11px] space-y-1.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
              Alternar Conta (Demo):
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={async () => {
                  await (window as any).__switchDemoRole?.('VET');
                  window.location.href = '/';
                }}
                className="flex-1 py-1 px-1.5 rounded text-[10px] font-bold bg-emerald-950/80 text-emerald-300 hover:bg-emerald-900/80 border border-emerald-800/50 text-center transition cursor-pointer"
                title="Sair do Admin e logar como Médica-Veterinária"
              >
                Dra. Carolina (Vet)
              </button>
              <button
                type="button"
                onClick={async () => {
                  await (window as any).__switchDemoRole?.('ADMIN');
                }}
                className="flex-1 py-1 px-1.5 rounded text-[10px] font-bold bg-blue-900 text-blue-200 border border-blue-700 text-center transition cursor-pointer"
                title="Permanecer no Admin"
              >
                Superadmin
              </button>
            </div>
          </div>

          <div className="text-[10px] text-slate-500 text-center flex items-center justify-center gap-1.5 pt-0.5">
            <Server className="w-3 h-3 text-slate-600" />
            <span>Vetgo SaaS Engine v1.0</span>
          </div>
        </div>
      </aside>
    </>
  );
};
