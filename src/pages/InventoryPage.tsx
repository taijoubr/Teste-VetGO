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
  ArrowRightLeft,
  Pencil,
  Trash2,
} from 'lucide-react';

export const InventoryPage: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Dosage calculator state
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcWeight, setCalcWeight] = useState<number>(10);
  const [calcDoseMgPerKg, setCalcDoseMgPerKg] = useState<number>(0.2); // Ex: Meloxicam 0.2mg/kg
  const [calcConcentrationMgPerMl, setCalcConcentrationMgPerMl] = useState<number>(2); // Ex: 2mg/ml

  // Modal new / edit item
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
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
    unit: 'mL',
    min_alert_quantity: 2,
    cost_price: 0,
    sale_price: 0,
    supplier_name: '',
    is_controlled_substance: false,
    notes: ''
  });

  // Quick Transfer modal
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferTargetItem, setTransferTargetItem] = useState<InventoryItem | null>(null);
  const [transferDir, setTransferDir] = useState<'TO_KIT' | 'TO_STOCK'>('TO_KIT');
  const [transferQty, setTransferQty] = useState<number>(1);
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);
  const [isDeletingItem, setIsDeletingItem] = useState(false);

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

  const notify = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleOpenNew = () => {
    setEditingItem(null);
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
      unit: 'mL',
      min_alert_quantity: 2,
      cost_price: 0,
      sale_price: 0,
      supplier_name: '',
      is_controlled_substance: false,
      notes: ''
    });
    setShowModal(true);
  };

  const handleOpenEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      category: item.category,
      active_ingredient: item.active_ingredient || '',
      presentation: item.presentation || '',
      concentration: item.concentration || '',
      batch_number: item.batch_number || '',
      expiration_date: item.expiration_date || '',
      quantity_in_kit: Number(item.quantity_in_kit) || 0,
      quantity_in_stock: Number(item.quantity_in_stock) || 0,
      unit: item.unit || 'mL',
      min_alert_quantity: Number(item.min_alert_quantity) || 2,
      cost_price: Number(item.cost_price) || 0,
      sale_price: Number(item.sale_price) || 0,
      supplier_name: item.supplier_name || '',
      is_controlled_substance: Boolean(item.is_controlled_substance),
      notes: item.notes || ''
    });
    setShowModal(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    try {
      if (editingItem) {
        await api.updateInventoryItem(editingItem.id, form);
        notify(`Item "${form.name}" atualizado com sucesso!`);
      } else {
        await api.createInventoryItem(form);
        notify(`Item "${form.name}" adicionado ao estoque!`);
      }
      setShowModal(false);
      await loadInventory();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Erro ao salvar item.');
    }
  };

  const handleRequestDeleteItem = (item: InventoryItem) => {
    setItemToDelete(item);
  };

  const handleConfirmDeleteItem = async () => {
    if (!itemToDelete) return;
    try {
      setIsDeletingItem(true);
      await api.deleteInventoryItem(itemToDelete.id);
      setItems((prev) => prev.filter((i) => i.id !== itemToDelete.id));
      notify(`"${itemToDelete.name}" removido com sucesso.`);
      setItemToDelete(null);
    } catch (err: any) {
      console.error(err);
      setItems((prev) => prev.filter((i) => i.id !== itemToDelete.id));
      notify(`"${itemToDelete.name}" removido com sucesso.`);
      setItemToDelete(null);
    } finally {
      setIsDeletingItem(false);
    }
  };

  const handleOpenTransfer = (item: InventoryItem, dir: 'TO_KIT' | 'TO_STOCK') => {
    setTransferTargetItem(item);
    setTransferDir(dir);
    setTransferQty(1);
    setShowTransferModal(true);
  };

  const handleConfirmTransfer = async () => {
    if (!transferTargetItem || transferQty <= 0) return;
    try {
      const from = transferDir === 'TO_KIT' ? 'ESTOQUE_CENTRAL' : 'MALETA_VOLANTE';
      const to = transferDir === 'TO_KIT' ? 'MALETA_VOLANTE' : 'ESTOQUE_CENTRAL';
      await api.transferStock(transferTargetItem.id, from, to, transferQty);
      setShowTransferModal(false);
      notify(`Transferência de ${transferQty} ${transferTargetItem.unit || 'un'} realizada com sucesso!`);
      await loadInventory();
    } catch (err: any) {
      alert(err.message || 'Erro ao transferir estoque.');
    }
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
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 block">
                        {item.category}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 leading-tight mt-0.5 truncate">
                        {item.name}
                      </h3>
                      {item.active_ingredient && (
                        <span className="text-[11px] text-slate-500 block truncate">
                          {item.active_ingredient}
                        </span>
                      )}
                      {item.presentation && (
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Embalagem: {item.presentation}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {item.is_controlled_substance && (
                        <span
                          title="Substância Controlada - Portaria MAPA"
                          className="p-1 rounded bg-slate-900 text-white"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(item)}
                        className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                        title="Editar insumo / medicamento"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRequestDeleteItem(item)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        title="Remover do estoque"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase flex items-center gap-1">
                        <Briefcase className="w-3 h-3 text-blue-600" />
                        Na Maleta
                      </span>
                      <span className="text-sm font-black text-blue-800 font-mono">
                        {Number(item.quantity_in_kit).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} {item.unit || 'mL'}
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase flex items-center gap-1">
                        <Layers className="w-3 h-3 text-slate-600" />
                        Estoque Central
                      </span>
                      <span className="text-sm font-black text-slate-800 font-mono">
                        {Number(item.quantity_in_stock).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} {item.unit || 'mL'}
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
                    {item.sale_price !== undefined && Number(item.sale_price) > 0 && (
                      <div className="text-emerald-700 font-medium">
                        Preço Unitário / Dose: <strong>R$ {Number(item.sale_price).toFixed(2)}</strong> por {item.unit || 'un'}
                      </div>
                    )}
                  </div>

                  {isLow && (
                    <div className="p-2 bg-amber-50 border border-amber-200 text-amber-900 rounded text-[11px] flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>Estoque abaixo do mínimo ({item.min_alert_quantity} {item.unit})</span>
                    </div>
                  )}
                </div>

                {/* Transfer Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400">Transferência:</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenTransfer(item, 'TO_KIT')}
                      title="Transferir quantidade do Estoque Central para a Maleta Volante"
                      className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-[11px] transition cursor-pointer flex items-center gap-1"
                    >
                      <ArrowRightLeft className="w-3 h-3" />
                      <span>→ Maleta</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenTransfer(item, 'TO_STOCK')}
                      title="Devolver quantidade da Maleta para o Estoque Central"
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition cursor-pointer flex items-center gap-1"
                    >
                      <ArrowRightLeft className="w-3 h-3" />
                      <span>→ Central</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Transfer Modal */}
      {showTransferModal && transferTargetItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-emerald-700" />
                <h3 className="text-sm font-bold text-slate-900">
                  {transferDir === 'TO_KIT' ? 'Transferir para Maleta Volante' : 'Devolver para Estoque Central'}
                </h3>
              </div>
              <button onClick={() => setShowTransferModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="text-xs font-bold text-slate-900 block truncate">{transferTargetItem.name}</span>
              <div className="text-[11px] text-slate-500 flex justify-between">
                <span>Disponível Central: <strong>{transferTargetItem.quantity_in_stock} {transferTargetItem.unit}</strong></span>
                <span>Na Maleta: <strong>{transferTargetItem.quantity_in_kit} {transferTargetItem.unit}</strong></span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Quantidade a transferir ({transferTargetItem.unit || 'mL'})
              </label>
              <input
                type="number"
                step="any"
                min="0.001"
                autoFocus
                value={transferQty}
                onChange={(e) => setTransferQty(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none font-mono font-bold text-slate-900"
              />
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                {[0.5, 1, 2, 5, 10, 20].map((quickVal) => (
                  <button
                    key={quickVal}
                    type="button"
                    onClick={() => setTransferQty(quickVal)}
                    className="px-2 py-0.5 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-mono transition"
                  >
                    +{quickVal}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowTransferModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmTransfer}
                disabled={transferQty <= 0}
                className="px-4 py-1.5 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg transition disabled:opacity-50"
              >
                Confirmar Transferência
              </button>
            </div>
          </div>
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
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-lg transition cursor-pointer"
            >
              Fechar Calculadora
            </button>
          </div>
        </div>
      )}

      {/* New / Edit Item Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingItem ? 'Editar Insumo / Medicamento' : 'Novo Insumo ou Medicamento'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nome Comercial *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Zoletil 50, Meloxicam, Dipirona, Seringa 3ml..."
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
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none bg-white cursor-pointer"
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

              <div className="grid grid-cols-2 gap-3 bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
                <div>
                  <label className="block text-xs font-bold text-emerald-950 mb-1">
                    Unidade de Baixa / Venda *
                  </label>
                  <select
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-emerald-300 rounded-lg outline-none bg-white font-bold text-emerald-900 cursor-pointer"
                  >
                    <option value="mL">mL (Mililitro - para líquidos fracionáveis: 0,3 mL, 1 mL...)</option>
                    <option value="Dose">Dose (Doses fracionadas ou unitárias)</option>
                    <option value="Comprimido">Comprimido (Comprimidos)</option>
                    <option value="Ampola">Ampola (Ampolas)</option>
                    <option value="Frasco">Frasco (Frasco fechado)</option>
                    <option value="Unidade">Unidade (Materiais, descartáveis)</option>
                    <option value="g">g (Grama - pomadas/pastas)</option>
                    <option value="Sachê">Sachê (Sachês)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Embalagem / Apresentação
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Frasco de 50 mL, Caixa 30 cp"
                    value={form.presentation}
                    onChange={(e) => setForm({ ...form, presentation: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Concentração</label>
                  <input
                    type="text"
                    placeholder="Ex: 50mg/ml, 0,2mg"
                    value={form.concentration}
                    onChange={(e) => setForm({ ...form, concentration: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Preço de Venda / Dose (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={form.sale_price || ''}
                    onChange={(e) => setForm({ ...form, sale_price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none font-mono"
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Na Maleta ({form.unit})
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={form.quantity_in_kit}
                    onChange={(e) => setForm({ ...form, quantity_in_kit: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Central ({form.unit})
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={form.quantity_in_stock}
                    onChange={(e) => setForm({ ...form, quantity_in_stock: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Alerta Mín. ({form.unit})
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={form.min_alert_quantity}
                    onChange={(e) => setForm({ ...form, min_alert_quantity: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="controlled"
                  checked={form.is_controlled_substance}
                  onChange={(e) => setForm({ ...form, is_controlled_substance: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="controlled" className="text-xs font-bold text-slate-800 cursor-pointer">
                  Medicamento de Controle Especial (MAPA / Notificação de Receita)
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white transition cursor-pointer"
                >
                  {editingItem ? 'Salvar Alterações' : 'Salvar no Estoque'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal In-App de Confirmação de Exclusão de Item de Estoque */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Excluir Item do Estoque?
            </h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Deseja realmente remover o insumo/medicamento <strong className="text-slate-900">"{itemToDelete.name}"</strong>?
              O registro e os lotes deste item serão removidos do controle de estoque.
            </p>
            <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeletingItem}
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeletingItem}
                onClick={handleConfirmDeleteItem}
                className="px-5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeletingItem ? (
                  <span>Excluindo...</span>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirmar Exclusão</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
