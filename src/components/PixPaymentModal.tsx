import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { generatePixPayload } from '../utils/pixPayload';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import {
  QrCode,
  Copy,
  Check,
  Share2,
  Settings,
  X,
  AlertCircle,
  DollarSign,
  Smartphone,
  ExternalLink
} from 'lucide-react';

interface PixPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultAmount?: number;
  description?: string;
  tutorPhone?: string;
  patientName?: string;
}

export const PixPaymentModal: React.FC<PixPaymentModalProps> = ({
  isOpen,
  onClose,
  defaultAmount = 0,
  description = 'Atendimento Veterinário',
  tutorPhone = '',
  patientName = '',
}) => {
  const { user, refreshUser } = useAuth();
  const [amount, setAmount] = useState<number>(defaultAmount);
  const [desc, setDesc] = useState<string>(description);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [pixPayload, setPixPayload] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // Edição rápida de chave PIX se não tiver
  const [showConfig, setShowConfig] = useState<boolean>(false);
  const [pixKey, setPixKey] = useState<string>(user?.pix_key || '');
  const [receiverName, setReceiverName] = useState<string>(
    user?.pix_receiver_name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim()
  );
  const [city, setCity] = useState<string>(user?.pix_city || 'SAO PAULO');
  const [savingConfig, setSavingConfig] = useState<boolean>(false);

  useEffect(() => {
    if (user) {
      if (user.pix_key) setPixKey(user.pix_key);
      if (user.pix_receiver_name) setReceiverName(user.pix_receiver_name);
      if (user.pix_city) setCity(user.pix_city);
    }
  }, [user]);

  useEffect(() => {
    if (defaultAmount) {
      setAmount(defaultAmount);
    }
  }, [defaultAmount]);

  useEffect(() => {
    if (description) {
      setDesc(description);
    }
  }, [description]);

  // Gera o Payload e o QR Code sempre que os dados mudarem
  useEffect(() => {
    if (!pixKey.trim()) {
      setQrCodeDataUrl('');
      setPixPayload('');
      return;
    }

    try {
      const payload = generatePixPayload({
        pixKey: pixKey.trim(),
        receiverName: receiverName.trim() || 'VETERINARIO',
        city: city.trim() || 'BRASIL',
        amount: amount > 0 ? amount : undefined,
        description: desc,
      });

      setPixPayload(payload);

      QRCode.toDataURL(payload, {
        width: 320,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      }).then((url) => {
        setQrCodeDataUrl(url);
      });
    } catch (e) {
      console.error('Erro ao gerar QR Code PIX:', e);
    }
  }, [pixKey, receiverName, city, amount, desc]);

  const handleCopy = () => {
    if (!pixPayload) return;
    navigator.clipboard.writeText(pixPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      await api.updateUserProfile({
        pix_key: pixKey.trim(),
        pix_receiver_name: receiverName.trim(),
        pix_city: city.trim(),
      });
      await refreshUser();
      setShowConfig(false);
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar chave PIX.');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleShareWhatsApp = () => {
    const cleanPhone = tutorPhone.replace(/\D/g, '');
    const phoneParam = cleanPhone ? `55${cleanPhone}` : '';
    const text = encodeURIComponent(
      `Olá! Segue a chave PIX para o pagamento do atendimento do ${patientName || 'pet'}:\n\n` +
      `💰 *Valor:* R$ ${amount.toFixed(2).replace('.', ',')}\n` +
      `🔑 *Chave PIX:* ${pixKey}\n` +
      `👤 *Favorecido:* ${receiverName}\n\n` +
      `📱 *Código PIX Copia e Cola:*\n${pixPayload}\n\n` +
      `Basta copiar o código acima e colar na opção "Pix Copia e Cola" do seu banco.`
    );
    window.open(`https://wa.me/${phoneParam}?text=${text}`, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-fade-in my-8">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Receber com PIX</h3>
              <p className="text-slate-400 text-xs mt-0.5">
                QR Code oficial do Banco Central (Cai direto na sua conta)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Se a chave PIX ainda não foi cadastrada ou o usuário clicou em configurar */}
          {!pixKey.trim() || showConfig ? (
            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Configuração da sua Chave PIX:</strong>
                  <p className="mt-0.5 text-slate-600">
                    Insira a chave da sua conta bancária. Os pagamentos dos tutores caem 100% diretamente para você.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Sua Chave PIX *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: CPF, CNPJ, Celular, E-mail ou Aleatória"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-600 font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nome do Titular da Conta *
                </label>
                <input
                  type="text"
                  required
                  maxLength={25}
                  placeholder="Ex: CAROLINE MENDES"
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Cidade da Conta (Exigência do Banco Central) *
                </label>
                <input
                  type="text"
                  required
                  maxLength={15}
                  placeholder="Ex: SAO PAULO"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                {pixKey.trim() && (
                  <button
                    type="button"
                    onClick={() => setShowConfig(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Voltar
                  </button>
                )}
                <button
                  type="submit"
                  disabled={savingConfig || !pixKey.trim()}
                  className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  {savingConfig ? 'Salvando...' : 'Salvar Chave PIX'}
                </button>
              </div>
            </form>
          ) : (
            /* Tela do QR Code Gerado */
            <div className="space-y-4">
              {/* Valor e Edição rápida */}
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Valor a Cobrar
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-sm font-bold text-slate-700">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={amount || ''}
                      onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                      placeholder="0,00"
                      className="w-28 font-extrabold text-lg text-slate-900 bg-transparent border-b border-dashed border-slate-400 outline-none focus:border-emerald-700"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowConfig(true)}
                  title="Alterar chave PIX"
                  className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200/60 transition cursor-pointer"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>

              {/* QR Code Canvas Display */}
              <div className="flex flex-col items-center justify-center p-4 bg-white border border-slate-200 rounded-2xl shadow-inner">
                {qrCodeDataUrl ? (
                  <img
                    src={qrCodeDataUrl}
                    alt="QR Code PIX"
                    className="w-56 h-56 object-contain rounded-lg animate-fade-in"
                  />
                ) : (
                  <div className="w-56 h-56 flex items-center justify-center text-slate-400 text-xs">
                    Gerando QR Code...
                  </div>
                )}
                <span className="text-[11px] text-slate-500 mt-2 font-medium">
                  {receiverName} • {city}
                </span>
              </div>

              {/* Ações: Copiar Código e Enviar WhatsApp */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs ${
                    copied
                      ? 'bg-emerald-800 text-white'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Código Copiado!' : 'PIX Copia e Cola'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="py-2.5 px-3 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Enviar WhatsApp</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
