import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Clinic, AnesthesiaRecord, ClinicBillingInvoice, ClinicBillingInvoiceItem, ClinicBillingPeriodType } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { generatePixPayload } from '../utils/pixPayload';
import { printElement, exportToPdf } from '../utils/printHelper';
import {
  Building2,
  Calendar,
  DollarSign,
  FileText,
  Printer,
  Download,
  Share2,
  CheckCircle2,
  AlertCircle,
  X,
  Plus,
  Trash2,
  CreditCard,
  QrCode,
  Copy,
  Check,
  Eye,
  Settings,
  ChevronRight,
  Filter,
  Layers,
  Sparkles
} from 'lucide-react';

interface ClinicBillingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialClinic?: Clinic | null;
  clinics: Clinic[];
  onInvoiceCreated?: (invoice: ClinicBillingInvoice) => void;
}

export const ClinicBillingModal: React.FC<ClinicBillingModalProps> = ({
  isOpen,
  onClose,
  initialClinic,
  clinics,
  onInvoiceCreated
}) => {
  const { user, refreshUser } = useAuth();

  // Selected Clinic
  const [selectedClinicId, setSelectedClinicId] = useState<number>(
    initialClinic?.id || (clinics[0]?.id || 1)
  );

  // Period Configuration
  const [periodType, setPeriodType] = useState<ClinicBillingPeriodType>('MENSAL');
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth()); // 0-11
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [customStartDate, setCustomStartDate] = useState<string>(
    new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  );
  const [customEndDate, setCustomEndDate] = useState<string>(
    new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
  );

  // Closing & Due Date (sem preenchimento automatico)
  const [closingDate, setClosingDate] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');

  // Invoice Number (sem preenchimento automatico)
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');

  // Procedures / Invoice Items
  const [items, setItems] = useState<ClinicBillingInvoiceItem[]>([]);
  const [isLoadingProcedures, setIsLoadingProcedures] = useState<boolean>(false);
  const [allAnesthesias, setAllAnesthesias] = useState<AnesthesiaRecord[]>([]);

  // PIX State
  const [pixKey, setPixKey] = useState<string>(user?.pix_key || '');
  const [receiverName, setReceiverName] = useState<string>(
    user?.pix_receiver_name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim()
  );
  const [pixCity, setPixCity] = useState<string>(user?.pix_city || 'SAO PAULO');
  const [pixPayload, setPixPayload] = useState<string>('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copiedPix, setCopiedPix] = useState<boolean>(false);
  const [showPixConfig, setShowPixConfig] = useState<boolean>(false);

  // UI State
  const [activeTab, setActiveTab] = useState<'ITEMS' | 'PREVIEW'>('ITEMS');
  const [createFinancialEntry, setCreateFinancialEntry] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [manualItemForm, setManualItemForm] = useState({
    procedure_name: '',
    patient_name: '',
    surgeon_name: '',
    amount: 0,
    date: now.toISOString().split('T')[0]
  });
  const [showAddManualItem, setShowAddManualItem] = useState<boolean>(false);

  // Set initial clinic
  useEffect(() => {
    if (initialClinic) {
      setSelectedClinicId(initialClinic.id);
    } else if (clinics.length > 0 && !selectedClinicId) {
      setSelectedClinicId(clinics[0].id);
    }
  }, [initialClinic, clinics]);

  // Sync user's PIX key
  useEffect(() => {
    if (user) {
      if (user.pix_key) setPixKey(user.pix_key);
      if (user.pix_receiver_name) setReceiverName(user.pix_receiver_name);
      if (user.pix_city) setPixCity(user.pix_city);
    }
  }, [user]);

  // Load all anesthesias once modal opens
  useEffect(() => {
    if (isOpen) {
      setSaveSuccess(false);
      setActiveTab('ITEMS');
      api.getAnesthesias().then((data) => {
        setAllAnesthesias(data || []);
      }).catch(() => setAllAnesthesias([]));
    }
  }, [isOpen]);

  const activeClinic = clinics.find((c) => c.id === selectedClinicId) || initialClinic || clinics[0];

  // Calculate Dates according to period
  const calculatePeriodDates = () => {
    let start = '';
    let end = '';
    let label = '';

    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const monthShort = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ];

    if (periodType === 'MENSAL') {
      const firstDay = new Date(selectedYear, selectedMonth, 1);
      const lastDay = new Date(selectedYear, selectedMonth + 1, 0);
      start = firstDay.toISOString().split('T')[0];
      end = lastDay.toISOString().split('T')[0];
      label = `${monthNames[selectedMonth]} / ${selectedYear}`;
    } else if (periodType === 'QUINZENAL_1') {
      const firstDay = new Date(selectedYear, selectedMonth, 1);
      const midDay = new Date(selectedYear, selectedMonth, 15);
      start = firstDay.toISOString().split('T')[0];
      end = midDay.toISOString().split('T')[0];
      label = `1ª Quinzena (${monthShort[selectedMonth]}/${selectedYear})`;
    } else if (periodType === 'QUINZENAL_2') {
      const day16 = new Date(selectedYear, selectedMonth, 16);
      const lastDay = new Date(selectedYear, selectedMonth + 1, 0);
      start = day16.toISOString().split('T')[0];
      end = lastDay.toISOString().split('T')[0];
      label = `2ª Quinzena (${monthShort[selectedMonth]}/${selectedYear})`;
    } else {
      start = customStartDate;
      end = customEndDate;
      label = `${new Date(customStartDate + 'T00:00:00').toLocaleDateString('pt-BR')} a ${new Date(customEndDate + 'T00:00:00').toLocaleDateString('pt-BR')}`;
    }

    return { start, end, label };
  };

  const { start: periodStartDate, end: periodEndDate, label: periodLabel } = calculatePeriodDates();



  // Filter procedures when clinic or dates change
  useEffect(() => {
    if (!selectedClinicId || !allAnesthesias.length) return;

    setIsLoadingProcedures(true);
    const filtered = allAnesthesias.filter((anes) => {
      if (Number(anes.clinic_id) !== Number(selectedClinicId)) return false;
      const anesDate = anes.date || (anes.created_at ? anes.created_at.split('T')[0] : '');
      return anesDate >= periodStartDate && anesDate <= periodEndDate;
    });

    const mappedItems: ClinicBillingInvoiceItem[] = filtered.map((anes) => ({
      id: anes.id,
      date: anes.date,
      code: anes.code,
      procedure_name: anes.procedure_name || 'Procedimento Anestésico-Cirúrgico',
      patient_name: anes.patient_name || 'Paciente',
      patient_species: anes.patient_species,
      surgeon_name: anes.surgeon_name,
      tutor_name: anes.tutor_name,
      asa_category: anes.asa_category ? anes.asa_category.replace('_', ' ') : 'ASA II',
      amount: Number(anes.total_billed_amount) || 0,
      included: true
    }));

    setItems(mappedItems);
    setIsLoadingProcedures(false);
  }, [selectedClinicId, allAnesthesias, periodStartDate, periodEndDate]);

  // Totals
  const includedItems = items.filter((it) => it.included !== false);
  const totalAmount = includedItems.reduce((acc, it) => acc + (Number(it.amount) || 0), 0);
  const totalProcedures = includedItems.length;

  // Generate PIX QR Code & Payload
  useEffect(() => {
    if (!pixKey.trim() || totalAmount <= 0) {
      setPixPayload('');
      setQrCodeDataUrl('');
      return;
    }

    try {
      const payload = generatePixPayload({
        pixKey: pixKey.trim(),
        receiverName: receiverName.trim() || 'VETERINARIO',
        city: pixCity.trim() || 'BRASIL',
        amount: totalAmount,
        description: `Fatura ${invoiceNumber} ${activeClinic?.name || ''}`.substring(0, 25)
      });

      setPixPayload(payload);

      QRCode.toDataURL(payload, {
        width: 280,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      }).then((url) => {
        setQrCodeDataUrl(url);
      }).catch((e) => console.warn('QR code gen error:', e));
    } catch (e) {
      console.warn('PIX payload error:', e);
    }
  }, [pixKey, receiverName, pixCity, totalAmount, invoiceNumber, activeClinic]);

  if (!isOpen) return null;

  const handleToggleItem = (id: string | number) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, included: !it.included } : it))
    );
  };

  const handleAmountChange = (id: string | number, newAmount: number) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, amount: Math.max(0, newAmount) } : it))
    );
  };

  const handleAddManualItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualItemForm.procedure_name.trim()) return;

    const newItem: ClinicBillingInvoiceItem = {
      id: `manual-${Date.now()}`,
      date: manualItemForm.date,
      code: `PROC-${String(items.length + 1).padStart(3, '0')}`,
      procedure_name: manualItemForm.procedure_name,
      patient_name: manualItemForm.patient_name || 'Paciente',
      surgeon_name: manualItemForm.surgeon_name || 'Equipe Cirúrgica',
      amount: Number(manualItemForm.amount) || 0,
      included: true
    };

    setItems((prev) => [newItem, ...prev]);
    setManualItemForm({
      procedure_name: '',
      patient_name: '',
      surgeon_name: '',
      amount: 0,
      date: now.toISOString().split('T')[0]
    });
    setShowAddManualItem(false);
  };

  const handleCopyPix = () => {
    if (!pixPayload) return;
    navigator.clipboard.writeText(pixPayload);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 3000);
  };

  const handleSavePixConfig = async () => {
    try {
      await api.updateUserProfile({
        pix_key: pixKey.trim(),
        pix_receiver_name: receiverName.trim(),
        pix_city: pixCity.trim()
      });
      await refreshUser();
      setShowPixConfig(false);
    } catch (e) {
      console.error('Erro ao salvar chave PIX:', e);
    }
  };

  const handleSaveInvoice = async (): Promise<ClinicBillingInvoice | null> => {
    try {
      setIsSaving(true);
      const finalInvoiceNumber =
        invoiceNumber.trim() ||
        `FAT-${activeClinic?.code ? activeClinic.code.replace(/[^a-zA-Z0-9]/g, '') : 'CL'}-${Date.now().toString().slice(-6)}`;
      const finalClosingDate = closingDate || new Date().toISOString().split('T')[0];

      const invoiceData: Partial<ClinicBillingInvoice> & { create_financial_entry?: boolean } = {
        invoice_number: finalInvoiceNumber,
        clinic_id: activeClinic.id,
        clinic_name: activeClinic.name,
        clinic_corporate_name: activeClinic.corporate_name,
        clinic_cnpj: activeClinic.cnpj,
        clinic_phone: activeClinic.phone || activeClinic.whatsapp,
        clinic_email: activeClinic.email,
        period_type: periodType,
        period_label: periodLabel,
        start_date: periodStartDate,
        end_date: periodEndDate,
        closing_date: finalClosingDate,
        due_date: dueDate,
        items: includedItems,
        total_procedures: totalProcedures,
        total_amount: totalAmount,
        status: 'PENDENTE',
        pix_key: pixKey,
        pix_receiver_name: receiverName,
        pix_city: pixCity,
        pix_payload: pixPayload,
        notes: notes,
        create_financial_entry: createFinancialEntry
      };

      const created = await api.createClinicInvoice(invoiceData);
      setIsSaving(false);
      setSaveSuccess(true);
      if (onInvoiceCreated) {
        onInvoiceCreated(created);
      }
      return created;
    } catch (e) {
      console.error('Erro ao salvar fatura:', e);
      setIsSaving(false);
      return null;
    }
  };

  const handlePrint = async () => {
    if (!saveSuccess) {
      await handleSaveInvoice();
    }
    printElement('printable-clinic-invoice', `Fatura_${activeClinic?.code || 'CL'}_${invoiceNumber}`);
  };

  const handleExportPdf = async () => {
    if (!saveSuccess) {
      await handleSaveInvoice();
    }
    exportToPdf('printable-clinic-invoice', `Fatura_${activeClinic?.code || 'CL'}_${invoiceNumber}`);
  };

  const handleShareWhatsApp = () => {
    const clinicPhone = activeClinic?.whatsapp || activeClinic?.phone || '';
    const cleanPhone = clinicPhone.replace(/\D/g, '');
    const contactName = activeClinic?.financial_contact || activeClinic?.manager_name || activeClinic?.name;

    let msg = `Olá, *${contactName}*! Segue o *Fechamento de Faturamento* de procedimentos anestésicos e cirúrgicos prestados por *Dr(a). ${user?.first_name || ''} ${user?.last_name || ''}* (CRMV-${user?.crmv_uf || 'SP'} ${user?.crmv || ''}):\n\n`;
    msg += `🏥 *Clínica:* ${activeClinic?.name}\n`;
    msg += `📄 *Fatura:* ${invoiceNumber}\n`;
    msg += `📅 *Período:* ${periodLabel}\n`;
    msg += `🔢 *Total de Procedimentos:* ${totalProcedures}\n`;
    msg += `💰 *Valor Total:* R$ ${totalAmount.toFixed(2)}\n`;
    msg += `⏰ *Data de Vencimento:* ${dueDate ? new Date(dueDate + 'T00:00:00').toLocaleDateString('pt-BR') : 'A combinar'}\n\n`;

    if (pixPayload) {
      msg += `🔑 *Chave PIX para Pagamento Direto:*\n${pixKey}\n\n`;
      msg += `📲 *PIX Copia e Cola:*\n\`${pixPayload}\`\n\n`;
    }

    msg += `O relatório analítico detalhado em PDF com cada paciente, cirurgião e procedimento foi emitido. Ficamos à total disposição!`;

    const encoded = encodeURIComponent(msg);
    const url = cleanPhone ? `https://wa.me/55${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
  };

  // Render Official A4 Invoice Sheet
  const renderPrintableInvoice = () => (
    <div
      id="printable-clinic-invoice"
      className="printable-document bg-white p-8 sm:p-10 border border-slate-300 rounded-2xl space-y-6 text-slate-800 text-xs shadow-xs"
    >
      {/* Top Header: Veterinarian & Service Provider */}
      <div className="border-b-2 border-slate-800 pb-4 flex items-start justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-800 block">
            Prestador de Serviços Médicos Veterinários
          </span>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            {user?.clinic_name || `Dr(a). ${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Serviços de Anestesiologia Veterinária'}
          </h2>
          <div className="text-xs font-semibold text-slate-700">
            Médico(a) Veterinário(a): <strong>Dr(a). {user?.first_name} {user?.last_name}</strong> • CRMV-{user?.crmv_uf || 'SP'} {user?.crmv || '34892'}
          </div>
          {user?.phone && (
            <div className="text-[11px] text-slate-500">
              Contato: {user.phone} • Email: {user.email || 'contato@vetgo.com.br'}
            </div>
          )}
        </div>

        <div className="text-right space-y-1 shrink-0">
          <span className="inline-block px-3 py-1 rounded bg-slate-900 text-white font-mono font-bold text-xs uppercase tracking-wider">
            {invoiceNumber || 'FATURA'}
          </span>
          <div className="text-[10px] text-slate-500 font-mono">
            Fechamento: {closingDate ? new Date(closingDate + 'T00:00:00').toLocaleDateString('pt-BR') : 'Não definido'}
          </div>
          <div className="text-xs font-bold text-rose-700">
            Vencimento: {dueDate ? new Date(dueDate + 'T00:00:00').toLocaleDateString('pt-BR') : 'A combinar'}
          </div>
        </div>
      </div>

      {/* Invoice Title */}
      <div className="text-center space-y-1">
        <h3 className="text-base font-black uppercase tracking-wider text-slate-900">
          Demonstrativo de Faturamento & Prestação de Serviços
        </h3>
        <p className="text-xs font-semibold text-emerald-800">
          Período de Apuração: {periodLabel}
        </p>
      </div>

      {/* Clinic (Tomador do Serviço) Information Card */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-2 gap-4 text-[11px]">
        <div className="space-y-1">
          <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block">
            Tomador do Serviço (Clínica / Hospital)
          </span>
          <div className="text-sm font-bold text-slate-900">
            {activeClinic?.name} ({activeClinic?.code})
          </div>
          {activeClinic?.corporate_name && (
            <div className="text-slate-600">Razão Social: {activeClinic.corporate_name}</div>
          )}
          {activeClinic?.cnpj && (
            <div className="text-slate-600 font-mono">CNPJ: {activeClinic.cnpj}</div>
          )}
          {activeClinic?.address && (
            <div className="text-slate-500">
              Endereço: {activeClinic.address}, {activeClinic.address_number} - {activeClinic.city}/{activeClinic.state}
            </div>
          )}
        </div>

        <div className="space-y-1 text-right">
          <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block">
            Condições Contratuais
          </span>
          <div>
            <strong>Contato Financeiro:</strong> {activeClinic?.financial_contact || activeClinic?.manager_name || 'Responsável'}
          </div>
          {activeClinic?.phone && <div>Telefone: {activeClinic.phone}</div>}
          <div className="text-emerald-800 font-semibold">
            Modelo: {activeClinic?.billing_type === 'FATURAMENTO_PERIODICO' ? 'Faturamento Periódico' : 'Por Atendimento'}
          </div>
          {activeClinic?.payment_terms && (
            <div className="text-slate-500 italic text-[10px]">
              Termos: {activeClinic.payment_terms}
            </div>
          )}
        </div>
      </div>

      {/* Procedures Table */}
      <div className="space-y-2">
        <div className="flex items-center justify-between border-b border-slate-300 pb-1">
          <h4 className="font-black text-xs uppercase tracking-wider text-slate-800">
            Procedimentos Anestésicos e Cirúrgicos Realizados ({totalProcedures}):
          </h4>
          <span className="text-[11px] text-slate-500 font-mono">
            {new Date(periodStartDate + 'T00:00:00').toLocaleDateString('pt-BR')} a {new Date(periodEndDate + 'T00:00:00').toLocaleDateString('pt-BR')}
          </span>
        </div>

        {includedItems.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-400 italic">
            Nenhum procedimento selecionado para este fechamento.
          </p>
        ) : (
          <div className="overflow-hidden border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100/90 text-slate-700 text-[10px] uppercase font-bold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3">Data</th>
                  <th className="py-2 px-3">Ficha / Cód.</th>
                  <th className="py-2 px-3">Procedimento Cirúrgico</th>
                  <th className="py-2 px-3">Paciente / Espécie</th>
                  <th className="py-2 px-3">Cirurgião</th>
                  <th className="py-2 px-3 text-right">Valor (R$)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px]">
                {includedItems.map((item, idx) => (
                  <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    <td className="py-2 px-3 font-mono text-slate-600">
                      {item.date ? new Date(item.date + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td className="py-2 px-3 font-mono font-bold text-emerald-800">
                      {item.code}
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-900">
                      {item.procedure_name}
                      {item.asa_category && (
                        <span className="ml-1 text-[9px] px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
                          {item.asa_category}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-slate-700">
                      {item.patient_name} {item.patient_species ? `(${item.patient_species})` : ''}
                    </td>
                    <td className="py-2 px-3 text-slate-600">
                      {item.surgeon_name || '-'}
                    </td>
                    <td className="py-2 px-3 font-mono font-bold text-slate-900 text-right">
                      R$ {Number(item.amount).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-900 text-xs">
                <tr>
                  <td colSpan={5} className="py-2.5 px-3 uppercase tracking-wider text-right">
                    Valor Total a Faturar:
                  </td>
                  <td className="py-2.5 px-3 font-mono text-base text-right text-emerald-800">
                    R$ {totalAmount.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* PIX Payment Section with High-Res QR Code */}
      <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
        <div className="sm:col-span-2 space-y-1.5 text-xs">
          <span className="font-black uppercase tracking-wider text-emerald-900 text-[10px] flex items-center gap-1.5">
            <QrCode className="w-4 h-4 text-emerald-700" />
            Instruções para Liquidação Direta via PIX
          </span>
          <p className="text-slate-700 text-[11px] leading-relaxed">
            Realize o pagamento escaneando o QR Code ao lado pelo aplicativo de qualquer instituição bancária ou utilize a chave PIX informada abaixo:
          </p>

          <div className="p-2.5 bg-white border border-emerald-200 rounded-xl space-y-1 font-mono text-xs">
            <div className="flex items-center justify-between text-slate-600">
              <span className="font-sans font-semibold text-[11px]">Chave PIX:</span>
              <strong className="text-slate-900">{pixKey || 'Chave não cadastrada'}</strong>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span className="font-sans font-semibold text-[11px]">Titular:</span>
              <span>{receiverName || 'Médico Veterinário'}</span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span className="font-sans font-semibold text-[11px]">Valor Exato:</span>
              <strong className="text-emerald-800 font-black">R$ {totalAmount.toFixed(2)}</strong>
            </div>
          </div>

          <div className="text-[10px] text-slate-500 italic">
            Após efetuar o pagamento, favor enviar o comprovante via WhatsApp para confirmação de baixa da fatura.
          </div>
        </div>

        <div className="flex flex-col items-center justify-center text-center p-2 bg-white rounded-xl border border-emerald-200 shadow-2xs">
          {qrCodeDataUrl ? (
            <>
              <img
                src={qrCodeDataUrl}
                alt="PIX QR Code"
                className="w-32 h-32 object-contain"
              />
              <span className="text-[9px] font-mono text-slate-500 mt-1 uppercase tracking-wider font-bold">
                Pague com PIX Copia e Cola
              </span>
            </>
          ) : (
            <div className="w-32 h-32 bg-slate-100 flex flex-col items-center justify-center text-slate-400 p-2 text-center rounded-lg text-[10px]">
              <QrCode className="w-8 h-8 mb-1" />
              <span>Configure sua chave PIX no perfil</span>
            </div>
          )}
        </div>
      </div>

      {notes && (
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
          <span className="font-bold text-[10px] uppercase tracking-wider text-slate-600 block">
            Observações Adicionais:
          </span>
          <p className="mt-0.5 text-slate-700 whitespace-pre-line">{notes}</p>
        </div>
      )}

      {/* Veterinarian Signature Section */}
      <div className="pt-6 text-center space-y-1">
        {user?.signature_url ? (
          <div className="flex flex-col items-center justify-center">
            <img
              src={user.signature_url}
              alt="Assinatura"
              className="max-h-12 max-w-[180px] object-contain mb-1 filter drop-shadow-2xs"
            />
            <div className="w-60 border-t border-slate-400 mx-auto"></div>
            <div className="text-xs font-bold text-slate-900 mt-1">
              Dr(a). {user.first_name} {user.last_name || ''}
            </div>
            <div className="text-[11px] text-slate-600 font-mono">
              Médico(a) Veterinário(a) • CRMV-{user.crmv_uf || 'SP'} {user.crmv || '34892'}
            </div>
            <div className="text-[9px] text-emerald-800 font-mono mt-1">
              Fatura e relatório autenticados digitalmente pela plataforma Vetgo
            </div>
          </div>
        ) : (
          <div className="pt-6">
            <div className="w-60 border-t border-slate-400 mx-auto"></div>
            <div className="text-xs font-bold text-slate-900 mt-1">
              Dr(a). {user?.first_name} {user?.last_name || ''}
            </div>
            <div className="text-[11px] text-slate-600 font-mono">
              CRMV-{user?.crmv_uf || 'SP'} {user?.crmv || '34892'}
            </div>
          </div>
        )}
      </div>

      {/* Discrete Footer Note */}
      <div className="pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400">
        Demonstrativo emitido via <strong>Vetgo Gestão Veterinária</strong> • Módulo de Anestesiologia & Faturamento de Clínicas
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-5xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200 overflow-y-auto max-h-[94vh] space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center border border-emerald-200 shrink-0">
              <Building2 className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>Fechamento de Faturamento com Clínicas</span>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                  {periodLabel}
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Agrupamento analítico quinzenal ou mensal de cirurgias e anestesias com fatura PDF e PIX direto
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Tab Switch */}
            <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('ITEMS')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  activeTab === 'ITEMS'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                1. Configuração & Itens
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('PREVIEW')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer ${
                  activeTab === 'PREVIEW'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Eye className="w-3.5 h-3.5 text-emerald-700" />
                <span>2. Fatura A4 & PIX</span>
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
              <span>
                Fatura <strong>{invoiceNumber}</strong> salva com sucesso e lançada no módulo financeiro como conta a receber!
              </span>
            </div>
            <span className="text-[10px] font-bold text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-200">
              Registrado
            </span>
          </div>
        )}

        {/* TAB 1: CONFIGURATION & PROCEDURES SELECTION */}
        {activeTab === 'ITEMS' && (
          <div className="space-y-5">
            {/* Filter Bar: Clinic & Period */}
            <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Clinic Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Clínica Parceira *
                  </label>
                  <select
                    value={selectedClinicId}
                    onChange={(e) => setSelectedClinicId(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl outline-none focus:border-emerald-600"
                  >
                    {clinics.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} - {c.name} {c.city ? `(${c.city})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Period Mode */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Periodicidade do Fechamento *
                  </label>
                  <select
                    value={periodType}
                    onChange={(e) => setPeriodType(e.target.value as ClinicBillingPeriodType)}
                    className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl outline-none focus:border-emerald-600"
                  >
                    <option value="MENSAL">Fechamento Mensal (Mês Completo)</option>
                    <option value="QUINZENAL_1">1ª Quinzena (Dias 01 a 15)</option>
                    <option value="QUINZENAL_2">2ª Quinzena (Dias 16 ao Fim do Mês)</option>
                    <option value="PERSONALIZADO">Período Personalizado (Datas Livres)</option>
                  </select>
                </div>

                {/* Month/Year selector if not customized */}
                {periodType !== 'PERSONALIZADO' ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Mês</label>
                      <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        className="w-full px-2.5 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl outline-none focus:border-emerald-600"
                      >
                        {[
                          'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                          'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
                        ].map((m, idx) => (
                          <option key={idx} value={idx}>{m}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Ano</label>
                      <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="w-full px-2.5 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl outline-none focus:border-emerald-600"
                      >
                        {[2025, 2026, 2027].map((y) => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Data Inicial</label>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="w-full px-2 py-2 text-xs bg-white border border-slate-300 rounded-xl outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Data Final</label>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="w-full px-2 py-2 text-xs bg-white border border-slate-300 rounded-xl outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Due Date & Invoice Number Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-200/80 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Número da Fatura
                  </label>
                  <input
                    type="text"
                    autoComplete="off"
                    placeholder="Ex: FAT-001 (opcional)"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full px-3 py-1.5 font-mono font-bold bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:font-normal placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Data do Fechamento
                  </label>
                  <input
                    type="date"
                    autoComplete="off"
                    value={closingDate}
                    onChange={(e) => setClosingDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Data de Vencimento da Fatura *
                  </label>
                  <input
                    type="date"
                    autoComplete="off"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-bold text-emerald-900 focus:border-emerald-600"
                  />
                </div>
              </div>
            </div>

            {/* Procedures Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-emerald-700" />
                    Procedimentos Identificados no Período ({items.length})
                  </h4>
                  <span className="text-[11px] font-semibold text-slate-500">
                    ({totalProcedures} incluídos)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddManualItem(!showAddManualItem)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-700" />
                    <span>+ Adicionar Procedimento Manual</span>
                  </button>
                </div>
              </div>

              {/* Form to add manual procedure */}
              {showAddManualItem && (
                <form
                  onSubmit={handleAddManualItem}
                  className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl grid grid-cols-1 sm:grid-cols-5 gap-2.5 text-xs"
                >
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-0.5">Procedimento / Cirurgia *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Mastectomia Unilateral, Endoscopia..."
                      value={manualItemForm.procedure_name}
                      onChange={(e) => setManualItemForm({ ...manualItemForm, procedure_name: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-0.5">Paciente</label>
                    <input
                      type="text"
                      placeholder="Nome do pet"
                      value={manualItemForm.patient_name}
                      onChange={(e) => setManualItemForm({ ...manualItemForm, patient_name: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-0.5">Valor (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={manualItemForm.amount || ''}
                      onChange={(e) => setManualItemForm({ ...manualItemForm, amount: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold"
                    />
                  </div>

                  <div className="flex items-end gap-1.5">
                    <button
                      type="submit"
                      className="flex-1 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs shadow-2xs cursor-pointer"
                    >
                      Inserir
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddManualItem(false)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              )}

              {/* Items List */}
              {isLoadingProcedures ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  Carregando procedimentos da clínica...
                </div>
              ) : items.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded-2xl space-y-2">
                  <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-semibold text-slate-600">
                    Nenhum procedimento anestésico localizado para {activeClinic?.name} no período de {periodLabel}.
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Você pode selecionar outro período acima ou usar o botão "+ Adicionar Procedimento Manual" para inserir cirurgias realizadas.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-600 text-[10px] uppercase font-bold tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 w-10 text-center">Incluir</th>
                        <th className="py-2.5 px-3">Data</th>
                        <th className="py-2.5 px-3">Código</th>
                        <th className="py-2.5 px-3">Procedimento</th>
                        <th className="py-2.5 px-3">Paciente</th>
                        <th className="py-2.5 px-3">Cirurgião</th>
                        <th className="py-2.5 px-3 text-right">Valor Cobrado (R$)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {items.map((item) => (
                        <tr
                          key={item.id}
                          className={`transition ${
                            item.included !== false ? 'bg-white hover:bg-slate-50/70' : 'bg-slate-50/60 opacity-50'
                          }`}
                        >
                          <td className="py-2 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={item.included !== false}
                              onChange={() => handleToggleItem(item.id)}
                              className="rounded border-slate-300 text-emerald-700 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                            />
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-600">
                            {item.date ? new Date(item.date + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}
                          </td>
                          <td className="py-2 px-3 font-mono font-bold text-emerald-800">
                            {item.code}
                          </td>
                          <td className="py-2 px-3 font-semibold text-slate-900">
                            {item.procedure_name}
                          </td>
                          <td className="py-2 px-3 text-slate-700">
                            {item.patient_name} {item.patient_species ? `(${item.patient_species})` : ''}
                          </td>
                          <td className="py-2 px-3 text-slate-600">
                            {item.surgeon_name || '-'}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.amount || ''}
                              onChange={(e) => handleAmountChange(item.id, parseFloat(e.target.value) || 0)}
                              className="w-24 px-2 py-1 text-right font-mono font-bold border border-slate-200 rounded-lg text-slate-900 focus:border-emerald-600 outline-none"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Total Summary Banner & PIX Quick Configuration */}
            <div className="p-4 bg-gradient-to-r from-emerald-800 to-teal-800 rounded-2xl text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
              <div>
                <span className="text-[10px] font-bold text-emerald-200 uppercase tracking-wider block">
                  Resumo do Fechamento de Faturamento
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl sm:text-3xl font-black">
                    R$ {totalAmount.toFixed(2)}
                  </span>
                  <span className="text-xs text-emerald-100 font-semibold">
                    ({totalProcedures} procedimentos selecionados)
                  </span>
                </div>
                <p className="text-[11px] text-emerald-200/90 mt-0.5">
                  Vencimento previsto para <strong>{dueDate ? new Date(dueDate + 'T00:00:00').toLocaleDateString('pt-BR') : 'A definir'}</strong>
                </p>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setShowPixConfig(!showPixConfig)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition border border-white/20 cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Configurar Chave PIX</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('PREVIEW')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-emerald-900 hover:bg-emerald-50 rounded-xl text-xs font-black transition shadow-sm cursor-pointer"
                >
                  <span>Ver Fatura A4 & PIX</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Inline PIX Config Drawer */}
            {showPixConfig && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-emerald-700" />
                    Chave PIX do Veterinário para Recebimento das Clínicas:
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPixConfig(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Chave PIX (CPF, CNPJ, Celular, E-mail ou Aleatória)</label>
                    <input
                      type="text"
                      value={pixKey}
                      onChange={(e) => setPixKey(e.target.value)}
                      placeholder="Ex: 11987654321 ou crmv@gmail.com"
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Nome do Titular da Conta</label>
                    <input
                      type="text"
                      value={receiverName}
                      onChange={(e) => setReceiverName(e.target.value)}
                      placeholder="Nome completo ou Razão Social"
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Cidade da Conta</label>
                    <input
                      type="text"
                      value={pixCity}
                      onChange={(e) => setPixCity(e.target.value)}
                      placeholder="Ex: SAO PAULO"
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={handleSavePixConfig}
                    className="px-3 py-1.5 bg-emerald-700 text-white rounded-lg font-bold text-xs hover:bg-emerald-800 transition cursor-pointer"
                  >
                    Salvar Dados PIX no Perfil
                  </button>
                </div>
              </div>
            )}

            {/* Financial sync option & Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                <label className="inline-flex items-center gap-2 font-bold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createFinancialEntry}
                    onChange={(e) => setCreateFinancialEntry(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-700 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                  />
                  <span>Lançar automaticamente no Módulo Financeiro (Contas a Receber)</span>
                </label>
                <p className="text-[11px] text-slate-500 pl-6">
                  Cria uma receita pendente vinculada à clínica {activeClinic?.name} no valor total da fatura.
                </p>
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Observações da fatura (opcional, ex: Desconto de taxa, plantão extra...)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full h-full px-3 py-2 border border-slate-300 rounded-2xl text-xs bg-white outline-none focus:border-emerald-600"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PREVIEW PRINTABLE INVOICE WITH PIX */}
        {activeTab === 'PREVIEW' && (
          <div className="space-y-4">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Visualização da Fatura Oficial A4 com QR Code PIX integrado. Pronto para impressão e envio ao setor financeiro da clínica parceira.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('ITEMS')}
                className="font-bold text-emerald-800 underline cursor-pointer"
              >
                Voltar à Edição dos Itens
              </button>
            </div>

            <div className="max-h-[62vh] overflow-y-auto p-2 bg-slate-100 rounded-2xl border border-slate-200">
              {renderPrintableInvoice()}
            </div>
          </div>
        )}

        {/* Hidden Container for Print/PDF generation when in ITEMS mode */}
        {activeTab === 'ITEMS' && (
          <div className="hidden">
            {renderPrintableInvoice()}
          </div>
        )}

        {/* Actions Bar */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Fechar
            </button>

            {pixPayload && (
              <button
                type="button"
                onClick={handleCopyPix}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
                title="Copiar código PIX Copia e Cola"
              >
                {copiedPix ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedPix ? 'PIX Copiado!' : 'Copiar PIX'}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
              title="Enviar cobrança detalhada no WhatsApp da clínica"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>WhatsApp da Clínica</span>
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
              title="Baixar Fatura em PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar Fatura PDF</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
              title="Imprimir Fatura em folha A4 limpa"
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
