import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { AdminSidebar } from './AdminSidebar';
import { AppLogo } from '../AppLogo';
import {
  Menu,
  ShieldCheck,
  LogOut,
  Server
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
  activeTab?: string;
  onSelectTab?: (tab: string) => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  activeTab,
  onSelectTab
}) => {
  const { user, logout, switchDemoUser } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    (window as any).__switchDemoRole = (role: 'VET' | 'ADMIN') => switchDemoUser(role);
    return () => {
      delete (window as any).__switchDemoRole;
    };
  }, [switchDemoUser]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Dedicated Admin Sidebar */}
      <AdminSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeTab={activeTab}
        onSelectTab={onSelectTab}
      />

      {/* Main Admin Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-900/50">
        {/* Backoffice Top Navigation Bar */}
        <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur border-b border-slate-800 px-4 sm:px-6 py-2.5">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Mobile Toggle & Context */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                aria-label="Abrir menu"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2.5">
                <div className="md:hidden">
                  <AppLogo size="sm" variant="light" badge="Admin" />
                </div>
                <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                  Console Backoffice
                </span>
                <span className="hidden sm:inline text-slate-500 text-xs">•</span>
                <span className="hidden sm:inline text-xs text-slate-400 font-medium">
                  Painel de Controle e Assinaturas
                </span>
              </div>
            </div>

            {/* Right: Environment Status & Admin Profile */}
            <div className="flex items-center gap-3">
              {/* Status Badge */}
              <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700/60">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>API Operacional</span>
              </div>

              {/* Admin Profile & Logout */}
              <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow-sm">
                  {user?.first_name?.charAt(0) || 'A'}
                </div>
                <div className="hidden md:flex flex-col text-left">
                  <span className="text-xs font-semibold text-white leading-tight">
                    {user?.first_name} {user?.last_name}
                  </span>
                  <span className="text-[10px] text-blue-400 font-mono">
                    Super Administrador
                  </span>
                </div>

                <button
                  onClick={logout}
                  title="Sair do console"
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition ml-1"
                  aria-label="Sair"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-3 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
};
