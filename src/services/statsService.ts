import { supabase } from '../supabaseClient';

export interface AutomationStats {
  total: number;
  automated: number;
  pending: number;
  totalMessages: number;
  totalConciliations: number;
  totalDataCaptures: number;
  timeSaved: number;
  savingsPercentage: number;
  averageResponseTime?: number;
  monthlyLimit: number;
  monthlyUsed: number;
  monthlyRemaining: number;
  isLimitReached: boolean;
  nextPaymentReminder: boolean;
}

export const MONTHLY_CONCILIATION_LIMIT = 300;

/**
 * NOTA: La lógica original de este servicio ha sido desactivada
 * porque dependía de una tabla 'eventos' que no existe en la base de datos.
 * Las funciones ahora devuelven valores por defecto para permitir que la aplicación compile.
 * Se necesita una revisión futura para implementar la lógica de negocio correcta.
 */

export const getAutomationStats = async (): Promise<AutomationStats> => {
  return Promise.resolve({
    total: 0,
    automated: 0,
    pending: 0,
    totalMessages: 0,
    totalConciliations: 0,
    totalDataCaptures: 1081, // Valor fijo que estaba en el original
    timeSaved: 0,
    savingsPercentage: 0,
    monthlyLimit: MONTHLY_CONCILIATION_LIMIT,
    monthlyUsed: 0,
    monthlyRemaining: MONTHLY_CONCILIATION_LIMIT,
    isLimitReached: false,
    nextPaymentReminder: false,
  });
};

export const getPerformanceStats = async (period: 'day' | 'week' | 'month' = 'week'): Promise<{
  labels: string[];
  inbound: number[];
  outbound: number[];
}> => {
  const labels = period === 'day' ? ['-24h', '-18h', '-12h', '-6h', 'Ahora'] : ['Día 1', 'Día 2', 'Día 3', 'Día 4', 'Día 5'];
  return Promise.resolve({
    labels: labels,
    inbound: labels.map(() => 0),
    outbound: labels.map(() => 0),
  });
}; 