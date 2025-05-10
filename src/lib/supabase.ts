import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Verificar que las variables de entorno están definidas correctamente
if (!supabaseUrl || supabaseUrl === 'undefined') {
  console.error('VITE_SUPABASE_URL no está definida correctamente en las variables de entorno.');
}

if (!supabaseAnonKey || supabaseAnonKey === 'undefined') {
  console.error('VITE_SUPABASE_ANON_KEY no está definida correctamente en las variables de entorno.');
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
    fetch: (url: string, options: RequestInit) => {
      return fetch(url, {
        ...options,
        // Opciones más tolerantes para entornos con conexiones variables
        signal: AbortSignal.timeout(15000) // 15 segundos de timeout
      });
    }
  }
};

// Crear el cliente Supabase con las opciones configuradas
export const supabase = createClient(supabaseUrl, supabaseAnonKey, options);

// Manejador para reintentar conexiones WebSocket fallidas
supabase.realtime.setAuth = ((originalSetAuth) => {
  return (...args) => {
    console.info('Realizando conexión a Supabase Realtime...');
    try {
      return originalSetAuth.apply(supabase.realtime, args);
    } catch (error) {
      console.error('Error al establecer autenticación Realtime Supabase:', error);
      // En producción, podrías implementar reintentos con back-off exponencial aquí
      return null;
    }
  };
})(supabase.realtime.setAuth);

// Exportar también funciones de utilidad
export const getSupabaseStatus = () => {
  return {
    url: supabaseUrl ? '✅ Configurada' : '❌ No configurada',
    key: supabaseAnonKey ? '✅ Configurada' : '❌ No configurada',
    // Intentar detectar si realtime está disponible
    realtimeEnabled: !!supabase.realtime
  };
};