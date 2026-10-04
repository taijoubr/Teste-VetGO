import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { DocumentRecord, DocumentType, Patient, Tutor } from '../types';
import {
  FileText,
  Plus,
  Search,
  Printer,
  Share2,
  Copy,
  CheckCircle2,
  X,
  FileCheck2,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const DocumentsPage: React.FC = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // View / Print Modal
  const [viewingDoc, setViewingDoc] = useState<DocumentRecord | null>(null);
  const [copied, setCopied] = useState(false);

  // New Doc Modal
  const [showModal, setShowModal] = useState(false);
  const [selectedType, setSelectedType] = useState<DocumentType>('RECEITA_SIMPLES');
  const [selectedPatientId, setSelectedPatientId] = useState<number>(1);
  const [docTitle, setDocTitle] = useState('');
  const [docContent, setDocContent] = useState('');
  const [generatingDraft, setGeneratingDraft] = useState(false);

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
      alert(e.message || 'Erro ao gerar documento com IA.');
    } finally {
      setGeneratingDraft(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [docs, pts, tuts] = await Promise.all([
        api.getDocuments(),
        api.getPatients(),
        api.getTutors()
      ]);
      setDocuments(docs);
      setPatients(pts);
      setTutors(tuts);
      if (pts.length > 0) {
        setSelectedPatientId(pts[0].id);
        applyTemplate('RECEITA_SIMPLES', pts[0], tuts);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const applyTemplate = (type: DocumentType, patient: Patient, tutsList = tutors) => {
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

  const handleTypeChange = (type: DocumentType) => {
    setSelectedType(type);
    const pt = patients.find((p) => p.id === selectedPatientId) || patients[0];
    if (pt) applyTemplate(type, pt);
  };

  const handlePatientChange = (pId: number) => {
    setSelectedPatientId(pId);
    const pt = patients.find((p) => p.id === pId);
    if (pt) applyTemplate(selectedType, pt);
  };

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    const pt = patients.find((p) => p.id === selectedPatientId);
    const tut = tutors.find((t) => t.id === pt?.tutor_id);

    const newDoc = await api.createDocument({
      doc_type: selectedType,
      title: docTitle,
      patient_id: pt?.id,
      patient_name: pt?.name,
      tutor_id: tut?.id,
      tutor_name: tut?.name,
      content: docContent
    });

    setShowModal(false);
    loadData();
    setViewingDoc(newDoc);
  };

  const handleCopyText = (content: string) => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const filteredDocs = documents.filter((d) => {
    const q = search.toLowerCase();
    return (
      d.title.toLowerCase().includes(q) ||
      (d.patient_name && d.patient_name.toLowerCase().includes(q)) ||
      (d.tutor_name && d.tutor_name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-emerald-700" />
            Central de Documentos & Termos
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Receituários simples e de controle especial, atestados, TCLE e termos com layout profissional
          </p>
        </div>

        <button
          onClick={() => {
            const pt = patients.find((p) => p.id === selectedPatientId) || patients[0];
            if (pt) applyTemplate(selectedType, pt);
            setShowModal(true);
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Emitir Novo Documento</span>
        </button>
      </div>

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
        <div className="bg-white rounded-xl border border-slate-200/80 p-8 text-center">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">Nenhum documento emitido.</p>
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
                  <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                    {doc.doc_type.replace(/_/g, ' ')}
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

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => setViewingDoc(doc)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 hover:underline cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Visualizar / Imprimir
                </button>

                <button
                  onClick={() => handleCopyText(doc.content)}
                  title="Copiar texto para WhatsApp"
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View & Print Document Modal */}
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
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-700 text-white hover:bg-emerald-800 transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir / Salvar PDF</span>
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
            <div className="space-y-6 text-slate-800">
              {/* Professional Vet Header */}
              <div className="text-center border-b border-slate-300 pb-4">
                <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                  {user?.clinic_name || `${user?.first_name} ${user?.last_name}`}
                </h2>
                <div className="text-xs font-semibold text-emerald-800 mt-0.5">
                  Médico(a) Veterinário(a) • CRMV-{user?.crmv_uf || 'SP'} {user?.crmv || '34892'}
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
                  Dr(a). {user?.first_name} {user?.last_name}
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

      {/* New Document Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Emitir Documento Veterinário</h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDocument} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tipo de Documento *
                  </label>
                  <select
                    value={selectedType}
                    onChange={(e) => handleTypeChange(e.target.value as DocumentType)}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none bg-white"
                  >
                    <option value="RECEITA_SIMPLES">Receita Simples</option>
                    <option value="RECEITA_CONTROLE_ESPECIAL">Receita de Controle Especial (MAPA)</option>
                    <option value="REQUISICAO_EXAMES">Requisição de Exames Complementares (Laboratório & Imagem)</option>
                    <option value="ATESTADO_SAUDE">Atestado de Saúde Animal</option>
                    <option value="ATESTADO_VACINACAO">Atestado de Vacinação</option>
                    <option value="TERMO_CONSENTIMENTO_LIVRE">Termo de Consentimento Livre (TCLE)</option>
                    <option value="AUTORIZACAO_SEDACAO">Autorização de Sedação / Anestesia</option>
                    <option value="TERMO_EUTANASIA">Termo de Eutanásia</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Paciente / Tutor *
                  </label>
                  <select
                    value={selectedPatientId}
                    onChange={(e) => handlePatientChange(parseInt(e.target.value))}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none bg-white"
                  >
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.species} • Tutor: {p.tutor_name})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

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

              <div>
                <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                  <label className="block text-xs font-semibold text-slate-700">
                    Conteúdo do Documento (Totalmente Editável) *
                  </label>
                  <button
                    type="button"
                    onClick={handleAIAssistDoc}
                    disabled={generatingDraft}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>{generatingDraft ? 'Gerando com IA...' : 'Gerar Rascunho com IA'}</span>
                  </button>
                </div>
                <textarea
                  required
                  rows={10}
                  value={docContent}
                  onChange={(e) => setDocContent(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg outline-none"
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
                  Salvar e Visualizar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
