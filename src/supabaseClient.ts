import { createClient } from '@supabase/supabase-js';
import { Database } from './types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL and Anon Key must be defined in .env file");
}

// Configuración de opciones para el cliente Supabase
const options = {
  auth: {
    autoRefreshToken: true,
    persistSession: true
  },
  realtime: {
    // Estas opciones ayudan a hacer la conexión más resistente
    params: {
      eventsPerSecond: 2 // Reducir de 10 (default) a 2 para evitar throttling
    },
    timeout: 30000, // Aumentar timeout a 30 segundos
    heartbeatIntervalMs: 6000 // Intervalo de heartbeat más corto
  },
  global: {
    // Opciones de fetch para tiempo de espera y reintentos
    fetch: (input: RequestInfo | URL, init?: RequestInit) => {
      return fetch(input, {
        ...init,
        // Opciones más tolerantes para entornos con conexiones variables
        signal: AbortSignal.timeout(15000) // 15 segundos de timeout
      });
    }
  }
};

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, options); 