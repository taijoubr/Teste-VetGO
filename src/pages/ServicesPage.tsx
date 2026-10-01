import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ClinicalServiceItem } from '../types';
import {
  Stethoscope,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  X,
  Filter,
  Microscope,
  Syringe,
  Activity,
  FileText,
  DollarSign,
  Tag
} from 'lucide-react';

export const ServicesPage: React.FC = () => {
  const [services, setServices] = useState<ClinicalServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('TODOS');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<ClinicalServiceItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'PROCEDIMENTO' as ClinicalServiceItem['category'],
    price: 50,
    description: '',
    is_active: true
  });
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      setLoading(true);
      const data = await api.getServices();
      setServices(data);
    } catch (err) {
      console.error('Erro ao carregar catálogo de serviços:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenNew = () => {
    setEditingService(null);
    setFormData({
      name: '',
      category: 'PROCEDIMENTO',
      price: 50,
      description: '',
      is_active: true
    });
    setShowModal(true);
  };

  const handleOpenEdit = (svc: ClinicalServiceItem) => {
    setEditingService(svc);
    setFormData({
      name: svc.name,
      category: svc.category,
      price: svc.price,
      description: svc.description || '',
      is_active: svc.is_active
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      if (editingService) {
        await api.updateService(editingService.id, formData);
        setSavedNotice(`Serviço "${formData.name}" atualizado com sucesso!`);
      } else {
        await api.createService(formData);
        setSavedNotice(`Serviço "${formData.name}" cadastrado com sucesso!`);
      }
      setShowModal(false);
      await loadServices();
      setTimeout(() => setSavedNotice(null), 3000);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar serviço. Tente novamente.');
    }
  };

  const handleDelete = async (svc: ClinicalServiceItem) => {
    if (confirm(`Deseja realmente remover o serviço "${svc.name}" do catálogo?`)) {
      await api.deleteService(svc.id);
      setSavedNotice(`Serviço removido com sucesso.`);
      await loadServices();
      setTimeout(() => setSavedNotice(null), 3000);
    }
  };

  const categories = [
    { id: 'TODOS', label: 'Todos os Itens' },
    { id: 'CONSULTA', label: 'Consultas' },
    { id: 'PROCEDIMENTO', label: 'Procedimentos' },
    { id: 'EXAME', label: 'Exames & Laudos' },
    { id: 'VACINA', label: 'Vacinas' },
    { id: 'OUTROS', label: 'Outros' }
  ];

  const filteredServices = services.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.description && s.description.toLowerCase().includes(search.toLowerCase()));
    const matchesCat = selectedCategory === 'TODOS' || s.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const getCategoryBadge = (cat: ClinicalServiceItem['category']) => {
    switch (cat) {
      case 'CONSULTA':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">Consulta</span>;
      case 'PROCEDIMENTO':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">Procedimento</span>;
      case 'EXAME':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">Exame</span>;
      case 'VACINA':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">Vacina</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">Outros</span>;
    }
  };

  const totalExams = services.filter((s) => s.category === 'EXAME').length;
  const totalProcedures = services.filter((s) => s.category === 'PROCEDIMENTO').length;
  const totalConsultations = services.filter((s) => s.category === 'CONSULTA').length;

  return (
    <div className="p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 w-full min-w-0">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Stethoscope className="w-6 h-6 text-emerald-700" />
            Catálogo de Serviços, Procedimentos & Exames
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cadastre consultas, procedimentos clínicos, vacinas e exames com preços padrão para busca e montagem direta de orçamento
          </p>
        </div>

        <button
          onClick={handleOpenNew}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Serviço / Exame</span>
        </button>
      </div>

      {/* Success notification */}
      {savedNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{savedNotice}</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 block">Total Cadastrado</span>
          <span className="text-xl font-bold text-slate-900 font-mono">{services.length}</span>
        </div>
        <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 block">Exames Laboratório / Imagem</span>
          <span className="text-xl font-bold text-amber-700 font-mono">{totalExams}</span>
        </div>
        <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 block">Procedimentos Clínicos</span>
          <span className="text-xl font-bold text-blue-700 font-mono">{totalProcedures}</span>
        </div>
        <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 block">Consultas & Retornos</span>
          <span className="text-xl font-bold text-emerald-700 font-mono">{totalConsultations}</span>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Pesquisar por nome do serviço, exame ou descrição clínica..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-2xs"
          />
        </div>

        {/* Category Pills (Wrapping, zero lateral scroll) */}
        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Services List / Cards */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500 bg-white border border-slate-200 rounded-2xl">
          <div className="w-6 h-6 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          Carregando catálogo de serviços e exames...
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="p-10 text-center bg-white border border-slate-200 rounded-2xl space-y-2">
          <Stethoscope className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-xs font-semibold text-slate-600">Nenhum serviço ou exame encontrado para esta busca.</p>
          <button
            onClick={handleOpenNew}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Cadastrar Novo Serviço
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredServices.map((svc) => (
            <div
              key={svc.id}
              className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:border-slate-300 transition flex flex-col justify-between space-y-3"
            >
              <div className="space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    {getCategoryBadge(svc.category)}
                    <h3 className="font-bold text-slate-900 text-sm mt-1 leading-snug">{svc.name}</h3>
                  </div>
                  <span className="font-mono font-bold text-emerald-800 text-base shrink-0">
                    R$ {Number(svc.price).toFixed(2)}
                  </span>
                </div>

                {svc.description && (
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {svc.description}
                  </p>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className={`text-[10px] font-semibold ${svc.is_active ? 'text-emerald-700' : 'text-slate-400'}`}>
                  {svc.is_active ? '● Ativo no Orçamento' : '○ Inativo'}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(svc)}
                    className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                    title="Editar serviço"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(svc)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                    title="Excluir serviço"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Criar / Editar Serviço */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-emerald-700" />
                {editingService ? 'Editar Serviço / Exame' : 'Novo Serviço / Exame'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome do Serviço / Procedimento / Exame *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Ultrassonografia Abdominal Total Volante"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Categoria *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none bg-white font-medium"
                  >
                    <option value="CONSULTA">Consulta Clínica</option>
                    <option value="PROCEDIMENTO">Procedimento Clínico</option>
                    <option value="EXAME">Exame (Laboratorial / Imagem)</option>
                    <option value="VACINA">Vacinação</option>
                    <option value="OUTROS">Outros</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Valor Padrão / Honorário (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none font-mono focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Descrição & Instruções Clínicas (Opcional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Orientações de preparo, tempo de execução, materiais necessários..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="service-active-check"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="service-active-check" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Disponível para busca e seleção no Orçamento de Atendimentos
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition cursor-pointer shadow-xs"
                >
                  {editingService ? 'Salvar Alterações' : 'Cadastrar Serviço'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
