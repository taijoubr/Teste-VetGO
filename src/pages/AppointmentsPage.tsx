import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Appointment, Tutor, Patient, Clinic, AppointmentStatus, AppointmentType } from '../types';
import {
  Calendar as CalendarIcon,
  Plus,
  MapPin,
  Clock,
  PawPrint,
  User,
  CheckCircle2,
  X,
  ChevronLeft,
  ChevronRight,
  Filter,
  CalendarDays,
  List,
  Edit3,
  Trash2,
  Building2,
  Activity,
  Stethoscope,
  Phone,
  MessageSquare,
  AlertCircle
} from 'lucide-react';

export const AppointmentsPage: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);

  // View state: 'CALENDAR' or 'LIST'
  const [viewMode, setViewMode] = useState<'CALENDAR' | 'LIST'>('CALENDAR');

  // Month navigation: current active month/year in calendar
  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  // Selected Date (YYYY-MM-DD) for viewing day details
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | AppointmentStatus>('ALL');

  // Form state
  const [form, setForm] = useState({
    tutor_id: 1,
    patient_id: 1,
    clinic_id: undefined as number | undefined,
    date_time: `${new Date().toISOString().substring(0, 10)}T09:00`,
    duration_minutes: 60,
    appointment_type: 'Domiciliar / Volante' as AppointmentType,
    address: '',
    reason: '',
    notes: '',
    status: 'AGENDADO' as AppointmentStatus
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [appts, tuts, pts, clis] = await Promise.all([
        api.getAppointments(),
        api.getTutors(),
        api.getPatients(),
        api.getClinics()
      ]);
      setAppointments(appts);
      setTutors(tuts);
      setPatients(pts);
      setClinics(clis);

      if (tuts.length > 0 && pts.length > 0) {
        setForm((prev) => ({
          ...prev,
          tutor_id: tuts[0].id,
          patient_id: pts[0].id,
          address: tuts[0].address ? `${tuts[0].address}, ${tuts[0].address_number || ''}` : ''
        }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Group appointments by date string YYYY-MM-DD
  const appointmentsByDate = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    appointments.forEach((appt) => {
      const dateKey = appt.date_time ? appt.date_time.replace(' ', 'T').split('T')[0] : '';
      if (dateKey) {
        if (!map[dateKey]) map[dateKey] = [];
        map[dateKey].push(appt);
      }
    });

    // Sort each day's appointments by time ascending
    Object.keys(map).forEach((dateKey) => {
      map[dateKey].sort((a, b) => a.date_time.localeCompare(b.date_time));
    });

    return map;
  }, [appointments]);

  // Appointments for currently selected day
  const selectedDayAppointments = useMemo(() => {
    const list = appointmentsByDate[selectedDateStr] || [];
    if (statusFilter === 'ALL') return list;
    return list.filter((a) => a.status === statusFilter);
  }, [appointmentsByDate, selectedDateStr, statusFilter]);

  // Handle month changes
  const handlePrevMonth = () => {
    setCurrentMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleGoToToday = () => {
    const now = new Date();
    setCurrentMonthDate(new Date(now.getFullYear(), now.getMonth(), 1));
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    setSelectedDateStr(`${y}-${m}-${d}`);
  };

  // Generate calendar grid days
  const calendarDays = useMemo(() => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      count: number;
    }> = [];

    const todayStr = (() => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    })();

    // Previous month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevDate = new Date(year, month - 1, dayNum);
      const y = prevDate.getFullYear();
      const m = String(prevDate.getMonth() + 1).padStart(2, '0');
      const d = String(dayNum).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;
      days.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        count: appointmentsByDate[dateStr]?.length || 0
      });
    }

    // Current month days
    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const y = year;
      const m = String(month + 1).padStart(2, '0');
      const d = String(dayNum).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;
      days.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        count: appointmentsByDate[dateStr]?.length || 0
      });
    }

    // Next month padding to fill grid (always 35 or 42 cells)
    const remainingCells = (7 - (days.length % 7)) % 7;
    for (let dayNum = 1; dayNum <= remainingCells; dayNum++) {
      const nextDate = new Date(year, month + 1, dayNum);
      const y = nextDate.getFullYear();
      const m = String(nextDate.getMonth() + 1).padStart(2, '0');
      const d = String(dayNum).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;
      days.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        count: appointmentsByDate[dateStr]?.length || 0
      });
    }

    return days;
  }, [currentMonthDate, appointmentsByDate]);

  const handleTutorChange = (tutorId: number) => {
    const selectedTutor = tutors.find((t) => t.id === tutorId);
    const relatedPatients = patients.filter((p) => p.tutor_id === tutorId);
    setForm({
      ...form,
      tutor_id: tutorId,
      patient_id: relatedPatients.length > 0 ? relatedPatients[0].id : patients[0]?.id || 1,
      address: selectedTutor?.address
        ? `${selectedTutor.address}, ${selectedTutor.address_number || ''} - ${selectedTutor.neighborhood || ''}`
        : ''
    });
  };

  const openNewAppointmentModal = (prefillDateStr?: string) => {
    setEditingAppointment(null);
    const targetDate = prefillDateStr || selectedDateStr;
    setForm({
      tutor_id: tutors[0]?.id || 1,
      patient_id: patients[0]?.id || 1,
      clinic_id: undefined,
      date_time: `${targetDate}T09:00`,
      duration_minutes: 60,
      appointment_type: 'Domiciliar / Volante',
      address: tutors[0]?.address ? `${tutors[0].address}, ${tutors[0].address_number || ''}` : '',
      reason: '',
      notes: '',
      status: 'AGENDADO'
    });
    setShowModal(true);
  };

  const openEditModal = (appt: Appointment) => {
    setEditingAppointment(appt);
    setForm({
      tutor_id: appt.tutor_id,
      patient_id: appt.patient_id,
      clinic_id: appt.clinic_id,
      date_time: appt.date_time.substring(0, 16),
      duration_minutes: appt.duration_minutes,
      appointment_type: appt.appointment_type,
      address: appt.address || '',
      reason: appt.reason || '',
      notes: appt.notes || '',
      status: appt.status
    });
    setShowModal(true);
  };

  const handleSaveAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const selectedTutor = tutors.find((t) => t.id === form.tutor_id);
      const selectedPatient = patients.find((p) => p.id === form.patient_id);
      const selectedClinic = clinics.find((c) => c.id === form.clinic_id);

      const payload = {
        ...form,
        tutor_name: selectedTutor?.name,
        patient_name: selectedPatient?.name,
        patient_species: selectedPatient?.species,
        clinic_name: selectedClinic?.name
      };

      if (editingAppointment) {
        await api.updateAppointment(editingAppointment.id, payload);
      } else {
        await api.createAppointment(payload);
      }

      setShowModal(false);
      setEditingAppointment(null);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateStatus = async (apptId: number, newStatus: AppointmentStatus) => {
    try {
      await api.updateAppointment(apptId, { status: newStatus });
      await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteAppointment = async (apptId: number) => {
    if (window.confirm('Tem certeza que deseja remover este agendamento da agenda?')) {
      try {
        await api.deleteAppointment(apptId);
        await loadData();
      } catch (e) {
        console.error(e);
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMADO':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'AGENDADO':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'EM_ATENDIMENTO':
        return 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse';
      case 'CONCLUIDO':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      case 'CANCELADO':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  // Format month and year heading in Portuguese
  const monthYearLabel = useMemo(() => {
    const monthName = currentMonthDate.toLocaleString('pt-BR', { month: 'long' });
    const capitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1);
    return `${capitalized} de ${currentMonthDate.getFullYear()}`;
  }, [currentMonthDate]);

  // Format selected date for Day Details heading
  const selectedDateHeading = useMemo(() => {
    if (!selectedDateStr) return '';
    const [year, month, day] = selectedDateStr.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const weekday = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' });
    const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
    const formatted = dateObj.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
    return `${capitalizedWeekday}, ${formatted}`;
  }, [selectedDateStr]);

  const isSelectedDateToday = useMemo(() => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return selectedDateStr === todayStr;
  }, [selectedDateStr]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold shadow-xs">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Agenda Veterinária
              </h1>
              <p className="text-xs text-slate-500">
                Calendário interativo com contagem diária de atendimentos e detalhamento instantâneo.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Switch View Buttons */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-2xs">
            <button
              onClick={() => setViewMode('CALENDAR')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                viewMode === 'CALENDAR'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Calendário</span>
            </button>
            <button
              onClick={() => setViewMode('LIST')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                viewMode === 'LIST'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Lista Geral ({appointments.length})</span>
            </button>
          </div>

          <button
            onClick={() => openNewAppointmentModal(selectedDateStr)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Agendamento</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
          <CalendarIcon className="w-8 h-8 text-slate-300 animate-pulse" />
          <span>Carregando agenda e atendimentos...</span>
        </div>
      ) : viewMode === 'CALENDAR' ? (
        /* ========================================================================= */
        /* VISÃO: CALENDÁRIO COM CONTAGEM POR DIA + DETALHES AO SELECIONAR A DATA    */
        /* ========================================================================= */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* COLUNA ESQUERDA: CALENDÁRIO MENSAL INTERATIVO (7 ou 8 cols em desktop) */}
          <div className="lg:col-span-7 xl:col-span-7 bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-6 space-y-4">
            {/* Navegação do Mês */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition cursor-pointer"
                  title="Mês anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight min-w-[190px] text-center sm:text-left">
                  {monthYearLabel}
                </h2>
                <button
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition cursor-pointer"
                  title="Próximo mês"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2 justify-end">
                <button
                  onClick={handleGoToToday}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-emerald-800 transition cursor-pointer"
                >
                  Hoje
                </button>
                <span className="text-xs text-slate-400">
                  {appointments.length} total
                </span>
              </div>
            </div>

            {/* Cabeçalho dos Dias da Semana */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider py-1">
              <div>Dom</div>
              <div>Seg</div>
              <div>Ter</div>
              <div>Qua</div>
              <div>Qui</div>
              <div>Sex</div>
              <div>Sáb</div>
            </div>

            {/* Grid dos Dias do Calendário */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {calendarDays.map((day) => {
                const isSelected = day.dateStr === selectedDateStr;
                const hasItems = day.count > 0;

                return (
                  <button
                    key={day.dateStr}
                    type="button"
                    onClick={() => setSelectedDateStr(day.dateStr)}
                    className={`min-h-[70px] sm:min-h-[86px] p-1.5 sm:p-2 rounded-xl flex flex-col justify-between text-left transition relative border cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50/70 border-emerald-600 ring-2 ring-emerald-600 shadow-xs'
                        : day.isToday
                        ? 'bg-amber-50/40 border-amber-300 hover:bg-amber-50/70'
                        : day.isCurrentMonth
                        ? 'bg-white border-slate-200/80 hover:bg-slate-50/80 hover:border-slate-300'
                        : 'bg-slate-50/50 border-slate-100 text-slate-300 hover:bg-slate-100/50'
                    }`}
                  >
                    {/* Top row in cell: Day number + Today indicator */}
                    <div className="flex items-center justify-between w-full">
                      <span
                        className={`text-xs sm:text-sm font-bold ${
                          isSelected
                            ? 'text-emerald-900 font-black'
                            : day.isToday
                            ? 'text-amber-800 font-extrabold'
                            : day.isCurrentMonth
                            ? 'text-slate-800'
                            : 'text-slate-400'
                        }`}
                      >
                        {day.dayNumber}
                      </span>

                      {day.isToday && (
                        <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" title="Hoje" />
                      )}
                    </div>

                    {/* Bottom row in cell: Quantidade de coisas para o dia (Requisito central) */}
                    <div className="w-full mt-auto pt-1">
                      {hasItems ? (
                        <div
                          className={`w-full text-center px-1 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-[11px] font-black transition ${
                            isSelected
                              ? 'bg-emerald-700 text-white shadow-2xs'
                              : 'bg-emerald-100/90 text-emerald-800 border border-emerald-300/80'
                          }`}
                          title={`${day.count} ${day.count === 1 ? 'atendimento' : 'atendimentos'} agendados`}
                        >
                          <span className="hidden sm:inline">
                            {day.count} {day.count === 1 ? 'item' : 'itens'}
                          </span>
                          <span className="sm:hidden font-mono">
                            ● {day.count}
                          </span>
                        </div>
                      ) : (
                        <div className="h-4 sm:h-5" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Legenda rápida */}
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between text-[11px] text-slate-500 gap-2">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                  Hoje
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-md bg-emerald-100 border border-emerald-300 inline-block" />
                  Com atendimentos
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-md border-2 border-emerald-600 bg-emerald-50 inline-block" />
                  Data selecionada
                </span>
              </div>
              <span className="text-[10px] text-slate-400 italic">
                Clique em qualquer dia para ver os detalhes
              </span>
            </div>
          </div>

          {/* COLUNA DIREITA: DETALHES DO DIA SELECIONADO (5 cols em desktop) */}
          <div className="lg:col-span-5 xl:col-span-5 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-6 space-y-4">
              {/* Header dos Detalhes do Dia */}
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                      {isSelectedDateToday ? 'Hoje' : 'Detalhes da Data'}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-extrabold">
                      {selectedDayAppointments.length} {selectedDayAppointments.length === 1 ? 'atendimento' : 'atendimentos'}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5 leading-snug">
                    {selectedDateHeading}
                  </h3>
                </div>

                <button
                  onClick={() => openNewAppointmentModal(selectedDateStr)}
                  className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1 transition shrink-0 cursor-pointer shadow-2xs"
                  title="Adicionar atendimento nesta data"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Adicionar</span>
                </button>
              </div>

              {/* Filtro de Status para o dia (opcional, aparece se houver vários) */}
              {appointmentsByDate[selectedDateStr]?.length > 1 && (
                <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
                  <button
                    onClick={() => setStatusFilter('ALL')}
                    className={`px-2 py-1 rounded-md font-semibold transition ${
                      statusFilter === 'ALL'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Todos ({appointmentsByDate[selectedDateStr]?.length})
                  </button>
                  <button
                    onClick={() => setStatusFilter('CONFIRMADO')}
                    className={`px-2 py-1 rounded-md font-semibold transition ${
                      statusFilter === 'CONFIRMADO'
                        ? 'bg-emerald-700 text-white'
                        : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                    }`}
                  >
                    Confirmados
                  </button>
                  <button
                    onClick={() => setStatusFilter('AGENDADO')}
                    className={`px-2 py-1 rounded-md font-semibold transition ${
                      statusFilter === 'AGENDADO'
                        ? 'bg-blue-700 text-white'
                        : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
                    }`}
                  >
                    Agendados
                  </button>
                </div>
              )}

              {/* Lista dos atendimentos do dia selecionado */}
              {selectedDayAppointments.length === 0 ? (
                <div className="p-8 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200 space-y-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <CalendarIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-700">
                      Nenhum atendimento agendado para este dia.
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Você pode registrar uma visita domiciliar, consulta ou cirurgia.
                    </p>
                  </div>
                  <button
                    onClick={() => openNewAppointmentModal(selectedDateStr)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Agendar para este dia
                  </button>
                </div>
              ) : (
                <div className="space-y-3 max-h-[540px] overflow-y-auto pr-1">
                  {selectedDayAppointments.map((appt) => {
                    const normalizedDt = appt.date_time ? appt.date_time.replace(' ', 'T') : '';
                    const timePart = normalizedDt.split('T')[1]?.substring(0, 5) || '09:00';
                    const tutorObj = tutors.find((t) => t.id === appt.tutor_id);

                    return (
                      <div
                        key={appt.id}
                        className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs transition space-y-3"
                      >
                        {/* Top: Hora, Tipo & Status */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-950/5 text-emerald-900 border border-emerald-200/60 font-mono font-bold text-xs">
                              <Clock className="w-3.5 h-3.5 text-emerald-700" />
                              <span>{timePart}</span>
                              <span className="text-[10px] text-slate-400 font-normal">
                                ({appt.duration_minutes}m)
                              </span>
                            </div>

                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                              {appt.appointment_type}
                            </span>
                          </div>

                          {/* Status selector rápido */}
                          <div className="relative">
                            <select
                              value={appt.status}
                              onChange={(e) => handleUpdateStatus(appt.id, e.target.value as AppointmentStatus)}
                              className={`text-[11px] font-bold px-2 py-0.5 rounded-full border cursor-pointer outline-none ${getStatusBadge(
                                appt.status
                              )}`}
                            >
                              <option value="AGENDADO">Agendado</option>
                              <option value="CONFIRMADO">Confirmado</option>
                              <option value="EM_ATENDIMENTO">Em Atendimento</option>
                              <option value="CONCLUIDO">Concluído</option>
                              <option value="CANCELADO">Cancelado</option>
                            </select>
                          </div>
                        </div>

                        {/* Detalhes: Paciente & Tutor */}
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <PawPrint className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                            <strong className="text-slate-900 font-bold text-sm">
                              {appt.patient_name}
                            </strong>
                            <span className="text-slate-500 text-[11px]">
                              ({appt.patient_species || 'Canina'})
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 text-slate-600">
                            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>Tutor: <strong>{appt.tutor_name}</strong></span>
                            {tutorObj?.phone && (
                              <a
                                href={`https://wa.me/55${tutorObj.phone.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 hover:text-emerald-800 ml-1"
                                title="Abrir WhatsApp com o tutor"
                              >
                                <MessageSquare className="w-3 h-3 text-emerald-600" />
                                WhatsApp
                              </a>
                            )}
                          </div>

                          {/* Clínica Parceira se houver */}
                          {appt.clinic_name && (
                            <div className="flex items-center gap-1.5 text-slate-600">
                              <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span>Clínica: <strong>{appt.clinic_name}</strong></span>
                            </div>
                          )}

                          {/* Endereço */}
                          {appt.address && (
                            <div className="flex items-start gap-1.5 text-slate-500 text-[11px]">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                              <span>{appt.address}</span>
                            </div>
                          )}

                          {/* Motivo / Procedimento */}
                          {appt.reason && (
                            <div className="mt-1 p-2 rounded-lg bg-slate-50 text-slate-700 text-[11px] border border-slate-100">
                              <span className="font-semibold text-slate-900">Motivo:</span> {appt.reason}
                            </div>
                          )}

                          {/* Observações adicionais */}
                          {appt.notes && (
                            <div className="text-[11px] text-slate-500 italic pl-1">
                              Obs: {appt.notes}
                            </div>
                          )}
                        </div>

                        {/* Botões de Ação do Card */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            {/* Se for anestesia, atalho para anestesia; se for consulta, atalho para prontuários */}
                            {appt.appointment_type === 'Anestesia' ? (
                              <Link
                                to="/anestesia"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold transition"
                              >
                                <Activity className="w-3 h-3 text-emerald-700" />
                                Sala Anestésica
                              </Link>
                            ) : (
                              <Link
                                to={`/prontuarios?patient_id=${appt.patient_id}`}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold transition"
                              >
                                <Stethoscope className="w-3 h-3 text-emerald-700" />
                                Iniciar Prontuário
                              </Link>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEditModal(appt)}
                              className="p-1 text-slate-400 hover:text-slate-700 rounded transition cursor-pointer"
                              title="Editar agendamento"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteAppointment(appt.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                              title="Remover agendamento"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* VISÃO: LISTA GERAL DE TODOS OS AGENDAMENTOS                               */
        /* ========================================================================= */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-700">Filtrar por Status:</span>
              <div className="flex items-center gap-1 flex-wrap">
                {(['ALL', 'AGENDADO', 'CONFIRMADO', 'EM_ATENDIMENTO', 'CONCLUIDO', 'CANCELADO'] as const).map(
                  (st) => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                        statusFilter === st
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {st === 'ALL' ? 'Todos' : st}
                    </button>
                  )
                )}
              </div>
            </div>

            <span className="text-xs text-slate-400">
              {appointments.length} cadastrados no sistema
            </span>
          </div>

          {appointments.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200/80 p-8 text-center">
              <CalendarIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">Nenhum atendimento na agenda.</p>
              <button
                onClick={() => openNewAppointmentModal()}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-700 text-white hover:bg-emerald-800 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Novo Agendamento
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs divide-y divide-slate-100 overflow-hidden">
              {appointments
                .filter((a) => statusFilter === 'ALL' || a.status === statusFilter)
                .map((appt) => (
                  <div
                    key={appt.id}
                    className="p-4 sm:p-5 hover:bg-slate-50/60 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200/50 min-w-16 text-center">
                        <span className="text-xs uppercase font-bold tracking-wider">
                          {(appt.date_time ? appt.date_time.replace(' ', 'T') : '').split('T')[0]?.substring(5) || 'Hoje'}
                        </span>
                        <span className="text-sm font-black font-mono mt-0.5">
                          {(appt.date_time ? appt.date_time.replace(' ', 'T') : '').split('T')[1]?.substring(0, 5) || '10:00'}
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-slate-900">
                            {appt.patient_name}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">
                            ({appt.patient_species || 'Canina'})
                          </span>
                          <span className="text-xs text-slate-400">• Tutor:</span>
                          <span className="text-xs font-semibold text-slate-700">
                            {appt.tutor_name}
                          </span>
                        </div>

                        {appt.reason && (
                          <div className="text-xs font-medium text-slate-700">
                            {appt.reason}
                          </div>
                        )}

                        <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>{appt.duration_minutes} min</span>
                          </div>

                          <div className="flex items-center gap-1">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium">
                              {appt.appointment_type}
                            </span>
                          </div>

                          {appt.clinic_name && (
                            <div className="flex items-center gap-1 text-blue-700">
                              <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span>{appt.clinic_name}</span>
                            </div>
                          )}

                          {appt.address && (
                            <div className="flex items-center gap-1 text-emerald-800">
                              <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                              <span>{appt.address}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <select
                        value={appt.status}
                        onChange={(e) => handleUpdateStatus(appt.id, e.target.value as AppointmentStatus)}
                        className={`text-xs font-semibold px-3 py-1 rounded-full border cursor-pointer outline-none ${getStatusBadge(
                          appt.status
                        )}`}
                      >
                        <option value="AGENDADO">Agendado</option>
                        <option value="CONFIRMADO">Confirmado</option>
                        <option value="EM_ATENDIMENTO">Em Atendimento</option>
                        <option value="CONCLUIDO">Concluído</option>
                        <option value="CANCELADO">Cancelado</option>
                      </select>

                      <button
                        onClick={() => openEditModal(appt)}
                        className="p-1 text-slate-400 hover:text-slate-700 rounded transition cursor-pointer"
                        title="Editar"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteAppointment(appt.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Modal: Agendar / Editar Atendimento */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingAppointment ? 'Editar Agendamento' : 'Agendar Atendimento'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAppointment} className="mt-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tutor *</label>
                  <select
                    value={form.tutor_id}
                    onChange={(e) => handleTutorChange(parseInt(e.target.value))}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none bg-white"
                  >
                    {tutors.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Paciente *</label>
                  <select
                    value={form.patient_id}
                    onChange={(e) => setForm({ ...form, patient_id: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none bg-white"
                  >
                    {patients
                      .filter((p) => p.tutor_id === form.tutor_id)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.species})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Data e Horário *</label>
                  <input
                    type="datetime-local"
                    required
                    value={form.date_time}
                    onChange={(e) => setForm({ ...form, date_time: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Duração (minutos)</label>
                  <input
                    type="number"
                    value={form.duration_minutes}
                    onChange={(e) => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 60 })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de Atendimento</label>
                  <select
                    value={form.appointment_type}
                    onChange={(e) => setForm({ ...form, appointment_type: e.target.value as AppointmentType })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none bg-white"
                  >
                    <option value="Domiciliar / Volante">Domiciliar / Volante</option>
                    <option value="Consultório / Clínica Parceira">Consultório / Clínica Parceira</option>
                    <option value="Anestesia">Anestesia</option>
                    <option value="Emergência">Emergência</option>
                    <option value="Retorno">Retorno</option>
                    <option value="Vacinação">Vacinação</option>
                    <option value="Procedimento">Procedimento</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as AppointmentStatus })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none bg-white"
                  >
                    <option value="AGENDADO">Agendado</option>
                    <option value="CONFIRMADO">Confirmado</option>
                    <option value="EM_ATENDIMENTO">Em Atendimento</option>
                    <option value="CONCLUIDO">Concluído</option>
                    <option value="CANCELADO">Cancelado</option>
                  </select>
                </div>
              </div>

              {clinics.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Clínica / Hospital Parceiro (Opcional)
                  </label>
                  <select
                    value={form.clinic_id || ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        clinic_id: e.target.value ? parseInt(e.target.value) : undefined
                      })
                    }
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none bg-white"
                  >
                    <option value="">Nenhuma clínica vinculada (Visita / Próprio)</option>
                    {clinics.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.neighborhood || c.city || 'São Paulo'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Endereço da Visita / Atendimento</label>
                <input
                  type="text"
                  placeholder="Rua, número, bairro..."
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Motivo / Queixa Principal</label>
                <input
                  type="text"
                  placeholder="Ex: Vacinação V10, retorno dermatológico, procedimento anestésico..."
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Observações / Instruções Prévias</label>
                <textarea
                  rows={2}
                  placeholder="Ex: Paciente em jejum de 8h, trazer exames laboratoriais..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none"
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
                  {editingAppointment ? 'Salvar Alterações' : 'Confirmar Agendamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
