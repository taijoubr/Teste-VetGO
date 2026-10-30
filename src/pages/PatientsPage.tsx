import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Patient, Tutor, Species, AnesthesiaRecord, PatientExam } from '../types';
import {
  PawPrint,
  Search,
  Plus,
  User,
  AlertCircle,
  X,
  CheckCircle2,
  Activity,
  Calendar,
  ShieldCheck,
  QrCode,
  Edit3,
  FileText,
  Microscope,
  FileSpreadsheet,
  Heart,
  Pill,
  UploadCloud,
  Eye,
  Download,
  Share2,
  Paperclip,
  ExternalLink
} from 'lucide-react';
import { useSearchParams, Link } from 'react-router-dom';
import { SPECIES_CONFIGS } from '../utils/speciesData';
import { PetCardModal } from '../components/PetCardModal';
import { FullMedicalRecordModal } from '../components/FullMedicalRecordModal';
import { DirectPrescriptionModal } from '../components/DirectPrescriptionModal';
import { formatPatientCode, formatTutorCode } from '../utils/formatters';

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
  const [anesthesias, setAnesthesias] = useState<AnesthesiaRecord[]>([]);
  const [exams, setExams] = useState<PatientExam[]>([]);
  const [selectedPetForExams, setSelectedPetForExams] = useState<Patient | null>(null);
  const [selectedPetForPrescription, setSelectedPetForPrescription] = useState<Patient | null>(null);
  const [viewingExamPdf, setViewingExamPdf] = useState<{ url: string; title: string; filename?: string } | null>(null);
  const [showNewExamModal, setShowNewExamModal] = useState(false);
  const [examForm, setExamForm] = useState({
    exam_type: 'Hemograma Completo',
    date: new Date().toISOString().split('T')[0],
    laboratory: '',
    status: 'CONCLUIDO' as 'SOLICITADO' | 'COLETADO' | 'CONCLUIDO',
    results: '',
    reference_values: '',
    price: 0,
    notes: '',
    pdf_url: '',
    pdf_name: '',
    pdf_size: ''
  });
  const [search, setSearch] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [selectedPetForCard, setSelectedPetForCard] = useState<Patient | null>(null);
  const [selectedPetForMedicalRecord, setSelectedPetForMedicalRecord] = useState<Patient | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [microchipWarning, setMicrochipWarning] = useState<string | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

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

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackToast({ text, type });
    setTimeout(() => setFeedbackToast(null), 3500);
  };

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
      const duplicate = await api.checkMicrochipDuplicate(trimmed, editingPatient?.id);
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

  const loadData = async (showLoadingSpinner = true) => {
    try {
      if (showLoadingSpinner) setLoading(true);
      const [pts, tuts, anesthesiasData, examsData] = await Promise.all([
        api.getPatients(),
        api.getTutors(),
        api.getAnesthesias().catch(() => []),
        api.getPatientExams().catch(() => [])
      ]);
      if (Array.isArray(pts)) setPatients(pts);
      if (Array.isArray(tuts)) setTutors(tuts);
      if (Array.isArray(anesthesiasData)) setAnesthesias(anesthesiasData);
      if (Array.isArray(examsData)) setExams(examsData);

      if (tuts && tuts.length > 0) {
        setForm((prev) => ({
          ...prev,
          tutor_id: tutorFilterId ? parseInt(tutorFilterId) : (prev.tutor_id || tuts[0].id)
        }));
        if (!tutorFilterId) {
          setTutorMode('EXISTING');
        }
      } else {
        setTutorMode('NEW');
      }

      if (searchParams.get('new_pet') === 'true') {
        setShowModal(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (showLoadingSpinner) setLoading(false);
    }
  };

  const filteredPatients = patients.filter((p) => {
    const q = search.trim().toLowerCase();
    const code = formatPatientCode(p).toLowerCase();
    const matchQuery =
      !q ||
      code.includes(q) ||
      (p.code && p.code.toLowerCase().includes(q)) ||
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

  const handleOpenCreate = () => {
    setEditingPatient(null);
    setModalError(null);
    setMicrochipWarning(null);
    setForm({
      tutor_id: tutorFilterId ? parseInt(tutorFilterId) : (tutors.length > 0 ? tutors[0].id : 1),
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
    setTutorMode(tutors.length > 0 ? 'EXISTING' : 'NEW');
    setShowModal(true);
  };

  const handleOpenEdit = (patient: Patient) => {
    setEditingPatient(patient);
    setModalError(null);
    setMicrochipWarning(null);
    setForm({
      tutor_id: patient.tutor_id,
      name: patient.name || '',
      species: (patient.species as Species) || 'Canina',
      custom_species: patient.custom_species || '',
      scientific_name: patient.scientific_name || '',
      breed: patient.breed || '',
      gender: (patient.gender as any) || 'Macho',
      approximate_age: patient.approximate_age || '',
      weight_kg: patient.weight_kg || 0,
      coat_color: patient.coat_color || '',
      is_neutered: patient.is_neutered !== undefined ? patient.is_neutered : true,
      microchip: patient.microchip || patient.microchip_number || '',
      microchip_date: patient.microchip_date || '',
      notes: patient.notes || ''
    });
    setTutorMode('EXISTING');
    setShowModal(true);
  };

  const handleSavePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    try {
      if (editingPatient) {
        const updated = await api.updatePatient(editingPatient.id, {
          ...form,
          tutor_id: form.tutor_id
        });
        setPatients((prev) =>
          prev.map((p) => (p.id === editingPatient.id ? { ...p, ...updated, ...form } : p))
        );
        showToast(`Paciente "${form.name}" atualizado com sucesso!`);
      } else {
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
          setTutors((prev) => [createdTutor, ...prev.filter((t) => t.id !== createdTutor.id)]);
        } else {
          const tutorExists = tutors.find((t) => t.id === Number(form.tutor_id));
          if (!tutorExists) {
            throw new Error('Selecione um tutor válido ou cadastre um novo tutor.');
          }
          finalTutorId = tutorExists.id;
        }

        const created = await api.createPatient({
          ...form,
          tutor_id: finalTutorId
        });
        if (created) {
          const tutorObj = tutors.find((t) => t.id === finalTutorId) || newTutor;
          setPatients((prev) => [
            {
              ...created,
              code: created.code || `PAC-${String(created.id).padStart(4, '0')}`,
              tutor_name: tutorObj?.name || 'Tutor',
            },
            ...prev.filter((p) => p.id !== created.id),
          ]);
        }
        showToast(`Paciente "${form.name}" cadastrado com sucesso!`);
      }

      setShowModal(false);
      setEditingPatient(null);
      await loadData(false);
    } catch (err: any) {
      setModalError(err.message || 'Erro ao salvar informações do paciente.');
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
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Paciente</span>
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
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                        #{formatPatientCode(patient)}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 leading-tight">
                        {patient.name}
                      </h3>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
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

              {/* Badges de Acesso Rápido a Anestesias e Exames */}
              {(() => {
                const petAnesthesias = anesthesias.filter((a) => Number(a.patient_id) === Number(patient.id));
                const petExams = exams.filter((e) => Number(e.patient_id) === Number(patient.id));
                return (
                  <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 flex-wrap">
                    {petAnesthesias.length > 0 ? (
                      <Link
                        to={`/anestesia?patient_id=${patient.id}`}
                        className="inline-flex items-center gap-1.5 px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200/80 rounded-lg text-[11px] font-bold transition shadow-2xs"
                        title="Abrir diretamente a ficha anestésica deste animal"
                      >
                        <Heart className="w-3 h-3 text-indigo-600" />
                        <span>💉 {petAnesthesias.length} Ficha{petAnesthesias.length > 1 ? 's' : ''} Anestésica{petAnesthesias.length > 1 ? 's' : ''}</span>
                      </Link>
                    ) : (
                      <Link
                        to={`/anestesia?patient_id=${patient.id}&new=true`}
                        className="inline-flex items-center gap-1 px-2 py-0.5 text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg text-[11px] font-medium transition"
                        title="Iniciar procedimento anestésico para este animal"
                      >
                        <span>+ Anestesia</span>
                      </Link>
                    )}

                    <button
                      type="button"
                      onClick={() => setSelectedPetForExams(patient)}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold transition shadow-2xs cursor-pointer ${
                        petExams.length > 0
                          ? 'bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200/80'
                          : 'bg-slate-50 hover:bg-teal-50 text-slate-600 hover:text-teal-800 border border-slate-200'
                      }`}
                      title="Registrar e consultar exames laboratoriais / de imagem deste pet"
                    >
                      <Microscope className="w-3 h-3 text-teal-600" />
                      <span>Exames ({petExams.length})</span>
                    </button>
                  </div>
                );
              })()}

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs gap-2 flex-wrap">
                <Link
                  to={`/atendimentos?patient_id=${patient.id}`}
                  className="font-semibold text-emerald-700 hover:underline shrink-0"
                >
                  Abrir Prontuário →
                </Link>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setSelectedPetForPrescription(patient)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-850 border border-teal-200 rounded-lg text-xs font-bold transition cursor-pointer shadow-2xs"
                    title="Emitir prescrição médica ou receita rápida diretamente para este paciente"
                  >
                    <Pill className="w-3.5 h-3.5 text-teal-700" />
                    <span>+ Prescrição</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPetForMedicalRecord(patient)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-2xs"
                    title="Exportar Prontuário Completo e Histórico Clínico em PDF (A4)"
                  >
                    <FileText className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Prontuário PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(patient)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
                    title="Editar informações do paciente"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                    <span>Editar</span>
                  </button>
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

      {/* Patient Modal (Create & Edit) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingPatient ? 'Editar Cadastro do Paciente' : 'Novo Paciente'}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingPatient(null);
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

            <form onSubmit={handleSavePatient} className="mt-4 space-y-4">
              {/* Seletor / Cadastro do Tutor */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                    Tutor Responsável *
                  </label>
                  {!editingPatient && tutors.length > 0 && (
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
                          #{formatTutorCode(t)} - {t.name} ({t.city || 'SP'}) {t.phone ? `• ${t.phone}` : ''}
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      {SPECIES_CONFIGS[form.species]?.breedLabel || 'Raça'}
                    </label>
                    <span className="text-[10px] text-slate-400">Sugestões dinâmicas</span>
                  </div>
                  <input
                    type="text"
                    list="species-breed-list"
                    autoComplete="off"
                    placeholder={SPECIES_CONFIGS[form.species]?.breedPlaceholder || 'Selecione ou digite a raça'}
                    value={form.breed}
                    onChange={(e) => setForm({ ...form, breed: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
                  />
                  <datalist id="species-breed-list">
                    {SPECIES_CONFIGS[form.species]?.defaultBreeds?.map((b) => (
                      <option key={b} value={b} />
                    ))}
                  </datalist>

                  {/* Chips rápidos com as raças mais comuns no Brasil */}
                  {SPECIES_CONFIGS[form.species]?.popularBreeds && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {SPECIES_CONFIGS[form.species].popularBreeds!.map((popBreed) => {
                        const label = popBreed === 'Sem Raça Definida (SRD)' ? 'SRD' : popBreed.split(' (')[0];
                        const isSelected = form.breed === popBreed;
                        return (
                          <button
                            key={popBreed}
                            type="button"
                            onClick={() => setForm({ ...form, breed: popBreed })}
                            className={`text-[10px] px-2 py-0.5 rounded-md border transition cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                            title={`Selecionar ${popBreed}`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Sexo</label>
                  <select
                    value={form.gender}
                    onChange={(e) => setForm({ ...form, gender: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none bg-white focus:ring-2 focus:ring-emerald-600"
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
                  onClick={() => {
                    setShowModal(false);
                    setEditingPatient(null);
                  }}
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white transition cursor-pointer"
                >
                  {editingPatient ? 'Salvar Alterações' : 'Salvar Paciente'}
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

      {/* Modal de Prontuário Completo Unificado (A4 / PDF) */}
      <FullMedicalRecordModal
        isOpen={!!selectedPetForMedicalRecord}
        onClose={() => setSelectedPetForMedicalRecord(null)}
        patientId={selectedPetForMedicalRecord?.id || null}
      />

      {/* Modal de Exames Realizados & Laudos do Paciente */}
      {selectedPetForExams && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 overflow-y-auto max-h-[90vh] space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
                  <Microscope className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Exames & Laudos de {selectedPetForExams.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Histórico de exames laboratoriais, bioquímicos e imagens
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedPetForExams(null);
                  setShowNewExamModal(false);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Ações / Novo Exame */}
            {!showNewExamModal ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Exames Registrados ({exams.filter((e) => Number(e.patient_id) === Number(selectedPetForExams.id)).length})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setExamForm({
                        exam_type: 'Hemograma Completo',
                        date: new Date().toISOString().split('T')[0],
                        laboratory: '',
                        status: 'CONCLUIDO',
                        results: '',
                        reference_values: '',
                        price: 0,
                        notes: '',
                        pdf_url: '',
                        pdf_name: '',
                        pdf_size: ''
                      });
                      setShowNewExamModal(true);
                    }}
                    className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                    Registrar Exame Realizado
                  </button>
                </div>

                {exams.filter((e) => Number(e.patient_id) === Number(selectedPetForExams.id)).length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded-2xl space-y-2">
                    <Microscope className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs text-slate-600 font-semibold">
                      Nenhum exame cadastrado para {selectedPetForExams.name} ainda.
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Registre resultados de hemogramas, bioquímica, ultrassonografia, raio-X ou biópsias.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {exams
                      .filter((e) => Number(e.patient_id) === Number(selectedPetForExams.id))
                      .map((exam) => (
                        <div
                          key={exam.id}
                          className="p-4 bg-slate-50/80 border border-slate-200/90 rounded-xl space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-sm">{exam.exam_type}</span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  exam.status === 'CONCLUIDO'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {exam.status}
                              </span>
                            </div>
                            <span className="text-slate-400 font-mono text-[11px]">
                              {exam.date ? new Date(exam.date).toLocaleDateString('pt-BR') : ''}
                            </span>
                          </div>

                          {exam.laboratory && (
                            <p className="text-slate-600 text-[11px]">
                              <strong>Laboratório / Clínica:</strong> {exam.laboratory}
                            </p>
                          )}

                          {exam.pdf_url && (
                            <div className="p-3 bg-teal-50/80 border border-teal-200/90 rounded-xl flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-black text-[10px] border border-rose-200 shrink-0">
                                  PDF
                                </div>
                                <div className="min-w-0">
                                  <span className="font-bold text-xs text-teal-950 block truncate">
                                    Laudo do Laboratório Anexado
                                  </span>
                                  <span className="text-[10px] text-teal-800 font-mono block truncate">
                                    {exam.pdf_name || 'Laudo_Exame.pdf'} {exam.pdf_size ? `• ${exam.pdf_size}` : ''}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setViewingExamPdf({
                                    url: exam.pdf_url!,
                                    title: `${exam.exam_type} - ${selectedPetForExams.name}`,
                                    filename: exam.pdf_name
                                  })}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer"
                                  title="Abrir e visualizar laudo PDF do laboratório"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Visualizar Laudo</span>
                                </button>
                                <a
                                  href={exam.pdf_url}
                                  download={exam.pdf_name || `Laudo_${exam.exam_type}_${selectedPetForExams.name}.pdf`}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition cursor-pointer"
                                  title="Baixar arquivo PDF no dispositivo"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Baixar</span>
                                </a>
                              </div>
                            </div>
                          )}

                          {exam.results && (
                            <div className="bg-white p-3 rounded-lg border border-slate-200 text-slate-800 space-y-1">
                              <span className="font-bold text-[10px] uppercase tracking-wider text-teal-800 block">
                                Laudo / Resultados Obtidos:
                              </span>
                              <p className="whitespace-pre-line text-xs font-mono">{exam.results}</p>
                            </div>
                          )}

                          {exam.reference_values && (
                            <div className="bg-white/60 p-2 rounded-lg border border-slate-200/60 text-slate-600 text-[11px]">
                              <span className="font-semibold block text-slate-500">Valores de Referência:</span>
                              <p className="whitespace-pre-line">{exam.reference_values}</p>
                            </div>
                          )}

                          {exam.notes && (
                            <p className="text-[11px] text-slate-500 italic">
                              Obs: {exam.notes}
                            </p>
                          )}

                          <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between text-[11px] flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              {exam.price ? (
                                <span className="font-bold text-emerald-800 font-mono">
                                  Valor: R$ {exam.price.toFixed(2)}
                                </span>
                              ) : null}

                              {/* WhatsApp Share to Tutor */}
                              {(() => {
                                const petTutor = tutors.find((t) => t.id === selectedPetForExams.tutor_id);
                                const tutorPhone = petTutor?.whatsapp || petTutor?.phone;
                                if (!tutorPhone) return null;
                                const cleanPhone = tutorPhone.replace(/\D/g, '');
                                const text = encodeURIComponent(
                                  `Olá, ${petTutor.name}! Informamos que o resultado do exame de *${exam.exam_type}* do pet *${selectedPetForExams.name}* ${exam.laboratory ? `(Laboratório: ${exam.laboratory})` : ''} já se encontra registrado no prontuário clínico. Qualquer dúvida, estamos à disposição!`
                                );
                                return (
                                  <a
                                    href={`https://wa.me/55${cleanPhone}?text=${text}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-emerald-800 hover:text-emerald-950 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200"
                                    title="Notificar tutor pelo WhatsApp"
                                  >
                                    <Share2 className="w-3 h-3 text-emerald-600" />
                                    <span>Notificar Tutor (WhatsApp)</span>
                                  </a>
                                );
                              })()}
                            </div>

                            <button
                              type="button"
                              onClick={async () => {
                                if (confirm('Deseja excluir este registro de exame?')) {
                                  await api.deletePatientExam(exam.id);
                                  setExams((prev) => prev.filter((ex) => ex.id !== exam.id));
                                  showToast('Exame removido com sucesso.');
                                }
                              }}
                              className="text-rose-600 hover:text-rose-800 font-medium cursor-pointer"
                            >
                              Excluir Exame
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            ) : (
              /* Formulário de Novo Exame */
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    const created = await api.createPatientExam({
                      ...examForm,
                      patient_id: selectedPetForExams.id,
                      patient_name: selectedPetForExams.name,
                      tutor_id: selectedPetForExams.tutor_id,
                      tutor_name: tutors.find((t) => t.id === selectedPetForExams.tutor_id)?.name
                    });

                    // Se foi informado valor monetário, cria lançamento no financeiro
                    if (Number(examForm.price) > 0) {
                      await api.createFinancialEntry({
                        entry_type: 'RECEITA',
                        category: 'Exames & Diagnóstico',
                        description: `Exame: ${examForm.exam_type} - ${selectedPetForExams.name}`,
                        amount: Number(examForm.price),
                        payment_method: 'PIX',
                        status: 'PAGO',
                        date: examForm.date,
                        tutor_id: selectedPetForExams.tutor_id,
                        tutor_name: tutors.find((t) => t.id === selectedPetForExams.tutor_id)?.name,
                        patient_id: selectedPetForExams.id,
                        patient_name: selectedPetForExams.name
                      }).catch(() => {});
                    }

                    setExams((prev) => [created, ...prev]);
                    setShowNewExamModal(false);
                    setExamForm({
                      exam_type: 'Hemograma Completo',
                      date: new Date().toISOString().split('T')[0],
                      laboratory: '',
                      status: 'CONCLUIDO',
                      results: '',
                      reference_values: '',
                      price: 0,
                      notes: '',
                      pdf_url: '',
                      pdf_name: '',
                      pdf_size: ''
                    });
                    showToast(`Exame "${examForm.exam_type}" registrado com sucesso!`);
                  } catch (err) {
                    console.error('Erro ao salvar exame:', err);
                  }
                }}
                className="space-y-4 text-xs"
              >
                <div className="p-3 bg-teal-50 rounded-xl border border-teal-200/80">
                  <span className="text-[11px] font-bold text-teal-800 block mb-2">
                    Modelos Rápidos de Exames Frequentes:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'Hemograma Completo',
                      'Bioquímica Renal (Ureia + Creatinina)',
                      'Bioquímica Hepática (ALT + FA)',
                      'Ultrassonografia Abdominal',
                      'Radiografia Digital',
                      'Urinálise Completa (EAS)',
                      'Coproparasitológico',
                      'Citologia / Biópsia',
                      'Eletrocardiograma (ECG)'
                    ].map((model) => (
                      <button
                        key={model}
                        type="button"
                        onClick={() => setExamForm({ ...examForm, exam_type: model })}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition border ${
                          examForm.exam_type === model
                            ? 'bg-teal-700 text-white border-teal-800'
                            : 'bg-white text-slate-700 border-teal-200 hover:bg-teal-100'
                        }`}
                      >
                        {model}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Tipo de Exame *</label>
                    <input
                      type="text"
                      required
                      value={examForm.exam_type}
                      onChange={(e) => setExamForm({ ...examForm, exam_type: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none font-medium focus:border-teal-600"
                      placeholder="Ex: Hemograma, Perfil Renal, etc."
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Data da Coleta/Realização *</label>
                    <input
                      type="date"
                      required
                      value={examForm.date}
                      onChange={(e) => setExamForm({ ...examForm, date: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none font-medium focus:border-teal-600"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Laboratório / Clínica Executante</label>
                    <input
                      type="text"
                      value={examForm.laboratory}
                      onChange={(e) => setExamForm({ ...examForm, laboratory: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none font-medium focus:border-teal-600"
                      placeholder="Ex: LabVet Central, Atendimento Volante..."
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Status do Exame</label>
                    <select
                      value={examForm.status}
                      onChange={(e) => setExamForm({ ...examForm, status: e.target.value as any })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none font-medium bg-white focus:border-teal-600"
                    >
                      <option value="CONCLUIDO">Concluído (Laudado)</option>
                      <option value="COLETADO">Coletado / Em Análise</option>
                      <option value="SOLICITADO">Solicitado / Aguardando Coleta</option>
                    </select>
                  </div>
                </div>

                {/* Seção de Anexo do Laudo em PDF (Recebido do Laboratório) */}
                <div className="p-3.5 bg-teal-50/70 border-2 border-dashed border-teal-300 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-teal-900 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-teal-700" />
                      Anexar Laudo do Laboratório em PDF (.pdf)
                    </span>
                    {examForm.pdf_url && (
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        PDF Pronto ({examForm.pdf_size})
                      </span>
                    )}
                  </div>

                  {examForm.pdf_url ? (
                    <div className="p-3 bg-white border border-teal-200 rounded-xl flex items-center justify-between gap-3 shadow-2xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-black text-xs border border-rose-200 shrink-0">
                          PDF
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-xs text-slate-900 block truncate">
                            {examForm.pdf_name}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {examForm.pdf_size} • Pronto para arquivar no prontuário
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setViewingExamPdf({
                            url: examForm.pdf_url,
                            title: examForm.exam_type,
                            filename: examForm.pdf_name
                          })}
                          className="px-2.5 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-50 rounded-lg border border-teal-200 transition cursor-pointer"
                        >
                          Pré-visualizar
                        </button>
                        <button
                          type="button"
                          onClick={() => setExamForm((prev) => ({ ...prev, pdf_url: '', pdf_name: '', pdf_size: '' }))}
                          className="p-1 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                          title="Remover anexo PDF"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="flex flex-col items-center justify-center p-4 bg-white rounded-xl border border-slate-200 hover:border-teal-400 hover:bg-teal-50/30 transition cursor-pointer text-center space-y-1">
                        <UploadCloud className="w-7 h-7 text-teal-600" />
                        <span className="text-xs font-bold text-slate-800">
                          Clique para selecionar o PDF do exame recebido do laboratório
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Suporta laudos laboratoriais, hemogramas, bioquímicas, citologia e laudos de imagem (.pdf)
                        </span>
                        <input
                          type="file"
                          accept="application/pdf,.pdf"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
                                alert('Por favor, selecione apenas arquivos em formato PDF (.pdf).');
                                return;
                              }
                              const reader = new FileReader();
                              reader.onload = (ev) => {
                                const base64Data = ev.target?.result as string;
                                setExamForm((prev) => ({
                                  ...prev,
                                  pdf_url: base64Data,
                                  pdf_name: file.name,
                                  pdf_size: `${(file.size / 1024).toFixed(1)} KB`
                                }));
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Laudo / Resultados Encontrados (Valores e Achados Clínicos)
                  </label>
                  <textarea
                    rows={4}
                    value={examForm.results}
                    onChange={(e) => setExamForm({ ...examForm, results: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none font-mono text-xs focus:border-teal-600"
                    placeholder="Ex: Hemácias: 6.8 M/uL (Ref: 5.5-8.5)&#10;Leucócitos Totais: 11.200 /uL&#10;Ureia: 42 mg/dL (Ref: 20-56)&#10;Creatinina: 1.1 mg/dL (Ref: 0.5-1.5)&#10;Achados ultrassonográficos: Bexiga com conteúdo anecóico..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Valor Cobrado ao Tutor (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={examForm.price}
                      onChange={(e) => setExamForm({ ...examForm, price: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none font-mono focus:border-teal-600"
                      placeholder="0.00"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Se maior que R$ 0,00, gerará receita automática no financeiro.
                    </span>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Observações Gerais</label>
                    <input
                      type="text"
                      value={examForm.notes}
                      onChange={(e) => setExamForm({ ...examForm, notes: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-teal-600"
                      placeholder="Instruções para o tutor, repetição de exame..."
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowNewExamModal(false)}
                    className="px-4 py-2 text-slate-600 font-semibold hover:bg-slate-100 rounded-lg transition cursor-pointer"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-teal-700 text-white font-bold rounded-lg hover:bg-teal-800 transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Salvar Exame no Prontuário
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal de Pré-visualização de Laudo em PDF */}
      {viewingExamPdf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-4xl w-full h-[90vh] p-4 sm:p-6 shadow-2xl border border-slate-200 flex flex-col space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-black text-xs border border-rose-200">
                  PDF
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {viewingExamPdf.title}
                  </h3>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {viewingExamPdf.filename || 'Laudo_Laboratorio.pdf'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={viewingExamPdf.url}
                  download={viewingExamPdf.filename || `${viewingExamPdf.title}.pdf`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar PDF</span>
                </a>
                <button
                  type="button"
                  onClick={() => setViewingExamPdf(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-100 rounded-2xl overflow-hidden border border-slate-200">
              <iframe
                src={viewingExamPdf.url}
                title={viewingExamPdf.title}
                className="w-full h-full border-0"
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal de Emissão Direta de Prescrição */}
      {selectedPetForPrescription && (
        <DirectPrescriptionModal
          isOpen={Boolean(selectedPetForPrescription)}
          onClose={() => setSelectedPetForPrescription(null)}
          patient={selectedPetForPrescription}
          tutor={tutors.find((t) => t.id === selectedPetForPrescription.tutor_id) || null}
          onPrescriptionSaved={() => {
            showToast(`Prescrição emitida e arquivada no prontuário de ${selectedPetForPrescription.name}!`);
          }}
        />
      )}
    </div>
  );
};
