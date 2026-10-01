import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Clock,
  X,
  ShieldCheck,
} from 'lucide-react';
import { ShiftDefinition } from '../types';
import { playShiftAnnouncementChime } from '../utils/sound';

interface ShiftAlertModalProps {
  shift: ShiftDefinition;
  onDismiss: () => void;
  audioUnlocked: boolean;
}

export const ShiftAlertModal: React.FC<ShiftAlertModalProps> = ({
  shift,
  onDismiss,
  audioUnlocked,
}) => {
  // 1 Minute (60 seconds) duration
  const [secondsRemaining, setSecondsRemaining] = useState(60);

  useEffect(() => {
    if (audioUnlocked) {
      playShiftAnnouncementChime();
    }
  }, [audioUnlocked]);

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

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/98 text-white flex flex-col justify-between p-6 sm:p-12 animate-in fade-in zoom-in-95 duration-300 backdrop-blur-md select-none">
      {/* Subtle ambient lighting */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/25 via-slate-950 to-slate-950 -z-10 pointer-events-none" />

      {/* Top Bar: Minimal and clean */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <ShieldCheck className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-blue-400 block">
              Início de Turno Oficial • {shift.startTime}h
            </span>
            <h3 className="text-base sm:text-lg font-extrabold text-white">
              {shift.name}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs sm:text-sm font-mono font-bold text-slate-300">
            <Clock className="w-4 h-4 text-blue-400" />
            <span>{secondsRemaining}s</span>
          </div>

          <button
            onClick={onDismiss}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors"
            title="Fechar aviso"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Inspiring Message - Centered, grand, highly visible from distance */}
      <div className="my-auto py-8 max-w-4xl mx-auto w-full text-center flex flex-col items-center justify-center">
        {/* Welcome Tag */}
        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm sm:text-base font-bold mb-6 shadow-sm">
          <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
          <span>Boas-vindas a todos os colaboradores</span>
        </div>

        {/* Big Greeting Headline */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-white tracking-tight mb-8 leading-tight drop-shadow-lg">
          Boa jornada de trabalho!
        </h1>

        {/* Safety Core Message Card */}
        <div className="w-full bg-slate-900/90 border-2 border-amber-500/40 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-sm">
          <p className="text-xl sm:text-3xl md:text-4xl font-extrabold text-amber-300 leading-snug tracking-tight">
            Mantenha o foco e a atenção redobrada: o uso correto de todos os EPIs é obrigatório e salva vidas.
          </p>
          <div className="mt-4 pt-4 border-t border-slate-800/80">
            <p className="text-sm sm:text-lg text-slate-300 font-medium">
              Lembre-se: sua família te espera de volta com saúde e integridade física. Segurança em primeiro lugar!
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Subtle Bar (No extra clutter, just progress) */}
      <div className="max-w-6xl mx-auto w-full pt-2">
        <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800">
          <div
            className="h-full bg-blue-500 transition-all duration-1000 ease-linear rounded-full"
            style={{ width: `${(secondsRemaining / 60) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};
