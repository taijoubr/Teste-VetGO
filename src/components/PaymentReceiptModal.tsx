import React, { useState } from 'react';
import {
  Receipt,
  Download,
  Printer,
  X,
  Share2,
  Copy,
  Check,
  MessageCircle,
  ShieldCheck,
  PawPrint,
  User,
  Calendar,
  CreditCard,
  Building2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { printElement, exportToPdf } from '../utils/printHelper';
import { numberToWordsBRL } from '../utils/numberToWordsPt';

export interface PaymentReceiptData {
  id?: number | string;
  receipt_number?: string;
  amount: number;
  payment_method: string;
  date: string;
  tutor_name?: string;
  tutor_cpf?: string;
  tutor_phone?: string;
  patient_name?: string;
  patient_species?: string;
  patient_breed?: string;
  description: string;
  notes?: string;
  items?: { description: string; quantity?: number; amount: number }[];
}

interface PaymentReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: PaymentReceiptData | null;
}

export const PaymentReceiptModal: React.FC<PaymentReceiptModalProps> = ({
  isOpen,
  onClose,
  receipt,
}) => {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  if (!isOpen || !receipt) return null;

  const receiptNumber = receipt.receipt_number || `REC-${new Date().getFullYear()}-${String(receipt.id || '001').padStart(4, '0')}`;
  const amountFormatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(receipt.amount);
  const amountWords = numberToWordsBRL(receipt.amount);
  const formattedDate = new Date(receipt.date + (receipt.date.includes('T') ? '' : 'T12:00:00')).toLocaleDateString('pt-BR');

  const vetName = `Dr(a). ${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Médico(a) Veterinário(a)';
  const crmvLabel = user?.crmv ? `CRMV-${user?.crmv_uf || 'SP'} ${user.crmv}` : 'CRMV em validação';
  const clinicName = user?.clinic_name || 'Atendimento Médico-Veterinário Volante';

  // Format message for WhatsApp
  const handleShareWhatsApp = () => {
    const cleanPhone = (receipt.tutor_phone || '').replace(/\D/g, '');
    const phoneParam = cleanPhone ? (cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`) : '';
    const tutorFirstName = receipt.tutor_name ? receipt.tutor_name.split(' ')[0] : 'Tutor';

    const text =
      `Olá, ${tutorFirstName}! 🐾\n\n` +
      `Aqui está o seu *Comprovante / Recibo de Pagamento Oficial* emitido por *${vetName}* (${crmvLabel}):\n\n` +
      `🧾 *RECIBO Nº ${receiptNumber}*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `🐾 *Paciente:* ${receipt.patient_name || 'Paciente'}${receipt.patient_species ? ` (${receipt.patient_species})` : ''}\n` +
      `👤 *Tutor(a):* ${receipt.tutor_name || 'Responsável'}\n` +
      `🩺 *Serviço:* ${receipt.description}\n` +
      `💰 *Valor Pago:* ${amountFormatted}\n` +
      `💳 *Forma:* ${receipt.payment_method.replace('_', ' ')}\n` +
      `📅 *Data:* ${formattedDate}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `*${clinicName}*\n` +
      `Agradecemos pela confiança no cuidado do seu pet!`;

    window.open(`https://wa.me/${phoneParam}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleCopyText = () => {
    const text =
      `RECIBO DE PAGAMENTO VETERINÁRIO - Nº ${receiptNumber}\n` +
      `Profissional: ${vetName} (${crmvLabel})\n` +
      `Clínica / Serviço: ${clinicName}\n` +
      `Recebi de: ${receipt.tutor_name || 'Tutor Responsável'}\n` +
      `Paciente: ${receipt.patient_name || 'Pet'}\n` +
      `A quantia de: ${amountFormatted} (${amountWords})\n` +
      `Referente a: ${receipt.description}\n` +
      `Forma de Pagamento: ${receipt.payment_method.replace('_', ' ')}\n` +
      `Data: ${formattedDate}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    printElement('printable-payment-receipt', `Recibo_${receiptNumber}`);
  };

  const handlePdf = () => {
    exportToPdf('printable-payment-receipt', `Recibo_${receiptNumber}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[95vh] flex flex-col overflow-hidden">
        {/* Header toolbar */}
        <div className="p-4 sm:px-6 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
                Recibo de Honorários
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  {receiptNumber}
                </span>
              </h2>
              <p className="text-[11px] text-slate-300">
                Comprovante oficial com validade fiscal e profissional
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleShareWhatsApp}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-2xs transition cursor-pointer"
              title="Compartilhar recibo no WhatsApp do tutor"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>
            <button
              onClick={handlePdf}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              title="Baixar em PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">PDF</span>
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              title="Imprimir documento"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action bar below header */}
        <div className="px-6 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Documento autenticado com CRMV do profissional</span>
          </div>
          <button
            onClick={handleCopyText}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-emerald-700 transition cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copiado para Área de Transferência!' : 'Copiar Texto'}</span>
          </button>
        </div>

        {/* Scrollable Printable Receipt Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/60">
          <div
            id="printable-payment-receipt"
            className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6 text-slate-800 relative overflow-hidden"
          >
            {/* Watermark stamp outline */}
            <div className="absolute right-4 top-4 opacity-5 pointer-events-none select-none">
              <Receipt className="w-44 h-44 text-emerald-950" />
            </div>

            {/* Receipt Header */}
            <div className="border-b border-slate-200 pb-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-center sm:text-left space-y-1">
                {user?.logo_url && (
                  <img
                    src={user.logo_url}
                    alt="Logo"
                    className="h-10 w-auto object-contain mb-2 mx-auto sm:mx-0"
                  />
                )}
                <h1 className="text-lg font-black text-slate-900 tracking-tight uppercase">
                  {clinicName}
                </h1>
                <p className="text-xs font-bold text-emerald-800">
                  {vetName} • {crmvLabel}
                </p>
                {user?.phone && (
                  <p className="text-[11px] text-slate-500">
                    Telefone/WhatsApp: {user.phone} {user?.email ? `• ${user.email}` : ''}
                  </p>
                )}
              </div>

              {/* Number and Value badge */}
              <div className="text-center sm:text-right shrink-0 bg-slate-50 border border-slate-200/80 p-3 rounded-xl min-w-44">
                <span className="text-[10px] font-mono font-bold text-slate-400 block uppercase tracking-wider">
                  RECIBO Nº {receiptNumber}
                </span>
                <span className="text-2xl font-black text-emerald-700 font-mono tracking-tight block mt-0.5">
                  {amountFormatted}
                </span>
                <span className="text-[10px] font-semibold text-slate-500 block uppercase tracking-wider mt-0.5">
                  VIA {receipt.payment_method.replace('_', ' ')}
                </span>
              </div>
            </div>

            {/* Declaration Text */}
            <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 text-xs sm:text-sm leading-relaxed text-slate-800 space-y-2">
              <p>
                Recebi de <strong>{receipt.tutor_name || 'Tutor Responsável'}</strong>
                {receipt.tutor_cpf ? ` (CPF: ${receipt.tutor_cpf})` : ''} a quantia de{' '}
                <strong className="text-emerald-900 font-bold">{amountFormatted}</strong>{' '}
                {amountWords ? <span className="text-slate-600 font-medium">({amountWords})</span> : null},
                referente à prestação de serviços médico-veterinários e atendimentos clínicos volantes:
              </p>

              <div className="p-3 bg-white rounded-lg border border-slate-200/80 font-medium text-slate-900">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                  DISCRIMINATIVO DOS SERVIÇOS:
                </span>
                {receipt.description}
              </div>

              {receipt.patient_name && (
                <div className="flex items-center gap-2 pt-1 text-xs text-slate-600">
                  <PawPrint className="w-3.5 h-3.5 text-emerald-700" />
                  <span>
                    Paciente atendido(a): <strong>{receipt.patient_name}</strong>
                    {receipt.patient_species ? ` (${receipt.patient_species}${receipt.patient_breed ? ` • ${receipt.patient_breed}` : ''})` : ''}
                  </span>
                </div>
              )}
            </div>

            {/* Optional Itemized breakdown */}
            {receipt.items && receipt.items.length > 0 && (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-100/70 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                  Detalhamento de Itens / Procedimentos
                </div>
                <div className="divide-y divide-slate-100 text-xs">
                  {receipt.items.map((it, idx) => (
                    <div key={idx} className="p-2.5 flex items-center justify-between">
                      <span className="text-slate-700">
                        {it.quantity ? `${it.quantity}x ` : ''}
                        {it.description}
                      </span>
                      <span className="font-mono font-semibold text-slate-900">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(it.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes if any */}
            {receipt.notes && (
              <div className="p-3 rounded-lg bg-amber-50/60 border border-amber-200/60 text-[11px] text-amber-900">
                <span className="font-bold">Observações adicionais:</span> {receipt.notes}
              </div>
            )}

            {/* Signature & Stamp Section */}
            <div className="pt-6 border-t border-slate-200 flex flex-col items-center justify-center text-center space-y-2">
              {/* Digital signature if uploaded or drawn */}
              {user?.signature_url ? (
                <div className="flex flex-col items-center justify-center">
                  <img
                    src={user.signature_url}
                    alt="Assinatura Digital"
                    className="h-14 w-auto object-contain mix-blend-multiply"
                  />
                  <div className="w-52 border-t border-slate-300 mt-1"></div>
                </div>
              ) : user?.stamp_url ? (
                <div className="flex flex-col items-center justify-center">
                  <img
                    src={user.stamp_url}
                    alt="Carimbo do Médico Veterinário"
                    className="h-16 w-auto object-contain mix-blend-multiply"
                  />
                </div>
              ) : (
                <div className="w-52 border-t border-slate-400 mt-6"></div>
              )}

              <div className="space-y-0.5">
                <div className="font-bold text-slate-900 text-xs sm:text-sm">
                  {vetName}
                </div>
                <div className="text-[11px] text-emerald-800 font-semibold font-mono">
                  {crmvLabel}
                </div>
                <div className="text-[10px] text-slate-400">
                  Emitido em {formattedDate} • Quitação e liquidação definitiva
                </div>
              </div>
            </div>

            {/* Bottom micro branding */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
              <span>Vetgo • Sistema de Gestão Veterinária Volante</span>
              <span>Documento autêntico</span>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-3 sm:px-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <button
            onClick={handleShareWhatsApp}
            className="inline-flex items-center gap-1.5 font-bold text-emerald-700 hover:text-emerald-800 transition"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Enviar no WhatsApp do Tutor</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg font-semibold text-slate-600 hover:bg-slate-200 transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
