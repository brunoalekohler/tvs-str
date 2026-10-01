import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { EventItem } from '../types';

const STORAGE_KEY_CONFIG = 'corporative_supabase_config';
const STORAGE_KEY_FALLBACK = 'corporative_local_events';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export function getSavedSupabaseConfig(): SupabaseConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.warn('Error reading supabase config from storage', e);
  }
  return {
    url: (import.meta.env.VITE_SUPABASE_URL as string) || '',
    anonKey: (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '',
  };
}

export function saveSupabaseConfig(config: SupabaseConfig): void {
  localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
  clientInstance = null; // force re-instantiation
}

let clientInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (clientInstance) return clientInstance;
  const config = getSavedSupabaseConfig();
  if (config.url && config.anonKey) {
    try {
      clientInstance = createClient(config.url, config.anonKey);
      return clientInstance;
    } catch (e) {
      console.error('Failed to create Supabase client:', e);
      return null;
    }
  }
  return null;
}

export function isSupabaseConfigured(): boolean {
  const config = getSavedSupabaseConfig();
  return Boolean(config.url && config.anonKey);
}

export async function testSupabaseConnection(): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'URL ou Chave Anon não configuradas.' };
  }
  try {
    const { error } = await client.from('events').select('id').limit(1);
    if (error) {
      // If table does not exist, hint user
      if (error.code === '42P01' || error.message.includes('relation "events" does not exist') || error.message.includes('does not exist')) {
        return {
          success: false,
          message: 'Conectado com sucesso, mas a tabela "events" ainda não foi criada. Crie-a no Supabase SQL Editor.',
        };
      }
      return { success: false, message: `Erro Supabase: ${error.message}` };
    }
    return { success: true, message: 'Conectado com sucesso ao Supabase!' };
  } catch (e: unknown) {
    const err = e as Error;
    return { success: false, message: `Falha na conexão: ${err?.message || 'Erro de rede'}` };
  }
}

// Fallback Local Storage functions
export function getLocalEvents(): EventItem[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY_FALLBACK);
    if (data) {
      const parsed: EventItem[] = JSON.parse(data);
      // Ensure no imaginary demo events linger in cache
      const clean = Array.isArray(parsed) ? parsed.filter((e) => !e.id.startsWith('demo_')) : [];
      if (clean.length !== parsed.length) {
        saveLocalEvents(clean);
      }
      return clean;
    }
  } catch {}
  return [];
}

export function saveLocalEvents(events: EventItem[]): void {
  localStorage.setItem(STORAGE_KEY_FALLBACK, JSON.stringify(events));
}

// Map database row to EventItem
interface EventRow {
  id: string;
  title: string;
  location: string;
  employees: string[] | string;
  date: string;
  start_time?: string;
  startTime?: string;
  end_time?: string;
  endTime?: string;
  category?: string;
  color?: string;
  created_at?: string;
}

function mapRowToEvent(row: EventRow): EventItem {
  let empList: string[] = [];
  if (Array.isArray(row.employees)) {
    empList = row.employees;
  } else if (typeof row.employees === 'string') {
    try {
      const parsed = JSON.parse(row.employees);
      empList = Array.isArray(parsed) ? parsed : [row.employees];
    } catch {
      empList = row.employees.split(',').map((s) => s.trim()).filter(Boolean);
    }
  }

  // Handle both start_time and startTime
  const rawStartTime = row.start_time || row.startTime || '08:00';
  const rawEndTime = row.end_time || row.endTime || '09:00';

  // Normalize HH:mm format
  const normalizeTime = (t: string) => {
    if (!t) return '00:00';
    return t.substring(0, 5);
  };

  return {
    id: String(row.id),
    title: row.title || 'Sem título',
    location: row.location || 'Não especificado',
    employees: empList,
    date: row.date,
    startTime: normalizeTime(rawStartTime),
    endTime: normalizeTime(rawEndTime),
    category: row.category || 'Geral',
    color: row.color || '#2563eb',
    createdAt: row.created_at,
  };
}

// Fetch all events from Supabase or Fallback
export async function fetchEvents(): Promise<EventItem[]> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('events')
        .select('*')
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) {
        console.warn('Supabase fetch error, using local fallback:', error.message);
        return getLocalEvents();
      }

      if (data) {
        const events = data.map(mapRowToEvent);
        // Cache to local
        saveLocalEvents(events);
        return events;
      }
    } catch (err) {
      console.warn('Failed to query Supabase, using local fallback:', err);
      return getLocalEvents();
    }
  }

  return getLocalEvents();
}

// Create Event
export async function createEvent(eventData: Omit<EventItem, 'id'>): Promise<EventItem> {
  const client = getSupabaseClient();
  const id = 'evt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

  const newEvent: EventItem = {
    ...eventData,
    id,
  };

  if (client) {
    try {
      const { data, error } = await client
        .from('events')
        .insert([
          {
            title: eventData.title,
            location: eventData.location,
            employees: eventData.employees,
            date: eventData.date,
            start_time: eventData.startTime,
            end_time: eventData.endTime,
            category: eventData.category || 'Geral',
            color: eventData.color || '#2563eb',
          },
        ])
        .select();

      if (!error && data && data.length > 0) {
        return mapRowToEvent(data[0]);
      } else if (error) {
        console.error('Error inserting into Supabase:', error);
      }
    } catch (e) {
      console.error('Supabase insert exception:', e);
    }
  }

  // Local fallback save
  const current = getLocalEvents();
  const updated = [...current, newEvent];
  saveLocalEvents(updated);
  return newEvent;
}

// Delete Event from Supabase (Required: "após o evento acontecer ele deve sumir do supabase")
export async function deleteEvent(id: string): Promise<boolean> {
  const client = getSupabaseClient();

  if (client) {
    try {
      const { error } = await client.from('events').delete().eq('id', id);
      if (error) {
        console.error('Error deleting from Supabase:', error);
      }
    } catch (e) {
      console.error('Supabase delete exception:', e);
    }
  }

  // Also remove from local storage
  const current = getLocalEvents();
  const filtered = current.filter((e) => e.id !== id);
  saveLocalEvents(filtered);
  return true;
}

/**
 * Subscribes to realtime changes on the 'events' table
 * Returns an unsubscribe callback
 */
export function subscribeToEventsChanges(onChange: () => void): () => void {
  const client = getSupabaseClient();
  if (!client) return () => {};

  try {
    const channel = client
      .channel('realtime:events-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events' },
        () => {
          onChange();
        }
      )
      .subscribe();

    return () => {
      try {
        client.removeChannel(channel);
      } catch {}
    };
  } catch (err) {
    console.warn('Realtime subscription error:', err);
    return () => {};
  }
}

export const SUPABASE_SETUP_SQL = `-- Execute este script no SQL Editor do seu projeto Supabase:
CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  location TEXT NOT NULL,
  employees TEXT[] NOT NULL DEFAULT '{}',
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  category TEXT DEFAULT 'Operacional',
  color TEXT DEFAULT '#2563eb',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS (Row Level Security) e permitir acesso anônimo para o painel de exibição
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso total aos eventos"
  ON events
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
`;
