import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { Clinic, AnesthesiaRecord, FinancialEntry } from '../types';
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
  Tag
} from 'lucide-react';
import {
  formatCNPJ,
  validateCNPJ,
  formatPhone,
  CPF_CNPJ_DISCLAIMER
} from '../utils/validators';

export const ClinicsPage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const isAnesthesiaActive = Boolean(user?.specialty_anesthesia_enabled);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [clinicHistory, setClinicHistory] = useState<AnesthesiaRecord[]>([]);
  const [clinicFinancials, setClinicFinancials] = useState<FinancialEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'info' | 'history' | 'financial'>('info');

  const [modalError, setModalError] = useState<string | null>(null);
  const [cnpjWarning, setCnpjWarning] = useState<string | null>(null);

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
    city: 'São Paulo',
    state: 'SP',
    postal_code: '',
    manager_name: '',
    financial_contact: '',
    payment_terms: '',
    billing_type: 'POR_ATENDIMENTO' as 'POR_ATENDIMENTO' | 'FATURAMENTO_PERIODICO',
    billing_closing_day: 25,
    billing_due_day: 5,
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
      city: 'São Paulo',
      state: 'SP',
      postal_code: '',
      manager_name: '',
      financial_contact: '',
      payment_terms: '',
      billing_type: 'POR_ATENDIMENTO',
      billing_closing_day: 25,
      billing_due_day: 5,
      price_table_type: 'PADRAO',
      notes: '',
      is_active: true
    });
    setModalError(null);
    setCnpjWarning(null);
    setShowModal(true);
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
        if (duplicate) {
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
      await api.createClinic(form);
      setShowModal(false);
      loadClinics();
    } catch (err: any) {
      setModalError(err.message || 'Erro ao cadastrar clínica.');
    }
  };

  const handleSelectClinic = async (clinic: Clinic) => {
    setSelectedClinic(clinic);
    setActiveTab('info');
    try {
      const procedures = await api.getAnesthesias({ clinicId: clinic.id });
      setClinicHistory(procedures);
      const allFin = await api.getFinancialEntries();
      setClinicFinancials(allFin.filter((f) => f.clinic_id === clinic.id));
    } catch (err) {
      console.error(err);
    }
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

        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-sm font-semibold transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Nova Clínica
        </button>
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
              <span className="font-semibold text-emerald-800">
                {clinic.total_procedures || 0} anestesias
              </span>
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
              <button
                onClick={() => setSelectedClinic(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50"
              >
                <X className="w-5 h-5" />
              </button>
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
                Financeiro & Faturamentos ({clinicFinancials.length})
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
                <div className="space-y-3">
                  {clinicFinancials.length === 0 ? (
                    <p className="text-xs text-slate-500 py-6 text-center">
                      Nenhum lançamento financeiro vinculado a esta clínica.
                    </p>
                  ) : (
                    clinicFinancials.map((fin) => (
                      <div
                        key={fin.id}
                        className="p-3.5 rounded-lg border border-slate-200 bg-white flex items-center justify-between text-xs"
                      >
                        <div className="space-y-0.5">
                          <p className="font-semibold text-slate-800">{fin.description}</p>
                          <p className="text-slate-400">Data: {fin.date} • {fin.receipt_number}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-slate-900 text-sm">R$ {fin.amount.toFixed(2)}</p>
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              fin.status === 'PAGO' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {fin.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
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

      {/* Modal Cadastro Nova Clínica */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-700" />
                <h3 className="text-base font-bold text-slate-900">Cadastrar Nova Clínica</h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 overflow-y-auto flex-1 space-y-4 text-xs">
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

              {/* Endereço */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="font-bold text-slate-800">Endereço da Clínica</span>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div className="sm:col-span-3">
                    <input
                      type="text"
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      placeholder="Logradouro / Avenida / Rua"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={form.address_number}
                      onChange={(e) => setForm({ ...form, address_number: e.target.value })}
                      placeholder="Número"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={form.neighborhood}
                    onChange={(e) => setForm({ ...form, neighborhood: e.target.value })}
                    placeholder="Bairro"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="Cidade"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                  <input
                    type="text"
                    value={form.postal_code}
                    onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
                    placeholder="CEP"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
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
                        value={form.billing_closing_day}
                        onChange={(e) => setForm({ ...form, billing_closing_day: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Dia de Vencimento</label>
                      <input
                        type="number"
                        min={1}
                        max={31}
                        value={form.billing_due_day}
                        onChange={(e) => setForm({ ...form, billing_due_day: Number(e.target.value) })}
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
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-100 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-semibold shadow-sm"
                >
                  Salvar Clínica
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
