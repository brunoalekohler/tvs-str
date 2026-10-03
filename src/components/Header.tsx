import React, { useState, useEffect } from 'react';
import { Settings, ShieldCheck, RotateCw, Calendar } from 'lucide-react';
import { CompanyConfig } from '../types';

interface HeaderProps {
  company: CompanyConfig;
  onOpenAdmin: () => void;
  onManualRefresh?: () => void;
  isSyncing?: boolean;
  lastSyncTime?: Date | null;
  secondsUntilReload?: number | null;
}

export const Header: React.FC<HeaderProps> = ({
  company,
  onOpenAdmin,
  onManualRefresh,
  isSyncing = false,
  lastSyncTime = null,
  secondsUntilReload = null,
}) => {
  // Deduplicated candidate list: custom URL first, then standard static files in /public/
  const candidateLogos = Array.from(
    new Set([company.logoUrl, '/logo.png', '/logo.svg', '/logo.jpg'].filter(Boolean))
  ) as string[];

  const [logoIndex, setLogoIndex] = useState(0);

  useEffect(() => {
    setLogoIndex(0);
  }, [company.logoUrl]);

  const handleImageError = () => {
    if (logoIndex < candidateLogos.length - 1) {
      setLogoIndex((prev) => prev + 1);
    } else {
      setLogoIndex(-1); // Show fallback icon
    }
  };

  const currentLogoSrc = logoIndex >= 0 && logoIndex < candidateLogos.length ? candidateLogos[logoIndex] : null;

  // Format countdown for reload
  const formatReloadCountdown = (totalSec: number | null) => {
    if (totalSec === null) return null;
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <header className="bg-slate-900/95 border-b border-slate-800/80 text-white px-5 sm:px-8 py-3 select-none relative z-20 shadow-sm shrink-0">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Logo & Company Name Only */}
        <div className="flex items-center gap-3.5 sm:gap-4 overflow-hidden">
          {currentLogoSrc ? (
            <img
              src={currentLogoSrc}
              alt={company.name}
              referrerPolicy="no-referrer"
              onError={handleImageError}
              className="h-9 sm:h-12 w-auto max-w-[180px] sm:max-w-[220px] object-contain shrink-0 rounded-lg"
            />
          ) : (
            <div className="h-9 w-9 sm:h-11 sm:w-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-inner border border-blue-400/30 shrink-0">
              <ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
          )}

          <h1 className="font-black text-base sm:text-2xl tracking-tight text-white uppercase font-sans truncate">
            {company.name}
          </h1>
        </div>

        {/* Right: Badge, Sync Status & Admin Button */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/50 border border-slate-700/60 text-xs font-mono text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-blue-400" />
            <span>Agenda Semanal</span>
          </div>

          {onManualRefresh && (
            <button
              onClick={onManualRefresh}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 text-xs font-medium transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              title={
                lastSyncTime
                  ? `Última sincronização: ${lastSyncTime.toLocaleTimeString('pt-BR')}${
                      secondsUntilReload !== null
                        ? ` • Próxima recarga do site em ${formatReloadCountdown(secondsUntilReload)}`
                        : ''
                    }. Clique para sincronizar agora.`
                  : 'Sincronizar eventos com Supabase'
              }
            >
              <RotateCw
                className={`w-3.5 h-3.5 ${
                  isSyncing ? 'animate-spin text-blue-400' : 'text-emerald-400'
                }`}
              />
              <span className="hidden md:inline text-[11px] font-mono text-slate-300">
                {isSyncing
                  ? 'Sincronizando...'
                  : lastSyncTime
                  ? `Sinc: ${lastSyncTime.toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}`
                  : 'Atualizar'}
              </span>
            </button>
          )}

          <button
            onClick={onOpenAdmin}
            className="flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs sm:text-sm font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
            title="Acessar Painel de Administração"
          >
            <Settings className="w-4 h-4 text-blue-400 shrink-0" />
            <span>Admin</span>
          </button>
        </div>
      </div>
    </header>
  );
};
