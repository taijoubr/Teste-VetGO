import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  Syringe,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Printer,
  Download,
  Share2,
  Copy,
  Check,
  Plus,
  Trash2,
  X,
  ExternalLink,
  QrCode,
  PawPrint,
  User,
  Building2,
  Bug,
  Sparkles
} from 'lucide-react';
import { Patient, Tutor, VaccineRecord, ParasiteControlRecord } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { printElement, exportToPdf } from '../utils/printHelper';
import { formatPatientCode } from '../utils/formatters';

interface VaccinationBookletModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient | null;
  tutor?: Tutor | null;
  onRefresh?: () => void;
}

const COMMON_CANINE_VACCINES = [
  'V10 Múltipla Canina (Déctupla)',
  'V8 Múltipla Canina (Óctupla)',
  'Antirrábica Canina',
  'Gripe Canina / Tosse dos Canis (Bordetella)',
  'Giárdia Canina',
  'Leishmaniose (LeishTec)',
  'V12 Canina'
];

const COMMON_FELINE_VACCINES = [
  'V5 Quíntupla Felina (FeLV)',
  'V4 Quádrupla Felina',
  'V3 Tríplice Felina',
  'Antirrábica Felina'
];

const COMMON_MANUFACTURERS = [
  'Zoetis',
  'Boehringer Ingelheim',
  'MSD Saúde Animal',
  'Dechra',
  'Biovet',
  'Virbac',
  'Ceva Saúde Animal',
  'Outro'
];

const COMMON_PARASITE_PRODUCTS = [
  { name: 'Simparic (Antipulgas e Carrapatos)', type: 'ECTOPARASITA' as const, intervalDays: 35 },
  { name: 'Bravecto (Antipulgas e Carrapatos)', type: 'ECTOPARASITA' as const, intervalDays: 90 },
  { name: 'Nexgard / Nexgard Spectra', type: 'ECTOPARASITA' as const, intervalDays: 30 },
  { name: 'Drontal Plus (Vermífugo cães)', type: 'VERMIFUGO' as const, intervalDays: 90 },
  { name: 'Milbemax (Vermífugo cães/gatos)', type: 'VERMIFUGO' as const, intervalDays: 90 },
  { name: 'Endogard (Vermífugo completo)', type: 'VERMIFUGO' as const, intervalDays: 90 },
  { name: 'Credelio (Antipulgas e Carrapatos)', type: 'ECTOPARASITA' as const, intervalDays: 30 },
  { name: 'Revolution (Selamectina gatos/cães)', type: 'ECTOPARASITA' as const, intervalDays: 30 },
];

export const VaccinationBookletModal: React.FC<VaccinationBookletModalProps> = ({
  isOpen,
  onClose,
  patient,
  tutor,
  onRefresh,
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'VACCINES' | 'PARASITES' | 'ADD_VACCINE' | 'ADD_PARASITE'>('VACCINES');
  const [vaccines, setVaccines] = useState<VaccineRecord[]>([]);
  const [parasites, setParasites] = useState<ParasiteControlRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Form New Vaccine
  const [vacName, setVacName] = useState(COMMON_CANINE_VACCINES[0]);
  const [customVacName, setCustomVacName] = useState('');
  const [vacManufacturer, setVacManufacturer] = useState(COMMON_MANUFACTURERS[0]);
  const [vacBatch, setVacBatch] = useState('');
  const [vacAppDate, setVacAppDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [vacBoosterDate, setVacBoosterDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
  });
  const [vacRoute, setVacRoute] = useState('Subcutânea');

  // Form New Parasite Control
  const [parProduct, setParProduct] = useState(COMMON_PARASITE_PRODUCTS[0].name);
  const [parType, setParType] = useState<'VERMIFUGO' | 'ECTOPARASITA'>('ECTOPARASITA');
  const [parAppDate, setParAppDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [parNextDate, setParNextDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 35);
    return d.toISOString().split('T')[0];
  });
  const [parWeight, setParWeight] = useState('');
  const [parNotes, setParNotes] = useState('');

  const cardUrl = patient ? `${window.location.origin}/carteirinha/${patient.id}` : '';

  useEffect(() => {
    if (!isOpen || !patient) return;

    // Load QR Code
    if (cardUrl) {
      QRCode.toDataURL(cardUrl, {
        width: 320,
        margin: 1,
        color: { dark: '#064e3b', light: '#ffffff' },
      }).then(setQrCodeUrl).catch(() => {});
    }

    loadData();
  }, [isOpen, patient, cardUrl]);

  const loadData = async () => {
    if (!patient) return;
    setLoading(true);
    try {
      // 1. Load vaccines from patient record, local cache, and consultations
      const storageKey = `vetgo_patient_vaccines_${patient.id}`;
      let customVaccines: VaccineRecord[] = Array.isArray(patient.vaccines) ? [...patient.vaccines] : [];
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) customVaccines = [...customVaccines, ...parsed];
        }
      } catch {}

      let consultVaccines: VaccineRecord[] = [];
      try {
        const consults = await api.getConsultations();
        const patientConsults = consults.filter((c: any) => Number(c.patient_id) === Number(patient.id));
        patientConsults.forEach((c) => {
          if (Array.isArray(c.vaccines)) {
            consultVaccines.push(...c.vaccines);
          }
        });
      } catch {}

      const vMap = new Map<string, VaccineRecord>();
      [...consultVaccines, ...customVaccines].forEach((v) => {
        if (v && v.id) vMap.set(v.id, v);
      });
      const sortedVac = Array.from(vMap.values()).sort(
        (a, b) => new Date(b.application_date || 0).getTime() - new Date(a.application_date || 0).getTime()
      );
      setVaccines(sortedVac);

      // 2. Load parasite controls from patient record and local cache
      const parKey = `vetgo_patient_parasites_${patient.id}`;
      const pMap = new Map<string, ParasiteControlRecord>();
      if (Array.isArray(patient.parasite_controls)) {
        patient.parasite_controls.forEach((p) => {
          if (p && p.id) pMap.set(p.id, p);
        });
      }
      try {
        const raw = localStorage.getItem(parKey);
        if (raw) {
          const parsed: ParasiteControlRecord[] = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            parsed.forEach((p) => {
              if (p && p.id) pMap.set(p.id, p);
            });
          }
        }
      } catch {}
      setParasites(
        Array.from(pMap.values()).sort(
          (a, b) => new Date(b.application_date || 0).getTime() - new Date(a.application_date || 0).getTime()
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSaveVaccine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient) return;

    const finalName = vacName === 'Outra Vacina' ? (customVacName.trim() || 'Vacina Veterinária') : vacName;
    const newVac: VaccineRecord = {
      id: `vac_${Date.now()}`,
      vaccine_name: finalName,
      manufacturer: vacManufacturer,
      batch_number: vacBatch.trim() || `L-${Math.floor(100000 + Math.random() * 900000)}`,
      application_date: vacAppDate,
      next_booster_date: vacBoosterDate,
      route: vacRoute,
      applied_by: user ? `Dra./Dr. ${user.first_name} ${user.last_name || ''} (CRMV-${user.crmv_uf || 'SP'} ${user.crmv || ''})` : 'Médico Veterinário'
    };

    const storageKey = `vetgo_patient_vaccines_${patient.id}`;
    const nextList = [newVac, ...vaccines];
    setVaccines(nextList);
    try {
      localStorage.setItem(storageKey, JSON.stringify(nextList));
    } catch {}
    api.updatePatient(patient.id, { vaccines: nextList }).catch(() => {});

    setActiveTab('VACCINES');
    if (onRefresh) onRefresh();
  };

  const handleDeleteVaccine = async (vacId: string) => {
    if (!patient || !window.confirm('Deseja realmente remover este registro de vacina?')) return;
    const storageKey = `vetgo_patient_vaccines_${patient.id}`;
    const nextList = vaccines.filter(v => v.id !== vacId);
    setVaccines(nextList);
    try {
      localStorage.setItem(storageKey, JSON.stringify(nextList));
    } catch {}
    api.updatePatient(patient.id, { vaccines: nextList }).catch(() => {});
    if (onRefresh) onRefresh();
  };

  const handleSaveParasite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient) return;

    const newPar: ParasiteControlRecord = {
      id: `par_${Date.now()}`,
      type: parType,
      product_name: parProduct,
      application_date: parAppDate,
      next_dose_date: parNextDate,
      weight_at_application: parWeight ? `${parWeight} kg` : (patient.weight_kg ? `${patient.weight_kg} kg` : undefined),
      notes: parNotes.trim() || undefined,
      applied_by: user ? `CRMV-${user.crmv_uf || 'SP'} ${user.crmv || ''}` : 'Clínica'
    };

    const parKey = `vetgo_patient_parasites_${patient.id}`;
    const nextList = [newPar, ...parasites];
    setParasites(nextList);
    try {
      localStorage.setItem(parKey, JSON.stringify(nextList));
    } catch {}
    api.updatePatient(patient.id, { parasite_controls: nextList }).catch(() => {});

    setActiveTab('PARASITES');
    if (onRefresh) onRefresh();
  };

  const handleDeleteParasite = async (parId: string) => {
    if (!patient || !window.confirm('Remover este registro de controle sanitário?')) return;
    const parKey = `vetgo_patient_parasites_${patient.id}`;
    const nextList = parasites.filter(p => p.id !== parId);
    setParasites(nextList);
    try {
      localStorage.setItem(parKey, JSON.stringify(nextList));
    } catch {}
    api.updatePatient(patient.id, { parasite_controls: nextList }).catch(() => {});
    if (onRefresh) onRefresh();
  };

  const handleQuickBoosterDays = (days: number) => {
    const baseStr = vacAppDate || new Date().toISOString().split('T')[0];
    const d = new Date(baseStr + 'T12:00:00');
    d.setDate(d.getDate() + days);
    setVacBoosterDate(d.toISOString().split('T')[0]);
  };

  const handleCopyLink = () => {
    if (!cardUrl) return;
    navigator.clipboard.writeText(cardUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleShareWhatsApp = () => {
    if (!patient) return;
    const phone = tutor?.phone || (tutor as any)?.whatsapp || '';
    const cleanPhone = phone.replace(/\D/g, '');
    const phoneParam = cleanPhone ? `55${cleanPhone}` : '';

    const nextDue = vaccines.find(v => new Date(v.next_booster_date).getTime() >= Date.now());

    const text = encodeURIComponent(
      `Olá ${tutor?.name ? tutor.name.split(' ')[0] : 'Tutor'}! 🐾\n\n` +
      `Aqui está a *Carteira de Vacinação Oficial* atualizada do(a) *${patient.name}* emitida por *${user?.clinic_name || `Dra./Dr. ${user?.first_name || 'Veterinário'}`}*:\n\n` +
      `📋 *Prontuário:* #${formatPatientCode(patient)}\n` +
      `💉 *Total de doses registradas:* ${vaccines.length}\n` +
      (nextDue ? `⏰ *Próximo reforço previsto:* ${new Date(nextDue.next_booster_date).toLocaleDateString('pt-BR')} (${nextDue.vaccine_name})\n\n` : '\n') +
      `📱 *Acesse a carteirinha oficial completa no celular:*\n` +
      `${cardUrl}\n\n` +
      `Guarde este link para conferir sempre que precisar comprovar as vacinas do pet em viagens, hotéis e clínicas!`
    );

    window.open(`https://wa.me/${phoneParam}?text=${text}`, '_blank');
  };

  if (!isOpen || !patient) return null;

  const isFeline = patient.species?.toLowerCase().includes('gat') || patient.species?.toLowerCase().includes('felin');
  const vaccinePresets = isFeline ? COMMON_FELINE_VACCINES : COMMON_CANINE_VACCINES;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-3 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6 animate-fade-in flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-amber-300 shrink-0 border border-white/20">
              <Syringe className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold bg-white/20 px-2 py-0.5 rounded-full">
                  #{formatPatientCode(patient)}
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-200">
                  Documento Oficial de Vacinação
                </span>
              </div>
              <h3 className="text-lg font-black leading-tight mt-0.5">
                Carteira de Vacinação • {patient.name}
              </h3>
              <p className="text-emerald-100 text-xs mt-0.5">
                {patient.species} • {patient.breed || 'SRD'} • Tutor: {tutor?.name || 'Tutor cadastrado'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => printElement('printable-vaccine-booklet', `Carteira_Vacinacao_${patient.name}`)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-emerald-900 rounded-xl text-xs font-bold hover:bg-emerald-50 transition shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir A4</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-white/80 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('VACCINES')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'VACCINES'
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
              }`}
            >
              <Syringe className="w-3.5 h-3.5" />
              <span>Vacinas ({vaccines.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('PARASITES')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'PARASITES'
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
              }`}
            >
              <Bug className="w-3.5 h-3.5" />
              <span>Vermífugos & Antipulgas ({parasites.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('ADD_VACCINE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition ${
                activeTab === 'ADD_VACCINE'
                  ? 'bg-emerald-800 text-white'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Nova Vacina</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ADD_PARASITE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition ${
                activeTab === 'ADD_PARASITE'
                  ? 'bg-emerald-800 text-white'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Controle Parasitário</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB: ADD NEW VACCINE */}
          {activeTab === 'ADD_VACCINE' && (
            <form onSubmit={handleSaveVaccine} className="p-4 sm:p-5 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
                  <Syringe className="w-4 h-4 text-emerald-700" />
                  Registrar Nova Aplicação de Vacina
                </h4>
                <button
                  type="button"
                  onClick={() => setActiveTab('VACCINES')}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  Cancelar
                </button>
              </div>

              {/* Vaccine presets */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Vacina Aplicada *
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {vaccinePresets.map((vp) => (
                    <button
                      key={vp}
                      type="button"
                      onClick={() => setVacName(vp)}
                      className={`px-2.5 py-1 text-xs rounded-lg font-medium transition cursor-pointer ${
                        vacName === vp
                          ? 'bg-emerald-700 text-white shadow-2xs font-bold'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {vp}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setVacName('Outra Vacina')}
                    className={`px-2.5 py-1 text-xs rounded-lg font-medium transition cursor-pointer ${
                      vacName === 'Outra Vacina'
                        ? 'bg-emerald-700 text-white shadow-2xs font-bold'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    + Outra Vacina
                  </button>
                </div>

                {vacName === 'Outra Vacina' && (
                  <input
                    type="text"
                    required
                    placeholder="Digite o nome da vacina..."
                    value={customVacName}
                    onChange={(e) => setCustomVacName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg outline-none"
                  />
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Fabricante</label>
                  <select
                    value={vacManufacturer}
                    onChange={(e) => setVacManufacturer(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg outline-none"
                  >
                    {COMMON_MANUFACTURERS.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Lote / Número de Série</label>
                  <input
                    type="text"
                    placeholder="Ex: L-849201"
                    value={vacBatch}
                    onChange={(e) => setVacBatch(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Via de Administração</label>
                  <select
                    value={vacRoute}
                    onChange={(e) => setVacRoute(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg outline-none"
                  >
                    <option value="Subcutânea">Subcutânea (SC)</option>
                    <option value="Intramuscular">Intramuscular (IM)</option>
                    <option value="Intranasal">Intranasal (IN)</option>
                    <option value="Oral">Oral</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-white rounded-xl border border-emerald-100">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Data da Aplicação *</label>
                  <input
                    type="date"
                    required
                    value={vacAppDate}
                    onChange={(e) => setVacAppDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">Data do Próximo Reforço *</label>
                    <div className="flex items-center gap-1 text-[10px]">
                      <button
                        type="button"
                        onClick={() => handleQuickBoosterDays(365)}
                        className="text-emerald-700 font-bold hover:underline cursor-pointer"
                      >
                        +1 ano
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={() => handleQuickBoosterDays(30)}
                        className="text-emerald-700 font-bold hover:underline cursor-pointer"
                      >
                        +30 dias
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={() => handleQuickBoosterDays(21)}
                        className="text-emerald-700 font-bold hover:underline cursor-pointer"
                      >
                        +21 dias
                      </button>
                    </div>
                  </div>
                  <input
                    type="date"
                    required
                    value={vacBoosterDate}
                    onChange={(e) => setVacBoosterDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none font-bold text-emerald-800"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('VACCINES')}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-emerald-700 text-white rounded-xl hover:bg-emerald-800 transition shadow-2xs flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Salvar na Carteira</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB: ADD NEW PARASITE CONTROL */}
          {activeTab === 'ADD_PARASITE' && (
            <form onSubmit={handleSaveParasite} className="p-4 sm:p-5 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
                  <Bug className="w-4 h-4 text-emerald-700" />
                  Registrar Desparasitação ou Ectoparasiticida (Antipulgas)
                </h4>
                <button
                  type="button"
                  onClick={() => setActiveTab('PARASITES')}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  Cancelar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de Controle *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setParType('ECTOPARASITA')}
                      className={`p-2 text-xs rounded-xl font-bold border transition ${
                        parType === 'ECTOPARASITA'
                          ? 'bg-emerald-700 text-white border-emerald-700'
                          : 'bg-white text-slate-600 border-slate-200'
                      }`}
                    >
                      Antipulgas & Carrapatos
                    </button>
                    <button
                      type="button"
                      onClick={() => setParType('VERMIFUGO')}
                      className={`p-2 text-xs rounded-xl font-bold border transition ${
                        parType === 'VERMIFUGO'
                          ? 'bg-emerald-700 text-white border-emerald-700'
                          : 'bg-white text-slate-600 border-slate-200'
                      }`}
                    >
                      Vermífugo (Endoparasitas)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Produto Utilizado *</label>
                  <select
                    value={parProduct}
                    onChange={(e) => {
                      const val = e.target.value;
                      setParProduct(val);
                      const found = COMMON_PARASITE_PRODUCTS.find(p => p.name === val);
                      if (found) {
                        setParType(found.type);
                        const d = new Date(parAppDate || new Date());
                        d.setDate(d.getDate() + found.intervalDays);
                        setParNextDate(d.toISOString().split('T')[0]);
                      }
                    }}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg outline-none"
                  >
                    {COMMON_PARASITE_PRODUCTS.map((p) => (
                      <option key={p.name} value={p.name}>{p.name}</option>
                    ))}
                    <option value="Outro Produto">Outro Produto</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Data da Administração *</label>
                  <input
                    type="date"
                    required
                    value={parAppDate}
                    onChange={(e) => setParAppDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Próxima Administração Prevista *</label>
                  <input
                    type="date"
                    required
                    value={parNextDate}
                    onChange={(e) => setParNextDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg outline-none font-bold text-emerald-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Peso no Momento (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder={patient.weight_kg ? String(patient.weight_kg) : 'Ex: 12.5'}
                    value={parWeight}
                    onChange={(e) => setParWeight(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Observações do Veterinário</label>
                <input
                  type="text"
                  placeholder="Ex: Dose administrada em jejum / Repetir após 15 dias"
                  value={parNotes}
                  onChange={(e) => setParNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('PARASITES')}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-emerald-700 text-white rounded-xl hover:bg-emerald-800 transition shadow-2xs flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Salvar Registro</span>
                </button>
              </div>
            </form>
          )}

          {/* PRINTABLE OFFICIAL VACCINE BOOKLET (A4 Clean View) */}
          <div
            id="printable-vaccine-booklet"
            className="p-5 sm:p-7 bg-white rounded-2xl border border-slate-200/90 shadow-xs space-y-6 text-slate-900"
          >
            {/* Header Documento Oficial */}
            <div className="border-b-2 border-emerald-800 pb-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 text-center sm:text-left">
                {user?.logo_url ? (
                  <img src={user.logo_url} alt="Logo" className="w-14 h-14 object-contain rounded-xl border border-slate-200" />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-emerald-800 text-white flex items-center justify-center font-bold text-xl">
                    V
                  </div>
                )}
                <div>
                  <h2 className="text-base font-black text-emerald-950 uppercase tracking-tight">
                    {user?.clinic_name || `${user?.first_name || 'Clínica'} ${user?.last_name || 'Veterinária'}`}
                  </h2>
                  <p className="text-xs font-semibold text-emerald-800">
                    Controle Sanitário & Carteira de Vacinação Oficial
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Médico(a) Veterinário(a) • CRMV-{user?.crmv_uf || 'SP'} {user?.crmv || '—'}
                  </p>
                </div>
              </div>

              {/* QR Code de Autenticidade */}
              {qrCodeUrl && (
                <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200 text-center shrink-0">
                  <img src={qrCodeUrl} alt="QR Code" className="w-16 h-16 rounded" />
                  <div className="text-left text-[10px] text-slate-500 leading-tight">
                    <strong className="text-emerald-900 block font-bold">Verificação Online:</strong>
                    <span>Aponte a câmera</span><br />
                    <span>para autenticar</span>
                  </div>
                </div>
              )}
            </div>

            {/* Identificação do Paciente & Tutor */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
              <div>
                <span className="text-slate-500 block text-[10px] font-semibold uppercase">Paciente</span>
                <span className="font-bold text-slate-900">{patient.name}</span>
                <span className="text-[10px] text-slate-500 block font-mono">#{formatPatientCode(patient)}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] font-semibold uppercase">Espécie / Raça</span>
                <span className="font-semibold text-slate-800">{patient.species}</span>
                <span className="text-[11px] text-slate-600 block">{patient.breed || 'SRD'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] font-semibold uppercase">Sexo / Idade</span>
                <span className="font-semibold text-slate-800">{patient.gender || 'Não inf.'}</span>
                <span className="text-[11px] text-slate-600 block">{patient.approximate_age || 'Idade n/i'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] font-semibold uppercase">Tutor Responsável</span>
                <span className="font-bold text-slate-900 truncate block">{tutor?.name || 'Tutor Cadastrado'}</span>
                <span className="text-[10px] text-slate-500 font-mono">{tutor?.phone || 'Telefone n/i'}</span>
              </div>
            </div>

            {/* SEÇÃO 1: VACINAS APLICADAS */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Syringe className="w-4 h-4 text-emerald-700" />
                  Imunizações & Vacinas Aplicadas
                </h4>
                <span className="text-[11px] font-semibold text-slate-500">
                  {vaccines.length} aplicação(ões) registrada(s)
                </span>
              </div>

              {vaccines.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl text-xs text-slate-400">
                  Nenhuma vacina registrada para este paciente ainda. Clique em "+ Nova Vacina" acima para registrar.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                    <thead className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                      <tr>
                        <th className="p-2.5">Vacina / Imunizante</th>
                        <th className="p-2.5">Data Aplicação</th>
                        <th className="p-2.5">Próximo Reforço</th>
                        <th className="p-2.5">Lote / Fabricante</th>
                        <th className="p-2.5">Status</th>
                        <th className="p-2.5 text-right no-print">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {vaccines.map((v) => {
                        const now = new Date().setHours(0, 0, 0, 0);
                        const boosterTime = new Date(v.next_booster_date).setHours(0, 0, 0, 0);
                        const isOverdue = boosterTime < now;
                        const isNear = boosterTime >= now && boosterTime - now <= 30 * 24 * 60 * 60 * 1000;

                        return (
                          <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-2.5 font-bold text-slate-900">
                              <div className="flex items-center gap-1.5">
                                <span>{v.vaccine_name}</span>
                              </div>
                              <span className="text-[10px] text-slate-500 block font-normal">
                                Via: {v.route || 'Subcutânea'}
                              </span>
                            </td>
                            <td className="p-2.5 text-slate-700">
                              {new Date(v.application_date).toLocaleDateString('pt-BR')}
                            </td>
                            <td className="p-2.5 font-bold text-slate-900">
                              {new Date(v.next_booster_date).toLocaleDateString('pt-BR')}
                            </td>
                            <td className="p-2.5 text-slate-600 font-mono text-[11px]">
                              <div>{v.batch_number || '—'}</div>
                              {v.manufacturer && <span className="text-[10px] text-slate-400 font-sans block">{v.manufacturer}</span>}
                            </td>
                            <td className="p-2.5">
                              {isOverdue ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                  <AlertTriangle className="w-3 h-3" />
                                  Vencida
                                </span>
                              ) : isNear ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                  <Clock className="w-3 h-3" />
                                  Vence em breve
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Em dia
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 text-right no-print">
                              <button
                                type="button"
                                onClick={() => handleDeleteVaccine(v.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                                title="Excluir vacina"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* SEÇÃO 2: VERMIFUGAÇÃO & ECTOPARASITAS */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Bug className="w-4 h-4 text-emerald-700" />
                  Controle de Endoparasitas & Ectoparasitas (Vermífugos / Antipulgas)
                </h4>
                <span className="text-[11px] font-semibold text-slate-500">
                  {parasites.length} registro(s)
                </span>
              </div>

              {parasites.length === 0 ? (
                <div className="text-center py-4 border border-dashed border-slate-200 rounded-xl text-xs text-slate-400">
                  Nenhum registro de vermifugação ou antipulgas lançado. Clique em "+ Controle Parasitário" para registrar.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                    <thead className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                      <tr>
                        <th className="p-2.5">Produto / Tipo</th>
                        <th className="p-2.5">Administração</th>
                        <th className="p-2.5">Próxima Dose</th>
                        <th className="p-2.5">Peso / Observações</th>
                        <th className="p-2.5 text-right no-print">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parasites.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-2.5 font-bold text-slate-900">
                            <div>{p.product_name}</div>
                            <span className="text-[10px] text-emerald-700 font-semibold block">
                              {p.type === 'ECTOPARASITA' ? 'Antipulgas e Carrapatos' : 'Vermífugo Interno'}
                            </span>
                          </td>
                          <td className="p-2.5 text-slate-700">
                            {new Date(p.application_date).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="p-2.5 font-bold text-slate-900">
                            {new Date(p.next_dose_date).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="p-2.5 text-slate-600 text-[11px]">
                            {p.weight_at_application && <span className="font-semibold mr-1">{p.weight_at_application} •</span>}
                            <span>{p.notes || '—'}</span>
                          </td>
                          <td className="p-2.5 text-right no-print">
                            <button
                              type="button"
                              onClick={() => handleDeleteParasite(p.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                              title="Remover"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Rodapé do Documento com Assinatura & Carimbo Digital */}
            <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
              <div className="text-center sm:text-left space-y-0.5">
                <span className="font-bold text-slate-800 block">Certificação Sanitária Veterinária</span>
                <p className="text-[11px] text-slate-500">
                  Emitido via sistema Vetgo em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              <div className="text-center sm:text-right border-t sm:border-t-0 sm:border-l border-slate-200 pt-3 sm:pt-0 sm:pl-6 space-y-1">
                {user?.signature_url ? (
                  <img src={user.signature_url} alt="Assinatura" className="h-10 mx-auto sm:ml-auto object-contain" />
                ) : (
                  <div className="w-40 border-b border-slate-400 mx-auto sm:ml-auto h-6"></div>
                )}
                <span className="font-bold text-slate-900 block text-xs">
                  {user?.first_name ? `Dra./Dr. ${user.first_name} ${user.last_name || ''}` : 'Médico(a) Veterinário(a)'}
                </span>
                <span className="text-[11px] text-slate-500 block font-mono">
                  CRMV-{user?.crmv_uf || 'SP'} {user?.crmv || '—'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition shadow-2xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Link Copiado!' : 'Copiar Link'}</span>
            </button>
            <a
              href={cardUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition shadow-2xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Ver Online</span>
            </a>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#25D366] text-white rounded-xl text-xs font-bold hover:bg-[#20bd5a] transition shadow-2xs cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Enviar no WhatsApp</span>
            </button>
            <button
              type="button"
              disabled={isDownloadingPdf}
              onClick={async () => {
                if (isDownloadingPdf) return;
                setIsDownloadingPdf(true);
                try {
                  const ok = await exportToPdf('printable-vaccine-booklet', `Carteira_Vacinacao_${patient.name}`);
                  if (!ok) {
                    printElement('printable-vaccine-booklet', `Carteira_Vacinacao_${patient.name}`);
                  }
                } finally {
                  setIsDownloadingPdf(false);
                }
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 disabled:opacity-60 transition shadow-2xs cursor-pointer"
            >
              <Download className={`w-3.5 h-3.5 ${isDownloadingPdf ? 'animate-bounce' : ''}`} />
              <span>{isDownloadingPdf ? 'Gerando PDF...' : 'Baixar PDF'}</span>
            </button>
            <button
              type="button"
              onClick={() => printElement('printable-vaccine-booklet', `Carteira_Vacinacao_${patient.name}`)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold hover:bg-emerald-800 transition shadow-2xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir A4</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
