import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { FinancialEntry, Tutor, Patient, PaymentMethod, FinancialEntryType } from '../types';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  Plus,
  Search,
  Filter,
  Receipt,
  Printer,
  X,
  Trash2,
  CheckCircle2,
  AlertCircle,
  QrCode
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { PixPaymentModal } from '../components/PixPaymentModal';

export const FinancialPage: React.FC = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterType, setFilterType] = useState<'ALL' | 'RECEITA' | 'DESPESA'>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PAGO' | 'PENDENTE'>('ALL');
  const [search, setSearch] = useState('');

  // Modal new entry
  const [showModal, setShowModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<FinancialEntry | null>(null);
  const [showPixModal, setShowPixModal] = useState(false);
  const [pixAmount, setPixAmount] = useState<number>(0);
  const [pixDesc, setPixDesc] = useState<string>('Consulta Veterinária');
  const [pixTutorPhone, setPixTutorPhone] = useState<string>('');

  const [form, setForm] = useState({
    entry_type: 'RECEITA' as FinancialEntryType,
    category: 'Consulta Volante Domiciliar',
    description: '',
    amount: 0,
    payment_method: 'PIX' as PaymentMethod,
    status: 'PAGO' as any,
    date: new Date().toISOString().split('T')[0],
    tutor_id: 1,
    patient_id: 1,
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [fEntries, tuts, pts] = await Promise.all([
        api.getFinancialEntries(),
        api.getTutors(),
        api.getPatients()
      ]);
      setEntries(fEntries);
      setTutors(tuts);
      setPatients(pts);
      if (tuts.length > 0 && pts.length > 0) {
        setForm((prev) => ({
          ...prev,
          tutor_id: tuts[0].id,
          patient_id: pts[0].id
        }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    const tut = tutors.find((t) => t.id === form.tutor_id);
    const pt = patients.find((p) => p.id === form.patient_id);

    await api.createFinancialEntry({
      entry_type: form.entry_type,
      category: form.category,
      description: form.description || (form.entry_type === 'RECEITA' ? `Atendimento - ${pt?.name}` : form.category),
      amount: form.amount,
      payment_method: form.payment_method,
      status: form.status,
      date: form.date,
      tutor_id: form.entry_type === 'RECEITA' ? form.tutor_id : undefined,
      tutor_name: form.entry_type === 'RECEITA' ? tut?.name : undefined,
      patient_id: form.entry_type === 'RECEITA' ? form.patient_id : undefined,
      patient_name: form.entry_type === 'RECEITA' ? pt?.name : undefined,
      notes: form.notes
    });

    setShowModal(false);
    loadData();
  };

  const handleDeleteEntry = async (id: number) => {
    if (confirm('Deseja excluir este lançamento financeiro?')) {
      await api.deleteFinancialEntry(id);
      loadData();
    }
  };

  // Calculations
  const totalReceitas = entries
    .filter((e) => e.entry_type === 'RECEITA' && e.status === 'PAGO')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalDespesas = entries
    .filter((e) => e.entry_type === 'DESPESA' && e.status === 'PAGO')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const saldoLiquido = totalReceitas - totalDespesas;

  const totalPendente = entries
    .filter((e) => e.status === 'PENDENTE')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const filteredEntries = entries.filter((e) => {
    const matchType = filterType === 'ALL' || e.entry_type === filterType;
    const matchStatus = filterStatus === 'ALL' || e.status === filterStatus;
    const q = search.toLowerCase();
    const matchQuery =
      e.description.toLowerCase().includes(q) ||
      e.category.toLowerCase().includes(q) ||
      (e.tutor_name && e.tutor_name.toLowerCase().includes(q));
    return matchType && matchStatus && matchQuery;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-emerald-700" />
            Gestão Financeira Volante
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Fluxo de caixa, despesas de combustível/insumos, receitas de visitas e recibos
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setPixAmount(0);
              setPixDesc('Consulta Veterinária');
              setPixTutorPhone('');
              setShowPixModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition cursor-pointer"
            title="Gerar QR Code PIX para recebimento"
          >
            <QrCode className="w-4 h-4 text-emerald-400" />
            <span>Cobrar com PIX</span>
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Lançamento</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Receitas Recebidas</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-black text-emerald-700 font-mono">
            R$ {totalReceitas.toFixed(2)}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Despesas Operacionais</span>
            <div className="p-1.5 rounded-lg bg-rose-50 text-rose-700">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-black text-rose-700 font-mono">
            R$ {totalDespesas.toFixed(2)}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Saldo Líquido</span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-700">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className={`mt-2 text-xl font-black font-mono ${saldoLiquido >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
            R$ {saldoLiquido.toFixed(2)}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">A Receber (Pendente)</span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-700">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-black text-amber-700 font-mono">
            R$ {totalPendente.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Pesquisar por descrição, categoria ou tutor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-600"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none font-semibold"
          >
            <option value="ALL">Todas as Transações</option>
            <option value="RECEITA">Apenas Receitas</option>
            <option value="DESPESA">Apenas Despesas</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none font-semibold"
          >
            <option value="ALL">Todos os Status</option>
            <option value="PAGO">Liquidados / Pagos</option>
            <option value="PENDENTE">Pendentes</option>
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Carregando fluxo financeiro...</div>
        ) : filteredEntries.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">Nenhum lançamento encontrado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[650px]">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Descrição / Categoria</th>
                  <th className="px-4 py-3">Tutor / Paciente</th>
                  <th className="px-4 py-3">Forma de Pagamento</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEntries.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3 text-slate-500 font-mono">
                      {new Date(e.date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{e.description}</div>
                      <div className="text-[11px] text-slate-400">{e.category}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {e.tutor_name ? (
                        <div>
                          <span className="font-semibold text-slate-800">{e.tutor_name}</span>
                          {e.patient_name && (
                            <span className="text-slate-400 text-[11px]"> ({e.patient_name})</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[11px]">
                        {e.payment_method.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          e.status === 'PAGO'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {e.status}
                      </span>
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-bold font-mono ${
                        e.entry_type === 'RECEITA' ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {e.entry_type === 'RECEITA' ? '+ ' : '- '}
                      R$ {e.amount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      {e.entry_type === 'RECEITA' && (
                        <button
                          onClick={() => setSelectedReceipt(e)}
                          title="Gerar Recibo de Pagamento"
                          className="p-1 text-slate-400 hover:text-emerald-700 transition cursor-pointer"
                        >
                          <Receipt className="w-4 h-4 inline" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteEntry(e.id)}
                        title="Excluir Lançamento"
                        className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Receipt Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 print:hidden">
              <span className="text-xs font-bold text-slate-500 uppercase">
                Recibo de Pagamento de Honorários Veterinários
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-700 text-white hover:bg-emerald-800"
                >
                  <Printer className="w-3.5 h-3.5 inline mr-1" />
                  Imprimir
                </button>
                <button
                  onClick={() => setSelectedReceipt(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Receipt Card */}
            <div className="space-y-4 text-xs text-slate-800">
              <div className="text-center border-b border-slate-200 pb-3">
                <h3 className="text-base font-black text-slate-900 uppercase">
                  {user?.clinic_name || `${user?.first_name} ${user?.last_name}`}
                </h3>
                <div className="text-xs font-semibold text-emerald-800">
                  CRMV-{user?.crmv_uf || 'SP'} {user?.crmv || '34892'}
                </div>
                {user?.phone && <div className="text-[11px] text-slate-500 mt-0.5">Contato: {user.phone}</div>}
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex justify-between items-center">
                <div>
                  <span className="text-[11px] text-slate-400 block font-mono">
                    NÚMERO: {selectedReceipt.receipt_number || 'REC-2026-001'}
                  </span>
                  <span className="font-semibold text-slate-700">VALOR RECEBIDO:</span>
                </div>
                <div className="text-xl font-black text-emerald-800 font-mono">
                  R$ {selectedReceipt.amount.toFixed(2)}
                </div>
              </div>

              <p className="leading-relaxed text-slate-700">
                Recebi de <strong>{selectedReceipt.tutor_name || 'Tutor Responsável'}</strong> a quantia supra de{' '}
                <strong>R$ {selectedReceipt.amount.toFixed(2)}</strong> via{' '}
                <strong>{selectedReceipt.payment_method}</strong>, referente a prestação de serviços médico-veterinários
                volantes: <em>{selectedReceipt.description}</em>.
              </p>

              <div className="pt-8 text-center space-y-1">
                <div className="w-48 border-t border-slate-400 mx-auto"></div>
                <div className="font-bold text-slate-900">Dr(a). {user?.first_name} {user?.last_name}</div>
                <div className="text-[10px] text-slate-400 font-mono">CRMV-{user?.crmv_uf || 'SP'} {user?.crmv || '34892'}</div>
                <div className="text-[10px] text-slate-400">
                  Emitido em {new Date(selectedReceipt.date).toLocaleDateString('pt-BR')}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 text-center text-[10px] text-slate-400">
                Emitido via <strong>Vetgo</strong> • Veterinária onde você precisa
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Entry Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Novo Lançamento Financeiro</h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEntry} className="mt-4 space-y-3">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      entry_type: 'RECEITA',
                      category: 'Consulta Volante Domiciliar'
                    })
                  }
                  className={`py-1.5 text-xs font-bold rounded-md transition cursor-pointer ${
                    form.entry_type === 'RECEITA' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-500'
                  }`}
                >
                  Receita (+)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      entry_type: 'DESPESA',
                      category: 'Combustível / Deslocamento'
                    })
                  }
                  className={`py-1.5 text-xs font-bold rounded-md transition cursor-pointer ${
                    form.entry_type === 'DESPESA' ? 'bg-white text-rose-800 shadow-2xs' : 'text-slate-500'
                  }`}
                >
                  Despesa (-)
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Categoria *</label>
                {form.entry_type === 'RECEITA' ? (
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none bg-white"
                  >
                    <option value="Consulta Volante Domiciliar">Consulta Volante Domiciliar</option>
                    <option value="Vacinação Domiciliar">Vacinação Domiciliar</option>
                    <option value="Procedimento / Curativo">Procedimento / Curativo</option>
                    <option value="Exame Laboratorial / Coleta">Exame Laboratorial / Coleta</option>
                    <option value="Medicamentos Dispensados">Medicamentos Dispensados</option>
                  </select>
                ) : (
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none bg-white"
                  >
                    <option value="Combustível / Deslocamento">Combustível / Deslocamento</option>
                    <option value="Insumos / Maleta Volante">Insumos / Maleta Volante</option>
                    <option value="Manutenção Veicular">Manutenção Veicular</option>
                    <option value="Equipamentos Clínicos">Equipamentos Clínicos</option>
                    <option value="Taxas Bancárias / CRMV">Taxas Bancárias / CRMV</option>
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Descrição</label>
                <input
                  type="text"
                  placeholder="Detalhes do lançamento..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Valor (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={form.amount || ''}
                    onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Data *</label>
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Forma Pagamento</label>
                  <select
                    value={form.payment_method}
                    onChange={(e) => setForm({ ...form, payment_method: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none bg-white"
                  >
                    <option value="PIX">Pix</option>
                    <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                    <option value="CARTAO_DEBITO">Cartão de Débito</option>
                    <option value="DINHEIRO">Dinheiro em Espécie</option>
                    <option value="TRANSFERENCIA">Transferência</option>
                    <option value="PENDENTE">A Pagar (Pendente)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none bg-white"
                  >
                    <option value="PAGO">Pago / Liquidado</option>
                    <option value="PENDENTE">Pendente</option>
                  </select>
                </div>
              </div>

              {form.entry_type === 'RECEITA' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Vincular Tutor</label>
                  <select
                    value={form.tutor_id}
                    onChange={(e) => setForm({ ...form, tutor_id: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none bg-white"
                  >
                    {tutors.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white transition cursor-pointer"
                >
                  Salvar Lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Cobrança PIX com QR Code */}
      <PixPaymentModal
        isOpen={showPixModal}
        onClose={() => setShowPixModal(false)}
        defaultAmount={pixAmount}
        description={pixDesc}
        tutorPhone={pixTutorPhone}
      />
    </div>
  );
};
