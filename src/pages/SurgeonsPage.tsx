import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { Surgeon, Clinic } from '../types';
import {
  UserCheck,
  Search,
  Plus,
  Phone,
  Mail,
  Building2,
  FileCheck,
  AlertCircle,
  X,
  CheckCircle2,
  Filter
} from 'lucide-react';
import { formatPhone } from '../utils/validators';

export const SurgeonsPage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const isAnesthesiaActive = Boolean(user?.specialty_anesthesia_enabled);
  const [surgeons, setSurgeons] = useState<Surgeon[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [selectedClinicFilter, setSelectedClinicFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const [form, setForm] = useState({
    code: '',
    name: '',
    crmv: '',
    crmv_uf: 'SP',
    phone: '',
    whatsapp: '',
    email: '',
    notes: '',
    clinic_ids: [] as number[],
    is_active: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [surgeonsData, clinicsData] = await Promise.all([
        api.getSurgeons(),
        api.getClinics()
      ]);
      setSurgeons(surgeonsData);
      setClinics(clinicsData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = () => {
    const nextCode = `PR-${Math.floor(10 + Math.random() * 89)}`;
    setForm({
      code: nextCode,
      name: '',
      crmv: '',
      crmv_uf: 'SP',
      phone: '',
      whatsapp: '',
      email: '',
      notes: '',
      clinic_ids: [],
      is_active: true
    });
    setModalError(null);
    setShowModal(true);
  };

  const handleToggleClinic = (clinicId: number) => {
    setForm((prev) => {
      const exists = prev.clinic_ids.includes(clinicId);
      return {
        ...prev,
        clinic_ids: exists
          ? prev.clinic_ids.filter((id) => id !== clinicId)
          : [...prev.clinic_ids, clinicId]
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!form.name.trim()) {
      setModalError('O nome do cirurgião é obrigatório.');
      return;
    }
    if (!form.crmv.trim()) {
      setModalError('O CRMV do cirurgião é obrigatório.');
      return;
    }

    try {
      await api.createSurgeon(form);
      setShowModal(false);
      loadData();
    } catch (err: any) {
      setModalError(err.message || 'Erro ao cadastrar cirurgião.');
    }
  };

  const filteredSurgeons = surgeons.filter((s) => {
    const q = search.toLowerCase();
    const matchesSearch =
      s.name.toLowerCase().includes(q) ||
      s.code.toLowerCase().includes(q) ||
      s.crmv.includes(q) ||
      (s.email && s.email.toLowerCase().includes(q));

    if (selectedClinicFilter === 'ALL') return matchesSearch;
    const filterId = Number(selectedClinicFilter);
    return matchesSearch && s.clinic_ids.includes(filterId);
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Banner de Aviso caso o veterinário tenha desativado a especialidade */}
      {!isAnesthesiaActive && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900 shadow-xs">
          <div className="flex items-start sm:items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <strong className="block sm:inline font-bold">Módulo de Anestesiologia Desativado:</strong> O menu "Cirurgiões" está oculto porque o módulo de Anestesiologia está desativado nas suas configurações.
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
              <UserCheck className="w-6 h-6 text-emerald-700" />
              Cirurgiões
            </h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">
              {surgeons.length} profissionais
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Cirurgiões e profissionais parceiros com vínculo a múltiplas clínicas (identificador PR-xx). Seleção prioritária durante anestesias.
          </p>
        </div>

        <button
          onClick={handleOpenModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-sm font-semibold transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Novo Cirurgião
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por código (PR-42), nome do cirurgião ou CRMV..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition"
          />
        </div>

        <div className="flex items-center gap-2 sm:w-72">
          <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedClinicFilter}
            onChange={(e) => setSelectedClinicFilter(e.target.value)}
            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
          >
            <option value="ALL">Todas as Clínicas</option>
            {clinics.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} - {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Surgeons Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSurgeons.map((surgeon) => (
          <div
            key={surgeon.id}
            className="bg-white p-5 rounded-xl border border-slate-200/90 hover:border-emerald-500 hover:shadow-md transition flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="inline-block px-2 py-0.5 text-[11px] font-black rounded bg-emerald-100 text-emerald-900 tracking-wider">
                    {surgeon.code}
                  </span>
                  <h2 className="text-base font-bold text-slate-900 mt-1">
                    {surgeon.name}
                  </h2>
                  <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1 mt-0.5">
                    <FileCheck className="w-3.5 h-3.5" />
                    CRMV-{surgeon.crmv_uf} {surgeon.crmv}
                  </p>
                </div>
                <span
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                    surgeon.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {surgeon.is_active ? 'Ativo' : 'Inativo'}
                </span>
              </div>

              <div className="space-y-1 text-xs text-slate-600">
                {surgeon.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{surgeon.phone}</span>
                  </div>
                )}
                {surgeon.email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{surgeon.email}</span>
                  </div>
                )}
                {surgeon.notes && (
                  <p className="text-slate-500 italic mt-1 bg-slate-50 p-2 rounded text-[11px]">
                    {surgeon.notes}
                  </p>
                )}
              </div>
            </div>

            <div className="pt-3 mt-3 border-t border-slate-100 space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Clínicas Vinculadas ({surgeon.clinic_ids.length})
              </span>
              <div className="flex flex-wrap gap-1.5">
                {surgeon.clinic_ids.length === 0 ? (
                  <span className="text-[11px] text-slate-400 italic">Nenhuma clínica vinculada</span>
                ) : (
                  surgeon.clinic_ids.map((cId) => {
                    const clinic = clinics.find((c) => c.id === cId);
                    return clinic ? (
                      <span
                        key={cId}
                        className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-medium"
                      >
                        {clinic.name}
                      </span>
                    ) : null;
                  })
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredSurgeons.length === 0 && !loading && (
        <div className="bg-white p-12 text-center rounded-xl border border-dashed border-slate-300">
          <UserCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-700">Nenhum cirurgião encontrado</p>
          <p className="text-xs text-slate-400 mt-1">Cadastre os cirurgiões parceiros com quem você opera.</p>
        </div>
      )}

      {/* Modal Cadastro Cirurgião */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg max-h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-700" />
                <h3 className="text-base font-bold text-slate-900">Cadastrar Novo Cirurgião</h3>
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
                  <label className="block font-semibold text-slate-700 mb-1">Identificador</label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    placeholder="PR-42"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-emerald-900"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Nome Completo *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Ex: Dr. Roberto Martins de Castro"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-700/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Número do CRMV *</label>
                  <input
                    type="text"
                    required
                    value={form.crmv}
                    onChange={(e) => setForm({ ...form, crmv: e.target.value })}
                    placeholder="Ex: 21450"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">UF CRMV</label>
                  <select
                    value={form.crmv_uf}
                    onChange={(e) => setForm({ ...form, crmv_uf: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                  >
                    {['SP', 'RJ', 'MG', 'RS', 'PR', 'SC', 'GO', 'DF', 'BA', 'PE', 'CE', 'ES'].map((uf) => (
                      <option key={uf} value={uf}>
                        {uf}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })}
                    placeholder="(11) 98000-0000"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">E-mail</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="cirurgiao@exemplo.com"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              {/* Clínicas Vinculadas (Múltipla Seleção) */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block font-semibold text-slate-800">
                  Clínicas Onde Este Cirurgião Opera:
                </label>
                <p className="text-[11px] text-slate-500">
                  O cirurgião pode estar vinculado a várias clínicas sem precisar de novo cadastro. Ao selecionar a clínica na anestesia, seus cirurgiões aparecem com prioridade.
                </p>

                <div className="space-y-1.5 max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2.5 bg-slate-50">
                  {clinics.map((c) => {
                    const isChecked = form.clinic_ids.includes(c.id);
                    return (
                      <label
                        key={c.id}
                        className={`flex items-center gap-2.5 p-2 rounded cursor-pointer transition text-xs ${
                          isChecked ? 'bg-emerald-50 text-emerald-900 font-semibold' : 'hover:bg-white text-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleClinic(c.id)}
                          className="rounded text-emerald-700 focus:ring-emerald-700 w-4 h-4"
                        />
                        <span>
                          <strong className="font-mono text-slate-500 mr-1">{c.code}</strong> {c.name}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Observações e Especialidades Cirúrgicas</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Ex: Especialista em tecidos moles, oncologia cirúrgica e ortopedia..."
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
                  Salvar Cirurgião
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
