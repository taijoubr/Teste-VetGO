import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import {
  User as UserIcon,
  Shield,
  CreditCard,
  Image as ImageIcon,
  FileText,
  Key,
  CheckCircle2,
  Sparkles,
  ArrowUpRight,
  ExternalLink,
  Activity,
  Building2,
  UserCheck,
  Stethoscope,
  HeartPulse,
  Heart,
  Sliders,
  Check,
  Info,
  ChevronDown,
  Bell,
  QrCode,
  Send,
  MessageCircle,
  ThumbsUp,
  RotateCcw,
  Mail,
  AlertCircle,
  Smartphone,
  Download,
  Upload,
  Database,
  Zap,
  WifiOff,
  RefreshCw,
  Globe,
  Copy,
  Share2,
  Trash2,
  Plus,
  Edit2,
  Camera,
  Eye,
  EyeOff,
  DollarSign,
  Syringe,
  TestTube,
  Tag,
  ChevronRight,
  ChevronLeft,
  Calendar,
  CalendarDays,
  Clock,
  Ban,
  X
} from 'lucide-react';
import QRCode from 'qrcode';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { PushNotificationManager } from '../components/PushNotificationManager';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { ClinicalServiceItem } from '../types';

export const SettingsPage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'perfil';

  const navigate = useNavigate();
  const [pwaInstalledSuccess, setPwaInstalledSuccess] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  // Logo & Photo Upload State
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processLogoFile(file);
    e.target.value = '';
  };

  const processLogoFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setSavedMessage('Formato inválido. Por favor, selecione uma imagem PNG ou JPG.');
      setTimeout(() => setSavedMessage(null), 3500);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setSavedMessage('Arquivo muito grande. O limite máximo é de 5MB.');
      setTimeout(() => setSavedMessage(null), 3500);
      return;
    }

    setIsUploadingLogo(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        await api.updateUserProfile({ logo_url: base64 });
        await refreshUser();
        setSavedMessage('Logomarca / Foto enviada e salva com sucesso!');
        setTimeout(() => setSavedMessage(null), 3500);
      };
      reader.readAsDataURL(file);
    } catch {
      setSavedMessage('Erro ao processar imagem. Tente novamente.');
      setTimeout(() => setSavedMessage(null), 3500);
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    setIsUploadingLogo(true);
    try {
      await api.updateUserProfile({ logo_url: null });
      await refreshUser();
      setSavedMessage('Logomarca removida com sucesso.');
      setTimeout(() => setSavedMessage(null), 3000);
    } catch {
      setSavedMessage('Erro ao remover logomarca.');
      setTimeout(() => setSavedMessage(null), 3000);
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // Backup & Restauração de Dados
  const [isExportingBackup, setIsExportingBackup] = useState(false);
  const [isRestoringBackup, setIsRestoringBackup] = useState(false);
  const [backupFeedback, setBackupFeedback] = useState<{ text: string; success: boolean } | null>(null);
  const [isSyncingFirebase, setIsSyncingFirebase] = useState(false);

  const handleSyncFirebase = async () => {
    setIsSyncingFirebase(true);
    try {
      const res = await api.syncWithFirebaseCloud();
      setBackupFeedback({
        text: `Sincronização com Firebase concluída com sucesso! ${res.count} registros em nuvem atualizados.`,
        success: true
      });
    } catch {
      setBackupFeedback({
        text: 'Falha momentânea ao sincronizar com o Firebase. Seus dados continuam preservados localmente.',
        success: false
      });
    } finally {
      setIsSyncingFirebase(false);
    }
  };

  // Specialty state
  const isAnesthesiaActive = Boolean(user?.specialty_anesthesia_enabled);
  const [isUpdatingSpecialty, setIsUpdatingSpecialty] = useState(false);

  const handleToggleAnesthesia = async () => {
    setIsUpdatingSpecialty(true);
    const newValue = !isAnesthesiaActive;
    try {
      await api.updateUserProfile({
        specialty_anesthesia_enabled: newValue
      });
      await refreshUser();
      setSavedMessage(
        newValue
          ? 'Módulo de Anestesiologia ATIVADO com sucesso! As opções foram adicionadas ao menu lateral.'
          : 'Módulo de Anestesiologia DESATIVADO com sucesso! O menu lateral foi simplificado.'
      );
      setTimeout(() => setSavedMessage(null), 4000);
    } catch {
      setSavedMessage('Erro ao atualizar especialidade. Tente novamente.');
    } finally {
      setIsUpdatingSpecialty(false);
    }
  };

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    phone: user?.phone || '',
    whatsapp: user?.whatsapp || '',
    clinic_name: user?.clinic_name || ''
  });

  // Professional Form State
  const [profForm, setProfForm] = useState({
    crmv: user?.crmv || '',
    crmv_uf: user?.crmv_uf || 'SP'
  });

  // PIX Form State
  const [pixForm, setPixForm] = useState({
    pix_key: user?.pix_key || '',
    pix_receiver_name: user?.pix_receiver_name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim(),
    pix_city: user?.pix_city || 'SAO PAULO',
  });

  // Página Pública de Divulgação State
  const defaultSlug = (user?.public_slug || `${user?.first_name || ''}-${user?.last_name || ''}`).toLowerCase().replace(/[^a-z0-9]/g, '-');
  const [publicForm, setPublicForm] = useState({
    public_profile_enabled: user?.public_profile_enabled !== false,
    public_slug: user?.public_slug || defaultSlug,
    bio: user?.bio || 'Médico(a) Veterinário(a) dedicado(a) ao atendimento personalizado, preventivo e domiciliar, com foco no bem-estar e conforto do seu pet.',
    service_regions: user?.service_regions || 'Atendimento domiciliar na cidade e região metropolitana, além de clínicas parceiras.',
    opening_hours: user?.opening_hours || 'Segunda a Sexta: 08:00 às 19:00 | Sábados: 09:00 às 14:00',
    custom_welcome_message: user?.custom_welcome_message || 'Olá Dr(a)! Gostaria de informações para agendar uma consulta para meu pet.',
    instagram: user?.instagram || '',
    address_display: user?.address_display || '',
    public_layout_theme: (user?.public_layout_theme || 'CLASSIC') as 'CLASSIC' | 'MODERN' | 'BIOLINK' | 'HOME_CARE',
    hero_image_url: user?.hero_image_url || '',
    banner_image_url: user?.banner_image_url || '',
    about_image_url: user?.about_image_url || user?.logo_url || '',
    show_availability_calendar: user?.show_availability_calendar !== false,
    availability_mode: (user?.availability_mode || 'SPECIFIC_DATES') as 'SPECIFIC_DATES' | 'WEEKDAYS' | 'ALL_REQUESTABLE',
    available_dates: (user?.available_dates || []) as string[],
    available_weekdays: (user?.available_weekdays || [1, 2, 3, 4, 5]) as number[],
    blocked_dates: (user?.blocked_dates || []) as string[],
    available_slots: (user?.available_slots || ['08:00', '10:00', '14:00', '16:00']) as string[],
    availability_notice: user?.availability_notice || '',
  });
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSavingPublicPage, setIsSavingPublicPage] = useState(false);

  // Calendário Interativo de Disponibilidade no Painel
  const [calPickerDate, setCalPickerDate] = useState<Date>(() => new Date());
  const [calClickMode, setCalClickMode] = useState<'AVAILABLE' | 'BLOCKED'>('AVAILABLE');
  const [customSlotInput, setCustomSlotInput] = useState<string>('');

  // Photo Upload Refs
  const heroFileInputRef = useRef<HTMLInputElement>(null);
  const aboutFileInputRef = useRef<HTMLInputElement>(null);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);
  const servicePhotoInputRef = useRef<HTMLInputElement>(null);

  const handleUploadHeroPhoto = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setSavedMessage('Por favor, selecione uma imagem PNG ou JPG.');
      setTimeout(() => setSavedMessage(null), 3000);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setPublicForm((prev) => ({ ...prev, hero_image_url: e.target?.result as string }));
      setSavedMessage('Foto de atendimento selecionada! Lembre-se de salvar.');
      setTimeout(() => setSavedMessage(null), 3500);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadAboutPhoto = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setPublicForm((prev) => ({ ...prev, about_image_url: e.target?.result as string }));
      setSavedMessage('Foto de perfil/sobre mim selecionada! Lembre-se de salvar.');
      setTimeout(() => setSavedMessage(null), 3500);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadBannerPhoto = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setPublicForm((prev) => ({ ...prev, banner_image_url: e.target?.result as string }));
      setSavedMessage('Foto de capa do BioLink selecionada! Lembre-se de salvar.');
      setTimeout(() => setSavedMessage(null), 3500);
    };
    reader.readAsDataURL(file);
  };

  // Public Services Management State
  const [publicServices, setPublicServices] = useState<ClinicalServiceItem[]>([]);
  const [loadingPublicServices, setLoadingPublicServices] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingPublicService, setEditingPublicService] = useState<ClinicalServiceItem | null>(null);
  const [serviceFormData, setServiceFormData] = useState({
    name: '',
    category: 'CONSULTA' as ClinicalServiceItem['category'],
    price: 150,
    public_description: '',
    photo_url: '',
    show_on_public_page: true,
  });

  const loadPublicServices = async () => {
    try {
      setLoadingPublicServices(true);
      const list = await api.getServices();
      setPublicServices(list);
    } catch (e) {
      console.warn('Erro ao carregar serviços públicos:', e);
    } finally {
      setLoadingPublicServices(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'pagina_publica') {
      loadPublicServices();
    }
  }, [activeTab]);

  const handleOpenAddService = () => {
    setEditingPublicService(null);
    setServiceFormData({
      name: '',
      category: 'CONSULTA',
      price: 150,
      public_description: '',
      photo_url: '',
      show_on_public_page: true,
    });
    setShowServiceModal(true);
  };

  const handleOpenEditService = (svc: ClinicalServiceItem) => {
    setEditingPublicService(svc);
    setServiceFormData({
      name: svc.name,
      category: svc.category,
      price: svc.price,
      public_description: svc.public_description || svc.description || '',
      photo_url: svc.photo_url || '',
      show_on_public_page: svc.show_on_public_page !== false,
    });
    setShowServiceModal(true);
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceFormData.name.trim()) return;

    try {
      if (editingPublicService) {
        await api.updateService(editingPublicService.id, {
          ...editingPublicService,
          name: serviceFormData.name,
          category: serviceFormData.category,
          price: serviceFormData.price,
          public_description: serviceFormData.public_description,
          description: serviceFormData.public_description || editingPublicService.description,
          photo_url: serviceFormData.photo_url,
          show_on_public_page: serviceFormData.show_on_public_page,
        });
        setSavedMessage(`Serviço "${serviceFormData.name}" atualizado com sucesso!`);
      } else {
        await api.createService({
          name: serviceFormData.name,
          category: serviceFormData.category,
          price: serviceFormData.price,
          public_description: serviceFormData.public_description,
          description: serviceFormData.public_description,
          photo_url: serviceFormData.photo_url,
          show_on_public_page: serviceFormData.show_on_public_page,
          is_active: true,
        });
        setSavedMessage(`Serviço "${serviceFormData.name}" adicionado ao seu site com sucesso!`);
      }
      setShowServiceModal(false);
      await loadPublicServices();
      setTimeout(() => setSavedMessage(null), 3000);
    } catch {
      setSavedMessage('Erro ao salvar serviço. Tente novamente.');
      setTimeout(() => setSavedMessage(null), 3000);
    }
  };

  const handleToggleServicePublic = async (svc: ClinicalServiceItem) => {
    const updatedStatus = svc.show_on_public_page === false;
    try {
      await api.updateService(svc.id, { show_on_public_page: updatedStatus });
      setPublicServices((prev) =>
        prev.map((s) => (s.id === svc.id ? { ...s, show_on_public_page: updatedStatus } : s))
      );
      setSavedMessage(
        `Serviço "${svc.name}" ${updatedStatus ? 'agora é exibido no seu site público!' : 'foi ocultado do seu site público.'}`
      );
      setTimeout(() => setSavedMessage(null), 3000);
    } catch {
      setSavedMessage('Erro ao atualizar status do serviço.');
    }
  };

  // Service Deletion Confirmation State
  const [serviceToDelete, setServiceToDelete] = useState<ClinicalServiceItem | null>(null);
  const [isDeletingService, setIsDeletingService] = useState(false);

  const handleDeleteService = (svc: ClinicalServiceItem) => {
    setServiceToDelete(svc);
  };

  const confirmDeleteService = async () => {
    if (!serviceToDelete) return;
    setIsDeletingService(true);
    try {
      await api.deleteService(serviceToDelete.id);
      setPublicServices((prev) => prev.filter((s) => s.id !== serviceToDelete.id));
      setSavedMessage(`Serviço "${serviceToDelete.name}" removido com sucesso.`);
      setTimeout(() => setSavedMessage(null), 3000);
      setServiceToDelete(null);
    } catch {
      setSavedMessage('Erro ao excluir serviço.');
    } finally {
      setIsDeletingService(false);
    }
  };

  useEffect(() => {
    const fullPublicUrl = `${window.location.origin}/vet/${publicForm.public_slug}`;
    QRCode.toDataURL(fullPublicUrl, { width: 300, margin: 2 })
      .then((url) => setQrCodeDataUrl(url))
      .catch(() => {});
  }, [publicForm.public_slug]);

  const handleSavePublicPage = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPublicPage(true);
    try {
      const cleanSlug = publicForm.public_slug.trim().toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
      await api.updateUserProfile({
        ...publicForm,
        public_slug: cleanSlug
      });
      await refreshUser();
      setPublicForm((prev) => ({ ...prev, public_slug: cleanSlug }));
      setSavedMessage('Página de divulgação atualizada com sucesso!');
      setTimeout(() => setSavedMessage(null), 3500);
    } catch {
      setSavedMessage('Erro ao atualizar página de divulgação.');
    } finally {
      setIsSavingPublicPage(false);
    }
  };

  // Specialty Request State
  const [requestedSpecialty, setRequestedSpecialty] = useState('');
  const [specialtyDetails, setSpecialtyDetails] = useState('');
  const [specialtySubmitted, setSpecialtySubmitted] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.updateUserProfile({ ...profileForm, ...profForm, ...pixForm });
    await refreshUser();
    setSavedMessage('Alterações salvas com sucesso!');
    setTimeout(() => setSavedMessage(null), 3000);
  };

  const handleExportBackup = async () => {
    try {
      setIsExportingBackup(true);
      const jsonStr = await api.exportFullBackup();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `vetgo-backup-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setBackupFeedback({
        text: 'Backup completo exportado com sucesso! O arquivo JSON com todos os seus tutores, pacientes, clínicas, cirurgiões e fichas foi salvo no seu dispositivo.',
        success: true
      });
    } catch (err: any) {
      setBackupFeedback({
        text: `Erro ao exportar backup: ${err.message}`,
        success: false
      });
    } finally {
      setIsExportingBackup(false);
      setTimeout(() => setBackupFeedback(null), 6000);
    }
  };

  const handleRestoreBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsRestoringBackup(true);
      const text = await file.text();
      const data = JSON.parse(text);
      const res = await api.restoreFullBackup(data);
      setBackupFeedback({
        text: res.message,
        success: true
      });
      await refreshUser();
    } catch (err: any) {
      setBackupFeedback({
        text: `Falha ao restaurar o backup: ${err.message}`,
        success: false
      });
    } finally {
      setIsRestoringBackup(false);
      e.target.value = '';
      setTimeout(() => setBackupFeedback(null), 8000);
    }
  };

  const tabs = [
    { id: 'perfil', name: 'Perfil Pessoal', icon: UserIcon },
    { id: 'pagina_publica', name: 'Página de Divulgação (Link Público)', icon: Globe },
    { id: 'servicos', name: 'Serviços & Exames', icon: Stethoscope },
    { id: 'especialidades', name: 'Especialidades & Módulos', icon: Activity },
    { id: 'profissional', name: 'Dados Profissionais', icon: Shield },
    { id: 'identidade', name: 'Identidade Visual & Logo', icon: ImageIcon },
    { id: 'notificacoes', name: 'Notificações Push', icon: Bell },
    { id: 'aplicativo', name: 'Instalar no Celular (App)', icon: Smartphone },
    { id: 'seguranca', name: 'Conta & Senha', icon: Key },
    { id: 'assinatura', name: 'Assinatura & Plano', icon: CreditCard },
  ];

  return (
    <div className="p-3 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6 w-full min-w-0">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Configurações da Conta
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Gerencie suas preferências profissionais, documentos, dados de acesso e plano
        </p>
      </div>

      {savedMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{savedMessage}</span>
        </div>
      )}

      {/* Mobile Selector Dropdown (Eliminates horizontal scrolling on mobile entirely) */}
      <div className="sm:hidden w-full">
        <label htmlFor="settings-tab-select" className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
          Seção das Configurações
        </label>
        <div className="relative">
          <select
            id="settings-tab-select"
            value={activeTab}
            onChange={(e) => setSearchParams({ tab: e.target.value })}
            className="w-full appearance-none bg-white border border-slate-300 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 shadow-2xs outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 pr-10 cursor-pointer"
          >
            {tabs.map((tab) => (
              <option key={tab.id} value={tab.id}>
                {tab.name}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-500">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Responsive Wrapping Navigation Pills (No overflow-x-auto, wraps cleanly without horizontal scroll) */}
      <div className="flex flex-wrap gap-1.5 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/80">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSearchParams({ tab: tab.id })}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                isActive
                  ? 'bg-white text-emerald-800 shadow-xs border border-emerald-600/30'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <tab.icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-emerald-700' : 'text-slate-400'}`} />
              <span>{tab.name}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 sm:p-6 shadow-2xs w-full min-w-0">
        {activeTab === 'perfil' && (
          <form onSubmit={handleSaveProfile} className="space-y-4 max-w-lg">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Informações de Contato</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nome</label>
                <input
                  type="text"
                  value={profileForm.first_name}
                  onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Sobrenome</label>
                <input
                  type="text"
                  value={profileForm.last_name}
                  onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">E-mail (Login)</label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 bg-slate-50 rounded-lg text-slate-500 cursor-not-allowed"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Telefone Principal</label>
                <input
                  type="text"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">WhatsApp para Tutores</label>
                <input
                  type="text"
                  value={profileForm.whatsapp}
                  onChange={(e) => setProfileForm({ ...profileForm, whatsapp: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nome Fantasia / Clínica Volante</label>
              <input
                type="text"
                value={profileForm.clinic_name}
                onChange={(e) => setProfileForm({ ...profileForm, clinic_name: e.target.value })}
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none"
              />
            </div>

            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white transition cursor-pointer"
            >
              Salvar Alterações
            </button>
          </form>
        )}

        {/* TAB: PÁGINA PÚBLICA DE DIVULGAÇÃO & AGENDAMENTO */}
        {activeTab === 'pagina_publica' && (
          <div className="space-y-6 max-w-3xl">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Globe className="w-5 h-5 text-emerald-700" />
                Página Profissional de Divulgação (Link Público)
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Seu link oficial na web para divulgar no Instagram, WhatsApp e cartões de visita. Tutores podem consultar seus serviços, áreas de atendimento e solicitar agendamentos diretamente para você.
              </p>
            </div>

            {/* Link Preview & Quick Actions Card */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Status da Página:
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        publicForm.public_profile_enabled
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          publicForm.public_profile_enabled ? 'bg-emerald-500' : 'bg-slate-400'
                        }`}
                      />
                      {publicForm.public_profile_enabled ? 'Ativa & Acessível na Web' : 'Temporariamente Pausada'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Qualquer tutor ou clínica pode acessar seu perfil sem precisar de cadastro prévio.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={publicForm.public_profile_enabled}
                    onChange={(e) =>
                      setPublicForm({ ...publicForm, public_profile_enabled: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Link Box */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Endereço Web da sua Página Oficial:
                </label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="flex-1 flex items-center px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 overflow-hidden">
                    <Globe className="w-3.5 h-3.5 text-emerald-600 mr-2 shrink-0" />
                    <span className="truncate">
                      {window.location.origin}/vet/{publicForm.public_slug || 'seunome'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const fullUrl = `${window.location.origin}/vet/${publicForm.public_slug}`;
                        navigator.clipboard.writeText(fullUrl);
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 2500);
                      }}
                      className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? 'Copiado!' : 'Copiar Link'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        const cleanSlug = (publicForm.public_slug || 'veterinario-teste').trim().toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
                        try {
                          await api.updateUserProfile({
                            ...publicForm,
                            public_slug: cleanSlug
                          });
                          await refreshUser();
                        } catch {}
                        navigate(`/vet/${cleanSlug}`);
                      }}
                      className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>Visualizar Página</span>
                    </button>

                    <a
                      href={`/vet/${publicForm.public_slug || 'veterinario-teste'}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-2 rounded-xl border border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-xs font-medium transition flex items-center justify-center cursor-pointer"
                      title="Abrir em Nova Aba Externa"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>

              {/* QR Code Section */}
              {qrCodeDataUrl && (
                <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-4 bg-slate-50/80 p-3.5 rounded-xl">
                  <img
                    src={qrCodeDataUrl}
                    alt="QR Code da Página Pública"
                    className="w-24 h-24 bg-white p-1 rounded-lg border border-slate-200 shadow-2xs shrink-0"
                  />
                  <div className="flex-1 text-center sm:text-left space-y-1">
                    <h4 className="text-xs font-bold text-slate-900 flex items-center justify-center sm:justify-start gap-1.5">
                      <QrCode className="w-3.5 h-3.5 text-emerald-700" />
                      QR Code para Cartão de Visitas e Panfletos
                    </h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Imprima este código em seus materiais físicos ou use nos stories do Instagram para que clientes apontem a câmera e abram sua página direto no celular.
                    </p>
                    <div className="pt-1">
                      <a
                        href={qrCodeDataUrl}
                        download={`qrcode-vetgo-${publicForm.public_slug}.png`}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 text-[11px] font-bold transition"
                      >
                        <Download className="w-3 h-3 text-slate-500" />
                        <span>Baixar Imagem do QR Code (.PNG)</span>
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Customization Form */}
            <form onSubmit={handleSavePublicPage} className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2">
                Personalização dos Dados da Página
              </h4>

              {/* Seletor Visual dos 3 Modelos de Layout */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-800">
                    Escolha o Modelo de Layout da sua Página Pública:
                  </label>
                  <span className="text-[11px] text-emerald-700 font-medium">
                    3 Modelos Disponíveis
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Modelo 1: Profissional / Clínico */}
                  <button
                    type="button"
                    onClick={() => setPublicForm({ ...publicForm, public_layout_theme: 'CLASSIC' })}
                    className={`p-3.5 rounded-2xl border text-left transition relative cursor-pointer flex flex-col justify-between ${
                      publicForm.public_layout_theme === 'CLASSIC'
                        ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-600/20 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                          1
                        </div>
                        {publicForm.public_layout_theme === 'CLASSIC' ? (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-200/60 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Check className="w-3 h-3" /> Selecionado
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-400">Clique para ativar</span>
                        )}
                      </div>
                      <h5 className="text-xs font-bold text-slate-900">Modelo 1 — Profissional / Clínico</h5>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        Mais sóbrio e institucional. Transmite confiança e profissionalismo.
                      </p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-200/60 text-[10px] font-semibold text-slate-600">
                      Grade completa de serviços, bio e autoridade
                    </div>
                  </button>

                  {/* Modelo 2: Moderno / Visual */}
                  <button
                    type="button"
                    onClick={() => setPublicForm({ ...publicForm, public_layout_theme: 'MODERN' })}
                    className={`p-3.5 rounded-2xl border text-left transition relative cursor-pointer flex flex-col justify-between ${
                      publicForm.public_layout_theme === 'MODERN' || publicForm.public_layout_theme === 'HOME_CARE'
                        ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-600/20 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                          2
                        </div>
                        {publicForm.public_layout_theme === 'MODERN' || publicForm.public_layout_theme === 'HOME_CARE' ? (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-200/60 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Check className="w-3 h-3" /> Selecionado
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-400">Clique para ativar</span>
                        )}
                      </div>
                      <h5 className="text-xs font-bold text-slate-900">Modelo 2 — Moderno / Visual</h5>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        Mais chamativo e moderno. Ideal para divulgação e redes sociais.
                      </p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-200/60 text-[10px] font-semibold text-slate-600">
                      Hero acolhedor, cards fotográficos e WhatsApp
                    </div>
                  </button>

                  {/* Modelo 3: Perfil / Cartão Profissional */}
                  <button
                    type="button"
                    onClick={() => setPublicForm({ ...publicForm, public_layout_theme: 'BIOLINK' })}
                    className={`p-3.5 rounded-2xl border text-left transition relative cursor-pointer flex flex-col justify-between ${
                      publicForm.public_layout_theme === 'BIOLINK'
                        ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-600/20 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                          3
                        </div>
                        {publicForm.public_layout_theme === 'BIOLINK' ? (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-200/60 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Check className="w-3 h-3" /> Selecionado
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-400">Clique para ativar</span>
                        )}
                      </div>
                      <h5 className="text-xs font-bold text-slate-900">Modelo 3 — Perfil / Cartão profissional</h5>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        Mais compacto e direto. Ideal para link na bio do Instagram.
                      </p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-200/60 text-[10px] font-semibold text-slate-600">
                      Botões rápidos, calendário de horários e avaliações
                    </div>
                  </button>
                </div>
              </div>

              {/* ----------------------------------------------------------------- */}
              {/* GERENCIADOR DE FOTOS E IMAGENS DA PÁGINA PÚBLICA                 */}
              {/* ----------------------------------------------------------------- */}
              <div className="pt-4 border-t border-slate-200/90 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-emerald-700" />
                      Fotos e Imagens da Página Pública
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Personalize a sua foto profissional, a foto principal de atendimento e o banner de capa.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Foto 1: Perfil / Sobre Mim */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-slate-900 block">
                        1. Foto de Perfil / Sobre Mim
                      </span>
                      <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                        Aparece no bloco "Sobre mim" e no avatar com selo verificado do Modelo 3.
                      </p>
                    </div>

                    <div className="flex items-center gap-3 py-1">
                      <img
                        src={publicForm.about_image_url || publicForm.about_image_url || user?.logo_url || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=300&q=80'}
                        alt="Foto do Veterinário"
                        className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-600/30 shadow-xs bg-white shrink-0"
                      />
                      <div className="space-y-1.5 flex-1">
                        <input
                          type="file"
                          ref={aboutFileInputRef}
                          accept="image/png, image/jpeg, image/webp"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleUploadAboutPhoto(f);
                            e.target.value = '';
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => aboutFileInputRef.current?.click()}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Upload className="w-3 h-3 text-slate-500" />
                          <span>Enviar Minha Foto</span>
                        </button>
                        {publicForm.about_image_url && (
                          <button
                            type="button"
                            onClick={() => setPublicForm({ ...publicForm, about_image_url: '' })}
                            className="w-full text-center text-[10px] text-rose-600 hover:underline cursor-pointer block"
                          >
                            Restaurar padrão
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Foto 2: Foto Principal / Hero Banner */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-slate-900 block">
                        2. Foto Principal de Atendimento (Hero)
                      </span>
                      <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                        Destaque do topo nos Modelos 1 e 2 (mostra o carinho com cães e gatos).
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="h-20 w-full rounded-xl overflow-hidden border border-slate-200 relative">
                        <img
                          src={publicForm.hero_image_url || 'https://images.unsplash.com/photo-1628009368231-7bb7cfcb0def?auto=format&fit=crop&w=600&q=80'}
                          alt="Foto Hero"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded font-mono">
                          {publicForm.hero_image_url ? 'Personalizada' : 'Padrão'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <input
                          type="file"
                          ref={heroFileInputRef}
                          accept="image/png, image/jpeg, image/webp"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleUploadHeroPhoto(f);
                            e.target.value = '';
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => heroFileInputRef.current?.click()}
                          className="flex-1 px-2 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Upload className="w-3 h-3 text-slate-500" />
                          <span>Enviar Foto</span>
                        </button>

                        {publicForm.hero_image_url && (
                          <button
                            type="button"
                            onClick={() => setPublicForm({ ...publicForm, hero_image_url: '' })}
                            className="px-2 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-[11px] font-medium transition cursor-pointer"
                            title="Restaurar foto padrão"
                          >
                            <RotateCcw className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Foto 3: Banner de Capa (BioLink / Modelo 3) */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-slate-900 block">
                        3. Banner de Capa (BioLink / Modelo 3)
                      </span>
                      <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                        Foto panorâmica de cabeçalho no estilo cartão profissional de link na bio.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="h-20 w-full rounded-xl overflow-hidden border border-slate-200 relative">
                        <img
                          src={publicForm.banner_image_url || 'https://images.unsplash.com/photo-1548767797-d8c844163c4c?auto=format&fit=crop&w=600&q=80'}
                          alt="Banner Capa"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded font-mono">
                          {publicForm.banner_image_url ? 'Personalizada' : 'Padrão'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <input
                          type="file"
                          ref={bannerFileInputRef}
                          accept="image/png, image/jpeg, image/webp"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleUploadBannerPhoto(f);
                            e.target.value = '';
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => bannerFileInputRef.current?.click()}
                          className="flex-1 px-2 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Upload className="w-3 h-3 text-slate-500" />
                          <span>Enviar Capa</span>
                        </button>

                        {publicForm.banner_image_url && (
                          <button
                            type="button"
                            onClick={() => setPublicForm({ ...publicForm, banner_image_url: '' })}
                            className="px-2 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-[11px] font-medium transition cursor-pointer"
                            title="Restaurar capa padrão"
                          >
                            <RotateCcw className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ----------------------------------------------------------------- */}
              {/* GERENCIADOR DE SERVIÇOS EXIBIDOS NA PÁGINA PÚBLICA               */}
              {/* ----------------------------------------------------------------- */}
              <div className="pt-4 border-t border-slate-200/90 space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <Stethoscope className="w-4 h-4 text-emerald-700" />
                      Serviços Prestados Exibidos no Site ({publicServices.filter(s => s.show_on_public_page !== false).length} Ativos)
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Informe aos tutores quais serviços você presta (valores não são exibidos no site).
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleOpenAddService}
                      className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Novo Serviço no Site</span>
                    </button>
                    <Link
                      to="/servicos"
                      className="px-2.5 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium transition"
                    >
                      Catálogo Geral
                    </Link>
                  </div>
                </div>

                {loadingPublicServices ? (
                  <div className="py-6 text-center text-xs text-slate-500">
                    <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Carregando serviços...
                  </div>
                ) : publicServices.length === 0 ? (
                  <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl text-center space-y-2">
                    <p className="text-xs font-semibold text-emerald-950">
                      Você ainda não cadastrou serviços específicos. O site está exibindo os serviços padrão de modelo.
                    </p>
                    <p className="text-[11px] text-emerald-800">
                      Clique em <strong>"+ Novo Serviço no Site"</strong> para adicionar seus atendimentos!
                    </p>
                    <button
                      type="button"
                      onClick={handleOpenAddService}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Cadastrar Meu Primeiro Atendimento
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {publicServices.map((svc) => {
                      const isPublic = svc.show_on_public_page !== false;
                      return (
                        <div
                          key={svc.id}
                          className={`p-3 rounded-xl border transition flex items-center justify-between gap-3 ${
                            isPublic
                              ? 'bg-white border-slate-200/90 shadow-2xs'
                              : 'bg-slate-50 border-slate-200 opacity-60'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                              isPublic ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-slate-200 text-slate-500'
                            }`}>
                              {svc.category === 'VACINA' ? (
                                <Syringe className="w-4 h-4" />
                              ) : svc.category === 'EXAME' ? (
                                <TestTube className="w-4 h-4" />
                              ) : (
                                <Stethoscope className="w-4 h-4" />
                              )}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <h5 className="text-xs font-bold text-slate-900 truncate">
                                  {svc.name}
                                </h5>
                                <span className="text-[9px] font-semibold text-emerald-800 bg-emerald-100/70 px-1.5 py-0.5 rounded shrink-0">
                                  {svc.category}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500 truncate">
                                {svc.public_description || svc.description || 'Atendimento domiciliar ou volante com suporte completo.'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleToggleServicePublic(svc)}
                              className={`p-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1 ${
                                isPublic
                                  ? 'bg-emerald-100/70 text-emerald-800 hover:bg-emerald-200'
                                  : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                              }`}
                              title={isPublic ? 'Ocultar do site público' : 'Exibir no site público'}
                            >
                              {isPublic ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenEditService(svc)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                              title="Editar serviço"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteService(svc)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 transition cursor-pointer"
                              title="Excluir serviço"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Slug Customization */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Personalizar Final do Link (Slug) *
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center border border-slate-300 rounded-xl overflow-hidden focus-within:border-emerald-600 focus-within:ring-1 focus-within:ring-emerald-600">
                    <span className="bg-slate-100 px-3 py-2 text-xs font-mono text-slate-500 border-r border-slate-200 select-none">
                      /vet/
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="dr-carlos-silva"
                      value={publicForm.public_slug}
                      onChange={(e) =>
                        setPublicForm({
                          ...publicForm,
                          public_slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                        })
                      }
                      className="w-full px-3 py-2 text-xs sm:text-sm outline-none font-mono text-slate-900 bg-white"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const suggested = `${user?.first_name || ''}-${user?.last_name || ''}`
                        .toLowerCase()
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '')
                        .replace(/[^a-z0-9]/g, '-');
                      setPublicForm({ ...publicForm, public_slug: suggested });
                    }}
                    className="px-3 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-600 text-xs font-medium transition whitespace-nowrap cursor-pointer"
                  >
                    Sugerir do meu nome
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Use letras minúsculas, números e traços. Ex: <code className="text-emerald-700">dr-carlos</code> ou <code className="text-emerald-700">dra-carolina-mendes</code>
                </p>
              </div>

              {/* Bio & Apresentação */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Apresentação & Sobre Você (Bio)
                </label>
                <textarea
                  rows={4}
                  value={publicForm.bio}
                  onChange={(e) => setPublicForm({ ...publicForm, bio: e.target.value })}
                  placeholder="Escreva sobre sua formação, experiência clínica, valores no atendimento e como cuida dos pacientes..."
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl outline-none focus:border-emerald-600"
                />
              </div>

              {/* Regiões e Horários */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Regiões / Bairros Atendidos
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: São Paulo - Zona Sul, Pinheiros, Moema"
                    value={publicForm.service_regions}
                    onChange={(e) => setPublicForm({ ...publicForm, service_regions: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Horários de Atendimento & Disponibilidade
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Seg a Sex: 08h às 19h | Sáb: 09h às 14h"
                    value={publicForm.opening_hours}
                    onChange={(e) => setPublicForm({ ...publicForm, opening_hours: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* Mensagem Padrão do WhatsApp & Instagram */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Instagram Profissional (@)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: @dra.carolinamendes.vet"
                    value={publicForm.instagram}
                    onChange={(e) => setPublicForm({ ...publicForm, instagram: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mensagem de Início de Conversa (WhatsApp)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Olá Dra! Gostaria de informações para agendar uma consulta."
                    value={publicForm.custom_welcome_message}
                    onChange={(e) =>
                      setPublicForm({ ...publicForm, custom_welcome_message: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* Gerenciador Avançado de Calendário & Disponibilidade no Site */}
              <div className="bg-slate-50/90 border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                        <CalendarDays className="w-4 h-4" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-900">
                        Calendário de Disponibilidade & Agendamento no Site
                      </h4>
                    </div>
                    <p className="text-xs text-slate-500 max-w-xl leading-relaxed">
                      Defina como os tutores visualizam suas datas no site público. Você pode escolher dias específicos com vagas confirmadas, dias fixos da semana ou deixar datas abertas para verificar agendamento sob consulta.
                    </p>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={publicForm.show_availability_calendar}
                      onChange={(e) =>
                        setPublicForm({ ...publicForm, show_availability_calendar: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {publicForm.show_availability_calendar ? (
                  <div className="space-y-6 animate-fade-in">
                    {/* Seletor de Modo de Disponibilidade */}
                    <div>
                      <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5">
                        Como você deseja informar sua disponibilidade?
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* Opção 1: Datas Específicas / Vagas Abertas */}
                        <div
                          onClick={() => setPublicForm({ ...publicForm, availability_mode: 'SPECIFIC_DATES' })}
                          className={`p-4 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between space-y-2 ${
                            publicForm.availability_mode === 'SPECIFIC_DATES'
                              ? 'border-emerald-600 bg-emerald-50/60 shadow-xs'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                                Datas Específicas
                              </span>
                              {publicForm.availability_mode === 'SPECIFIC_DATES' && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                                  Ativo
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-600 leading-relaxed">
                              Você seleciona exatamente quais dias têm <strong>vagas confirmadas</strong> (verde). Os demais dias aparecem como <strong>sob consulta</strong> para verificação.
                            </p>
                          </div>
                          <span className="text-[10px] font-semibold text-emerald-800 block pt-1">
                            Ideal para volantes e plantões
                          </span>
                        </div>

                        {/* Opção 2: Dias da Semana Fixos */}
                        <div
                          onClick={() => setPublicForm({ ...publicForm, availability_mode: 'WEEKDAYS' })}
                          className={`p-4 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between space-y-2 ${
                            publicForm.availability_mode === 'WEEKDAYS'
                              ? 'border-emerald-600 bg-emerald-50/60 shadow-xs'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-teal-500 inline-block"></span>
                                Dias Fixos da Semana
                              </span>
                              {publicForm.availability_mode === 'WEEKDAYS' && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                                  Ativo
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-600 leading-relaxed">
                              Atendimento recorrente em dias programados (ex: Segundas, Quartas e Sextas). Você pode bloquear feriados ou folgas pontuais.
                            </p>
                          </div>
                          <span className="text-[10px] font-semibold text-teal-800 block pt-1">
                            Para rotinas regulares
                          </span>
                        </div>

                        {/* Opção 3: Sob Consulta Geral */}
                        <div
                          onClick={() => setPublicForm({ ...publicForm, availability_mode: 'ALL_REQUESTABLE' })}
                          className={`p-4 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between space-y-2 ${
                            publicForm.availability_mode === 'ALL_REQUESTABLE'
                              ? 'border-emerald-600 bg-emerald-50/60 shadow-xs'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block"></span>
                                Sob Consulta (Geral)
                              </span>
                              {publicForm.availability_mode === 'ALL_REQUESTABLE' && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                                  Ativo
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-600 leading-relaxed">
                              Qualquer data pode ser clicada pelo tutor para <strong>verificar agendamento</strong>. O horário é alinhado de acordo com a sua rota.
                            </p>
                          </div>
                          <span className="text-[10px] font-semibold text-slate-700 block pt-1">
                            Máxima flexibilidade de agenda
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* MODO 2: Seleção dos Dias da Semana */}
                    {publicForm.availability_mode === 'WEEKDAYS' && (
                      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-3">
                        <label className="block text-xs font-bold text-slate-800">
                          Selecione seus dias habituais de atendimento:
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { day: 0, label: 'Domingo', short: 'Dom' },
                            { day: 1, label: 'Segunda-feira', short: 'Seg' },
                            { day: 2, label: 'Terça-feira', short: 'Ter' },
                            { day: 3, label: 'Quarta-feira', short: 'Qua' },
                            { day: 4, label: 'Quinta-feira', short: 'Qui' },
                            { day: 5, label: 'Sexta-feira', short: 'Sex' },
                            { day: 6, label: 'Sábado', short: 'Sáb' },
                          ].map((item) => {
                            const isChecked = (publicForm.available_weekdays || []).includes(item.day);
                            return (
                              <button
                                key={item.day}
                                type="button"
                                onClick={() => {
                                  const current = publicForm.available_weekdays || [];
                                  const updated = isChecked
                                    ? current.filter((d) => d !== item.day)
                                    : [...current, item.day];
                                  setPublicForm({ ...publicForm, available_weekdays: updated });
                                }}
                                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                                  isChecked
                                    ? 'bg-emerald-700 text-white shadow-xs'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                }`}
                              >
                                {isChecked && <Check className="w-3.5 h-3.5" />}
                                <span>{item.label}</span>
                              </button>
                            );
                          })}
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Nestes dias da semana, o site exibirá "Vagas Confirmadas". Os demais dias serão exibidos como "Sob Consulta".
                        </p>
                      </div>
                    )}

                    {/* MODO 1 ou MODO 2/3: Calendário Interativo para Escolher Vagas ou Bloqueios */}
                    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                        <div>
                          <h5 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-emerald-700" />
                            {publicForm.availability_mode === 'SPECIFIC_DATES'
                              ? 'Selecione no calendário as datas com Vagas ou Folgas:'
                              : 'Bloquear datas específicas (feriados, férias ou folgas):'}
                          </h5>
                          <span className="text-[11px] text-slate-500">
                            {publicForm.availability_mode === 'SPECIFIC_DATES'
                              ? 'Clique em uma data para alternar seu status conforme o modo selecionado.'
                              : 'Clique nos dias que você NÃO atenderá para bloquear o agendamento.'}
                          </span>
                        </div>

                        {/* Modos do Clique no Calendário */}
                        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                          {publicForm.availability_mode === 'SPECIFIC_DATES' && (
                            <button
                              type="button"
                              onClick={() => setCalClickMode('AVAILABLE')}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                                calClickMode === 'AVAILABLE'
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'text-slate-700 hover:text-slate-900'
                              }`}
                            >
                              <span className="w-2 h-2 rounded-full bg-emerald-300"></span>
                              <span>Vaga Aberta (🟢)</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setCalClickMode('BLOCKED')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                              calClickMode === 'BLOCKED'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'text-slate-700 hover:text-slate-900'
                            }`}
                          >
                            <Ban className="w-3.5 h-3.5" />
                            <span>Bloquear/Folga (🚫)</span>
                          </button>
                        </div>
                      </div>

                      {/* Header do Mês do Calendário */}
                      {(() => {
                        const year = calPickerDate.getFullYear();
                        const month = calPickerDate.getMonth();
                        const monthName = calPickerDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                        const firstDayIndex = new Date(year, month, 1).getDay();
                        const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();

                        const handleDateClick = (dateStr: string) => {
                          const currentAvailable = publicForm.available_dates || [];
                          const currentBlocked = publicForm.blocked_dates || [];

                          if (calClickMode === 'AVAILABLE') {
                            if (currentAvailable.includes(dateStr)) {
                              // Remove da disponibilidade
                              setPublicForm({
                                ...publicForm,
                                available_dates: currentAvailable.filter((d) => d !== dateStr),
                              });
                            } else {
                              // Adiciona à disponibilidade e remove de bloqueados
                              setPublicForm({
                                ...publicForm,
                                available_dates: [...currentAvailable, dateStr],
                                blocked_dates: currentBlocked.filter((d) => d !== dateStr),
                              });
                            }
                          } else {
                            // Modo BLOCKED
                            if (currentBlocked.includes(dateStr)) {
                              setPublicForm({
                                ...publicForm,
                                blocked_dates: currentBlocked.filter((d) => d !== dateStr),
                              });
                            } else {
                              setPublicForm({
                                ...publicForm,
                                blocked_dates: [...currentBlocked, dateStr],
                                available_dates: currentAvailable.filter((d) => d !== dateStr),
                              });
                            }
                          }
                        };

                        return (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-800 capitalize flex items-center gap-2">
                                <CalendarDays className="w-4 h-4 text-emerald-700" />
                                {monthName}
                              </span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setCalPickerDate(new Date(year, month - 1, 1))}
                                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                                  title="Mês Anterior"
                                >
                                  <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setCalPickerDate(new Date())}
                                  className="px-2.5 py-1 text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                                >
                                  Hoje
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setCalPickerDate(new Date(year, month + 1, 1))}
                                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                                  title="Próximo Mês"
                                >
                                  <ChevronRight className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Grid do Mês */}
                            <div className="grid grid-cols-7 gap-1.5 text-center text-xs">
                              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                                <div key={day} className="py-1 font-bold text-slate-400 text-[11px]">
                                  {day}
                                </div>
                              ))}

                              {/* Espaços em branco antes do dia 1 */}
                              {[...Array(firstDayIndex)].map((_, i) => (
                                <div key={`empty-${i}`} className="py-2.5"></div>
                              ))}

                              {/* Dias do mês */}
                              {[...Array(daysInCurrentMonth)].map((_, i) => {
                                const d = i + 1;
                                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                                const isAvailable = (publicForm.available_dates || []).includes(dateStr);
                                const isBlocked = (publicForm.blocked_dates || []).includes(dateStr);

                                let cellBg = 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100';
                                let badgeText = 'Sob Consulta';
                                let badgeClass = 'text-slate-400';

                                if (isBlocked) {
                                  cellBg = 'bg-rose-50 border-rose-300 text-rose-800 font-bold';
                                  badgeText = '🚫 Folga';
                                  badgeClass = 'text-rose-600 font-bold';
                                } else if (isAvailable) {
                                  cellBg = 'bg-emerald-100/80 border-emerald-500 text-emerald-950 font-bold shadow-2xs';
                                  badgeText = '🟢 Com Vaga';
                                  badgeClass = 'text-emerald-700 font-bold';
                                } else if (publicForm.availability_mode === 'WEEKDAYS') {
                                  const dayOfWeek = new Date(year, month, d).getDay();
                                  if ((publicForm.available_weekdays || []).includes(dayOfWeek)) {
                                    cellBg = 'bg-teal-50 border-teal-300 text-teal-950 font-semibold';
                                    badgeText = 'Recorrente';
                                    badgeClass = 'text-teal-700 font-semibold';
                                  }
                                }

                                return (
                                  <button
                                    key={dateStr}
                                    type="button"
                                    onClick={() => handleDateClick(dateStr)}
                                    className={`py-2 px-1 rounded-xl border transition flex flex-col items-center justify-between min-h-[58px] cursor-pointer group ${cellBg}`}
                                  >
                                    <span className="text-xs font-bold leading-none">{d}</span>
                                    <span className={`text-[9px] leading-tight block truncate w-full px-0.5 ${badgeClass}`}>
                                      {badgeText}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>

                            {/* Ações Rápidas de Seleção */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                              <div className="flex items-center gap-3 text-[11px] text-slate-500">
                                <span className="flex items-center gap-1">
                                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                                  Vagas Confirmadas
                                </span>
                                <span className="flex items-center gap-1">
                                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block"></span>
                                  Sob Consulta
                                </span>
                                <span className="flex items-center gap-1">
                                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
                                  Folga / Bloqueado
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                {publicForm.availability_mode === 'SPECIFIC_DATES' && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const next7: string[] = [];
                                        const now = new Date();
                                        for (let i = 0; i < 7; i++) {
                                          const dt = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
                                          const ds = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
                                          next7.push(ds);
                                        }
                                        const union = Array.from(new Set([...(publicForm.available_dates || []), ...next7]));
                                        setPublicForm({
                                          ...publicForm,
                                          available_dates: union,
                                          blocked_dates: (publicForm.blocked_dates || []).filter((b) => !next7.includes(b)),
                                        });
                                      }}
                                      className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-[11px] font-semibold text-slate-700 cursor-pointer"
                                    >
                                      + Próximos 7 dias
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setPublicForm({
                                          ...publicForm,
                                          available_dates: [],
                                          blocked_dates: [],
                                        });
                                      }}
                                      className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-[11px] font-semibold text-rose-600 cursor-pointer"
                                    >
                                      Limpar seleção
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Gerenciador de Horários / Vagas do Dia */}
                    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-3.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                        <div>
                          <h5 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-emerald-700" />
                            Horários Disponíveis para Agendamento
                          </h5>
                          <p className="text-[11px] text-slate-500">
                            Estes horários serão exibidos quando o tutor clicar em uma data com vagas no seu site.
                          </p>
                        </div>

                        {/* Presets de Horários */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() =>
                              setPublicForm({
                                ...publicForm,
                                available_slots: ['08:00', '09:30', '11:00', '14:00', '15:30', '17:00', '18:30'],
                              })
                            }
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold cursor-pointer"
                          >
                            Padrão Comercial
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setPublicForm({
                                ...publicForm,
                                available_slots: ['08:00', '09:00', '10:00', '11:00', '12:00'],
                              })
                            }
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold cursor-pointer"
                          >
                            Manhã
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setPublicForm({
                                ...publicForm,
                                available_slots: ['13:30', '15:00', '16:30', '18:00', '19:30'],
                              })
                            }
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold cursor-pointer"
                          >
                            Tarde / Noite
                          </button>
                        </div>
                      </div>

                      {/* Chips de Horários */}
                      <div className="flex flex-wrap gap-2 items-center">
                        {(publicForm.available_slots || []).map((slot) => (
                          <span
                            key={slot}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold shadow-2xs"
                          >
                            <Clock className="w-3 h-3 text-emerald-700" />
                            <span>{slot}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = (publicForm.available_slots || []).filter((s) => s !== slot);
                                setPublicForm({ ...publicForm, available_slots: updated });
                              }}
                              className="ml-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}

                        {/* Adicionar Horário Customizado */}
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            placeholder="Ex: 10:30"
                            maxLength={5}
                            value={customSlotInput}
                            onChange={(e) => setCustomSlotInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const val = customSlotInput.trim();
                                if (val && !(publicForm.available_slots || []).includes(val)) {
                                  setPublicForm({
                                    ...publicForm,
                                    available_slots: [...(publicForm.available_slots || []), val].sort(),
                                  });
                                  setCustomSlotInput('');
                                }
                              }
                            }}
                            className="w-24 px-2.5 py-1.5 text-xs border border-slate-300 rounded-xl outline-none font-mono focus:border-emerald-600"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const val = customSlotInput.trim();
                              if (val && !(publicForm.available_slots || []).includes(val)) {
                                setPublicForm({
                                  ...publicForm,
                                  available_slots: [...(publicForm.available_slots || []), val].sort(),
                                });
                                setCustomSlotInput('');
                              }
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                          >
                            + Adicionar
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Aviso ou Orientação Exibida no Calendário */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Aviso ou Regras de Atendimento Exibidas aos Tutores (Opcional)
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Atendimentos em domicílio sujeitos à confirmação de rota. Tolerância de 20 min no deslocamento."
                        value={publicForm.availability_notice}
                        onChange={(e) => setPublicForm({ ...publicForm, availability_notice: e.target.value })}
                        className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl outline-none focus:border-emerald-600"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl flex items-center gap-2.5 text-xs text-amber-900">
                    <Info className="w-4 h-4 shrink-0 text-amber-700" />
                    <span>
                      Calendário desativado. Os tutores solicitarão agendamento diretamente pelo formulário simples ou pelo WhatsApp.
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSavingPublicPage}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white transition flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  {isSavingPublicPage ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Salvando dados...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Salvar Configurações da Página Pública</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Modal de Criação / Edição de Serviço para a Página Pública */}
            {showServiceModal && (
              <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Stethoscope className="w-4 h-4 text-emerald-700" />
                      {editingPublicService ? 'Editar Serviço do Site' : 'Novo Serviço para o Site'}
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowServiceModal(false)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveService} className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nome do Atendimento / Procedimento *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Consulta Clínica Domiciliar, Vacina V10, Ultrassom..."
                        value={serviceFormData.name}
                        onChange={(e) => setServiceFormData({ ...serviceFormData, name: e.target.value })}
                        className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl outline-none focus:border-emerald-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Categoria do Atendimento *
                      </label>
                      <select
                        value={serviceFormData.category}
                        onChange={(e) => setServiceFormData({ ...serviceFormData, category: e.target.value as any })}
                        className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl outline-none bg-white font-medium"
                      >
                        <option value="CONSULTA">Consulta Clínica</option>
                        <option value="PROCEDIMENTO">Procedimento</option>
                        <option value="VACINA">Vacinação</option>
                        <option value="EXAME">Exame Laboratorial / Imagem</option>
                        <option value="OUTROS">Outros Serviços</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Descrição para os Tutores (O que está incluso)
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Ex: Avaliação completa com ausculta, palpação, anamnese e prescrição digital enviada por WhatsApp."
                        value={serviceFormData.public_description}
                        onChange={(e) => setServiceFormData({ ...serviceFormData, public_description: e.target.value })}
                        className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl outline-none focus:border-emerald-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Foto Ilustrativa do Serviço (Opcional - link ou upload)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="https://..."
                          value={serviceFormData.photo_url}
                          onChange={(e) => setServiceFormData({ ...serviceFormData, photo_url: e.target.value })}
                          className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
                        />
                        <input
                          type="file"
                          ref={servicePhotoInputRef}
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) {
                              const r = new FileReader();
                              r.onload = (ev) => {
                                setServiceFormData(prev => ({ ...prev, photo_url: ev.target?.result as string }));
                              };
                              r.readAsDataURL(f);
                            }
                            e.target.value = '';
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => servicePhotoInputRef.current?.click()}
                          className="px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                          title="Enviar arquivo do computador/celular"
                        >
                          <Upload className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <label className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer text-xs font-semibold text-slate-800">
                      <input
                        type="checkbox"
                        checked={serviceFormData.show_on_public_page}
                        onChange={(e) => setServiceFormData({ ...serviceFormData, show_on_public_page: e.target.checked })}
                        className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span>Exibir este serviço visível na minha página pública para os tutores</span>
                    </label>

                    <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setShowServiceModal(false)}
                        className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Salvar Serviço</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Modal de Confirmação de Exclusão de Serviço */}
            {serviceToDelete && (
              <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
                    <Trash2 className="w-6 h-6" />
                  </div>
                  <div className="text-center space-y-1">
                    <h4 className="text-sm font-bold text-slate-900">Remover Serviço?</h4>
                    <p className="text-xs text-slate-600">
                      Tem certeza que deseja remover o serviço <span className="font-semibold text-slate-900">"{serviceToDelete.name}"</span>? Ele deixará de ser exibido na sua página pública.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      disabled={isDeletingService}
                      onClick={() => setServiceToDelete(null)}
                      className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={isDeletingService}
                      onClick={confirmDeleteService}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      {isDeletingService ? 'Excluindo...' : 'Sim, Excluir'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}



        {/* TAB: CATÁLOGO DE SERVIÇOS, PROCEDIMENTOS & EXAMES */}
        {activeTab === 'servicos' && (
          <div className="space-y-6 max-w-3xl">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-emerald-700" />
                Catálogo de Serviços, Procedimentos & Exames
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Cadastre seus honorários de consultas, procedimentos ambulatoriais, vacinas e exames complementares com preços padrão para busca rápida durante o atendimento e montagem de orçamento.
              </p>
            </div>

            <div className="p-5 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h4 className="text-sm font-bold text-emerald-950">
                    Gerenciador Central de Serviços & Exames
                  </h4>
                  <p className="text-xs text-slate-600 mt-1 max-w-xl">
                    Todos os itens cadastrados aqui aparecem instantaneamente na busca preditiva ao montar o orçamento do paciente durante a consulta volante, sem necessidade de atalhos fixos.
                  </p>
                </div>
                <Link
                  to="/servicos"
                  className="px-4 py-2.5 rounded-xl font-bold text-xs bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition flex items-center gap-2 cursor-pointer"
                >
                  <Stethoscope className="w-4 h-4" />
                  <span>Acessar Cadastro de Serviços & Exames</span>
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-emerald-200/60 text-xs">
                <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-2xs">
                  <span className="font-bold text-slate-800 block mb-0.5">🩺 Consultas & Visitas</span>
                  <span className="text-slate-500 text-[11px]">Honorários domiciliares, retorno e plantão.</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-2xs">
                  <span className="font-bold text-slate-800 block mb-0.5">🔬 Exames Complementares</span>
                  <span className="text-slate-500 text-[11px]">Hemograma, perfis bioquímicos, ultrassom e ECG.</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-2xs">
                  <span className="font-bold text-slate-800 block mb-0.5">💉 Procedimentos & Vacinas</span>
                  <span className="text-slate-500 text-[11px]">Curativos, injeções, fluidoterapia e imunização.</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: ESPECIALIDADES & MÓDULOS CLÍNICOS */}
        {activeTab === 'especialidades' && (
          <div className="space-y-6 max-w-3xl">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-emerald-700" />
                Módulos de Especialidades Veterinárias
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Ligue ou desligue módulos de acordo com o seu perfil de atendimento.
                Desativar uma especialidade simplifica o menu de navegação e as opções do aplicativo, mantendo o ambiente focado em sua rotina clínica.
              </p>
            </div>

            {/* Módulo Principal: Anestesiologia */}
            <div className={`p-5 rounded-2xl border transition-all ${
              isAnesthesiaActive
                ? 'bg-emerald-950/5 border-emerald-500/40 shadow-xs'
                : 'bg-slate-50/80 border-slate-200'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                    isAnesthesiaActive
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-slate-200 text-slate-500'
                  }`}>
                    <Activity className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-slate-900">
                        Módulo de Anestesiologia
                      </h4>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                        isAnesthesiaActive
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-slate-200 text-slate-600'
                      }`}>
                        {isAnesthesiaActive ? 'Módulo Ativado' : 'Módulo Desativado'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Voltado para médicos-veterinários que realizam avaliação, monitorização e fichas anestésicas perioperatórias em clínicas e hospitais.
                    </p>
                  </div>
                </div>

                {/* Switch Button */}
                <div className="flex items-center sm:self-center">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isAnesthesiaActive}
                    disabled={isUpdatingSpecialty}
                    onClick={handleToggleAnesthesia}
                    className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 ${
                      isAnesthesiaActive ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                  >
                    <span className="sr-only">Ligar ou desligar Anestesiologia</span>
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        isAnesthesiaActive ? 'translate-x-7' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* O que o módulo inclui */}
              <div className="mt-4 pt-4 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600">
                <div className="flex items-start gap-2">
                  <Check className={`w-4 h-4 shrink-0 mt-0.5 ${isAnesthesiaActive ? 'text-emerald-700' : 'text-slate-400'}`} />
                  <span><strong>Ficha Anestésica Perioperatória</strong> com cronômetro contínuo e parâmetros vitais</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className={`w-4 h-4 shrink-0 mt-0.5 ${isAnesthesiaActive ? 'text-emerald-700' : 'text-slate-400'}`} />
                  <span><strong>Monitoramento Multiparamétrico</strong> (FC, ECG, PAS/PAM/PAD, SpO₂, EtCO₂, FR, Temp)</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className={`w-4 h-4 shrink-0 mt-0.5 ${isAnesthesiaActive ? 'text-emerald-700' : 'text-slate-400'}`} />
                  <span><strong>Registro Fármaco-Anestésico</strong> de doses manuais, MPA, indução, manutenção e recuperação</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className={`w-4 h-4 shrink-0 mt-0.5 ${isAnesthesiaActive ? 'text-emerald-700' : 'text-slate-400'}`} />
                  <span><strong>Vínculo de Clínicas e Cirurgiões Responsáveis</strong> exigidos na ficha</span>
                </div>
              </div>

              {/* Aviso dinâmico de visibilidade */}
              <div className={`mt-4 p-3 rounded-lg text-xs flex items-center gap-2.5 ${
                isAnesthesiaActive
                  ? 'bg-emerald-100/60 text-emerald-900 border border-emerald-200'
                  : 'bg-amber-50 text-amber-900 border border-amber-200'
              }`}>
                <Info className="w-4 h-4 shrink-0 text-current" />
                <span>
                  {isAnesthesiaActive
                    ? 'As seções "Anestesiologia", "Clínicas Parceiras" e "Cirurgiões" estão visíveis no seu menu lateral.'
                    : 'As seções de Anestesiologia estão ocultas do menu lateral. Seus dados e fichas continuam salvos e seguros.'}
                </span>
              </div>
            </div>

            {/* Solicite sua Especialidade (Ecossistema Modular) */}
            <div className="pt-2">
              <div className="bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 rounded-2xl p-5 sm:p-6 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                  <Sparkles className="w-36 h-36 text-emerald-300" />
                </div>

                <div className="relative z-10 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Construído para a sua Prática Clínica</span>
                      </div>
                      <h3 className="text-base sm:text-lg font-extrabold tracking-tight text-white">
                        Solicite sua Especialidade no Vetgo
                      </h3>
                      <p className="text-xs text-emerald-100/80 max-w-xl leading-relaxed">
                        Não encontrou a sua área de atuação? Desenvolvemos prontuários, calculadoras e fichas sob medida para especialistas que atendem em campo ou em clínicas parceiras.
                      </p>
                    </div>
                  </div>

                  {specialtySubmitted ? (
                    <div className="p-4 bg-emerald-800/60 border border-emerald-500/40 rounded-xl space-y-2 animate-fade-in">
                      <div className="flex items-center gap-2 text-emerald-200 font-bold text-xs">
                        <ThumbsUp className="w-4 h-4 text-emerald-300" />
                        <span>Solicitação registrada com sucesso!</span>
                      </div>
                      <p className="text-xs text-emerald-100/90 leading-relaxed">
                        Muito obrigado pela sua sugestão! Nossa equipe de engenharia analisa a demanda de cada especialidade para priorizar o desenvolvimento dos próximos módulos clínicos.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setSpecialtySubmitted(false);
                          setRequestedSpecialty('');
                          setSpecialtyDetails('');
                        }}
                        className="text-[11px] text-emerald-300 hover:text-white underline font-semibold mt-1 cursor-pointer"
                      >
                        Enviar outra sugestão
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3.5 bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/15">
                      {/* Sugestões Rápidas em Chips */}
                      <div>
                        <span className="text-[11px] font-bold text-emerald-200 uppercase tracking-wider block mb-2">
                          Toque em uma especialidade frequente ou digite a sua:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            { name: 'Oftalmologia', icon: '👁️' },
                            { name: 'Ortopedia & Traumatologia', icon: '🦴' },
                            { name: 'Silvestres & Exóticos', icon: '🦜' },
                            { name: 'Dermatologia Veterinária', icon: '🧴' },
                            { name: 'Medicina Felina (Cat-Friendly)', icon: '🐱' },
                            { name: 'Cardiologia & Eletro', icon: '🫀' },
                            { name: 'Fisioterapia & Reabilitação', icon: '⚡' },
                            { name: 'Acupuntura & Ozonioterapia', icon: '🌿' },
                            { name: 'Odontologia Veterinária', icon: '🦷' },
                            { name: 'Oncologia Veterinária', icon: '🔬' },
                            { name: 'Nefrologia & Urologia', icon: '💧' },
                            { name: 'Neurologia', icon: '🧠' },
                          ].map((spec) => (
                            <button
                              key={spec.name}
                              type="button"
                              onClick={() => setRequestedSpecialty(spec.name)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                                requestedSpecialty === spec.name
                                  ? 'bg-emerald-500 text-white font-bold shadow-xs'
                                  : 'bg-white/10 text-emerald-100 hover:bg-white/20'
                              }`}
                            >
                              <span>{spec.icon}</span>
                              <span>{spec.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Inputs */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-emerald-100 mb-1">
                            Nome da Especialidade *
                          </label>
                          <input
                            type="text"
                            placeholder="Ex: Oftalmologia Veterinária"
                            value={requestedSpecialty}
                            onChange={(e) => setRequestedSpecialty(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-900/60 border border-emerald-500/30 rounded-lg text-xs text-white placeholder:text-slate-400 outline-none focus:border-emerald-400"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-emerald-100 mb-1">
                            O que não pode faltar no seu prontuário? (Opcional)
                          </label>
                          <input
                            type="text"
                            placeholder="Ex: Teste de Schirmer, tonometria e anexar fotos"
                            value={specialtyDetails}
                            onChange={(e) => setSpecialtyDetails(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-900/60 border border-emerald-500/30 rounded-lg text-xs text-white placeholder:text-slate-400 outline-none focus:border-emerald-400"
                          />
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
                        <span className="text-[11px] text-emerald-200/80">
                          Sua sugestão ajuda a priorizar os próximos módulos clínicos.
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const msg = encodeURIComponent(
                                `Olá equipe Vetgo! Sou o(a) Dr(a). ${user?.first_name || 'Veterinário(a)'} e gostaria de sugerir o módulo de *${requestedSpecialty || 'Especialidade Veterinária'}* no sistema.` +
                                (specialtyDetails ? `\n\nDetalhes:\n${specialtyDetails}` : '')
                              );
                              window.open(`https://wa.me/5511999999999?text=${msg}`, '_blank');
                            }}
                            className="px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-400/30 transition flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>Pedir no WhatsApp</span>
                          </button>

                          <button
                            type="button"
                            disabled={!requestedSpecialty.trim()}
                            onClick={() => {
                              if (requestedSpecialty.trim()) {
                                setSpecialtySubmitted(true);
                              }
                            }}
                            className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Enviar Solicitação</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'profissional' && (
          <form onSubmit={handleSaveProfile} className="space-y-4 max-w-lg">
            <h3 className="text-sm font-bold text-slate-900 mb-2">Registro Profissional</h3>
            <p className="text-xs text-slate-500 mb-4">
              Estes dados serão emitidos no cabeçalho de atestados, receitas e receituários de controle especial.
            </p>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Número do CRMV</label>
                <input
                  type="text"
                  value={profForm.crmv}
                  onChange={(e) => setProfForm({ ...profForm, crmv: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">UF do CRMV</label>
                <input
                  type="text"
                  maxLength={2}
                  value={profForm.crmv_uf}
                  onChange={(e) => setProfForm({ ...profForm, crmv_uf: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none uppercase font-mono"
                />
              </div>
            </div>

            {/* Configuração da Chave PIX */}
            <div className="pt-4 border-t border-slate-200 space-y-3">
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-emerald-700" />
                  Chave PIX para Cobrança por QR Code
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Utilizada para gerar o QR Code oficial do Banco Central na tela de consultas e financeiro.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Chave PIX
                </label>
                <input
                  type="text"
                  placeholder="Ex: CPF, CNPJ, Celular, E-mail ou Chave Aleatória"
                  value={pixForm.pix_key}
                  onChange={(e) => setPixForm({ ...pixForm, pix_key: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nome do Titular da Conta
                  </label>
                  <input
                    type="text"
                    maxLength={25}
                    placeholder="Ex: CAROLINE MENDES"
                    value={pixForm.pix_receiver_name}
                    onChange={(e) => setPixForm({ ...pixForm, pix_receiver_name: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cidade da Conta
                  </label>
                  <input
                    type="text"
                    maxLength={15}
                    placeholder="Ex: SAO PAULO"
                    value={pixForm.pix_city}
                    onChange={(e) => setPixForm({ ...pixForm, pix_city: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white transition cursor-pointer"
            >
              Salvar Dados Profissionais & PIX
            </button>
          </form>
        )}

        {activeTab === 'identidade' && (
          <div className="space-y-6 max-w-lg">
            <div>
              <h3 className="text-base font-bold text-slate-900 mb-1">Logomarca & Foto Profissional</h3>
              <p className="text-xs text-slate-500">
                Sua foto ou logotipo oficial que aparece na sua página de divulgação pública, receitas, termos e prontuários clínicos.
              </p>
            </div>

            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={handleLogoFileChange}
              className="hidden"
            />

            {/* Current Logo Preview */}
            {user?.logo_url ? (
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img
                      src={user.logo_url}
                      alt="Logomarca Profissional"
                      className="w-20 h-20 rounded-2xl object-cover border-2 border-emerald-100 shadow-2xs"
                    />
                    <div className="absolute -bottom-1 -right-1 bg-emerald-600 text-white p-0.5 rounded-full border border-white">
                      <Check className="w-3 h-3" />
                    </div>
                  </div>

                  <div className="flex-1 space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                      Logomarca Ativa
                    </span>
                    <h4 className="text-xs font-bold text-slate-900">
                      Exibida no seu site e documentos oficiais
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Atualizada em tempo real na sua página de divulgação.
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={isUploadingLogo}
                    className="flex-1 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploadingLogo ? 'Carregando...' : 'Trocar Imagem'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    disabled={isUploadingLogo}
                    className="px-3.5 py-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remover</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Dropzone for Upload */
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingLogo(true);
                }}
                onDragLeave={() => setIsDraggingLogo(false)}
                onDrop={async (e) => {
                  e.preventDefault();
                  setIsDraggingLogo(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) await processLogoFile(file);
                }}
                onClick={() => logoInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition cursor-pointer ${
                  isDraggingLogo
                    ? 'border-emerald-600 bg-emerald-50/70 scale-[1.01]'
                    : 'border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/20'
                }`}
              >
                {isUploadingLogo ? (
                  <div className="space-y-2">
                    <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-xs font-bold text-slate-700">Enviando e salvando imagem...</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-800 rounded-2xl flex items-center justify-center mx-auto shadow-2xs">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                    <div className="text-xs font-bold text-slate-800">
                      Arraste seu logotipo ou clique para selecionar
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Formatos aceitos: PNG, JPG ou WEBP (até 5MB)
                    </p>
                    <div className="pt-2">
                      <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-xs">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Selecionar Imagem do Dispositivo</span>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'seguranca' && (
          <div className="space-y-6 max-w-lg">
            {/* Dados da Conta */}
            <div className="space-y-3 pb-5 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900">Dados da Conta</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block uppercase">Nome Completo</span>
                  <span className="font-bold text-slate-800">{user?.first_name} {user?.last_name}</span>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block uppercase">E-mail de Login</span>
                  <span className="font-bold text-slate-800 break-all">{user?.email}</span>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block uppercase">Perfil de Acesso</span>
                  <span className="font-bold text-emerald-800">
                    {user?.role === 'ADMIN' ? 'Administrador da Plataforma' : 'Médico(a) Veterinário(a)'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block uppercase">Status da Conta</span>
                  <span className="font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Ativa & Verificada
                  </span>
                </div>
              </div>
            </div>

            {/* Alteração de Senha */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Alteração de Senha</h3>
              <p className="text-xs text-slate-500">
                Defina uma nova senha para acessar sua conta em qualquer dispositivo.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Senha Atual</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nova Senha</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Confirmar Nova Senha</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSavedMessage('Senha atualizada com sucesso!');
                    setTimeout(() => setSavedMessage(null), 3000);
                  }}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white transition cursor-pointer"
                >
                  Atualizar Senha
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notificacoes' && (
          <div className="space-y-4 max-w-3xl">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Central de Notificações Push
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure e teste o recebimento de alertas em tempo real no seu smartphone ou computador
              </p>
            </div>
            <PushNotificationManager />
          </div>
        )}

        {activeTab === 'assinatura' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Assinatura do Vetgo
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Gerencie seu plano atual e libere cadastros ilimitados para sua rotina
              </p>
            </div>

            {/* Plan Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Free Plan details */}
              <div
                className={`p-6 rounded-2xl border ${
                  user?.plan === 'FREE' && !user.is_lifetime
                    ? 'border-emerald-600 bg-emerald-50/20 shadow-xs'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs uppercase font-bold tracking-wider text-slate-500">
                      Plano Gratuito
                    </span>
                    <div className="text-2xl font-black text-slate-900 mt-1">R$ 0,00</div>
                  </div>
                  {user?.plan === 'FREE' && !user.is_lifetime && (
                    <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800">
                      Plano Atual
                    </span>
                  )}
                </div>

                <div className="mt-4 space-y-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Até 30 tutores cadastrados (ativos e inativos)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Até 50 pacientes cadastrados (ativos e inativos)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Atendimentos e agendamentos ilimitados</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Catálogo de medicamentos completo</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Prontuários e fichas clínicas completas</span>
                  </div>
                  <div className="flex items-center gap-2 font-medium text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Módulo de Anestesiologia liberado para todos</span>
                  </div>
                </div>
              </div>

              {/* Pro Plan Card */}
              <div
                className={`p-6 rounded-2xl border ${
                  user?.plan === 'PRO' || user?.is_lifetime
                    ? 'border-emerald-600 bg-emerald-50/30 shadow-xs'
                    : 'border-emerald-300 bg-linear-to-b from-white to-emerald-50/20'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs uppercase font-bold tracking-wider text-emerald-700">
                        Vetgo Pro
                      </span>
                      {user?.is_lifetime && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-purple-100 text-purple-800">
                          Vitalício
                        </span>
                      )}
                    </div>
                    <div className="text-2xl font-black text-emerald-900 mt-1">
                      R$ 18,00<span className="text-xs font-normal text-slate-500">/mês</span>
                    </div>
                  </div>
                  {(user?.plan === 'PRO' || user?.is_lifetime) && (
                    <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-600 text-white">
                      Ativo
                    </span>
                  )}
                </div>

                <div className="mt-4 space-y-2 text-xs text-slate-700">
                  <div className="flex items-center gap-2 font-semibold text-emerald-800">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>Tutores ILIMITADOS</span>
                  </div>
                  <div className="flex items-center gap-2 font-semibold text-emerald-800">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>Pacientes ILIMITADOS</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Relatórios financeiros detalhados</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Emissão de receitas com logo personalizada</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Suporte prioritário via WhatsApp</span>
                  </div>
                </div>

                {user?.plan === 'FREE' && !user?.is_lifetime && (
                  <div className="mt-5">
                    <button
                      type="button"
                      onClick={() => alert('Para assinar o Vetgo Pro por R$ 18,00/mês, contate o administrador ou utilize o fluxo de pagamento.')}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-bold text-xs bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition cursor-pointer"
                    >
                      <span>Fazer Upgrade Agora (R$ 18/mês)</span>
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 9: Instalar no Celular (App / PWA) */}
        {activeTab === 'aplicativo' && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-emerald-700" />
                Instalar Vetgo no Celular (Progressive Web App)
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Salve o Vetgo diretamente na tela de início do seu smartphone para abrir em tela cheia como se fosse um app da loja, com suporte a notificações e carregamento rápido.
              </p>
            </div>

            {/* Status do App no Aparelho */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${isInstalled ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    {isInstalled ? '✅ Aplicativo já instalado neste dispositivo' : '📱 Disponível para Instalação'}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {isInstalled
                      ? 'Você já está executando o Vetgo no modo independente (standalone).'
                      : isInstallable
                      ? 'Seu navegador suporta instalação com 1 clique abaixo.'
                      : 'Siga os passos rápidos abaixo de acordo com seu celular.'}
                  </span>
                </div>
              </div>

              {isInstallable && !isInstalled && (
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await install();
                    if (ok) setPwaInstalledSuccess(true);
                  }}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>Instalar Agora</span>
                </button>
              )}
            </div>

            {pwaInstalledSuccess && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Aplicativo instalado com sucesso! Procure pelo ícone do Vetgo na tela inicial do seu celular.</span>
              </div>
            )}

            {/* Vantagens */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-xs">
                  <Zap className="w-4 h-4" />
                  <span>Tela Cheia</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Sem barra de endereços do navegador, mais espaço para prontuários e receitas.
                </p>
              </div>

              <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-xs">
                  <Bell className="w-4 h-4" />
                  <span>Notificações</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Receba lembretes de consultas e vacinas direto na tela de bloqueio.
                </p>
              </div>

              <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-xs">
                  <WifiOff className="w-4 h-4" />
                  <span>Super Leve</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Ocupa menos de 5MB da memória do celular e atualiza automaticamente.
                </p>
              </div>
            </div>

            {/* Ação Direta de Instalação */}
            <div className="p-6 bg-gradient-to-br from-emerald-800 to-emerald-950 text-white rounded-2xl shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-white">Pronto para instalar no seu aparelho?</h4>
                  <p className="text-xs text-emerald-100/90 mt-0.5">
                    O Vetgo será fixado na sua tela inicial como um app nativo.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await install();
                    if (ok) setPwaInstalledSuccess(true);
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-emerald-50 text-emerald-900 text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                  <Download className="w-4 h-4 text-emerald-700" />
                  <span>Instalar Aplicativo Agora</span>
                </button>
              </div>

              {isIOS && (
                <div className="pt-3 border-t border-white/10 text-[11px] text-emerald-200 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 shrink-0 text-emerald-300" />
                  <span>No iPhone, toque no botão <strong>Compartilhar [↑]</strong> do Safari e selecione <strong>Adicionar à Tela de Início [+]</strong>.</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
