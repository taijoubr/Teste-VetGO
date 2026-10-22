import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { DocumentRecord, DocumentType, DocumentTemplate, TemplateCategory, Patient, Tutor } from '../types';
import {
  FileText,
  Plus,
  Search,
  Printer,
  Copy,
  CheckCircle2,
  X,
  AlertCircle,
  Sparkles,
  Edit3,
  Trash2,
  Bookmark,
  Tag,
  RefreshCw,
  SlidersHorizontal,
  Layers,
  FileCheck2,
  ArrowRight,
  Download
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { formatPatientCode, formatTutorCode } from '../utils/formatters';
import { printElement, exportToPdf } from '../utils/printHelper';

// Available Dynamic Variables for templates
const TEMPLATE_VARIABLES = [
  { tag: '{codigo_paciente}', label: 'Cód. Pet', desc: 'Ex: PAC-0001' },
  { tag: '{nome_paciente}', label: 'Nome Pet', desc: 'Nome do animal' },
  { tag: '{especie}', label: 'Espécie', desc: 'Canina, Felina, etc.' },
  { tag: '{raca}', label: 'Raça', desc: 'Raça ou SRD' },
  { tag: '{sexo}', label: 'Sexo', desc: 'Macho ou Fêmea' },
  { tag: '{idade}', label: 'Idade', desc: 'Idade cadastrada' },
  { tag: '{peso}', label: 'Peso', desc: 'Peso com kg' },
  { tag: '{pelagem}', label: 'Pelagem', desc: 'Cor da pelagem' },
  { tag: '{microchip}', label: 'Microchip', desc: 'Número do chip' },
  { tag: '{codigo_tutor}', label: 'Cód. Tutor', desc: 'Ex: TUT-0001' },
  { tag: '{nome_tutor}', label: 'Nome Tutor', desc: 'Nome completo do tutor' },
  { tag: '{cpf_tutor}', label: 'CPF Tutor', desc: 'CPF cadastrado' },
  { tag: '{telefone_tutor}', label: 'Telefone Tutor', desc: 'Telefone / WhatsApp' },
  { tag: '{endereco_tutor}', label: 'Endereço Tutor', desc: 'Rua e número' },
  { tag: '{cidade_tutor}', label: 'Cidade/UF', desc: 'Cidade e estado' },
  { tag: '{nome_veterinario}', label: 'Nome Vet', desc: 'Dr(a). emitente' },
  { tag: '{crmv_veterinario}', label: 'CRMV', desc: 'Número CRMV e UF' },
  { tag: '{data_atual}', label: 'Data Hoje', desc: 'Data atual formatada' },
  { tag: '{clinica}', label: 'Clínica/Serviço', desc: 'Clínica ou atendimento' },
];

const CATEGORY_LABELS: Record<TemplateCategory, { label: string; color: string }> = {
  TERMO: { label: 'Termo / TCLE', color: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
  RECEITA: { label: 'Receita', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  ATESTADO: { label: 'Atestado', color: 'bg-sky-50 text-sky-800 border-sky-200' },
  ORIENTACOES: { label: 'Orientações', color: 'bg-amber-50 text-amber-800 border-amber-200' },
  LAUDO: { label: 'Laudo', color: 'bg-purple-50 text-purple-800 border-purple-200' },
  DECLARACAO: { label: 'Declaração', color: 'bg-teal-50 text-teal-800 border-teal-200' },
  OUTRO: { label: 'Personalizado', color: 'bg-slate-100 text-slate-700 border-slate-200' },
};

export const DocumentsPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'issued' | 'templates'>('issued');

  // Main Data
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [customTemplates, setCustomTemplates] = useState<DocumentTemplate[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [search, setSearch] = useState('');
  const [templateSearch, setTemplateSearch] = useState('');
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState<string>('ALL');

  // View / Print Modal
  const [viewingDoc, setViewingDoc] = useState<DocumentRecord | null>(null);
  const [copied, setCopied] = useState(false);

  // Issue Document Modal
  const [showModal, setShowModal] = useState(false);
  const [templateSource, setTemplateSource] = useState<'SYSTEM' | 'CUSTOM'>('CUSTOM');
  const [selectedType, setSelectedType] = useState<DocumentType>('RECEITA_SIMPLES');
  const [selectedCustomTemplateId, setSelectedCustomTemplateId] = useState<number | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<number>(1);
  const [docTitle, setDocTitle] = useState('');
  const [docContent, setDocContent] = useState('');
  const [generatingDraft, setGeneratingDraft] = useState(false);

  // Custom Template Management Modal (Create / Edit)
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DocumentTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({
    title: '',
    category: 'TERMO' as TemplateCategory,
    description: '',
    content: ''
  });
  const [templateModalError, setTemplateModalError] = useState<string | null>(null);
  const [previewSampleData, setPreviewSampleData] = useState(false);

  // Delete In-App Confirmation Modal
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    type: 'document' | 'template';
    id: number;
    title: string;
  }>({
    isOpen: false,
    type: 'document',
    id: 0,
    title: ''
  });

  // Toast feedback
  const [feedbackToast, setFeedbackToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const templateTextareaRef = useRef<HTMLTextAreaElement>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackToast({ text, type });
    setTimeout(() => setFeedbackToast(null), 3500);
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [docs, templates, pts, tuts] = await Promise.all([
        api.getDocuments(),
        api.getDocumentTemplates(),
        api.getPatients(),
        api.getTutors()
      ]);
      setDocuments(docs);
      setCustomTemplates(templates);
      setPatients(pts);
      setTutors(tuts);

      if (pts.length > 0) {
        setSelectedPatientId(pts[0].id);
        if (templates.length > 0) {
          setSelectedCustomTemplateId(templates[0].id);
          applyCustomTemplate(templates[0], pts[0], tuts);
          setTemplateSource('CUSTOM');
        } else {
          applySystemTemplate('RECEITA_SIMPLES', pts[0], tuts);
          setTemplateSource('SYSTEM');
        }
      }
    } catch (e) {
      console.error('Error loading documents data:', e);
    } finally {
      setLoading(false);
    }
  };

  // Replace all dynamic tags with patient, tutor, and vet data
  const fillTemplateVariables = (rawText: string, patient?: Patient, tutor?: Tutor): string => {
    const today = new Date().toLocaleDateString('pt-BR');
    let text = rawText || '';

    const vetFullName = user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : 'Médico(a) Veterinário(a)';
    const crmvFull = user?.crmv ? `CRMV-${user.crmv_uf || 'SP'} ${user.crmv}` : 'CRMV-SP 34892';
    const clinicName = user?.clinic_name || 'Atendimento Veterinário Volante';

    const pCode = patient ? formatPatientCode(patient) : 'PAC-0001';
    const pName = patient?.name || 'Nome do Paciente';
    const pSpecies = patient?.species || 'Canina';
    const pBreed = patient?.breed || 'SRD';
    const pGender = patient?.gender || 'Macho';
    const pAge = patient?.approximate_age || 'Não informada';
    const pWeight = patient?.weight_kg ? `${patient.weight_kg} kg` : 'peso não registrado';
    const pCoat = patient?.coat_color || 'Padrão';
    const pChip = patient?.microchip || patient?.microchip_number || 'Sem microchip';

    const tCode = tutor ? formatTutorCode(tutor) : (patient ? formatTutorCode(patient.tutor_id) : 'TUT-0001');
    const tName = tutor?.name || patient?.tutor_name || 'Tutor Responsável';
    const tCpf = tutor?.cpf || 'Não informado';
    const tPhone = tutor?.phone || tutor?.whatsapp || 'Não informado';
    const tAddress = tutor?.address ? `${tutor.address}, ${tutor.address_number || 'S/N'}` : 'Domicílio';
    const tCity = tutor?.city ? `${tutor.city}-${tutor.state || 'SP'}` : 'São Paulo-SP';

    const replacements: Record<string, string> = {
      '{codigo_paciente}': pCode,
      '{codigo_pet}': pCode,
      '{prontuario}': pCode,
      '{{codigo_paciente}}': pCode,
      '{{prontuario}}': pCode,

      '{codigo_tutor}': tCode,
      '{{codigo_tutor}}': tCode,

      '{nome_paciente}': pName,
      '{paciente}': pName,
      '{{nome_paciente}}': pName,
      '{{paciente}}': pName,

      '{especie}': pSpecies,
      '{{especie}}': pSpecies,

      '{raca}': pBreed,
      '{{raca}}': pBreed,

      '{sexo}': pGender,
      '{{sexo}}': pGender,

      '{idade}': pAge,
      '{{idade}}': pAge,

      '{peso}': pWeight,
      '{{peso}}': pWeight,

      '{pelagem}': pCoat,
      '{{pelagem}}': pCoat,

      '{microchip}': pChip,
      '{{microchip}}': pChip,

      '{nome_tutor}': tName,
      '{tutor}': tName,
      '{{nome_tutor}}': tName,
      '{{tutor}}': tName,

      '{cpf_tutor}': tCpf,
      '{{cpf_tutor}}': tCpf,

      '{telefone_tutor}': tPhone,
      '{{telefone_tutor}}': tPhone,

      '{endereco_tutor}': tAddress,
      '{{endereco_tutor}}': tAddress,

      '{cidade_tutor}': tCity,
      '{{cidade_tutor}}': tCity,

      '{nome_veterinario}': vetFullName,
      '{{nome_veterinario}}': vetFullName,

      '{crmv_veterinario}': crmvFull,
      '{{crmv_veterinario}}': crmvFull,
      '{crmv}': crmvFull,
      '{{crmv}}': crmvFull,

      '{data_atual}': today,
      '{{data_atual}}': today,
      '{data}': today,
      '{{data}}': today,

      '{clinica}': clinicName,
      '{{clinica}}': clinicName,
    };

    for (const [key, val] of Object.entries(replacements)) {
      text = text.split(key).join(val);
    }
    return text;
  };

  const applyCustomTemplate = (template: DocumentTemplate, patient?: Patient, tutsList = tutors) => {
    if (!patient) return;
    const tutor = tutsList.find((t) => t.id === patient.tutor_id);
    setDocTitle(`${template.title} - ${patient.name}`);
    const filled = fillTemplateVariables(template.content, patient, tutor);
    setDocContent(filled);
  };

  const applySystemTemplate = (type: DocumentType, patient: Patient, tutsList = tutors) => {
    const tutor = tutsList.find((t) => t.id === patient.tutor_id);
    const tutorName = tutor ? tutor.name : 'Tutor Responsável';
    const patientName = patient.name;
    const species = patient.species;
    const breed = patient.breed || 'SRD';
    const weight = patient.weight_kg ? `${patient.weight_kg} kg` : 'peso padrão';

    switch (type) {
      case 'RECEITA_SIMPLES':
        setDocTitle(`Receita Médica Veterinária - ${patientName}`);
        setDocContent(
          `PRESCRIÇÃO VETERINÁRIA\n\nPaciente: ${patientName} (${species}, ${breed}, ${weight})\nTutor: ${tutorName}\n\nUSO ORAL:\n1) Dipirona Gotas 500mg/mL ----------------- 1 frasco\nAdministrar 1 gota por kg de peso corporal a cada 8 horas se dor ou febre, por 3 dias.\n\n2) Probiótico Pet Pasta -------------------- 1 bisnaga\nAdministrar 2g por via oral uma vez ao dia por 7 dias.`
        );
        break;

      case 'RECEITA_CONTROLE_ESPECIAL':
        setDocTitle(`Receituário de Controle Especial (MAPA) - ${patientName}`);
        setDocContent(
          `RECEITUÁRIO DE CONTROLE ESPECIAL (EM DUAS VIAS)\n(Portaria SVS/MS nº 344/98 e Instruções Normativas MAPA)\n\n1ª VIA: Retenção da Farmácia / Drogaria\n2ª VIA: Orientação ao Paciente / Tutor\n\nEMITENTE:\nDr(a). ${user?.first_name} ${user?.last_name} • CRMV-${user?.crmv_uf || 'SP'} ${user?.crmv || '34892'}\n\nPACIENTE: ${patientName} (${species}, ${breed}, ${weight})\nTUTOR: ${tutorName} (Endereço: ${tutor?.address || 'Domicílio'}, ${tutor?.city || 'SP'})\n\nPRESCRIÇÃO:\n1) Tramadol 50mg ---------------------------- 1 caixa com 20 cápsulas\nAdministrar 1 cápsula por via oral a cada 8 horas, por 5 dias consecutivos.\n\nFinalidade: Analgesia pós-procedimento ambulatorial.`
        );
        break;

      case 'REQUISICAO_EXAMES':
        setDocTitle(`Requisição de Exames Complementares - ${patientName}`);
        setDocContent(
          `REQUISIÇÃO DE EXAMES COMPLEMENTARES\n\nPACIENTE: ${patientName} (${species}, ${breed}, ${weight})\nTUTOR: ${tutorName}\nDATA: ${new Date().toLocaleDateString('pt-BR')}\n\nSOLICITAÇÃO DE EXAMES:\n[ ] Hemograma Completo com Pesquisa de Hemoparasitas\n[ ] Perfil Bioquímico Renal: Ureia e Creatinina\n[ ] Perfil Hepático: ALT e Fosfatase Alcalina (FA)\n[ ] Glicemia em Jejum\n[ ] Urinálise (Urina Tipo I / Sedimento)\n[ ] Ultrassonografia Abdominal Total\n[ ] Radiografia Torácica (Projeções Laterolateral e Ventrodorsal)\n\nHIPÓTESE DIAGNÓSTICA / JUSTIFICATIVA:\nInvestigação e acompanhamento clínico ambulatorial.\n\nRECOMENDAÇÕES AO TUTOR:\n- Jejum alimentar de 8 a 12 horas prévio à coleta de sangue/ultrassom.\n- Água à vontade (não suspender água).\n- Para ultrassom abdominal, manter bexiga moderadamente repleta.`
        );
        break;

      case 'ATESTADO_SAUDE':
        setDocTitle(`Atestado de Saúde Animal - ${patientName}`);
        setDocContent(
          `ATESTADO DE SAÚDE ANIMAL\n\nAtesto, sob as penas da lei e para os devidos fins a pedido do tutor, que examinei nesta data o paciente ${patientName}, espécie ${species}, raça ${breed}, encontrando-se clinicamente hígido, livre de ectoparasitas e de sinais compatíveis com doenças infectocontagiosas.\n\nO paciente encontra-se apto para viagens aéreas/terrestres em território nacional e hospedagem em estabelecimentos especializados.\n\nValidade deste atestado: 10 (dez) dias a contar da data de emissão.`
        );
        break;

      case 'ATESTADO_VACINACAO':
        setDocTitle(`Atestado e Declaração de Vacinação - ${patientName}`);
        setDocContent(
          `DECLARAÇÃO DE VACINAÇÃO\n\nAtesto que o animal ${patientName} (${species}, ${breed}), de propriedade de ${tutorName}, recebeu sob minha supervisão profissional os seguintes imunobiológicos:\n\n- Vacina Polivalente (V10/V5) - Lote: NV-2026-X8 - Próximo reforço: 1 ano\n- Vacina Antirrábica - Lote: DEF-8821 - Próximo reforço: 1 ano\n\nAnimal apto e imunizado conforme protocolo sanitário vigente.`
        );
        break;

      case 'TERMO_CONSENTIMENTO_LIVRE':
        setDocTitle(`Termo de Consentimento Livre e Esclarecido - ${patientName}`);
        setDocContent(
          `TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO (TCLE)\n\nEu, ${tutorName}, portador(a) do documento de identidade/CPF, na qualidade de responsável legal pelo paciente ${patientName}, declaro ter sido devidamente informado(a) pelo(a) médico(a) veterinário(a) sobre o estado de saúde do animal, os procedimentos clínicos e diagnósticos recomendados, bem como os riscos e benefícios inerentes.\n\nAutorizo a realização das condutas propostas no ambiente volante/domiciliar.`
        );
        break;

      case 'AUTORIZACAO_SEDACAO':
        setDocTitle(`Autorização para Sedação e Anestesia - ${patientName}`);
        setDocContent(
          `AUTORIZAÇÃO DE PROCEDIMENTO ANESTÉSICO / SEDAÇÃO\n\nEu, ${tutorName}, autorizo o(a) médico(a) veterinário(a) a submeter o paciente ${patientName} ao procedimento de sedação e analgesia para fins de contenção, exames e procedimentos necessários. Declaro estar ciente dos riscos anestésicos mesmo com todos os cuidados e monitorização aplicados.`
        );
        break;

      case 'TERMO_EUTANASIA':
        setDocTitle(`Termo de Autorização de Eutanásia - ${patientName}`);
        setDocContent(
          `TERMO DE AUTORIZAÇÃO DE EUTANÁSIA E LAUDO TÉCNICO JUSTIFICATIVO\n\n(Conforme Resolução CFMV nº 1000/2012)\n\nEu, ${tutorName}, autorizo formalmente a prática de eutanásia humanitária no paciente ${patientName}, em razão de sofrimento irreversível, ausência de resposta terapêutica e término das possibilidades de suporte à vida.\n\nO ato será realizado utilizando métodos científicos que asseguram a ausência de dor, síncope rápida e cessação indolor das funções vitais.`
        );
        break;

      default:
        setDocTitle(`Documento Clínico - ${patientName}`);
        setDocContent(`Documento referente ao paciente ${patientName}.`);
        break;
    }
  };

  const handlePatientChange = (pId: number) => {
    setSelectedPatientId(pId);
    const pt = patients.find((p) => p.id === pId);
    if (!pt) return;

    if (templateSource === 'CUSTOM') {
      const tmpl = customTemplates.find((t) => t.id === selectedCustomTemplateId) || customTemplates[0];
      if (tmpl) applyCustomTemplate(tmpl, pt);
    } else {
      applySystemTemplate(selectedType, pt);
    }
  };

  const handleCustomTemplateSelect = (templateId: number) => {
    setSelectedCustomTemplateId(templateId);
    const tmpl = customTemplates.find((t) => t.id === templateId);
    const pt = patients.find((p) => p.id === selectedPatientId) || patients[0];
    if (tmpl && pt) {
      applyCustomTemplate(tmpl, pt);
    }
  };

  const handleRefreshPatientData = () => {
    const pt = patients.find((p) => p.id === selectedPatientId) || patients[0];
    if (!pt) return;
    if (templateSource === 'CUSTOM') {
      const tmpl = customTemplates.find((t) => t.id === selectedCustomTemplateId);
      if (tmpl) {
        applyCustomTemplate(tmpl, pt);
        showToast('Dados do paciente e tutor reaplicados com sucesso!');
      }
    } else {
      applySystemTemplate(selectedType, pt);
      showToast('Modelo padrão do sistema reaplicado!');
    }
  };

  const handleUseTemplateDirectly = (template: DocumentTemplate) => {
    setSelectedCustomTemplateId(template.id);
    setTemplateSource('CUSTOM');
    const pt = patients.find((p) => p.id === selectedPatientId) || patients[0];
    if (pt) applyCustomTemplate(template, pt);
    setShowModal(true);
  };

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    const pt = patients.find((p) => p.id === selectedPatientId);
    const tut = tutors.find((t) => t.id === pt?.tutor_id);

    try {
      const newDoc = await api.createDocument({
        doc_type: templateSource === 'SYSTEM' ? selectedType : 'TERMO_CONSENTIMENTO_LIVRE',
        title: docTitle,
        patient_id: pt?.id,
        patient_name: pt?.name,
        tutor_id: tut?.id,
        tutor_name: tut?.name,
        content: docContent
      });

      setShowModal(false);
      showToast('Documento emitido e registrado com sucesso!');
      await loadData();
      setViewingDoc(newDoc);
    } catch (err: any) {
      showToast(err.message || 'Erro ao emitir documento.', 'error');
    }
  };

  const handleAIAssistDoc = async () => {
    const pt = patients.find((p) => p.id === selectedPatientId);
    setGeneratingDraft(true);
    try {
      const res = await api.generateDocumentDraft({
        doc_type: selectedType,
        prompt: `Elabore um documento completo e formal de ${docTitle || selectedType} com terminologia veterinária para este paciente.`,
        patient_name: pt?.name,
        tutor_name: pt?.tutor_name,
        species: pt?.species,
        breed: pt?.breed,
      });
      if (res.text) {
        setDocContent(res.text);
      }
    } catch (e: any) {
      showToast(e.message || 'Erro ao gerar documento com IA.', 'error');
    } finally {
      setGeneratingDraft(false);
    }
  };

  const handleCopyText = (content: string) => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    showToast('Texto copiado para a área de transferência!');
    setTimeout(() => setCopied(false), 2500);
  };

  // Custom Template CRUD Operations
  const handleOpenCreateTemplate = () => {
    setEditingTemplate(null);
    setTemplateForm({
      title: '',
      category: 'TERMO',
      description: '',
      content: ''
    });
    setTemplateModalError(null);
    setShowTemplateModal(true);
  };

  const handleOpenEditTemplate = (tmpl: DocumentTemplate) => {
    setEditingTemplate(tmpl);
    setTemplateForm({
      title: tmpl.title,
      category: tmpl.category || 'TERMO',
      description: tmpl.description || '',
      content: tmpl.content
    });
    setTemplateModalError(null);
    setShowTemplateModal(true);
  };

  const handleInsertVariable = (tag: string) => {
    const textarea = templateTextareaRef.current;
    if (!textarea) {
      setTemplateForm((prev) => ({ ...prev, content: prev.content + ' ' + tag }));
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = templateForm.content;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);

    const newContent = before + tag + after;
    setTemplateForm((prev) => ({ ...prev, content: newContent }));

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 50);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setTemplateModalError(null);

    if (!templateForm.title.trim()) {
      setTemplateModalError('Informe o título do modelo.');
      return;
    }
    if (!templateForm.content.trim()) {
      setTemplateModalError('Informe o conteúdo padrão do modelo.');
      return;
    }

    try {
      if (editingTemplate) {
        await api.updateDocumentTemplate(editingTemplate.id, templateForm);
        showToast(`Modelo "${templateForm.title}" atualizado com sucesso!`);
      } else {
        await api.createDocumentTemplate(templateForm);
        showToast(`Novo modelo padrão criado com sucesso!`);
      }
      setShowTemplateModal(false);
      setEditingTemplate(null);
      await loadData();
    } catch (err: any) {
      setTemplateModalError(err.message || 'Erro ao salvar modelo.');
    }
  };

  // In-app Delete Handler
  const handleConfirmDelete = async () => {
    try {
      if (deleteConfirm.type === 'document') {
        await api.deleteDocument(deleteConfirm.id);
        showToast(`Documento "${deleteConfirm.title}" excluído.`);
        if (viewingDoc?.id === deleteConfirm.id) setViewingDoc(null);
      } else {
        await api.deleteDocumentTemplate(deleteConfirm.id);
        showToast(`Modelo de texto padrão excluído.`);
      }
      setDeleteConfirm({ isOpen: false, type: 'document', id: 0, title: '' });
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Erro ao excluir.', 'error');
    }
  };

  // Filtered lists
  const filteredDocs = documents.filter((d) => {
    const q = search.toLowerCase();
    return (
      d.title.toLowerCase().includes(q) ||
      (d.patient_name && d.patient_name.toLowerCase().includes(q)) ||
      (d.tutor_name && d.tutor_name.toLowerCase().includes(q))
    );
  });

  const filteredCustomTemplates = customTemplates.filter((t) => {
    const q = templateSearch.toLowerCase();
    const matchQuery = !q || t.title.toLowerCase().includes(q) || (t.description && t.description.toLowerCase().includes(q)) || t.content.toLowerCase().includes(q);
    const matchCat = templateCategoryFilter === 'ALL' || t.category === templateCategoryFilter;
    return matchQuery && matchCat;
  });

  // Selected patient for active emit modal
  const activePatient = patients.find((p) => p.id === selectedPatientId) || patients[0];
  const activeTutor = tutors.find((t) => t.id === activePatient?.tutor_id);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-emerald-700" />
            Central de Documentos & Modelos
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Crie textos padrão com tags inteligentes para preenchimento automático com dados de paciente e tutor
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'templates' ? (
            <button
              onClick={handleOpenCreateTemplate}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Criar Novo Texto Padrão</span>
            </button>
          ) : (
            <button
              onClick={() => {
                const pt = patients.find((p) => p.id === selectedPatientId) || patients[0];
                if (pt) {
                  if (templateSource === 'CUSTOM' && customTemplates.length > 0) {
                    const tmpl = customTemplates.find((t) => t.id === selectedCustomTemplateId) || customTemplates[0];
                    applyCustomTemplate(tmpl, pt);
                  } else {
                    applySystemTemplate(selectedType, pt);
                  }
                }
                setShowModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Emitir Novo Documento</span>
            </button>
          )}
        </div>
      </div>

      {/* Toast Feedback */}
      {feedbackToast && (
        <div
          className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 shadow-xs transition-all ${
            feedbackToast.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}
        >
          {feedbackToast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          )}
          <span>{feedbackToast.text}</span>
        </div>
      )}

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-slate-200 gap-4">
        <button
          type="button"
          onClick={() => setActiveTab('issued')}
          className={`pb-3 px-1 text-sm font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
            activeTab === 'issued'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileCheck2 className="w-4 h-4" />
          <span>Documentos Emitidos</span>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
            {documents.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('templates')}
          className={`pb-3 px-1 text-sm font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
            activeTab === 'templates'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Bookmark className="w-4 h-4" />
          <span>Modelos & Textos Padrão (Auto-complete)</span>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
            {customTemplates.length}
          </span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: DOCUMENTOS EMITIDOS                                     */}
      {/* ============================================================== */}
      {activeTab === 'issued' && (
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Pesquisar documentos emitidos por título, paciente ou tutor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-600 shadow-2xs"
            />
          </div>

          {/* Documents Grid */}
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">Carregando documentos...</div>
          ) : filteredDocs.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200/80 p-8 text-center space-y-3">
              <FileText className="w-10 h-10 text-slate-300 mx-auto" />
              <div>
                <p className="text-sm font-semibold text-slate-700">Nenhum documento emitido ainda.</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Clique no botão abaixo ou acesse a aba "Modelos & Textos Padrão" para emitir documentos preenchidos automaticamente.
                </p>
              </div>
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-700 text-white hover:bg-emerald-800 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Emitir Primeiro Documento</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs hover:border-emerald-500/50 transition space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                        {doc.doc_type ? doc.doc_type.replace(/_/g, ' ') : 'DOCUMENTO'}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 leading-snug">{doc.title}</h3>

                    <div className="text-xs text-slate-600 space-y-0.5 pt-1">
                      {doc.patient_name && (
                        <div>
                          Paciente: <strong className="text-slate-800">{doc.patient_name}</strong>
                        </div>
                      )}
                      {doc.tutor_name && (
                        <div>
                          Tutor(a): <strong className="text-slate-700">{doc.tutor_name}</strong>
                        </div>
                      )}
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-lg text-[11px] text-slate-500 line-clamp-3 font-mono">
                      {doc.content}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => setViewingDoc(doc)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 hover:underline cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Visualizar / Imprimir
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleCopyText(doc.content)}
                        title="Copiar texto para WhatsApp"
                        className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() =>
                          setDeleteConfirm({
                            isOpen: true,
                            type: 'document',
                            id: doc.id,
                            title: doc.title
                          })
                        }
                        title="Excluir documento"
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: MODELOS & TEXTOS PADRÃO (CUSTOM TEMPLATES)              */}
      {/* ============================================================== */}
      {activeTab === 'templates' && (
        <div className="space-y-5">
          {/* Educational Info Card */}
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-slate-50 p-4 rounded-xl border border-emerald-200/70 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-emerald-700" />
                <h2 className="text-sm font-bold text-slate-900">
                  Biblioteca de Textos Padrão com Variáveis Dinâmicas
                </h2>
              </div>
              <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
                Cadastre seus modelos de laudos, termos e receitas. Ao emitir para qualquer animal, o sistema
                substitui automaticamente variáveis como{' '}
                <code className="text-emerald-800 font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-emerald-200 text-[11px]">
                  {'{nome_paciente}'}
                </code>
                ,{' '}
                <code className="text-emerald-800 font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-emerald-200 text-[11px]">
                  {'{nome_tutor}'}
                </code>
                ,{' '}
                <code className="text-emerald-800 font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-emerald-200 text-[11px]">
                  {'{peso}'}
                </code>{' '}
                e{' '}
                <code className="text-emerald-800 font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-emerald-200 text-[11px]">
                  {'{data_atual}'}
                </code>{' '}
                pelos dados reais do cadastro!
              </p>
            </div>

            <button
              onClick={handleOpenCreateTemplate}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-800 shadow-xs transition cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Criar Novo Texto Padrão</span>
            </button>
          </div>

          {/* Search & Category Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Pesquisar nos modelos de texto por título ou palavra-chave..."
                value={templateSearch}
                onChange={(e) => setTemplateSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-600 shadow-2xs"
              />
            </div>

            <div className="sm:w-56">
              <select
                value={templateCategoryFilter}
                onChange={(e) => setTemplateCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-600 shadow-2xs"
              >
                <option value="ALL">Todas as categorias</option>
                <option value="TERMO">Termos & TCLE</option>
                <option value="ORIENTACOES">Orientações Pós-Op / Alta</option>
                <option value="ATESTADO">Atestados Sanitários</option>
                <option value="RECEITA">Receitas & Protocolos</option>
                <option value="LAUDO">Laudos Técnicos</option>
                <option value="DECLARACAO">Declarações</option>
                <option value="OUTRO">Outros</option>
              </select>
            </div>
          </div>

          {/* Templates Grid */}
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">Carregando modelos...</div>
          ) : filteredCustomTemplates.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200/80 p-8 text-center space-y-3">
              <Bookmark className="w-10 h-10 text-slate-300 mx-auto" />
              <div>
                <p className="text-sm font-semibold text-slate-700">Nenhum modelo encontrado.</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Crie seu primeiro texto padrão clicando no botão abaixo para agilizar sua rotina diária.
                </p>
              </div>
              <button
                onClick={handleOpenCreateTemplate}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-700 text-white hover:bg-emerald-800 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Criar Texto Padrão</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCustomTemplates.map((tmpl) => {
                const catInfo = CATEGORY_LABELS[tmpl.category] || CATEGORY_LABELS.OUTRO;
                // Count how many dynamic variables exist in the content
                const matchedVariables = TEMPLATE_VARIABLES.filter(v => tmpl.content.includes(v.tag));

                return (
                  <div
                    key={tmpl.id}
                    className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs hover:border-emerald-500/50 transition flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${catInfo.color}`}>
                          {catInfo.label}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditTemplate(tmpl)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition cursor-pointer"
                            title="Editar texto padrão"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteConfirm({
                                isOpen: true,
                                type: 'template',
                                id: tmpl.id,
                                title: tmpl.title
                              })
                            }
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition cursor-pointer"
                            title="Excluir modelo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 leading-snug">{tmpl.title}</h3>

                      {tmpl.description && (
                        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                          {tmpl.description}
                        </p>
                      )}

                      {/* Content Preview */}
                      <div className="p-3 bg-slate-50 rounded-lg text-[11px] text-slate-600 line-clamp-4 font-mono leading-relaxed border border-slate-100">
                        {tmpl.content}
                      </div>

                      {/* Dynamic tags present */}
                      <div className="pt-1 flex flex-wrap gap-1">
                        {matchedVariables.length > 0 ? (
                          matchedVariables.slice(0, 4).map((v) => (
                            <span
                              key={v.tag}
                              className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-100"
                            >
                              {v.tag}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Sem variáveis dinâmicas</span>
                        )}
                        {matchedVariables.length > 4 && (
                          <span className="text-[10px] text-slate-400 self-center">
                            +{matchedVariables.length - 4} mais
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">
                        Auto-preenche ao emitir
                      </span>

                      <button
                        type="button"
                        onClick={() => handleUseTemplateDirectly(tmpl)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white transition cursor-pointer"
                      >
                        <span>Usar este Modelo</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: EMITIR DOCUMENTO COM AUTO-COMPLETE                     */}
      {/* ============================================================== */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-emerald-700" />
                <span>Emitir Documento Veterinário</span>
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDocument} className="mt-4 space-y-4">
              {/* Paciente e Tutor Selecionado */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Paciente & Tutor Responsável *
                  </label>
                  <button
                    type="button"
                    onClick={handleRefreshPatientData}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                    title="Recarrega as variáveis do modelo com os dados atualizados deste pet"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Reaplicar / Atualizar Dados</span>
                  </button>
                </div>

                <select
                  value={selectedPatientId}
                  onChange={(e) => handlePatientChange(parseInt(e.target.value))}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none bg-white font-medium text-slate-900"
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      #{formatPatientCode(p)} - {p.name} ({p.species} • {p.breed || 'SRD'} • {p.weight_kg ? `${p.weight_kg}kg` : 'peso n/inf'}) — Tutor(a): #{formatTutorCode(p.tutor_id)} {p.tutor_name || 'Tutor'}
                    </option>
                  ))}
                </select>

                {activePatient && (
                  <div className="text-[11px] text-slate-500 flex items-center justify-between flex-wrap gap-1 pt-0.5">
                    <span>
                      Tutor: <strong>{activeTutor?.name || activePatient.tutor_name}</strong>
                      {activeTutor?.cpf && ` • CPF: ${activeTutor.cpf}`}
                    </span>
                    <span>
                      {activeTutor?.phone && `Contato: ${activeTutor.phone}`}
                    </span>
                  </div>
                )}
              </div>

              {/* Source Switcher: Meus Modelos Personalizados vs Modelos do Sistema */}
              <div className="space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Origem do Modelo *
                  </label>
                  <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setTemplateSource('CUSTOM');
                        const tmpl = customTemplates.find((t) => t.id === selectedCustomTemplateId) || customTemplates[0];
                        if (tmpl && activePatient) applyCustomTemplate(tmpl, activePatient);
                      }}
                      className={`px-3 py-1 rounded-md font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                        templateSource === 'CUSTOM'
                          ? 'bg-emerald-700 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Bookmark className="w-3.5 h-3.5" />
                      <span>Meus Modelos ({customTemplates.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTemplateSource('SYSTEM');
                        if (activePatient) applySystemTemplate(selectedType, activePatient);
                      }}
                      className={`px-3 py-1 rounded-md font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                        templateSource === 'SYSTEM'
                          ? 'bg-emerald-700 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Padrões do Sistema</span>
                    </button>
                  </div>
                </div>

                {/* Custom Template Dropdown */}
                {templateSource === 'CUSTOM' ? (
                  <div>
                    {customTemplates.length > 0 ? (
                      <select
                        value={selectedCustomTemplateId || ''}
                        onChange={(e) => handleCustomTemplateSelect(parseInt(e.target.value))}
                        className="w-full px-3 py-2 text-xs sm:text-sm border border-emerald-300 rounded-lg outline-none bg-emerald-50/30 font-medium text-slate-800"
                      >
                        {customTemplates.map((t) => (
                          <option key={t.id} value={t.id}>
                            [{t.category}] {t.title}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-center justify-between">
                        <span>Você ainda não criou nenhum modelo personalizado.</span>
                        <button
                          type="button"
                          onClick={() => {
                            setShowModal(false);
                            setActiveTab('templates');
                            handleOpenCreateTemplate();
                          }}
                          className="font-bold underline cursor-pointer"
                        >
                          Criar agora
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  /* System Templates Dropdown */
                  <select
                    value={selectedType}
                    onChange={(e) => {
                      const newType = e.target.value as DocumentType;
                      setSelectedType(newType);
                      if (activePatient) applySystemTemplate(newType, activePatient);
                    }}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none bg-white font-medium"
                  >
                    <option value="RECEITA_SIMPLES">Receita Médica Simples</option>
                    <option value="RECEITA_CONTROLE_ESPECIAL">Receita de Controle Especial (MAPA / Notificação)</option>
                    <option value="REQUISICAO_EXAMES">Requisição de Exames Complementares</option>
                    <option value="ATESTADO_SAUDE">Atestado de Saúde Animal</option>
                    <option value="ATESTADO_VACINACAO">Atestado de Vacinação</option>
                    <option value="TERMO_CONSENTIMENTO_LIVRE">Termo de Consentimento Livre e Esclarecido (TCLE)</option>
                    <option value="AUTORIZACAO_SEDACAO">Autorização para Sedação / Anestesia</option>
                    <option value="TERMO_EUTANASIA">Termo de Eutanásia</option>
                  </select>
                )}
              </div>

              {/* Título do Documento */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Título do Documento *
                </label>
                <input
                  type="text"
                  required
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none"
                />
              </div>

              {/* Conteúdo Gerado & Editável */}
              <div>
                <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                  <div className="flex items-center gap-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Conteúdo Preenchido (Totalmente Editável) *
                    </label>
                    <span className="text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded font-medium border border-emerald-200">
                      Auto-completado com dados do pet e tutor
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleAIAssistDoc}
                    disabled={generatingDraft}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>{generatingDraft ? 'Gerando com IA...' : 'Aprimorar com IA'}</span>
                  </button>
                </div>

                <textarea
                  required
                  rows={11}
                  value={docContent}
                  onChange={(e) => setDocContent(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg outline-none leading-relaxed"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white transition cursor-pointer"
                >
                  Salvar e Visualizar Impressão
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: CRIAR / EDITAR MODELO DE TEXTO PADRÃO                  */}
      {/* ============================================================== */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-xl border border-slate-200 overflow-y-auto max-h-[92vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-emerald-700" />
                <span>{editingTemplate ? 'Editar Texto Padrão' : 'Novo Texto Padrão (Modelo)'}</span>
              </h3>
              <button
                onClick={() => {
                  setShowTemplateModal(false);
                  setEditingTemplate(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {templateModalError && (
              <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{templateModalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveTemplate} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Título do Modelo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Termo de Responsabilidade e Alta a Pedido"
                    value={templateForm.title}
                    onChange={(e) => setTemplateForm({ ...templateForm, title: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Categoria *
                  </label>
                  <select
                    value={templateForm.category}
                    onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value as TemplateCategory })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none bg-white"
                  >
                    <option value="TERMO">Termo / TCLE</option>
                    <option value="ORIENTACOES">Orientações</option>
                    <option value="ATESTADO">Atestado</option>
                    <option value="RECEITA">Receita</option>
                    <option value="LAUDO">Laudo</option>
                    <option value="DECLARACAO">Declaração</option>
                    <option value="OUTRO">Personalizado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Descrição Curta (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Utilizado quando o tutor retira o paciente contra indicação médica"
                  value={templateForm.description}
                  onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none"
                />
              </div>

              {/* Dynamic Variables helper bar */}
              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Variáveis Dinâmicas (Clique para inserir no texto):</span>
                  </span>
                  <span className="text-[11px] text-emerald-700 font-medium">
                    Preenchimento 100% automático
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1 bg-white/80 rounded-lg border border-emerald-200/50">
                  {TEMPLATE_VARIABLES.map((v) => (
                    <button
                      key={v.tag}
                      type="button"
                      onClick={() => handleInsertVariable(v.tag)}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-white hover:bg-emerald-100/70 border border-slate-200 hover:border-emerald-300 rounded-md text-[11px] text-slate-800 transition cursor-pointer shadow-2xs"
                      title={v.desc}
                    >
                      <span className="font-mono text-emerald-800 font-bold">{v.tag}</span>
                      <span className="text-[10px] text-slate-500">({v.label})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Template Editor with Live Preview Toggle */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Texto do Modelo (Conteúdo com as Tags) *
                  </label>
                  <button
                    type="button"
                    onClick={() => setPreviewSampleData(!previewSampleData)}
                    className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
                  >
                    {previewSampleData ? 'Voltar para Edição' : 'Visualizar com Dados de Exemplo'}
                  </button>
                </div>

                {previewSampleData ? (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono leading-relaxed text-slate-800 whitespace-pre-wrap max-h-72 overflow-y-auto">
                    {fillTemplateVariables(
                      templateForm.content,
                      {
                        id: 999,
                        owner_id: 1,
                        tutor_id: 1,
                        name: 'Thor',
                        species: 'Canina',
                        breed: 'Golden Retriever',
                        gender: 'Macho',
                        approximate_age: '3 anos',
                        weight_kg: 32.5,
                        coat_color: 'Dourado',
                        is_neutered: true,
                        microchip: '981098102345678',
                        is_active: true,
                        created_at: new Date().toISOString()
                      },
                      {
                        id: 1,
                        owner_id: 1,
                        name: 'Mariana Silveira Ramos',
                        cpf: '123.456.789-00',
                        phone: '(11) 98765-4321',
                        is_active: true,
                        address: 'Av. Paulista',
                        address_number: '1000',
                        city: 'São Paulo',
                        state: 'SP',
                        created_at: new Date().toISOString()
                      }
                    )}
                  </div>
                ) : (
                  <textarea
                    ref={templateTextareaRef}
                    required
                    rows={10}
                    placeholder="Digite o texto padrão aqui. Use os botões acima para inserir as variáveis automáticas como {nome_paciente}, {nome_tutor}, {peso}, etc."
                    value={templateForm.content}
                    onChange={(e) => setTemplateForm({ ...templateForm, content: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg outline-none leading-relaxed"
                  />
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowTemplateModal(false);
                    setEditingTemplate(null);
                  }}
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white transition cursor-pointer"
                >
                  {editingTemplate ? 'Salvar Alterações' : 'Salvar Novo Modelo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: VIEW & PRINT DOCUMENT                                   */}
      {/* ============================================================== */}
      {viewingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 overflow-y-auto max-h-[90vh] space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 print:hidden">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Documento Oficial Veterinário
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyText(viewingDoc.content)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => exportToPdf('printable-document-template', `Documento_${viewingDoc.title || 'Veterinario'}`)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-800 transition cursor-pointer"
                  title="Baixar arquivo PDF do documento no dispositivo"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => printElement('printable-document-template', `Documento_${viewingDoc.title || 'Veterinario'}`)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition cursor-pointer"
                  title="Imprimir documento em folha A4 limpa"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir A4</span>
                </button>

                <button
                  onClick={() => setViewingDoc(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Printable Body */}
            <div id="printable-document-template" className="printable-document space-y-6 text-slate-800">
              {/* Professional Vet Header */}
              <div className="text-center border-b border-slate-300 pb-4">
                <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                  {user?.clinic_name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Clínica Veterinária'}
                </h2>
                <div className="text-xs font-semibold text-emerald-800 mt-0.5">
                  Médico(a) Veterinário(a) • {user?.crmv ? `CRMV-${user.crmv_uf || 'SP'} ${user.crmv}` : 'CRMV não informado'}
                </div>
                {user?.phone && (
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Contato: {user.phone} • Atendimento Volante e Domiciliar
                  </div>
                )}
              </div>

              {/* Title & Metadata */}
              <div className="text-center space-y-1">
                <h3 className="text-sm font-bold uppercase tracking-wide text-slate-900">
                  {viewingDoc.title}
                </h3>
                <div className="text-xs text-slate-500 font-mono">
                  Data de emissão: {new Date(viewingDoc.created_at).toLocaleDateString('pt-BR')}
                </div>
              </div>

              {/* Document Text */}
              <div className="p-4 bg-slate-50/50 border border-slate-200 rounded-xl whitespace-pre-wrap font-sans text-xs leading-relaxed text-slate-800">
                {viewingDoc.content}
              </div>

              {/* Signature Line */}
              <div className="pt-12 text-center">
                <div className="w-56 border-t border-slate-400 mx-auto"></div>
                <div className="text-xs font-bold text-slate-800 mt-1">
                  Dr(a). {user?.first_name} {user?.last_name || ''}
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  CRMV-{user?.crmv_uf || 'SP'} {user?.crmv || '34892'}
                </div>
              </div>

              {/* Discrete Vetgo Footer */}
              <div className="pt-6 border-t border-slate-200 text-center text-[10px] text-slate-400">
                Documento emitido via <strong>Vetgo</strong> • Veterinária onde você precisa
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* IN-APP CONFIRMATION MODAL FOR DELETION                          */}
      {/* ============================================================== */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Confirmar Exclusão
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Esta ação não pode ser desfeita.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700">
              Deseja realmente excluir {deleteConfirm.type === 'document' ? 'o documento' : 'o modelo de texto padrão'}:{' '}
              <strong className="text-slate-900 font-bold block mt-1">
                "{deleteConfirm.title}"
              </strong>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteConfirm({ isOpen: false, type: 'document', id: 0, title: '' })}
                className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition cursor-pointer"
              >
                Excluir Definitivamente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
