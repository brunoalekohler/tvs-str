import React from 'react';
import { MapPin, Users, Clock, Calendar } from 'lucide-react';
import { EventItem } from '../types';

interface WeeklyScheduleViewProps {
  events: EventItem[];
  currentPage?: number;
  totalPages?: number;
  pageSize?: number;
}

export const WeeklyScheduleView: React.FC<WeeklyScheduleViewProps> = ({
  events,
  currentPage = 0,
  totalPages = 1,
  pageSize = 4,
}) => {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // Helper to format date label
  const getEventDateBadge = (dateStr: string) => {
    if (dateStr === todayStr) {
      return 'HOJE';
    }
    const [year, month, day] = dateStr.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const dayOfWeek = dateObj
      .toLocaleDateString('pt-BR', { weekday: 'short' })
      .replace('.', '')
      .toUpperCase();
    return `${dayOfWeek} • ${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`;
  };

  // Sort events chronologically (today and upcoming first)
  const sortedEvents = [...events].sort((a, b) => {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    return a.startTime.localeCompare(b.startTime);
  });

  // Paginated slice for the current part/page
  const startIndex = currentPage * pageSize;
  const pageEvents = sortedEvents.slice(startIndex, startIndex + pageSize);

  return (
    <div className="flex-1 flex flex-col p-3 sm:p-5 lg:p-6 w-full max-w-7xl mx-auto select-none overflow-y-auto justify-between">
      {/* Top pagination indicator if multiple parts exist */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2 pb-2 shrink-0">
          <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-400">
            Agenda Semanal da Fábrica
          </span>
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3.5 py-1 rounded-full shadow-inner">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-xs sm:text-sm font-mono font-bold text-blue-400">
              Parte {currentPage + 1} de {totalPages}
            </span>
          </div>
        </div>
      )}

      {/* Main Events Container */}
      {sortedEvents.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 max-w-2xl mx-auto">
          <div className="w-20 h-20 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 mb-6 shadow-xl">
            <Calendar className="w-10 h-10 text-slate-500" />
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-200 uppercase tracking-tight">
            Nenhum evento agendado para esta semana
          </h2>
        </div>
      ) : (
        <div
          className={`flex-1 grid gap-4 sm:gap-5 w-full items-stretch py-1 ${
            pageEvents.length === 1
              ? 'grid-cols-1 max-w-3xl mx-auto'
              : 'grid-cols-1 md:grid-cols-2'
          }`}
        >
          {pageEvents.map((event) => {
            const dateBadge = getEventDateBadge(event.date);
            const isToday = event.date === todayStr;

            return (
              <div
                key={event.id}
                className="bg-slate-900/95 border-2 border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5 lg:p-6 shadow-xl flex flex-col justify-between relative overflow-hidden transition-all"
              >
                {/* Accent colored vertical stripe */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-2.5 sm:w-3"
                  style={{ backgroundColor: event.color || '#2563eb' }}
                />

                {/* Header: Date, Category and Time */}
                <div className="pl-2">
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-2.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs sm:text-sm md:text-base font-black px-3 py-1 rounded-xl uppercase tracking-wider shadow-sm ${
                          isToday
                            ? 'bg-emerald-500 text-slate-950 font-black'
                            : 'bg-blue-600 text-white'
                        }`}
                      >
                        {dateBadge}
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-wider">
                        {event.category || 'Atividade'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-base sm:text-lg md:text-xl font-mono font-black text-white bg-slate-950 px-3.5 py-1 rounded-xl border border-slate-800 shadow-inner">
                      <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400 shrink-0" />
                      <span>
                        {event.startTime} - {event.endTime}
                      </span>
                    </div>
                  </div>

                  {/* Title - Large and bold, wraps naturally without truncation */}
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight leading-snug mb-3 mt-1">
                    {event.title}
                  </h3>
                </div>

                {/* Details: Location and Employees with generous height and wrap */}
                <div className="pl-2 pt-3 border-t border-slate-800/90 flex flex-col gap-2.5">
                  {/* Location */}
                  <div className="flex items-center gap-2.5 text-sm sm:text-base md:text-lg">
                    <MapPin className="w-5 h-5 text-rose-400 shrink-0" />
                    <span className="text-slate-400 font-semibold">Local:</span>
                    <span className="text-white font-bold">{event.location}</span>
                  </div>

                  {/* Employees */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 text-sm sm:text-base text-slate-400 font-semibold">
                      <Users className="w-5 h-5 text-emerald-400 shrink-0" />
                      <span>Equipe Escalada:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pl-7">
                      {event.employees.map((emp, idx) => (
                        <span
                          key={idx}
                          className="bg-emerald-950/70 border border-emerald-500/30 text-emerald-300 font-bold px-2.5 py-0.5 rounded-lg text-xs sm:text-sm md:text-base shadow-sm"
                        >
                          {emp}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
