import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AppLogo } from './AppLogo';
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
  X
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const isAnesthesiaEnabled = Boolean(user?.specialty_anesthesia_enabled);

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
                  <span>{item.name}</span>
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
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-slate-100 text-[11px] text-slate-400 text-center">
          Vetgo v1.0 • Atendimento Volante
        </div>
      </aside>
    </>
  );
};
