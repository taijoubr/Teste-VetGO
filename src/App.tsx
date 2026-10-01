import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { TutorsPage } from './pages/TutorsPage';
import { PatientsPage } from './pages/PatientsPage';
import { AppointmentsPage } from './pages/AppointmentsPage';
import { ConsultationsPage } from './pages/ConsultationsPage';
import { FinancialPage } from './pages/FinancialPage';
import { InventoryPage } from './pages/InventoryPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { SettingsPage } from './pages/SettingsPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { ModulePlaceholder } from './pages/ModulePlaceholder';
import { ClinicsPage } from './pages/ClinicsPage';
import { SurgeonsPage } from './pages/SurgeonsPage';
import { AnesthesiaPage } from './pages/AnesthesiaPage';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PublicPetCardPage } from './pages/PublicPetCardPage';

// Protected layout wrapper
const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-3 border-emerald-700 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-semibold text-slate-500">Iniciando Vetgo...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // O administrador não tem acesso ao app clínico; seu ambiente exclusivo é o Backoffice (/admin)
  if (isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
};

// Admin route guard - Isolamento completo do sistema de administração (Requisito 25)
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white">Acesso Restrito ao Backoffice</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Esta área é o console de administração e faturamento da plataforma Vetgo, restrito a operadores de sistema. A sua conta atual não possui perfil de Superadmin.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <Link
              to="/"
              className="w-full py-2 px-4 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition cursor-pointer"
            >
              Voltar ao Aplicativo Clínico (Veterinário)
            </Link>
            <Link
              to="/login"
              className="w-full py-2 px-4 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
            >
              Fazer Login como Administrador
            </Link>
          </div>
        </div>
      </div>
    );
  }
  return <>{children}</>;
};

// Fallback de rota de acordo com o perfil
const RoleBasedFallback: React.FC = () => {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={isAdmin ? "/admin" : "/"} replace />;
};

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Auth & Patient Card Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Register />} />
          <Route path="/carteirinha/:patientId" element={<PublicPetCardPage />} />

          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <AppLayout>
                <Dashboard />
              </AppLayout>
            }
          />
          <Route
            path="/anestesia"
            element={
              <AppLayout>
                <AnesthesiaPage />
              </AppLayout>
            }
          />
          <Route
            path="/clinicas"
            element={
              <AppLayout>
                <ClinicsPage />
              </AppLayout>
            }
          />
          <Route
            path="/cirurgioes"
            element={
              <AppLayout>
                <SurgeonsPage />
              </AppLayout>
            }
          />
          <Route
            path="/agenda"
            element={
              <AppLayout>
                <AppointmentsPage />
              </AppLayout>
            }
          />
          <Route
            path="/tutores"
            element={
              <AppLayout>
                <TutorsPage />
              </AppLayout>
            }
          />
          <Route
            path="/pacientes"
            element={
              <AppLayout>
                <PatientsPage />
              </AppLayout>
            }
          />
          <Route
            path="/atendimentos"
            element={
              <AppLayout>
                <ConsultationsPage />
              </AppLayout>
            }
          />
          <Route
            path="/financeiro"
            element={
              <AppLayout>
                <FinancialPage />
              </AppLayout>
            }
          />
          <Route
            path="/estoque"
            element={
              <AppLayout>
                <InventoryPage />
              </AppLayout>
            }
          />
          <Route
            path="/medicamentos"
            element={
              <AppLayout>
                <InventoryPage />
              </AppLayout>
            }
          />
          <Route
            path="/produtos"
            element={
              <AppLayout>
                <InventoryPage />
              </AppLayout>
            }
          />
          <Route
            path="/documentos"
            element={
              <AppLayout>
                <DocumentsPage />
              </AppLayout>
            }
          />
          <Route
            path="/fornecedores"
            element={
              <AppLayout>
                <ModulePlaceholder
                  moduleName="Fornecedores & Distribuidoras"
                  category="Fornecedores"
                  description="Distribuidores farmacêuticos, laboratórios de apoio e fornecedores de insumos"
                  features={[
                    'Cadastro de distribuidores parceiros com contatos de representantes',
                    'Laboratórios conveniados para envio de amostras biológicas coletadas',
                    'Histórico de cotações e compras de vacinas e medicamentos',
                    'Avisos de reposição integrados à maleta volante'
                  ]}
                />
              </AppLayout>
            }
          />
          <Route
            path="/relatorios"
            element={
              <AppLayout>
                <ModulePlaceholder
                  moduleName="Relatórios Clínicos & Financeiros"
                  category="Relatórios"
                  description="Métricas de visitas, espécies mais frequentes, faturamento por região e DRE"
                  features={[
                    'Distribuição de atendimentos por região/bairro atendido',
                    'Espécies e queixas clínicas mais frequentes nos atendimentos',
                    'DRE simplificado (Receitas de visitas x Despesas de combustível/insumos)',
                    'Exportação para relatórios contábeis e livro-caixa'
                  ]}
                />
              </AppLayout>
            }
          />
          <Route
            path="/configuracoes"
            element={
              <AppLayout>
                <SettingsPage />
              </AppLayout>
            }
          />

          {/* Admin Area - Sistema Backoffice Separado (Requisito 25) */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />

          {/* Fallback inteligente por perfil (Admin -> /admin, Vet -> /) */}
          <Route path="*" element={<RoleBasedFallback />} />
        </Routes>
        <OfflineIndicator />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
