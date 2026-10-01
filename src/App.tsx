import { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Header } from './components/Header';
import { ClockView } from './components/ClockView';
import { WeeklyScheduleView } from './components/WeeklyScheduleView';
import { EventAlertModal } from './components/EventAlertModal';
import { ShiftAlertModal } from './components/ShiftAlertModal';
import { AdminPanel } from './components/AdminPanel';
import { FullscreenVideoView } from './components/FullscreenVideoView';
import { EventItem, CompanyConfig, DisplayMode, ShiftDefinition, AutoRefreshConfig, CycleConfig } from './types';
import {
  fetchEvents,
  deleteEvent,
  saveLocalEvents,
  getLocalEvents,
  subscribeToEventsChanges,
} from './services/supabase';
import { INITIAL_SHIFTS } from './data/initialEvents';
import { unlockAudio } from './utils/sound';
import { storeVideoFile, getStoredVideo, removeStoredVideo } from './utils/videoStorage';

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

  // 3. Cycle Configuration: 5 min Agenda <-> 16:59 min Video
  const [cycleConfig, setCycleConfig] = useState<CycleConfig>(() => {
    try {
      const saved = localStorage.getItem('corporative_cycle_config');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      agendaMinutes: 5,
      agendaSeconds: 0,
      videoMinutes: 16,
      videoSeconds: 59,
      videoUrl: '/video.mp4',
      videoName: 'video.mp4',
      videoFit: 'cover',
      videoMuted: true,
    };
  });

  const handleUpdateCycleConfig = (newConfig: CycleConfig) => {
    setCycleConfig(newConfig);
    localStorage.setItem('corporative_cycle_config', JSON.stringify(newConfig));
  };

  const totalAgendaSec = Math.max(10, (cycleConfig.agendaMinutes * 60) + cycleConfig.agendaSeconds);
  const totalVideoSec = Math.max(10, (cycleConfig.videoMinutes * 60) + cycleConfig.videoSeconds);

  // Active mode: starts with 'calendar' (Agenda Semanal)
  const [mode, setMode] = useState<DisplayMode>('calendar');
  const [remainingModeSeconds, setRemainingModeSeconds] = useState<number>(totalAgendaSec);
  const [activeVideoUrl, setActiveVideoUrl] = useState<string>(cycleConfig.videoUrl || '/video.mp4');
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

  // Load user-saved video from IndexedDB on startup if available, otherwise default to public/video.mp4
  useEffect(() => {
    getStoredVideo().then((stored) => {
      if (stored && stored.url) {
        setActiveVideoUrl(stored.url);
        if (stored.name) {
          setCycleConfig((prev) => ({ ...prev, videoName: stored.name, videoUrl: stored.url }));
        }
      } else {
        setActiveVideoUrl('/video.mp4');
      }
    });
  }, []);

  const handleUploadVideoFile = async (file: File) => {
    await storeVideoFile(file, file.name);
    const newUrl = URL.createObjectURL(file);
    setActiveVideoUrl(newUrl);
    const updated: CycleConfig = {
      ...cycleConfig,
      videoName: file.name,
      videoUrl: newUrl,
    };
    handleUpdateCycleConfig(updated);
  };

  const handleResetVideoToDefault = async () => {
    await removeStoredVideo();
    setActiveVideoUrl('/video.mp4');
    const updated: CycleConfig = {
      ...cycleConfig,
      videoName: 'video.mp4',
      videoUrl: '/video.mp4',
    };
    handleUpdateCycleConfig(updated);
  };

  const handleSwitchMode = (newMode: DisplayMode) => {
    if (!audioUnlocked) handleAudioUnlock();
    setMode(newMode);
    if (newMode === 'video') {
      setRemainingModeSeconds(totalVideoSec);
    } else {
      setCalendarPage(0);
      setRemainingModeSeconds(totalAgendaSec);
    }
  };

  // Precise timing cycle: 5 minutes of Agenda <-> 16:59 of Video
  useEffect(() => {
    const cycleInterval = setInterval(() => {
      // Pause countdown if an emergency or scheduled alert is currently showing
      if (activeEventAlert || activeShiftAlert) return;

      setRemainingModeSeconds((prev) => {
        if (prev <= 1) {
          // Switch between calendar and video
          if (mode === 'calendar') {
            setMode('video');
            return totalVideoSec;
          } else {
            setMode('calendar');
            setCalendarPage(0);
            return totalAgendaSec;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(cycleInterval);
  }, [mode, totalAgendaSec, totalVideoSec, activeEventAlert, activeShiftAlert]);

  // Rotate pages within calendar mode if totalPages > 1 during the 5-minute window
  useEffect(() => {
    if (mode !== 'calendar' || totalPages <= 1) return;
    const pageInterval = setInterval(() => {
      setCalendarPage((prev) => (prev + 1) % totalPages);
    }, 20000); // 20s per page
    return () => clearInterval(pageInterval);
  }, [mode, totalPages]);

  // Manual advance helper (Click or Keyboard)
  const handleManualAdvance = () => {
    if (!audioUnlocked) handleAudioUnlock();
    if (mode === 'calendar') {
      if (calendarPage + 1 < totalPages) {
        setCalendarPage((prev) => prev + 1);
      } else {
        handleSwitchMode('video');
      }
    } else {
      handleSwitchMode('calendar');
    }
  };

  // Keyboard navigation support (Spacebar or Arrow keys to quickly advance, 'a' for admin)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'a' || e.key === 'A') {
        if (!isAdminOpen) {
          setIsAdminOpen(true);
        }
      } else if (e.code === 'Space' || e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        if (!isAdminOpen) {
          handleManualAdvance();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAdminOpen, mode, calendarPage, totalPages]);

  // 4. Audio Unlock State
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  const handleAudioUnlock = () => {
    const success = unlockAudio();
    if (success) {
      setAudioUnlocked(true);
    }
  };

  // 5. Admin Panel Detection (via /admin in URL)
  const checkAdminRoute = useCallback(() => {
    const pathname = window.location.pathname;
    const hash = window.location.hash;
    if (pathname === '/admin' || hash === '#admin' || hash === '#/admin') {
      setIsAdminOpen(true);
    } else {
      setIsAdminOpen(false);
    }
  }, []);

  useEffect(() => {
    checkAdminRoute();
    window.addEventListener('popstate', checkAdminRoute);
    window.addEventListener('hashchange', checkAdminRoute);
    return () => {
      window.removeEventListener('popstate', checkAdminRoute);
      window.removeEventListener('hashchange', checkAdminRoute);
    };
  }, [checkAdminRoute]);

  const openAdmin = () => {
    setIsAdminOpen(true);
    try {
      window.history.pushState(null, '', '/admin');
    } catch {
      window.location.hash = '#admin';
    }
  };

  const closeAdmin = () => {
    setIsAdminOpen(false);
    try {
      window.history.pushState(null, '', '/');
    } catch {
      window.location.hash = '';
    }
  };

  // 6. Real-time Event Monitor & Fullscreen 1-Minute Alert
  const alertedEventIdsRef = useRef<Set<string>>(new Set());

  // Check event triggers every 2 seconds
  useEffect(() => {
    const checkEventsInterval = setInterval(() => {
      const now = new Date();
      const todayYMD = now.toISOString().split('T')[0];
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHours}:${currentMinutes}`;

      events.forEach((event) => {
        // Trigger if date matches today and startTime matches current time
        const eventKey = `${event.id}_${todayYMD}_${event.startTime}`;
        if (
          event.date === todayYMD &&
          event.startTime === currentTimeStr &&
          !alertedEventIdsRef.current.has(eventKey)
        ) {
          alertedEventIdsRef.current.add(eventKey);
          setActiveEventAlert(event);
        }
      });
    }, 2000);

    return () => clearInterval(checkEventsInterval);
  }, [events]);

  // Handle Event Alert Dismissal / Completion
  // Requirement: "após o evento acontecer ele deve sumir do supabase"
  const handleDismissEventAlert = async () => {
    if (activeEventAlert) {
      const idToDelete = activeEventAlert.id;
      setActiveEventAlert(null);
      // Remove from Supabase and local cache
      try {
        await deleteEvent(idToDelete);
        setEvents((prev) => prev.filter((e) => e.id !== idToDelete));
      } catch (err) {
        console.error('Failed to remove event after occurrence:', err);
      }
    }
  };

  // 7. Shift Start Monitor (05:00, 13:30, 22:00)
  const alertedShiftsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const checkShiftsInterval = setInterval(() => {
      const now = new Date();
      const todayYMD = now.toISOString().split('T')[0];
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHours}:${currentMinutes}`;

      INITIAL_SHIFTS.forEach((shift) => {
        const shiftKey = `${shift.startTime}_${todayYMD}`;
        if (shift.startTime === currentTimeStr && !alertedShiftsRef.current.has(shiftKey)) {
          alertedShiftsRef.current.add(shiftKey);
          setActiveShiftAlert(shift);
        }
      });
    }, 2000);

    return () => clearInterval(checkShiftsInterval);
  }, []);

  // 8. Countdown Timer for Automatic Page Reload (with alert protection)
  useEffect(() => {
    if (!refreshConfig.autoReloadMinutes || refreshConfig.autoReloadMinutes <= 0) {
      setSecondsUntilReload(null);
      return;
    }

    setSecondsUntilReload(refreshConfig.autoReloadMinutes * 60);

    const countdownTimer = setInterval(() => {
      setSecondsUntilReload((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          // If modal is currently showing, postpone reload by 60s
          if (activeEventAlert || activeShiftAlert) {
            return 60;
          }
          window.location.reload();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownTimer);
  }, [refreshConfig.autoReloadMinutes, activeEventAlert, activeShiftAlert]);

  return (
    <div
      onClick={() => {
        if (!audioUnlocked) handleAudioUnlock();
      }}
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-hidden relative"
    >
      {/* Main Corporate Header (Hidden during Video mode for 100% full screen video without exceptions) */}
      {mode !== 'video' && (
        <Header
          company={company}
          onOpenAdmin={() => setIsAdminOpen(true)}
          onManualRefresh={() => loadEvents()}
          isSyncing={isSyncing}
          lastSyncTime={lastSyncTime}
          secondsUntilReload={secondsUntilReload}
          currentMode={mode}
          remainingModeSeconds={remainingModeSeconds}
          onToggleMode={() => handleSwitchMode(mode === 'video' ? 'calendar' : 'video')}
        />
      )}

      {/* Dynamic Display Area: Agenda Semanal (5 min) <-> Vídeo Tela Cheia (16:59 min) */}
      <main
        onClick={handleManualAdvance}
        className={`flex-1 flex flex-col relative overflow-hidden cursor-pointer ${
          mode === 'video' ? 'fixed inset-0 w-screen h-screen z-10 p-0 m-0 bg-black' : ''
        }`}
        title="Clique para alternar manualmente entre Agenda e Vídeo"
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {mode === 'video' ? (
            <motion.div
              key="fullscreen-video-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 w-screen h-screen z-10 bg-black flex items-center justify-center overflow-hidden"
            >
              <FullscreenVideoView
                videoUrl={activeVideoUrl || '/video.mp4'}
                audioUnlocked={audioUnlocked}
                onAudioUnlock={handleAudioUnlock}
              />
            </motion.div>
          ) : mode === 'clock' ? (
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
          cycleConfig={cycleConfig}
          onUpdateCycleConfig={handleUpdateCycleConfig}
          onUploadVideoFile={handleUploadVideoFile}
          onResetVideoToDefault={handleResetVideoToDefault}
          onSwitchMode={handleSwitchMode}
          currentMode={mode}
          remainingModeSeconds={remainingModeSeconds}
        />
      )}
    </div>
  );
}
