import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { Tutor } from '../types';
import { Users, Search, Plus, Phone, MapPin, Mail, AlertCircle, CheckCircle2, PawPrint, X, Edit3, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  formatCPF,
  validateCPF,
  formatPhone,
  CPF_CNPJ_DISCLAIMER
} from '../utils/validators';
import { formatTutorCode } from '../utils/formatters';
import { formatCEP, fetchAddressByCep } from '../services/cepService';

export const TutorsPage: React.FC = () => {
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTutor, setEditingTutor] = useState<Tutor | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [cpfWarning, setCpfWarning] = useState<string | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [cepLoading, setCepLoading] = useState(false);
  const [cepFeedback, setCepFeedback] = useState<{ text: string; type: 'success' | 'warning' } | null>(null);
  const numberInputRef = useRef<HTMLInputElement | null>(null);

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

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackToast({ text, type });
    setTimeout(() => setFeedbackToast(null), 3500);
  };

  useEffect(() => {
    loadTutors();
  }, []);

  const loadTutors = async (showLoadingSpinner = true) => {
    try {
      if (showLoadingSpinner) setLoading(true);
      const data = await api.getTutors();
      if (Array.isArray(data)) {
        setTutors(data);
      }
    } catch (e) {
      console.error('Erro ao carregar tutores:', e);
    } finally {
      if (showLoadingSpinner) setLoading(false);
    }
  };

  const filteredTutors = tutors.filter((t) => {
    if (!t) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const code = formatTutorCode(t).toLowerCase();
    return (
      (t.name && t.name.toLowerCase().includes(q)) ||
      code.includes(q) ||
      (t.cpf && t.cpf.toLowerCase().includes(q)) ||
      (t.phone && t.phone.toLowerCase().includes(q)) ||
      (t.whatsapp && t.whatsapp.toLowerCase().includes(q)) ||
      (t.email && t.email.toLowerCase().includes(q)) ||
      (t.city && t.city.toLowerCase().includes(q))
    );
  });

  const handleOpenCreate = () => {
    setEditingTutor(null);
    setModalError(null);
    setCpfWarning(null);
    setCepFeedback(null);
    setCepLoading(false);
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
    setShowModal(true);
  };

  const handleOpenEdit = (tutor: Tutor) => {
    setEditingTutor(tutor);
    setModalError(null);
    setCpfWarning(null);
    setCepFeedback(null);
    setCepLoading(false);
    setForm({
      name: tutor.name || '',
      cpf: tutor.cpf || '',
      phone: tutor.phone || '',
      whatsapp: tutor.whatsapp || '',
      email: tutor.email || '',
      address: tutor.address || '',
      address_number: tutor.address_number || '',
      complement: tutor.complement || '',
      neighborhood: tutor.neighborhood || '',
      city: tutor.city || 'São Paulo',
      state: tutor.state || 'SP',
      postal_code: tutor.postal_code || '',
      notes: tutor.notes || ''
    });
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
            numberInputRef.current?.focus();
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

  const handleCpfChange = async (value: string) => {
    const formatted = formatCPF(value);
    setForm((prev) => ({ ...prev, cpf: formatted }));

    if (formatted.length > 0) {
      const valResult = validateCPF(formatted);
      if (!valResult.isValid) {
        setCpfWarning(valResult.error || 'Dígitos verificadores do CPF inválidos.');
      } else {
        // Verifica se já existe outro tutor cadastrado com este CPF
        const duplicate = await api.checkTutorCpfDuplicate(formatted, editingTutor?.id);
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

  const handleSaveTutor = async (e: React.FormEvent) => {
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
      if (editingTutor) {
        const updated = await api.updateTutor(editingTutor.id, form);
        setTutors((prev) =>
          prev.map((t) => (Number(t.id) === Number(editingTutor.id) ? { ...t, ...updated, ...form } : t))
        );
        showToast(`Tutor "${form.name}" atualizado com sucesso!`);
      } else {
        const created = await api.createTutor(form);
        if (created && created.id) {
          setTutors((prev) => [
            {
              ...created,
              code: created.code || `TUT-${String(created.id).padStart(4, '0')}`,
              patients_count: 0,
            },
            ...prev.filter((t) => Number(t.id) !== Number(created.id)),
          ]);
        }
        showToast(`Tutor "${form.name}" cadastrado com sucesso!`);
      }
      setShowModal(false);
      setEditingTutor(null);
      setCpfWarning(null);
      await loadTutors(false);
    } catch (err: any) {
      setModalError(err.message || 'Erro ao salvar informações do tutor.');
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
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Tutor</span>
        </button>
      </div>

      {/* Toast Feedback */}
      {feedbackToast && (
        <div className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 shadow-xs transition-all ${
          feedbackToast.type === 'error'
            ? 'bg-rose-50 border-rose-200 text-rose-800'
            : 'bg-emerald-50 border-emerald-200 text-emerald-900'
        }`}>
          {feedbackToast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          )}
          <span>{feedbackToast.text}</span>
        </div>
      )}

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
            onClick={handleOpenCreate}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-700 text-white hover:bg-emerald-800 transition cursor-pointer"
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      #{formatTutorCode(tutor)}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 leading-tight">
                      {tutor.name}
                    </h3>
                  </div>
                  {tutor.cpf && (
                    <span className="text-[11px] text-slate-400 font-mono block mt-1">
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
                      {tutor.complement && `(${tutor.complement}) `}
                      {tutor.neighborhood && `• ${tutor.neighborhood}`}{' '}
                      {tutor.city && `• ${tutor.city}-${tutor.state || 'SP'}`}{' '}
                      {tutor.postal_code && `• CEP: ${tutor.postal_code}`}
                    </span>
                  </div>
                )}
              </div>

              {tutor.notes && (
                <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-md italic">
                  "{tutor.notes}"
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs gap-2">
                <Link
                  to={`/pacientes?tutor_id=${tutor.id}`}
                  className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:underline"
                >
                  <PawPrint className="w-3.5 h-3.5" />
                  Ver pacientes
                </Link>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(tutor)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                    title="Editar informações do tutor"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                    <span>Editar</span>
                  </button>
                  <span className="text-[11px] text-slate-400">Ativo</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tutor Modal (Create & Edit) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingTutor ? 'Editar Dados do Tutor' : 'Novo Tutor'}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingTutor(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
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

            <form onSubmit={handleSaveTutor} className="mt-4 space-y-3">
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

              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                    Endereço de Atendimento Domiciliar
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
                      placeholder="00000-000"
                      maxLength={9}
                      value={form.postal_code}
                      onChange={(e) => handleCepChange(e.target.value)}
                      className="w-full px-3 py-2 pr-10 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none font-mono focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition"
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

                {/* Rua e Número */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Rua / Logradouro</label>
                    <input
                      type="text"
                      placeholder="Rua / Avenida"
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Número</label>
                    <input
                      ref={numberInputRef}
                      type="text"
                      placeholder="123"
                      value={form.address_number}
                      onChange={(e) => setForm({ ...form, address_number: e.target.value })}
                      className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                </div>

                {/* Complemento e Bairro */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Complemento</label>
                    <input
                      type="text"
                      placeholder="Apto 42, Bloco B"
                      value={form.complement}
                      onChange={(e) => setForm({ ...form, complement: e.target.value })}
                      className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Bairro</label>
                    <input
                      type="text"
                      placeholder="Bairro"
                      value={form.neighborhood}
                      onChange={(e) => setForm({ ...form, neighborhood: e.target.value })}
                      className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                </div>

                {/* Cidade e UF */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Cidade</label>
                    <input
                      type="text"
                      placeholder="Cidade"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">UF</label>
                    <input
                      type="text"
                      placeholder="SP"
                      maxLength={2}
                      value={form.state}
                      onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none font-mono uppercase text-center focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
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
                  onClick={() => {
                    setShowModal(false);
                    setEditingTutor(null);
                  }}
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white transition cursor-pointer"
                >
                  {editingTutor ? 'Salvar Alterações' : 'Cadastrar Tutor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
