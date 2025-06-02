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
const totalDataCaptures = 1081; // Actualizado a 1081 (719 + 362) según requerimiento

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
      // Manejar el error silenciosamente si es por la tabla que no existe
      if (error.code === '42P01' && error.message.includes('eventos')) {
        return false; // Suponemos que no se ha alcanzado el límite
      }
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
    // Evitar logging si es por tabla inexistente
    if (error && typeof error === 'object' && 'code' in error && error.code === '42P01') {
      return false;
    }
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
    // Obtener cantidad total de mensajes
    const { data: mensajesData, error: mensajesError } = await supabase
      .from('mensajes')
      .select('count', { count: 'exact', head: true });

    if (mensajesError) {
      console.error('Error obteniendo total de mensajes:', mensajesError);
    }

    const totalMessages = mensajesData?.count || 0;
    
    // Obtener el último ID de mensajes para calcular mensajes automatizados
    const { data: lastMessageData, error: lastMessageError } = await supabase
      .from('mensajes')
      .select('id')
      .order('id', { ascending: false })
      .limit(1);
    
    // Calcular total de mensajes automatizados (último ID / 2)
    const lastMessageId = lastMessageData && lastMessageData.length > 0 ? lastMessageData[0].id : 0;
    const totalAutomatedMessages = Math.floor(lastMessageId / 2);
    
    // Obtener el contador de conciliaciones (de una tabla de eventos)
    let totalConciliations = 0;
    let conciliationError = false;
    try {
      // Evitamos el log excesivo sobre la consulta de conciliaciones
      
      const { data: conciliationData, error: conciliationErr } = await supabase
        .from('eventos')
        .select('count, updated_at')
        .eq('tipo', 'conciliacion')
        .order('updated_at', { ascending: false })
        .limit(1);
      
      if (conciliationErr) {
        conciliationError = true;
        // Si el error es porque la tabla no existe, lo manejamos silenciosamente
        if (conciliationErr.code !== '42P01') {
          console.error('Error al obtener conciliaciones:', conciliationErr);
        }
        
        // Verificamos silenciosamente si la tabla existe
        try {
          const { count } = await supabase
            .from('eventos')
            .select('*', { count: 'exact', head: true });
          
          // Solo registramos este mensaje si la tabla existe pero hay otro error
          if (conciliationErr.code !== '42P01') {
            console.log('Tabla eventos existe, registros totales:', count);
            console.log('El error previo no fue por tabla inexistente sino por otro motivo');
          }
        } catch (tableError) {
          // No necesitamos reportar este error, ya sabemos que la tabla no existe
        }
      }
      
      if (conciliationData && conciliationData.length > 0) {
        totalConciliations = conciliationData[0].count;
      } else if (conciliationError) {
        // Si no hay datos y hubo un error, verificamos silenciosamente si hay conciliaciones mensuales
        try {
          const { count } = await supabase
            .from('eventos')
            .select('*', { count: 'exact', head: true })
            .eq('tipo', 'conciliacion_mensual') as { count: number | null; data: any[] };
          
          if (count && count > 0) {
            // Si hay conciliaciones mensuales pero no globales, estimamos
            totalConciliations = count * 3; // Estimación conservadora
          }
        } catch (countError) {
          // Si hay un error, simplemente usamos el valor por defecto
        }
      }
    } catch (conciliationIssue) {
      // Solo registramos el error si no es por la tabla inexistente
      if (typeof conciliationIssue === 'object' && conciliationIssue && 'code' in conciliationIssue && conciliationIssue.code !== '42P01') {
        console.error('Excepción al consultar conciliaciones:', conciliationIssue);
      }
      // No propagamos el error para que no afecte al resto de estadísticas
    }
    
    // Obtener mensajes automatizados (mensajes enviados por el sistema)
    let automatedMessages = 0;
    try {
      const { data, count, error: automatedError } = await supabase
        .from('mensajes')
        .select('*', { count: 'exact', head: true })
        .eq('tipo', 'enviado')
        .eq('nombre', 'Sistema');
      
      if (!automatedError && count !== null) {
        automatedMessages = count;
      } else {
        // Si hay error en esta consulta, usamos una estimación basada en el total
        automatedMessages = Math.floor(totalMessages * 0.35);
      }
    } catch (error) {
      // Usar estimación en caso de error
      automatedMessages = Math.floor(totalMessages * 0.35);
    }
    
    // Calcular mensajes pendientes (no automatizados)
    const pendingMessages = Math.max(0, totalMessages - automatedMessages);
    
    // Calcular tiempo ahorrado (17 segundos por mensaje automatizado, 5 minutos por dato capturado, 75 minutos por conciliación)
    const timeSavedMessages = (automatedMessages * 17) / 60; // Convertir a minutos
    const timeSavedCaptures = totalDataCaptures * 5; // Ya en minutos
    const timeSavedConciliations = totalConciliations * 75; // Ya en minutos
    const totalTimeSaved = timeSavedMessages + timeSavedCaptures + timeSavedConciliations;
    
    // Calcular porcentaje de automatización
    const savingsPercentage = totalMessages > 0 
      ? Math.round((automatedMessages / totalMessages) * 100) 
      : 0;
      
    // Verificar límite mensual para conciliaciones
    let isLimitReached = false;
    let monthlyUsed = 0;
    try {
      isLimitReached = await checkConciliationLimit();
      
      // Obtener conciliaciones usadas este mes
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();
      
      const { data: monthlyData, error: monthlyError } = await supabase
        .from('eventos')
        .select('count')
        .eq('tipo', 'conciliacion_mensual')
        .gte('updated_at', new Date(currentYear, currentMonth - 1, 1).toISOString())
        .lte('updated_at', new Date(currentYear, currentMonth, 0).toISOString());
        
      if (!monthlyError && monthlyData && monthlyData.length > 0) {
        // Sumamos todas las conciliaciones mensuales
        monthlyUsed = monthlyData.reduce((sum, record) => {
          const count = typeof record === 'object' && record !== null && 'count' in record 
            ? Number(record.count) || 0 
            : 0;
          return sum + count;
        }, 0);
      }
    } catch (error) {
      // Manejar el error silenciosamente
      if (typeof error === 'object' && error && 'code' in error && error.code !== '42P01') {
        console.error('Error al verificar conciliaciones mensuales:', error);
      }
    }
    
    // Recordatorio de pago
    // El primer día de cada mes se recordará renovar la suscripción
    const currentDate = new Date();
    const dayOfMonth = currentDate.getDate();
    const nextPaymentReminder = dayOfMonth === 1 || dayOfMonth === 2;
    
    // Estructura de resultado
    return {
      total: totalMessages,
      automated: automatedMessages,
      pending: pendingMessages,
      totalMessages,
      totalConciliations,
      totalDataCaptures,
      timeSaved: totalTimeSaved,
      savingsPercentage,
      monthlyLimit: MONTHLY_CONCILIATION_LIMIT,
      monthlyUsed,
      monthlyRemaining: Math.max(0, MONTHLY_CONCILIATION_LIMIT - monthlyUsed),
      isLimitReached,
      nextPaymentReminder
    };
  } catch (error) {
    console.error('Error obteniendo estadísticas de automatización:', error);
    // En caso de error, devolvemos valores por defecto
    return {
      total: 0,
      automated: 0,
      pending: 0,
      totalMessages: 0,
      totalConciliations: 0,
      totalDataCaptures: totalDataCaptures,
      timeSaved: 0,
      savingsPercentage: 0,
      monthlyLimit: MONTHLY_CONCILIATION_LIMIT,
      monthlyUsed: 0,
      monthlyRemaining: MONTHLY_CONCILIATION_LIMIT,
      isLimitReached: false,
      nextPaymentReminder: false
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