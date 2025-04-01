import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as natural from 'https://esm.sh/natural@6.8.1';

// Configuración del cliente Supabase
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// API KEY protegida como variable de entorno en Supabase
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || '';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';

// Interfaces para tipar los datos
interface Conversacion {
  id: number;
  numero: string;
  resumen: string | null;
  status: string;
  updated_at: string;
  reactivacion_intentos: number;
  ultimo_intento_reactivacion: string | null;
  proximo_seguimiento: string | null;
  nombre_contacto: string | null;
  ultimo_mensaje_resumen: string | null;
  tiene_no_leidos: boolean;
  no_leidos_count: number;
}

interface Mensaje {
  id: number;
  tipo: string;
  numero: string;
  mensaje: string;
  fecha: string;
  nombre: string | null;
  media_url: string | null;
  leido: boolean;
  conversation_id: number | null;
}

interface GeminiMessage {
  role: 'user' | 'model';
  parts: {
    text: string;
  }[];
}

interface GeminiRequest {
  contents: GeminiMessage[];
  generationConfig: {
    temperature: number;
    topP: number;
    topK: number;
    maxOutputTokens: number;
  };
}

interface GeminiResponse {
  candidates: {
    content: {
      parts: {
        text: string;
      }[];
    };
  }[];
}

/**
 * Genera información básica sobre la estructura de la base de datos
 */
const getDatabaseSchema = (): string => {
  // Esta información podría ser estática o consultada de metadatos de Supabase
  return `
ESQUEMA DE LA BASE DE DATOS:
- Tabla 'conversaciones': Almacena información principal de conversaciones
  Campos: id, numero, resumen, status, updated_at, nombre_contacto, tiene_no_leidos, no_leidos_count
- Tabla 'mensajes': Almacena mensajes individuales 
  Campos: id, tipo, numero, mensaje, fecha, nombre, media_url, leido, conversation_id
`;
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
 * Extrae entidades nombradas de la consulta (NER básico)
 */
const extractEntities = (query: string): {
  nombres: string[],
  numeros: string[],
  fechas: string[],
} => {
  // Patrones básicos para detectar entidades nombradas
  const nombrePattern = /([A-Z][a-zñáéíóú]{2,}( [A-Z][a-zñáéíóú]{2,})*)/g;
  const numeroPattern = /\b(\d{9,12})\b/g;
  const fechaPattern = /\b(\d{1,2}[\/.-]\d{1,2}([\/.-]\d{2,4})?)\b/g;
  
  // Normalizar el texto para la detección de nombres (mayúsculas al inicio de palabras)
  const normalizedText = query.replace(/\b\w/g, l => l.toUpperCase());
  
  return {
    nombres: Array.from(normalizedText.matchAll(nombrePattern)).map(m => m[0]),
    numeros: Array.from(query.matchAll(numeroPattern)).map(m => m[0]),
    fechas: Array.from(query.matchAll(fechaPattern)).map(m => m[0]),
  };
};

/**
 * Clasifica el tipo de consulta que está haciendo el usuario con análisis más avanzado
 */
const classifyQueryType = (query: string): 'conversation' | 'message' | 'stats' | 'general' => {
  const query_lower = query.toLowerCase();
  
  // Patrones para identificar consultas estadísticas
  const statsPatterns = [
    'estadística', 'estadísticas', 'cuantos', 'cuántos', 'cuantas', 'cuántas',
    'total', 'promedio', 'media', 'resumen general', 'gráfica', 'gráfico',
    'cantidad', 'número total', 'porcentaje', 'más activo', 'menos activo'
  ];
  
  // Patrones para identificar consultas sobre mensajes
  const messagePatterns = [
    'mensaje', 'mensajes', 'enviado', 'recibido', 'dijo', 'escribió', 'chat',
    'texto', 'contenido', 'adjunto', 'imagen', 'audio', 'video', 'media',
    'archivo', 'foto', 'última vez', 'contestó'
  ];
  
  // Patrones para identificar consultas sobre conversaciones
  const conversationPatterns = [
    'conversación', 'conversaciones', 'contacto', 'contactos', 'número',
    'números', 'cliente', 'clientes', 'persona', 'personas', 'chat',
    'chats', 'grupo', 'grupos', 'no leídos', 'pendiente', 'historial'
  ];
  
  // Verificar cada conjunto de patrones
  for (const pattern of statsPatterns) {
    if (query_lower.includes(pattern)) return 'stats';
  }
  
  for (const pattern of messagePatterns) {
    if (query_lower.includes(pattern)) return 'message';
  }
  
  for (const pattern of conversationPatterns) {
    if (query_lower.includes(pattern)) return 'conversation';
  }
  
  // Si no se identifica ningún patrón específico
  return 'general';
};

/**
 * Busca conversaciones relevantes según palabras clave y entidades
 */
const searchConversations = async (keywords: string[], entities: ReturnType<typeof extractEntities>): Promise<Conversacion[]> => {
  if (keywords.length === 0 && entities.nombres.length === 0 && entities.numeros.length === 0) {
    return [];
  }
  
  let query = supabase.from('conversaciones').select('*');
  
  // Primero buscar por entidades específicas (nombres y números)
  if (entities.nombres.length > 0 || entities.numeros.length > 0) {
    let filters = [];
    
    // Filtrar por nombres
    for (const nombre of entities.nombres) {
      filters.push(`nombre_contacto.ilike.%${nombre}%`);
    }
    
    // Filtrar por números
    for (const numero of entities.numeros) {
      filters.push(`numero.ilike.%${numero}%`);
    }
    
    if (filters.length > 0) {
      query = query.or(filters.join(','));
    }
  } 
  // Si no hay entidades específicas, buscar por palabras clave
  else if (keywords.length > 0) {
    let filters = [];
    
    for (const keyword of keywords) {
      filters.push(`nombre_contacto.ilike.%${keyword}%,numero.ilike.%${keyword}%,resumen.ilike.%${keyword}%,ultimo_mensaje_resumen.ilike.%${keyword}%`);
    }
    
    if (filters.length > 0) {
      query = query.or(filters.join(','));
    }
  }
  
  // Ordenar por fecha de actualización
  query = query.order('updated_at', { ascending: false }).limit(15);
  
  const { data, error } = await query;
  
  if (error) {
    console.error("Error buscando conversaciones:", error);
    return [];
  }
  
  return data || [];
};

/**
 * Busca mensajes relevantes según palabras clave y entidades usando búsqueda mejorada
 */
const searchMessages = async (keywords: string[], entities: ReturnType<typeof extractEntities>): Promise<Mensaje[]> => {
  if (keywords.length === 0 && entities.nombres.length === 0 && entities.numeros.length === 0 && entities.fechas.length === 0) {
    return [];
  }
  
  let query = supabase.from('mensajes').select('*');
  let hasFilter = false;
  
  // Filtrar por entidades específicas si existen
  if (entities.nombres.length > 0) {
    let nombreFilters = entities.nombres.map(nombre => `mensaje.ilike.%${nombre}%`);
    query = query.or(nombreFilters.join(','));
    hasFilter = true;
  }
  
  if (entities.numeros.length > 0) {
    let filters = entities.numeros.map(numero => `numero.ilike.%${numero}%`);
    if (hasFilter) {
      // Si ya hay filtros, usamos el método 'or'
      query = query.or(filters.join(','));
    } else {
      query = query.or(filters.join(','));
      hasFilter = true;
    }
  }
  
  if (entities.fechas.length > 0) {
    // Nota: Esto es simplificado, en producción necesitarías parsear y formatear las fechas correctamente
    let filters = entities.fechas.map(fecha => `fecha::text.ilike.%${fecha}%`);
    if (hasFilter) {
      query = query.or(filters.join(','));
    } else {
      query = query.or(filters.join(','));
      hasFilter = true;
    }
  }
  
  // Si no hay entidades o además de entidades hay keywords, buscar por palabras clave
  if (keywords.length > 0) {
    let filters = keywords.map(keyword => `mensaje.ilike.%${keyword}%`);
    if (hasFilter) {
      query = query.or(filters.join(','));
    } else {
      query = query.or(filters.join(','));
    }
  }
  
  const { data, error } = await query.order('fecha', { ascending: false }).limit(30);
  
  if (error) {
    console.error("Error buscando mensajes:", error);
    return [];
  }
  
  return data || [];
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
    
    // Mensajes enviados vs recibidos
    const { count: sentMessages, error: sentError } = await supabase
      .from('mensajes')
      .select('*', { count: 'exact', head: true })
      .eq('tipo', 'enviado');
    
    const { count: receivedMessages, error: receivedError } = await supabase
      .from('mensajes')
      .select('*', { count: 'exact', head: true })
      .eq('tipo', 'recibido');
    
    if (convError || msgError || unreadError || sentError || receivedError) {
      throw new Error('Error obteniendo estadísticas');
    }
    
    // Calcular porcentajes
    const sentPercentage = totalMessages ? Math.round((sentMessages! / totalMessages!) * 100) : 0;
    const receivedPercentage = totalMessages ? Math.round((receivedMessages! / totalMessages!) * 100) : 0;
    
    return `
## ESTADÍSTICAS GENERALES

- **Total de conversaciones**: ${totalConversations}
- **Total de mensajes**: ${totalMessages}
- **Conversaciones con mensajes no leídos**: ${unreadConversations}
- **Mensajes enviados**: ${sentMessages} (${sentPercentage}%)
- **Mensajes recibidos**: ${receivedMessages} (${receivedPercentage}%)
    `;
  } catch (error) {
    console.error("Error obteniendo estadísticas:", error);
    return "No se pudieron obtener estadísticas.";
  }
};

/**
 * Obtiene el contexto específico de la base de datos según la consulta del usuario
 * con formato mejorado para Gemini
 */
const getContextBasedOnQuery = async (userQuery: string): Promise<string> => {
  try {
    // 1. Extraer palabras clave de la consulta con lematización
    const keywords = extractQueryKeywords(userQuery);
    console.log("Palabras clave extraídas:", keywords);
    
    // 2. Extraer entidades nombradas (NER)
    const entities = extractEntities(userQuery);
    console.log("Entidades extraídas:", entities);
    
    // 3. Determinar tipo de consulta
    const queryType = classifyQueryType(userQuery);
    console.log("Tipo de consulta:", queryType);
    
    // 4. Obtener esquema de la base de datos (información general)
    const schema = getDatabaseSchema();
    
    // 5. Inicializar contexto con Markdown mejorado
    let context = "# CONTEXTO DE LA BASE DE DATOS\n\n";
    context += "## ESQUEMA\n```\n";
    context += schema + "\n```\n\n";
    
    // 6. Obtener información según tipo de consulta
    if (queryType === 'stats' || queryType === 'general') {
      const stats = await getGeneralStats();
      context += stats + "\n\n";
    }
    
    // 7. Búsqueda específica según palabras clave y entidades
    if (queryType === 'conversation' || queryType === 'general') {
      const conversations = await searchConversations(keywords, entities);
      
      if (conversations.length > 0) {
        context += "## CONVERSACIONES RELEVANTES\n\n";
        
        conversations.forEach((conv, i) => {
          context += `${i+1}. **ID**: ${conv.id} | **Contacto**: ${conv.nombre_contacto || conv.numero}\n`;
          context += `   **Último mensaje**: ${conv.ultimo_mensaje_resumen || 'Sin mensajes'}\n`;
          context += `   **Actualizado**: ${conv.updated_at}\n`;
          context += `   **No leídos**: ${conv.tiene_no_leidos ? `${conv.no_leidos_count} mensajes sin leer` : 'Todos leídos'}\n\n`;
        });
      } else {
        context += "## CONVERSACIONES RELEVANTES\nNo se encontraron conversaciones que coincidan con la consulta.\n\n";
      }
    }
    
    if (queryType === 'message' || queryType === 'general') {
      const messages = await searchMessages(keywords, entities);
      
      if (messages.length > 0) {
        context += "## MENSAJES RELEVANTES\n\n";
        
        messages.forEach((msg, i) => {
          context += `${i+1}. **ID Conv**: ${msg.conversation_id} | **Tipo**: ${msg.tipo} | **Fecha**: ${msg.fecha}\n`;
          context += `   **Mensaje**: "${msg.mensaje}"\n`;
          if (msg.media_url) {
            context += `   **Media**: ${msg.media_url}\n`;
          }
          context += `   **Estado**: ${msg.leido ? 'Leído' : 'No leído'}\n\n`;
        });
        
        // Si hay mensajes y conversación específica, obtener más contexto
        if (messages.length > 0) {
          const uniqueConvIds = [...new Set(messages.map(m => m.conversation_id).filter(Boolean))];
          
          if (uniqueConvIds.length === 1 && uniqueConvIds[0]) {
            const { data: conversationData } = await supabase
              .from('conversaciones')
              .select('nombre_contacto, numero')
              .eq('id', uniqueConvIds[0])
              .single();
            
            if (conversationData) {
              context += `## CONTEXTO ADICIONAL\n\nEstos mensajes pertenecen al contacto **${conversationData.nombre_contacto || conversationData.numero}**\n\n`;
            }
          } else if (uniqueConvIds.length > 1) {
            context += `## CONTEXTO ADICIONAL\n\nEstos mensajes pertenecen a ${uniqueConvIds.length} conversaciones diferentes.\n\n`;
          }
        }
      } else {
        context += "## MENSAJES RELEVANTES\nNo se encontraron mensajes que coincidan con la consulta.\n\n";
      }
    }
    
    return context;
  } catch (error) {
    console.error("Error generando contexto basado en consulta:", error);
    return "No se pudo generar contexto específico para esta consulta.";
  }
};

// Enviar un mensaje al API de Gemini con un prompt mejorado
const sendMessageToGemini = async (messages: {role: 'user' | 'assistant', content: string}[], dbSchema: string = ""): Promise<string> => {
  try {
    // Convertir mensajes al formato de Gemini
    const geminiMessages: GeminiMessage[] = [];
    
    // Analizar la última consulta del usuario para obtener contexto específico
    const lastUserMessage = messages.findLast(msg => msg.role === 'user');
    let contextualizedDBContext = "";
    
    if (lastUserMessage) {
      try {
        contextualizedDBContext = await getContextBasedOnQuery(lastUserMessage.content);
      } catch (error) {
        console.error("Error obteniendo contexto específico, usando general:", error);
        contextualizedDBContext = dbSchema;
      }
    }
    
    // Prompt mejorado con instrucciones más claras
    if (contextualizedDBContext) {
      geminiMessages.push({
        role: 'user',
        parts: [{ text: `Eres un asistente IA especializado en análisis de conversaciones de WhatsApp. 
    
# INSTRUCCIONES
- Tienes acceso a la siguiente información de la base de datos que DEBES utilizar para responder
- PRIORIZA siempre la información del contexto proporcionado sobre tu conocimiento general
- Si la pregunta es sobre un mensaje específico, CITA el mensaje exacto encontrado en "MENSAJES RELEVANTES"
- Si no encuentras la información exacta en el contexto, indícalo claramente
- Si necesitas dar una lista, usa formato de lista numerada
- Sé conciso y directo, pero amigable
- SIEMPRE responde en español

# DATOS DISPONIBLES:
${contextualizedDBContext}

# EJEMPLOS DE RESPUESTAS IDEALES:
Pregunta: "¿Cuántos mensajes tiene Juan?"
Respuesta: "Juan tiene 15 mensajes en la conversación #123. El último mensaje fue enviado el 15/06/2023."

Pregunta: "¿Cuál fue el último mensaje de María?"
Respuesta: "El último mensaje de María fue: 'Necesito los documentos para mañana' enviado el 22/07/2023."
` }]
      });
    }
    
    // Agregar los mensajes de la conversación
    messages.forEach(msg => {
      geminiMessages.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      });
    });
    
    const requestBody: GeminiRequest = {
      contents: geminiMessages,
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 2048
      }
    };
    
    // Llamar a la API de Gemini
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error en la API de Gemini: ${response.status} ${errorText}`);
    }
    
    const data = await response.json() as GeminiResponse;
    
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No se recibió respuesta de Gemini');
    }
    
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error("Error enviando mensaje a Gemini:", error);
    return "Lo siento, ocurrió un error al procesar tu solicitud. Por favor intenta de nuevo más tarde.";
  }
};

// Endpoint principal
serve(async (req) => {
  try {
    // Verificar método
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Método no permitido' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 405,
      });
    }
    
    // Parsear cuerpo de la solicitud
    const { messages } = await req.json();
    
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Formato de solicitud inválido' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      });
    }
    
    // Obtener respuesta de Gemini
    const response = await sendMessageToGemini(messages);
    
    // Retornar respuesta
    return new Response(JSON.stringify({ response }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error procesando solicitud:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
}); 