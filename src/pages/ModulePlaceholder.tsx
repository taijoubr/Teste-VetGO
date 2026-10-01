import React from 'react';
import {
  DollarSign,
  Package,
  Pill,
  ShoppingBag,
  Truck,
  BarChart3,
  FileText,
  Stethoscope,
  CheckCircle2
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface ModulePlaceholderProps {
  moduleName: string;
  category: 'Financeiro' | 'Estoque' | 'Medicamentos' | 'Produtos' | 'Fornecedores' | 'Relatórios' | 'Documentos' | 'Atendimentos';
  description: string;
  features: string[];
}

export const ModulePlaceholder: React.FC<ModulePlaceholderProps> = ({
  moduleName,
  category,
  description,
  features
}) => {
  const getIcon = () => {
    switch (category) {
      case 'Financeiro':
        return DollarSign;
      case 'Estoque':
        return Package;
      case 'Medicamentos':
        return Pill;
      case 'Produtos':
        return ShoppingBag;
      case 'Fornecedores':
        return Truck;
      case 'Relatórios':
        return BarChart3;
      case 'Documentos':
        return FileText;
      default:
        return Stethoscope;
    }
  };

  const IconComponent = getIcon();

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
          <IconComponent className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {moduleName}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-2xs space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <span className="text-[11px] uppercase tracking-wider font-bold text-emerald-700">
            Arquitetura de Dados Pronta
          </span>
          <h3 className="text-base font-bold text-slate-900 mt-1">
            Recursos e Entidades Mapeadas no Backend
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Os modelos de dados (SQLAlchemy / SQLite), regras de isolamento multi-inquilino e esquemas deste módulo já estão estruturados.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {features.map((feat, idx) => (
            <div key={idx} className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span className="text-xs font-medium text-slate-700">{feat}</span>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Fase Atual: Fundação & Core Clínico Ativo
          </span>
          <Link
            to="/"
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
          >
            ← Voltar ao Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};
