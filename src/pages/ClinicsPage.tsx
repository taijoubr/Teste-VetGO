import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import QRCode from 'qrcode';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { Clinic, AnesthesiaRecord, FinancialEntry, ClinicBillingInvoice } from '../types';
import {
  Building2,
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  FileText,
  AlertCircle,
  CheckCircle2,
  X,
  CreditCard,
  UserCheck,
  Tag,
  Loader2,
  Edit2,
  Receipt,
  QrCode,
  Download,
  Share2,
  Check,
  Printer,
  Copy,
  ExternalLink,
  ChevronRight,
  Clock
} from 'lucide-react';
import {
  formatCNPJ,
  validateCNPJ,
  formatPhone,
  CPF_CNPJ_DISCLAIMER
} from '../utils/validators';
import { formatCEP, fetchAddressByCep } from '../services/cepService';
import { ClinicBillingModal } from '../components/ClinicBillingModal';
import { printElement, exportToPdf } from '../utils/printHelper';

export const ClinicsPage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const isAnesthesiaActive = Boolean(user?.specialty_anesthesia_enabled);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingClinic, setEditingClinic] = useState<Clinic | null>(null);
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [clinicHistory, setClinicHistory] = useState<AnesthesiaRecord[]>([]);
  const [clinicFinancials, setClinicFinancials] = useState<FinancialEntry[]>([]);
  const [clinicInvoices, setClinicInvoices] = useState<ClinicBillingInvoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'info' | 'history' | 'financial'>('info');

  // Billing Modal State
  const [showBillingModal, setShowBillingModal] = useState<boolean>(false);
  const [billingModalClinic, setBillingModalClinic] = useState<Clinic | null>(null);
  const [selectedInvoiceForView, setSelectedInvoiceForView] = useState<ClinicBillingInvoice | null>(null);
  const [invoiceQrDataUrl, setInvoiceQrDataUrl] = useState<string>('');
  const [copiedInvoicePixId, setCopiedInvoicePixId] = useState<number | null>(null);
  const [updatingInvoiceStatus, setUpdatingInvoiceStatus] = useState<number | null>(null);

  const [modalError, setModalError] = useState<string | null>(null);
  const [cnpjWarning, setCnpjWarning] = useState<string | null>(null);
  const [cepLoading, setCepLoading] = useState(false);
  const [cepFeedback, setCepFeedback] = useState<{ text: string; type: 'success' | 'warning' } | null>(null);
  const clinicNumberInputRef = useRef<HTMLInputElement | null>(null);

  const [form, setForm] = useState({
    code: '',
    name: '',
    corporate_name: '',
    cnpj: '',
    phone: '',
    whatsapp: '',
    email: '',
    address: '',
    address_number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    postal_code: '',
    manager_name: '',
    financial_contact: '',
    payment_terms: '',
    billing_type: 'POR_ATENDIMENTO' as 'POR_ATENDIMENTO' | 'FATURAMENTO_PERIODICO',
    billing_closing_day: '' as any,
    billing_due_day: '' as any,
    price_table_type: 'PADRAO' as 'PADRAO' | 'ESPECIFICA',
    notes: '',
    is_active: true
  });

  useEffect(() => {
    loadClinics();
  }, []);

  const loadClinics = async () => {
    try {
      setLoading(true);
      const data = await api.getClinics();
      setClinics(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingClinic(null);
    const nextCode = `CL-${String(clinics.length + 1).padStart(2, '0')}`;
    setForm({
      code: nextCode,
      name: '',
      corporate_name: '',
      cnpj: '',
      phone: '',
      whatsapp: '',
      email: '',
      address: '',
      address_number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      postal_code: '',
      manager_name: '',
      financial_contact: '',
      payment_terms: '',
      billing_type: 'POR_ATENDIMENTO',
      billing_closing_day: '' as any,
      billing_due_day: '' as any,
      price_table_type: 'PADRAO',
      notes: '',
      is_active: true
    });
    setModalError(null);
    setCnpjWarning(null);
    setCepFeedback(null);
    setCepLoading(false);
    setShowModal(true);
  };

  const handleOpenEditModal = (clinic: Clinic) => {
    setEditingClinic(clinic);
    setForm({
      code: clinic.code || '',
      name: clinic.name || '',
      corporate_name: clinic.corporate_name || '',
      cnpj: clinic.cnpj || '',
      phone: clinic.phone || '',
      whatsapp: clinic.whatsapp || '',
      email: clinic.email || '',
      address: clinic.address || '',
      address_number: clinic.address_number || '',
      complement: clinic.complement || '',
      neighborhood: clinic.neighborhood || '',
      city: clinic.city || 'São Paulo',
      state: clinic.state || 'SP',
      postal_code: clinic.postal_code || '',
      manager_name: clinic.manager_name || '',
      financial_contact: clinic.financial_contact || '',
      payment_terms: clinic.payment_terms || '',
      billing_type: clinic.billing_type || 'POR_ATENDIMENTO',
      billing_closing_day: clinic.billing_closing_day || 25,
      billing_due_day: clinic.billing_due_day || 5,
      price_table_type: clinic.price_table_type || 'PADRAO',
      notes: clinic.notes || '',
      is_active: clinic.is_active !== false
    });
    setModalError(null);
    setCnpjWarning(null);
    setCepFeedback(null);
    setCepLoading(false);
    setShowModal(true);
  };

  const handleCepChange = async (value: string) => {
    const formatted = formatCEP(value);
    setForm((prev) => ({ ...prev, postal_code: formatted }));
    setCepFeedback(null);

    const clean = formatted.replace(/\D/g, '');
    if (clean.length === 8) {
      setCepLoading(true);
      try {
        const res = await fetchAddressByCep(clean);
        if (res.success && res.data) {
          setForm((prev) => ({
            ...prev,
            address: res.data!.street || prev.address,
            neighborhood: res.data!.neighborhood || prev.neighborhood,
            city: res.data!.city || prev.city,
            state: res.data!.state || prev.state,
            postal_code: res.data!.postal_code || formatted,
          }));
          setCepFeedback({
            type: 'success',
            text: `Localizado: ${res.data.street ? res.data.street + ', ' : ''}${res.data.neighborhood} - ${res.data.city}/${res.data.state}`,
          });
          setTimeout(() => {
            clinicNumberInputRef.current?.focus();
          }, 120);
        } else {
          setCepFeedback({
            type: 'warning',
            text: res.error || 'CEP não localizado. Preencha o endereço manualmente.',
          });
        }
      } catch {
        setCepFeedback({
          type: 'warning',
          text: 'Falha temporária ao consultar CEP. Preencha o endereço manualmente.',
        });
      } finally {
        setCepLoading(false);
      }
    }
  };

  const handleCnpjChange = async (value: string) => {
    const formatted = formatCNPJ(value);
    setForm((prev) => ({ ...prev, cnpj: formatted }));

    if (formatted.length > 0) {
      const valResult = validateCNPJ(formatted);
      if (!valResult.isValid) {
        setCnpjWarning(valResult.error || 'CNPJ com dígitos verificadores incorretos.');
      } else {
        // Verifica duplicidade no banco
        const duplicate = await api.checkClinicCnpjDuplicate(formatted);
        if (duplicate && (!editingClinic || duplicate.id !== editingClinic.id)) {
          setCnpjWarning(`Atenção: Este CNPJ já está cadastrado para a clínica "${duplicate.name}".`);
        } else {
          setCnpjWarning(null);
        }
      }
    } else {
      setCnpjWarning(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!form.name.trim()) {
      setModalError('O nome da clínica é obrigatório.');
      return;
    }

    if (form.cnpj) {
      const valResult = validateCNPJ(form.cnpj);
      if (!valResult.isValid) {
        setModalError(valResult.error || 'CNPJ inválido. Verifique os números preenchidos.');
        return;
      }
    }

    try {
      if (editingClinic) {
        const updated = await api.updateClinic(editingClinic.id, form);
        if (selectedClinic && selectedClinic.id === editingClinic.id) {
          setSelectedClinic({ ...selectedClinic, ...updated });
        }
      } else {
        await api.createClinic(form);
      }
      setShowModal(false);
      setEditingClinic(null);
      loadClinics();
    } catch (err: any) {
      setModalError(err.message || 'Erro ao salvar clínica.');
    }
  };

  const handleSelectClinic = async (clinic: Clinic) => {
    setSelectedClinic(clinic);
    setActiveTab('info');
    try {
      setInvoicesLoading(true);
      const [procedures, allFin, invoices] = await Promise.all([
        api.getAnesthesias({ clinicId: clinic.id }),
        api.getFinancialEntries(),
        api.getClinicInvoices(clinic.id)
      ]);
      setClinicHistory(procedures);
      setClinicFinancials(allFin.filter((f) => f.clinic_id === clinic.id));
      setClinicInvoices(invoices);
    } catch (err) {
      console.error(err);
    } finally {
      setInvoicesLoading(false);
    }
  };

  const reloadClinicInvoices = async (clinicId: number) => {
    try {
      setInvoicesLoading(true);
      const [invoices, allFin] = await Promise.all([
        api.getClinicInvoices(clinicId),
        api.getFinancialEntries()
      ]);
      setClinicInvoices(invoices);
      setClinicFinancials(allFin.filter((f) => f.clinic_id === clinicId));
    } catch (e) {
      console.error(e);
    } finally {
      setInvoicesLoading(false);
    }
  };

  const handleToggleInvoicePaid = async (invoice: ClinicBillingInvoice) => {
    try {
      setUpdatingInvoiceStatus(invoice.id);
      const newStatus = invoice.status === 'PAGA' ? 'PENDENTE' : 'PAGA';
      await api.updateClinicInvoice(invoice.id, {
        status: newStatus,
        payment_date: newStatus === 'PAGA' ? new Date().toISOString().split('T')[0] : undefined
      });
      if (selectedClinic) {
        await reloadClinicInvoices(selectedClinic.id);
      }
      if (selectedInvoiceForView && selectedInvoiceForView.id === invoice.id) {
        setSelectedInvoiceForView((prev) => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (err) {
      console.error('Erro ao atualizar status da fatura', err);
    } finally {
      setUpdatingInvoiceStatus(null);
    }
  };

  const handleOpenInvoiceView = async (invoice: ClinicBillingInvoice) => {
    setSelectedInvoiceForView(invoice);
    if (invoice.pix_code) {
      try {
        const qr = await QRCode.toDataURL(invoice.pix_code, {
          width: 256,
          margin: 1,
          color: { dark: '#064e3b', light: '#ffffff' }
        });
        setInvoiceQrDataUrl(qr);
      } catch (e) {
        console.error('Erro ao gerar QR Code', e);
        setInvoiceQrDataUrl('');
      }
    } else {
      setInvoiceQrDataUrl('');
    }
  };

  const handleCopyPix = (invoice: ClinicBillingInvoice) => {
    if (!invoice.pix_code) return;
    navigator.clipboard.writeText(invoice.pix_code);
    setCopiedInvoicePixId(invoice.id);
    setTimeout(() => setCopiedInvoicePixId(null), 2500);
  };

  const handleShareWhatsApp = (invoice: ClinicBillingInvoice) => {
    const targetPhone = selectedClinic?.whatsapp || selectedClinic?.phone || '';
    const cleanPhone = targetPhone.replace(/\D/g, '');
    const phoneParam = cleanPhone.length >= 10 ? `55${cleanPhone}` : '';

    const lines = [
      `*DEMONSTRATIVO DE FECHAMENTO & COBRANÇA - ${invoice.invoice_number}*`,
      `*Clínica:* ${invoice.clinic_name}`,
      `*Período:* ${invoice.period_label || 'Fechamento de Procedimentos'}`,
      `*Total de Procedimentos:* ${invoice.total_procedures}`,
      `*Valor Total:* R$ ${invoice.total_amount.toFixed(2)}`,
      `*Vencimento:* ${invoice.due_date ? new Date(invoice.due_date + 'T12:00:00').toLocaleDateString('pt-BR') : 'Imediato'}`,
      '',
      '*Chave PIX para Pagamento:*',
      invoice.pix_key ? `Tipo: ${invoice.pix_type} | Chave: ${invoice.pix_key}` : '',
      invoice.pix_code ? `\n*Código PIX Copia e Cola:*\n\`\`\`${invoice.pix_code}\`\`\`` : '',
      '',
      'Relatório analítico e demonstrativo das cirurgias disponível para conferência. Agradecemos a parceria!'
    ].filter(Boolean).join('\n');

    const url = phoneParam
      ? `https://api.whatsapp.com/send?phone=${phoneParam}&text=${encodeURIComponent(lines)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(lines)}`;
    window.open(url, '_blank');
  };

  const filteredClinics = clinics.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      (c.corporate_name && c.corporate_name.toLowerCase().includes(q)) ||
      (c.cnpj && c.cnpj.includes(q)) ||
      (c.city && c.city.toLowerCase().includes(q))
    );
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Banner de Aviso caso o veterinário tenha desativado a especialidade */}
      {!isAnesthesiaActive && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900 shadow-xs">
          <div className="flex items-start sm:items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <strong className="block sm:inline font-bold">Módulo de Anestesiologia Desativado:</strong> O menu "Clínicas Parceiras" está oculto porque o módulo de Anestesiologia está desativado nas suas configurações.
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <button
              type="button"
              onClick={async () => {
                await api.updateUserProfile({ specialty_anesthesia_enabled: true });
                await refreshUser();
              }}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow-2xs transition cursor-pointer"
            >
              Reativar no Menu
            </button>
            <Link
              to="/configuracoes?tab=especialidades"
              className="px-3 py-1.5 bg-white border border-amber-300 text-amber-900 font-semibold rounded-lg hover:bg-amber-100 transition"
            >
              Configurações
            </Link>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Building2 className="w-6 h-6 text-emerald-700" />
              Clínicas Parceiras
            </h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">
              {clinics.length} cadastradas
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Cadastre as clínicas onde você presta serviços de anestesiologia e atendimento volante, com histórico e condições financeiras
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setBillingModalClinic(clinics[0] || null);
              setShowBillingModal(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold transition shadow-sm cursor-pointer"
            title="Gerar fechamento de faturamento quinzenal ou mensal com relatório e PIX"
          >
            <Receipt className="w-4 h-4 text-emerald-400" />
            <span>Fechamento & Faturamento</span>
          </button>
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-sm font-semibold transition shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Clínica</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por código (CL-01), nome da clínica, razão social, CNPJ ou cidade..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition"
        />
      </div>

      {/* Clinic Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClinics.map((clinic) => (
          <div
            key={clinic.id}
            onClick={() => handleSelectClinic(clinic)}
            className="bg-white p-5 rounded-xl border border-slate-200/90 hover:border-emerald-500 hover:shadow-md transition cursor-pointer flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="inline-block px-2 py-0.5 text-[11px] font-black rounded bg-slate-100 text-slate-700 tracking-wider">
                    {clinic.code}
                  </span>
                  <h2 className="text-base font-bold text-slate-900 mt-1 leading-snug">
                    {clinic.name}
                  </h2>
                  {clinic.corporate_name && (
                    <p className="text-xs text-slate-500 truncate max-w-[240px]">
                      {clinic.corporate_name}
                    </p>
                  )}
                </div>
                <span
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                    clinic.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {clinic.is_active ? 'Ativa' : 'Inativa'}
                </span>
              </div>

              {clinic.cnpj && (
                <div className="text-xs font-mono text-slate-600 bg-slate-50 px-2 py-1 rounded">
                  CNPJ: {clinic.cnpj}
                </div>
              )}

              <div className="space-y-1 text-xs text-slate-600">
                {clinic.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{clinic.phone}</span>
                  </div>
                )}
                {clinic.city && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {clinic.neighborhood ? `${clinic.neighborhood}, ` : ''}
                      {clinic.city} - {clinic.state}
                    </span>
                  </div>
                )}
                {clinic.manager_name && (
                  <div className="flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                    <span>Resp: {clinic.manager_name}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1 text-slate-500">
                <CreditCard className="w-3.5 h-3.5 text-emerald-700" />
                <span className="font-medium">
                  {clinic.billing_type === 'FATURAMENTO_PERIODICO' ? 'Faturamento Periódico' : 'Por Atendimento'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-emerald-800 mr-1">
                  {clinic.total_procedures || 0} anestesias
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setBillingModalClinic(clinic);
                    setShowBillingModal(true);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-300 transition cursor-pointer"
                  title="Faturar procedimentos desta clínica"
                >
                  <Receipt className="w-3 h-3 text-emerald-700" />
                  Faturar
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenEditModal(clinic);
                  }}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition cursor-pointer"
                  title="Editar dados da clínica parceira"
                >
                  <Edit2 className="w-3 h-3" />
                  Editar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredClinics.length === 0 && !loading && (
        <div className="bg-white p-12 text-center rounded-xl border border-dashed border-slate-300">
          <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-700">Nenhuma clínica encontrada</p>
          <p className="text-xs text-slate-400 mt-1">Cadastre as clínicas parceiras onde você realiza anestesias e cirurgias.</p>
        </div>
      )}

      {/* Modal Detalhes da Clínica Selecionada */}
      {selectedClinic && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl max-h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                  {selectedClinic.code}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{selectedClinic.name}</h3>
                  <p className="text-xs text-slate-500">{selectedClinic.corporate_name || 'Clínica Parceira'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const cl = selectedClinic;
                    setSelectedClinic(null);
                    handleOpenEditModal(cl);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition shadow-2xs"
                >
                  <Edit2 className="w-3.5 h-3.5 text-emerald-700" />
                  Editar Clínica
                </button>
                <button
                  onClick={() => setSelectedClinic(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 px-5 gap-6 text-sm">
              <button
                onClick={() => setActiveTab('info')}
                className={`py-3 font-semibold border-b-2 transition ${
                  activeTab === 'info'
                    ? 'border-emerald-700 text-emerald-800'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Informações & Condições
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`py-3 font-semibold border-b-2 transition ${
                  activeTab === 'history'
                    ? 'border-emerald-700 text-emerald-800'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Histórico de Anestesias ({clinicHistory.length})
              </button>
              <button
                onClick={() => setActiveTab('financial')}
                className={`py-3 font-semibold border-b-2 transition ${
                  activeTab === 'financial'
                    ? 'border-emerald-700 text-emerald-800'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Financeiro & Faturamentos ({clinicInvoices.length + clinicFinancials.length})
              </button>
            </div>

            {/* Tab Content */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {activeTab === 'info' && (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-3 rounded-lg space-y-1.5 border border-slate-100">
                      <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                        Dados Cadastrais
                      </span>
                      <p><strong className="text-slate-700">CNPJ:</strong> {selectedClinic.cnpj || 'Não informado'}</p>
                      <p><strong className="text-slate-700">Telefone:</strong> {selectedClinic.phone || '-'}</p>
                      <p><strong className="text-slate-700">WhatsApp:</strong> {selectedClinic.whatsapp || '-'}</p>
                      <p><strong className="text-slate-700">E-mail:</strong> {selectedClinic.email || '-'}</p>
                      <p><strong className="text-slate-700">Responsável:</strong> {selectedClinic.manager_name || '-'}</p>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-lg space-y-1.5 border border-slate-100">
                      <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                        Endereço Completo
                      </span>
                      <p>{selectedClinic.address}, {selectedClinic.address_number} {selectedClinic.complement}</p>
                      <p>{selectedClinic.neighborhood} - {selectedClinic.city}/{selectedClinic.state}</p>
                      <p>CEP: {selectedClinic.postal_code || '-'}</p>
                    </div>
                  </div>

                  <div className="bg-emerald-50/60 p-4 rounded-lg border border-emerald-100 space-y-2">
                    <span className="font-bold text-emerald-900 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-emerald-700" />
                      Condições de Cobrança & Faturamento
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
                      <p>
                        <strong>Modelo de cobrança:</strong>{' '}
                        {selectedClinic.billing_type === 'FATURAMENTO_PERIODICO'
                          ? 'Faturamento Periódico'
                          : 'Cobrança por Atendimento'}
                      </p>
                      {selectedClinic.billing_type === 'FATURAMENTO_PERIODICO' && (
                        <p>
                          <strong>Fechamento:</strong> Dia {selectedClinic.billing_closing_day} | <strong>Vencimento:</strong> Dia {selectedClinic.billing_due_day}
                        </p>
                      )}
                      <p>
                        <strong>Tabela de preços:</strong>{' '}
                        {selectedClinic.price_table_type === 'ESPECIFICA'
                          ? 'Tabela Específica da Clínica'
                          : 'Tabela Padrão do Veterinário'}
                      </p>
                      <p><strong>Contato Financeiro:</strong> {selectedClinic.financial_contact || '-'}</p>
                    </div>
                    {selectedClinic.payment_terms && (
                      <p className="text-slate-600 italic">
                        <strong>Termos:</strong> {selectedClinic.payment_terms}
                      </p>
                    )}
                  </div>

                  {selectedClinic.notes && (
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                        Observações
                      </span>
                      <p className="mt-1 text-slate-600">{selectedClinic.notes}</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'history' && (
                <div className="space-y-3">
                  {clinicHistory.length === 0 ? (
                    <p className="text-xs text-slate-500 py-6 text-center">
                      Nenhum procedimento anestésico registrado para esta clínica ainda.
                    </p>
                  ) : (
                    clinicHistory.map((item) => (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-lg border border-slate-200 hover:border-emerald-600 transition bg-white space-y-1.5 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-emerald-800">{item.code} - {item.procedure_name}</span>
                          <span className="text-slate-400">{item.date}</span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-600">
                          <span><strong>Paciente:</strong> {item.patient_name} ({item.patient_species})</span>
                          <span><strong>Cirurgião:</strong> {item.surgeon_name}</span>
                          <span><strong>Classificação:</strong> {item.asa_category.replace('_', ' ')}</span>
                          <span className="font-semibold text-emerald-700">R$ {item.total_billed_amount?.toFixed(2)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'financial' && (
                <div className="space-y-5 text-xs">
                  {/* Top Bar with Metrics and Action */}
                  <div className="bg-gradient-to-r from-emerald-900 to-slate-900 text-white p-4 rounded-xl shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Receipt className="w-5 h-5 text-emerald-400" />
                        <h4 className="text-sm font-bold tracking-tight">Gestão de Fechamentos & Faturas</h4>
                      </div>
                      <p className="text-[11px] text-emerald-200/80 mt-0.5">
                        Agrupamento quinzenal/mensal de anestesias com demonstrativo analítico e cobrança direta via PIX
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setBillingModalClinic(selectedClinic);
                        setShowBillingModal(true);
                      }}
                      className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg shadow-sm transition text-xs cursor-pointer shrink-0"
                    >
                      <Plus className="w-4 h-4 text-slate-950" />
                      Novo Fechamento / Fatura
                    </button>
                  </div>

                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 bg-white border border-slate-200 rounded-xl">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Faturado</span>
                      <p className="text-base font-black text-slate-900 mt-1 font-mono">
                        R$ {clinicInvoices.reduce((acc, curr) => acc + (curr.total_amount || 0), 0).toFixed(2)}
                      </p>
                      <span className="text-[10px] text-slate-500">{clinicInvoices.length} fatura(s) emitida(s)</span>
                    </div>

                    <div className="p-3 bg-amber-50/70 border border-amber-200/70 rounded-xl">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">A Receber (Pendente)</span>
                      <p className="text-base font-black text-amber-900 mt-1 font-mono">
                        R$ {clinicInvoices.filter((i) => i.status === 'PENDENTE').reduce((acc, curr) => acc + curr.total_amount, 0).toFixed(2)}
                      </p>
                      <span className="text-[10px] text-amber-700/80">
                        {clinicInvoices.filter((i) => i.status === 'PENDENTE').length} fatura(s) pendente(s)
                      </span>
                    </div>

                    <div className="p-3 bg-emerald-50/70 border border-emerald-200/70 rounded-xl">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Liquidado / Pago</span>
                      <p className="text-base font-black text-emerald-900 mt-1 font-mono">
                        R$ {clinicInvoices.filter((i) => i.status === 'PAGA').reduce((acc, curr) => acc + curr.total_amount, 0).toFixed(2)}
                      </p>
                      <span className="text-[10px] text-emerald-700/80">
                        {clinicInvoices.filter((i) => i.status === 'PAGA').length} fatura(s) quitada(s)
                      </span>
                    </div>
                  </div>

                  {/* Section 1: Faturas Emitidas */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h5 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-emerald-700" />
                        Faturas & Fechamentos Emitidos ({clinicInvoices.length})
                      </h5>
                      {invoicesLoading && (
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" /> Atualizando...
                        </span>
                      )}
                    </div>

                    {clinicInvoices.length === 0 ? (
                      <div className="p-8 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center space-y-2">
                        <Receipt className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="font-semibold text-slate-700">Nenhum fechamento periódico emitido para esta clínica ainda.</p>
                        <p className="text-slate-500 text-[11px] max-w-md mx-auto">
                          Agrupe as anestesias do mês ou da quinzena para gerar um relatório analítico oficial em PDF e cobrança direta via PIX com Copia e Cola.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setBillingModalClinic(selectedClinic);
                            setShowBillingModal(true);
                          }}
                          className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-semibold text-xs shadow-2xs transition cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Criar Primeiro Fechamento
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {clinicInvoices.map((inv) => (
                          <div
                            key={inv.id}
                            className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:border-emerald-500 transition space-y-3"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-sm font-mono text-emerald-950">
                                    {inv.invoice_number}
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                                      inv.status === 'PAGA'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : inv.status === 'PENDENTE'
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-slate-100 text-slate-600'
                                    }`}
                                  >
                                    {inv.status === 'PAGA' ? (
                                      <>
                                        <Check className="w-3 h-3" /> PAGA
                                      </>
                                    ) : (
                                      <>
                                        <Clock className="w-3 h-3" /> PENDENTE
                                      </>
                                    )}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  Período: <strong className="text-slate-700">{inv.period_label || `${inv.start_date} a ${inv.end_date}`}</strong> • Emitida em {new Date(inv.created_at || inv.closing_date).toLocaleDateString('pt-BR')}
                                </p>
                              </div>

                              <div className="text-left sm:text-right">
                                <span className="text-[10px] font-semibold text-slate-400 uppercase">Valor Total</span>
                                <p className="text-base font-black text-slate-900 font-mono">
                                  R$ {inv.total_amount.toFixed(2)}
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-600 bg-slate-50/70 p-2.5 rounded-lg">
                              <div>
                                <span className="text-slate-400 block text-[10px]">Procedimentos</span>
                                <strong className="text-slate-800">{inv.total_procedures} atendimentos</strong>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[10px]">Vencimento</span>
                                <strong className="text-slate-800">
                                  {inv.due_date ? new Date(inv.due_date + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                                </strong>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[10px]">Chave PIX</span>
                                <strong className="text-slate-800 truncate block max-w-[140px]" title={inv.pix_key || '-'}>
                                  {inv.pix_key || '-'}
                                </strong>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[10px]">Pagamento</span>
                                <strong className="text-slate-800">
                                  {inv.payment_date ? new Date(inv.payment_date + 'T12:00:00').toLocaleDateString('pt-BR') : 'Aguardando'}
                                </strong>
                              </div>
                            </div>

                            {/* Action Buttons for Invoice */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenInvoiceView(inv)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition cursor-pointer"
                                  title="Ver demonstrativo analítico e imprimir/PDF"
                                >
                                  <FileText className="w-3.5 h-3.5 text-emerald-700" />
                                  Visualizar / PDF
                                </button>

                                {inv.pix_code && (
                                  <button
                                    type="button"
                                    onClick={() => handleCopyPix(inv)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-xs font-semibold transition cursor-pointer"
                                    title="Copiar código PIX Copia e Cola"
                                  >
                                    {copiedInvoicePixId === inv.id ? (
                                      <>
                                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                                        <span className="text-emerald-700 font-bold">Copiado!</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3.5 h-3.5 text-slate-600" />
                                        <span>Copiar PIX</span>
                                      </>
                                    )}
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleShareWhatsApp(inv)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition cursor-pointer"
                                  title="Enviar cobrança e código PIX pelo WhatsApp da clínica"
                                >
                                  <Share2 className="w-3.5 h-3.5" />
                                  WhatsApp
                                </button>
                              </div>

                              <div>
                                <button
                                  type="button"
                                  disabled={updatingInvoiceStatus === inv.id}
                                  onClick={() => handleToggleInvoicePaid(inv)}
                                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                                    inv.status === 'PAGA'
                                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                                      : 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-2xs'
                                  }`}
                                >
                                  {updatingInvoiceStatus === inv.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : inv.status === 'PAGA' ? (
                                    <>
                                      <Clock className="w-3.5 h-3.5" />
                                      Marcar Pendente
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      Marcar como Paga
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Section 2: Lançamentos no Livro Caixa */}
                  <div className="space-y-2 pt-3 border-t border-slate-100">
                    <h5 className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                      Lançamentos Financeiros no Livro Caixa ({clinicFinancials.length})
                    </h5>

                    {clinicFinancials.length === 0 ? (
                      <p className="text-xs text-slate-400 py-3 text-center">
                        Nenhum lançamento no livro caixa vinculado a esta clínica.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {clinicFinancials.map((fin) => (
                          <div
                            key={fin.id}
                            className="p-3 rounded-lg border border-slate-200 bg-white flex items-center justify-between text-xs"
                          >
                            <div className="space-y-0.5">
                              <p className="font-semibold text-slate-800">{fin.description}</p>
                              <p className="text-slate-400 text-[11px]">
                                Data: {fin.date} • Recibo: {fin.receipt_number || '-'} • Método: {fin.payment_method}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-slate-900 text-sm font-mono">R$ {fin.amount.toFixed(2)}</p>
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                  fin.status === 'PAGO' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {fin.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedClinic(null)}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-300 transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cadastro/Edição de Clínica */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-700" />
                <h3 className="text-base font-bold text-slate-900">
                  {editingClinic ? `Editar Clínica: ${editingClinic.name}` : 'Cadastrar Nova Clínica'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingClinic(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} autoComplete="off" className="p-5 overflow-y-auto flex-1 space-y-4 text-xs">
              {modalError && (
                <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Código da Clínica</label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    placeholder="CL-01"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Nome Fantasia *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Ex: Hospital Veterinário Jardins"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-700/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Razão Social</label>
                  <input
                    type="text"
                    value={form.corporate_name}
                    onChange={(e) => setForm({ ...form, corporate_name: e.target.value })}
                    placeholder="Nome empresarial da clínica"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">CNPJ</label>
                  <input
                    type="text"
                    value={form.cnpj}
                    onChange={(e) => handleCnpjChange(e.target.value)}
                    placeholder="00.000.000/0000-00"
                    maxLength={18}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
                  />
                  {cnpjWarning && (
                    <p className="text-[11px] text-amber-700 mt-1 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {cnpjWarning}
                    </p>
                  )}
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                    {CPF_CNPJ_DISCLAIMER}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Telefone Fixo</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })}
                    placeholder="(11) 3000-0000"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">WhatsApp</label>
                  <input
                    type="text"
                    value={form.whatsapp}
                    onChange={(e) => setForm({ ...form, whatsapp: formatPhone(e.target.value) })}
                    placeholder="(11) 90000-0000"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">E-mail</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="contato@clinica.com.br"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              {/* Endereço com Busca Automática de CEP */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                    <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                    Endereço da Clínica
                  </span>
                  <span className="text-[10px] text-slate-400">Busca rápida por CEP</span>
                </div>

                {/* Campo de CEP com busca automática */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    CEP (digite os 8 dígitos para preenchimento automático)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={form.postal_code}
                      onChange={(e) => handleCepChange(e.target.value)}
                      placeholder="00000-000"
                      maxLength={9}
                      className="w-full px-3 py-2 pr-10 border border-slate-200 rounded-lg font-mono text-xs outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                      {cepLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-700" />
                      ) : (
                        <Search className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {cepFeedback && (
                    <p
                      className={`text-[11px] mt-1.5 flex items-start gap-1 font-medium ${
                        cepFeedback.type === 'success' ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      {cepFeedback.type === 'success' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-700" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-700" />
                      )}
                      <span>{cepFeedback.text}</span>
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Rua / Logradouro</label>
                    <input
                      type="text"
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      placeholder="Logradouro / Avenida / Rua"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Número</label>
                    <input
                      ref={clinicNumberInputRef}
                      type="text"
                      value={form.address_number}
                      onChange={(e) => setForm({ ...form, address_number: e.target.value })}
                      placeholder="Número"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Complemento</label>
                    <input
                      type="text"
                      value={form.complement}
                      onChange={(e) => setForm({ ...form, complement: e.target.value })}
                      placeholder="Sala, Andar, Bloco"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Bairro</label>
                    <input
                      type="text"
                      value={form.neighborhood}
                      onChange={(e) => setForm({ ...form, neighborhood: e.target.value })}
                      placeholder="Bairro"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <div className="col-span-2">
                      <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Cidade</label>
                      <input
                        type="text"
                        value={form.city}
                        onChange={(e) => setForm({ ...form, city: e.target.value })}
                        placeholder="Cidade"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-0.5 text-center">UF</label>
                      <input
                        type="text"
                        value={form.state}
                        maxLength={2}
                        onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })}
                        placeholder="SP"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono uppercase text-center text-xs outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Condições Financeiras */}
              <div className="space-y-3 pt-2 border-t border-slate-100 bg-slate-50 p-3 rounded-lg border">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-700" />
                  Condições de Pagamento e Faturamento
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Modalidade de Cobrança</label>
                    <select
                      value={form.billing_type}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          billing_type: e.target.value as 'POR_ATENDIMENTO' | 'FATURAMENTO_PERIODICO'
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                    >
                      <option value="POR_ATENDIMENTO">Cobrança por Atendimento (Direta)</option>
                      <option value="FATURAMENTO_PERIODICO">Faturamento Periódico (Mensal/Quinzenal)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Tabela de Preços</label>
                    <select
                      value={form.price_table_type}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          price_table_type: e.target.value as 'PADRAO' | 'ESPECIFICA'
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                    >
                      <option value="PADRAO">Tabela Padrão do Veterinário</option>
                      <option value="ESPECIFICA">Tabela Específica desta Clínica</option>
                    </select>
                  </div>
                </div>

                {form.billing_type === 'FATURAMENTO_PERIODICO' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Dia de Fechamento</label>
                      <input
                        type="number"
                        min={1}
                        max={31}
                        placeholder="Ex: 25"
                        autoComplete="off"
                        value={form.billing_closing_day || ''}
                        onChange={(e) => setForm({ ...form, billing_closing_day: e.target.value ? Number(e.target.value) : ('' as any) })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Dia de Vencimento</label>
                      <input
                        type="number"
                        min={1}
                        max={31}
                        placeholder="Ex: 5"
                        autoComplete="off"
                        value={form.billing_due_day || ''}
                        onChange={(e) => setForm({ ...form, billing_due_day: e.target.value ? Number(e.target.value) : ('' as any) })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Contato do Financeiro</label>
                    <input
                      type="text"
                      value={form.financial_contact}
                      onChange={(e) => setForm({ ...form, financial_contact: e.target.value })}
                      placeholder="Ex: Ana Financeiro - financeiro@clinica.com"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Termos de Pagamento</label>
                    <input
                      type="text"
                      value={form.payment_terms}
                      onChange={(e) => setForm({ ...form, payment_terms: e.target.value })}
                      placeholder="Ex: Pix com 5 dias úteis"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Observações Internas</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Informações sobre salas cirúrgicas, equipamentos disponíveis, rotina..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50 -mx-5 -mb-5 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingClinic(null);
                  }}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-semibold shadow-sm cursor-pointer"
                >
                  {editingClinic ? 'Salvar Alterações' : 'Salvar Clínica'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Visualização Analítica & Impressão da Fatura */}
      {selectedInvoiceForView && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-4xl max-h-[95vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden my-auto">
            {/* Modal Header & Actions Bar */}
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-bold text-base sm:text-lg tracking-tight">
                    Fatura & Demonstrativo: {selectedInvoiceForView.invoice_number}
                  </h3>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      selectedInvoiceForView.status === 'PAGA'
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-amber-400 text-slate-950'
                    }`}
                  >
                    {selectedInvoiceForView.status}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  {selectedInvoiceForView.clinic_name} • {selectedInvoiceForView.period_label || 'Fechamento de Serviços'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    printElement(
                      'invoice-preview-container',
                      `Fatura_${selectedInvoiceForView.invoice_number}_${selectedInvoiceForView.clinic_name}`
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Imprimir
                </button>
                <button
                  type="button"
                  onClick={() =>
                    exportToPdf(
                      'invoice-preview-container',
                      `Fatura_${selectedInvoiceForView.invoice_number}_${selectedInvoiceForView.clinic_name}`
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition border border-slate-700 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Salvar PDF
                </button>
                <button
                  type="button"
                  onClick={() => handleShareWhatsApp(selectedInvoiceForView)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleInvoicePaid(selectedInvoiceForView)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-semibold border border-slate-700 transition cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {selectedInvoiceForView.status === 'PAGA' ? 'Marcar Pendente' : 'Marcar Paga'}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedInvoiceForView(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Document Container */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-100/70">
              <div
                id="invoice-preview-container"
                className="bg-white max-w-3xl mx-auto p-6 sm:p-8 rounded-xl shadow-xs border border-slate-200 text-slate-800 text-xs space-y-6"
              >
                {/* Document Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start border-b-2 border-emerald-800 pb-5 gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-lg bg-emerald-800 text-white flex items-center justify-center font-black text-lg">
                        V
                      </div>
                      <div>
                        <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-snug">
                          {[user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Dr(a). Médico(a) Veterinário(a)'}
                        </h2>
                        <p className="text-emerald-800 font-semibold text-[11px]">
                          CRMV {user?.crmv ? `${user.crmv}/${user?.crmv_uf || 'SP'}` : 'Não informado'} • Anestesiologia & Cirurgia Veterinária
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 text-[11px] text-slate-500 space-y-0.5">
                      {user?.phone && <p>Contato: {user.phone}</p>}
                      {user?.email && <p>E-mail: {user.email}</p>}
                      {user?.pix_city ? <p>Local: {user.pix_city}</p> : user?.crmv_uf ? <p>UF: {user.crmv_uf}</p> : null}
                    </div>
                  </div>

                  <div className="text-left sm:text-right bg-emerald-50/70 border border-emerald-200/60 p-3 rounded-xl sm:min-w-[220px]">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-900 block">
                      Demonstrativo de Fechamento
                    </span>
                    <h3 className="text-lg font-black font-mono text-emerald-950 mt-0.5">
                      {selectedInvoiceForView.invoice_number}
                    </h3>
                    <div className="mt-2 text-[11px] space-y-0.5 text-slate-700">
                      <p>
                        <strong>Emissão:</strong>{' '}
                        {new Date(selectedInvoiceForView.created_at || selectedInvoiceForView.closing_date).toLocaleDateString('pt-BR')}
                      </p>
                      <p>
                        <strong>Vencimento:</strong>{' '}
                        <span className="font-bold text-emerald-800">
                          {selectedInvoiceForView.due_date
                            ? new Date(selectedInvoiceForView.due_date + 'T12:00:00').toLocaleDateString('pt-BR')
                            : 'À vista'}
                        </span>
                      </p>
                      <p>
                        <strong>Status:</strong>{' '}
                        <span
                          className={`font-bold ${
                            selectedInvoiceForView.status === 'PAGA' ? 'text-emerald-700' : 'text-amber-700'
                          }`}
                        >
                          {selectedInvoiceForView.status}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Clinic / Debtor Information */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Dados da Clínica Parceira (Tomador do Serviço)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-700">
                    <div>
                      <p className="font-bold text-slate-900 text-xs">{selectedInvoiceForView.clinic_name}</p>
                      <p>Código: {selectedClinic?.code || '-'}</p>
                      {selectedClinic?.corporate_name && <p>Razão: {selectedClinic.corporate_name}</p>}
                      {selectedClinic?.cnpj && <p>CNPJ: {selectedClinic.cnpj}</p>}
                    </div>
                    <div>
                      {selectedClinic?.financial_contact && (
                        <p><strong>Contato Financeiro:</strong> {selectedClinic.financial_contact}</p>
                      )}
                      {(selectedClinic?.phone || selectedClinic?.whatsapp) && (
                        <p><strong>Telefone / WhatsApp:</strong> {selectedClinic.phone || selectedClinic.whatsapp}</p>
                      )}
                      {selectedClinic?.address && (
                        <p>
                          <strong>Endereço:</strong> {selectedClinic.address}, {selectedClinic.address_number} - {selectedClinic.city}/{selectedClinic.state}
                        </p>
                      )}
                      <p>
                        <strong>Período de Referência:</strong>{' '}
                        {selectedInvoiceForView.period_label || `${selectedInvoiceForView.start_date} a ${selectedInvoiceForView.end_date}`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Analytical Items Table */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-emerald-700" />
                      Relação Analítica de Procedimentos Anestésicos & Cirúrgicos
                    </h4>
                    <span className="text-[11px] font-semibold text-slate-500">
                      {selectedInvoiceForView.items.length} procedimento(s)
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                          <th className="py-2 px-3">Data</th>
                          <th className="py-2 px-3">Paciente / Espécie</th>
                          <th className="py-2 px-3">Procedimento</th>
                          <th className="py-2 px-3">Cirurgião</th>
                          <th className="py-2 px-3">ASA</th>
                          <th className="py-2 px-3 text-right">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedInvoiceForView.items.map((it, idx) => (
                          <tr key={it.id || idx} className="hover:bg-slate-50/70 transition">
                            <td className="py-2 px-3 font-medium text-slate-600 whitespace-nowrap">
                              {it.procedure_date ? new Date(it.procedure_date + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                            </td>
                            <td className="py-2 px-3 font-semibold text-slate-900">
                              {it.patient_name || '-'}
                              {it.patient_species && (
                                <span className="block text-[10px] text-slate-400 font-normal">
                                  {it.patient_species}
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 font-medium text-slate-800">
                              {it.procedure_name}
                              {it.notes && (
                                <span className="block text-[10px] text-slate-400 italic">
                                  {it.notes}
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-slate-600">{it.surgeon_name || '-'}</td>
                            <td className="py-2 px-3 text-slate-500 font-mono text-[10px]">
                              {it.asa_classification ? it.asa_classification.replace('_', ' ') : '-'}
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-slate-900 font-mono whitespace-nowrap">
                              R$ {(it.billed_amount ?? it.amount ?? 0).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Totals Breakdown */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 pt-2">
                  <div className="text-[11px] text-slate-500 max-w-sm">
                    {selectedInvoiceForView.notes ? (
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <strong className="block text-slate-700 font-semibold mb-0.5">Observações:</strong>
                        <p>{selectedInvoiceForView.notes}</p>
                      </div>
                    ) : (
                      <p className="italic text-slate-400">
                        Valores apurados conforme tabela acordada entre o médico veterinário volante e a clínica parceira.
                      </p>
                    )}
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 w-full sm:w-72 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal ({selectedInvoiceForView.total_procedures} itens):</span>
                      <span className="font-mono font-semibold">R$ {(selectedInvoiceForView.subtotal_amount ?? selectedInvoiceForView.total_amount).toFixed(2)}</span>
                    </div>
                    {Boolean(selectedInvoiceForView.discount_amount && selectedInvoiceForView.discount_amount > 0) && (
                      <div className="flex justify-between text-emerald-700 font-medium">
                        <span>Descontos:</span>
                        <span className="font-mono">- R$ {(selectedInvoiceForView.discount_amount || 0).toFixed(2)}</span>
                      </div>
                    )}
                    {Boolean(selectedInvoiceForView.additional_amount && selectedInvoiceForView.additional_amount > 0) && (
                      <div className="flex justify-between text-slate-700 font-medium">
                        <span>Acréscimos / Deslocamento:</span>
                        <span className="font-mono">+ R$ {(selectedInvoiceForView.additional_amount || 0).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-slate-900 font-bold">
                      <span className="text-sm">TOTAL A PAGAR:</span>
                      <span className="text-lg font-mono text-emerald-800">
                        R$ {selectedInvoiceForView.total_amount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* PIX Payment Section */}
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl flex flex-col sm:flex-row items-center gap-4">
                  {invoiceQrDataUrl ? (
                    <img
                      src={invoiceQrDataUrl}
                      alt="QR Code PIX"
                      className="w-28 h-28 rounded-lg bg-white p-1 border border-emerald-300 shrink-0 shadow-2xs"
                    />
                  ) : (
                    <div className="w-28 h-28 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0 text-emerald-800 font-bold">
                      <QrCode className="w-10 h-10" />
                    </div>
                  )}

                  <div className="space-y-1.5 text-xs flex-1 w-full">
                    <div className="flex items-center gap-1.5 text-emerald-950 font-bold">
                      <QrCode className="w-4 h-4 text-emerald-700" />
                      <span>Instruções para Pagamento via PIX</span>
                    </div>
                    <p className="text-[11px] text-emerald-900">
                      Aponte a câmera do aplicativo do seu banco para o QR Code acima ou utilize a chave PIX:
                    </p>
                    <div className="flex flex-wrap gap-2 text-[11px]">
                      <span className="font-semibold text-slate-700">
                        Chave ({selectedInvoiceForView.pix_type || 'PIX'}):{' '}
                        <strong className="text-emerald-950 font-mono">
                          {selectedInvoiceForView.pix_key || user?.pix_key || 'Não informada'}
                        </strong>
                      </span>
                    </div>

                    {selectedInvoiceForView.pix_code && (
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-500">
                          <span>PIX Copia e Cola:</span>
                          <button
                            type="button"
                            onClick={() => handleCopyPix(selectedInvoiceForView)}
                            className="inline-flex items-center gap-1 text-emerald-800 font-bold hover:underline cursor-pointer"
                          >
                            {copiedInvoicePixId === selectedInvoiceForView.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-700" /> Copiado!
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" /> Copiar Código
                              </>
                            )}
                          </button>
                        </div>
                        <input
                          type="text"
                          readOnly
                          value={selectedInvoiceForView.pix_code}
                          className="w-full px-2 py-1 bg-white border border-emerald-200 rounded text-[10px] font-mono text-slate-700 truncate"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Document Signatures Footer */}
                <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-[10px] text-slate-500">
                  <div className="border-t border-slate-300 pt-2">
                    <p className="font-semibold text-slate-700">{[user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Médico Veterinário Anestesiologista'}</p>
                    <p>CRMV {user?.crmv || '------'}</p>
                  </div>
                  <div className="border-t border-slate-300 pt-2">
                    <p className="font-semibold text-slate-700">{selectedInvoiceForView.clinic_name}</p>
                    <p>De acordo / Financeiro da Clínica</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Principal de Emissão de Fechamento / Fatura */}
      <ClinicBillingModal
        isOpen={showBillingModal}
        onClose={() => {
          setShowBillingModal(false);
          setBillingModalClinic(null);
        }}
        initialClinic={billingModalClinic || selectedClinic}
        clinics={clinics}
        onInvoiceCreated={(newInvoice) => {
          if (selectedClinic && selectedClinic.id === newInvoice.clinic_id) {
            reloadClinicInvoices(selectedClinic.id);
          }
          loadClinics();
        }}
      />
    </div>
  );
};
