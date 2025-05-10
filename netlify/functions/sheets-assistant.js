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

  // Ahora esperamos un array de IDs
  const { sheetIds, userQuery } = body;
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
    const sheetNamesRead = []; // Para informar a Gemini
    const errorsReading = []; // Para informar al usuario si algo falla
    const targetSheetName = "mayo25"; // Nombre de la hoja a leer en cada spreadsheet
    let headers = null; // Para almacenar los encabezados una vez

    console.log(`Iniciando lectura para ${sheetIds.length} hoja(s)...`);

    for (const sheetId of sheetIds) {
      try {
        const readRange = `${targetSheetName}!A1:M1000`;
        console.log(`Intentando leer ${sheetId} - Rango: ${readRange}`);
        
        const sheetDataResponse = await sheets.spreadsheets.values.get({
          key: GOOGLE_SHEETS_API_KEY,
          spreadsheetId: sheetId,
          range: readRange,
        });
        
        const sheetData = sheetDataResponse.data.values;
        
        if (sheetData && sheetData.length > 0) {
          console.log(`Datos leídos de ${sheetId}: ${sheetData.length} filas`);
          // Guardar encabezados solo la primera vez
          if (!headers && sheetData.length > 0) {
              headers = sheetData[0]; 
          }
          const csvData = arrayToCsv(sheetData); // Convierte datos (sin encabezados)
          combinedData += `\n--- Datos de Spreadsheet ID: ${sheetId} ---\n${csvData}\n`;
          sheetNamesRead.push(sheetId); // O podríamos obtener el nombre real si tuviéramos permisos
        } else {
          console.warn(`No se encontraron datos en ${sheetId} (${targetSheetName})`);
          errorsReading.push(`No se encontraron datos en la hoja ${targetSheetName} del archivo ${sheetId}.`);
        }
      } catch (sheetsError) {
        console.error(`Error al leer Google Sheet ID ${sheetId}:`, sheetsError);
        const details = sheetsError.message.includes('403')
          ? `Verifica permisos para ${sheetId}.`
          : sheetsError.message.includes('404') 
            ? `No se encontró ${sheetId} o la hoja ${targetSheetName}.`
            : sheetsError.message;
        errorsReading.push(`Error al acceder a ${sheetId}: ${details}`);
      }
    }

    if (combinedData.trim() === "") {
        console.error("No se pudieron leer datos de ninguna hoja seleccionada.", errorsReading);
        const errorMsg = errorsReading.length > 0 ? errorsReading.join(' ') : 'No se pudieron leer datos de las hojas seleccionadas.';
        return {
            statusCode: 500, // O 404 si prefieres
            body: JSON.stringify({ error: 'Error de Lectura', details: errorMsg }),
            headers: { 'Content-Type': 'application/json' },
        };
    }

    // Limitar datos combinados
    const MAX_DATA_LENGTH = 60000; // Aumentar un poco para multi-hoja
    const truncatedData = combinedData.length > MAX_DATA_LENGTH 
        ? combinedData.substring(0, MAX_DATA_LENGTH) + "\n[...DATOS TRUNCADOS...]" 
        : combinedData;
    console.log(`Datos combinados formateados para Gemini (longitud: ${truncatedData.length})`);

    // Construir el prompt enriquecido
    const headerString = headers ? headers.join(', ') : "Número de Whatsapp, Nombre, Monto, Clave de Rastreo, Número de referencia, Número de folio, Número de afiliación, Banco Emisor, Fecha de operación, Hora de operación, Concepto, Comentarios del agente, Ws + Fecha+hora del mensaje";
    const prompt = `
      Eres un asistente experto en análisis de datos de Google Sheets.
      Has recibido datos combinados de las siguientes Hojas de Cálculo (identificadas por su ID): ${sheetNamesRead.join(', ')}.
      Cada hoja tiene la siguiente estructura de columnas (en orden):
      ${headerString}

      Analiza TODOS los siguientes datos extraídos de las hojas seleccionadas (formato CSV, separados por '--- Datos de Spreadsheet ID: ... ---'):
      --- DATOS COMBINADOS ---
      ${truncatedData}
      --- FIN DATOS COMBINADOS ---

      Responde a la siguiente pregunta del usuario de forma clara y concisa, basándote únicamente en los datos proporcionados:
      "${userQuery}"

      ${errorsReading.length > 0 ? `Nota: Hubo problemas al leer algunas hojas: ${errorsReading.join('; ')}` : ''}
    `;
    console.log("Prompt enriquecido construido para Gemini.");

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
      body: JSON.stringify({ response: text }),
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