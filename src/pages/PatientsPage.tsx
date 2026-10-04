import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Patient, Tutor, Species, AnesthesiaRecord } from '../types';
import { PawPrint, Search, Plus, User, AlertCircle, X, CheckCircle2, Activity, Calendar, ShieldCheck, QrCode } from 'lucide-react';
import { useSearchParams, Link } from 'react-router-dom';
import { SPECIES_CONFIGS } from '../utils/speciesData';
import { PetCardModal } from '../components/PetCardModal';

const SPECIES_LIST: Species[] = [
  'Canina',
  'Felina',
  'Equina',
  'Bovina',
  'Ovina',
  'Caprina',
  'Suína',
  'Lagomorfa',
  'Roedores',
  'Aves',
  'Répteis',
  'Anfíbios',
  'Mustelídeos',
  'Silvestres/Exóticos',
  'Outra'
];

export const PatientsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const tutorFilterId = searchParams.get('tutor_id');

  const [patients, setPatients] = useState<Patient[]>([]);
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [search, setSearch] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedPetForCard, setSelectedPetForCard] = useState<Patient | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [microchipWarning, setMicrochipWarning] = useState<string | null>(null);

  const [form, setForm] = useState({
    tutor_id: 1,
    name: '',
    species: 'Canina' as Species,
    custom_species: '',
    scientific_name: '',
    breed: '',
    gender: 'Macho' as 'Macho' | 'Fêmea' | 'Indefinido',
    approximate_age: '',
    weight_kg: 0,
    coat_color: '',
    is_neutered: true,
    microchip: '',
    microchip_date: '',
    notes: ''
  });

  // Inline Tutor Registration State
  const [tutorMode, setTutorMode] = useState<'EXISTING' | 'NEW'>('EXISTING');
  const [newTutor, setNewTutor] = useState({
    name: '',
    phone: '',
    whatsapp: '',
    cpf: '',
    email: '',
    address: '',
    address_number: '',
    neighborhood: '',
    city: 'São Paulo',
    state: 'SP',
    notes: ''
  });

  const handleMicrochipChange = async (value: string) => {
    setForm((prev) => ({ ...prev, microchip: value }));
    const trimmed = value.trim();
    if (trimmed.length > 5) {
      const duplicate = await api.checkMicrochipDuplicate(trimmed);
      if (duplicate) {
        setMicrochipWarning(`Atenção: O microchip "${trimmed}" já está vinculado ao paciente "${duplicate.name}" (Tutor: ${duplicate.tutor_name}). Verifique a numeração.`);
      } else {
        setMicrochipWarning(null);
      }
    } else {
      setMicrochipWarning(null);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [pts, tuts] = await Promise.all([api.getPatients(), api.getTutors()]);
      setPatients(pts);
      setTutors(tuts);
      if (tuts.length > 0) {
        setForm((prev) => ({
          ...prev,
          tutor_id: tutorFilterId ? parseInt(tutorFilterId) : tuts[0].id
        }));
        if (!tutorFilterId) {
          setTutorMode('EXISTING');
        }
      } else {
        setTutorMode('NEW');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredPatients = patients.filter((p) => {
    const q = search.trim().toLowerCase();
    const matchQuery =
      !q ||
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.tutor_name && p.tutor_name.toLowerCase().includes(q)) ||
      (p.breed && p.breed.toLowerCase().includes(q)) ||
      (p.microchip && p.microchip.toLowerCase().includes(q));
    const matchSpecies =
      speciesFilter === 'ALL' ||
      (p.species && p.species.toLowerCase() === speciesFilter.toLowerCase());
    const matchTutor = !tutorFilterId || p.tutor_id === parseInt(tutorFilterId);
    return Boolean(matchQuery && matchSpecies && matchTutor);
  });

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    try {
      let finalTutorId = form.tutor_id;

      if (tutorMode === 'NEW' || tutors.length === 0) {
        if (!newTutor.name.trim()) {
          throw new Error('Informe o nome do tutor responsável.');
        }
        if (!newTutor.phone.trim() && !newTutor.whatsapp.trim()) {
          throw new Error('Informe ao menos um telefone ou WhatsApp para o novo tutor.');
        }

        const createdTutor = await api.createTutor({
          name: newTutor.name.trim(),
          phone: newTutor.phone.trim() || newTutor.whatsapp.trim(),
          whatsapp: newTutor.whatsapp.trim() || newTutor.phone.trim(),
          cpf: newTutor.cpf.trim() || undefined,
          email: newTutor.email.trim() || undefined,
          address: newTutor.address.trim() || undefined,
          address_number: newTutor.address_number.trim() || undefined,
          neighborhood: newTutor.neighborhood.trim() || undefined,
          city: newTutor.city.trim() || 'São Paulo',
          state: newTutor.state.trim() || 'SP',
          notes: newTutor.notes.trim() || 'Cadastrado junto com o paciente.'
        });

        finalTutorId = createdTutor.id;
      }

      await api.createPatient({
        ...form,
        tutor_id: finalTutorId
      });

      setShowModal(false);
      setForm({
        tutor_id: tutors.length > 0 ? tutors[0].id : 1,
        name: '',
        species: 'Canina',
        custom_species: '',
        scientific_name: '',
        breed: '',
        gender: 'Macho',
        approximate_age: '',
        weight_kg: 0,
        coat_color: '',
        is_neutered: true,
        microchip: '',
        microchip_date: '',
        notes: ''
      });
      setNewTutor({
        name: '',
        phone: '',
        whatsapp: '',
        cpf: '',
        email: '',
        address: '',
        address_number: '',
        neighborhood: '',
        city: 'São Paulo',
        state: 'SP',
        notes: ''
      });
      await loadData();
    } catch (err: any) {
      setModalError(err.message || 'Erro ao cadastrar paciente.');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <PawPrint className="w-6 h-6 text-emerald-700" />
            Pacientes
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Prontuários e fichas clínicas ({patients.length} de 50 no plano gratuito)
            {tutorFilterId && ' • Filtrado por tutor específico'}
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
          <span>Cadastrar Paciente</span>
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Pesquisar por nome do pet, tutor ou raça..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 shadow-2xs"
          />
        </div>

        <div className="sm:w-56">
          <select
            value={speciesFilter}
            onChange={(e) => setSpeciesFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-600 shadow-2xs"
          >
            <option value="ALL">Todas as espécies</option>
            {SPECIES_LIST.map((sp) => (
              <option key={sp} value={sp}>
                {sp}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Patients Grid */}
      {loading ? (
        <div className="p-8 text-center text-slate-400 text-xs">Carregando pacientes...</div>
      ) : filteredPatients.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200/80 p-8 text-center">
          <PawPrint className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">Nenhum paciente encontrado.</p>
          <p className="text-xs text-slate-400 mt-1">
            Cadastre um animal vinculado a um tutor cadastrado.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPatients.map((patient) => (
            <div
              key={patient.id}
              className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs hover:border-emerald-500/60 transition space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                    {patient.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-tight">
                      {patient.name}
                    </h3>
                    <div className="text-xs text-slate-500">
                      {patient.species} • {patient.breed || 'SRD'}
                    </div>
                  </div>
                </div>

                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {patient.gender}
                </span>
              </div>

              <div className="space-y-1 text-xs text-slate-600 border-t border-slate-100 pt-3">
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-slate-500">Tutor:</span>
                  <span className="font-medium text-slate-800">{patient.tutor_name}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-slate-500">
                  <div>Peso: {patient.weight_kg ? `${patient.weight_kg} kg` : 'Não reg.'}</div>
                  <div>Idade: {patient.approximate_age || 'Não informada'}</div>
                  <div>Pelagem: {patient.coat_color || 'Padrão'}</div>
                  <div>Castrado: {patient.is_neutered ? 'Sim' : 'Não'}</div>
                </div>
              </div>

              {patient.notes && (
                <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-md italic">
                  "{patient.notes}"
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs gap-2 flex-wrap">
                <Link
                  to={`/atendimentos?patient_id=${patient.id}`}
                  className="font-semibold text-emerald-700 hover:underline shrink-0"
                >
                  Abrir Prontuário →
                </Link>
                <div className="flex items-center gap-1.5">
                  <Link
                    to={`/atendimentos?action=new_estimate&patient_id=${patient.id}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-xs font-bold transition cursor-pointer"
                    title="Iniciar orçamento sem consulta para este paciente"
                  >
                    <span>+ Orçamento</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => setSelectedPetForCard(patient)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold transition cursor-pointer"
                    title="Ver Carteirinha Digital e QR Code deste pet"
                  >
                    <QrCode className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Carteirinha QR</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Patient Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Novo Paciente</h3>
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

            <form onSubmit={handleCreatePatient} className="mt-4 space-y-4">
              {/* Seletor / Cadastro do Tutor */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                    Tutor Responsável *
                  </label>
                  {tutors.length > 0 && (
                    <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
                      <button
                        type="button"
                        onClick={() => setTutorMode('EXISTING')}
                        className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                          tutorMode === 'EXISTING'
                            ? 'bg-emerald-700 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Tutor Cadastrado
                      </button>
                      <button
                        type="button"
                        onClick={() => setTutorMode('NEW')}
                        className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                          tutorMode === 'NEW'
                            ? 'bg-emerald-700 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        + Cadastrar Novo Tutor Junto
                      </button>
                    </div>
                  )}
                </div>

                {tutors.length === 0 && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900">
                    💡 Nenhum tutor cadastrado ainda. Preencha os dados do tutor abaixo para cadastrá-lo junto com o paciente.
                  </div>
                )}

                {tutorMode === 'EXISTING' && tutors.length > 0 ? (
                  <div>
                    <select
                      required
                      value={form.tutor_id}
                      onChange={(e) => setForm({ ...form, tutor_id: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none bg-white font-medium"
                    >
                      {tutors.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.city || 'SP'}) {t.phone ? `• ${t.phone}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  /* Formulário de Novo Tutor Integrado */
                  <div className="space-y-2.5 pt-1 border-t border-slate-200/80">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                          Nome Completo do Tutor *
                        </label>
                        <input
                          type="text"
                          required={tutorMode === 'NEW' || tutors.length === 0}
                          placeholder="Ex: Mariana Silveira"
                          value={newTutor.name}
                          onChange={(e) => setNewTutor({ ...newTutor, name: e.target.value })}
                          className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                          Telefone / WhatsApp *
                        </label>
                        <input
                          type="text"
                          required={tutorMode === 'NEW' || tutors.length === 0}
                          placeholder="Ex: (11) 98765-4321"
                          value={newTutor.phone}
                          onChange={(e) => setNewTutor({ ...newTutor, phone: e.target.value, whatsapp: e.target.value })}
                          className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                          CPF (opcional)
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: 123.456.789-00"
                          value={newTutor.cpf}
                          onChange={(e) => setNewTutor({ ...newTutor, cpf: e.target.value })}
                          className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                          E-mail (opcional)
                        </label>
                        <input
                          type="email"
                          placeholder="Ex: mariana@exemplo.com"
                          value={newTutor.email}
                          onChange={(e) => setNewTutor({ ...newTutor, email: e.target.value })}
                          className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                          Endereço / Logradouro
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: Rua Oscar Freire"
                          value={newTutor.address}
                          onChange={(e) => setNewTutor({ ...newTutor, address: e.target.value })}
                          className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                          Cidade / UF
                        </label>
                        <input
                          type="text"
                          placeholder="São Paulo/SP"
                          value={newTutor.city}
                          onChange={(e) => setNewTutor({ ...newTutor, city: e.target.value })}
                          className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none bg-white"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nome do Pet *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Thor"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Espécie *</label>
                  <select
                    value={form.species}
                    onChange={(e) => setForm({ ...form, species: e.target.value as Species })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none bg-white"
                  >
                    {SPECIES_LIST.map((sp) => (
                      <option key={sp} value={sp}>
                        {sp}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {form.species === 'Outra' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Especificar Espécie</label>
                  <input
                    type="text"
                    placeholder="Especifique a espécie"
                    value={form.custom_species}
                    onChange={(e) => setForm({ ...form, custom_species: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none"
                  />
                </div>
              )}

              {SPECIES_CONFIGS[form.species]?.showScientificName && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nome Científico (Espécie Silvestre / Exótica)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Amazona aestiva / Panthera onca"
                    value={form.scientific_name}
                    onChange={(e) => setForm({ ...form, scientific_name: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none italic font-serif"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {SPECIES_CONFIGS[form.species]?.breedLabel || 'Raça'}
                  </label>
                  <input
                    type="text"
                    placeholder={SPECIES_CONFIGS[form.species]?.breedPlaceholder || 'Ex: Golden Retriever ou SRD'}
                    value={form.breed}
                    onChange={(e) => setForm({ ...form, breed: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Sexo</label>
                  <select
                    value={form.gender}
                    onChange={(e) => setForm({ ...form, gender: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none bg-white"
                  >
                    <option value="Macho">Macho</option>
                    <option value="Fêmea">Fêmea</option>
                    <option value="Indefinido">Indefinido</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Idade aprox.</label>
                  <input
                    type="text"
                    placeholder="Ex: 3 anos"
                    value={form.approximate_age}
                    onChange={(e) => setForm({ ...form, approximate_age: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Peso (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Ex: 12.5"
                    value={form.weight_kg || ''}
                    onChange={(e) => setForm({ ...form, weight_kg: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {SPECIES_CONFIGS[form.species]?.coatLabel || 'Pelagem'}
                  </label>
                  <input
                    type="text"
                    placeholder={SPECIES_CONFIGS[form.species]?.coatPlaceholder || 'Dourado / Preto'}
                    value={form.coat_color}
                    onChange={(e) => setForm({ ...form, coat_color: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none"
                  />
                </div>
              </div>

              {/* Microchip e Data */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider block">
                  Identificação por Microchip
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Número do Microchip</label>
                    <input
                      type="text"
                      placeholder="Ex: 981098102345678"
                      value={form.microchip}
                      onChange={(e) => handleMicrochipChange(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Data da Aplicação</label>
                    <input
                      type="date"
                      value={form.microchip_date}
                      onChange={(e) => setForm({ ...form, microchip_date: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded bg-white"
                    />
                  </div>
                </div>
                {microchipWarning && (
                  <p className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded border border-amber-200 font-medium flex items-start gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                    <span>{microchipWarning}</span>
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="neutered"
                  checked={form.is_neutered}
                  onChange={(e) => setForm({ ...form, is_neutered: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="neutered" className="text-xs font-semibold text-slate-700">
                  Animal já castrado / esterilizado
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Observações Clínicas Iniciais</label>
                <textarea
                  rows={2}
                  placeholder="Alergias conhecidas, histórico prévio, temperamento..."
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
                  Salvar Paciente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal da Carteirinha Digital do Pet com QR Code */}
      <PetCardModal
        isOpen={!!selectedPetForCard}
        onClose={() => setSelectedPetForCard(null)}
        patient={selectedPetForCard}
        tutorName={
          tutors.find((t) => t.id === selectedPetForCard?.tutor_id)?.name ||
          selectedPetForCard?.tutor_name
        }
        tutorPhone={
          tutors.find((t) => t.id === selectedPetForCard?.tutor_id)?.phone ||
          tutors.find((t) => t.id === selectedPetForCard?.tutor_id)?.whatsapp
        }
      />
    </div>
  );
};
