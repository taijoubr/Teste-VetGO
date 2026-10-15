import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import {
  Supplier,
  SupplierCategory,
  SupplierOrder,
  SupplierOrderStatus,
  SupplierOrderUrgency,
  SupplierOrderItem
} from '../types';
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
  Layers,
  Building2,
  Filter,
  Send,
  X,
  Edit2,
  Trash2,
  AlertCircle,
  TrendingUp,
  Package,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Calendar,
  FileText,
  BarChart3,
  ListOrdered,
  Eye,
  RefreshCw
} from 'lucide-react';
import { formatPhone } from '../utils/validators';

const CATEGORY_CONFIG: Record<
  SupplierCategory,
  { label: string; color: string; badgeBg: string; badgeBorder: string; barColor: string; icon: React.ElementType }
> = {
  DISTRIBUIDORA: {
    label: 'Distribuidora Farmacêutica',
    color: 'text-blue-700',
    badgeBg: 'bg-blue-50 text-blue-700',
    badgeBorder: 'border-blue-200',
    barColor: 'bg-blue-600',
    icon: Truck,
  },
  LABORATORIO: {
    label: 'Laboratório de Apoio',
    color: 'text-purple-700',
    badgeBg: 'bg-purple-50 text-purple-700',
    badgeBorder: 'border-purple-200',
    barColor: 'bg-purple-600',
    icon: FlaskConical,
  },
  MANIPULACAO: {
    label: 'Manipulação Veterinária',
    color: 'text-emerald-700',
    badgeBg: 'bg-emerald-50 text-emerald-700',
    badgeBorder: 'border-emerald-200',
    barColor: 'bg-emerald-600',
    icon: Pill,
  },
  INSUMOS: {
    label: 'Insumos & Cirúrgicos',
    color: 'text-amber-700',
    badgeBg: 'bg-amber-50 text-amber-700',
    badgeBorder: 'border-amber-200',
    barColor: 'bg-amber-600',
    icon: Layers,
  },
  EQUIPAMENTOS: {
    label: 'Equipamentos & Manutenção',
    color: 'text-indigo-700',
    badgeBg: 'bg-indigo-50 text-indigo-700',
    badgeBorder: 'border-indigo-200',
    barColor: 'bg-indigo-600',
    icon: Building2,
  },
  OUTROS: {
    label: 'Outros Serviços / Insumos',
    color: 'text-slate-700',
    badgeBg: 'bg-slate-100 text-slate-700',
    badgeBorder: 'border-slate-200',
    barColor: 'bg-slate-600',
    icon: Building2,
  },
};

const STATUS_CONFIG: Record<
  SupplierOrderStatus,
  { label: string; bg: string; text: string; border: string; icon: React.ElementType }
> = {
  PENDENTE: {
    label: 'Pendente / Cotação',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    icon: Clock,
  },
  APROVADO: {
    label: 'Aprovado / Faturado',
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    border: 'border-blue-200',
    icon: FileText,
  },
  EM_TRANSITO: {
    label: 'Em Trânsito',
    bg: 'bg-indigo-50',
    text: 'text-indigo-800',
    border: 'border-indigo-200',
    icon: Truck,
  },
  ENTREGUE: {
    label: 'Entregue & Estocado',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
    icon: CheckCircle2,
  },
  CANCELADO: {
    label: 'Cancelado',
    bg: 'bg-slate-50',
    text: 'text-slate-600',
    border: 'border-slate-200',
    icon: X,
  },
};

export const SuppliersPage: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<SupplierOrder[]>([]);
  const [loading, setLoading] = useState(true);

  // View state
  const [activeTab, setActiveTab] = useState<'dashboard' | 'suppliers' | 'orders'>('dashboard');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('ALL');
  const [copiedPixId, setCopiedPixId] = useState<number | null>(null);

  // Supplier modal state
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [savingSupplier, setSavingSupplier] = useState(false);
  const [supplierModalError, setSupplierModalError] = useState<string | null>(null);
  const [supplierFormData, setSupplierFormData] = useState<{
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
    delivery_time: '24 a 48 horas',
    minimum_order: '',
    notes: '',
    is_active: true,
  });

  // Order modal state
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [orderModalError, setOrderModalError] = useState<string | null>(null);
  const [newOrderData, setNewOrderData] = useState<{
    supplier_id: number;
    urgency: SupplierOrderUrgency;
    status: SupplierOrderStatus;
    expected_delivery_date: string;
    payment_method: string;
    notes: string;
    items: { name: string; quantity: number; unit: string; unit_price: number }[];
  }>({
    supplier_id: 0,
    urgency: 'NORMAL',
    status: 'PENDENTE',
    expected_delivery_date: 'Hoje ou amanhã',
    payment_method: 'Boleto 28d',
    notes: '',
    items: [{ name: '', quantity: 1, unit: 'unid.', unit_price: 0 }],
  });

  // Quick WhatsApp Modal
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quoteSupplier, setQuoteSupplier] = useState<Supplier | null>(null);
  const [quoteItems, setQuoteItems] = useState<string>('');
  const [quoteUrgency, setQuoteUrgency] = useState<SupplierOrderUrgency>('NORMAL');
  const [customQuoteNote, setCustomQuoteNote] = useState<string>('');
  const [copiedQuote, setCopiedQuote] = useState(false);

  // In-app Delete Confirmation Modal (100% reliable inside iFrames, avoids blocked window.confirm)
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    type: 'order' | 'supplier';
    id: number;
    title: string;
    subtitle: string;
    itemSummary?: string;
    badgeText?: string;
    status?: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setFeedbackToast({ message, type });
    setTimeout(() => {
      setFeedbackToast((cur) => (cur?.message === message ? null : cur));
    }, 4000);
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [suppliersData, ordersData] = await Promise.all([
        api.getSuppliers(),
        api.getSupplierOrders(),
      ]);
      setSuppliers(suppliersData || []);
      setOrders(ordersData || []);
    } catch (e) {
      console.error('Erro ao carregar dados de fornecedores e pedidos:', e);
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // ANALYTICS & DASHBOARD CALCULATIONS
  // -------------------------------------------------------------
  const dashboardStats = useMemo(() => {
    const totalPurchasedVolume = orders
      .filter((o) => o.status !== 'CANCELADO')
      .reduce((sum, o) => sum + (o.total_amount || 0), 0);

    const pendingOrders = orders.filter((o) => o.status === 'PENDENTE' || o.status === 'APROVADO' || o.status === 'EM_TRANSITO');
    const pendingAmount = pendingOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

    const deliveredOrders = orders.filter((o) => o.status === 'ENTREGUE');
    const deliveredAmount = deliveredOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

    // Volume by Supplier
    const volumeBySupplierMap: Record<
      string,
      {
        supplier_id: number;
        supplier_name: string;
        category: SupplierCategory;
        total_spent: number;
        orders_count: number;
        pending_count: number;
        last_order_date?: string;
      }
    > = {};

    orders.forEach((ord) => {
      if (ord.status === 'CANCELADO') return;
      const key = ord.supplier_name;
      if (!volumeBySupplierMap[key]) {
        volumeBySupplierMap[key] = {
          supplier_id: ord.supplier_id,
          supplier_name: ord.supplier_name,
          category: ord.supplier_category || 'DISTRIBUIDORA',
          total_spent: 0,
          orders_count: 0,
          pending_count: 0,
          last_order_date: ord.created_at,
        };
      }
      volumeBySupplierMap[key].total_spent += ord.total_amount || 0;
      volumeBySupplierMap[key].orders_count += 1;
      if (ord.status === 'PENDENTE' || ord.status === 'APROVADO' || ord.status === 'EM_TRANSITO') {
        volumeBySupplierMap[key].pending_count += 1;
      }
      if (!volumeBySupplierMap[key].last_order_date || new Date(ord.created_at) > new Date(volumeBySupplierMap[key].last_order_date!)) {
        volumeBySupplierMap[key].last_order_date = ord.created_at;
      }
    });

    const supplierVolumes = Object.values(volumeBySupplierMap).sort((a, b) => b.total_spent - a.total_spent);

    // Status breakdown
    const statusCounts = {
      PENDENTE: orders.filter((o) => o.status === 'PENDENTE'),
      APROVADO: orders.filter((o) => o.status === 'APROVADO'),
      EM_TRANSITO: orders.filter((o) => o.status === 'EM_TRANSITO'),
      ENTREGUE: orders.filter((o) => o.status === 'ENTREGUE'),
      CANCELADO: orders.filter((o) => o.status === 'CANCELADO'),
    };

    return {
      totalPurchasedVolume,
      pendingOrdersCount: pendingOrders.length,
      pendingAmount,
      deliveredOrdersCount: deliveredOrders.length,
      deliveredAmount,
      supplierVolumes,
      statusCounts,
      totalOrdersCount: orders.length,
      avgTicket: orders.length > 0 ? totalPurchasedVolume / Math.max(1, orders.filter(o => o.status !== 'CANCELADO').length) : 0,
    };
  }, [orders]);

  // -------------------------------------------------------------
  // SUPPLIER ACTIONS
  // -------------------------------------------------------------
  const handleOpenCreateSupplier = () => {
    setEditingSupplier(null);
    setSupplierFormData({
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
    setSupplierModalError(null);
    setShowSupplierModal(true);
  };

  const handleOpenEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setSupplierFormData({
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
    setSupplierModalError(null);
    setShowSupplierModal(true);
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierFormData.name.trim()) {
      setSupplierModalError('Por favor, informe o Nome do Fornecedor / Distribuidora.');
      return;
    }

    try {
      setSavingSupplier(true);
      setSupplierModalError(null);

      const payload: Partial<Supplier> = {
        name: supplierFormData.name.trim(),
        category: supplierFormData.category,
        representative_name: supplierFormData.representative_name.trim() || undefined,
        phone: supplierFormData.phone.trim() || undefined,
        whatsapp: supplierFormData.whatsapp.trim() || undefined,
        email: supplierFormData.email.trim() || undefined,
        website: supplierFormData.website.trim() || undefined,
        city: supplierFormData.city.trim() || undefined,
        state: supplierFormData.state.trim() || undefined,
        pix_key: supplierFormData.pix_key.trim() || undefined,
        delivery_time: supplierFormData.delivery_time.trim() || undefined,
        minimum_order: supplierFormData.minimum_order ? Number(supplierFormData.minimum_order) : undefined,
        notes: supplierFormData.notes.trim() || undefined,
        is_active: supplierFormData.is_active,
      };

      if (editingSupplier) {
        await api.updateSupplier(editingSupplier.id, payload);
      } else {
        await api.createSupplier(payload);
      }

      await loadData();
      setShowSupplierModal(false);
    } catch (err: any) {
      setSupplierModalError(err.message || 'Erro ao salvar fornecedor.');
    } finally {
      setSavingSupplier(false);
    }
  };

  const promptDeleteSupplier = (supplier: Supplier) => {
    setDeleteConfirm({
      isOpen: true,
      type: 'supplier',
      id: supplier.id,
      title: supplier.name,
      subtitle: `Categoria: ${CATEGORY_CONFIG[supplier.category]?.label || supplier.category} • ${supplier.city || 'Sem localidade'}-${supplier.state || 'UF'}`,
      badgeText: CATEGORY_CONFIG[supplier.category]?.label,
    });
  };

  const handleCopyPix = (supplierId: number, pixKey: string) => {
    navigator.clipboard.writeText(pixKey);
    setCopiedPixId(supplierId);
    setTimeout(() => setCopiedPixId(null), 2500);
  };

  // -------------------------------------------------------------
  // ORDER ACTIONS & STATUS MANAGEMENT
  // -------------------------------------------------------------
  const handleUpdateOrderStatus = async (orderId: number, newStatus: SupplierOrderStatus) => {
    try {
      await api.updateSupplierOrder(orderId, { status: newStatus });
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                status: newStatus,
                received_at: newStatus === 'ENTREGUE' ? new Date().toISOString() : o.received_at,
              }
            : o
        )
      );
      showToast(`Status atualizado para "${STATUS_CONFIG[newStatus]?.label || newStatus}"`, 'success');
    } catch (e) {
      console.error('Erro ao atualizar status do pedido:', e);
      showToast('Não foi possível atualizar o status do pedido.', 'error');
    }
  };

  const promptDeleteOrder = (ord: SupplierOrder) => {
    const isCotacao = ord.status === 'PENDENTE';
    setDeleteConfirm({
      isOpen: true,
      type: 'order',
      id: ord.id,
      title: isCotacao ? `Cotação #${ord.order_number}` : `Pedido #${ord.order_number}`,
      subtitle: `Fornecedor: ${ord.supplier_name}`,
      itemSummary: `${ord.items.length} item(ns) na lista • ${
        ord.total_amount > 0
          ? ord.total_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
          : 'Valor sob cotação'
      }`,
      badgeText: isCotacao ? '🟡 Em Cotação' : STATUS_CONFIG[ord.status]?.label,
      status: ord.status,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      setIsDeleting(true);
      if (deleteConfirm.type === 'order') {
        await api.deleteSupplierOrder(deleteConfirm.id);
        setOrders((prev) => prev.filter((o) => Number(o.id) !== Number(deleteConfirm.id)));
        showToast(`${deleteConfirm.title} excluído com sucesso!`, 'success');
      } else {
        await api.deleteSupplier(deleteConfirm.id);
        setSuppliers((prev) => prev.filter((s) => Number(s.id) !== Number(deleteConfirm.id)));
        showToast(`Fornecedor "${deleteConfirm.title}" removido com sucesso!`, 'success');
      }
      setDeleteConfirm(null);
    } catch (err: any) {
      console.error('Erro ao excluir:', err);
      showToast(err.message || 'Erro ao realizar a exclusão.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenCreateOrder = (targetSupplierId?: number) => {
    const supId = targetSupplierId || (suppliers[0]?.id || 1);
    setNewOrderData({
      supplier_id: supId,
      urgency: 'NORMAL',
      status: 'PENDENTE',
      expected_delivery_date: 'Em até 48 horas',
      payment_method: 'Boleto 28d',
      notes: '',
      items: [
        { name: 'Propofol 1% 20ml', quantity: 5, unit: 'frascos', unit_price: 32.5 },
        { name: 'Cateter Intravenoso 22G', quantity: 20, unit: 'unidades', unit_price: 2.1 },
      ],
    });
    setOrderModalError(null);
    setShowOrderModal(true);
  };

  const handleAddItemToOrder = () => {
    setNewOrderData((prev) => ({
      ...prev,
      items: [...prev.items, { name: '', quantity: 1, unit: 'unid.', unit_price: 0 }],
    }));
  };

  const handleRemoveItemFromOrder = (index: number) => {
    setNewOrderData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleSaveNewOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const sup = suppliers.find((s) => s.id === Number(newOrderData.supplier_id)) || suppliers[0];
    if (!sup) {
      setOrderModalError('Selecione um fornecedor válido.');
      return;
    }

    const validItems: SupplierOrderItem[] = newOrderData.items
      .filter((it) => it.name.trim())
      .map((it) => ({
        name: it.name.trim(),
        quantity: Number(it.quantity) || 1,
        unit: it.unit || 'unid.',
        unit_price: Number(it.unit_price) || 0,
        total_price: (Number(it.quantity) || 1) * (Number(it.unit_price) || 0),
      }));

    if (validItems.length === 0) {
      setOrderModalError('Adicione pelo menos um item ao pedido.');
      return;
    }

    const totalAmount = validItems.reduce((acc, it) => acc + (it.total_price || 0), 0);

    try {
      setSavingOrder(true);
      setOrderModalError(null);

      const created = await api.createSupplierOrder({
        supplier_id: sup.id,
        supplier_name: sup.name,
        supplier_category: sup.category,
        representative_name: sup.representative_name,
        representative_phone: sup.whatsapp || sup.phone,
        items: validItems,
        total_amount: totalAmount,
        status: newOrderData.status,
        urgency: newOrderData.urgency,
        expected_delivery_date: newOrderData.expected_delivery_date,
        payment_method: newOrderData.payment_method,
        notes: newOrderData.notes,
      });

      setOrders((prev) => [created, ...prev]);
      setShowOrderModal(false);
    } catch (err: any) {
      setOrderModalError(err.message || 'Erro ao registrar pedido.');
    } finally {
      setSavingOrder(false);
    }
  };

  // Quick WhatsApp Quote
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

    let msg = `Olá${rep}! Sou médico-veterinário e utilizo o sistema Vetgo.\n\n`;
    msg += `${urgencyText}\n`;
    msg += `Fornecedor: *${quoteSupplier.name}*\n\n`;

    if (quoteItems.trim()) {
      msg += `*Itens solicitados:*\n${quoteItems.trim()}\n\n`;
    } else {
      msg += `Gostaria de verificar disponibilidade e valores para reposição de medicamentos e materiais.\n\n`;
    }

    if (customQuoteNote.trim()) {
      msg += `*Observações:* ${customQuoteNote.trim()}\n\n`;
    }

    msg += `Poderia me confirmar a disponibilidade e prazo de envio? Obrigado!`;
    return msg;
  };

  const handleSendWhatsApp = () => {
    if (!quoteSupplier?.whatsapp) {
      showToast('Este fornecedor não possui WhatsApp cadastrado.', 'error');
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

  // -------------------------------------------------------------
  // FILTERS
  // -------------------------------------------------------------
  const filteredSuppliers = suppliers.filter((item) => {
    const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      item.name.toLowerCase().includes(q) ||
      (item.representative_name && item.representative_name.toLowerCase().includes(q)) ||
      (item.city && item.city.toLowerCase().includes(q)) ||
      (item.notes && item.notes.toLowerCase().includes(q));

    return matchesCategory && matchesSearch;
  });

  const filteredOrders = orders.filter((ord) => {
    const matchesStatus = orderStatusFilter === 'ALL' || ord.status === orderStatusFilter;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      ord.order_number.toLowerCase().includes(q) ||
      ord.supplier_name.toLowerCase().includes(q) ||
      (ord.notes && ord.notes.toLowerCase().includes(q)) ||
      ord.items.some((it) => it.name.toLowerCase().includes(q));

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-sm">
            <Truck className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Fornecedores & Gestão de Insumos
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                Gestão Volante
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Volume de compras por distribuidora, pipeline de pedidos pendentes e catálogo de parceiros.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => handleOpenCreateOrder()}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            Novo Pedido / Cotação
          </button>

          <button
            onClick={handleOpenCreateSupplier}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-[0.98] cursor-pointer"
          >
            <Building2 className="w-4 h-4" />
            Cadastrar Fornecedor
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-100/80 rounded-xl border border-slate-200/70 w-fit">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'dashboard'
              ? 'bg-white text-emerald-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-emerald-700" />
          Dashboard de Compras & Insumos
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'orders'
              ? 'bg-white text-emerald-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <ListOrdered className="w-4 h-4 text-indigo-700" />
          Pedidos & Reposições ({orders.length})
          {dashboardStats.pendingOrdersCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-amber-500 text-white">
              {dashboardStats.pendingOrdersCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('suppliers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'suppliers'
              ? 'bg-white text-emerald-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Building2 className="w-4 h-4 text-blue-700" />
          Diretório de Fornecedores ({suppliers.length})
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DASHBOARD DE COMPRAS & WIDGETS */}
      {/* ========================================================================= */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Top KPI Widgets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Widget KPI 1: Volume Total de Compras */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Volume Total de Compras
                </span>
                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-slate-900">
                {dashboardStats.totalPurchasedVolume.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })}
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                <span>Total em compras de insumos e medicamentos</span>
              </div>
              <div className="absolute -bottom-1 left-0 right-0 h-1 bg-emerald-600" />
            </div>

            {/* Widget KPI 2: Pedidos Pendentes / Em Aberto */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">
                  Pedidos em Aberto / Pendentes
                </span>
                <div className="p-2 bg-amber-50 text-amber-700 rounded-xl">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-amber-700">
                  {dashboardStats.pendingOrdersCount}
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  ({dashboardStats.pendingAmount.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })})
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-700">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Aguardando cotação ou entrega de insumos</span>
              </div>
              <div className="absolute -bottom-1 left-0 right-0 h-1 bg-amber-500" />
            </div>

            {/* Widget KPI 3: Pedidos Entregues / Conferidos */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                  Pedidos Entregues
                </span>
                <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-indigo-900">
                  {dashboardStats.deliveredOrdersCount}
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  ({dashboardStats.deliveredAmount.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })})
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500">
                <Package className="w-3.5 h-3.5 text-indigo-600" />
                <span>Itens conferidos e estocados</span>
              </div>
              <div className="absolute -bottom-1 left-0 right-0 h-1 bg-indigo-600" />
            </div>

            {/* Widget KPI 4: Ticket Médio de Reposição */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                  Ticket Médio por Pedido
                </span>
                <div className="p-2 bg-blue-50 text-blue-700 rounded-xl">
                  <BarChart3 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-blue-900">
                {dashboardStats.avgTicket.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })}
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Baseado em {dashboardStats.totalOrdersCount} pedidos registrados</span>
              </div>
              <div className="absolute -bottom-1 left-0 right-0 h-1 bg-blue-600" />
            </div>
          </div>

          {/* Grid Principal: Volume de Compras por Fornecedor (Widget Principal) + Pipeline de Pedidos */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* WIDGET 1: Volume de Compras por Fornecedor (Ranking & Barras) */}
            <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-700" />
                    Volume de Compras por Fornecedor
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Participação financeira e total investido em cada distribuidora e parceiro
                  </p>
                </div>

                <button
                  onClick={() => setActiveTab('suppliers')}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                >
                  Ver Todos <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {dashboardStats.supplierVolumes.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Nenhum pedido de compra registrado ainda para calcular o volume.
                </div>
              ) : (
                <div className="space-y-4">
                  {dashboardStats.supplierVolumes.map((item, index) => {
                    const percentage = dashboardStats.totalPurchasedVolume > 0
                      ? Math.round((item.total_spent / dashboardStats.totalPurchasedVolume) * 100)
                      : 0;

                    const config = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.OUTROS;
                    const Icon = config.icon;

                    return (
                      <div
                        key={item.supplier_name}
                        className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-all space-y-2.5"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 truncate">
                            <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 text-xs font-extrabold flex items-center justify-center shrink-0">
                              {index + 1}
                            </span>
                            <div className="truncate">
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-slate-800 truncate">
                                  {item.supplier_name}
                                </h4>
                                {index === 0 && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 shrink-0">
                                    Principal Parceiro
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                                <Icon className="w-3 h-3 text-slate-400" />
                                {config.label} • {item.orders_count} pedido(s)
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-sm font-extrabold text-slate-900 block">
                              {item.total_spent.toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                              })}
                            </span>
                            <span className="text-[11px] font-bold text-emerald-700">
                              {percentage}% do total
                            </span>
                          </div>
                        </div>

                        {/* Barra de Progresso Visual */}
                        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-2 rounded-full ${config.barColor} transition-all duration-500`}
                            style={{ width: `${Math.max(percentage, 3)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* WIDGET 2: Status dos Pedidos Pendentes & Pipeline */}
            <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-amber-600" />
                      Status Atual de Pedidos
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Monitoramento das reposições pendentes e entregas
                    </p>
                  </div>

                  <button
                    onClick={() => setActiveTab('orders')}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                  >
                    Ver Lista <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Status Cards Breakdown */}
                <div className="grid grid-cols-2 gap-3 mt-4">
                  {/* Status 1: Pendente */}
                  <div
                    onClick={() => {
                      setActiveTab('orders');
                      setOrderStatusFilter('PENDENTE');
                    }}
                    className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-100/70 transition cursor-pointer group"
                    title="Ver pedidos e cotações pendentes"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-800 flex items-center gap-1">
                        Pendente / Cotação
                        <ChevronRight className="w-3 h-3 text-amber-600 group-hover:translate-x-0.5 transition" />
                      </span>
                      <Clock className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="text-xl font-extrabold text-amber-900 mt-1">
                      {dashboardStats.statusCounts.PENDENTE.length}
                    </div>
                    <span className="text-[11px] text-amber-700 font-semibold block mt-0.5">
                      {dashboardStats.statusCounts.PENDENTE.reduce((a, b) => a + (b.total_amount || 0), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>

                  {/* Status 2: Aprovado */}
                  <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/50">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-800">Aprovado</span>
                      <FileText className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="text-xl font-extrabold text-blue-900 mt-1">
                      {dashboardStats.statusCounts.APROVADO.length}
                    </div>
                    <span className="text-[11px] text-blue-700 font-semibold block mt-0.5">
                      {dashboardStats.statusCounts.APROVADO.reduce((a, b) => a + (b.total_amount || 0), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>

                  {/* Status 3: Em Trânsito */}
                  <div className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/50">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-800">Em Trânsito</span>
                      <Truck className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="text-xl font-extrabold text-indigo-900 mt-1">
                      {dashboardStats.statusCounts.EM_TRANSITO.length}
                    </div>
                    <span className="text-[11px] text-indigo-700 font-semibold block mt-0.5">
                      {dashboardStats.statusCounts.EM_TRANSITO.reduce((a, b) => a + (b.total_amount || 0), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>

                  {/* Status 4: Entregue */}
                  <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-800">Entregue</span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="text-xl font-extrabold text-emerald-900 mt-1">
                      {dashboardStats.statusCounts.ENTREGUE.length}
                    </div>
                    <span className="text-[11px] text-emerald-700 font-semibold block mt-0.5">
                      {dashboardStats.statusCounts.ENTREGUE.reduce((a, b) => a + (b.total_amount || 0), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                </div>

                {/* Lista Rápida de Pedidos em Aberto */}
                <div className="mt-5 space-y-2.5">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Pedidos que precisam de atenção:
                  </span>
                  {orders
                    .filter((o) => o.status === 'PENDENTE' || o.status === 'EM_TRANSITO' || o.status === 'APROVADO')
                    .slice(0, 4)
                    .map((ord) => {
                      const stat = STATUS_CONFIG[ord.status];
                      return (
                        <div
                          key={ord.id}
                          className="p-3 rounded-xl border border-slate-200 bg-white shadow-2xs flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="truncate flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-800">{ord.order_number}</span>
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${stat.bg} ${stat.text} border ${stat.border}`}>
                                {stat.label}
                              </span>
                              {ord.urgency === 'URGENTE' && (
                                <span className="px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800">
                                  🚨 Urgente
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">
                              {ord.supplier_name} • {ord.items.length} item(ns)
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <div className="text-right">
                              <span className="font-extrabold text-slate-900 block">
                                {ord.total_amount > 0
                                  ? ord.total_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                                  : 'Sob cotação'}
                              </span>
                              {ord.status !== 'ENTREGUE' && (
                                <button
                                  onClick={() => handleUpdateOrderStatus(ord.id, 'ENTREGUE')}
                                  className="text-[10px] font-bold text-emerald-700 hover:underline mt-0.5 cursor-pointer block"
                                >
                                  Marcar Entregue
                                </button>
                              )}
                            </div>

                            <button
                              onClick={() => promptDeleteOrder(ord)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              title={ord.status === 'PENDENTE' ? 'Excluir cotação' : 'Excluir pedido'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Botão de Ação Rápida */}
              <button
                onClick={() => handleOpenCreateOrder()}
                className="w-full py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-200/80 transition flex items-center justify-center gap-2 cursor-pointer mt-4"
              >
                <Plus className="w-4 h-4" />
                Registrar Nova Compra / Pedido de Insumos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PEDIDOS & REPOSIÇÕES (DETALHADO COM STATUS) */}
      {/* ========================================================================= */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {/* Barra de Filtros de Pedidos */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por nº do pedido, fornecedor, medicamento..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto text-xs w-full sm:w-auto">
              <span className="text-[11px] font-bold text-slate-400 mr-1">Status:</span>
              {(['ALL', 'PENDENTE', 'APROVADO', 'EM_TRANSITO', 'ENTREGUE'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setOrderStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    orderStatusFilter === st
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st === 'ALL' ? 'Todos' : STATUS_CONFIG[st].label}
                </button>
              ))}
            </div>
          </div>

          {/* Tabela de Pedidos */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Pedido / Data</th>
                    <th className="py-3 px-4">Fornecedor / Categoria</th>
                    <th className="py-3 px-4">Itens do Pedido</th>
                    <th className="py-3 px-4">Total (R$)</th>
                    <th className="py-3 px-4">Previsão / Rastreio</th>
                    <th className="py-3 px-4">Status Atual</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400 text-xs">
                        Nenhum pedido encontrado para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((ord) => {
                      const stat = STATUS_CONFIG[ord.status];
                      const StatusIcon = stat.icon;

                      return (
                        <tr key={ord.id} className="hover:bg-slate-50/60 transition-colors">
                          {/* Pedido / Data */}
                          <td className="py-3.5 px-4">
                            <span className="font-mono font-bold text-slate-900 block">
                              #{ord.order_number}
                            </span>
                            <span className="text-[11px] text-slate-400 block mt-0.5">
                              {new Date(ord.created_at).toLocaleDateString('pt-BR')}
                            </span>
                            {ord.urgency === 'URGENTE' && (
                              <span className="px-1.5 py-0.2 rounded-md text-[10px] font-extrabold bg-rose-100 text-rose-800 inline-block mt-1">
                                🚨 Emergência
                              </span>
                            )}
                            {ord.urgency === 'HOJE' && (
                              <span className="px-1.5 py-0.2 rounded-md text-[10px] font-extrabold bg-amber-100 text-amber-800 inline-block mt-1">
                                ⚡ Hoje
                              </span>
                            )}
                          </td>

                          {/* Fornecedor */}
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-slate-800 block">{ord.supplier_name}</span>
                            {ord.representative_name && (
                              <span className="text-[11px] text-slate-500 block mt-0.5">
                                Rep: {ord.representative_name}
                              </span>
                            )}
                          </td>

                          {/* Itens */}
                          <td className="py-3.5 px-4 max-w-xs">
                            <div className="space-y-1">
                              {ord.items.map((it, idx) => (
                                <div key={idx} className="text-[11px] text-slate-700 flex items-center justify-between gap-2">
                                  <span className="truncate">• {it.name}</span>
                                  <span className="font-semibold text-slate-500 shrink-0">
                                    {it.quantity} {it.unit}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </td>

                          {/* Total */}
                          <td className="py-3.5 px-4 font-extrabold text-slate-900 text-sm">
                            {ord.total_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </td>

                          {/* Previsão */}
                          <td className="py-3.5 px-4 text-[11px] text-slate-600">
                            <span className="block font-medium">{ord.expected_delivery_date || 'A combinar'}</span>
                            {ord.delivery_tracking_code && (
                              <span className="font-mono text-[10px] text-slate-400 block mt-0.5">
                                Rastreio: {ord.delivery_tracking_code}
                              </span>
                            )}
                          </td>

                          {/* Status com Seletor Interativo */}
                          <td className="py-3.5 px-4">
                            <select
                              value={ord.status}
                              onChange={(e) => handleUpdateOrderStatus(ord.id, e.target.value as SupplierOrderStatus)}
                              className={`text-xs font-bold px-2.5 py-1.5 rounded-lg border outline-none cursor-pointer ${stat.bg} ${stat.text} ${stat.border}`}
                            >
                              <option value="PENDENTE">🟡 Pendente / Cotação</option>
                              <option value="APROVADO">🔵 Aprovado / Faturado</option>
                              <option value="EM_TRANSITO">🚚 Em Trânsito</option>
                              <option value="ENTREGUE">🟢 Entregue & Estocado</option>
                              <option value="CANCELADO">⚪ Cancelado</option>
                            </select>
                          </td>

                          {/* Ações */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {ord.representative_phone && (
                                <a
                                  href={`https://wa.me/55${ord.representative_phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                                    `Olá! Gostaria de saber o status do pedido #${ord.order_number}.`
                                  )}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                                  title="Falar no WhatsApp"
                                >
                                  <MessageCircle className="w-4 h-4" />
                                </a>
                              )}
                              <button
                                onClick={() => promptDeleteOrder(ord)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                title={ord.status === 'PENDENTE' ? 'Excluir cotação' : 'Excluir pedido'}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: DIRETÓRIO DE FORNECEDORES */}
      {/* ========================================================================= */}
      {activeTab === 'suppliers' && (
        <div className="space-y-4">
          {/* Busca e Filtros */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome da distribuidora, laboratório, representante, cidade ou insumos..."
                className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 mr-1 shrink-0">
                <Filter className="w-3.5 h-3.5" /> Filtrar:
              </span>
              <button
                onClick={() => setSelectedCategory('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer ${
                  selectedCategory === 'ALL'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
                }`}
              >
                Todos ({suppliers.length})
              </button>
              {(Object.keys(CATEGORY_CONFIG) as SupplierCategory[]).map((cat) => {
                const conf = CATEGORY_CONFIG[cat];
                const Icon = conf.icon;
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shrink-0 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-700 text-white shadow-2xs'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{conf.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Grid de Cards de Fornecedores */}
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-400">Carregando parceiros...</div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto">
              <Truck className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800">Nenhum fornecedor encontrado</h3>
              <p className="text-xs text-slate-500 mt-1">Ajuste o termo de busca ou cadastre um novo fornecedor.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSuppliers.map((sup) => {
                const conf = CATEGORY_CONFIG[sup.category] || CATEGORY_CONFIG.OUTROS;
                const Icon = conf.icon;
                const cleanWhats = sup.whatsapp ? sup.whatsapp.replace(/\D/g, '') : '';

                return (
                  <div
                    key={sup.id}
                    className="bg-white rounded-2xl border border-slate-200/90 hover:border-slate-300 p-5 shadow-2xs hover:shadow-xs transition flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border inline-flex items-center gap-1 ${conf.badgeBg} ${conf.badgeBorder}`}>
                            <Icon className="w-3 h-3" /> {conf.label}
                          </span>
                          <h3 className="text-base font-bold text-slate-900 mt-2 leading-snug">
                            {sup.name}
                          </h3>
                          {sup.representative_name && (
                            <p className="text-xs text-slate-500 mt-0.5">
                              Representante: <strong className="text-slate-700">{sup.representative_name}</strong>
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleOpenEditSupplier(sup)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition cursor-pointer"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => promptDeleteSupplier(sup)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Dados de Contato e Localização */}
                      <div className="space-y-1.5 text-xs text-slate-600 pt-1">
                        {(sup.whatsapp || sup.phone) && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{sup.whatsapp || sup.phone}</span>
                          </div>
                        )}

                        {sup.email && (
                          <div className="flex items-center gap-2 truncate">
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <a href={`mailto:${sup.email}`} className="hover:underline hover:text-emerald-700 truncate">
                              {sup.email}
                            </a>
                          </div>
                        )}

                        {(sup.city || sup.state) && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{[sup.city, sup.state].filter(Boolean).join(' - ')}</span>
                          </div>
                        )}

                        {sup.delivery_time && (
                          <div className="flex items-center gap-2 text-slate-500">
                            <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            <span>Entrega: <strong className="text-slate-700">{sup.delivery_time}</strong></span>
                          </div>
                        )}

                        {typeof sup.minimum_order === 'number' && sup.minimum_order > 0 && (
                          <div className="flex items-center gap-2 text-slate-500">
                            <DollarSign className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>Pedido mínimo: <strong className="text-slate-700">R$ {sup.minimum_order.toFixed(2)}</strong></span>
                          </div>
                        )}
                      </div>

                      {/* Chave PIX */}
                      {sup.pix_key && (
                        <div className="p-2.5 bg-slate-50 border border-slate-200/70 rounded-xl flex items-center justify-between gap-2 text-xs">
                          <div className="truncate">
                            <span className="text-[10px] text-slate-400 block font-bold uppercase">Chave PIX:</span>
                            <code className="text-[11px] font-mono font-bold text-slate-800 truncate block">
                              {sup.pix_key}
                            </code>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyPix(sup.id, sup.pix_key!)}
                            className="px-2 py-1 text-[11px] font-semibold bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-slate-700 transition flex items-center gap-1 shrink-0 cursor-pointer"
                          >
                            {copiedPixId === sup.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span className="text-emerald-700">Copiado</span>
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

                      {/* Notas comerciais */}
                      {sup.notes && (
                        <div className="p-2.5 bg-amber-50/50 border border-amber-200/60 rounded-xl text-[11px] text-amber-900 leading-relaxed">
                          💡 {sup.notes}
                        </div>
                      )}
                    </div>

                    {/* Botões de Ação no Card */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => handleOpenCreateOrder(sup.id)}
                        className="py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Novo Pedido</span>
                      </button>

                      {cleanWhats ? (
                        <button
                          onClick={() => handleOpenQuote(sup)}
                          className="py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </button>
                      ) : (
                        <div className="py-2 px-3 text-center text-slate-400 text-[11px]">
                          Sem WhatsApp
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: NOVO PEDIDO DE COMPRA DE INSUMOS */}
      {/* ========================================================================= */}
      {showOrderModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden my-8">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-600 text-white rounded-xl">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Registrar Pedido de Insumos</h3>
                  <p className="text-xs text-slate-500">Cotação ou pedido de compra para controle de estoque</p>
                </div>
              </div>
              <button
                onClick={() => setShowOrderModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewOrder} className="p-6 space-y-4">
              {orderModalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{orderModalError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Fornecedor *</label>
                  <select
                    value={newOrderData.supplier_id}
                    onChange={(e) => setNewOrderData({ ...newOrderData, supplier_id: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600 bg-white"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Status Inicial</label>
                  <select
                    value={newOrderData.status}
                    onChange={(e) => setNewOrderData({ ...newOrderData, status: e.target.value as SupplierOrderStatus })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600 bg-white"
                  >
                    <option value="PENDENTE">🟡 Pendente / Em Cotação</option>
                    <option value="APROVADO">🔵 Aprovado / Faturado</option>
                    <option value="EM_TRANSITO">🚚 Em Trânsito</option>
                    <option value="ENTREGUE">🟢 Já Entregue & Conferido</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Urgência</label>
                  <select
                    value={newOrderData.urgency}
                    onChange={(e) => setNewOrderData({ ...newOrderData, urgency: e.target.value as SupplierOrderUrgency })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600 bg-white"
                  >
                    <option value="NORMAL">Normal (Reposição)</option>
                    <option value="HOJE">⚡ Entrega Hoje</option>
                    <option value="URGENTE">🚨 Emergência Clínica</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Previsão de Entrega</label>
                  <input
                    type="text"
                    placeholder="Ex: 24h a 48h ou Hoje às 17h"
                    value={newOrderData.expected_delivery_date}
                    onChange={(e) => setNewOrderData({ ...newOrderData, expected_delivery_date: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* Itens do Pedido */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase">Itens da Compra</span>
                  <button
                    type="button"
                    onClick={handleAddItemToOrder}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar Item
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {newOrderData.items.map((it, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                      <input
                        type="text"
                        placeholder="Nome do item / medicamento"
                        value={it.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewOrderData((prev) => {
                            const copy = [...prev.items];
                            copy[idx].name = val;
                            return { ...prev, items: copy };
                          });
                        }}
                        className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-emerald-600"
                      />
                      <input
                        type="number"
                        placeholder="Qtd"
                        value={it.quantity}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setNewOrderData((prev) => {
                            const copy = [...prev.items];
                            copy[idx].quantity = val;
                            return { ...prev, items: copy };
                          });
                        }}
                        className="w-16 px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none text-center"
                      />
                      <input
                        type="number"
                        step="0.01"
                        placeholder="R$ Unit"
                        value={it.unit_price || ''}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setNewOrderData((prev) => {
                            const copy = [...prev.items];
                            copy[idx].unit_price = val;
                            return { ...prev, items: copy };
                          });
                        }}
                        className="w-20 px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none text-right font-mono"
                      />
                      {newOrderData.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItemFromOrder(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between text-xs font-bold text-slate-800 pt-2 border-t border-slate-100">
                  <span>Valor Total Estimado:</span>
                  <span className="text-sm font-extrabold text-emerald-700">
                    {newOrderData.items
                      .reduce((acc, it) => acc + (Number(it.quantity) || 1) * (Number(it.unit_price) || 0), 0)
                      .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Observações da Compra</label>
                <input
                  type="text"
                  placeholder="Ex: Faturar para clínica volante ou retirar no balcão"
                  value={newOrderData.notes}
                  onChange={(e) => setNewOrderData({ ...newOrderData, notes: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowOrderModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingOrder}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {savingOrder ? 'Salvando...' : 'Salvar Pedido no Dashboard'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CADASTRO / EDIÇÃO DE FORNECEDOR */}
      {/* ========================================================================= */}
      {showSupplierModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden my-8 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-600 text-white rounded-xl">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingSupplier ? 'Editar Fornecedor' : 'Novo Fornecedor / Parceiro'}
                  </h3>
                  <p className="text-xs text-slate-500">Distribuidoras, laboratórios e farmácias de manipulação</p>
                </div>
              </div>
              <button
                onClick={() => setShowSupplierModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="p-6 space-y-3.5">
              {supplierModalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{supplierModalError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Nome da Empresa / Parceiro *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Distribuidora VetPrime ou Laboratório VetPat"
                  value={supplierFormData.name}
                  onChange={(e) => setSupplierFormData({ ...supplierFormData, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Categoria *</label>
                  <select
                    value={supplierFormData.category}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, category: e.target.value as SupplierCategory })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600 bg-white"
                  >
                    <option value="DISTRIBUIDORA">Distribuidora Farmacêutica</option>
                    <option value="LABORATORIO">Laboratório de Apoio</option>
                    <option value="MANIPULACAO">Manipulação Veterinária</option>
                    <option value="INSUMOS">Insumos & Descartáveis</option>
                    <option value="EQUIPAMENTOS">Equipamentos & Manutenção</option>
                    <option value="OUTROS">Outros Serviços</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Representante Comercial</label>
                  <input
                    type="text"
                    placeholder="Ex: Carlos Henrique"
                    value={supplierFormData.representative_name}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, representative_name: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">WhatsApp para Pedidos</label>
                  <input
                    type="text"
                    placeholder="(11) 98765-4321"
                    value={supplierFormData.whatsapp}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, whatsapp: formatPhone(e.target.value) })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Telefone Fixo</label>
                  <input
                    type="text"
                    placeholder="(11) 3456-7890"
                    value={supplierFormData.phone}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, phone: formatPhone(e.target.value) })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">E-mail Comercial</label>
                  <input
                    type="email"
                    placeholder="pedidos@empresa.com.br"
                    value={supplierFormData.email}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, email: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Chave PIX</label>
                  <input
                    type="text"
                    placeholder="CNPJ, E-mail ou chave aleatória"
                    value={supplierFormData.pix_key}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, pix_key: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Prazo de Entrega</label>
                  <input
                    type="text"
                    placeholder="Ex: 24h a 48h"
                    value={supplierFormData.delivery_time}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, delivery_time: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Pedido Mínimo (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Ex: 350.00"
                    value={supplierFormData.minimum_order}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, minimum_order: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Condições Comerciais & Anotações</label>
                <textarea
                  rows={2}
                  placeholder="Ex: Frete grátis acima de R$ 500. Faturamento em boleto 28 dias."
                  value={supplierFormData.notes}
                  onChange={(e) => setSupplierFormData({ ...supplierFormData, notes: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600 resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSupplierModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingSupplier}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {savingSupplier ? 'Salvando...' : editingSupplier ? 'Salvar Alterações' : 'Cadastrar Fornecedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: COTAÇÃO / PEDIDO DIRETO VIA WHATSAPP */}
      {/* ========================================================================= */}
      {showQuoteModal && quoteSupplier && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden my-8">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/60">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-700 text-white rounded-xl">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Enviar Pedido via WhatsApp</h3>
                  <p className="text-xs text-slate-500">
                    Para: <strong className="text-slate-800">{quoteSupplier.name}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowQuoteModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Urgência</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setQuoteUrgency('NORMAL')}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border transition ${
                      quoteUrgency === 'NORMAL' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    Normal
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuoteUrgency('HOJE')}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border transition ${
                      quoteUrgency === 'HOJE' ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    ⚡ Hoje
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuoteUrgency('URGENTE')}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border transition ${
                      quoteUrgency === 'URGENTE' ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    🚨 Emergência
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Itens & Quantidades</label>
                <textarea
                  rows={4}
                  placeholder={`Exemplo:\n- 5 frascos Propofol 1% 20ml\n- 2 caixas Seringas 3ml\n- 10 doses Vacina V10`}
                  value={quoteItems}
                  onChange={(e) => setQuoteItems(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Observações Adicionais</label>
                <input
                  type="text"
                  placeholder="Ex: Faturar no boleto 28 dias"
                  value={customQuoteNote}
                  onChange={(e) => setCustomQuoteNote(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
                />
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-700 max-h-32 overflow-y-auto whitespace-pre-wrap font-sans">
                {generateWhatsAppMessage()}
              </div>

              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleCopyQuoteMessage}
                  className="px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedQuote ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedQuote ? 'Copiado!' : 'Copiar Texto'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowQuoteModal(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                  >
                    Fechar
                  </button>
                  <button
                    type="button"
                    onClick={handleSendWhatsApp}
                    className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
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

      {/* ========================================================================= */}
      {/* MODAL: CONFIRMAÇÃO DE EXCLUSÃO (SEM WINDOW.CONFIRM / 100% FUNCIONAL EM IFRAME) */}
      {/* ========================================================================= */}
      {deleteConfirm?.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3.5">
                <div className="p-3 bg-rose-100 text-rose-600 rounded-2xl shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-slate-900 truncate">
                      {deleteConfirm.type === 'order' ? 'Excluir Cotação / Pedido' : 'Excluir Fornecedor'}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Tem certeza que deseja prosseguir com a exclusão definitiva?
                  </p>
                </div>
                <button
                  onClick={() => setDeleteConfirm(null)}
                  disabled={isDeleting}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Card com detalhes do item a excluir */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-800 text-sm truncate">{deleteConfirm.title}</span>
                  {deleteConfirm.badgeText && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                      {deleteConfirm.badgeText}
                    </span>
                  )}
                </div>
                <p className="text-slate-600 text-[11px]">{deleteConfirm.subtitle}</p>
                {deleteConfirm.itemSummary && (
                  <p className="text-slate-500 text-[11px] font-mono pt-1 border-t border-slate-200">
                    {deleteConfirm.itemSummary}
                  </p>
                )}
              </div>

              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>Esta ação removerá o registro permanentemente do painel e do cálculo de reposição.</span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-[0.98] rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Excluindo...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Sim, Excluir</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TOAST DE FEEDBACK IN-APP */}
      {/* ========================================================================= */}
      {feedbackToast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm animate-in fade-in slide-in-from-bottom-5">
          <div
            className={`p-3.5 rounded-xl shadow-lg border text-xs font-bold flex items-center gap-2.5 ${
              feedbackToast.type === 'success'
                ? 'bg-slate-900 text-white border-slate-800'
                : feedbackToast.type === 'error'
                ? 'bg-rose-900 text-white border-rose-800'
                : 'bg-slate-900 text-white border-slate-800'
            }`}
          >
            {feedbackToast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span className="flex-1">{feedbackToast.message}</span>
            <button
              onClick={() => setFeedbackToast(null)}
              className="p-1 hover:bg-white/20 rounded transition cursor-pointer text-white/80 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
