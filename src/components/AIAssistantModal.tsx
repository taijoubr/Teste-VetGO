import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Sparkles,
  Mic,
  MicOff,
  Wand2,
  Check,
  AlertCircle,
  X,
  FileText,
  Activity,
  Stethoscope,
  Pill
} from 'lucide-react';

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (data: {
    chief_complaint?: string;
    anamnesis?: string;
    physical_exam?: string;
    diagnostic_hypothesis?: string;
    treatment_plan?: string;
    prescription?: string;
    summary?: string;
  }) => void;
  patientContext?: {
    name?: string;
    species?: string;
    breed?: string;
    weight_kg?: number;
    age?: string;
  };
}

export const AIAssistantModal: React.FC<AIAssistantModalProps> = ({
  isOpen,
  onClose,
  onApply,
  patientContext,
}) => {
  const [rawText, setRawText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);

  // Reconhecimento de Voz nativo do navegador (Web Speech API)
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSpeechSupported(!!SpeechRecognition);
  }, []);

  const toggleRecording = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (isRecording) {
      setIsRecording(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'pt-BR';
      recognition.continuous = true;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript + ' ';
        }
        setRawText((prev) => (prev ? prev + ' ' + transcript : transcript).trim());
      };

      recognition.onerror = () => {
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
    } catch {
      setIsRecording(false);
    }
  };

  const handleProcess = async () => {
    if (!rawText.trim()) {
      setError('Por favor, digite ou dite um relato clínico primeiro.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const res = await api.structureConsultation(rawText, patientContext);
      setResult(res.data);
    } catch (e: any) {
      setError(e.message || 'Falha ao processar com IA.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmApply = () => {
    if (result) {
      onApply(result);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-fade-in my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-800 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">
                Assistente Clínico IA (Gemini)
              </h3>
              <p className="text-emerald-100 text-xs mt-0.5">
                {patientContext?.name
                  ? `Atendimento para: ${patientContext.name} (${patientContext.species || 'Animal'})`
                  : 'Dite ou digite o relato e a IA organizará os campos do prontuário'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!result ? (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Relato Livre do Atendimento (Voz ou Texto)
                  </label>
                  {speechSupported && (
                    <button
                      type="button"
                      onClick={toggleRecording}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
                        isRecording
                          ? 'bg-rose-100 text-rose-700 animate-pulse border border-rose-300'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                      <span>{isRecording ? 'Ouvindo... (Clique para parar)' : 'Ditar por Voz'}</span>
                    </button>
                  )}
                </div>

                <textarea
                  rows={6}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Ex: Cão macho de 4 anos veio para consulta com vômito e apatia há 2 dias. Mucosas hipocoradas, TPC 2s, sem dor abdominal. Suspeita de gastrite alimentar. Prescrito Omeprazol 10mg SID por 7 dias e dieta pastosa leve..."
                  className="w-full p-3.5 text-xs sm:text-sm border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 font-sans shadow-2xs leading-relaxed"
                />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1">
                <span className="font-bold text-slate-800 flex items-center gap-1">
                  <Wand2 className="w-3.5 h-3.5 text-emerald-700" />
                  Como funciona:
                </span>
                <p>
                  A IA analisa seu relato e separa automaticamente em: <strong>Queixa Principal</strong>, <strong>Anamnese</strong>, <strong>Exame Físico</strong>, <strong>Suspeita Diagnóstica</strong> e <strong>Prescrição</strong>. Você poderá revisar tudo antes de salvar no prontuário.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleProcess}
                  disabled={loading || !rawText.trim()}
                  className="px-5 py-2.5 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Sparkles className="w-4 h-4 animate-spin text-amber-300" />
                      <span>Estruturando Prontuário com IA...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>Estruturar Prontuário</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Visualização dos Campos Estruturados */
            <div className="space-y-3.5">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-medium">
                ✅ <strong>Relato estruturado com sucesso!</strong> Revise abaixo e clique em <em>Aplicar no Prontuário</em> para transferir os dados para a ficha do paciente.
              </div>

              {result.summary && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <span className="font-bold text-slate-700 block mb-0.5">Resumo Clínico:</span>
                  <p className="text-slate-800">{result.summary}</p>
                </div>
              )}

              <div className="space-y-2 text-xs">
                {result.chief_complaint && (
                  <div className="p-2.5 rounded-lg border border-slate-200">
                    <span className="font-bold text-slate-600 block mb-0.5">Queixa Principal:</span>
                    <p className="text-slate-800">{result.chief_complaint}</p>
                  </div>
                )}

                {result.anamnesis && (
                  <div className="p-2.5 rounded-lg border border-slate-200">
                    <span className="font-bold text-slate-600 block mb-0.5">Anamnese / Histórico:</span>
                    <p className="text-slate-800 whitespace-pre-wrap">{result.anamnesis}</p>
                  </div>
                )}

                {result.physical_exam && (
                  <div className="p-2.5 rounded-lg border border-slate-200">
                    <span className="font-bold text-slate-600 block mb-0.5">Exame Físico:</span>
                    <p className="text-slate-800 whitespace-pre-wrap">{result.physical_exam}</p>
                  </div>
                )}

                {result.diagnostic_hypothesis && (
                  <div className="p-2.5 rounded-lg border border-slate-200">
                    <span className="font-bold text-slate-600 block mb-0.5">Suspeita Diagnóstica:</span>
                    <p className="text-slate-800">{result.diagnostic_hypothesis}</p>
                  </div>
                )}

                {result.prescription && (
                  <div className="p-2.5 rounded-lg border border-emerald-200 bg-emerald-50/30">
                    <span className="font-bold text-emerald-800 block mb-0.5">Conduta & Prescrição:</span>
                    <p className="text-slate-800 whitespace-pre-wrap">{result.prescription}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setResult(null)}
                  className="px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
                >
                  Voltar e Editar Relato
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Descartar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmApply}
                    className="px-5 py-2.5 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Aplicar no Prontuário</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
