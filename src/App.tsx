import { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Header } from './components/Header';
import { ClockView } from './components/ClockView';
import { WeeklyScheduleView } from './components/WeeklyScheduleView';
import { EventAlertModal } from './components/EventAlertModal';
import { ShiftAlertModal } from './components/ShiftAlertModal';
import { AdminPanel } from './components/AdminPanel';
import { EventItem, CompanyConfig, DisplayMode, ShiftDefinition, AutoRefreshConfig } from './types';
import {
  fetchEvents,
  deleteEvent,
  saveLocalEvents,
  getLocalEvents,
  subscribeToEventsChanges,
} from './services/supabase';
import { INITIAL_SHIFTS } from './data/initialEvents';
import { unlockAudio } from './utils/sound';

const COMPANY_NAME = 'SANTA ROSA MALHAS';

export default function App() {
  // 1. Company Information State
  const [company, setCompany] = useState<CompanyConfig>(() => {
    try {
      const saved = localStorage.getItem('corporative_company_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          name: COMPANY_NAME,
          logoUrl: parsed.logoUrl || '/logo.png',
          subtitle: parsed.subtitle || '',
          department: parsed.department || '',
        };
      }
    } catch {}
    return {
      name: COMPANY_NAME,
      logoUrl: '/logo.png',
      subtitle: '',
      department: '',
    };
  });

  const handleUpdateCompany = (newConfig: CompanyConfig) => {
    const enforcedConfig = { ...newConfig, name: COMPANY_NAME };
    setCompany(enforcedConfig);
    localStorage.setItem('corporative_company_config', JSON.stringify(enforcedConfig));
  };

  // 2. Refresh & Auto-Reload Configuration
  const [refreshConfig, setRefreshConfig] = useState<AutoRefreshConfig>(() => {
    try {
      const saved = localStorage.getItem('corporative_refresh_config');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      syncIntervalSeconds: 20, // 20s background sync
      autoReloadMinutes: 30,   // 30m hard reload for TVs/kiosks
      realtimeEnabled: true,
    };
  });

  const handleUpdateRefreshConfig = (newConfig: AutoRefreshConfig) => {
    setRefreshConfig(newConfig);
    localStorage.setItem('corporative_refresh_config', JSON.stringify(newConfig));
  };

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(new Date());
  const [secondsUntilReload, setSecondsUntilReload] = useState<number | null>(() => {
    return refreshConfig.autoReloadMinutes > 0 ? refreshConfig.autoReloadMinutes * 60 : null;
  });

  // 3. Events State
  const [events, setEvents] = useState<EventItem[]>([]);

  // Load events - strictly respects real database events and NEVER creates imaginary mock events
  const loadEvents = useCallback(async () => {
    setIsSyncing(true);
    try {
      const data = await fetchEvents();
      // If data is returned (even an empty list []), respect it!
      setEvents(data || []);
      setLastSyncTime(new Date());
    } catch (e) {
      console.warn('Error fetching events, using fallback:', e);
      const fallback = getLocalEvents();
      setEvents(fallback || []);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Periodic refresh from Supabase
  useEffect(() => {
    loadEvents();
    const intervalSec = Math.max(5, refreshConfig.syncIntervalSeconds || 20);
    const refreshInterval = setInterval(loadEvents, intervalSec * 1000);
    return () => clearInterval(refreshInterval);
  }, [loadEvents, refreshConfig.syncIntervalSeconds]);

  // Realtime subscription from Supabase
  useEffect(() => {
    if (!refreshConfig.realtimeEnabled) return;
    const unsubscribe = subscribeToEventsChanges(() => {
      loadEvents();
    });
    return () => unsubscribe();
  }, [loadEvents, refreshConfig.realtimeEnabled]);

  // 4. Calendar View Mode & Pagination
  const [mode, setMode] = useState<DisplayMode>('calendar');
  const [calendarPage, setCalendarPage] = useState<number>(0);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [activeEventAlert, setActiveEventAlert] = useState<EventItem | null>(null);
  const [activeShiftAlert, setActiveShiftAlert] = useState<ShiftDefinition | null>(null);

  const pageSize = 4;
  const totalPages = Math.max(1, Math.ceil(events.length / pageSize));

  // Reset page if events change
  useEffect(() => {
    if (calendarPage >= totalPages) {
      setCalendarPage(0);
    }
  }, [events.length, totalPages, calendarPage]);

  // Rotate pages within calendar mode if totalPages > 1 every 20 seconds
  useEffect(() => {
    if (totalPages <= 1) return;
    const pageInterval = setInterval(() => {
      setCalendarPage((prev) => (prev + 1) % totalPages);
    }, 20000); // 20s per page
    return () => clearInterval(pageInterval);
  }, [totalPages]);

  // Manual advance helper (Click or Keyboard)
  const handleManualAdvance = () => {
    if (!audioUnlocked) handleAudioUnlock();
    setCalendarPage((prev) => (prev + 1) % totalPages);
  };

  // Keyboard navigation support (Spacebar or Arrow keys to turn page, A for admin)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'a' || e.key === 'A') {
        if (!isAdminOpen) {
          setIsAdminOpen(true);
        }
      } else if (e.code === 'Space' || e.key === 'ArrowRight') {
        if (!isAdminOpen) {
          setCalendarPage((prev) => (prev + 1) % totalPages);
        }
      } else if (e.key === 'ArrowLeft') {
        if (!isAdminOpen) {
          setCalendarPage((prev) => (prev - 1 + totalPages) % totalPages);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAdminOpen, totalPages]);

  // 5. Audio Unlock State
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  const handleAudioUnlock = () => {
    const success = unlockAudio();
    if (success) {
      setAudioUnlocked(true);
    }
  };

  // 6. Real-time Event Monitor (Triggers exact event alert modal at start time)
  const alertedEventIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const checkUpcomingEvents = () => {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
      const currentDay = String(now.getDate()).padStart(2, '0');
      const todayYMD = `${currentYear}-${currentMonth}-${currentDay}`;
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentTimeHM = `${currentHours}:${currentMinutes}`;

      events.forEach((event) => {
        if (event.date === todayYMD && event.startTime === currentTimeHM) {
          const alertKey = `${event.id}-${todayYMD}-${currentTimeHM}`;
          if (!alertedEventIdsRef.current.has(alertKey)) {
            alertedEventIdsRef.current.add(alertKey);
            setActiveEventAlert(event);
          }
        }
      });
    };

    const intervalId = setInterval(checkUpcomingEvents, 1000);
    return () => clearInterval(intervalId);
  }, [events]);

  const handleDismissEventAlert = async () => {
    if (activeEventAlert) {
      try {
        await deleteEvent(activeEventAlert.id);
        setEvents((prev) => prev.filter((ev) => ev.id !== activeEventAlert.id));
        saveLocalEvents(events.filter((ev) => ev.id !== activeEventAlert.id));
      } catch (err) {
        console.error('Error auto-removing expired event:', err);
      }
    }
    setActiveEventAlert(null);
  };

  // 7. Shift Change Announcements: 05:00 (1º Turno), 13:30 (2º Turno), 22:00 (3º Turno)
  const lastAlertedShiftRef = useRef<string>('');

  useEffect(() => {
    const checkShiftTimes = () => {
      const now = new Date();
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentTimeHM = `${currentHours}:${currentMinutes}`;

      const matchedShift = INITIAL_SHIFTS.find((s) => s.startTime === currentTimeHM);
      if (matchedShift) {
        const todayDate = now.toDateString();
        const shiftAlertKey = `${todayDate}-${matchedShift.id}`;

        if (lastAlertedShiftRef.current !== shiftAlertKey) {
          lastAlertedShiftRef.current = shiftAlertKey;
          setActiveShiftAlert(matchedShift);
        }
      }
    };

    const shiftCheckInterval = setInterval(checkShiftTimes, 1000);
    return () => clearInterval(shiftCheckInterval);
  }, []);

  // 8. Auto-Reload Countdown for Display Kiosks / Industrial TVs
  useEffect(() => {
    if (refreshConfig.autoReloadMinutes <= 0) {
      setSecondsUntilReload(null);
      return;
    }

    setSecondsUntilReload(refreshConfig.autoReloadMinutes * 60);

    const countdownTimer = setInterval(() => {
      // Don't interrupt while an alert modal is open
      if (activeEventAlert || activeShiftAlert) return;

      setSecondsUntilReload((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          window.location.reload();
          return refreshConfig.autoReloadMinutes * 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownTimer);
  }, [refreshConfig.autoReloadMinutes, activeEventAlert, activeShiftAlert]);

  // Support URL routing for /admin
  useEffect(() => {
    const checkPath = () => {
      if (
        window.location.pathname === '/admin' ||
        window.location.hash === '#admin' ||
        window.location.search.includes('admin')
      ) {
        setIsAdminOpen(true);
      }
    };
    checkPath();
    window.addEventListener('popstate', checkPath);
    return () => window.removeEventListener('popstate', checkPath);
  }, []);

  const closeAdmin = () => {
    setIsAdminOpen(false);
    if (window.location.pathname === '/admin') {
      window.history.pushState({}, '', '/');
    }
  };

  return (
    <div
      onClick={() => {
        if (!audioUnlocked) handleAudioUnlock();
      }}
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-hidden relative"
    >
      {/* Main Corporate Header: SANTA ROSA MALHAS */}
      <Header
        company={company}
        onOpenAdmin={() => setIsAdminOpen(true)}
        onManualRefresh={() => loadEvents()}
        isSyncing={isSyncing}
        lastSyncTime={lastSyncTime}
        secondsUntilReload={secondsUntilReload}
      />

      {/* Dynamic Display Area: Agenda Semanal */}
      <main
        onClick={handleManualAdvance}
        className="flex-1 flex flex-col relative overflow-hidden cursor-pointer"
        title="Clique para alternar página de eventos"
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {mode === 'clock' ? (
            <motion.div
              key="clock-view"
              initial={{ opacity: 0, scale: 0.99 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.99 }}
              transition={{ duration: 0.4 }}
              className="flex-1 flex flex-col items-center justify-center w-full"
            >
              <ClockView />
            </motion.div>
          ) : (
            <motion.div
              key={`calendar-view-${calendarPage}`}
              initial={{ opacity: 0, scale: 0.99 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.99 }}
              transition={{ duration: 0.4 }}
              className="flex-1 flex flex-col items-center justify-center w-full"
            >
              <WeeklyScheduleView
                events={events}
                currentPage={calendarPage}
                totalPages={totalPages}
                pageSize={pageSize}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Fullscreen Event Alert Modal (1 Minute + Loud Alarm Sound) */}
      {activeEventAlert && (
        <EventAlertModal
          event={activeEventAlert}
          onDismiss={handleDismissEventAlert}
          audioUnlocked={audioUnlocked}
        />
      )}

      {/* Shift Change Alert Modal (05:00, 13:30, 22:00) */}
      {activeShiftAlert && (
        <ShiftAlertModal
          shift={activeShiftAlert}
          onDismiss={() => setActiveShiftAlert(null)}
          audioUnlocked={audioUnlocked}
        />
      )}

      {/* Protected Admin Panel (/admin) with Password 1989 */}
      {isAdminOpen && (
        <AdminPanel
          events={events}
          company={company}
          onUpdateCompany={handleUpdateCompany}
          onRefreshEvents={loadEvents}
          onCloseAdmin={closeAdmin}
          onTriggerTestEventAlert={(testEvent) => {
            setActiveEventAlert(testEvent);
          }}
          onTriggerTestShiftAlert={(shiftIndex) => {
            setActiveShiftAlert(INITIAL_SHIFTS[shiftIndex]);
          }}
          refreshConfig={refreshConfig}
          onUpdateRefreshConfig={handleUpdateRefreshConfig}
          secondsUntilReload={secondsUntilReload}
          lastSyncTime={lastSyncTime}
          isSyncing={isSyncing}
        />
      )}
    </div>
  );
}
