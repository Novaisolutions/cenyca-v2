import { supabase } from '../lib/supabase';
import { Conversacion, Mensaje } from '../types/database';

/**
 * Obtiene todas las conversaciones ordenadas por fecha de actualización
 */
export const fetchConversations = async (): Promise<Conversacion[]> => {
  const { data, error } = await supabase
    .from('conversaciones')
    .select('*')
    .order('updated_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching conversations:', error);
    return [];
  }
  
  return data;
};

/**
 * Obtiene todos los mensajes de una conversación específica
 */
export const fetchMessages = async (conversationId: number): Promise<Mensaje[]> => {
  const { data, error } = await supabase
    .from('mensajes')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('fecha', { ascending: true });
  
  if (error) {
    console.error('Error fetching messages:', error);
    return [];
  }
  
  return data;
};

/**
 * Establece una suscripción para detectar cambios en las conversaciones
 */
export const subscribeToConversations = (callback: () => void) => {
  return supabase
    .channel('conversaciones_changes')
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'conversaciones' 
    }, callback)
    .subscribe();
};

/**
 * Establece una suscripción para detectar cambios en los mensajes de una conversación
 */
export const subscribeToMessages = (conversationId: number, callback: () => void) => {
  return supabase
    .channel('mensajes_changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'mensajes',
      filter: `conversation_id=eq.${conversationId}`
    }, callback)
    .subscribe();
};

/**
 * Actualiza el estado de lectura de los mensajes de una conversación
 */
export const updateMessagesReadStatus = async (conversationId: number, read: boolean) => {
  try {
    // Actualizar los mensajes
    const { error: messagesError } = await supabase
      .from('mensajes')
      .update({ leido: read })
      .eq('conversation_id', conversationId)
      .eq('leido', !read);

    if (messagesError) {
      console.error('Error al actualizar estado de mensajes:', messagesError);
      return false;
    }

    // También actualizamos la tabla de conversaciones para mantener consistencia
    if (read) {
      // Si marcamos como leídos, actualizamos los indicadores en la conversación
      const { error: convError } = await supabase
        .from('conversaciones')
        .update({ 
          tiene_no_leidos: false,
          no_leidos_count: 0 
        })
        .eq('id', conversationId);

      if (convError) {
        console.error('Error al actualizar estado de conversación:', convError);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error en updateMessagesReadStatus:', error);
    return false;
  }
};

/**
 * Busca conversaciones que contienen un término específico en los mensajes
 */
export const searchConversationsByMessageContent = async (searchTerm: string): Promise<Conversacion[]> => {
  // Primero obtenemos IDs de conversaciones que tienen mensajes con el término buscado
  const { data: matchingMessages, error: messagesError } = await supabase
    .from('mensajes')
    .select('conversation_id')
    .ilike('mensaje', `%${searchTerm}%`)
    .order('fecha', { ascending: false });
  
  if (messagesError) {
    console.error('Error buscando mensajes:', messagesError);
    return [];
  }
  
  // Si no hay resultados, devolvemos array vacío
  if (!matchingMessages || matchingMessages.length === 0) {
    return [];
  }
  
  // Extraemos los IDs únicos de conversaciones
  const conversationIds = [...new Set(matchingMessages.map(msg => msg.conversation_id))];
  
  // Consultamos las conversaciones correspondientes
  const { data: matchingConversations, error: conversationsError } = await supabase
    .from('conversaciones')
    .select('*')
    .in('id', conversationIds)
    .order('updated_at', { ascending: false });
  
  if (conversationsError) {
    console.error('Error obteniendo conversaciones:', conversationsError);
    return [];
  }
  
  return matchingConversations || [];
}; 