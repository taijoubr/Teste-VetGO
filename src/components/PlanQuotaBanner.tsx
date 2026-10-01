import React from 'react';
import { PlanUsage } from '../types';
import { AlertCircle, ArrowUpRight, CheckCircle2, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

interface PlanQuotaBannerProps {
  planUsage?: PlanUsage;
}

export const PlanQuotaBanner: React.FC<PlanQuotaBannerProps> = ({ planUsage }) => {
  const [isDismissed, setIsDismissed] = React.useState(false);

  if (!planUsage || isDismissed) return null;

  // If PRO with active subscription or Lifetime, no banner needed
  if (planUsage.is_lifetime) {
    return null;
  }

  if (planUsage.plan === 'PRO' && !planUsage.is_expired) {
    return null;
  }

  const tutorsCount = planUsage.tutors_count;
  const tutorsLimit = planUsage.tutors_limit || 30;
  const tutorsPercent = Math.min(100, Math.round((tutorsCount / tutorsLimit) * 100));

  const patientsCount = planUsage.patients_count;
  const patientsLimit = planUsage.patients_limit || 50;
  const patientsPercent = Math.min(100, Math.round((patientsCount / patientsLimit) * 100));

  const isLimitReached = planUsage.tutors_limit_reached || planUsage.patients_limit_reached;

  // Se não atingiu limite, exibe um widget discreto, limpo e sem empurrar venda de forma invasiva
  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 mb-5 text-slate-700 shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Plano Gratuito
          </span>
          <span className="text-xs text-slate-500 hidden sm:inline">•</span>
          <span className="text-xs text-slate-600">
            {tutorsCount}/{tutorsLimit} tutores e {patientsCount}/{patientsLimit} pacientes utilizados
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/configuracoes?tab=assinatura"
            className="text-xs font-semibold text-slate-600 hover:text-emerald-700 transition"
          >
            Conhecer Plano Pro
          </Link>
          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="text-slate-400 hover:text-slate-600 p-1 rounded transition text-xs"
            title="Fechar aviso"
          >
            ✕
          </button>
        </div>
      </div>

      {isLimitReached && (
        <div className="mt-2.5 pt-2.5 border-t border-amber-100 flex items-center justify-between gap-2 text-xs text-amber-800 bg-amber-50/60 p-2 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Limite atingido de cadastros gratuitos. Registros existentes continuam salvos e acessíveis.</span>
          </div>
          <Link
            to="/configuracoes?tab=assinatura"
            className="font-bold text-amber-900 underline hover:no-underline shrink-0"
          >
            Ver Pro
          </Link>
        </div>
      )}
    </div>
  );
};
