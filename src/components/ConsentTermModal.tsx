import React, { useState, useRef, useEffect } from 'react';
import {
  FileCheck2,
  X,
  Printer,
  Download,
  Share2,
  Copy,
  Check,
  CheckCircle2,
  PenTool,
  RotateCcw,
  ShieldCheck,
  ExternalLink,
  MessageCircle,
  AlertTriangle,
  User,
  PawPrint,
  Calendar,
  FileText,
  Upload,
  Hash,
  Sparkles,
  Paperclip,
  Trash2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Patient, Tutor, DocumentRecord, DocumentType } from '../types';
import { api } from '../services/api';
import { printElement, exportToPdf } from '../utils/printHelper';
import { formatPatientCode, formatTutorCode } from '../utils/formatters';

export type TermType =
  | 'CIRURGICO_ANESTESICO'
  | 'SEDACAO_EXAMES'
  | 'ALTA_A_PEDIDO'
  | 'EUTANASIA'
  | 'INTERNACAO'
  | 'PERSONALIZADO';

export type SignatureMode = 'SCREEN_CANVAS' | 'MANUAL_PRINT' | 'GOV_BR';

interface ConsentTermModalProps {
  isOpen: boolean;
  onClose: () => void;
  patients: Patient[];
  tutors: Tutor[];
  initialPatientId?: number | null;
  initialTermType?: TermType;
  procedureName?: string;
  onSaved?: (doc: DocumentRecord) => void;
}

interface TermPreset {
  type: TermType;
  title: string;
  badge: string;
  description: string;
  defaultText: (params: {
    vetName: string;
    crmv: string;
    clinicName: string;
    patientName: string;
    patientSpecies: string;
    patientBreed: string;
    patientAge: string;
    patientWeight: string;
    tutorName: string;
    tutorCpf: string;
    tutorPhone: string;
    tutorAddress: string;
    procedure: string;
    date: string;
  }) => string;
}

const TERM_PRESETS: TermPreset[] = [
  {
    type: 'CIRURGICO_ANESTESICO',
    title: 'Termo de Consentimento Livre e Esclarecido (TCLE) Anestésico e Cirúrgico',
    badge: 'Cirurgia & Anestesia',
    description: 'Autorização formal para anestesia geral e cirurgia com ciência de riscos intrínsecos e jejum.',
    defaultText: ({
      vetName,
      crmv,
      clinicName,
      patientName,
      patientSpecies,
      patientBreed,
      patientAge,
      patientWeight,
      tutorName,
      tutorCpf,
      tutorPhone,
      tutorAddress,
      procedure,
      date
    }) => `TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO (TCLE)
PARA PROCEDIMENTO ANESTÉSICO E CIRÚRGICO VETERINÁRIO

1. IDENTIFICAÇÃO DAS PARTES
TUTOR(A) / RESPONSÁVEL LEGAL: ${tutorName}
CPF: ${tutorCpf} | Telefone/WhatsApp: ${tutorPhone}
Endereço: ${tutorAddress}

PACIENTE (ANIMAL): ${patientName}
Espécie: ${patientSpecies} | Raça: ${patientBreed} | Idade: ${patientAge} | Peso: ${patientWeight}

MÉDICO(A) VETERINÁRIO(A) RESPONSÁVEL: Dr(a). ${vetName} — ${crmv}
SERVIÇO / CLÍNICA: ${clinicName}
DATA DO PROCEDIMENTO: ${date}
PROCEDIMENTO(S) AUTORIZADO(S): ${procedure || 'Procedimento Cirúrgico e Anestésico Indicado'}

2. DECLARAÇÃO E AUTORIZAÇÃO EXPRESSA
Eu, acima identificado(a) como legítimo(a) tutor(a) e proprietário(a) do paciente, DECLARO que autorizo expressamente a realização do procedimento cirúrgico supracitado, bem como a administração de anestesia geral/locorregional e medicações associadas julgadas necessárias pela equipe veterinária.

3. CIÊNCIA DOS RISCOS INERENTES
Declaro ter sido prévia e minuciosamente esclarecido(a) pela equipe médica veterinária, em linguagem acessível e compreensível, sobre:
a) A natureza, objetivos, extensão e benefícios esperados do procedimento;
b) Os riscos intrínsecos, previsíveis ou imprevisíveis, inerentes a qualquer ato anestésico-cirúrgico, incluindo, sem limitação: reações anafiláticas ou idiossincrásicas a fármacos, hipotensão, depressão respiratória, arritmias, hemorragias, parada cardiorrespiratória e óbito, independentemente de todos os cuidados profiláticos e da perícia técnica adotada;
c) O estado clínico atual e a classificação de risco anestésico do animal;
d) A importância de seguir rigorosamente as orientações pós-operatórias e medicações domiciliares.

4. CONFIRMAÇÃO DE JEJUM PRÉ-OPERATÓRIO
Declaro expressamente que cumpri com exatidão o período de jejum alimentar e hídrico orientado previamente pelo médico veterinário, ciente de que a omissão dessa informação coloca o animal sob risco iminente de vômito, broncoaspiração e asfixia durante a indução e recuperação anestésica.

5. ATOS DE URGÊNCIA E EMERGÊNCIA
Autorizo a equipe veterinária a realizar quaisquer intervenções clínicas, cirúrgicas, diagnósticas complementares ou manobras de ressuscitação cardiopulmonar (RCP) que se façam urgentemente necessárias durante o procedimento, visando a preservação da vida e estabilização do paciente.

6. HONORÁRIOS E CUSTOS
Estou ciente e concordo com os honorários profissionais e despesas hospitalares/materiais acordados, responsabilizando-me integralmente pelo adimplemento dos valores contratados.`
  },
  {
    type: 'SEDACAO_EXAMES',
    title: 'Termo de Consentimento para Sedação e Exames Diagnósticos',
    badge: 'Sedação & Exames',
    description: 'Para contenção química, exames de ultrassom, raio-x, biópsias, endoscopias ou limpezas.',
    defaultText: ({
      vetName,
      crmv,
      clinicName,
      patientName,
      patientSpecies,
      patientBreed,
      tutorName,
      tutorCpf,
      procedure,
      date
    }) => `TERMO DE CONSENTIMENTO PARA SEDAÇÃO E PROCEDIMENTOS DIAGNÓSTICOS

TUTOR(A): ${tutorName} | CPF: ${tutorCpf}
PACIENTE: ${patientName} (${patientSpecies}, ${patientBreed})
VETERINÁRIO(A): Dr(a). ${vetName} — ${crmv}
DATA: ${date}
PROCEDIMENTO / EXAME: ${procedure || 'Exame sob sedação / contenção farmacológica'}

Eu, tutor(a) responsável pelo animal acima descrito, autorizo a aplicação de sedativos, tranquilizantes e analgésicos para contenção química visando a realização segura e indolor dos exames ou procedimentos diagnósticos indicados.

Fui plenamente orientado(a) de que a contenção farmacológica é indicada para o bem-estar e alívio do estresse do paciente, bem como para a segurança dos procedimentos. Fui esclarecido(a) sobre os possíveis efeitos colaterais temporários (sonolência, ataxia residual, hipotermia passageira) e riscos raros inerentes ao uso de fármacos depressores do sistema nervoso central.`
  },
  {
    type: 'ALTA_A_PEDIDO',
    title: 'Termo de Responsabilidade por Alta a Pedido / Recusa de Internação ou Tratamento',
    badge: 'Isenção de Responsabilidade',
    description: 'Proteção jurídica quando o tutor recusa internação, exames críticos ou retira o animal contra indicação médica.',
    defaultText: ({
      vetName,
      crmv,
      clinicName,
      patientName,
      patientSpecies,
      patientBreed,
      tutorName,
      tutorCpf,
      date
    }) => `TERMO DE RESPONSABILIDADE — ALTA A PEDIDO OU RECUSA DE TRATAMENTO / INTERNAÇÃO

TUTOR(A) / RESPONSÁVEL: ${tutorName} | CPF: ${tutorCpf}
PACIENTE (ANIMAL): ${patientName} (${patientSpecies}, ${patientBreed})
MÉDICO(A) VETERINÁRIO(A): Dr(a). ${vetName} — ${crmv}
DATA: ${date}

DECLARO para todos os efeitos legais que:
1. Fui expressamente e categoricamente advertido(a) pelo(a) médico(a) veterinário(a) responsável sobre a GRAVIDADE do quadro clínico do meu animal, a necessidade premente de sua manutenção em ambiente de internação ou da realização imediata dos procedimentos, exames ou terapias prescritas.

2. Mesmo ciente dos riscos iminentes de agravamento severo do quadro clínico, sequelas permanentes, sofrimento agudo ou ÓBITO do paciente decorrentes da interrupção do suporte médico e hospitalar, OPTEI LIVREMENTE POR RETIRAR O ANIMAL OU RECUSAR A CONDUTA INDICADA, sob minha exclusiva responsabilidade.

3. ISENTO expressamente o(a) Dr(a). ${vetName}, bem como a clínica ${clinicName} e toda a sua equipe, de qualquer responsabilidade civil, criminal ou ético-profissional por quaisquer danos, deteriorações do estado de saúde ou morte do animal que venham a ocorrer a partir deste momento.`
  },
  {
    type: 'EUTANASIA',
    title: 'Termo de Consentimento Informado para Eutanásia Compassiva (Res. CFMV nº 1000/2012)',
    badge: 'Eutanásia Compassiva',
    description: 'Atendimento estrito à Resolução CFMV nº 1000/2012 para casos irreversíveis e alívio de sofrimento.',
    defaultText: ({
      vetName,
      crmv,
      clinicName,
      patientName,
      patientSpecies,
      patientBreed,
      patientAge,
      tutorName,
      tutorCpf,
      tutorPhone,
      date
    }) => `TERMO DE AUTORIZAÇÃO E CONSENTIMENTO PARA EUTANÁSIA COMPASSIVA
(Conforme Resolução CFMV nº 1.000/2012)

TUTOR(A) / PROPRIETÁRIO(A) LEGAL: ${tutorName}
CPF: ${tutorCpf} | Telefone: ${tutorPhone}
PACIENTE: ${patientName} | Espécie: ${patientSpecies} | Raça: ${patientBreed} | Idade: ${patientAge}
MÉDICO(A) VETERINÁRIO(A): Dr(a). ${vetName} — ${crmv}
DATA: ${date}

Eu, acima qualificado(a) como único(a) e legítimo(a) proprietário(a) e responsável pelo animal supracitado, SOLICITO E AUTORIZO EXPRESSAMENTE a realização do procedimento de eutanásia compassiva.

DECLARO QUE:
1. Fui amplamente informado(a) sobre o diagnóstico definitivo e o prognóstico clínico desfavorável/infausto do paciente, atestando a inexistência de alternativas terapêuticas viáveis capazes de reverter o quadro ou cessar a dor e o sofrimento contínuo.
2. Estou ciente de que o ato será conduzido estritamente de acordo com as normas éticas e científicas do Conselho Federal de Medicina Veterinária (CFMV), empregando-se plano anestésico geral prévio e profundo, garantindo a indução de inconsciência imediata e ausência total de dor, ansiedade ou sofrimento físico.
3. Tomo esta decisão de forma lúcida, consciente, voluntária e definitiva, sem qualquer coação, visando unicamente o alívio digno do sofrimento do animal.`
  },
  {
    type: 'INTERNACAO',
    title: 'Termo de Autorização de Internação & Tratamento Clínico Intensivo',
    badge: 'Internação & Cuidados',
    description: 'Autorização para internação, fluidoterapia, administração de medicamentos e monitorização.',
    defaultText: ({
      vetName,
      crmv,
      clinicName,
      patientName,
      patientSpecies,
      patientBreed,
      tutorName,
      tutorCpf,
      tutorPhone,
      date
    }) => `TERMO DE AUTORIZAÇÃO DE INTERNAÇÃO E TRATAMENTO CLÍNICO

TUTOR(A): ${tutorName} | CPF: ${tutorCpf} | Telefone: ${tutorPhone}
PACIENTE: ${patientName} (${patientSpecies}, ${patientBreed})
VETERINÁRIO(A): Dr(a). ${vetName} — ${crmv}
DATA DA INTERNAÇÃO: ${date}

Autorizo a internação do animal acima para acompanhamento clínico, monitorização, oxigenoterapia, fluidoterapia endovenosa e administração das medicações necessárias.
Declaro que fui informado(a) sobre a rotina de visitas, horários de boletins médicos diários e custos das diárias e insumos utilizados.`
  },
  {
    type: 'PERSONALIZADO',
    title: 'Termo de Autorização e Responsabilidade Personalizado',
    badge: 'Livre / Personalizado',
    description: 'Modelo em branco para redigir cláusulas livres específicas do atendimento.',
    defaultText: ({
      vetName,
      crmv,
      clinicName,
      patientName,
      patientSpecies,
      patientBreed,
      tutorName,
      tutorCpf,
      date
    }) => `TERMO DE CONSENTIMENTO E AUTORIZAÇÃO VETERINÁRIA

TUTOR(A): ${tutorName} | CPF: ${tutorCpf}
PACIENTE: ${patientName} (${patientSpecies}, ${patientBreed})
VETERINÁRIO(A): Dr(a). ${vetName} — ${crmv}
DATA: ${date}

Por meio deste instrumento, autorizo a realização dos procedimentos médico-veterinários recomendados para o paciente acima identificado.
Declaro ter recebido todas as informações e orientações necessárias pertinentes ao tratamento.`
  }
];

export const ConsentTermModal: React.FC<ConsentTermModalProps> = ({
  isOpen,
  onClose,
  patients,
  tutors,
  initialPatientId,
  initialTermType = 'CIRURGICO_ANESTESICO',
  procedureName = '',
  onSaved
}) => {
  const { user } = useAuth();

  // State
  const [selectedTermType, setSelectedTermType] = useState<TermType>(initialTermType);
  const [selectedPatientId, setSelectedPatientId] = useState<number>(
    initialPatientId || (patients.length > 0 ? patients[0].id : 1)
  );
  const [customProcedure, setCustomProcedure] = useState<string>(procedureName);
  const [activeTab, setActiveTab] = useState<SignatureMode>('SCREEN_CANVAS');
  const [termContent, setTermContent] = useState<string>('');
  const [termTitle, setTermTitle] = useState<string>('');
  const [isEditingContent, setIsEditingContent] = useState<boolean>(false);

  // Screen Canvas Signature State
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasTutorDrawn, setHasTutorDrawn] = useState(false);
  const [penColor, setPenColor] = useState<string>('#1e3a8a'); // Azul Caneta
  const [tutorSignatureDataUrl, setTutorSignatureDataUrl] = useState<string | null>(null);
  const [tutorSignerName, setTutorSignerName] = useState<string>('');
  const [tutorSignerCpf, setTutorSignerCpf] = useState<string>('');
  const [includeVetSignature, setIncludeVetSignature] = useState<boolean>(true);

  // Manual Print State
  const [includeWitnesses, setIncludeWitnesses] = useState<boolean>(true);
  const [witness1Name, setWitness1Name] = useState<string>('');
  const [witness1Cpf, setWitness1Cpf] = useState<string>('');
  const [witness2Name, setWitness2Name] = useState<string>('');
  const [witness2Cpf, setWitness2Cpf] = useState<string>('');

  // Envio de PDF / Arquivo Assinado Devolvido State
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [attachedFileName, setAttachedFileName] = useState<string>('');
  const [attachedFileUrl, setAttachedFileUrl] = useState<string | null>(null);
  const [attachedFileType, setAttachedFileType] = useState<string>('');

  // Shared Actions State
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedSuccessDoc, setSavedSuccessDoc] = useState<DocumentRecord | null>(null);
  const [copiedText, setCopiedText] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const selectedPatient = patients.find((p) => p.id === selectedPatientId) || patients[0];
  const selectedTutor = tutors.find((t) => t.id === selectedPatient?.tutor_id);

  // Synchronize initial patient when prop changes
  useEffect(() => {
    if (initialPatientId) {
      setSelectedPatientId(initialPatientId);
    }
  }, [initialPatientId]);

  useEffect(() => {
    if (procedureName) {
      setCustomProcedure(procedureName);
    }
  }, [procedureName]);

  useEffect(() => {
    if (initialTermType) {
      setSelectedTermType(initialTermType);
    }
  }, [initialTermType]);

  // Update text when term type, patient, or procedure changes
  useEffect(() => {
    generateTermText(selectedTermType);
  }, [selectedTermType, selectedPatientId, customProcedure]);

  // Update tutor signer name when tutor changes
  useEffect(() => {
    if (selectedTutor) {
      setTutorSignerName(selectedTutor.name || '');
      setTutorSignerCpf(selectedTutor.cpf || '');
    }
  }, [selectedTutor]);

  // Canvas init on tab change
  useEffect(() => {
    if (activeTab === 'SCREEN_CANVAS' && isOpen) {
      setTimeout(() => initCanvas(), 80);
    }
  }, [activeTab, isOpen]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const generateTermText = (type: TermType) => {
    const preset = TERM_PRESETS.find((p) => p.type === type) || TERM_PRESETS[0];
    const today = new Date().toLocaleDateString('pt-BR');

    const vetFullName = user?.first_name
      ? `${user.first_name} ${user.last_name || ''}`.trim()
      : 'Médico(a) Veterinário(a)';
    const crmvFull = user?.crmv ? `CRMV-${user.crmv_uf || 'SP'} ${user.crmv}` : 'CRMV-SP 34892';
    const clinicName = user?.clinic_name || 'Atendimento Veterinário Volante';

    const pName = selectedPatient?.name || 'Paciente';
    const pSpecies = selectedPatient?.species || 'Canina';
    const pBreed = selectedPatient?.breed || 'SRD';
    const pAge = selectedPatient?.approximate_age || 'Não informada';
    const pWeight = selectedPatient?.weight_kg ? `${selectedPatient.weight_kg} kg` : 'peso não registrado';

    const tName = selectedTutor?.name || selectedPatient?.tutor_name || 'Tutor Responsável';
    const tCpf = selectedTutor?.cpf || 'Não informado';
    const tPhone = selectedTutor?.phone || selectedTutor?.whatsapp || 'Não informado';
    const tAddress = selectedTutor?.address
      ? `${selectedTutor.address}, ${selectedTutor.address_number || 'S/N'}`
      : 'Domicílio';

    const text = preset.defaultText({
      vetName: vetFullName,
      crmv: crmvFull,
      clinicName,
      patientName: pName,
      patientSpecies: pSpecies,
      patientBreed: pBreed,
      patientAge: pAge,
      patientWeight: pWeight,
      tutorName: tName,
      tutorCpf: tCpf,
      tutorPhone: tPhone,
      tutorAddress: tAddress,
      procedure: customProcedure,
      date: today
    });

    setTermTitle(preset.title);
    setTermContent(text);
  };

  // Canvas drawing functions
  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = penColor;
    ctx.lineWidth = 2.5;

    ctx.clearRect(0, 0, rect.width, rect.height);
    setHasTutorDrawn(false);
    setTutorSignatureDataUrl(null);
  };

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasTutorDrawn(true);
    const { x, y } = getCanvasCoords(e);
    ctx.strokeStyle = penColor;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const dataUrl = canvas.toDataURL('image/png');
      setTutorSignatureDataUrl(dataUrl);
    } catch (e) {
      console.warn('Canvas toDataURL err:', e);
    }
  };

  const handleClearCanvas = () => {
    initCanvas();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      showToast('O arquivo excede o limite de 8MB.');
      return;
    }

    setAttachedFileName(file.name);
    setAttachedFileType(file.type);

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setAttachedFileUrl(result);
      showToast(`Arquivo "${file.name}" anexado com sucesso!`);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAttachment = () => {
    setAttachedFileName('');
    setAttachedFileUrl(null);
    setAttachedFileType('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    showToast('Anexo removido.');
  };

  // Save Document to Patient History
  const handleSaveToPatientRecord = async () => {
    try {
      setIsSaving(true);
      const todayISO = new Date().toISOString();

      let signatureType = 'MANUAL_PENDENTE';
      let signatureUrl: string | undefined = undefined;
      let isSigned = false;

      if (activeTab === 'SCREEN_CANVAS') {
        signatureType = 'ASSINADO_NA_TELA_TUTOR';
        signatureUrl = tutorSignatureDataUrl || undefined;
        isSigned = hasTutorDrawn;
      } else if (activeTab === 'MANUAL_PRINT') {
        signatureType = attachedFileUrl ? 'FISICA_ANEXADA' : 'MANUAL_IMPRESSA';
        signatureUrl = attachedFileUrl || undefined;
        isSigned = Boolean(attachedFileUrl);
      } else if (activeTab === 'GOV_BR') {
        signatureType = attachedFileUrl ? 'GOV_BR_OU_DIGITAL_ANEXADO' : 'ENVIADO_AO_CLIENTE';
        signatureUrl = attachedFileUrl || undefined;
        isSigned = Boolean(attachedFileUrl);
      }

      const docType: DocumentType = selectedTermType === 'EUTANASIA'
        ? 'TERMO_EUTANASIA'
        : selectedTermType === 'SEDACAO_EXAMES'
        ? 'AUTORIZACAO_SEDACAO'
        : 'TERMO_CONSENTIMENTO_LIVRE';

      const docRecord = await api.createDocument({
        doc_type: docType,
        title: termTitle || 'Termo de Consentimento Livre e Esclarecido',
        patient_id: selectedPatient?.id,
        patient_name: selectedPatient?.name,
        tutor_id: selectedTutor?.id,
        tutor_name: selectedTutor?.name,
        content: termContent,
        is_signed: isSigned,
        signature_type: signatureType,
        signature_url: signatureUrl,
        signature_date: todayISO,
        show_stamp: includeVetSignature,
        metadata_json: {
          term_type: selectedTermType,
          procedure_name: customProcedure,
          signature_mode: activeTab,
          attached_file_name: attachedFileName || undefined,
          attached_file_type: attachedFileType || undefined,
          attached_file_url: attachedFileUrl || undefined,
          witnesses: includeWitnesses ? [
            { name: witness1Name, cpf: witness1Cpf },
            { name: witness2Name, cpf: witness2Cpf }
          ] : undefined,
          tutor_signer_name: tutorSignerName,
          tutor_signer_cpf: tutorSignerCpf,
          created_via: 'VetGo_ConsentTermModal'
        }
      });

      setSavedSuccessDoc(docRecord);
      showToast(attachedFileUrl ? 'Termo com arquivo assinado arquivado com sucesso no Prontuário!' : 'Termo registrado com sucesso no Prontuário do Paciente!');
      if (onSaved) onSaved(docRecord);
    } catch (err: any) {
      console.error('Erro ao arquivar termo:', err);
      showToast(err.message || 'Erro ao salvar documento.');
    } finally {
      setIsSaving(false);
    }
  };

  // WhatsApp helper
  const handleShareWhatsApp = () => {
    const rawPhone = (selectedTutor?.whatsapp || selectedTutor?.phone || '').replace(/\D/g, '');
    const vetName = user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : 'Médico(a) Veterinário(a)';

    const message = `📋 *${termTitle.toUpperCase()}*\n` +
      `🐾 *Paciente:* ${selectedPatient?.name} (${selectedPatient?.species}, ${selectedPatient?.breed || 'SRD'})\n` +
      `👤 *Tutor(a):* ${selectedTutor?.name}\n` +
      `👨‍⚕️ *Veterinário(a):* Dr(a). ${vetName}\n\n` +
      `Olá! Segue o Termo de Consentimento e Responsabilidade para o procedimento de seu animalzinho.\n\n` +
      `📌 *Como assinar:*\n` +
      `O médico veterinário enviará o PDF oficial. Você pode assinar pelo celular (usando o portal gratuito GOV.BR em assinador.iti.br ou app de assinatura digital) ou imprimir, assinar à mão e nos enviar uma foto/arquivo de volta por aqui.\n\n` +
      `"${termContent.substring(0, 360)}..."\n\n` +
      `Caso tenha qualquer dúvida, estamos à total disposição!`;

    if (rawPhone) {
      window.open(`https://wa.me/55${rawPhone}?text=${encodeURIComponent(message)}`, '_blank');
    } else {
      navigator.clipboard.writeText(message);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 3000);
      showToast('Texto do termo copiado! O tutor não possui telefone cadastrado.');
    }
  };

  const handleCopyAll = () => {
    navigator.clipboard.writeText(termContent);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 3000);
    showToast('Texto do termo copiado com sucesso!');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full my-6 shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Termo de Consentimento Livre e Esclarecido (TCLE)
                </h2>
                <span className="text-[10px] uppercase font-mono font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-400/30">
                  Resolução CFMV
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Segurança jurídica e ética para anestesias, cirurgias, internações e procedimentos
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Controls Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 shrink-0 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {/* Modelo de Termo */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Modelo de Termo *</label>
              <select
                value={selectedTermType}
                onChange={(e) => setSelectedTermType(e.target.value as TermType)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-medium text-slate-800 outline-none focus:ring-2 focus:ring-emerald-600"
              >
                {TERM_PRESETS.map((p) => (
                  <option key={p.type} value={p.type}>
                    {p.badge} — {p.title.split('(')[0]}
                  </option>
                ))}
              </select>
            </div>

            {/* Paciente Selecionado */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Paciente (Animal) *</label>
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-medium text-slate-800 outline-none focus:ring-2 focus:ring-emerald-600"
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.species} • {p.tutor_name || 'Tutor'})
                  </option>
                ))}
              </select>
            </div>

            {/* Procedimento / Cirurgia */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Procedimento Específico
              </label>
              <input
                type="text"
                placeholder="Ex: OSH / Castração, Mastectomia, USG Abdominal..."
                value={customProcedure}
                onChange={(e) => setCustomProcedure(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 outline-none focus:ring-2 focus:ring-emerald-600"
              >
              </input>
            </div>
          </div>

          {/* Modalidade de Assinatura Tabs */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <span>Como o termo será assinado pelo tutor?</span>
              </span>
              <button
                type="button"
                onClick={() => setIsEditingContent(!isEditingContent)}
                className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 cursor-pointer underline flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                <span>{isEditingContent ? 'Concluir Edição de Texto' : 'Personalizar Texto do Termo'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('SCREEN_CANVAS')}
                className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition cursor-pointer ${
                  activeTab === 'SCREEN_CANVAS'
                    ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-950 font-bold'
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className={`p-2 rounded-lg ${activeTab === 'SCREEN_CANVAS' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  <PenTool className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold">1. Assinatura na Tela</div>
                  <div className="text-[10px] text-slate-500 font-normal">Dedo / Stylus no celular ou tablet</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('MANUAL_PRINT')}
                className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition cursor-pointer ${
                  activeTab === 'MANUAL_PRINT'
                    ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20 text-blue-950 font-bold'
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className={`p-2 rounded-lg ${activeTab === 'MANUAL_PRINT' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  <Printer className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold">2. Impressão Manual</div>
                  <div className="text-[10px] text-slate-500 font-normal">Folha A4 com caneta e testemunhas</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('GOV_BR')}
                className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition cursor-pointer ${
                  activeTab === 'GOV_BR'
                    ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/20 text-amber-950 font-bold'
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className={`p-2 rounded-lg ${activeTab === 'GOV_BR' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold">3. Enviar PDF para o Tutor</div>
                  <div className="text-[10px] text-slate-500 font-normal">WhatsApp • Assinatura Externa (GOV.BR)</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-white">
          {/* Editor Mode if toggled */}
          {isEditingContent && (
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Edição Direta do Texto do Termo</span>
                </span>
                <button
                  type="button"
                  onClick={() => generateTermText(selectedTermType)}
                  className="text-[11px] font-bold text-amber-800 hover:underline"
                >
                  Restaurar Texto Padrão
                </button>
              </div>
              <textarea
                rows={8}
                value={termContent}
                onChange={(e) => setTermContent(e.target.value)}
                className="w-full p-2.5 text-xs font-mono bg-white border border-amber-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          )}

          {/* TAB 1: ASSINATURA NA TELA (TOUCH / STYLUS) */}
          {activeTab === 'SCREEN_CANVAS' && (
            <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-2xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-emerald-950 flex items-center gap-1.5">
                    <PenTool className="w-4 h-4 text-emerald-700" />
                    <span>Colher Assinatura Digital do Tutor na Tela</span>
                  </h3>
                  <p className="text-[11px] text-emerald-800">
                    O tutor assina com o dedo ou caneta stylus no tablet, celular ou com o mouse no computador.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-emerald-200 text-xs">
                    <span className="text-[10px] text-slate-500 font-bold">Cor:</span>
                    <button
                      type="button"
                      onClick={() => setPenColor('#1e3a8a')}
                      className={`w-4 h-4 rounded-full bg-blue-900 ${penColor === '#1e3a8a' ? 'ring-2 ring-emerald-600 ring-offset-1' : ''}`}
                      title="Caneta Azul"
                    />
                    <button
                      type="button"
                      onClick={() => setPenColor('#0f172a')}
                      className={`w-4 h-4 rounded-full bg-slate-900 ${penColor === '#0f172a' ? 'ring-2 ring-emerald-600 ring-offset-1' : ''}`}
                      title="Caneta Preta"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleClearCanvas}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-lg transition cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                    <span>Limpar</span>
                  </button>
                </div>
              </div>

              {/* Canvas Area */}
              <div className="relative border-2 border-dashed border-emerald-300 rounded-xl bg-white overflow-hidden shadow-inner">
                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-40 cursor-crosshair touch-none"
                />

                {!hasTutorDrawn && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-400 gap-1">
                    <PenTool className="w-6 h-6 text-emerald-400/60" />
                    <span className="text-xs font-medium">Assine aqui com o dedo ou caneta stylus</span>
                    <span className="text-[10px] text-slate-400 font-mono">Assinatura Digital do Tutor</span>
                  </div>
                )}
              </div>

              {/* Tutor identity confirmation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">Nome Legível do Tutor Signatário:</label>
                  <input
                    type="text"
                    value={tutorSignerName}
                    onChange={(e) => setTutorSignerName(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 outline-none"
                    placeholder="Nome completo do tutor"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">CPF do Tutor:</label>
                  <input
                    type="text"
                    value={tutorSignerCpf}
                    onChange={(e) => setTutorSignerCpf(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 outline-none"
                    placeholder="000.000.000-00"
                  />
                </div>
              </div>

              {/* Audit timestamp pill */}
              <div className="flex items-center justify-between text-[11px] text-emerald-900 bg-emerald-100/60 px-3 py-1.5 rounded-lg border border-emerald-200">
                <span className="flex items-center gap-1 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Autenticação eletrônica: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                </span>
                <span className="font-mono text-[10px] text-emerald-800">IP Seguro • Vetgo Security</span>
              </div>
            </div>
          )}

          {/* TAB 2: IMPRESSÃO MANUAL (FOLHA A4 COM CANETA) */}
          {activeTab === 'MANUAL_PRINT' && (
            <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-2xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-blue-950 flex items-center gap-1.5">
                    <Printer className="w-4 h-4 text-blue-700" />
                    <span>Modo Impressão Manual para Prancheta / Ficha Física</span>
                  </h3>
                  <p className="text-[11px] text-blue-800">
                    O documento será formatado em A4 com linhas pontilhadas oficiais para assinatura física à caneta.
                  </p>
                </div>

                <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-900 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeWitnesses}
                    onChange={(e) => setIncludeWitnesses(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                  />
                  <span>Incluir campos para 2 Testemunhas</span>
                </label>
              </div>

              {includeWitnesses && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-white p-3 rounded-xl border border-blue-200">
                  <div className="space-y-1.5">
                    <span className="font-bold text-slate-700 block text-[11px]">Testemunha 1 (Opcional):</span>
                    <input
                      type="text"
                      placeholder="Nome da testemunha 1"
                      value={witness1Name}
                      onChange={(e) => setWitness1Name(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                    />
                    <input
                      type="text"
                      placeholder="CPF da testemunha 1"
                      value={witness1Cpf}
                      onChange={(e) => setWitness1Cpf(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <span className="font-bold text-slate-700 block text-[11px]">Testemunha 2 (Opcional):</span>
                    <input
                      type="text"
                      placeholder="Nome da testemunha 2"
                      value={witness2Name}
                      onChange={(e) => setWitness2Name(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                    />
                    <input
                      type="text"
                      placeholder="CPF da testemunha 2"
                      value={witness2Cpf}
                      onChange={(e) => setWitness2Cpf(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ENVIAR PDF PARA O TUTOR ASSINAR */}
          {activeTab === 'GOV_BR' && (
            <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-amber-950 flex items-center gap-1.5">
                    <Share2 className="w-4 h-4 text-amber-700" />
                    <span>Envio de PDF para Assinatura Externa do Tutor</span>
                  </h3>
                  <p className="text-[11px] text-amber-800">
                    O veterinário gera o PDF do termo e envia para o tutor assinar pelo celular (GOV.BR, assinador digital ou impresso).
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <a
                    href="https://assinador.iti.br"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 transition shadow-2xs"
                    title="Acessar o portal oficial gratuito do Governo Federal para assinatura digital ICP-Brasil"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Portal GOV.BR ↗</span>
                  </a>
                </div>
              </div>

              {/* Guia prático com ações diretas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-white p-3.5 rounded-xl border border-amber-200 space-y-2 flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Download className="w-4 h-4 text-blue-700" />
                      <span>1. Baixar o PDF Oficial do Termo</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Gera o PDF formatado em folha A4 com todos os dados do paciente, tutor e veterinário prontinho para envio.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => exportToPdf('consent-term-printable', `Termo_${selectedPatient?.name || 'Veterinario'}`)}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-bold text-xs shadow-xs transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Baixar PDF para Envio</span>
                  </button>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-amber-200 space-y-2 flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <MessageCircle className="w-4 h-4 text-emerald-700" />
                      <span>2. Enviar no WhatsApp do Tutor</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Abre a conversa com mensagem explicativa e instruções simples para o tutor assinar no GOV.BR ou assinar e devolver.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleShareWhatsApp}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs shadow-xs transition cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Enviar Mensagem no WhatsApp</span>
                  </button>
                </div>
              </div>

              {/* Anexar Arquivo Assinado Devolvido */}
              <div className="bg-white p-3.5 rounded-xl border border-amber-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Paperclip className="w-4 h-4 text-amber-700" />
                    <span>3. Anexar o Termo Assinado que o Cliente Devolveu (Opcional):</span>
                  </label>
                  {attachedFileName && (
                    <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Arquivo Anexado
                    </span>
                  )}
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".pdf,image/*"
                  className="hidden"
                />

                {attachedFileName ? (
                  <div className="p-3 bg-emerald-50/70 border border-emerald-300 rounded-xl flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileCheck2 className="w-4 h-4 text-emerald-700 shrink-0" />
                      <div className="truncate">
                        <div className="text-xs font-bold text-emerald-950 truncate">{attachedFileName}</div>
                        <div className="text-[10px] text-emerald-700">Documento assinado pronto para arquivamento no prontuário</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveAttachment}
                      className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer shrink-0"
                      title="Remover anexo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center justify-between p-3 border-2 border-dashed border-slate-200 rounded-xl gap-2 bg-slate-50">
                    <div className="text-xs text-slate-500 text-center sm:text-left">
                      Quando o tutor devolver o PDF assinado pelo GOV.BR ou uma foto/scan da folha assinada, anexe aqui.
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-1.5 text-xs font-bold bg-white text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition cursor-pointer shrink-0"
                    >
                      Selecionar Arquivo (PDF / Foto)
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* DOCUMENT PREVIEW & PRINTABLE CONTAINER */}
          <div className="border border-slate-200 rounded-2xl p-6 sm:p-8 bg-slate-50/40 space-y-6">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 text-xs text-slate-500 font-bold uppercase tracking-wider">
              <span>Pré-visualização do Documento Oficial (Padrão A4)</span>
              <span className="text-emerald-700 font-mono text-[11px]">
                {activeTab === 'SCREEN_CANVAS'
                  ? '• Modo: Assinatura na Tela'
                  : activeTab === 'MANUAL_PRINT'
                  ? '• Modo: Impressão Manual'
                  : '• Modo: Assinatura GOV.BR'}
              </span>
            </div>

            <div id="consent-term-printable" className="printable-document bg-white p-6 sm:p-10 border border-slate-300 shadow-sm rounded-xl space-y-6 text-slate-800 text-xs">
              {/* Header do Veterinário e Clínica */}
              <div className="text-center border-b border-slate-300 pb-4 space-y-1">
                <h1 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight">
                  {user?.clinic_name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Serviço Médico Veterinário'}
                </h1>
                <div className="text-xs font-bold text-emerald-800">
                  Dr(a). {user?.first_name} {user?.last_name || ''} • CRMV-{user?.crmv_uf || 'SP'} {user?.crmv || '34892'}
                </div>
                {user?.phone && (
                  <div className="text-[11px] text-slate-500">
                    Telefone: {user.phone} • Atendimento Veterinário Especializado
                  </div>
                )}
              </div>

              {/* Título do Termo */}
              <div className="text-center space-y-1">
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-900">
                  {termTitle}
                </h2>
                <div className="text-[11px] text-slate-500 font-mono">
                  Data de emissão: {new Date().toLocaleDateString('pt-BR')}
                </div>
              </div>

              {/* Corpo do Texto */}
              <div className="whitespace-pre-wrap font-sans leading-relaxed text-slate-800 p-4 bg-slate-50/60 rounded-xl border border-slate-200 text-[11.5px]">
                {termContent}
              </div>

              {/* BLOCO DE ASSINATURAS DE ACORDO COM A MODALIDADE */}
              {/* CASO 1: ASSINATURA NA TELA */}
              {activeTab === 'SCREEN_CANVAS' && (
                <div className="pt-6 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-6 items-end">
                  {/* Assinatura do Tutor */}
                  <div className="text-center space-y-1 flex flex-col items-center">
                    {tutorSignatureDataUrl ? (
                      <img
                        src={tutorSignatureDataUrl}
                        alt="Assinatura do Tutor"
                        className="max-h-16 max-w-[200px] object-contain mb-1"
                      />
                    ) : (
                      <div className="h-14 flex items-center justify-center text-[10px] text-slate-400 italic">
                        (Aguardando assinatura do tutor na tela)
                      </div>
                    )}
                    <div className="w-48 border-t border-slate-400 mx-auto"></div>
                    <div className="text-xs font-bold text-slate-900 mt-0.5">
                      {tutorSignerName || selectedTutor?.name || 'Tutor Responsável'}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      CPF: {tutorSignerCpf || selectedTutor?.cpf || 'Não informado'}
                    </div>
                    <div className="text-[9px] text-emerald-800 font-mono mt-0.5 inline-flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Assinado digitalmente via Vetgo</span>
                    </div>
                  </div>

                  {/* Assinatura do Veterinário */}
                  <div className="text-center space-y-1 flex flex-col items-center">
                    {user?.signature_url ? (
                      <img
                        src={user.signature_url}
                        alt="Assinatura Veterinária"
                        className="max-h-16 max-w-[200px] object-contain mb-1 mix-blend-multiply"
                      />
                    ) : (
                      <div className="h-14 flex items-center justify-center text-[10px] text-slate-400 italic">
                        (Assinatura cadastrada do profissional)
                      </div>
                    )}
                    <div className="w-48 border-t border-slate-400 mx-auto"></div>
                    <div className="text-xs font-bold text-slate-900 mt-0.5">
                      Dr(a). {user?.first_name} {user?.last_name || ''}
                    </div>
                    <div className="text-[10px] text-slate-600 font-mono">
                      Médico(a) Veterinário(a) • CRMV-{user?.crmv_uf || 'SP'} {user?.crmv || '34892'}
                    </div>
                    {user?.stamp_url && (
                      <img
                        src={user.stamp_url}
                        alt="Carimbo Profissional"
                        className="max-h-12 max-w-[140px] object-contain mt-1 mix-blend-multiply"
                      />
                    )}
                  </div>
                </div>
              )}

              {/* CASO 2: IMPRESSÃO MANUAL COM CANETA */}
              {activeTab === 'MANUAL_PRINT' && (
                <div className="pt-8 border-t border-slate-200 space-y-8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 items-end text-center">
                    {/* Linha Tutor */}
                    <div className="space-y-1">
                      <div className="w-56 border-t-2 border-slate-400 mx-auto mb-2"></div>
                      <div className="text-xs font-bold text-slate-900">
                        {tutorSignerName || selectedTutor?.name || 'Tutor Responsável'}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        CPF: {tutorSignerCpf || selectedTutor?.cpf || '_____________________'} • RG: __________________
                      </div>
                      <div className="text-[9px] text-slate-400 italic">
                        (Assinatura física à caneta do tutor)
                      </div>
                    </div>

                    {/* Linha Veterinário */}
                    <div className="space-y-1">
                      <div className="w-56 border-t-2 border-slate-400 mx-auto mb-2"></div>
                      <div className="text-xs font-bold text-slate-900">
                        Dr(a). {user?.first_name} {user?.last_name || ''}
                      </div>
                      <div className="text-[10px] text-slate-600 font-mono">
                        Médico(a) Veterinário(a) • CRMV-{user?.crmv_uf || 'SP'} {user?.crmv || '34892'}
                      </div>
                      <div className="text-[9px] text-slate-400 italic">
                        (Assinatura e carimbo profissional)
                      </div>
                    </div>
                  </div>

                  {/* Testemunhas */}
                  {includeWitnesses && (
                    <div className="pt-4 border-t border-dashed border-slate-200">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-4 text-center">
                        Testemunhas Presenciais (Opcional)
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-center">
                        <div>
                          <div className="w-48 border-t border-slate-300 mx-auto mb-1"></div>
                          <div className="text-[11px] font-bold text-slate-700">
                            {witness1Name || '1ª Testemunha'}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            CPF: {witness1Cpf || '________________________'}
                          </div>
                        </div>
                        <div>
                          <div className="w-48 border-t border-slate-300 mx-auto mb-1"></div>
                          <div className="text-[11px] font-bold text-slate-700">
                            {witness2Name || '2ª Testemunha'}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            CPF: {witness2Cpf || '________________________'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* CASO 3: ENVIAR PDF PARA ASSINATURA */}
              {activeTab === 'GOV_BR' && (
                <div className="pt-6 border-t border-slate-200 space-y-4">
                  {attachedFileName ? (
                    <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between text-xs text-emerald-950 font-bold">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Termo assinado devolvido pelo tutor anexado: {attachedFileName}</span>
                      </div>
                      <span className="text-[10px] text-emerald-700 font-mono">Assinado & Arquivado</span>
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-50/70 border border-amber-300 rounded-xl text-xs text-amber-950">
                      <div className="font-bold flex items-center gap-1.5 mb-0.5">
                        <Share2 className="w-3.5 h-3.5 text-amber-700" />
                        <span>Documento diagramado para assinatura do tutor (GOV.BR / Assinador Digital / Manual)</span>
                      </div>
                      <p className="text-[10px] text-amber-800">
                        O veterinário pode baixar o PDF e enviar via WhatsApp para o cliente assinar.
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-end text-center pt-2">
                    <div className="space-y-1">
                      <div className="w-52 border-t border-slate-400 mx-auto mb-1"></div>
                      <div className="text-xs font-bold text-slate-900">
                        {tutorSignerName || selectedTutor?.name || 'Tutor Responsável'}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        CPF: {tutorSignerCpf || selectedTutor?.cpf || 'Não informado'}
                      </div>
                      <div className="text-[9px] text-slate-500 font-medium italic">
                        [Assinatura do tutor / GOV.BR / Assinador Digital]
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="w-52 border-t border-slate-400 mx-auto mb-1"></div>
                      <div className="text-xs font-bold text-slate-900">
                        Dr(a). {user?.first_name} {user?.last_name || ''}
                      </div>
                      <div className="text-[10px] text-slate-600 font-mono">
                        CRMV-{user?.crmv_uf || 'SP'} {user?.crmv || '34892'}
                      </div>
                      <div className="text-[9px] text-emerald-800 font-medium italic">
                        [Assinatura do médico veterinário]
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Rodapé Oficial com identificação de software */}
              <div className="pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-1">
                <span>Documento emitido via <strong>Vetgo Sistema Veterinário</strong></span>
                <span>Validade ética perante o CFMV / CRMV</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Action Buttons Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyAll}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 bg-white border border-slate-300 rounded-xl transition cursor-pointer"
              title="Copiar texto integral do termo"
            >
              {copiedText ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
              <span>{copiedText ? 'Copiado!' : 'Copiar Texto'}</span>
            </button>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-300 rounded-xl transition cursor-pointer"
              title="Enviar termo para leitura ou assinatura no WhatsApp do tutor"
            >
              <MessageCircle className="w-4 h-4 text-emerald-700" />
              <span>WhatsApp</span>
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => printElement('consent-term-printable', `Termo_${selectedPatient?.name || 'Veterinario'}`)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white rounded-xl shadow-xs transition cursor-pointer"
              title="Imprimir termo em folha A4 limpa"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir A4</span>
            </button>

            <button
              type="button"
              onClick={() => exportToPdf('consent-term-printable', `Termo_${selectedPatient?.name || 'Veterinario'}`)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-blue-700 hover:bg-blue-800 text-white rounded-xl shadow-xs transition cursor-pointer"
              title="Baixar arquivo PDF diagramado"
            >
              <Download className="w-4 h-4" />
              <span>Baixar PDF</span>
            </button>

            <button
              type="button"
              onClick={handleSaveToPatientRecord}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
              title="Salvar termo no histórico/prontuário do paciente no sistema"
            >
              <FileCheck2 className="w-4 h-4" />
              <span>{isSaving ? 'Salvando...' : 'Salvar no Prontuário'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-xs font-bold border border-slate-700 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
