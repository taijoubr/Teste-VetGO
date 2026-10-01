import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { InventoryItem, InventoryCategory } from '../types';
import {
  Package,
  Pill,
  AlertTriangle,
  Plus,
  Search,
  CheckCircle2,
  Briefcase,
  Layers,
  Calculator,
  X,
  ShieldAlert,
  ArrowRightLeft
} from 'lucide-react';

export const InventoryPage: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);

  // Dosage calculator state
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcWeight, setCalcWeight] = useState<number>(10);
  const [calcDoseMgPerKg, setCalcDoseMgPerKg] = useState<number>(0.2); // Ex: Meloxicam 0.2mg/kg
  const [calcConcentrationMgPerMl, setCalcConcentrationMgPerMl] = useState<number>(2); // Ex: 2mg/ml

  // Modal new item
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: '',
    category: 'Medicamento' as InventoryCategory,
    active_ingredient: '',
    presentation: '',
    concentration: '',
    batch_number: '',
    expiration_date: '',
    quantity_in_kit: 1,
    quantity_in_stock: 5,
    unit: 'Frasco',
    min_alert_quantity: 2,
    cost_price: 0,
    sale_price: 0,
    supplier_name: '',
    is_controlled_substance: false,
    notes: ''
  });

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    try {
      setLoading(true);
      const data = await api.getInventory();
      setItems(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.createInventoryItem(form);
    setShowModal(false);
    setForm({
      name: '',
      category: 'Medicamento',
      active_ingredient: '',
      presentation: '',
      concentration: '',
      batch_number: '',
      expiration_date: '',
      quantity_in_kit: 1,
      quantity_in_stock: 5,
      unit: 'Frasco',
      min_alert_quantity: 2,
      cost_price: 0,
      sale_price: 0,
      supplier_name: '',
      is_controlled_substance: false,
      notes: ''
    });
    loadInventory();
  };

  const handleTransferToKit = async (item: InventoryItem) => {
    if (item.quantity_in_stock <= 0) {
      alert('Não há unidades no estoque central para transferir à maleta volante.');
      return;
    }
    await api.updateInventoryItem(item.id, {
      quantity_in_stock: item.quantity_in_stock - 1,
      quantity_in_kit: item.quantity_in_kit + 1
    });
    loadInventory();
  };

  const handleTransferToStock = async (item: InventoryItem) => {
    if (item.quantity_in_kit <= 0) return;
    await api.updateInventoryItem(item.id, {
      quantity_in_stock: item.quantity_in_stock + 1,
      quantity_in_kit: item.quantity_in_kit - 1
    });
    loadInventory();
  };

  // Dosage computation: Volume (ml) = (Weight * Dose) / Concentration
  const calculatedDoseMl = calcConcentrationMgPerMl > 0
    ? ((calcWeight * calcDoseMgPerKg) / calcConcentrationMgPerMl).toFixed(2)
    : '0.00';

  const filteredItems = items.filter((item) => {
    const q = search.toLowerCase();
    const matchesSearch =
      item.name.toLowerCase().includes(q) ||
      (item.active_ingredient && item.active_ingredient.toLowerCase().includes(q)) ||
      (item.batch_number && item.batch_number.toLowerCase().includes(q));
    const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const lowStockCount = items.filter(
    (i) => i.quantity_in_kit + i.quantity_in_stock <= i.min_alert_quantity
  ).length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-emerald-700" />
            Estoque & Maleta Volante
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Gestão de insumos, medicamentos controlados, lotes e reposição da maleta
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowCalculator(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 shadow-2xs transition cursor-pointer"
          >
            <Calculator className="w-4 h-4 text-emerald-700" />
            <span>Calculadora de Doses</span>
          </button>

          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Insumo / Medicamento</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total de Itens</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">{items.length}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Na Maleta Volante</span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-700">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-blue-700">
            {items.reduce((acc, i) => acc + i.quantity_in_kit, 0)} un.
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Estoque Central</span>
            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-700">
            {items.reduce((acc, i) => acc + i.quantity_in_stock, 0)} un.
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Alerta de Estoque Baixo</span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-700">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-amber-600">{lowStockCount}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Pesquisar por nome, princípio ativo ou lote..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-600"
          />
        </div>

        <div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none font-semibold"
          >
            <option value="ALL">Todas as Categorias</option>
            <option value="Medicamento">Medicamentos</option>
            <option value="Vacina">Vacinas</option>
            <option value="Material Cirúrgico">Material Cirúrgico</option>
            <option value="Descartável">Descartáveis</option>
            <option value="Nutracêutico">Nutracêuticos</option>
          </select>
        </div>
      </div>

      {/* Inventory Items Grid */}
      {loading ? (
        <div className="p-8 text-center text-xs text-slate-400">Carregando itens...</div>
      ) : filteredItems.length === 0 ? (
        <div className="p-8 text-center text-xs text-slate-400">Nenhum item de estoque encontrado.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const isLow = item.quantity_in_kit + item.quantity_in_stock <= item.min_alert_quantity;
            return (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs hover:border-emerald-500/50 transition space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 block">
                        {item.category}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 leading-tight mt-0.5">
                        {item.name}
                      </h3>
                      {item.active_ingredient && (
                        <span className="text-[11px] text-slate-500 block">
                          {item.active_ingredient}
                        </span>
                      )}
                    </div>

                    {item.is_controlled_substance && (
                      <span
                        title="Substância Controlada - Portaria MAPA"
                        className="p-1 rounded bg-slate-900 text-white shrink-0"
                      >
                        <ShieldAlert className="w-4 h-4" />
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase flex items-center gap-1">
                        <Briefcase className="w-3 h-3 text-blue-600" />
                        Na Maleta
                      </span>
                      <span className="text-sm font-black text-blue-800 font-mono">
                        {item.quantity_in_kit} {item.unit}
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase flex items-center gap-1">
                        <Layers className="w-3 h-3 text-slate-600" />
                        Estoque Central
                      </span>
                      <span className="text-sm font-black text-slate-800 font-mono">
                        {item.quantity_in_stock} {item.unit}
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 space-y-0.5 pt-1">
                    {item.batch_number && (
                      <div>
                        Lote: <strong className="font-mono text-slate-700">{item.batch_number}</strong>
                      </div>
                    )}
                    {item.expiration_date && (
                      <div>
                        Validade: <strong className="font-mono text-slate-700">{item.expiration_date}</strong>
                      </div>
                    )}
                  </div>

                  {isLow && (
                    <div className="p-2 bg-amber-50 border border-amber-200 text-amber-900 rounded text-[11px] flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>Estoque abaixo do mínimo ({item.min_alert_quantity})</span>
                    </div>
                  )}
                </div>

                {/* Transfer Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400">Transferir:</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleTransferToKit(item)}
                      title="Transferir 1 unidade do Estoque Central para a Maleta Volante"
                      className="px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-[11px] transition cursor-pointer"
                    >
                      + Maleta
                    </button>
                    <button
                      onClick={() => handleTransferToStock(item)}
                      title="Devolver 1 unidade da Maleta para o Estoque Central"
                      className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition cursor-pointer"
                    >
                      + Central
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Veterinary Dosage Calculator Modal */}
      {showCalculator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-emerald-700" />
                <h3 className="text-base font-bold text-slate-900">Calculadora de Doses Clínicas</h3>
              </div>
              <button
                onClick={() => setShowCalculator(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Fórmula: <strong>Volume (mL) = [Peso (kg) × Dose (mg/kg)] ÷ Concentração (mg/mL)</strong>
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Peso do Paciente (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={calcWeight}
                  onChange={(e) => setCalcWeight(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Dose Desejada (mg/kg)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={calcDoseMgPerKg}
                  onChange={(e) => setCalcDoseMgPerKg(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Concentração do Medicamento (mg/mL)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={calcConcentrationMgPerMl}
                  onChange={(e) => setCalcConcentrationMgPerMl(parseFloat(e.target.value) || 1)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none font-mono"
                />
              </div>

              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-1 mt-4">
                <span className="text-xs text-emerald-800 font-semibold uppercase tracking-wider block">
                  Volume a Administrar
                </span>
                <div className="text-3xl font-black text-emerald-900 font-mono">
                  {calculatedDoseMl} <span className="text-sm font-bold">mL</span>
                </div>
                <span className="text-[11px] text-emerald-700 block">
                  Total de princípio ativo: {(calcWeight * calcDoseMgPerKg).toFixed(2)} mg
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowCalculator(false)}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-lg transition"
            >
              Fechar Calculadora
            </button>
          </div>
        </div>
      )}

      {/* New Item Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Novo Insumo ou Medicamento</h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateItem} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nome Comercial *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Zoletil 50, Meloxicam 0,2%, Seringa 3ml..."
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Categoria *</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none bg-white"
                  >
                    <option value="Medicamento">Medicamento</option>
                    <option value="Vacina">Vacina</option>
                    <option value="Material Cirúrgico">Material Cirúrgico</option>
                    <option value="Descartável">Descartável</option>
                    <option value="Nutracêutico">Nutracêutico</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Princípio Ativo</label>
                  <input
                    type="text"
                    placeholder="Ex: Tiletamina + Zolazepam"
                    value={form.active_ingredient}
                    onChange={(e) => setForm({ ...form, active_ingredient: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Apresentação</label>
                  <input
                    type="text"
                    placeholder="Frasco 10ml / 30 comprimidos"
                    value={form.presentation}
                    onChange={(e) => setForm({ ...form, presentation: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Concentração</label>
                  <input
                    type="text"
                    placeholder="Ex: 50mg/ml"
                    value={form.concentration}
                    onChange={(e) => setForm({ ...form, concentration: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Lote</label>
                  <input
                    type="text"
                    placeholder="Ex: ZT-2026-01"
                    value={form.batch_number}
                    onChange={(e) => setForm({ ...form, batch_number: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Validade</label>
                  <input
                    type="date"
                    value={form.expiration_date}
                    onChange={(e) => setForm({ ...form, expiration_date: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Qtd Maleta</label>
                  <input
                    type="number"
                    value={form.quantity_in_kit}
                    onChange={(e) => setForm({ ...form, quantity_in_kit: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Qtd Central</label>
                  <input
                    type="number"
                    value={form.quantity_in_stock}
                    onChange={(e) => setForm({ ...form, quantity_in_stock: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Alerta Mín.</label>
                  <input
                    type="number"
                    value={form.min_alert_quantity}
                    onChange={(e) => setForm({ ...form, min_alert_quantity: parseInt(e.target.value) || 2 })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="controlled"
                  checked={form.is_controlled_substance}
                  onChange={(e) => setForm({ ...form, is_controlled_substance: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="controlled" className="text-xs font-bold text-slate-800">
                  Medicamento de Controle Especial (MAPA / Notificação de Receita)
                </label>
              </div>

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
                  Salvar no Estoque
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
