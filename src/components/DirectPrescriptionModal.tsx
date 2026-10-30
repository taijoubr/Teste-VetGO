import React, { useState, useEffect } from 'react';
import { Patient, Tutor, DocumentRecord, DocumentType } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { printElement, exportToPdf } from '../utils/printHelper';
import {
  FileText,
  X,
  Plus,
  Trash2,
  Printer,
  Download,
  Share2,
  CheckCircle2,
  AlertCircle,
  Pill,
  Sparkles,
  ShieldCheck,
  Building2,
  Clock,
  Send,
  Eye,
  FileCheck2,
  Lock
} from 'lucide-react';

interface PrescriptionItem {
  id: string;
  name: string;
  concentration?: string;
  presentation?: string;
  quantity: string;
  route: string;
  instructions: string;
}

interface DirectPrescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient | null;
  tutor: Tutor | null;
  onPrescriptionSaved?: (doc: DocumentRecord) => void;
}

const COMMON_PRESETS = [
  {
    label: 'Amoxicilina + Clavulanato',
    type: 'RECEITA_SIMPLES' as DocumentType,
    item: {
      name: 'Amoxicilina + Clavulanato de Potássio',
      concentration: '250 mg',
      presentation: 'Comprimidos mastigáveis',
      quantity: '1 caixa (14 comprimidos)',
      route: 'Uso Oral',
      instructions: 'Administrar 1 comprimido por via oral a cada 12 horas (de 12 em 12 horas), durante 7 dias consecutivos. Oferecer com pequena quantidade de alimento.'
    }
  },
  {
    label: 'Meloxicam (Anti-inflamatório)',
    type: 'RECEITA_SIMPLES' as DocumentType,
    item: {
      name: 'Meloxicam (Maxicam / Flamavet)',
      concentration: '1 mg',
      presentation: 'Comprimidos',
      quantity: '1 blister (10 comprimidos)',
      route: 'Uso Oral',
      instructions: 'Administrar 1 comprimido por via oral a cada 24 horas (uma vez ao dia), após refeição, durante 4 a 5 dias consecutivos.'
    }
  },
  {
    label: 'Dipirona Gotas (Analgésico)',
    type: 'RECEITA_SIMPLES' as DocumentType,
    item: {
      name: 'Dipirona Sódica 500 mg/mL',
      concentration: '500 mg/mL (Gotas)',
      presentation: 'Frasco conta-gotas 20 mL',
      quantity: '1 frasco',
      route: 'Uso Oral',
      instructions: 'Administrar 1 gota por kg de peso por via oral a cada 8 horas se dor ou febre, por até 3 a 5 dias.'
    }
  },
  {
    label: 'Drontal Plus (Vermífugo)',
    type: 'RECEITA_SIMPLES' as DocumentType,
    item: {
      name: 'Drontal Plus Cães (Praziquantel + Pirantel + Febantel)',
      concentration: 'Para 10 kg',
      presentation: 'Comprimidos palatáveis',
      quantity: '2 comprimidos',
      route: 'Uso Oral',
      instructions: 'Administrar a dose indicada em dose única por via oral. Repetir exatamente a mesma dosagem após 15 dias.'
    }
  },
  {
    label: 'Omeprazol (Gastroprotetor)',
    type: 'RECEITA_SIMPLES' as DocumentType,
    item: {
      name: 'Omeprazol Veterinário / Gaviz V',
      concentration: '10 mg',
      presentation: 'Cápsulas gastro-resistentes',
      quantity: '1 caixa',
      route: 'Uso Oral',
      instructions: 'Administrar 1 cápsula por via oral em jejum (pela manhã, 30 min antes da primeira refeição), durante 14 dias.'
    }
  },
  {
    label: 'Auritop (Gotas Otológicas)',
    type: 'RECEITA_SIMPLES' as DocumentType,
    item: {
      name: 'Auritop Gel Otológico',
      concentration: 'Tópico',
      presentation: 'Bisnaga 30 g',
      quantity: '1 bisnaga',
      route: 'Uso Otológico',
      instructions: 'Realizar a limpeza prévia do conduto auditivo com solução fisiológica ou ceruminolítico. Em seguida, aplicar de 4 a 6 gotas no conduto afetado a cada 12 horas por 10 dias, massageando a base da orelha.'
    }
  },
  {
    label: 'Tramadol (Controle Especial)',
    type: 'RECEITA_CONTROLE_ESPECIAL' as DocumentType,
    item: {
      name: 'Cloridrato de Tramadol',
      concentration: '50 mg',
      presentation: 'Comprimidos / Cápsulas',
      quantity: '1 caixa (10 comprimidos)',
      route: 'Uso Oral',
      instructions: 'Administrar 1 comprimido por via oral a cada 8 a 12 horas conforme prescrição médica para analgesia moderada a severa, por até 5 dias.'
    }
  },
  {
    label: 'Gabapentina (Controle Especial)',
    type: 'RECEITA_CONTROLE_ESPECIAL' as DocumentType,
    item: {
      name: 'Gabapentina',
      concentration: '100 mg',
      presentation: 'Cápsulas',
      quantity: '1 frasco / caixa',
      route: 'Uso Oral',
      instructions: 'Administrar 1 cápsula por via oral a cada 12 horas para dor neuropática e manejo multimodal, durante 15 dias.'
    }
  }
];

export const DirectPrescriptionModal: React.FC<DirectPrescriptionModalProps> = ({
  isOpen,
  onClose,
  patient,
  tutor,
  onPrescriptionSaved
}) => {
  const { user } = useAuth();

  const [prescriptionType, setPrescriptionType] = useState<DocumentType>('RECEITA_SIMPLES');
  const [items, setItems] = useState<PrescriptionItem[]>([
    {
      id: 'item-1',
      name: 'Amoxicilina + Clavulanato de Potássio',
      concentration: '250 mg',
      presentation: 'Comprimidos',
      quantity: '1 caixa (14 comprimidos)',
      route: 'Uso Oral',
      instructions: 'Administrar 1 comprimido por via oral de 12 em 12 horas durante 7 dias consecutivos. Oferecer com uma pequena porção de alimento.'
    }
  ]);
  const [generalInstructions, setGeneralInstructions] = useState(
    'Oferecer os medicamentos nas doses e intervalos recomendados. Manter água limpa e fresca sempre à disposição. Em caso de reações adversas, êmese persistente ou dúvidas, contatar imediatamente o médico-veterinário responsável.'
  );
  const [signDigitally, setSignDigitally] = useState(Boolean(user?.signature_url));
  const [twoCopies, setTwoCopies] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'EDIT' | 'PREVIEW'>('EDIT');

  useEffect(() => {
    if (isOpen) {
      setSaveSuccess(false);
      setActiveTab('EDIT');
      if (user?.signature_url) {
        setSignDigitally(true);
      }
    }
  }, [isOpen, user]);

  if (!isOpen || !patient) return null;

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        name: '',
        concentration: '',
        presentation: 'Comprimidos',
        quantity: '1 caixa',
        route: 'Uso Oral',
        instructions: ''
      }
    ]);
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleItemChange = (id: string, field: keyof PrescriptionItem, value: string) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [field]: value } : it))
    );
  };

  const handleApplyPreset = (preset: typeof COMMON_PRESETS[0]) => {
    if (preset.type === 'RECEITA_CONTROLE_ESPECIAL') {
      setPrescriptionType('RECEITA_CONTROLE_ESPECIAL');
    }
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${Math.random()}`,
        ...preset.item
      }
    ]);
  };

  // Build Document Text Content for persistence
  const buildPrescriptionText = (): string => {
    const lines: string[] = [];
    lines.push(
      prescriptionType === 'RECEITA_CONTROLE_ESPECIAL'
        ? 'RECEITUÁRIO DE CONTROLE ESPECIAL (2 VIAS)'
        : 'RECEITUÁRIO MÉDICO VETERINÁRIO'
    );
    lines.push(`Data de Emissão: ${new Date().toLocaleDateString('pt-BR')}\n`);
    lines.push(`PACIENTE: ${patient.name}`);
    lines.push(`Espécie: ${patient.species} | Raça: ${patient.breed || 'SRD'} | Sexo: ${patient.gender}`);
    lines.push(`Idade: ${patient.approximate_age || 'Não inf.'} | Peso: ${patient.weight_kg ? `${patient.weight_kg} kg` : 'Aferido'}`);
    if (patient.microchip || patient.microchip_number) {
      lines.push(`Microchip: ${patient.microchip || patient.microchip_number}`);
    }
    lines.push(`TUTOR(A): ${tutor?.name || patient.tutor_name || 'Tutor Responsável'}`);
    if (tutor?.cpf) lines.push(`CPF Tutor: ${tutor.cpf}`);
    if (tutor?.phone || tutor?.whatsapp) lines.push(`Telefone Tutor: ${tutor.phone || tutor.whatsapp}`);
    if (tutor?.address) lines.push(`Endereço: ${tutor.address}, ${tutor.address_number || 'S/N'} - ${tutor.city || 'SP'}`);
    lines.push('\n----------------------------------------\nPRESCRIÇÃO TERAPÊUTICA:\n');

    items.forEach((item, idx) => {
      lines.push(`${idx + 1}. ${item.name.toUpperCase()} ${item.concentration ? `(${item.concentration})` : ''} - [${item.route}]`);
      lines.push(`   Apresentação: ${item.presentation || 'Padrão'} | Quantidade: ${item.quantity}`);
      lines.push(`   Posologia: ${item.instructions}\n`);
    });

    if (generalInstructions.trim()) {
      lines.push('----------------------------------------');
      lines.push(`ORIENTAÇÕES GERAIS:\n${generalInstructions}\n`);
    }

    lines.push('----------------------------------------');
    lines.push(`Médico(a) Veterinário(a): ${user?.first_name || ''} ${user?.last_name || ''}`);
    lines.push(`CRMV-${user?.crmv_uf || 'SP'}: ${user?.crmv || ''} | ${user?.clinic_name || 'Clínica Veterinária'}`);

    return lines.join('\n');
  };

  const handleSaveToMedicalRecord = async () => {
    try {
      setIsSaving(true);
      const textContent = buildPrescriptionText();
      const docTitle =
        prescriptionType === 'RECEITA_CONTROLE_ESPECIAL'
          ? `Receita Controle Especial - ${patient.name}`
          : `Receita Médica - ${patient.name}`;

      const newDoc = await api.createDocument({
        doc_type: prescriptionType,
        title: docTitle,
        patient_id: patient.id,
        patient_name: patient.name,
        tutor_id: tutor?.id || patient.tutor_id,
        tutor_name: tutor?.name || patient.tutor_name,
        clinic_name: user?.clinic_name || 'Atendimento Veterinário',
        content: textContent,
        is_signed: signDigitally,
        signature_url: signDigitally ? user?.signature_url : undefined,
        signature_date: signDigitally ? new Date().toISOString() : undefined,
        metadata_json: {
          items,
          generalInstructions,
          prescriptionType,
          twoCopies: prescriptionType === 'RECEITA_CONTROLE_ESPECIAL' ? twoCopies : false
        }
      });

      setIsSaving(false);
      setSaveSuccess(true);
      if (onPrescriptionSaved) {
        onPrescriptionSaved(newDoc);
      }
    } catch (e) {
      console.error('Erro ao salvar receita no prontuário:', e);
      setIsSaving(false);
    }
  };

  const handlePrint = async () => {
    if (!saveSuccess) {
      await handleSaveToMedicalRecord();
    }
    printElement(
      'direct-prescription-printable',
      `Receita_${patient.name}_${new Date().toISOString().split('T')[0]}`
    );
  };

  const handleExportPdf = async () => {
    if (!saveSuccess) {
      await handleSaveToMedicalRecord();
    }
    exportToPdf(
      'direct-prescription-printable',
      `Receita_${patient.name}_${new Date().toISOString().split('T')[0]}`
    );
  };

  const handleShareWhatsApp = () => {
    const tutorPhone = tutor?.whatsapp || tutor?.phone || '';
    const phoneClean = tutorPhone.replace(/\D/g, '');
    const greeting = tutor?.name ? `Olá, ${tutor.name}!` : 'Olá!';
    
    let msg = `${greeting} Segue a prescrição médica veterinária para o(a) seu pet *${patient.name}* emitida por *Dr(a). ${user?.first_name || ''} ${user?.last_name || ''}* (CRMV-${user?.crmv_uf || 'SP'} ${user?.crmv || ''}):\n\n`;
    msg += `📋 *${prescriptionType === 'RECEITA_CONTROLE_ESPECIAL' ? 'RECEITUÁRIO DE CONTROLE ESPECIAL' : 'RECEITA MÉDICA VETERINÁRIA'}*\n\n`;
    
    items.forEach((item, idx) => {
      msg += `*${idx + 1}. ${item.name}* ${item.concentration ? `(${item.concentration})` : ''}\n`;
      msg += `• *Via:* ${item.route} | *Qtd:* ${item.quantity}\n`;
      msg += `• *Como administrar:* ${item.instructions}\n\n`;
    });

    if (generalInstructions.trim()) {
      msg += `💡 *Orientações:* ${generalInstructions}\n\n`;
    }

    msg += `Qualquer dúvida sobre a medicação estamos à total disposição!`;

    const encoded = encodeURIComponent(msg);
    const url = phoneClean ? `https://wa.me/55${phoneClean}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
  };

  const tutorDisplayName = tutor?.name || patient.tutor_name || 'Tutor Responsável';
  const tutorDisplayPhone = tutor?.phone || tutor?.whatsapp || '';
  const tutorDisplayAddress = tutor?.address
    ? `${tutor.address}${tutor.address_number ? `, ${tutor.address_number}` : ''}${tutor.neighborhood ? ` - ${tutor.neighborhood}` : ''}${tutor.city ? ` - ${tutor.city}/${tutor.state || 'SP'}` : ''}`
    : '';

  // Render a Single Printable Sheet
  const renderPrintableSheet = (viaLabel?: string) => (
    <div className="printable-page bg-white p-8 sm:p-10 border border-slate-300 rounded-2xl space-y-6 text-slate-800 text-xs shadow-xs mb-8">
      {/* Clinic & Vet Header */}
      <div className="border-b-2 border-slate-800 pb-4 flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
            {user?.clinic_name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Clínica Veterinária'}
          </h2>
          <div className="text-xs font-bold text-emerald-800">
            Médico(a) Veterinário(a) • Dr(a). {user?.first_name} {user?.last_name}
          </div>
          <div className="font-mono text-[11px] text-slate-600">
            CRMV-{user?.crmv_uf || 'SP'}: {user?.crmv || '34892'}
          </div>
          {user?.phone && (
            <div className="text-[11px] text-slate-500">
              Contato: {user.phone} • Atendimento Volante e Especializado
            </div>
          )}
        </div>

        {viaLabel && (
          <div className="text-right">
            <span className="inline-block px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-900 text-white">
              {viaLabel}
            </span>
            <span className="block text-[10px] text-slate-400 mt-1 font-mono">
              Portaria 344/98 SVS/MS
            </span>
          </div>
        )}
      </div>

      {/* Prescription Title */}
      <div className="text-center space-y-0.5">
        <h3 className="text-base font-black uppercase tracking-wider text-slate-900">
          {prescriptionType === 'RECEITA_CONTROLE_ESPECIAL'
            ? 'Receituário de Controle Especial'
            : 'Receituário Médico Veterinário'}
        </h3>
        <p className="text-[11px] text-slate-500 font-mono">
          Data de Emissão: {new Date().toLocaleDateString('pt-BR')}
        </p>
      </div>

      {/* Patient & Tutor Info Block */}
      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-2 gap-3 text-[11px]">
        <div className="space-y-0.5">
          <div>
            <span className="text-slate-500 font-semibold">Paciente:</span>{' '}
            <strong className="text-slate-900 font-bold">{patient.name}</strong>
          </div>
          <div>
            <span className="text-slate-500 font-semibold">Espécie / Raça:</span>{' '}
            <span>{patient.species} • {patient.breed || 'SRD'}</span>
          </div>
          <div>
            <span className="text-slate-500 font-semibold">Sexo / Peso:</span>{' '}
            <span>{patient.gender} • {patient.weight_kg ? `${patient.weight_kg} kg` : 'Aferido'}</span>
          </div>
          {(patient.microchip || patient.microchip_number) && (
            <div>
              <span className="text-slate-500 font-semibold">Microchip:</span>{' '}
              <span className="font-mono">{patient.microchip || patient.microchip_number}</span>
            </div>
          )}
        </div>

        <div className="space-y-0.5">
          <div>
            <span className="text-slate-500 font-semibold">Tutor(a):</span>{' '}
            <strong className="text-slate-900 font-bold">{tutorDisplayName}</strong>
          </div>
          {tutor?.cpf && (
            <div>
              <span className="text-slate-500 font-semibold">CPF:</span>{' '}
              <span className="font-mono">{tutor.cpf}</span>
            </div>
          )}
          {tutorDisplayPhone && (
            <div>
              <span className="text-slate-500 font-semibold">Telefone:</span>{' '}
              <span>{tutorDisplayPhone}</span>
            </div>
          )}
          {tutorDisplayAddress && (
            <div>
              <span className="text-slate-500 font-semibold">Endereço:</span>{' '}
              <span className="text-slate-700">{tutorDisplayAddress}</span>
            </div>
          )}
        </div>
      </div>

      {/* Medications List */}
      <div className="space-y-4 pt-2">
        <h4 className="font-black text-xs uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1 flex items-center gap-1.5">
          <Pill className="w-3.5 h-3.5 text-teal-700" />
          Medicamentos Prescritos:
        </h4>

        <div className="space-y-4">
          {items.map((item, idx) => (
            <div key={item.id} className="space-y-1 pl-1">
              <div className="flex items-baseline justify-between gap-2">
                <div className="font-bold text-sm text-slate-900">
                  <span className="font-black text-teal-800 mr-1.5">{idx + 1}.</span>
                  {item.name || 'Medicamento'} {item.concentration ? `(${item.concentration})` : ''}
                </div>
                <div className="text-[11px] font-semibold text-slate-600 font-mono shrink-0">
                  {item.quantity ? `Qtd: ${item.quantity}` : ''}
                </div>
              </div>

              <div className="text-[11px] text-teal-900 font-semibold">
                Via de Administração: <span className="underline">{item.route}</span> • {item.presentation}
              </div>

              <div className="text-xs text-slate-700 font-medium pl-4 py-1 border-l-2 border-teal-500 bg-slate-50/60 rounded-r-md leading-relaxed whitespace-pre-line">
                {item.instructions || 'Posologia conforme orientação verbal.'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* General Instructions */}
      {generalInstructions.trim() && (
        <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl space-y-1">
          <span className="font-bold text-[10px] uppercase tracking-wider text-amber-900 block">
            Orientações Gerais ao Tutor:
          </span>
          <p className="text-[11px] text-amber-950 leading-relaxed whitespace-pre-line">
            {generalInstructions}
          </p>
        </div>
      )}

      {/* Special Control Identification Fields (Portaria 344/98) */}
      {prescriptionType === 'RECEITA_CONTROLE_ESPECIAL' && (
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-300 text-[10px]">
          <div className="p-2.5 border border-slate-300 rounded-lg space-y-1">
            <span className="font-bold uppercase tracking-wider text-slate-700 block">
              Identificação do Comprador
            </span>
            <div className="text-slate-500">Nome: ____________________________________</div>
            <div className="text-slate-500">RG/Órgão: ________________ CPF: __________</div>
            <div className="text-slate-500">Endereço: ________________________________</div>
            <div className="text-slate-500">Telefone: ________________ Ass.: _________</div>
          </div>

          <div className="p-2.5 border border-slate-300 rounded-lg space-y-1">
            <span className="font-bold uppercase tracking-wider text-slate-700 block">
              Identificação do Fornecedor / Farmácia
            </span>
            <div className="text-slate-500">Razão Social: ___________________________</div>
            <div className="text-slate-500">Farmacêutico(a) Resp.: ____________________</div>
            <div className="text-slate-500">CRF: ________________ Lote Disp.: ________</div>
            <div className="text-slate-500">Data da Dispensação: ___/___/______</div>
          </div>
        </div>
      )}

      {/* Veterinarian Signature Section */}
      <div className="pt-6 text-center space-y-1">
        {signDigitally && user?.signature_url ? (
          <div className="flex flex-col items-center justify-center">
            <img
              src={user.signature_url}
              alt="Assinatura Veterinária"
              className="max-h-14 max-w-[200px] object-contain mb-1 filter drop-shadow-2xs"
            />
            <div className="w-64 border-t border-slate-500 mx-auto"></div>
            <div className="text-xs font-bold text-slate-900 mt-1">
              Dr(a). {user?.first_name} {user?.last_name || ''}
            </div>
            <div className="text-[11px] text-slate-600 font-mono">
              Médico(a) Veterinário(a) • CRMV-{user?.crmv_uf || 'SP'} {user?.crmv || '34892'}
            </div>
            <div className="text-[9px] text-emerald-800 font-mono mt-1 inline-flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>Assinatura Digital Vetgo • Emitido em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        ) : (
          <div className="pt-8">
            <div className="w-64 border-t border-slate-500 mx-auto"></div>
            <div className="text-xs font-bold text-slate-900 mt-1">
              Dr(a). {user?.first_name} {user?.last_name || ''}
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              Médico(a) Veterinário(a) • CRMV-{user?.crmv_uf || 'SP'} {user?.crmv || '34892'}
            </div>
            <div className="text-[10px] text-slate-400 italic mt-0.5">
              (Assinatura física do médico-veterinário)
            </div>
          </div>
        )}
      </div>

      {/* Clean Footer Note */}
      <div className="pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400">
        Receita expedida via <strong>Vetgo Gestão Veterinária</strong> • Uso sob prescrição médico-veterinária
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200 overflow-y-auto max-h-[94vh] space-y-5">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-200">
              <Pill className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>Emitir Prescrição Rápida</span>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-teal-100 text-teal-800 font-semibold">
                  {patient.name}
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                {patient.species} • {patient.breed || 'SRD'} • Tutor(a): {tutorDisplayName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab switch */}
            <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('EDIT')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'EDIT'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Editar Receita
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('PREVIEW')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${
                  activeTab === 'PREVIEW'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Eye className="w-3.5 h-3.5 text-teal-600" />
                <span>Visualizar Folha A4</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {saveSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Receita gravada e arquivada com sucesso no histórico do paciente!</span>
            </div>
            <span className="text-[10px] font-bold text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-200">
              Prontuário Atualizado
            </span>
          </div>
        )}

        {/* TAB: EDIT PRESCRIPTION */}
        {activeTab === 'EDIT' && (
          <div className="space-y-5">
            {/* Type selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPrescriptionType('RECEITA_SIMPLES')}
                className={`p-3.5 rounded-2xl border text-left transition flex items-start gap-3 cursor-pointer ${
                  prescriptionType === 'RECEITA_SIMPLES'
                    ? 'bg-teal-50/80 border-teal-500 shadow-xs ring-1 ring-teal-500'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <strong className="text-xs font-bold text-slate-900 block">
                    Receita Simples
                  </strong>
                  <span className="text-[11px] text-slate-500 leading-snug block">
                    Para antibióticos de uso comum, anti-inflamatórios, vermífugos, colírios e suporte.
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPrescriptionType('RECEITA_CONTROLE_ESPECIAL')}
                className={`p-3.5 rounded-2xl border text-left transition flex items-start gap-3 cursor-pointer ${
                  prescriptionType === 'RECEITA_CONTROLE_ESPECIAL'
                    ? 'bg-amber-50/80 border-amber-500 shadow-xs ring-1 ring-amber-500'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <strong className="text-xs font-bold text-slate-900 block flex items-center gap-1.5">
                    <span>Receita Controle Especial</span>
                    <span className="text-[10px] bg-amber-200 text-amber-900 font-bold px-1.5 py-0.2 rounded">
                      2 Vias
                    </span>
                  </strong>
                  <span className="text-[11px] text-slate-500 leading-snug block">
                    Portaria 344/98 (Opioides, anticonvulsivantes, sedativos, Tramadol, Fenobarbital).
                  </span>
                </div>
              </button>
            </div>

            {/* Quick Presets Bar */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Adicionar Prescrição Rápida (Fórmulas Frequentes):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-teal-50 hover:border-teal-300 hover:text-teal-900 transition cursor-pointer shadow-2xs"
                  >
                    + {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Prescribed Items Editor */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Pill className="w-3.5 h-3.5 text-teal-600" />
                  Medicamentos da Prescrição ({items.length})
                </h4>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar Medicamento</span>
                </button>
              </div>

              {items.length === 0 ? (
                <div className="p-6 text-center bg-slate-50 border border-dashed border-slate-300 rounded-2xl space-y-2">
                  <Pill className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-semibold text-slate-600">
                    Nenhum medicamento adicionado ainda.
                  </p>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="px-3 py-1.5 bg-teal-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                  >
                    + Adicionar Primeiro Item
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div
                      key={item.id}
                      className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-3 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-xs text-teal-900 bg-teal-100 px-2 py-0.5 rounded-md">
                          Item #{index + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-rose-600 hover:text-rose-800 p-1 rounded-lg cursor-pointer transition"
                          title="Remover medicamento"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                            Nome do Medicamento ou Princípio Ativo *
                          </label>
                          <input
                            type="text"
                            required
                            value={item.name}
                            onChange={(e) => handleItemChange(item.id, 'name', e.target.value)}
                            placeholder="Ex: Amoxicilina + Clavulanato, Meloxicam..."
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none font-medium focus:border-teal-600"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                            Concentração
                          </label>
                          <input
                            type="text"
                            value={item.concentration || ''}
                            onChange={(e) => handleItemChange(item.id, 'concentration', e.target.value)}
                            placeholder="Ex: 250 mg, 10 mg/mL"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none font-medium focus:border-teal-600"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                            Quantidade a Dispensar
                          </label>
                          <input
                            type="text"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                            placeholder="Ex: 1 caixa, 14 comp."
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none font-medium focus:border-teal-600"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                            Via de Administração
                          </label>
                          <select
                            value={item.route}
                            onChange={(e) => handleItemChange(item.id, 'route', e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none font-medium focus:border-teal-600"
                          >
                            <option value="Uso Oral">Uso Oral</option>
                            <option value="Uso Tópico">Uso Tópico</option>
                            <option value="Uso Otológico">Uso Otológico</option>
                            <option value="Uso Oftálmico">Uso Oftálmico</option>
                            <option value="Uso Subcutâneo">Uso Subcutâneo (SC)</option>
                            <option value="Uso Intramuscular">Uso Intramuscular (IM)</option>
                            <option value="Uso Inalatório">Uso Inalatório</option>
                            <option value="Outro">Outro</option>
                          </select>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                            Apresentação
                          </label>
                          <input
                            type="text"
                            value={item.presentation || ''}
                            onChange={(e) => handleItemChange(item.id, 'presentation', e.target.value)}
                            placeholder="Ex: Comprimidos palatáveis, Suspensão oral, Pomada..."
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none font-medium focus:border-teal-600"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                          Posologia e Modo de Usar (Instruções detalhadas para o tutor) *
                        </label>
                        <textarea
                          rows={2}
                          value={item.instructions}
                          onChange={(e) => handleItemChange(item.id, 'instructions', e.target.value)}
                          placeholder="Ex: Administrar 1 comprimido por via oral a cada 12 horas durante 7 dias. Oferecer após o alimento."
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none text-xs focus:border-teal-600"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* General Instructions */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">
                Recomendações e Orientações Gerais ao Tutor
              </label>
              <textarea
                rows={2}
                value={generalInstructions}
                onChange={(e) => setGeneralInstructions(e.target.value)}
                placeholder="Ex: Manter água fresca sempre disponível. Em caso de reações adversas, contatar o veterinário imediatamente..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-teal-600"
              />
            </div>

            {/* Signature & Format Options */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 text-xs">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="inline-flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={signDigitally}
                    onChange={(e) => setSignDigitally(e.target.checked)}
                    className="rounded border-slate-300 text-teal-700 focus:ring-teal-500 w-4 h-4"
                  />
                  <span>Assinar digitalmente com Carimbo e CRMV-{user?.crmv_uf || 'SP'} {user?.crmv || ''}</span>
                </label>

                {prescriptionType === 'RECEITA_CONTROLE_ESPECIAL' && (
                  <label className="inline-flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={twoCopies}
                      onChange={(e) => setTwoCopies(e.target.checked)}
                      className="rounded border-slate-300 text-teal-700 focus:ring-teal-500 w-4 h-4"
                    />
                    <span>Imprimir em 2 Vias (1ª Via: Farmácia / 2ª Via: Tutor)</span>
                  </label>
                )}
              </div>

              {signDigitally && user?.signature_url ? (
                <div className="flex items-center gap-3 pt-2 border-t border-slate-200/80">
                  <img
                    src={user.signature_url}
                    alt="Rubrica"
                    className="max-h-8 max-w-[130px] object-contain border border-slate-200 rounded px-1.5 py-0.5 bg-white"
                  />
                  <span className="text-[11px] text-slate-600 font-mono">
                    Dr(a). {user.first_name} {user.last_name} • CRMV-{user.crmv_uf || 'SP'} {user.crmv || ''}
                  </span>
                </div>
              ) : signDigitally ? (
                <p className="text-[11px] text-amber-700 pt-1">
                  * Você ainda não cadastrou uma imagem de assinatura no perfil. O documento exibirá seu nome e CRMV formalmente.
                </p>
              ) : (
                <p className="text-[11px] text-slate-500 pt-1">
                  * Será gerada a linha em branco tradicional para assinatura física com caneta.
                </p>
              )}
            </div>
          </div>
        )}

        {/* TAB: PREVIEW PRINTABLE A4 */}
        {activeTab === 'PREVIEW' && (
          <div className="space-y-4">
            <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-900 flex items-center justify-between">
              <span>Esta é a pré-visualização fiel de como a receita será impressa em folha A4 e exportada em PDF.</span>
              <button
                type="button"
                onClick={() => setActiveTab('EDIT')}
                className="font-bold text-teal-800 underline cursor-pointer"
              >
                Voltar à Edição
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-2 bg-slate-100 rounded-2xl border border-slate-200">
              <div id="direct-prescription-printable">
                {prescriptionType === 'RECEITA_CONTROLE_ESPECIAL' && twoCopies ? (
                  <>
                    {renderPrintableSheet('1ª Via - Retenção da Farmácia / Drogaria')}
                    <div className="page-break my-6 border-b-2 border-dashed border-slate-300"></div>
                    {renderPrintableSheet('2ª Via - Orientação do Tutor / Paciente')}
                  </>
                ) : (
                  renderPrintableSheet()
                )}
              </div>
            </div>
          </div>
        )}

        {/* Hidden Container for Print/PDF generation when in EDIT mode */}
        {activeTab === 'EDIT' && (
          <div className="hidden">
            <div id="direct-prescription-printable">
              {prescriptionType === 'RECEITA_CONTROLE_ESPECIAL' && twoCopies ? (
                <>
                  {renderPrintableSheet('1ª Via - Retenção da Farmácia / Drogaria')}
                  <div className="page-break my-6 border-b-2 border-dashed border-slate-300"></div>
                  {renderPrintableSheet('2ª Via - Orientação do Tutor / Paciente')}
                </>
              ) : (
                renderPrintableSheet()
              )}
            </div>
          </div>
        )}

        {/* Actions Bar */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            Fechar
          </button>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
              title="Enviar texto da receita direto no WhatsApp do tutor"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>WhatsApp Tutor</span>
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
              title="Baixar PDF da Receita"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar PDF</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
              title="Imprimir Receita em folha A4 limpa"
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
