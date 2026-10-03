import React, { useState } from 'react';
import {
  Lock,
  Plus,
  Trash2,
  Database,
  Volume2,
  BellRing,
  HeartHandshake,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Building2,
  Calendar,
  Clock,
  MapPin,
  Users,
  RotateCw,
} from 'lucide-react';
import { EventItem, CompanyConfig, AutoRefreshConfig } from '../types';
import {
  createEvent,
  deleteEvent,
  getSavedSupabaseConfig,
  saveSupabaseConfig,
  testSupabaseConnection,
  SUPABASE_SETUP_SQL,
} from '../services/supabase';
import { playEventAlertAlarm, playShiftAnnouncementChime } from '../utils/sound';
import { INITIAL_SHIFTS } from '../data/initialEvents';

interface AdminPanelProps {
  events: EventItem[];
  company: CompanyConfig;
  onUpdateCompany: (config: CompanyConfig) => void;
  onRefreshEvents: () => void;
  onCloseAdmin: () => void;
  onTriggerTestEventAlert: (event: EventItem) => void;
  onTriggerTestShiftAlert: (shiftIndex: number) => void;
  refreshConfig?: AutoRefreshConfig;
  onUpdateRefreshConfig?: (config: AutoRefreshConfig) => void;
  secondsUntilReload?: number | null;
  lastSyncTime?: Date | null;
  isSyncing?: boolean;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  events,
  company,
  onUpdateCompany,
  onRefreshEvents,
  onCloseAdmin,
  onTriggerTestEventAlert,
  onTriggerTestShiftAlert,
  refreshConfig = {
    syncIntervalSeconds: 20,
    autoReloadMinutes: 30,
    realtimeEnabled: true,
  },
  onUpdateRefreshConfig,
  secondsUntilReload = null,
  lastSyncTime = null,
  isSyncing = false,
}) => {
  // Password protection state: 1989
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Tabs
  const [activeTab, setActiveTab] = useState<'events' | 'tests' | 'supabase' | 'company'>('events');

  // New event form state
  const todayStr = new Date().toISOString().split('T')[0];
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [employeesRaw, setEmployeesRaw] = useState('');
  const [date, setDate] = useState(todayStr);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('09:00');
  const [category, setCategory] = useState('Operacional');
  const [color, setColor] = useState('#2563eb');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState('');

  // Supabase config state
  const [supabaseUrl, setSupabaseUrl] = useState(getSavedSupabaseConfig().url);
  const [supabaseKey, setSupabaseKey] = useState(getSavedSupabaseConfig().anonKey);
  const [supabaseTestStatus, setSupabaseTestStatus] = useState<{
    loading: boolean;
    success?: boolean;
    message?: string;
  }>({ loading: false });
  const [copiedSql, setCopiedSql] = useState(false);

  // Company settings form
  const [compName, setCompName] = useState(company.name || 'SANTA ROSA MALHAS');
  const [compSubtitle, setCompSubtitle] = useState(company.subtitle);
  const [compDept, setCompDept] = useState(company.department);
  const [compLogo, setCompLogo] = useState(company.logoUrl || '');
  const [compSaved, setCompSaved] = useState(false);

  // Handle password submit
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === '1989') {
      setIsAuthenticated(true);
      setPasswordError('');
    } else {
      setPasswordError('Senha incorreta. Acesso não autorizado.');
    }
  };

  // Handle Event Creation
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !location.trim()) {
      alert('Por favor, preencha o título e o local do evento.');
      return;
    }

    const employees = employeesRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (employees.length === 0) {
      employees.push('Equipe Geral');
    }

    setIsSubmitting(true);
    try {
      await createEvent({
        title: title.trim(),
        location: location.trim(),
        employees,
        date,
        startTime,
        endTime,
        category,
        color,
      });

      setFormSuccess('Evento cadastrado e sincronizado com sucesso!');
      setTitle('');
      setLocation('');
      setEmployeesRaw('');
      onRefreshEvents();

      setTimeout(() => setFormSuccess(''), 4000);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar evento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Event Deletion
  const handleDeleteEvent = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este evento? Ele será removido do banco de dados.')) {
      await deleteEvent(id);
      onRefreshEvents();
    }
  };

  // Handle Supabase Config Save
  const handleSaveSupabase = () => {
    saveSupabaseConfig({
      url: supabaseUrl.trim(),
      anonKey: supabaseKey.trim(),
    });
    alert('Configurações do Supabase salvas com sucesso!');
    onRefreshEvents();
  };

  // Test Supabase
  const handleTestSupabase = async () => {
    setSupabaseTestStatus({ loading: true });
    // First save current inputs
    saveSupabaseConfig({
      url: supabaseUrl.trim(),
      anonKey: supabaseKey.trim(),
    });
    const result = await testSupabaseConnection();
    setSupabaseTestStatus({
      loading: false,
      success: result.success,
      message: result.message,
    });
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SETUP_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateCompany({
      name: 'SANTA ROSA MALHAS',
      subtitle: compSubtitle.trim() || '',
      department: compDept.trim() || '',
      logoUrl: compLogo.trim() || undefined,
    });
    setCompSaved(true);
    setTimeout(() => setCompSaved(false), 3000);
  };

  // 1. Password Screen
  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-4 shadow-inner">
              <Lock className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Acesso Administrativo
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Informe a credencial de segurança para gerenciar eventos e configurações
            </p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Senha de Acesso
              </label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Digite a senha..."
                autoFocus
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-center tracking-widest text-lg font-mono"
              />
            </div>

            {passwordError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{passwordError}</span>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onCloseAdmin}
                className="flex-1 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-colors"
              >
                Voltar ao Painel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-lg shadow-blue-600/30 transition-colors"
              >
                Entrar
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // 2. Authenticated Admin Dashboard
  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col overflow-hidden">
      {/* Admin Top Header */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onCloseAdmin}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-2 text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar ao Painel TV</span>
          </button>
          <div className="h-4 w-px bg-slate-700" />
          <h1 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
            Painel de Administração
          </h1>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-semibold border border-blue-500/30">
            /admin
          </span>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('events')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'events'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Eventos ({events.length})
          </button>
          <button
            onClick={() => setActiveTab('tests')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'tests'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Testar Alertas & Som
          </button>
          <button
            onClick={() => setActiveTab('supabase')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'supabase'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Supabase DB
          </button>
          <button
            onClick={() => setActiveTab('company')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'company'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Empresa & Logo
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto p-6 sm:p-8 max-w-7xl mx-auto w-full">
        {/* TAB 1: EVENTS */}
        {activeTab === 'events' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Form to Add Event */}
            <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl h-fit">
              <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-800">
                <Plus className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-bold text-white">
                  Cadastrar Novo Evento
                </h3>
              </div>

              {formSuccess && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{formSuccess}</span>
                </div>
              )}

              <form onSubmit={handleCreateEvent} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                    Título do Evento *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: DDS Geral / Manutenção Prensa 02"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                    Local / Setor *
                  </label>
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Ex: Pátio Central / Linha 03 de Estamparia"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                    Funcionários Empenhados (separados por vírgula)
                  </label>
                  <textarea
                    rows={2}
                    value={employeesRaw}
                    onChange={(e) => setEmployeesRaw(e.target.value)}
                    placeholder="Ex: Carlos Silva, Mariana Souza, Roberto Santos"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Estes nomes serão exibidos em destaque na tela cheia ao iniciar o evento.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                      Data
                    </label>
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                      Início
                    </label>
                    <input
                      type="time"
                      required
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                      Término
                    </label>
                    <input
                      type="time"
                      required
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                      Categoria
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
                    >
                      <option value="Segurança">Segurança</option>
                      <option value="Manutenção">Manutenção</option>
                      <option value="Operacional">Operacional</option>
                      <option value="Treinamento">Treinamento</option>
                      <option value="Qualidade">Qualidade</option>
                      <option value="Reunião">Reunião</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                      Cor de Destaque
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="w-9 h-9 rounded-lg bg-transparent border-0 cursor-pointer"
                      />
                      <span className="text-xs font-mono text-slate-400">{color}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar no Supabase'}
                </button>
              </form>
            </div>

            {/* List of Existing Events */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-white">
                  Eventos Programados ({events.length})
                </h3>
                <span className="text-xs text-slate-400">
                  Após o evento ocorrer, ele é excluído automaticamente.
                </span>
              </div>

              {events.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center text-slate-400">
                  <Calendar className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                  <p className="font-semibold text-slate-300">Nenhum evento cadastrado.</p>
                  <p className="text-xs mt-1 text-slate-500">
                    Use o formulário ao lado para cadastrar atividades da fábrica.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                  {events.map((event) => (
                    <div
                      key={event.id}
                      className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-start justify-between gap-4 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
                            style={{
                              backgroundColor: `${event.color || '#2563eb'}20`,
                              color: event.color || '#60a5fa',
                              border: `1px solid ${event.color || '#2563eb'}40`,
                            }}
                          >
                            {event.category || 'Geral'}
                          </span>
                          <span className="text-xs font-mono text-slate-400">
                            {event.date} • {event.startTime} - {event.endTime}
                          </span>
                        </div>

                        <h4 className="font-bold text-white text-base mb-1">
                          {event.title}
                        </h4>

                        <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-2">
                          <MapPin className="w-3.5 h-3.5 text-rose-400" />
                          <span>{event.location}</span>
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {event.employees.map((emp, i) => (
                            <span
                              key={i}
                              className="text-[11px] px-2 py-0.5 rounded-md bg-slate-950 text-slate-300 border border-slate-800"
                            >
                              {emp}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 shrink-0">
                        <button
                          onClick={() => onTriggerTestEventAlert(event)}
                          title="Simular início deste evento agora"
                          className="p-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 transition-colors"
                        >
                          <BellRing className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteEvent(event.id)}
                          title="Excluir evento do Supabase"
                          className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: TESTS & SOUND */}
        {activeTab === 'tests' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <Volume2 className="w-5 h-5 text-emerald-400" />
                <span>Simulações de Alertas e Sirene Sonora</span>
              </h3>
              <p className="text-xs text-slate-400 mb-6">
                Teste em tempo real como o display da fábrica e o sinal sonoro se comportam quando os gatilhos são ativados.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Test Event Alert with siren */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 flex items-center justify-center mb-3">
                      <BellRing className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-white text-base mb-1">
                      Alerta de Início de Evento
                    </h4>
                    <p className="text-xs text-slate-400 mb-4">
                      Abre a tela cheia por 1 minuto com sinal sonoro alto, título, local e funcionários empenhados.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const sampleEvent: EventItem = events[0] || {
                        id: 'test_1',
                        title: 'Simulação: Manutenção Preventiva - Linha 2',
                        location: 'Galpão Principal - Setor de Estamparia',
                        employees: ['Carlos Silva (Técnico)', 'Mariana Souza (Operadora)'],
                        date: todayStr,
                        startTime: '10:00',
                        endTime: '11:30',
                        category: 'Manutenção',
                        color: '#ea580c',
                      };
                      onTriggerTestEventAlert(sampleEvent);
                    }}
                    className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/30 transition-colors"
                  >
                    Disparar Alerta de Evento (1 min)
                  </button>
                </div>

                {/* Test Audio Siren Solo */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mb-3">
                      <Volume2 className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-white text-base mb-1">
                      Teste de Volume do Alerta Sonoro
                    </h4>
                    <p className="text-xs text-slate-400 mb-4">
                      Toca o sinal sonoro profissional e encorpado sintetizado via Web Audio API para checagem acústica do ambiente.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      playEventAlertAlarm(3000);
                    }}
                    className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg shadow-amber-600/30 transition-colors"
                  >
                    Tocar Alerta por 3s
                  </button>
                </div>
              </div>

              {/* Test Shifts */}
              <div className="mt-6 pt-6 border-t border-slate-800">
                <h4 className="text-sm font-bold text-slate-200 mb-2 flex items-center gap-2">
                  <HeartHandshake className="w-4 h-4 text-blue-400" />
                  <span>Simular Início de Turno & Mensagem de EPI</span>
                </h4>
                <p className="text-xs text-slate-400 mb-4">
                  Testa o aviso programado para os horários oficiais (05:00, 13:30, 22:00) com mensagem de boa jornada e EPIs obrigatórios.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {INITIAL_SHIFTS.map((shift, idx) => (
                    <button
                      key={shift.id}
                      onClick={() => onTriggerTestShiftAlert(idx)}
                      className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition-colors group"
                    >
                      <span className="text-[10px] font-mono text-blue-400 font-bold block">
                        {shift.startTime}h
                      </span>
                      <span className="text-xs font-bold text-white group-hover:text-blue-300">
                        {shift.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SUPABASE INTEGRATION */}
        {activeTab === 'supabase' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    Conexão com Banco de Dados Supabase
                  </h3>
                  <p className="text-xs text-slate-400">
                    Os eventos são salvos na nuvem e excluídos automaticamente após o término.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                    Supabase Project URL
                  </label>
                  <input
                    type="text"
                    value={supabaseUrl}
                    onChange={(e) => setSupabaseUrl(e.target.value)}
                    placeholder="https://xyzcompany.supabase.co"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 text-sm font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                    Supabase Anon Public API Key
                  </label>
                  <input
                    type="password"
                    value={supabaseKey}
                    onChange={(e) => setSupabaseKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 text-sm font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                {supabaseTestStatus.message && (
                  <div
                    className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                      supabaseTestStatus.success
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                    }`}
                  >
                    {supabaseTestStatus.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    )}
                    <span>{supabaseTestStatus.message}</span>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleTestSupabase}
                    disabled={supabaseTestStatus.loading}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-colors"
                  >
                    {supabaseTestStatus.loading ? 'Verificando...' : 'Testar Conexão'}
                  </button>
                  <button
                    onClick={handleSaveSupabase}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition-colors"
                  >
                    Salvar Credenciais
                  </button>
                </div>
              </div>

              {/* SQL script helper */}
              <div className="mt-8 pt-6 border-t border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Script SQL para criar a tabela no Supabase
                  </h4>
                  <button
                    onClick={handleCopySql}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
                  >
                    {copiedSql ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar SQL</span>
                      </>
                    )}
                  </button>
                </div>

                <pre className="bg-slate-950 p-4 rounded-xl text-[11px] font-mono text-slate-300 overflow-x-auto border border-slate-800/80 leading-relaxed">
                  {SUPABASE_SETUP_SQL}
                </pre>
              </div>
            </div>

            {/* CARD 2: AUTO-REFRESH & RELOAD CONTROLS */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center">
                  <RotateCw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    Sincronização Contínua & Recarga do Site
                  </h3>
                  <p className="text-xs text-slate-400">
                    Mantenha o painel sempre atualizado e limpo em TVs, totens e monitores de fábrica.
                  </p>
                </div>
              </div>

              {/* Status Banner */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-slate-300">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="font-semibold">Última sincronização:</span>
                    <span className="font-mono text-emerald-400">
                      {lastSyncTime
                        ? lastSyncTime.toLocaleTimeString('pt-BR')
                        : 'Ainda não sincronizado'}
                    </span>
                  </div>
                  {secondsUntilReload !== null && (
                    <div className="flex items-center gap-2 text-slate-400">
                      <span className="font-semibold">Próxima recarga do site:</span>
                      <span className="font-mono text-blue-400">
                        em {Math.floor(secondsUntilReload / 60)}m {secondsUntilReload % 60}s
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={onRefreshEvents}
                    disabled={isSyncing}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all active:scale-95 disabled:opacity-50 cursor-pointer text-xs"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Buscando...' : 'Sincronizar Agora'}</span>
                  </button>

                  <button
                    onClick={() => window.location.reload()}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold transition-all active:scale-95 cursor-pointer text-xs"
                    title="Recarrega a página inteira no navegador"
                  >
                    <span>Recarregar Site</span>
                  </button>
                </div>
              </div>

              {/* Configuration Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                    Intervalo de Busca no Supabase
                  </label>
                  <select
                    value={refreshConfig.syncIntervalSeconds}
                    onChange={(e) => {
                      if (onUpdateRefreshConfig) {
                        onUpdateRefreshConfig({
                          ...refreshConfig,
                          syncIntervalSeconds: Number(e.target.value),
                        });
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value={10}>A cada 10 segundos</option>
                    <option value={20}>A cada 20 segundos (Padrão)</option>
                    <option value={30}>A cada 30 segundos</option>
                    <option value={60}>A cada 1 minuto (60s)</option>
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Frequência com que o painel consulta novos eventos no banco.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                    Recarregar Página Automaticamente
                  </label>
                  <select
                    value={refreshConfig.autoReloadMinutes}
                    onChange={(e) => {
                      if (onUpdateRefreshConfig) {
                        onUpdateRefreshConfig({
                          ...refreshConfig,
                          autoReloadMinutes: Number(e.target.value),
                        });
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value={0}>Desativado (Apenas atualização interna)</option>
                    <option value={5}>A cada 5 minutos</option>
                    <option value={10}>A cada 10 minutos</option>
                    <option value={15}>A cada 15 minutos</option>
                    <option value={30}>A cada 30 minutos (Recomendado para TVs)</option>
                    <option value={60}>A cada 1 hora</option>
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Efetua reload no navegador para renovar memória e conexão.
                  </p>
                </div>
              </div>

              {/* Realtime Checkbox */}
              <div className="pt-2 border-t border-slate-800">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={refreshConfig.realtimeEnabled}
                    onChange={(e) => {
                      if (onUpdateRefreshConfig) {
                        onUpdateRefreshConfig({
                          ...refreshConfig,
                          realtimeEnabled: e.target.checked,
                        });
                      }
                    }}
                    className="w-4 h-4 rounded text-blue-600 bg-slate-950 border-slate-700 focus:ring-blue-500"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-slate-200">
                      Ativar Supabase Realtime (Instantâneo)
                    </span>
                    <p className="text-slate-400 text-[11px]">
                      Atualiza o display imediatamente assim que um evento for criado, alterado ou excluído no Supabase.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: COMPANY SETTINGS */}
        {activeTab === 'company' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-5 pb-3 border-b border-slate-800">
                <Building2 className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-bold text-white">
                  Identidade Visual e Logo da Empresa
                </h3>
              </div>

              {compSaved && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Configurações da empresa atualizadas!</span>
                </div>
              )}

              <form onSubmit={handleSaveCompany} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-300 uppercase">
                      Nome da Empresa
                    </label>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      Fixado
                    </span>
                  </div>
                  <input
                    type="text"
                    value="SANTA ROSA MALHAS"
                    readOnly
                    disabled
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-white font-bold text-sm cursor-not-allowed select-none opacity-90"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    O nome corporativo do painel é fixo como <strong>SANTA ROSA MALHAS</strong> em toda a aplicação.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                    Subtítulo / Descrição do Cabeçalho
                  </label>
                  <input
                    type="text"
                    value={compSubtitle}
                    onChange={(e) => setCompSubtitle(e.target.value)}
                    placeholder="Ex: SISTEMA INTEGRADO DE HORÁRIOS & GESTÃO OPERACIONAL"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                    Departamento / Planta
                  </label>
                  <input
                    type="text"
                    value={compDept}
                    onChange={(e) => setCompDept(e.target.value)}
                    placeholder="Ex: PLANTA INDUSTRIAL 01"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                    Caminho ou Arquivo da Logo
                  </label>
                  <p className="text-xs text-slate-400 mb-2 leading-relaxed">
                    Para trocar o arquivo diretamente no repositório, faça o upload de <code className="bg-slate-950 px-1.5 py-0.5 rounded text-blue-400 font-mono">logo.png</code> ou <code className="bg-slate-950 px-1.5 py-0.5 rounded text-blue-400 font-mono">logo.svg</code> na pasta <code className="bg-slate-950 px-1.5 py-0.5 rounded text-blue-400 font-mono">public/</code>.
                  </p>
                  <input
                    type="text"
                    value={compLogo}
                    onChange={(e) => setCompLogo(e.target.value)}
                    placeholder="/logo.png"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold text-slate-300 block mb-1">
                      Upload rápido de arquivo local:
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Selecione uma imagem do seu computador (PNG, SVG, JPG).
                    </span>
                  </div>
                  <label className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer transition-colors shrink-0 shadow-md shadow-blue-600/20">
                    <span>Escolher Imagem</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = () => {
                            if (typeof reader.result === 'string') {
                              setCompLogo(reader.result);
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>

                {/* Live Preview */}
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center gap-4">
                  <span className="text-xs font-bold text-slate-400 uppercase">Pré-visualização:</span>
                  <div className="h-12 px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center">
                    <img
                      src={compLogo || '/logo.png'}
                      alt="Preview"
                      className="h-9 w-auto max-w-[160px] object-contain"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/logo.svg';
                      }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition-colors"
                >
                  Salvar Alterações
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
