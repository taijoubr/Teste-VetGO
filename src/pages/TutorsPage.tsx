import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Tutor } from '../types';
import { Users, Search, Plus, Phone, MapPin, Mail, AlertCircle, CheckCircle2, PawPrint, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  formatCPF,
  validateCPF,
  formatPhone,
  CPF_CNPJ_DISCLAIMER
} from '../utils/validators';

export const TutorsPage: React.FC = () => {
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [cpfWarning, setCpfWarning] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    cpf: '',
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
    notes: ''
  });

  useEffect(() => {
    loadTutors();
  }, []);

  const loadTutors = async () => {
    try {
      setLoading(true);
      const data = await api.getTutors();
      setTutors(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredTutors = tutors.filter((t) => {
    const q = search.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      (t.cpf && t.cpf.includes(q)) ||
      (t.phone && t.phone.includes(q)) ||
      (t.city && t.city.toLowerCase().includes(q))
    );
  });

  const handleCpfChange = async (value: string) => {
    const formatted = formatCPF(value);
    setForm((prev) => ({ ...prev, cpf: formatted }));

    if (formatted.length > 0) {
      const valResult = validateCPF(formatted);
      if (!valResult.isValid) {
        setCpfWarning(valResult.error || 'Dígitos verificadores do CPF inválidos.');
      } else {
        // Verifica se já existe outro tutor cadastrado com este CPF
        const duplicate = await api.checkTutorCpfDuplicate(formatted);
        if (duplicate) {
          setCpfWarning(`Atenção: Este CPF já consta para o tutor "${duplicate.name}". Caso seja a mesma família ou homônimo, você pode prosseguir.`);
        } else {
          setCpfWarning(null);
        }
      }
    } else {
      setCpfWarning(null);
    }
  };

  const handleCreateTutor = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (form.cpf) {
      const valResult = validateCPF(form.cpf);
      if (!valResult.isValid) {
        setModalError(valResult.error || 'CPF inválido. Corrija os dígitos para salvar.');
        return;
      }
    }

    try {
      await api.createTutor(form);
      setShowModal(false);
      setCpfWarning(null);
      setForm({
        name: '',
        cpf: '',
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
        notes: ''
      });
      loadTutors();
    } catch (err: any) {
      setModalError(err.message || 'Erro ao cadastrar tutor.');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-700" />
            Tutores
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Gerencie os tutores vinculados exclusivamente à sua conta ({tutors.length} de 30 no plano gratuito)
          </p>
        </div>

        <button
          onClick={() => {
            setModalError(null);
            setShowModal(true);
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Tutor</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Pesquisar por nome, CPF, telefone ou cidade..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 shadow-2xs"
          />
        </div>
      </div>

      {/* Tutors Grid/List */}
      {loading ? (
        <div className="p-8 text-center text-slate-400 text-xs">Carregando tutores...</div>
      ) : filteredTutors.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200/80 p-8 text-center">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">Nenhum tutor encontrado.</p>
          <p className="text-xs text-slate-400 mt-1">
            Cadastre seu primeiro tutor para vincular pacientes e agendamentos.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-700 text-white hover:bg-emerald-800 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Cadastrar Tutor
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTutors.map((tutor) => (
            <div
              key={tutor.id}
              className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs hover:border-emerald-500/60 transition space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-tight">
                    {tutor.name}
                  </h3>
                  {tutor.cpf && (
                    <span className="text-[11px] text-slate-400 font-mono">
                      CPF: {tutor.cpf}
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                  {tutor.patients_count || 0} paciente(s)
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
                {tutor.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{tutor.phone}</span>
                  </div>
                )}
                {tutor.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{tutor.email}</span>
                  </div>
                )}
                {tutor.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                    <span className="text-slate-500 line-clamp-2">
                      {tutor.address}, {tutor.address_number || 'S/N'}{' '}
                      {tutor.neighborhood && `• ${tutor.neighborhood}`}{' '}
                      {tutor.city && `(${tutor.city}-${tutor.state || 'SP'})`}
                    </span>
                  </div>
                )}
              </div>

              {tutor.notes && (
                <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-md italic">
                  "{tutor.notes}"
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <Link
                  to={`/pacientes?tutor_id=${tutor.id}`}
                  className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:underline"
                >
                  <PawPrint className="w-3 h-3" />
                  Ver pacientes
                </Link>
                <span className="text-[11px] text-slate-400">Ativo</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Tutor Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Novo Tutor</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateTutor} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome Completo do Tutor *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Mariana Silveira Ramos"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">CPF</label>
                  <input
                    type="text"
                    placeholder="000.000.000-00"
                    maxLength={14}
                    value={form.cpf}
                    onChange={(e) => handleCpfChange(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none font-mono"
                  />
                  {cpfWarning && (
                    <p className="text-[11px] text-amber-700 mt-1 flex items-start gap-1 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      {cpfWarning}
                    </p>
                  )}
                  <p className="text-[10px] text-slate-400 mt-1 leading-tight">
                    {CPF_CNPJ_DISCLAIMER}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Telefone / WhatsApp *</label>
                  <input
                    type="text"
                    required
                    placeholder="(11) 97123-4567"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">E-mail</label>
                <input
                  type="email"
                  placeholder="tutor@exemplo.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Endereço Principal</label>
                  <input
                    type="text"
                    placeholder="Rua / Avenida"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Número</label>
                  <input
                    type="text"
                    placeholder="123"
                    value={form.address_number}
                    onChange={(e) => setForm({ ...form, address_number: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Bairro</label>
                  <input
                    type="text"
                    placeholder="Bairro"
                    value={form.neighborhood}
                    onChange={(e) => setForm({ ...form, neighborhood: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Cidade</label>
                  <input
                    type="text"
                    placeholder="Cidade"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Observações Clínicas / Preferências</label>
                <textarea
                  rows={2}
                  placeholder="Informações importantes para os atendimentos domiciliares..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none"
                />
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
                  Salvar Tutor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
