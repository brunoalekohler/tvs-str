import React, { useState, useEffect } from 'react';
import {
  BellRing,
  MapPin,
  Users,
  Clock,
  AlertTriangle,
  Volume2,
  VolumeX,
  X,
  ShieldCheck,
} from 'lucide-react';
import { EventItem } from '../types';
import { playEventAlertAlarm } from '../utils/sound';

interface EventAlertModalProps {
  event: EventItem;
  onDismiss: () => void;
  audioUnlocked: boolean;
}

export const EventAlertModal: React.FC<EventAlertModalProps> = ({
  event,
  onDismiss,
  audioUnlocked,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState(60); // 1 minute full screen
  const [isMuted, setIsMuted] = useState(false);

  // Sound alert management
  useEffect(() => {
    let stopAlarm: (() => void) | null = null;
    if (audioUnlocked && !isMuted) {
      // Play loud industrial alert
      stopAlarm = playEventAlertAlarm(12000); // 12 seconds siren burst
    }
    return () => {
      if (stopAlarm) stopAlarm();
    };
  }, [audioUnlocked, isMuted]);

  // 1 Minute Countdown (60 seconds)
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onDismiss();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onDismiss]);

  const progressPercentage = ((60 - secondsRemaining) / 60) * 100;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col justify-between p-6 sm:p-12 animate-in fade-in zoom-in-95 duration-300 overflow-y-auto">
      {/* Background ambient alert glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-900/30 via-slate-950 to-slate-950 -z-10 pointer-events-none" />

      {/* Top Banner: Emergency Alert Beacon */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-red-900/60 pb-6">
        <div className="flex items-center gap-4">
          <div className="relative flex items-center justify-center">
            <span className="animate-ping absolute inline-flex h-16 w-16 rounded-full bg-red-500 opacity-60" />
            <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center shadow-lg shadow-red-600/40 border border-red-400">
              <BellRing className="w-8 h-8 text-white animate-bounce" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-widest px-3 py-1 rounded-md bg-red-600 text-white shadow-sm">
                ALERTA GERAL DE EVENTO
              </span>
              <span className="text-xs font-semibold text-red-300 animate-pulse">
                INICIANDO AGORA
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
              Chamada para Operação / Atividade
            </h1>
          </div>
        </div>

        {/* 60s countdown timer & dismiss controls */}
        <div className="flex items-center gap-3">
          {/* Sound control */}
          <button
            onClick={() => setIsMuted((prev) => !prev)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold hover:bg-slate-800 text-slate-300"
            title={isMuted ? 'Ativar som' : 'Silenciar som'}
          >
            {isMuted ? (
              <>
                <VolumeX className="w-4 h-4 text-amber-400" />
                <span>Sem Som</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span>Som Ativo</span>
              </>
            )}
          </button>

          {/* 60s Ring / Pill */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-950/80 border border-red-800 text-red-200 font-mono font-bold text-sm">
            <Clock className="w-4 h-4 text-red-400" />
            <span>{secondsRemaining}s restantes</span>
          </div>

          <button
            onClick={onDismiss}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors"
            title="Fechar alerta e prosseguir"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Center Highlight Content */}
      <div className="my-auto py-8 max-w-5xl mx-auto w-full">
        {/* Category & Time */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className="text-sm font-black uppercase tracking-wider px-3.5 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40">
            {event.category || 'Operação Programada'}
          </span>
          <div className="flex items-center gap-2 text-sm font-mono font-bold text-slate-300 bg-slate-900/90 px-3.5 py-1 rounded-full border border-slate-800">
            <Clock className="w-4 h-4 text-red-400" />
            <span>Horário: {event.startTime}h às {event.endTime}h</span>
          </div>
        </div>

        {/* 1. TÍTULO DO EVENTO */}
        <h2 className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight mb-8 leading-tight drop-shadow-md">
          {event.title}
        </h2>

        {/* 2. LOCAL */}
        <div className="bg-slate-900/90 border-2 border-red-900/40 rounded-3xl p-6 sm:p-8 mb-8 shadow-2xl backdrop-blur-sm">
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-extrabold uppercase tracking-widest text-red-400 mb-2">
            <MapPin className="w-5 h-5 text-red-400" />
            <span>LOCALIZAÇÃO / PONTO DE ENCONTRO</span>
          </div>
          <p className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            {event.location}
          </p>
        </div>

        {/* 3. FUNCIONÁRIOS EMPENHADOS */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5 text-xs sm:text-sm font-extrabold uppercase tracking-widest text-emerald-400">
              <Users className="w-5 h-5 text-emerald-400" />
              <span>COLABORADORES / FUNCIONÁRIOS EMPENHADOS</span>
            </div>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {event.employees.length} Designados
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {event.employees.map((employee, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-950 border border-slate-800/90 hover:border-emerald-500/50 transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-300 text-sm shrink-0">
                  {employee.charAt(0).toUpperCase()}
                </div>
                <span className="font-bold text-base text-slate-100 truncate">
                  {employee}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom: 60s Progress Bar & Instructions */}
      <div className="border-t border-slate-800/80 pt-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-3 text-xs text-slate-400 font-medium">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            <span>
              Aviso automático de início de atividade. Todos os envolvidos devem se apresentar ao local indicado.
            </span>
          </div>
          <span className="font-mono text-slate-300 font-bold">
            Fechando automaticamente em: {secondsRemaining}s
          </span>
        </div>

        {/* Visual Progress Line */}
        <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
          <div
            className="h-full bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 transition-all duration-1000 ease-linear rounded-full"
            style={{ width: `${100 - progressPercentage}%` }}
          />
        </div>
      </div>
    </div>
  );
};
