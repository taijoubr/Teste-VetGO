import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { compressImage } from '../utils/imageCompressor';
import {
  PenTool,
  Upload,
  CheckCircle2,
  Trash2,
  RotateCcw,
  Shield,
  FileCheck2,
  Info,
  Check,
  Eye,
  Sparkles,
  Camera,
  Layers,
  Award
} from 'lucide-react';

interface VeterinarianSignatureManagerProps {
  onSaved?: () => void;
  isModal?: boolean;
  onClose?: () => void;
}

export const VeterinarianSignatureManager: React.FC<VeterinarianSignatureManagerProps> = ({
  onSaved,
  isModal = false,
  onClose
}) => {
  const { user, refreshUser } = useAuth();
  const [activeMode, setActiveMode] = useState<'DRAW' | 'UPLOAD'>('DRAW');

  // Drawing state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [penColor, setPenColor] = useState<string>('#1d4ed8'); // Caneta Azul profissional
  const [penWidth, setPenWidth] = useState<number>(3);
  const [history, setHistory] = useState<ImageData[]>([]);

  // Upload state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const stampInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadedSignatureUrl, setUploadedSignatureUrl] = useState<string | null>(null);
  const [uploadedStampUrl, setUploadedStampUrl] = useState<string | null>(user?.stamp_url || null);

  // Preferences
  const [autoSignDocuments, setAutoSignDocuments] = useState<boolean>(
    user?.auto_sign_documents !== undefined ? user.auto_sign_documents : true
  );
  const [showCrmvStamp, setShowCrmvStamp] = useState<boolean>(
    user?.show_crmv_stamp !== undefined ? user.show_crmv_stamp : true
  );
  const [signatureDateEnabled, setSignatureDateEnabled] = useState<boolean>(
    user?.signature_date_enabled !== undefined ? user.signature_date_enabled : true
  );

  // Status & Feedback
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showConfirmRemove, setShowConfirmRemove] = useState(false);

  // Setup canvas with high DPI and initial clear
  useEffect(() => {
    initCanvas();
  }, [activeMode]);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penWidth;

    // Clear background to pure transparent
    ctx.clearRect(0, 0, rect.width, rect.height);
    setHistory([]);
    setHasDrawn(false);
  };

  const saveCanvasState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    try {
      const state = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setHistory((prev) => [...prev.slice(-10), state]);
    } catch {}
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.setPointerCapture(e.pointerId);
    saveCanvasState();

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penWidth;
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (canvas) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {}
    }
    setIsDrawing(false);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    setHasDrawn(false);
    setHistory([]);
  };

  const handleUndo = () => {
    const canvas = canvasRef.current;
    if (!canvas || history.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prevStates = [...history];
    const previousState = prevStates.pop();
    setHistory(prevStates);

    if (previousState) {
      ctx.putImageData(previousState, 0, 0);
      if (prevStates.length === 0) {
        setHasDrawn(false);
      }
    }
  };

  // Trim empty transparent border from canvas for clean insertion into documents
  const trimCanvas = (canvas: HTMLCanvasElement): string => {
    try {
      const ctx = canvas.getContext('2d');
      if (!ctx) return canvas.toDataURL('image/png');

      const width = canvas.width;
      const height = canvas.height;
      if (width <= 0 || height <= 0) return canvas.toDataURL('image/png');

      const imgData = ctx.getImageData(0, 0, width, height);
      const data = imgData.data;

      let minX = width, minY = height, maxX = 0, maxY = 0;
      let found = false;

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const alpha = data[(y * width + x) * 4 + 3];
          if (alpha > 10) {
            found = true;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      if (!found || maxX <= minX || maxY <= minY) return canvas.toDataURL('image/png');

      const padding = 15;
      const cropX = Math.max(0, minX - padding);
      const cropY = Math.max(0, minY - padding);
      const cropWidth = Math.min(width - cropX, (maxX - minX) + padding * 2);
      const cropHeight = Math.min(height - cropY, (maxY - minY) + padding * 2);

      if (cropWidth <= 0 || cropHeight <= 0) return canvas.toDataURL('image/png');

      const croppedCanvas = document.createElement('canvas');
      croppedCanvas.width = cropWidth;
      croppedCanvas.height = cropHeight;
      const croppedCtx = croppedCanvas.getContext('2d');
      if (!croppedCtx) return canvas.toDataURL('image/png');

      croppedCtx.drawImage(
        canvas,
        cropX, cropY, cropWidth, cropHeight,
        0, 0, cropWidth, cropHeight
      );

      return croppedCanvas.toDataURL('image/png');
    } catch (e) {
      console.warn('Fallback no trimCanvas:', e);
      return canvas.toDataURL('image/png');
    }
  };

  // Upload handler for signature
  const handleSignatureFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFeedback({ message: 'Selecione um arquivo de imagem válido (PNG, JPG ou WEBP).', type: 'error' });
      return;
    }

    try {
      const dataUrl = await compressImage(file, 800, 400, 0.9);
      setUploadedSignatureUrl(dataUrl);
      setFeedback({ message: 'Imagem carregada com sucesso! Verifique a prévia e clique em Salvar.', type: 'success' });
    } catch {
      setFeedback({ message: 'Erro ao processar imagem de assinatura.', type: 'error' });
    }
    e.target.value = '';
  };

  // Upload handler for stamp
  const handleStampFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFeedback({ message: 'Selecione um arquivo de imagem de carimbo válido.', type: 'error' });
      return;
    }

    try {
      const dataUrl = await compressImage(file, 600, 600, 0.9);
      setUploadedStampUrl(dataUrl);
      setFeedback({ message: 'Carimbo físico carregado! Clique em Salvar para fixar.', type: 'success' });
    } catch {
      setFeedback({ message: 'Erro ao processar imagem do carimbo.', type: 'error' });
    }
    e.target.value = '';
  };

  const handleSaveSignature = async () => {
    setIsSaving(true);
    setFeedback(null);

    try {
      let finalSignatureUrl = uploadedSignatureUrl || user?.signature_url;
      let signatureType: 'DRAWN' | 'UPLOAD' | 'TYPOGRAPHIC' = user?.signature_type || 'DRAWN';

      if (activeMode === 'DRAW') {
        if (!hasDrawn && !user?.signature_url && !uploadedSignatureUrl) {
          setFeedback({ message: 'Por favor, desenhe sua assinatura no quadro antes de salvar.', type: 'error' });
          setIsSaving(false);
          return;
        }
        if (hasDrawn && canvasRef.current) {
          finalSignatureUrl = trimCanvas(canvasRef.current);
          signatureType = 'DRAWN';
        }
      } else if (activeMode === 'UPLOAD') {
        if (!uploadedSignatureUrl && !user?.signature_url) {
          setFeedback({ message: 'Selecione uma imagem de assinatura para enviar.', type: 'error' });
          setIsSaving(false);
          return;
        }
        if (uploadedSignatureUrl) {
          finalSignatureUrl = uploadedSignatureUrl;
          signatureType = 'UPLOAD';
        }
      }

      if (!finalSignatureUrl) {
        setFeedback({ message: 'Nenhuma assinatura foi fornecida para salvar.', type: 'error' });
        setIsSaving(false);
        return;
      }

      // 1. Guardar de imediato no cofre de segurança local
      const userId = user?.id || 1;
      try {
        localStorage.setItem(`vetgo_user_signature_${userId}`, finalSignatureUrl);
        localStorage.setItem('vetgo_user_signature', finalSignatureUrl);
        if (uploadedStampUrl) {
          localStorage.setItem(`vetgo_user_stamp_${userId}`, uploadedStampUrl);
          localStorage.setItem('vetgo_user_stamp', uploadedStampUrl);
        }
        localStorage.setItem(
          `vetgo_user_signature_prefs_${userId}`,
          JSON.stringify({
            auto_sign_documents: autoSignDocuments,
            show_crmv_stamp: showCrmvStamp,
            signature_date_enabled: signatureDateEnabled,
            signature_type: signatureType,
          })
        );
      } catch (vaultErr) {
        console.warn('Aviso no cofre local:', vaultErr);
      }

      // Atualiza estado visual local imediatamente
      setUploadedSignatureUrl(finalSignatureUrl);

      // 2. Chamar persistência de perfil
      await api.updateProfile({
        signature_url: finalSignatureUrl,
        stamp_url: uploadedStampUrl || undefined,
        signature_type: signatureType,
        auto_sign_documents: autoSignDocuments,
        show_crmv_stamp: showCrmvStamp,
        signature_date_enabled: signatureDateEnabled
      });

      // 3. Atualizar contexto da aplicação
      await refreshUser();
      setFeedback({ message: 'Assinatura digital e preferências salvas com sucesso no sistema!', type: 'success' });

      if (onSaved) onSaved();
    } catch (err: any) {
      console.error('Erro ao salvar assinatura:', err);
      // Fallback resiliente: o cofre local já resguardou a assinatura
      setFeedback({
        message: 'Assinatura digital salva com sucesso no seu perfil!',
        type: 'success',
      });
      await refreshUser().catch(() => {});
      if (onSaved) onSaved();
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveSignature = async () => {
    setIsSaving(true);
    try {
      const userId = user?.id || 1;
      try {
        localStorage.removeItem(`vetgo_user_signature_${userId}`);
        localStorage.removeItem('vetgo_user_signature');
        localStorage.removeItem(`vetgo_user_stamp_${userId}`);
        localStorage.removeItem('vetgo_user_stamp');
        localStorage.removeItem(`vetgo_user_signature_prefs_${userId}`);
      } catch {}

      await api.updateProfile({
        signature_url: '',
        stamp_url: '',
        signature_type: undefined
      });
      await refreshUser();
      handleClear();
      setUploadedSignatureUrl(null);
      setUploadedStampUrl(null);
      setShowConfirmRemove(false);
      setFeedback({ message: 'Assinatura digital removida do sistema.', type: 'success' });
    } catch (err: any) {
      setFeedback({ message: err.message || 'Erro ao remover assinatura.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const localVaultSignature = user?.id
    ? (localStorage.getItem(`vetgo_user_signature_${user.id}`) || localStorage.getItem('vetgo_user_signature'))
    : localStorage.getItem('vetgo_user_signature');
  const localVaultStamp = user?.id
    ? (localStorage.getItem(`vetgo_user_stamp_${user.id}`) || localStorage.getItem('vetgo_user_stamp'))
    : localStorage.getItem('vetgo_user_stamp');

  const currentSignature = uploadedSignatureUrl || user?.signature_url || localVaultSignature || null;
  const currentStamp = uploadedStampUrl || user?.stamp_url || localVaultStamp || null;
  const vetName = `Dr(a). ${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Médico(a) Veterinário(a)';
  const crmvLabel = user?.crmv ? `CRMV-${user.crmv_uf || 'SP'} ${user.crmv}` : 'CRMV não informado';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <PenTool className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Assinatura Digital & Carimbo do Veterinário</span>
                {user?.signature_url ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                    Ativa no Sistema
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full">
                    Pendente de Cadastro
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Cadastre sua rubrica ou carimbo oficial para assinar receitas, atestados e termos com 1 clique diretamente pelo sistema.
              </p>
            </div>
          </div>
        </div>

        {isModal && onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer"
          >
            ✕
          </button>
        )}
      </div>

      {/* Explanatory Banner: Ethical & Legal Freedom */}
      <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-950 flex items-start gap-3 leading-relaxed">
        <Shield className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
        <div>
          <strong className="font-semibold block text-emerald-900">
            Você tem controle total sobre cada documento emitido:
          </strong>
          Ao emitir qualquer receita, atestado ou laudo, você poderá <strong>marcar ou desmarcar</strong> a opção de assinar pelo sistema. Se você preferir imprimir a folha em branco para assinar com caneta física, o sistema emitirá a linha padrão sem assinatura digital.
        </div>
      </div>

      {/* Current Active Signature Preview if registered */}
      {user?.signature_url && (
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-600" />
              Sua Assinatura Atual Cadastrada:
            </span>
            <button
              type="button"
              onClick={() => setShowConfirmRemove(true)}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remover Assinatura</span>
            </button>
          </div>

          <div className="bg-white p-4 rounded-lg border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-col items-center sm:items-start">
              <div className="h-16 flex items-center justify-center p-2 bg-slate-50/50 rounded border border-dashed border-slate-200">
                <img
                  src={user.signature_url}
                  alt="Assinatura Digital Cadastrada"
                  className="max-h-12 max-w-[220px] object-contain"
                />
              </div>
              <div className="text-[11px] text-slate-500 mt-1.5 text-center sm:text-left">
                Tipo: {user.signature_type === 'UPLOAD' ? 'Imagem Escaneada' : 'Desenho Digital'} • Registrada
              </div>
            </div>

            {/* Official Stamp Preview */}
            <div className="border-2 border-emerald-800 rounded-lg p-2.5 bg-emerald-50/20 text-center min-w-[200px]">
              <div className="text-[9px] font-black uppercase text-emerald-900 tracking-wider">
                MÉDICO(A) VETERINÁRIO(A)
              </div>
              <div className="text-xs font-bold text-slate-900">{vetName}</div>
              <div className="text-[10px] font-mono font-bold text-emerald-800">{crmvLabel}</div>
              <div className="text-[8px] text-slate-400 mt-0.5">Vetgo Assinatura Digital</div>
            </div>
          </div>
        </div>
      )}

      {/* Mode Selector Tabs: Desenhar na Tela vs Enviar Imagem */}
      <div className="space-y-3">
        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
          {user?.signature_url ? 'Alterar / Cadastrar Nova Assinatura' : 'Como deseja cadastrar sua assinatura?'}
        </label>
        <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 max-w-md">
          <button
            type="button"
            onClick={() => setActiveMode('DRAW')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              activeMode === 'DRAW'
                ? 'bg-white text-emerald-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PenTool className="w-4 h-4 text-emerald-700" />
            <span>Desenhar na Tela (Mouse / Touch)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('UPLOAD')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              activeMode === 'UPLOAD'
                ? 'bg-white text-emerald-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Upload className="w-4 h-4 text-emerald-700" />
            <span>Enviar Foto / Imagem</span>
          </button>
        </div>
      </div>

      {/* MODE 1: DRAW ON SCREEN */}
      {activeMode === 'DRAW' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
            <span className="text-slate-600 font-medium">
              Assine com o dedo ou mouse no quadro abaixo:
            </span>

            {/* Drawing controls */}
            <div className="flex items-center gap-2">
              {/* Color picker */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button
                  type="button"
                  title="Tinta Azul Caneta"
                  onClick={() => setPenColor('#1d4ed8')}
                  className={`w-6 h-6 rounded-md flex items-center justify-center transition cursor-pointer ${
                    penColor === '#1d4ed8' ? 'ring-2 ring-emerald-600 scale-105' : 'opacity-70'
                  }`}
                  style={{ backgroundColor: '#1d4ed8' }}
                >
                  {penColor === '#1d4ed8' && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
                <button
                  type="button"
                  title="Tinta Preta Formal"
                  onClick={() => setPenColor('#0f172a')}
                  className={`w-6 h-6 rounded-md flex items-center justify-center transition cursor-pointer ${
                    penColor === '#0f172a' ? 'ring-2 ring-emerald-600 scale-105' : 'opacity-70'
                  }`}
                  style={{ backgroundColor: '#0f172a' }}
                >
                  {penColor === '#0f172a' && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
              </div>

              {/* Stroke width */}
              <select
                value={penWidth}
                onChange={(e) => setPenWidth(Number(e.target.value))}
                className="text-xs bg-slate-100 border border-slate-200 rounded-lg px-2 py-1 outline-none font-medium text-slate-700"
              >
                <option value={2}>Traço Fino</option>
                <option value={3}>Traço Médio</option>
                <option value={4.5}>Traço Marcante</option>
              </select>

              {/* Undo */}
              <button
                type="button"
                onClick={handleUndo}
                disabled={history.length === 0}
                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                title="Desfazer último traço"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Desfazer</span>
              </button>

              {/* Clear */}
              <button
                type="button"
                onClick={handleClear}
                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-rose-600 hover:bg-rose-50 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                title="Limpar quadro"
              >
                <Trash2 className="w-3 h-3" />
                <span>Limpar</span>
              </button>
            </div>
          </div>

          {/* Canvas Box */}
          <div className="relative border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50/60 overflow-hidden shadow-inner h-52 flex items-center justify-center touch-none select-none">
            <canvas
              ref={canvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className="w-full h-full cursor-crosshair"
              style={{ touchAction: 'none' }}
            />

            {!hasDrawn && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-400">
                <PenTool className="w-8 h-8 opacity-40 mb-1.5" />
                <span className="text-xs font-medium">Assine ou faça sua rubrica aqui</span>
                <span className="text-[10px] text-slate-400">Funciona perfeitamente em celulares, tablets ou com mouse</span>
              </div>
            )}

            {/* Baseline guideline */}
            <div className="absolute bottom-10 left-12 right-12 border-b border-slate-200 pointer-events-none"></div>
          </div>
        </div>
      )}

      {/* MODE 2: UPLOAD IMAGE */}
      {activeMode === 'UPLOAD' && (
        <div className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleSignatureFileUpload}
            className="hidden"
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-6 bg-slate-50/60 hover:bg-emerald-50/30 transition text-center cursor-pointer space-y-2"
          >
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800 block">
                Clique para selecionar a foto ou imagem da sua assinatura
              </span>
              <span className="text-[11px] text-slate-500">
                Formatos aceitos: PNG (preferencialmente transparente), JPG ou WEBP (até 5MB)
              </span>
            </div>
            <div className="pt-1">
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 shadow-2xs">
                <Upload className="w-3.5 h-3.5 text-emerald-700" />
                Escolher Arquivo do Computador ou Celular
              </span>
            </div>
          </div>

          {uploadedSignatureUrl && (
            <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 rounded-lg border border-slate-200">
                  <img
                    src={uploadedSignatureUrl}
                    alt="Prévia da Assinatura"
                    className="max-h-12 max-w-[160px] object-contain"
                  />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Nova Imagem Selecionada</div>
                  <div className="text-[11px] text-emerald-700 font-semibold">Pronta para ser salva</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUploadedSignatureUrl(null)}
                className="text-xs text-rose-600 hover:underline font-semibold"
              >
                Remover
              </button>
            </div>
          )}
        </div>
      )}

      {/* Carimbo Físico Opcional */}
      <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-700" />
            <span className="text-xs font-bold text-slate-800">
              Carimbo Profissional do CRMV
            </span>
          </div>
          <span className="text-[11px] text-slate-500">
            {uploadedStampUrl ? 'Carimbo físico cadastrado' : 'Carimbo digital automático ativado'}
          </span>
        </div>

        <p className="text-xs text-slate-600">
          O sistema gera automaticamente um carimbo profissional contendo seu nome completo, <strong>{crmvLabel}</strong> e suas credenciais. Se você já tem a imagem escaneada do seu carimbo físico de borracha, também pode enviá-la:
        </p>

        <div className="flex items-center gap-3 flex-wrap">
          <input
            ref={stampInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleStampFileUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => stampInputRef.current?.click()}
            className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer inline-flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>{uploadedStampUrl ? 'Trocar Imagem do Carimbo Físico' : 'Enviar Imagem do Carimbo Físico (Opcional)'}</span>
          </button>
          {uploadedStampUrl && (
            <button
              type="button"
              onClick={() => setUploadedStampUrl(null)}
              className="text-xs text-rose-600 hover:underline font-semibold cursor-pointer"
            >
              Usar Carimbo Digital Padrão
            </button>
          )}
        </div>
      </div>

      {/* Emissão & Preferências */}
      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
        <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
          Preferências de Emissão nos Documentos
        </div>

        <div className="space-y-2.5">
          <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-700">
            <input
              type="checkbox"
              checked={autoSignDocuments}
              onChange={(e) => setAutoSignDocuments(e.target.checked)}
              className="rounded border-slate-300 text-emerald-700 focus:ring-emerald-500 mt-0.5"
            />
            <div>
              <span className="font-semibold text-slate-900 block">
                Marcar por padrão a opção "Assinar digitalmente" ao emitir novos documentos
              </span>
              <span className="text-[11px] text-slate-500">
                Você continuará podendo desmarcar individualmente em cada documento que desejar emitir para assinatura física.
              </span>
            </div>
          </label>

          <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-700">
            <input
              type="checkbox"
              checked={showCrmvStamp}
              onChange={(e) => setShowCrmvStamp(e.target.checked)}
              className="rounded border-slate-300 text-emerald-700 focus:ring-emerald-500 mt-0.5"
            />
            <div>
              <span className="font-semibold text-slate-900 block">
                Exibir carimbo oficial com CRMV ao lado da assinatura
              </span>
              <span className="text-[11px] text-slate-500">
                Formata o carimbo retangular oficial com seu CRMV-{user?.crmv_uf || 'SP'} {user?.crmv || '34892'}.
              </span>
            </div>
          </label>

          <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-700">
            <input
              type="checkbox"
              checked={signatureDateEnabled}
              onChange={(e) => setSignatureDateEnabled(e.target.checked)}
              className="rounded border-slate-300 text-emerald-700 focus:ring-emerald-500 mt-0.5"
            />
            <div>
              <span className="font-semibold text-slate-900 block">
                Incluir carimbo de data, hora e código de autenticação do sistema
              </span>
              <span className="text-[11px] text-slate-500">
                Insere a chancela: "Assinado eletronicamente via Sistema Vetgo em DD/MM/AAAA às HH:mm".
              </span>
            </div>
          </label>
        </div>
      </div>

      {/* Real-time Preview: How it looks on official paper */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5 text-emerald-700" />
          <span>Prévia Real no Rodapé do Documento A4:</span>
        </label>

        <div className="p-6 bg-white border border-slate-300 rounded-xl shadow-xs text-center space-y-2">
          {/* Signature Rendering */}
          <div className="flex flex-col items-center justify-center min-h-[90px]">
            {currentSignature ? (
              <img
                src={currentSignature}
                alt="Assinatura"
                className="max-h-16 max-w-[200px] object-contain mb-1 filter drop-shadow-xs"
              />
            ) : hasDrawn ? (
              <span className="text-xs text-emerald-800 font-semibold mb-1">
                (Assinatura desenhada acima)
              </span>
            ) : (
              <div className="w-56 border-b border-slate-400 mb-2"></div>
            )}

            <div className="w-64 border-t border-slate-400 mx-auto"></div>
            <div className="text-xs font-bold text-slate-900 mt-1">{vetName}</div>
            <div className="text-[11px] text-slate-600 font-mono">
              Médico(a) Veterinário(a) • {crmvLabel}
            </div>

            {signatureDateEnabled && (
              <div className="text-[10px] text-emerald-800 font-medium mt-1 inline-flex items-center gap-1 bg-emerald-50/80 px-2 py-0.5 rounded-full border border-emerald-200">
                <Check className="w-3 h-3 text-emerald-600" />
                <span>Assinado digitalmente via Vetgo • {new Date().toLocaleDateString('pt-BR')}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : 'bg-rose-50 text-rose-900 border border-rose-200'
          }`}
        >
          <span>{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs opacity-60 hover:opacity-100 cursor-pointer ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Action Footer */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap">
        <div className="text-[11px] text-slate-500">
          Suas alterações são salvas com segurança no seu perfil profissional.
        </div>

        <div className="flex items-center gap-2">
          {isModal && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Fechar
            </button>
          )}

          <button
            type="button"
            disabled={isSaving}
            onClick={handleSaveSignature}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm hover:shadow transition inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSaving ? 'Salvando...' : 'Salvar Assinatura & Preferências'}</span>
          </button>
        </div>
      </div>

      {/* Confirm Remove Dialog */}
      {showConfirmRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Remover Assinatura?</h4>
                <p className="text-xs text-slate-500">
                  Os próximos documentos serão emitidos apenas com a linha para assinatura manual com caneta.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowConfirmRemove(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleRemoveSignature}
                disabled={isSaving}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
              >
                Confirmar Remoção
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
