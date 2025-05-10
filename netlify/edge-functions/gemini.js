export default async (request, context) => {
  try {
    // Verificar que la solicitud sea POST
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Método no permitido' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Obtener la clave API de Gemini de las variables de entorno
    const apiKey = Netlify.env.get('GEMINI_API_KEY');
    
    // Usar clave hardcodeada como fallback para solucionar el problema de configuración
    const fallbackApiKey = "AIzaSyAbgZtjOrgCI-8DiUD8Jk95K-qJQCMNAeQ";
    const finalApiKey = apiKey || fallbackApiKey;
    
    // Log para depuración
    console.log("API Key disponible:", !!finalApiKey);
    
    if (!finalApiKey) {
      return new Response(JSON.stringify({ error: 'API key no configurada' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Extraer el cuerpo de la solicitud
    const body = await request.json();
    const { messages, dbContext } = body;

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Formato de mensajes inválido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Construir la solicitud a la API de Gemini
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro-exp-03-25:generateContent?key=${finalApiKey}`;
    
    // Crear el prompt con el contexto de la base de datos si está disponible
    const prompt = {
      contents: [
        {
          role: 'user',
          parts: [{ text: 'Eres un asistente de base de datos para CENYCA. Responde a preguntas sobre los datos usando el siguiente esquema de la base de datos:\n\n' + (dbContext || 'No hay contexto de base de datos disponible.') }]
        },
        ...messages.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        }))
      ],
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 1024,
      },
      safetySettings: [
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        }
      ]
    };

    // Realizar la solicitud a la API de Gemini
    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(prompt)
    });

    // Procesar la respuesta
    const data = await geminiResponse.json();
    
    if (!geminiResponse.ok) {
      return new Response(JSON.stringify({ 
        error: 'Error al comunicarse con Gemini API',
        details: data 
      }), {
        status: geminiResponse.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Extraer el texto de la respuesta
    let responseText = '';
    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
      responseText = data.candidates[0].content.parts[0].text;
    }

    // Devolver la respuesta
    return new Response(JSON.stringify({ 
      response: responseText,
      raw: data
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error en Edge Function:', error);
    return new Response(JSON.stringify({ 
      error: 'Error interno del servidor',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}; 