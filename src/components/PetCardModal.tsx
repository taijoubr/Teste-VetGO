import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Patient } from '../types';
import {
  QrCode,
  Share2,
  Copy,
  Check,
  ExternalLink,
  X,
  Smartphone,
  ShieldCheck,
  Printer
} from 'lucide-react';

interface PetCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient | null;
  tutorPhone?: string;
  tutorName?: string;
}

export const PetCardModal: React.FC<PetCardModalProps> = ({
  isOpen,
  onClose,
  patient,
  tutorPhone = '',
  tutorName = '',
}) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  const cardUrl = patient ? `${window.location.origin}/carteirinha/${patient.id}` : '';

  useEffect(() => {
    if (patient && cardUrl) {
      QRCode.toDataURL(cardUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: '#064e3b',
          light: '#ffffff',
        },
      }).then((url) => {
        setQrCodeUrl(url);
      });
    }
  }, [patient, cardUrl]);

  const handleCopyLink = () => {
    if (!cardUrl) return;
    navigator.clipboard.writeText(cardUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleShareWhatsApp = () => {
    if (!patient) return;
    const cleanPhone = tutorPhone.replace(/\D/g, '');
    const phoneParam = cleanPhone ? `55${cleanPhone}` : '';
    const text = encodeURIComponent(
      `Olá ${tutorName ? tutorName.split(' ')[0] : ''}! 🐾\n\n` +
      `Aqui está o link da *Carteirinha Digital de Vacinação Oficial* do(a) *${patient.name}*:\n` +
      `${cardUrl}\n\n` +
      `Você pode acessar a qualquer momento no seu celular para conferir as vacinas em dia e os próximos reforços!`
    );
    window.open(`https://wa.me/${phoneParam}?text=${text}`, '_blank');
  };

  const handlePrintTag = () => {
    window.open(cardUrl, '_blank');
  };

  if (!isOpen || !patient) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-fade-in my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
              <QrCode className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">
                Carteirinha Digital do Pet
              </h3>
              <p className="text-emerald-100 text-xs mt-0.5">
                {patient.name} ({patient.species} • {patient.breed || 'SRD'})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="p-3 bg-emerald-50/80 border border-emerald-200/80 rounded-2xl text-xs text-emerald-900 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <strong>Link Permanente & Seguro:</strong>
              <p className="mt-0.5 text-slate-600">
                O tutor pode abrir a carteirinha no celular sem precisar de login. Ao escanear o QR Code, ele confere vacinas em dia e datas de reforço.
              </p>
            </div>
          </div>

          {/* QR Code Container */}
          <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200 rounded-2xl">
            {qrCodeUrl ? (
              <img
                src={qrCodeUrl}
                alt={`QR Code Carteirinha ${patient.name}`}
                className="w-52 h-52 object-contain rounded-xl bg-white p-2 shadow-2xs"
              />
            ) : (
              <div className="w-52 h-52 flex items-center justify-center text-slate-400 text-xs">
                Gerando QR Code...
              </div>
            )}
            <span className="text-[11px] text-slate-500 mt-2 font-mono break-all text-center px-2">
              {cardUrl}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <Share2 className="w-4 h-4" />
              <span>Enviar Carteirinha no WhatsApp do Tutor</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleCopyLink}
                className="py-2.5 px-3 rounded-xl text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Link Copiado!' : 'Copiar Link'}</span>
              </button>

              <button
                type="button"
                onClick={handlePrintTag}
                className="py-2.5 px-3 rounded-xl text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <ExternalLink className="w-4 h-4 text-emerald-700" />
                <span>Abrir Carteirinha</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
