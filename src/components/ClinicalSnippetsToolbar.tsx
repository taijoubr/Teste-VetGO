import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Search,
  Plus,
  Trash2,
  Check,
  X,
  FileText,
  Stethoscope,
  Activity,
  Heart,
  Pill,
  Scissors
} from 'lucide-react';
import {
  ClinicalSnippet,
  ClinicalSnippetCategory
} from '../types';
import {
  getAllClinicalSnippets,
  saveCustomSnippet,
  deleteCustomSnippet
} from '../utils/clinicalSnippets';

interface ClinicalSnippetsToolbarProps {
  category?: ClinicalSnippetCategory;
  onInsert: (text: string, mode: 'append' | 'replace') => void;
  className?: string;
}

export const ClinicalSnippetsToolbar: React.FC<ClinicalSnippetsToolbarProps> = ({
  category,
  onInsert,
  className = '',
}) => {
  const [snippets, setSnippets] = useState<ClinicalSnippet[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>(category || 'ALL');
  const [showAddSnippet, setShowAddSnippet] = useState(false);
  const [insertedSnippetId, setInsertedSnippetId] = useState<string | null>(null);

  // New snippet form
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<ClinicalSnippetCategory>(category || 'EXAME_FISICO');
  const [newText, setNewText] = useState('');
  const [newShortcut, setNewShortcut] = useState('');

  const refreshSnippets = () => {
    setSnippets(getAllClinicalSnippets());
  };

  useEffect(() => {
    refreshSnippets();
  }, []);

  const relevantSnippets = snippets.filter((s) => !category || s.category === category);
  const topPills = relevantSnippets.slice(0, 4);

  const handleApply = (snippet: ClinicalSnippet, mode: 'append' | 'replace') => {
    onInsert(snippet.text, mode);
    setInsertedSnippetId(snippet.id);
    setTimeout(() => setInsertedSnippetId(null), 2500);
    if (showModal) {
      setShowModal(false);
    }
  };

  const handleSaveCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newText.trim()) return;

    saveCustomSnippet({
      title: newTitle.trim(),
      category: newCategory,
      text: newText.trim(),
      shortcut: newShortcut.trim() || undefined,
    });

    setNewTitle('');
    setNewText('');
    setNewShortcut('');
    setShowAddSnippet(false);
    refreshSnippets();
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteCustomSnippet(id);
    refreshSnippets();
  };

  const filteredModalSnippets = snippets.filter((s) => {
    const matchesCategory = activeCategoryFilter === 'ALL' || s.category === activeCategoryFilter;
    const matchesSearch =
      !searchQuery.trim() ||
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.shortcut && s.shortcut.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className={`flex flex-wrap items-center gap-1.5 py-1 ${className}`}>
      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1 shrink-0 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
        <Sparkles className="w-3 h-3 text-emerald-600" />
        Snippets Rápidos:
      </span>

      {topPills.map((snippet) => (
        <button
          key={snippet.id}
          type="button"
          onClick={() => handleApply(snippet, 'append')}
          title="Clique para adicionar este texto ao campo"
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-white text-slate-700 hover:text-emerald-800 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 transition-colors shadow-2xs cursor-pointer truncate max-w-[200px]"
        >
          {insertedSnippetId === snippet.id ? (
            <Check className="w-3 h-3 text-emerald-600" />
          ) : null}
          <span className="truncate">{snippet.title}</span>
        </button>
      ))}

      <button
        type="button"
        onClick={() => {
          setActiveCategoryFilter(category || 'ALL');
          setShowModal(true);
        }}
        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 transition cursor-pointer"
        title="Ver todos os textos prontos e gerenciar modelos personalizados"
      >
        <span>+ Todos ({snippets.length})</span>
      </button>

      {/* Modal Completo de Snippets Clínicos */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-3 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6 animate-fade-in flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-white/10 text-emerald-200">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">
                    Biblioteca de Snippets & Textos Prontos
                  </h3>
                  <p className="text-emerald-100 text-xs">
                    Modelos padronizados de exame físico, anamnese e conduta veterinária
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-header / Filters */}
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 space-y-2.5 shrink-0">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar por termo (ex: normal, vômito, ausculta, pós-op, ASA)..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-emerald-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddSnippet(!showAddSnippet)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-800 flex items-center gap-1 shrink-0 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Novo Snippet</span>
                </button>
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                {[
                  { id: 'ALL', label: 'Todos' },
                  { id: 'EXAME_FISICO', label: 'Exame Físico' },
                  { id: 'ANAMNESE', label: 'Anamnese' },
                  { id: 'CONDUTA', label: 'Conduta & Cuidados' },
                  { id: 'ANESTESIA', label: 'Pré-Anestésico' },
                  { id: 'CIRURGIA', label: 'Pós-Cirúrgico' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategoryFilter(cat.id)}
                    className={`px-2.5 py-1 rounded-lg font-semibold shrink-0 transition cursor-pointer ${
                      activeCategoryFilter === cat.id
                        ? 'bg-emerald-700 text-white shadow-2xs'
                        : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Form to create new custom snippet */}
            {showAddSnippet && (
              <form onSubmit={handleSaveCustom} className="p-4 bg-emerald-50/50 border-b border-emerald-200 space-y-3 shrink-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    <Plus className="w-4 h-4 text-emerald-700" />
                    Criar Novo Modelo Personalizado
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowAddSnippet(false)}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    Cancelar
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Título do Modelo *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Minha conduta de vômito / Protocolo de Otite"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Categoria *</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as ClinicalSnippetCategory)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-none"
                    >
                      <option value="EXAME_FISICO">Exame Físico</option>
                      <option value="ANAMNESE">Anamnese</option>
                      <option value="CONDUTA">Conduta & Cuidados</option>
                      <option value="ANESTESIA">Pré-Anestésico</option>
                      <option value="CIRURGIA">Cirurgia & Pós-Op</option>
                      <option value="OUTROS">Outros</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Texto Clínico Completo *</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Digite o texto que será inserido com 1 clique no prontuário..."
                    value={newText}
                    onChange={(e) => setNewText(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddSnippet(false)}
                    className="px-3 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Descartar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-bold bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition"
                  >
                    Salvar Snippet
                  </button>
                </div>
              </form>
            )}

            {/* Snippets List */}
            <div className="p-3.5 space-y-2.5 overflow-y-auto flex-1">
              {filteredModalSnippets.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Nenhum modelo clínico encontrado para a busca informada.
                </div>
              ) : (
                filteredModalSnippets.map((snippet) => (
                  <div
                    key={snippet.id}
                    className="p-3 rounded-xl border border-slate-200 bg-white hover:border-emerald-300 transition-all shadow-2xs group space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 group-hover:text-emerald-800 transition-colors">
                          {snippet.title}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {snippet.category.replace('_', ' ')}
                        </span>
                        {snippet.isCustom && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                            Meu Modelo
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {snippet.isCustom && (
                          <button
                            type="button"
                            onClick={(e) => handleDelete(snippet.id, e)}
                            title="Excluir meu modelo"
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleApply(snippet, 'replace')}
                          className="px-2 py-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md border border-slate-200 transition"
                          title="Substitui todo o conteúdo atual pelo modelo"
                        >
                          Substituir
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApply(snippet, 'append')}
                          className="px-3 py-1 text-[11px] font-bold bg-emerald-700 text-white hover:bg-emerald-800 rounded-md shadow-2xs transition flex items-center gap-1"
                          title="Acrescenta este texto ao final do campo"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Inserir</span>
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-sans">
                      {snippet.text}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between shrink-0">
              <span>{snippets.length} modelos clínicos disponíveis</span>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-3 py-1 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold rounded-lg text-xs"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
