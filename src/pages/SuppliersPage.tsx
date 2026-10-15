import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Supplier, SupplierCategory } from '../types';
import {
  Truck,
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  Clock,
  DollarSign,
  Copy,
  Check,
  ExternalLink,
  MessageCircle,
  FlaskConical,
  Pill,
  ShieldAlert,
  Edit2,
  Trash2,
  X,
  Send,
  Building2,
  Filter,
  Layers,
  Sparkles,
  Info,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { formatPhone } from '../utils/validators';

const CATEGORY_CONFIG: Record<
  SupplierCategory,
  { label: string; color: string; badgeBg: string; badgeBorder: string; icon: React.ElementType }
> = {
  DISTRIBUIDORA: {
    label: 'Distribuidora Farmacêutica',
    color: 'text-blue-700',
    badgeBg: 'bg-blue-50 text-blue-700',
    badgeBorder: 'border-blue-200',
    icon: Truck,
  },
  LABORATORIO: {
    label: 'Laboratório de Apoio',
    color: 'text-purple-700',
    badgeBg: 'bg-purple-50 text-purple-700',
    badgeBorder: 'border-purple-200',
    icon: FlaskConical,
  },
  MANIPULACAO: {
    label: 'Manipulação Veterinária',
    color: 'text-emerald-700',
    badgeBg: 'bg-emerald-50 text-emerald-700',
    badgeBorder: 'border-emerald-200',
    icon: Pill,
  },
  INSUMOS: {
    label: 'Insumos & Cirúrgicos',
    color: 'text-amber-700',
    badgeBg: 'bg-amber-50 text-amber-700',
    badgeBorder: 'border-amber-200',
    icon: Layers,
  },
  EQUIPAMENTOS: {
    label: 'Equipamentos & Manutenção',
    color: 'text-indigo-700',
    badgeBg: 'bg-indigo-50 text-indigo-700',
    badgeBorder: 'border-indigo-200',
    icon: Building2,
  },
  OUTROS: {
    label: 'Outros Serviços / Insumos',
    color: 'text-slate-700',
    badgeBg: 'bg-slate-100 text-slate-700',
    badgeBorder: 'border-slate-200',
    icon: Building2,
  },
};

export const SuppliersPage: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [copiedPixId, setCopiedPixId] = useState<number | null>(null);

  // Modal create/edit
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<{
    name: string;
    category: SupplierCategory;
    representative_name: string;
    phone: string;
    whatsapp: string;
    email: string;
    website: string;
    city: string;
    state: string;
    pix_key: string;
    delivery_time: string;
    minimum_order: string;
    notes: string;
    is_active: boolean;
  }>({
    name: '',
    category: 'DISTRIBUIDORA',
    representative_name: '',
    phone: '',
    whatsapp: '',
    email: '',
    website: '',
    city: 'São Paulo',
    state: 'SP',
    pix_key: '',
    delivery_time: '',
    minimum_order: '',
    notes: '',
    is_active: true,
  });

  // Modal Quick Quote / WhatsApp Order
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quoteSupplier, setQuoteSupplier] = useState<Supplier | null>(null);
  const [quoteItems, setQuoteItems] = useState<string>('');
  const [quoteUrgency, setQuoteUrgency] = useState<string>('NORMAL');
  const [customQuoteNote, setCustomQuoteNote] = useState<string>('');
  const [copiedQuote, setCopiedQuote] = useState(false);

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const data = await api.getSuppliers();
      setSuppliers(data);
    } catch (e) {
      console.error('Erro ao carregar fornecedores:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPix = (supplierId: number, pixKey: string) => {
    navigator.clipboard.writeText(pixKey);
    setCopiedPixId(supplierId);
    setTimeout(() => setCopiedPixId(null), 2500);
  };

  const handleOpenCreate = () => {
    setEditingSupplier(null);
    setFormData({
      name: '',
      category: 'DISTRIBUIDORA',
      representative_name: '',
      phone: '',
      whatsapp: '',
      email: '',
      website: '',
      city: 'São Paulo',
      state: 'SP',
      pix_key: '',
      delivery_time: '24 a 48 horas',
      minimum_order: '',
      notes: '',
      is_active: true,
    });
    setModalError(null);
    setShowModal(true);
  };

  const handleOpenEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name || '',
      category: supplier.category || 'DISTRIBUIDORA',
      representative_name: supplier.representative_name || '',
      phone: supplier.phone || '',
      whatsapp: supplier.whatsapp || '',
      email: supplier.email || '',
      website: supplier.website || '',
      city: supplier.city || '',
      state: supplier.state || 'SP',
      pix_key: supplier.pix_key || '',
      delivery_time: supplier.delivery_time || '',
      minimum_order: supplier.minimum_order ? String(supplier.minimum_order) : '',
      notes: supplier.notes || '',
      is_active: supplier.is_active !== false,
    });
    setModalError(null);
    setShowModal(true);
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setModalError('Por favor, informe o Nome da Distribuidora ou Fornecedor.');
      return;
    }

    try {
      setSaving(true);
      setModalError(null);

      const payload: Partial<Supplier> = {
        name: formData.name.trim(),
        category: formData.category,
        representative_name: formData.representative_name.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        whatsapp: formData.whatsapp.trim() || undefined,
        email: formData.email.trim() || undefined,
        website: formData.website.trim() || undefined,
        city: formData.city.trim() || undefined,
        state: formData.state.trim() || undefined,
        pix_key: formData.pix_key.trim() || undefined,
        delivery_time: formData.delivery_time.trim() || undefined,
        minimum_order: formData.minimum_order ? Number(formData.minimum_order) : undefined,
        notes: formData.notes.trim() || undefined,
        is_active: formData.is_active,
      };

      if (editingSupplier) {
        await api.updateSupplier(editingSupplier.id, payload);
      } else {
        await api.createSupplier(payload);
      }

      await loadSuppliers();
      setShowModal(false);
    } catch (err: any) {
      setModalError(err.message || 'Erro ao salvar fornecedor. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (window.confirm(`Deseja realmente remover o fornecedor "${name}"?`)) {
      try {
        await api.deleteSupplier(id);
        await loadSuppliers();
      } catch (err) {
        console.error('Erro ao deletar fornecedor:', err);
      }
    }
  };

  // Open Quick Quote / WhatsApp order modal
  const handleOpenQuote = (supplier: Supplier) => {
    setQuoteSupplier(supplier);
    setQuoteItems('');
    setQuoteUrgency('NORMAL');
    setCustomQuoteNote('');
    setCopiedQuote(false);
    setShowQuoteModal(true);
  };

  const generateWhatsAppMessage = () => {
    if (!quoteSupplier) return '';

    const rep = quoteSupplier.representative_name ? ` ${quoteSupplier.representative_name}` : '';
    const urgencyText =
      quoteUrgency === 'URGENTE'
        ? '🚨 *PEDIDO COM URGÊNCIA CLÍNICA*'
        : quoteUrgency === 'HOJE'
        ? '⚡ *ENTREGA PREFERENCIAL PARA HOJE*'
        : '📋 *SOLICITAÇÃO DE COTAÇÃO / PEDIDO*';

    let msg = `Olá${rep}! Sou veterinário(a) e utilizo o sistema Vetgo.\n\n`;
    msg += `${urgencyText}\n`;
    msg += `Fornecedor: *${quoteSupplier.name}*\n\n`;

    if (quoteItems.trim()) {
      msg += `*Itens solicitados:*\n${quoteItems.trim()}\n\n`;
    } else {
      msg += `Gostaria de verificar a disponibilidade e valores para reposição de medicamentos e materiais.\n\n`;
    }

    if (customQuoteNote.trim()) {
      msg += `*Observações:* ${customQuoteNote.trim()}\n\n`;
    }

    msg += `Poderia me confirmar a disponibilidade e prazo de envio? Obrigado!`;
    return msg;
  };

  const handleSendWhatsApp = () => {
    if (!quoteSupplier?.whatsapp) {
      alert('Este fornecedor não possui número de WhatsApp cadastrado.');
      return;
    }

    const cleanNum = quoteSupplier.whatsapp.replace(/\D/g, '');
    const phoneWithCountry = cleanNum.startsWith('55') ? cleanNum : `55${cleanNum}`;
    const text = encodeURIComponent(generateWhatsAppMessage());
    window.open(`https://wa.me/${phoneWithCountry}?text=${text}`, '_blank');
  };

  const handleCopyQuoteMessage = () => {
    const text = generateWhatsAppMessage();
    navigator.clipboard.writeText(text);
    setCopiedQuote(true);
    setTimeout(() => setCopiedQuote(false), 2500);
  };

  // Filtering
  const filteredSuppliers = suppliers.filter((item) => {
    const matchesCategory =
      selectedCategory === 'ALL' || item.category === selectedCategory;

    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      item.name.toLowerCase().includes(q) ||
      (item.representative_name && item.representative_name.toLowerCase().includes(q)) ||
      (item.city && item.city.toLowerCase().includes(q)) ||
      (item.notes && item.notes.toLowerCase().includes(q)) ||
      (item.email && item.email.toLowerCase().includes(q));

    return matchesCategory && matchesSearch;
  });

  // Metrics
  const totalCount = suppliers.length;
  const distCount = suppliers.filter((s) => s.category === 'DISTRIBUIDORA').length;
  const labCount = suppliers.filter((s) => s.category === 'LABORATORIO').length;
  const manipCount = suppliers.filter((s) => s.category === 'MANIPULACAO').length;
  const insumosCount = suppliers.filter((s) => s.category === 'INSUMOS' || s.category === 'EQUIPAMENTOS').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
                Fornecedores & Parceiros
              </h1>
              <p className="text-sm text-slate-500">
                Distribuidoras farmacêuticas, laboratórios de apoio diagnóstico, manipulação e insumos cirúrgicos.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-xl shadow-sm transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            Novo Fornecedor
          </button>
        </div>
      </div>

      {/* Quick Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="p-2.5 bg-blue-50 text-blue-700 rounded-lg">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Distribuidoras</p>
            <p className="text-xl font-bold text-slate-800">{distCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="p-2.5 bg-purple-50 text-purple-700 rounded-lg">
            <FlaskConical className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Laboratórios</p>
            <p className="text-xl font-bold text-slate-800">{labCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-lg">
            <Pill className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Manipulação</p>
            <p className="text-xl font-bold text-slate-800">{manipCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="p-2.5 bg-amber-50 text-amber-700 rounded-lg">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Insumos & Outros</p>
            <p className="text-xl font-bold text-slate-800">{insumosCount}</p>
          </div>
        </div>
      </div>

      {/* Search & Category Filter Pills */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nome, representante, cidade ou produto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Exibindo <span className="font-bold text-slate-800">{filteredSuppliers.length}</span> de{' '}
            <span className="font-bold text-slate-800">{totalCount}</span> cadastrados
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedCategory === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({totalCount})
          </button>
          <button
            onClick={() => setSelectedCategory('DISTRIBUIDORA')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedCategory === 'DISTRIBUIDORA'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            Distribuidoras Farmacêuticas ({distCount})
          </button>
          <button
            onClick={() => setSelectedCategory('LABORATORIO')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedCategory === 'LABORATORIO'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
            }`}
          >
            Laboratórios de Análise ({labCount})
          </button>
          <button
            onClick={() => setSelectedCategory('MANIPULACAO')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedCategory === 'MANIPULACAO'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            Farmácias de Manipulação ({manipCount})
          </button>
          <button
            onClick={() => setSelectedCategory('INSUMOS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedCategory === 'INSUMOS'
                ? 'bg-amber-700 text-white shadow-xs'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            Insumos & Cirúrgicos
          </button>
          <button
            onClick={() => setSelectedCategory('EQUIPAMENTOS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedCategory === 'EQUIPAMENTOS'
                ? 'bg-indigo-700 text-white shadow-xs'
                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
            }`}
          >
            Equipamentos & Manutenção
          </button>
        </div>
      </div>

      {/* Suppliers Grid */}
      {loading ? (
        <div className="py-16 text-center">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-slate-500 font-medium">Carregando parceiros e distribuidoras...</p>
        </div>
      ) : filteredSuppliers.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center max-w-lg mx-auto">
          <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Truck className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-1">Nenhum fornecedor encontrado</h3>
          <p className="text-sm text-slate-500 mb-6">
            {search || selectedCategory !== 'ALL'
              ? 'Nenhum parceiro corresponde aos filtros aplicados. Tente ajustar o termo de busca.'
              : 'Cadastre suas distribuidoras parceiras, laboratórios de apoio e farmácias para agilizar cotações e compras de medicamentos.'}
          </p>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 text-white text-sm font-semibold rounded-lg hover:bg-emerald-800 transition-all shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Cadastrar Primeiro Fornecedor
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSuppliers.map((supplier) => {
            const config = CATEGORY_CONFIG[supplier.category] || CATEGORY_CONFIG.OUTROS;
            const CategoryIcon = config.icon;

            return (
              <div
                key={supplier.id}
                className="bg-white rounded-xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
              >
                {/* Header Card */}
                <div className="p-4 border-b border-slate-100">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.badgeBg} ${config.badgeBorder}`}
                    >
                      <CategoryIcon className="w-3.5 h-3.5" />
                      {config.label}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(supplier)}
                        title="Editar Fornecedor"
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(supplier.id, supplier.name)}
                        title="Excluir Fornecedor"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-slate-800 leading-snug line-clamp-1">
                    {supplier.name}
                  </h3>

                  {supplier.representative_name && (
                    <p className="text-xs text-slate-600 font-medium flex items-center gap-1.5 mt-1">
                      <span className="text-slate-400">Rep:</span>
                      <span className="text-slate-700 font-semibold">{supplier.representative_name}</span>
                    </p>
                  )}

                  {supplier.city && (
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>
                        {supplier.city}
                        {supplier.state ? ` - ${supplier.state}` : ''}
                      </span>
                    </p>
                  )}
                </div>

                {/* Details Section */}
                <div className="p-4 space-y-2.5 text-xs text-slate-600 flex-1">
                  {/* Delivery and Min Order badges */}
                  <div className="grid grid-cols-2 gap-2">
                    {supplier.delivery_time && (
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Entrega</span>
                        <div className="flex items-center gap-1 font-semibold text-slate-700 mt-0.5 truncate">
                          <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                          <span className="truncate">{supplier.delivery_time}</span>
                        </div>
                      </div>
                    )}

                    {supplier.minimum_order !== undefined && supplier.minimum_order > 0 ? (
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Ped. Mínimo</span>
                        <div className="flex items-center gap-1 font-semibold text-slate-700 mt-0.5 truncate">
                          <DollarSign className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>
                            {supplier.minimum_order.toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            })}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Ped. Mínimo</span>
                        <div className="font-semibold text-slate-600 mt-0.5">Sem mínimo</div>
                      </div>
                    )}
                  </div>

                  {/* PIX Key if available */}
                  {supplier.pix_key && (
                    <div className="flex items-center justify-between bg-emerald-50/60 border border-emerald-100 p-2 rounded-lg">
                      <div className="truncate mr-2">
                        <span className="text-[10px] font-bold text-emerald-800 uppercase block">Chave PIX</span>
                        <span className="font-mono text-xs text-emerald-950 truncate block">
                          {supplier.pix_key}
                        </span>
                      </div>
                      <button
                        onClick={() => handleCopyPix(supplier.id, supplier.pix_key!)}
                        className="px-2 py-1 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded text-[11px] font-semibold flex items-center gap-1 transition-all shrink-0"
                      >
                        {copiedPixId === supplier.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Notes / Special information */}
                  {supplier.notes && (
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                        {supplier.notes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer with Contact Actions */}
                <div className="p-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {supplier.whatsapp && (
                      <a
                        href={`https://wa.me/55${supplier.whatsapp.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        title="Conversar no WhatsApp"
                        className="p-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </a>
                    )}

                    {supplier.phone && (
                      <a
                        href={`tel:${supplier.phone.replace(/\D/g, '')}`}
                        title="Ligar"
                        className="p-2 bg-white hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg transition-colors"
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                    )}

                    {supplier.email && (
                      <a
                        href={`mailto:${supplier.email}`}
                        title="Enviar E-mail"
                        className="p-2 bg-white hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg transition-colors"
                      >
                        <Mail className="w-4 h-4" />
                      </a>
                    )}

                    {supplier.website && (
                      <a
                        href={supplier.website.startsWith('http') ? supplier.website : `https://${supplier.website}`}
                        target="_blank"
                        rel="noreferrer"
                        title="Acessar Site / Catálogo"
                        className="p-2 bg-white hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>

                  <button
                    onClick={() => handleOpenQuote(supplier)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold transition-all shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Fazer Pedido / Cotação
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: CREATE / EDIT SUPPLIER */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    {editingSupplier ? 'Editar Fornecedor / Parceiro' : 'Novo Fornecedor / Parceiro'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Cadastre dados de contato comercial, prazos e condições financeiras
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="p-6 space-y-4">
              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Nome Fantasia / Distribuidora *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Distribuidora VetPrime, Laboratório VetPat, DrogaVet"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Categoria do Fornecedor *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value as SupplierCategory })
                    }
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                  >
                    <option value="DISTRIBUIDORA">Distribuidora Farmacêutica</option>
                    <option value="LABORATORIO">Laboratório de Apoio Diagnóstico</option>
                    <option value="MANIPULACAO">Farmácia de Manipulação Veterinária</option>
                    <option value="INSUMOS">Insumos & Materiais Cirúrgicos</option>
                    <option value="EQUIPAMENTOS">Equipamentos & Manutenção</option>
                    <option value="OUTROS">Outros Serviços / Insumos</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Representante Comercial / Contato
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Carlos Henrique (Vendedor)"
                    value={formData.representative_name}
                    onChange={(e) => setFormData({ ...formData, representative_name: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    WhatsApp Comercial / Pedidos
                  </label>
                  <input
                    type="text"
                    placeholder="(11) 98765-4321"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: formatPhone(e.target.value) })}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Telefone Fixo / PABX
                  </label>
                  <input
                    type="text"
                    placeholder="(11) 3456-7890"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    E-mail para Pedidos e Cotações
                  </label>
                  <input
                    type="email"
                    placeholder="pedidos@distribuidora.com.br"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Site / Catálogo Online
                  </label>
                  <input
                    type="text"
                    placeholder="https://www.distribuidora.com.br"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Cidade
                  </label>
                  <input
                    type="text"
                    placeholder="São Paulo"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Estado (UF)
                  </label>
                  <input
                    type="text"
                    maxLength={2}
                    placeholder="SP"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Prazo Médio de Entrega
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 24h a 48 horas, Mesmo dia"
                    value={formData.delivery_time}
                    onChange={(e) => setFormData({ ...formData, delivery_time: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Pedido Mínimo (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Ex: 350.00"
                    value={formData.minimum_order}
                    onChange={(e) => setFormData({ ...formData, minimum_order: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Chave PIX para Pagamentos
                  </label>
                  <input
                    type="text"
                    placeholder="CNPJ, E-mail ou chave aleatória do fornecedor"
                    value={formData.pix_key}
                    onChange={(e) => setFormData({ ...formData, pix_key: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Condições Comerciais, Horários & Observações
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Ex: Boleto 28 dias; Frete grátis acima de R$ 500; Motoboy busca amostras até 17h; Tubo EDTA refrigerado..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none resize-none"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-lg shadow-sm transition-all"
                >
                  {saving ? 'Salvando...' : editingSupplier ? 'Atualizar Fornecedor' : 'Cadastrar Fornecedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: QUICK QUOTE / WHATSAPP ORDER */}
      {showQuoteModal && quoteSupplier && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-600 text-white rounded-lg">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    Enviar Pedido / Cotação via WhatsApp
                  </h3>
                  <p className="text-xs text-slate-500">
                    Para: <span className="font-semibold text-slate-700">{quoteSupplier.name}</span>
                    {quoteSupplier.representative_name ? ` (Rep: ${quoteSupplier.representative_name})` : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowQuoteModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Urgência da Solicitação
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setQuoteUrgency('NORMAL')}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all ${
                      quoteUrgency === 'NORMAL'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Normal (Reposição)
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuoteUrgency('HOJE')}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all ${
                      quoteUrgency === 'HOJE'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    ⚡ Entrega Hoje
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuoteUrgency('URGENTE')}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all ${
                      quoteUrgency === 'URGENTE'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    🚨 Emergência
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Itens & Quantidades Solicitadas
                </label>
                <textarea
                  rows={4}
                  placeholder={`Exemplo:\n- 5 frascos de Propofol 1% 20ml\n- 2 caixas de Seringas 3ml com agulha\n- 10 doses Vacina Nobivac Puppy\n- 1 litro Álcool 70%`}
                  value={quoteItems}
                  onChange={(e) => setQuoteItems(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-mono text-xs leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Observações Adicionais (Endereço, Boleto, etc.)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Faturar no boleto 28 dias ou entregar na Clínica Central"
                  value={customQuoteNote}
                  onChange={(e) => setCustomQuoteNote(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                />
              </div>

              {/* Preview of message */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Pré-visualização da Mensagem:
                </span>
                <p className="text-xs text-slate-700 whitespace-pre-wrap font-sans bg-white p-2.5 rounded-lg border border-slate-100 max-h-36 overflow-y-auto">
                  {generateWhatsAppMessage()}
                </p>
              </div>

              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleCopyQuoteMessage}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  {copiedQuote ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Mensagem Copiada!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Texto</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowQuoteModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Fechar
                  </button>
                  <button
                    type="button"
                    onClick={handleSendWhatsApp}
                    className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm transition-all flex items-center gap-1.5"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Abrir no WhatsApp
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
