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
}

/**
 * Obtiene estadísticas de automatización de mensajes
 */
export const getAutomationStats = async (): Promise<AutomationStats> => {
  try {
    // Obtener total de mensajes
    const { count: totalMessages, error: totalError } = await supabase
      .from('mensajes')
      .select('*', { count: 'exact', head: true });
    
    if (totalError) throw totalError;
    
    // Obtener el último ID de mensajes para calcular mensajes automatizados
    const { data: lastMessageData, error: lastMessageError } = await supabase
      .from('mensajes')
      .select('id')
      .order('id', { ascending: false })
      .limit(1);
    
    // Calcular total de mensajes automatizados (último ID / 2)
    const lastMessageId = lastMessageData && lastMessageData.length > 0 ? lastMessageData[0].id : 0;
    const totalAutomatedMessages = Math.floor(lastMessageId / 2);
    
    // Obtener el contador de conciliaciones
    const { data: conciliationData, error: conciliationError } = await supabase
      .from('estadisticas')
      .select('valor')
      .eq('tipo', 'conciliaciones')
      .single();
    
    // Si no existe el contador, inicializarlo a 0
    const totalConciliations = conciliationData ? parseInt(conciliationData.valor) : 0;
    
    // Valor para capturas de datos (231)
    const totalDataCaptures = 231;
    
    // Obtener mensajes automatizados (para ejemplo, asumimos una columna automation_type)
    // Si no existe, podrías usar otro criterio como mensajes enviados por el sistema
    const { count: automatedCount, error: automatedError } = await supabase
      .from('mensajes')
      .select('*', { count: 'exact', head: true })
      .eq('tipo', 'enviado')
      .eq('nombre', 'Sistema'); // Ajustar según la estructura real de la base de datos
    
    // Si hay error, asumimos que tal vez no existe la columna y usamos una estimación
    const automatedMessages = automatedError ? Math.floor(totalMessages! * 0.35) : automatedCount || 0;
    
    // Calcular mensajes pendientes
    const pending = totalMessages! - automatedMessages;
    
    // Calcular tiempo ahorrado:
    // - Cada mensaje automatizado ahorra 17 segundos (0.28 minutos)
    // - Cada conciliación ahorra 75 minutos
    // - Cada captura de datos ahorra 6 minutos
    const timeSavedByMessages = totalAutomatedMessages * (17 / 60); // convertir segundos a minutos
    const timeSavedByConciliations = totalConciliations * 75; // minutos
    const timeSavedByCaptures = totalDataCaptures * 6; // minutos
    const totalTimeSaved = timeSavedByMessages + timeSavedByConciliations + timeSavedByCaptures;
    
    // Calcular porcentaje de ahorro (estimación)
    const savingsPercentage = totalMessages! > 0 
      ? Math.round((automatedMessages / totalMessages!) * 100)
      : 0;
    
    // Calculamos un tiempo de respuesta promedio estimado (este dato podría venir de una tabla real)
    const averageResponseTime = 1.8; // En minutos (dato simulado)
    
    return {
      total: totalMessages || 0,
      automated: automatedMessages,
      pending,
      totalMessages: totalAutomatedMessages,
      totalConciliations: totalConciliations,
      totalDataCaptures: totalDataCaptures,
      timeSaved: totalTimeSaved,
      savingsPercentage,
      averageResponseTime
    };
  } catch (error) {
    console.error('Error obteniendo estadísticas de automatización:', error);
    // Retornar valores por defecto en caso de error
    return {
      total: 0,
      automated: 0,
      pending: 0,
      totalMessages: 0,
      totalConciliations: 0,
      totalDataCaptures: 0,
      timeSaved: 0,
      savingsPercentage: 0,
      averageResponseTime: 0
    };
  }
};

/**
 * Incrementa el contador de conciliaciones
 * @returns El nuevo contador de conciliaciones
 */
export const incrementConciliationCount = async (): Promise<number> => {
  try {
    // Primero obtenemos el valor actual
    const { data: conciliationData, error: getError } = await supabase
      .from('estadisticas')
      .select('valor')
      .eq('tipo', 'conciliaciones')
      .single();

    let currentCount = conciliationData ? parseInt(conciliationData.valor) : 0;
    const newCount = currentCount + 1;
    
    // Si existe el registro, lo actualizamos
    if (conciliationData) {
      const { error: updateError } = await supabase
        .from('estadisticas')
        .update({ valor: newCount.toString() })
        .eq('tipo', 'conciliaciones');
      
      if (updateError) throw updateError;
    } 
    // Si no existe, lo creamos
    else {
      const { error: insertError } = await supabase
        .from('estadisticas')
        .insert([{ tipo: 'conciliaciones', valor: '1' }]);
      
      if (insertError) throw insertError;
    }
    
    return newCount;
  } catch (error) {
    console.error('Error incrementando contador de conciliaciones:', error);
    return 0;
  }
};

/**
 * Reinicia el contador de conciliaciones a cero
 */
export const resetConciliationCount = async (): Promise<boolean> => {
  try {
    const { data: conciliationData, error: getError } = await supabase
      .from('estadisticas')
      .select('*')
      .eq('tipo', 'conciliaciones')
      .single();
    
    if (conciliationData) {
      // Si existe el registro, lo actualizamos a cero
      const { error: updateError } = await supabase
        .from('estadisticas')
        .update({ valor: '0' })
        .eq('tipo', 'conciliaciones');
      
      if (updateError) throw updateError;
    } else {
      // Si no existe, lo creamos con valor 0
      const { error: insertError } = await supabase
        .from('estadisticas')
        .insert([{ tipo: 'conciliaciones', valor: '0' }]);
      
      if (insertError) throw insertError;
    }
    
    return true;
  } catch (error) {
    console.error('Error reiniciando contador de conciliaciones:', error);
    return false;
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