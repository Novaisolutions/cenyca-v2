import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';
import { GoogleGenerativeAI } from '@google/generative-ai';

// --- Configuración de Clientes (Usar variables de entorno en producción) ---
const GOOGLE_SHEETS_API_KEY = process.env.GOOGLE_SHEETS_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Validar que las API keys estén presentes
if (!GOOGLE_SHEETS_API_KEY) {
  console.error('Error: GOOGLE_SHEETS_API_KEY no está configurada en las variables de entorno.');
}
if (!GEMINI_API_KEY) {
  console.error('Error: GEMINI_API_KEY no está configurada en las variables de entorno.');
}

// Cliente de Google Sheets
const sheets = google.sheets('v4');

// Cliente de Gemini
let model;
try {
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
} catch (error) {
  console.error("Error inicializando el cliente de Gemini:", error);
}

// Función auxiliar para convertir datos 2D a CSV simple
function arrayToCsv(data) {
  if (!data || data.length === 0) {
    return "";
  }
  // Omitir la primera fila (encabezados) si se incluyen en el prompt
  const dataRows = data.slice(1);
  return dataRows.map(row =>
    row.map(cell => {
      const cellStr = String(cell || "");
      if (cellStr.includes(',') || cellStr.includes('\"') || cellStr.includes('\n')) {
        return `"${cellStr.replace(/"/g, '""')}"`;
      }
      return cellStr;
    }).join(',')
  ).join('\n');
}

exports.handler = async (event, context) => {
  console.log("Función sheets-assistant invocada.");

  if (!GOOGLE_SHEETS_API_KEY || !GEMINI_API_KEY || !model) {
    console.error("Error crítico: Falta configuración de API Key o el modelo Gemini no se inicializó.");
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Configuration Error', details: 'API Key missing or Gemini client initialization failed.' }),
      headers: { 'Content-Type': 'application/json' },
    };
  }

  if (event.httpMethod !== 'POST') {
    console.warn("Método no permitido:", event.httpMethod);
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }), headers: { 'Content-Type': 'application/json' } };
  }

  let body;
  try {
    body = JSON.parse(event.body);
    console.log("Cuerpo de la solicitud recibido:", body);
  } catch (error) {
    console.error("Error parseando el cuerpo de la solicitud:", error);
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }), headers: { 'Content-Type': 'application/json' } };
  }

  // Ahora esperamos un array de IDs y el historial de conversación
  const { sheetIds, userQuery, conversationHistory = [] } = body;
  if (!sheetIds || !Array.isArray(sheetIds) || sheetIds.length === 0 || !userQuery) {
    console.error("Parámetros inválidos o faltantes: sheetIds (array) o userQuery");
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing/invalid parameters: sheetIds (array), userQuery' }),
      headers: { 'Content-Type': 'application/json' },
    };
  }

  console.log(`Consultando Sheet IDs: [${sheetIds.join(', ')}] con query: "${userQuery}"`);

  try {
    // --- Lógica Principal para Múltiples Hojas --- 
    let combinedData = "";
    const sheetsReadInfo = []; // Para informar a Gemini sobre las hojas leídas
    const errorsReading = []; // Para informar al usuario si algo falla
    let globalHeaders = null; // Para almacenar los encabezados una vez

    console.log(`Iniciando lectura para ${sheetIds.length} archivo(s)...`);

    for (const sheetId of sheetIds) {
      try {
        // Primero, obtener información sobre todas las hojas en este spreadsheet
        console.log(`Obteniendo información del spreadsheet ${sheetId}...`);
        
        const spreadsheetInfo = await sheets.spreadsheets.get({
          key: GOOGLE_SHEETS_API_KEY,
          spreadsheetId: sheetId,
        });
        
        const sheetNames = spreadsheetInfo.data.sheets.map(sheet => sheet.properties.title);
        console.log(`Hojas encontradas en ${sheetId}: ${sheetNames.join(', ')}`);
        
        // Leer cada hoja del spreadsheet
        for (const sheetName of sheetNames) {
          try {
            const readRange = `'${sheetName}'!A1:M1000`; // Usar comillas para manejar nombres con espacios
            console.log(`Leyendo ${sheetId} - Hoja: ${sheetName}`);
            
            const sheetDataResponse = await sheets.spreadsheets.values.get({
              key: GOOGLE_SHEETS_API_KEY,
              spreadsheetId: sheetId,
              range: readRange,
            });
            
            const sheetData = sheetDataResponse.data.values;
            
            if (sheetData && sheetData.length > 0) {
              console.log(`Datos leídos de ${sheetId}/${sheetName}: ${sheetData.length} filas`);
              
              // Guardar encabezados solo la primera vez
              if (!globalHeaders && sheetData.length > 0) {
                globalHeaders = sheetData[0]; 
              }
              
              const csvData = arrayToCsv(sheetData); // Convierte datos
              combinedData += `\n--- Archivo: ${sheetId}, Hoja: ${sheetName} ---\n${csvData}\n`;
              sheetsReadInfo.push({
                spreadsheetId: sheetId,
                sheetName: sheetName,
                rowCount: sheetData.length
              });
            } else {
              console.warn(`No se encontraron datos en ${sheetId}/${sheetName}`);
            }
          } catch (sheetError) {
            console.error(`Error al leer la hoja ${sheetName} del archivo ${sheetId}:`, sheetError);
            // Continuar con la siguiente hoja si hay un error en una específica
          }
        }
      } catch (sheetsError) {
        console.error(`Error al acceder al spreadsheet ${sheetId}:`, sheetsError);
        const details = sheetsError.message.includes('403')
          ? `Verifica permisos para ${sheetId}.`
          : sheetsError.message.includes('404') 
            ? `No se encontró el archivo ${sheetId}.`
            : sheetsError.message;
        errorsReading.push(`Error al acceder a ${sheetId}: ${details}`);
      }
    }

    if (combinedData.trim() === "") {
      console.error("No se pudieron leer datos de ninguna hoja seleccionada.", errorsReading);
      const errorMsg = errorsReading.length > 0 ? errorsReading.join(' ') : 'No se pudieron leer datos de las hojas seleccionadas.';
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Error de Lectura', details: errorMsg }),
        headers: { 'Content-Type': 'application/json' },
      };
    }

    // Limitar datos combinados
    const MAX_DATA_LENGTH = 80000; // Aumentar para acomodar múltiples hojas
    const truncatedData = combinedData.length > MAX_DATA_LENGTH 
      ? combinedData.substring(0, MAX_DATA_LENGTH) + "\n[...DATOS TRUNCADOS...]" 
      : combinedData;
    console.log(`Datos combinados formateados para Gemini (longitud: ${truncatedData.length})`);

    // Preparar el historial de conversación para el prompt
    let conversationContext = "";
    if (conversationHistory && conversationHistory.length > 0) {
      conversationContext = "\n\nHistorial de conversación anterior:\n";
      conversationHistory.forEach((msg, index) => {
        conversationContext += `${msg.role === 'user' ? 'Usuario' : 'Asistente'}: ${msg.content}\n`;
      });
      conversationContext += "\n---\n";
    }

    // Construir el prompt enriquecido
    const headerString = globalHeaders ? globalHeaders.join(', ') : "Número de Whatsapp, Nombre, Monto, Clave de Rastreo, Número de referencia, Número de folio, Número de afiliación, Banco Emisor, Fecha de operación, Hora de operación, Concepto, Comentarios del agente, Ws + Fecha+hora del mensaje";
    
    // Crear resumen de hojas leídas
    const sheetsReadSummary = sheetsReadInfo.map(info => 
      `- ${info.sheetName} (${info.rowCount} filas)`
    ).join('\n');
    
    const prompt = `
      Eres un asistente experto en análisis de datos de Google Sheets especializado en información financiera.
      ${conversationContext}
      Has recibido datos de los siguientes archivos y hojas:
      ${sheetsReadSummary}
      
      Estructura esperada de columnas (puede variar entre hojas):
      ${headerString}

      Datos extraídos (formato CSV, separados por archivo y hoja):
      --- DATOS COMBINADOS ---
      ${truncatedData}
      --- FIN DATOS COMBINADOS ---

      Responde a la siguiente pregunta del usuario de forma clara y concisa, basándote en los datos proporcionados.
      Si la pregunta hace referencia a información del historial de conversación, úsalo para dar contexto a tu respuesta.
      
      Pregunta del usuario: "${userQuery}"

      ${errorsReading.length > 0 ? `Nota: Hubo problemas al leer algunos archivos: ${errorsReading.join('; ')}` : ''}
    `;
    console.log("Prompt enriquecido construido para Gemini con historial de conversación.");

    // Llamar a Gemini
    console.log("Enviando solicitud a Gemini API...");
    let text;
    try {
      const result = await model.generateContent(prompt);
      const geminiResponse = result.response;
      text = geminiResponse.text();
      console.log("Respuesta obtenida de Gemini.");
    } catch (geminiError) {
      console.error("Error al llamar a Gemini API:", geminiError);
      throw new Error(`Error al comunicarse con el asistente de IA: ${geminiError.message}`);
    }
    
    // Devolver la respuesta
    console.log("Enviando respuesta exitosa al cliente.");
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        response: text,
        sheetsRead: sheetsReadInfo // Información sobre qué hojas se leyeron
      }),
      headers: { 'Content-Type': 'application/json' },
    };

  } catch (error) {
    console.error("Error durante la ejecución de la función:", error);
    const errorMessage = error.message || 'Unknown error';
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error procesando la solicitud', details: errorMessage }),
      headers: { 'Content-Type': 'application/json' },
    };
  }
}; 