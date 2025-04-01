import { supabase } from '../lib/supabase';
import { Conversacion, Mensaje } from '../types/database';




// Sistema de caché para almacenar resultados de consultas previas
const contextCache = {
  recentQueries: [] as {query: string, result: string, timestamp: number}[],
  maxCacheSize: 10,
  expirationTime: 5 * 60 * 1000, // 5 minutos
  
  // Añadir elemento a la caché
  add(query: string, result: string) {
    // Eliminar entradas antiguas
    const now = Date.now();
    this.recentQueries = this.recentQueries
      .filter(item => now - item.timestamp < this.expirationTime);
    
    // Añadir nueva entrada
    this.recentQueries.unshift({
      query,
      result,
      timestamp: now
    });
    
    // Mantener tamaño máximo
    if (this.recentQueries.length > this.maxCacheSize) {
      this.recentQueries.pop();
    }
  },
  
  // Buscar elemento en la caché
  find(query: string): string | null {
    const now = Date.now();
    const similarQuery = this.recentQueries.find(item => {
      // Verificar expiración
      if (now - item.timestamp >= this.expirationTime) return false;
      
      // Verificar similitud (implementación simple)
      return this.querySimilarity(query, item.query) > 0.7;
    });
    
    return similarQuery ? similarQuery.result : null;
  },
  
  // Calcular similitud entre dos consultas (implementación simple)
  querySimilarity(query1: string, query2: string): number {
    const words1 = new Set(query1.toLowerCase().split(/\s+/));
    const words2 = new Set(query2.toLowerCase().split(/\s+/));
    
    // Intersección
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    
    // Unión
    const union = new Set([...words1, ...words2]);
    
    // Coeficiente de Jaccard
    return intersection.size / union.size;
  }
};

/**
 * Versión simplificada del esquema para frontend (solo para la interfaz inicial)
 * El esquema completo se usa en la Edge Function
 */
export const getDatabaseSchema = async (): Promise<string> => {
  return `
ESQUEMA DE LA BASE DE DATOS:
- Tabla 'conversaciones': Almacena información principal de conversaciones
  Campos: id, numero, resumen, status, updated_at, nombre_contacto, tiene_no_leidos, no_leidos_count
- Tabla 'mensajes': Almacena mensajes individuales 
  Campos: id, tipo, numero, mensaje, fecha, nombre, media_url, leido, conversation_id
`;
};

/**
 * Esta función es solo para compatibilidad con componentes existentes
 * Los datos realmente se buscarán en la Edge Function
 */
export const getDatabaseContext = async (): Promise<string> => {
  try {
    // Obtener resumen de conversaciones
    const { data: conversations, error: convError } = await supabase
      .from('conversaciones')
      .select('id, nombre_contacto, numero, updated_at, ultimo_mensaje_resumen')
      .order('updated_at', { ascending: false })
      .limit(15);
    
    if (convError) throw convError;
    
    // Obtener algunos mensajes recientes como ejemplo
    const { data: recentMessages, error: msgError } = await supabase
      .from('mensajes')
      .select('conversation_id, mensaje, tipo, fecha')
      .order('fecha', { ascending: false })
      .limit(30);
    
    if (msgError) throw msgError;
    
    // Formar el contexto como texto
    let context = "CONTEXTO DE LA BASE DE DATOS:\n\n";
    
    context += "CONVERSACIONES RECIENTES:\n";
    conversations.forEach((conv, i) => {
      context += `${i+1}. ID: ${conv.id} | Contacto: ${conv.nombre_contacto || conv.numero} | Último mensaje: ${conv.ultimo_mensaje_resumen || 'Sin mensajes'}\n`;
    });
    
    context += "\nMENSAJES RECIENTES (ejemplos):\n";
    recentMessages.forEach((msg, i) => {
      context += `${i+1}. Conversación ID: ${msg.conversation_id} | Tipo: ${msg.tipo} | Mensaje: ${msg.mensaje}\n`;
    });
    
    return context;
  } catch (error) {
    console.error("Error obteniendo contexto de la base de datos:", error);
    return "No se pudo obtener el contexto de la base de datos.";
  }
};

/**
 * Envía un mensaje a Gemini a través de la Edge Function de Netlify
 */
export const sendMessageToGemini = async (
  messages: {role: 'user' | 'assistant', content: string}[], 
  databaseContext: string = ""
): Promise<string> => {
  try {
    // Hacer la solicitud a nuestra Edge Function
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages,
        dbContext: databaseContext
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error en Edge Function de Gemini: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(`Error en la respuesta: ${data.error}`);
    }
    
    return data.response;
  } catch (error) {
    console.error("Error enviando mensaje a Gemini:", error);
    return "Lo siento, ocurrió un error al procesar tu solicitud. Por favor intenta de nuevo más tarde.";
  }
};

/**
 * Analiza la consulta del usuario y extrae palabras clave para búsqueda
 * Implementa lematización básica para español
 */
const extractQueryKeywords = (query: string): string[] => {
  // Stopwords en español más comunes
  const stopWords = [
    'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'y', 'o', 'a', 'ante', 
    'bajo', 'con', 'de', 'desde', 'en', 'entre', 'hacia', 'hasta', 'para', 'por', 
    'según', 'sin', 'sobre', 'tras', 'que', 'como', 'cuando', 'donde', 'quien', 
    'cuyo', 'este', 'esta', 'estos', 'estas', 'ese', 'esa', 'esos', 'esas'
  ];
  
  // Preprocesamiento básico: minúsculas, eliminar caracteres especiales, tokenizar
  const tokens = query
    .toLowerCase()
    .replace(/[^\w\sáéíóúüñ]/g, '')
    .split(/\s+/);
  
  // Aplicar lematización básica (simplificada) y filtrar stopwords
  const lemmatizedTokens = tokens.map(word => {
    // Reglas simples de lematización para español
    if (word.endsWith('ando') || word.endsWith('endo')) return word.slice(0, -4);
    if (word.endsWith('iendo')) return word.slice(0, -5);
    if (word.endsWith('aron')) return word.slice(0, -4);
    if (word.endsWith('aban')) return word.slice(0, -4);
    if (word.endsWith('aron')) return word.slice(0, -4);
    if (word.endsWith('aste')) return word.slice(0, -4);
    if (word.endsWith('ados')) return word.slice(0, -4);
    if (word.endsWith('adas')) return word.slice(0, -4);
    if (word.endsWith('ado')) return word.slice(0, -3);
    if (word.endsWith('ada')) return word.slice(0, -3);
    if (word.endsWith('ido')) return word.slice(0, -3);
    if (word.endsWith('ida')) return word.slice(0, -3);
    if (word.endsWith('ar')) return word;
    if (word.endsWith('er')) return word;
    if (word.endsWith('ir')) return word;
    return word;
  });
  
  // Filtrar stopwords y palabras muy cortas
  return lemmatizedTokens.filter(word => word.length > 2 && !stopWords.includes(word));
};

/**
 * Clasifica el tipo de consulta que está haciendo el usuario
 */
const classifyQueryType = (query: string): 'conversation' | 'message' | 'stats' | 'general' => {
  const query_lower = query.toLowerCase();
  
  if (query_lower.includes('estadística') || query_lower.includes('cuantos')) {
    return 'stats';
  }
  
  if (query_lower.includes('mensaje') || query_lower.includes('enviado') || 
      query_lower.includes('recibido') || query_lower.includes('dijo') || 
      query_lower.includes('escribió')) {
    return 'message';
  }
  
  if (query_lower.includes('conversación') || query_lower.includes('conversaciones') || 
      query_lower.includes('contacto') || query_lower.includes('número') || 
      query_lower.includes('cliente')) {
    return 'conversation';
  }
  
  return 'general';
};



/**
 * Obtiene estadísticas generales de la base de datos
 */
const getGeneralStats = async (): Promise<string> => {
  try {
    const { count: totalConversations, error: convError } = await supabase
      .from('conversaciones')
      .select('*', { count: 'exact', head: true });
    
    const { count: totalMessages, error: msgError } = await supabase
      .from('mensajes')
      .select('*', { count: 'exact', head: true });
    
    const { count: unreadConversations, error: unreadError } = await supabase
      .from('conversaciones')
      .select('*', { count: 'exact', head: true })
      .eq('tiene_no_leidos', true);
    
    if (convError || msgError || unreadError) throw new Error('Error obteniendo estadísticas');
    
    return `
ESTADÍSTICAS GENERALES:
- Total de conversaciones: ${totalConversations}
- Total de mensajes: ${totalMessages}
- Conversaciones con mensajes no leídos: ${unreadConversations}
    `;
  } catch (error) {
    console.error("Error obteniendo estadísticas:", error);
    return "No se pudieron obtener estadísticas.";
  }
};

/**
 * Determina dinámicamente cuántos mensajes recuperar basado en la consulta
 */
const getDynamicMessageLimit = (query: string): number => {
  const query_lower = query.toLowerCase();
  
  // Si la consulta es específica sobre historia o mensajes antiguos, recuperamos más
  if (query_lower.includes('historial') || 
      query_lower.includes('todos los mensajes') || 
      query_lower.includes('antiguos') ||
      query_lower.includes('desde el principio')) {
    return 100; // Límite mayor para consultas históricas
  }
  
  // Si la consulta es sobre mensajes recientes o tendencias actuales
  if (query_lower.includes('recientes') || 
      query_lower.includes('últimos') ||
      query_lower.includes('hoy') ||
      query_lower.includes('esta semana')) {
    return 30; // Límite estándar para consultas recientes
  }
  
  // Si la consulta es muy específica (incluye nombres, fechas o términos concretos)
  const hasSpecificTerms = /\b(nombre|fecha|día|mes|año|20\d\d|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/i.test(query);
  
  if (hasSpecificTerms) {
    return 50; // Límite intermedio para consultas específicas
  }
  
  // Valor por defecto
  return 30;
};

/**
 * Busca conversaciones y mensajes relevantes utilizando similitud con la consulta
 */
const searchRelevantContent = async (query: string): Promise<{
  relevantConversations: Conversacion[],
  relevantMessages: Mensaje[]
}> => {
  const keywords = extractQueryKeywords(query);
  
  // Determinar el límite dinámicamente
  const messageLimit = getDynamicMessageLimit(query);
  
  // Buscar conversaciones relevantes
  let relevantConversations: Conversacion[] = [];
  
  if (keywords.length > 0) {
    let queryBuilder = supabase.from('conversaciones').select('*');
    
    // Construir condiciones OR para cada palabra clave
    let orConditions: string[] = [];
    keywords.forEach(keyword => {
      orConditions.push(`numero.ilike.%${keyword}%`);
      orConditions.push(`nombre_contacto.ilike.%${keyword}%`);
      orConditions.push(`resumen.ilike.%${keyword}%`);
      orConditions.push(`ultimo_mensaje_resumen.ilike.%${keyword}%`);
    });
    
    const { data, error } = await queryBuilder
      .or(orConditions.join(','))
      .order('updated_at', { ascending: false })
      .limit(15);
    
    if (!error && data) {
      relevantConversations = data;
    }
  }
  
  // Buscar mensajes relevantes
  let relevantMessages: Mensaje[] = [];
  
  if (keywords.length > 0) {
    let queryBuilder = supabase.from('mensajes').select('*');
    
    // Construir condiciones OR para cada palabra clave
    let orConditions: string[] = [];
    keywords.forEach(keyword => {
      orConditions.push(`mensaje.ilike.%${keyword}%`);
    });
    
    const { data, error } = await queryBuilder
      .or(orConditions.join(','))
      .order('fecha', { ascending: false })
      .limit(messageLimit);
    
    if (!error && data) {
      relevantMessages = data;
    }
  }
  
  return { relevantConversations, relevantMessages };
};

/**
 * Obtiene el contexto específico de la base de datos según la consulta del usuario
 * con optimizaciones para reducir el uso de recursos
 */
export const getContextBasedOnQuery = async (userQuery: string): Promise<string> => {
  try {
    // 1. Verificar caché primero
    const cachedResult = contextCache.find(userQuery);
    if (cachedResult) {
      console.log("Usando resultado en caché para consulta similar");
      return cachedResult;
    }
    
    // 2. Extraer palabras clave de la consulta
    const keywords = extractQueryKeywords(userQuery);
    console.log("Palabras clave extraídas:", keywords);
    
    // 3. Determinar tipo de consulta
    const queryType = classifyQueryType(userQuery);
    console.log("Tipo de consulta:", queryType);
    
    // 4. Obtener esquema de la base de datos (información general)
    const schema = await getDatabaseSchema();
    
    // 5. Inicializar contexto
    let context = "CONTEXTO DE LA BASE DE DATOS:\n\n";
    context += schema + "\n";
    
    // 6. Obtener información según tipo de consulta
    if (queryType === 'stats' || queryType === 'general') {
      const stats = await getGeneralStats();
      context += stats + "\n";
    }
    
    // 7. Búsqueda específica según palabras clave y relevancia
    const { relevantConversations, relevantMessages } = await searchRelevantContent(userQuery);
    
    if (queryType === 'conversation' || queryType === 'general') {
      context += "\nCONVERSACIONES RELEVANTES:\n";
      relevantConversations.forEach((conv, i) => {
        context += `${i+1}. ID: ${conv.id} | Contacto: ${conv.nombre_contacto || conv.numero} | Último mensaje: ${conv.ultimo_mensaje_resumen || 'Sin mensajes'}\n`;
      });
    }
    
    if (queryType === 'message' || queryType === 'general') {
      context += "\nMENSAJES RELEVANTES:\n";
      relevantMessages.forEach((msg, i) => {
        context += `${i+1}. ID Conv: ${msg.conversation_id} | Tipo: ${msg.tipo} | Fecha: ${msg.fecha} | Mensaje: ${msg.mensaje}\n`;
      });
      
      // Si hay mensajes y conversación específica, obtener más contexto
      if (relevantMessages.length > 0) {
        const uniqueConvIds = [...new Set(relevantMessages.map(m => m.conversation_id))];
        if (uniqueConvIds.length === 1 && uniqueConvIds[0]) {
          const { data: conversationData } = await supabase
            .from('conversaciones')
            .select('nombre_contacto, numero')
            .eq('id', uniqueConvIds[0])
            .single();
          
          if (conversationData) {
            context += `\nCONTEXTO ADICIONAL: Estos mensajes pertenecen al contacto ${conversationData.nombre_contacto || conversationData.numero}\n`;
          }
        }
      }
    }
    
    // 8. Guardar en caché para futuras consultas similares
    contextCache.add(userQuery, context);
    
    return context;
  } catch (error) {
    console.error("Error generando contexto basado en consulta:", error);
    return "No se pudo generar contexto específico para esta consulta.";
  }
};

export const updateMessagesReadStatus = async (conversationId: number, read: boolean) => {
  const { error } = await supabase
    .from('mensajes')
    .update({ leido: read })
    .eq('conversation_id', conversationId)
    .eq('leido', !read);

  if (error) {
    console.error('Error updating messages read status:', error);
    return false;
  }

  return true;
};

export const loadConversations = async () => {
  // Implementa la lógica para cargar conversaciones aquí
}; 