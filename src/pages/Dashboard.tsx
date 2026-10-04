import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { DashboardStats, Appointment, Patient, Tutor } from '../types';
import { PlanQuotaBanner } from '../components/PlanQuotaBanner';
import {
  Calendar,
  Clock,
  MapPin,
  PawPrint,
  Users,
  DollarSign,
  AlertTriangle,
  Plus,
  ArrowRight,
  Stethoscope,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  CheckCircle2,
  X
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // Safety timeout: never leave user stuck on the skeleton loader for more than 2.5s
    const timer = setTimeout(() => {
      if (isMounted) {
        setLoading(false);
      }
    }, 2500);

    loadDashboard().finally(() => {
      if (isMounted) {
        clearTimeout(timer);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const data = await api.getDashboardStats();
      if (data) {
        setStats(data);
      }
    } catch (e) {
      console.error('Erro ao carregar métricas do painel:', e);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMADO':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'AGENDADO':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'EM_ATENDIMENTO':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'CONCLUIDO':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  if (loading && !stats) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded-md w-1/4"></div>
        <div className="h-24 bg-slate-200 rounded-xl"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-36 bg-slate-200 rounded-xl"></div>
          <div className="h-36 bg-slate-200 rounded-xl"></div>
          <div className="h-36 bg-slate-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-3 mt-12 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-slate-800">Não foi possível carregar as métricas</h2>
        <p className="text-xs text-slate-500">
          Ocorreu uma instabilidade na conexão com o servidor. Você pode tentar recarregar novamente.
        </p>
        <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
          <button
            onClick={loadDashboard}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
          >
            Recarregar Painel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Painel do Veterinário
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Visão geral da sua rotina clínica volante, agenda e controle financeiro
          </p>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to="/agenda"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo Agendamento</span>
          </Link>
          <Link
            to="/pacientes"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 transition"
          >
            <PawPrint className="w-3.5 h-3.5 text-emerald-700" />
            <span>Novo Paciente</span>
          </Link>
          <Link
            to="/tutores"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 transition"
          >
            <Users className="w-3.5 h-3.5 text-emerald-700" />
            <span>Novo Tutor</span>
          </Link>
        </div>
      </div>

      {/* Free Plan Quota Indicator */}
      <PlanQuotaBanner planUsage={stats.plan_usage} />

      {/* KPI Cards (Clean, 4 primary metrics) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Atendimentos Hoje</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {stats.today_appointments_count}
            </span>
            <span className="text-xs text-slate-500">agendados</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Próximos (7 dias)</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-700">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {stats.upcoming_appointments_count}
            </span>
            <span className="text-xs text-slate-500">visitas volantes</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total de Pacientes</span>
            <div className="p-2 rounded-lg bg-purple-50 text-purple-700">
              <PawPrint className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {stats.total_patients_count}
            </span>
            <span className="text-xs text-slate-500">em acompanhamento</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Saldo do Mês</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700">
              {formatCurrency(stats.financial_summary.saldo_mes)}
            </span>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Today's Appointments & Route */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Schedule for Volante Vet */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <h2 className="text-sm font-bold text-slate-900">
                  Agenda e Rota de Hoje
                </h2>
              </div>
              <Link
                to="/agenda"
                className="text-xs font-medium text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
              >
                <span>Ver agenda completa</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {stats.today_appointments.length === 0 ? (
                <div className="p-8 text-center">
                  <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-medium text-slate-600">
                    Nenhum atendimento agendado para hoje.
                  </p>
                  <Link
                    to="/agenda"
                    className="mt-2 inline-flex items-center gap-1 text-xs text-emerald-700 font-semibold hover:underline"
                  >
                    + Adicionar compromisso
                  </Link>
                </div>
              ) : (
                stats.today_appointments.map((appt) => (
                  <div
                    key={appt.id}
                    className="p-4 hover:bg-slate-50/70 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-800 font-mono text-xs font-bold text-center shrink-0">
                        {appt.date_time.split('T')[1]?.substring(0, 5) || '10:00'}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-slate-900">
                            {appt.patient_name}
                          </span>
                          <span className="text-xs text-slate-500">
                            ({appt.patient_species || 'Canino'})
                          </span>
                          <span className="text-xs text-slate-400">• Tutor(a):</span>
                          <span className="text-xs font-medium text-slate-700">
                            {appt.tutor_name}
                          </span>
                        </div>

                        {appt.reason && (
                          <div className="text-xs text-slate-600 font-medium">
                            {appt.reason}
                          </div>
                        )}

                        {appt.address && (
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                            <span className="truncate">{appt.address}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <span
                        className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${getStatusBadge(
                          appt.status
                        )}`}
                      >
                        {appt.status}
                      </span>
                      <Link
                        to={`/atendimentos?appointment_id=${appt.id}`}
                        className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:border-emerald-500 rounded-md transition"
                      >
                        Ficha
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Patients */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">
                Pacientes Recentes
              </h2>
              <Link
                to="/pacientes"
                className="text-xs font-medium text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
              >
                <span>Ver todos</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {stats.recent_patients.map((p) => (
                <div
                  key={p.id}
                  className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold">
                      {p.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">{p.name}</div>
                      <div className="text-[11px] text-slate-500">
                        {p.species} • {p.breed || 'SRD'}
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-500">{p.tutor_name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Financial Summary & Inventory Alert */}
        <div className="space-y-6">
          {/* Financial summary card */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                Financeiro do Mês
              </h3>
              <Link
                to="/financeiro"
                className="text-xs font-medium text-emerald-700 hover:underline"
              >
                Detalhes
              </Link>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span>Receitas</span>
                </div>
                <span className="text-xs font-bold text-slate-800">
                  {formatCurrency(stats.financial_summary.total_receitas_mes)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <TrendingDown className="w-4 h-4 text-rose-500" />
                  <span>Despesas operacionais</span>
                </div>
                <span className="text-xs font-bold text-slate-800">
                  {formatCurrency(stats.financial_summary.total_despesas_mes)}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Saldo Líquido</span>
                <span className="text-sm font-black text-emerald-700">
                  {formatCurrency(stats.financial_summary.saldo_mes)}
                </span>
              </div>
            </div>

            {stats.financial_summary.contas_pendentes_count > 0 && (
              <div className="p-3 rounded-lg bg-amber-50/80 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">
                    {stats.financial_summary.contas_pendentes_count} conta(s) pendente(s)
                  </span>
                  <div className="text-[11px] text-amber-800 mt-0.5">
                    Total de {formatCurrency(stats.financial_summary.contas_pendentes_valor)} a receber.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Low inventory alert */}
          {stats.low_stock_count > 0 && (
            <div className="bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/30 shadow-2xs">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-rose-100 text-rose-700 shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    Aviso de Estoque Mínimo
                  </h4>
                  <p className="text-xs text-slate-600 mt-1">
                    {stats.low_stock_count} item(ns) estão abaixo do estoque mínimo operacional (ex: Zoletil 50).
                  </p>
                  <Link
                    to="/estoque"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 hover:underline mt-2"
                  >
                    <span>Repor no estoque</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Slogan Banner */}
          <div className="bg-linear-to-br from-emerald-800 to-teal-900 rounded-xl p-5 text-white shadow-xs">
            <div className="text-xs uppercase tracking-wider text-emerald-200 font-bold">
              Vetgo Mobile
            </div>
            <div className="text-sm font-black mt-1">
              Veterinária onde você precisa
            </div>
            <p className="text-xs text-emerald-100/90 mt-1.5 leading-relaxed">
              Otimize seus deslocamentos e mantenha prontuários, orçamentos e medicamentos sempre à mão em qualquer atendimento externo.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
