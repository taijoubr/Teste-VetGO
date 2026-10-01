import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, User as UserIcon, Sparkles, HeartPulse, Menu, Activity, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PWAInstallButton } from './PWAInstallButton';

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const isAnesthesiaActive = Boolean(user?.specialty_anesthesia_enabled);

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200/80 px-4 sm:px-6 py-2.5 transition-all">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Mobile Toggle & Brand Indicator */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-2 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
            aria-label="Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="hidden sm:flex flex-col">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Ambiente do Médico-Veterinário
            </span>
            <span className="text-sm font-medium text-slate-700">
              {user?.clinic_name || `${user?.first_name} ${user?.last_name}`}
            </span>
          </div>
        </div>

        {/* Right: Plan Badge, User Info, Logout */}
        <div className="flex items-center gap-3">
          {/* Plan badge and Specialty badge for vet */}
          {user && (
            <div className="flex items-center gap-2">
              <Link
                to="/configuracoes?tab=especialidades"
                className={`hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border transition ${
                  isAnesthesiaActive
                    ? 'bg-emerald-50/80 text-emerald-800 border-emerald-200/80 hover:bg-emerald-100/80'
                    : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                }`}
                title="Ligar / Desligar especialidades (Anestesiologia)"
              >
                <Activity className="w-3 h-3 text-emerald-700" />
                <span>{isAnesthesiaActive ? 'Anestesiologia' : 'Especialidades'}</span>
              </Link>

              {user.is_lifetime ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200/60 rounded-full">
                  <Sparkles className="w-3 h-3 text-purple-500" />
                  Assinatura Vitalícia
                </span>
              ) : user.plan === 'PRO' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/60 rounded-full">
                  <HeartPulse className="w-3 h-3 text-emerald-600" />
                  Plano Pro Ativo
                </span>
              ) : (
                <Link
                  to="/configuracoes?tab=assinatura"
                  title="Gerenciar plano e assinatura"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-full transition"
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span>Plano Gratuito</span>
                </Link>
              )}
            </div>
          )}

          {/* Quick Push Notification & Install Buttons */}
          <div className="flex items-center gap-1">
            <PWAInstallButton compact={true} />
            <Link
              to="/configuracoes?tab=notificacoes"
              title="Central de Notificações Push"
              className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
            >
              <Bell className="w-4 h-4" />
            </Link>
          </div>

          {/* User profile dropdown / preview */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs shadow-sm">
              {user?.first_name?.charAt(0) || 'V'}
            </div>
            <div className="hidden lg:flex flex-col text-left">
              <span className="text-xs font-semibold text-slate-800 leading-tight">
                {user?.first_name} {user?.last_name}
              </span>
              {user?.crmv ? (
                <span className="text-[11px] text-slate-500 font-mono">
                  CRMV-{user.crmv_uf || 'UF'} {user.crmv}
                </span>
              ) : (
                <span className="text-[11px] text-slate-400">
                  {user?.role === 'ADMIN' ? 'Admin' : 'Veterinário(a)'}
                </span>
              )}
            </div>

            <button
              onClick={logout}
              title="Sair do Vetgo"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition ml-1"
              aria-label="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
