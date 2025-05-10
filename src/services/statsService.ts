import { supabase } from '../lib/supabase';

export interface AutomationStats {
  total: number;
  automated: number;
  pending: number;
  totalMessages: number;         // Total de mensajes automatizados (ID último / 2)
  totalConciliations: number;    // Total de conciliaciones realizadas
  totalDataCaptures: number;     // Total de datos capturados
  timeSaved: number;             // Tiempo ahorrado en minutos
  savingsPercentage: number;
  averageResponseTime?: number;
  monthlyLimit: number;          // Límite mensual de conciliaciones
  monthlyUsed: number;           // Conciliaciones usadas este mes
  monthlyRemaining: number;      // Conciliaciones restantes este mes
  isLimitReached: boolean;       // Si se ha alcanzado el límite mensual
  nextPaymentReminder: boolean;  // Si se debe mostrar el recordatorio de pago
}

// Constantes globales
export const MONTHLY_CONCILIATION_LIMIT = 300;

// Interface para datos de eventos
interface EventoRecord {
  id: number;
  count: number;
  updated_at: string;
  tipo: string;
}

// Valor fijo para total de capturas de datos
const totalDataCaptures = 719; // Actualizado a 719 (336 + 383) según requerimiento

/**
 * Verifica si se alcanzó el límite mensual de conciliaciones.
 * @returns Promise<boolean> - Devuelve true si se ha alcanzado el límite, false en caso contrario.
 */
export const checkConciliationLimit = async (): Promise<boolean> => {
  try {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    
    // Buscamos los registros de conciliaciones para este mes
    const { data, error } = await supabase
      .from('eventos')
      .select('count')
      .eq('tipo', 'conciliacion_mensual')
      .gte('updated_at', new Date(currentYear, currentMonth - 1, 1).toISOString())
      .lte('updated_at', new Date(currentYear, currentMonth, 0).toISOString());
    
    if (error) {
      console.error('Error al verificar límite de conciliaciones:', error);
      return false; // Asumimos que no se ha alcanzado el límite en caso de error
    }
    
    // Si no hay registros, no se ha alcanzado el límite
    if (!data || data.length === 0) {
      return false;
    }
    
    // Sumamos todas las conciliaciones del mes
    const totalMonthly = data.reduce((sum, record) => {
      // Utilizamos una aserción de tipo más adecuada para el registro
      const count = typeof record === 'object' && record !== null && 'count' in record 
        ? Number(record.count) || 0 
        : 0;
      return sum + count;
    }, 0);
    
    // Devolvemos true si se ha alcanzado o superado el límite
    return totalMonthly >= MONTHLY_CONCILIATION_LIMIT;
  } catch (error) {
    console.error('Error al verificar límite de conciliaciones:', error);
    return false; // Asumimos que no se ha alcanzado el límite en caso de error
  }
};

/**
 * Incrementa el contador de conciliaciones en la base de datos
 */
export const incrementConciliationCount = async (): Promise<boolean> => {
  try {
    // Obtener el registro actual o crear uno nuevo
    const { data: currentData, error: fetchError } = await supabase
      .from('eventos')
      .select('*')
      .eq('tipo', 'conciliacion')
      .order('updated_at', { ascending: false })
      .limit(1);
    
    if (fetchError) {
      console.error('Error al obtener contador de conciliaciones:', fetchError);
      return false;
    }
    
    if (currentData && currentData.length > 0) {
      // Incrementar contador existente
      const currentRecord = currentData[0] as EventoRecord;
      const newCount = (currentRecord.count || 0) + 1;
      const { error: updateError } = await supabase
        .from('eventos')
        .update({ count: newCount, updated_at: new Date().toISOString() })
        .eq('id', currentRecord.id);
      
      if (updateError) {
        console.error('Error al actualizar contador de conciliaciones:', updateError);
        return false;
      }
      
      console.log('Contador de conciliaciones actualizado correctamente:', newCount);
      return true;
    } else {
      // Crear nuevo registro
      const { error: insertError } = await supabase
        .from('eventos')
        .insert([
          { 
            tipo: 'conciliacion', 
            count: 1, 
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ]);
      
      if (insertError) {
        console.error('Error al crear contador de conciliaciones:', insertError);
        return false;
      }
      
      console.log('Contador de conciliaciones creado correctamente');
      return true;
    }
  } catch (error) {
    console.error('Excepción al incrementar contador de conciliaciones:', error);
    return false;
  }
};

/**
 * Formatea el tiempo ahorrado en un formato legible
 */
const formatTimeSaved = (minutes: number): string => {
  if (minutes < 60) {
    return `${Math.round(minutes)} minutos`;
  } else if (minutes < 1440) { // menos de un día
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return `${hours} ${hours === 1 ? 'hora' : 'horas'}${remainingMinutes > 0 ? ` ${remainingMinutes} minutos` : ''}`;
  } else { // más de un día
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    return `${days} ${days === 1 ? 'día' : 'días'}${hours > 0 ? ` ${hours} ${hours === 1 ? 'hora' : 'horas'}` : ''}`;
  }
};

/**
 * Obtiene estadísticas de automatización de mensajes
 */
export const getAutomationStats = async (): Promise<AutomationStats> => {
  try {
    // Obtener cantidad total de mensajes (puede ser usado para contexto o verificaciones)
    const { data: mensajesData, error: mensajesError } = await supabase
      .from('mensajes')
      .select('count', { count: 'exact', head: true });

    if (mensajesError) {
      console.error('Error obteniendo total de mensajes:', mensajesError);
    }
    // const totalMessagesCountGlobal = mensajesData?.count || 0; // Disponible si se necesita

    // Obtener el último ID de mensajes para el fallback de mensajes automatizados
    const { data: lastMessageData, error: lastMessageError } = await supabase
      .from('mensajes')
      .select('id')
      .order('id', { ascending: false })
      .limit(1);

    const lastMessageId = lastMessageData && lastMessageData.length > 0 ? lastMessageData[0].id : 0;
    const fallbackAutomatedMessages = Math.floor(lastMessageId / 2); // Fallback original

    // Nueva lógica para obtener finalAutomatedMessages (conteo directo o fallback)
    let finalAutomatedMessages = fallbackAutomatedMessages; 
    try {
      const { count, error: automatedError } = await supabase
        .from('mensajes')
        .select('*', { count: 'exact', head: true })
        .eq('tipo', 'enviado')
        .eq('nombre', 'Sistema');

      if (!automatedError && count !== null) {
        finalAutomatedMessages = count;
      } else {
        // Si hay error o count es null, ya se está usando fallbackAutomatedMessages
        if (automatedError) console.warn('Error al obtener mensajes automatizados (tipo:enviado, nombre:Sistema), usando fallback:', automatedError.message);
        else console.warn('No se obtuvo conteo de mensajes automatizados (tipo:enviado, nombre:Sistema), usando fallback.');
      }
    } catch (e: any) {
      console.error('Excepción al obtener mensajes automatizados (tipo:enviado, nombre:Sistema):', e.message);
      // Ya se está usando fallbackAutomatedMessages
    }
    
    // Obtener el contador de conciliaciones totales (lógica original)
    let totalConciliations = 0;
    try {
      const { data: conciliationData, error: conciliationError } = await supabase
        .from('eventos')
        .select('count, updated_at')
        .eq('tipo', 'conciliacion')
        .order('updated_at', { ascending: false })
        .limit(1);
      if (conciliationError) { /* ... manejo de error original ... */ 
        console.error('Error al obtener conciliaciones:', conciliationError);
        // Fallback o manejo como estaba antes
        const { count: fallbackCount } = await supabase.from('eventos').select('*', { count: 'exact', head: true }).eq('tipo', 'conciliacion_mensual');
        if (fallbackCount && fallbackCount > 0) totalConciliations = fallbackCount * 3; // Estimación si la principal falla
      } else if (conciliationData && conciliationData.length > 0) {
        totalConciliations = conciliationData[0].count;
      }
    } catch (conciliationIssue) { /* ... manejo de error original ... */ 
      console.error('Excepción al consultar conciliaciones:', conciliationIssue);
    }

    // totalDataCaptures es un valor fijo
    // const totalDataCaptures = 719; // Ya está definido globalmente

    // Lógica de conciliaciones mensuales (lógica original)
    let monthlyConciliationsUsed = 0;
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    try {
        const { data, error } = await supabase
        .from('eventos')
        .select('count')
        .eq('tipo', 'conciliacion_mensual')
        .gte('updated_at', new Date(currentYear, currentMonth - 1, 1).toISOString())
        .lte('updated_at', new Date(currentYear, currentMonth, 0).toISOString());
        if (error) { /* ... */ }
        else if (data) {
            monthlyConciliationsUsed = data.reduce((sum, record) => sum + (Number(record.count) || 0), 0);
        }
    } catch (error) { /* ... */ }
    const monthlyConciliationsRemaining = MONTHLY_CONCILIATION_LIMIT - monthlyConciliationsUsed;
    const isMonthlyLimitReached = monthlyConciliationsUsed >= MONTHLY_CONCILIATION_LIMIT;

    // --- AJUSTE EN CÁLCULOS PRINCIPALES USANDO finalAutomatedMessages ---
    const totalTrackedInteractions = finalAutomatedMessages + totalConciliations + totalDataCaptures;
    const automatedTrackedInteractions = finalAutomatedMessages + totalConciliations + totalDataCaptures;
    const pendingInteractions = 0; // No tenemos métrica para esto

    const timeSavedPerMessage = 1.5; 
    const timeSavedPerConciliation = 75;
    const timeSavedPerDataCapture = 5; 

    const timeSaved = 
      (finalAutomatedMessages * timeSavedPerMessage) + 
      (totalConciliations * timeSavedPerConciliation) +
      (totalDataCaptures * timeSavedPerDataCapture);

    const savingsPercentage = totalTrackedInteractions > 0 
      ? Math.round((automatedTrackedInteractions / totalTrackedInteractions) * 100) 
      : 0;
    
    // Lógica de recordatorio de pago (lógica original)
    const today = new Date();
    const dayOfMonth = today.getDate();
    const paymentDay = 10;
    let daysUntilPayment = paymentDay - dayOfMonth;
    if (daysUntilPayment < 0) {
        const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        daysUntilPayment = daysInMonth - dayOfMonth + paymentDay;
    }
    const nextPaymentReminder = daysUntilPayment <= 10 && daysUntilPayment > 0;

    return {
      total: totalTrackedInteractions,
      automated: automatedTrackedInteractions,
      pending: pendingInteractions,
      totalMessages: finalAutomatedMessages, // <--- CAMBIO PRINCIPAL AQUÍ
      totalConciliations,
      totalDataCaptures,
      timeSaved,
      savingsPercentage,
      monthlyLimit: MONTHLY_CONCILIATION_LIMIT,
      monthlyUsed: monthlyConciliationsUsed,
      monthlyRemaining: monthlyConciliationsRemaining < 0 ? 0 : monthlyConciliationsRemaining,
      isLimitReached: isMonthlyLimitReached,
      nextPaymentReminder
    };
  } catch (error) {
    console.error('Error general obteniendo estadísticas de automatización:', error);
    return { /* ...valores por defecto en caso de error mayor... */ 
      total: 0, automated: 0, pending: 0, totalMessages: 0,
      totalConciliations: 0, totalDataCaptures: totalDataCaptures, timeSaved: 0,
      savingsPercentage: 0, monthlyLimit: MONTHLY_CONCILIATION_LIMIT, monthlyUsed: 0,
      monthlyRemaining: MONTHLY_CONCILIATION_LIMIT, isLimitReached: false, nextPaymentReminder: false
    };
  }
};

/**
 * Obtiene estadísticas de rendimiento por período de tiempo
 */
export const getPerformanceStats = async (period: 'day' | 'week' | 'month' = 'week'): Promise<{
  labels: string[];
  inbound: number[];
  outbound: number[];
}> => {
  // Nota: Esta función es simplificada y devuelve datos de ejemplo
  // En producción, consultaría la base de datos con filtros de fecha
  
  const now = new Date();
  const labels = [];
  const inbound = [];
  const outbound = [];
  
  if (period === 'day') {
    // Datos por hora del día
    for (let i = 0; i < 24; i++) {
      labels.push(`${i}:00`);
      inbound.push(Math.floor(Math.random() * 15));
      outbound.push(Math.floor(Math.random() * 20));
    }
  } else if (period === 'week') {
    // Datos por día de la semana
    const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    for (const day of days) {
      labels.push(day);
      inbound.push(Math.floor(Math.random() * 50));
      outbound.push(Math.floor(Math.random() * 65));
    }
  } else {
    // Datos por día del mes (últimos 30 días)
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(now.getDate() - i);
      labels.push(`${date.getDate()}/${date.getMonth() + 1}`);
      inbound.push(Math.floor(Math.random() * 25));
      outbound.push(Math.floor(Math.random() * 35));
    }
  }
  
  return { labels, inbound, outbound };
}; 