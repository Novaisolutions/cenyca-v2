import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';
import { ConversationListItem, MessageListItem } from '../types/database';

/**
 * Obtiene todas las conversaciones ordenadas por fecha de actualización, con paginación.
 */
export const fetchConversations = async (page: number, limit: number): Promise<ConversationListItem[]> => {
  const from = page * limit;
  const to = from + limit - 1;

  const { data, error } = await supabase
    .from('conversaciones')
    .select('id, numero, nombre_contacto, ultimo_mensaje_resumen, updated_at, tiene_no_leidos, no_leidos_count, status')
    .order('updated_at', { ascending: false })
    .range(from, to);
  
  if (error) {
    console.error('Error fetching conversations:', error);
    return [];
  }
  
  return data;
};

/**
 * Obtiene todos los mensajes de una conversación específica, con paginación.
 */
export const fetchMessages = async (conversationId: string, page: number, limit: number): Promise<MessageListItem[]> => {
  const from = page * limit;
  const to = from + limit - 1;

  const { data, error } = await supabase
    .from('mensajes')
    .select('id, tipo, mensaje, fecha, media_url, leido')
    .eq('conversation_id', conversationId)
    .order('fecha', { ascending: false }) // Los más recientes primero
    .range(from, to);

  if (error) {
    console.error(`Error fetching messages for conversation ${conversationId}:`, error);
    return [];
  }
  
  // Devolver los mensajes en orden cronológico (los más antiguos primero)
  return data.reverse();
};

/**
 * Se suscribe a los cambios en la tabla de conversaciones
 */
export const subscribeToConversations = (
  onInsert: (payload: RealtimePostgresChangesPayload<ConversationListItem>) => void,
  onUpdate: (payload: RealtimePostgresChangesPayload<ConversationListItem>) => void,
  onDelete: (payload: RealtimePostgresChangesPayload<ConversationListItem>) => void
) => {
  return supabase.channel('public:conversaciones')
    .on<ConversationListItem>(
      'postgres_changes', 
      { event: 'INSERT', schema: 'public', table: 'conversaciones' }, 
      onInsert
    )
    .on<ConversationListItem>(
      'postgres_changes', 
      { event: 'UPDATE', schema: 'public', table: 'conversaciones' }, 
      onUpdate
    )
    .on<ConversationListItem>(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'conversaciones' },
      onDelete
    )
    .subscribe();
};

/**
 * Establece una suscripción para detectar cambios en los mensajes de una conversación
 */
export const subscribeToMessages = (conversationId: string, callback: () => void) => {
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
export const updateMessagesReadStatus = async (conversationId: string, read: boolean) => {
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
export const searchConversationsByMessageContent = async (searchTerm: string): Promise<ConversationListItem[]> => {
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
  
  // Extraemos los IDs únicos de conversaciones, filtrando posibles nulos
  const conversationIds = [...new Set(matchingMessages.map(msg => msg.conversation_id).filter((id): id is string => id !== null))];
  
  // Consultamos las conversaciones correspondientes
  const { data: matchingConversations, error: conversationsError } = await supabase
    .from('conversaciones')
    .select('id, numero, nombre_contacto, ultimo_mensaje_resumen, updated_at, tiene_no_leidos, no_leidos_count, status')
    .in('id', conversationIds)
    .order('updated_at', { ascending: false });
  
  if (conversationsError) {
    console.error('Error obteniendo conversaciones:', conversationsError);
    return [];
  }
  
  return matchingConversations || [];
}; 