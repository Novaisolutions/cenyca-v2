// Eliminar la importación de buffer que no es necesaria en Node.js
// import { Buffer } from 'buffer';

// Modificar la exportación para que sea función normal de Netlify
exports.handler = async (event, context) => {
  try {
    // Verificar que la solicitud sea POST
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Método no permitido' }),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    // Obtener la clave API de Gemini
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'API key no configurada' }),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    // El manejo de formData es diferente en funciones normales de Netlify
    // Vamos a usar un enfoque más simple para leer los archivos
    try {
      console.log('Headers recibidos:', event.headers);
      console.log('Body recibido (parcial):', event.body.substring(0, 100) + '...');
      
      // Verificar si tenemos body y content-type
      if (!event.body) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'No se recibieron datos' }),
          headers: { 'Content-Type': 'application/json' }
        };
      }
      
      const contentType = event.headers['content-type'] || '';
      if (!contentType.includes('multipart/form-data')) {
        return {
          statusCode: 400,
          body: JSON.stringify({ 
            error: 'Formato incorrecto', 
            message: 'Se esperaba multipart/form-data, recibido: ' + contentType 
          }),
          headers: { 'Content-Type': 'application/json' }
        };
      }
      
      // Usar busboy para parsear formdata
      const busboy = require('busboy');
      const fs = require('fs');
      const os = require('os');
      const path = require('path');
      
      const bb = busboy({ headers: event.headers });
      
      // Preparar para guardar archivos
      const files = {};
      let fields = {};
      
      // Crear directorio temporal si no existe
      const tmpdir = os.tmpdir();
      
      // Manejar campos
      bb.on('field', (fieldname, val) => {
        fields[fieldname] = val;
      });
      
      // Manejar archivos
      bb.on('file', (fieldname, file, info) => {
        const { filename, encoding, mimeType } = info;
        console.log(`Procesando archivo: ${fieldname}, filename: ${filename}`);
        
        const filepath = path.join(tmpdir, `${fieldname}_${Date.now()}`);
        files[fieldname] = {
          filepath,
          filename,
          mimetype: mimeType
        };
        
        const writeStream = fs.createWriteStream(filepath);
        file.pipe(writeStream);
      });
      
      // Esperar a que se procese todo el multipart
      const result = await new Promise((resolve, reject) => {
        bb.on('close', () => {
          resolve({ fields, files });
        });
        
        bb.on('error', (error) => {
          reject(error);
        });
        
        // Enviar datos al parser
        if (event.isBase64Encoded) {
          const bufferBody = Buffer.from(event.body, 'base64');
          bb.write(bufferBody);
          bb.end();
        } else {
          bb.write(event.body);
          bb.end();
        }
      });
      
      // Verificar que tenemos los archivos necesarios
      if (!files.botFinanzas || !files.movimientosCheque) {
        return {
          statusCode: 400,
          body: JSON.stringify({ 
            error: 'Archivos faltantes', 
            message: 'Se requieren ambos archivos: botFinanzas y movimientosCheque' 
          }),
          headers: { 'Content-Type': 'application/json' }
        };
      }
      
      // Leer los archivos
      const botFinanzasBuffer = fs.readFileSync(files.botFinanzas.filepath);
      const movimientosChequeBuffer = fs.readFileSync(files.movimientosCheque.filepath);
      
      // Verificar que el contenido sea realmente texto CSV (primeros bytes)
      const botFinanzasText = botFinanzasBuffer.slice(0, 100).toString();
      const movimientosChequeText = movimientosChequeBuffer.slice(0, 100).toString();

      if (!botFinanzasText.includes(',') && !botFinanzasText.includes(';')) {
        return {
          statusCode: 400,
          body: JSON.stringify({ 
            error: 'Formato de archivo inválido', 
            message: 'El archivo Bot_Finanzas no parece ser un CSV válido (debe contener delimitadores como comas o puntos y comas)' 
          }),
          headers: { 'Content-Type': 'application/json' }
        };
      }

      if (!movimientosChequeText.includes(',') && !movimientosChequeText.includes(';')) {
        return {
          statusCode: 400,
          body: JSON.stringify({ 
            error: 'Formato de archivo inválido', 
            message: 'El archivo MovimientosCheque no parece ser un CSV válido (debe contener delimitadores como comas o puntos y comas)' 
          }),
          headers: { 'Content-Type': 'application/json' }
        };
      }

      // Convertir Buffer a Base64
      const botFinanzasBase64 = botFinanzasBuffer.toString('base64');
      const movimientosChequeBase64 = movimientosChequeBuffer.toString('base64');

      // Configurar un timeout para la solicitud a Gemini
      // En funciones regulares de Netlify tenemos hasta 10 minutos (600000ms)
      const timeoutDuration = 540000; // 9 minutos (dejamos margen)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);

      // Definir los tipos MIME
      const botFileMimeType = 'text/csv';
      const movimientosFileMimeType = 'text/csv';

      // Construir la solicitud a la API de Gemini
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro-exp-03-25:generateContent?key=${apiKey}`; // Modelo experimental nuevo que el usuario ha probado
      
      const systemInstruction = `Eres un Asistente Financiero Inteligente, especializado en conciliación bancaria, meticuloso y eficiente.

Objetivo Principal: Conciliar los registros de movimientos financieros capturados por un bot de WhatsApp (archivo Bot_Finanzas.csv) con el estado de cuenta bancario oficial (archivo movimientos_cheque.csv). Tu meta es identificar qué transacciones reportadas por el bot se reflejan en el banco y cuáles no, explicando el motivo de la no conciliación para cada caso.

Archivos de Entrada:

Bot_Finanzas.csv:

*   Origen: Capturas automáticas de WhatsApp.
*   Contenido Principal: Registros de transferencias recibidas y depósitos.
*   Estructura: Columnas con información como Nombre (del remitente/cliente asociado), Monto, Fecha+hora del mensaje (cuando se recibió el comprobante), Fecha de operación, Hora de operación, y diversos identificadores como Clave de Rastreo, Número de referencia, Número de folio, Concepto, Banco Emisor, Banco Receptor. Las columnas pueden no tener nombres estándar ni estar siempre completas.

movimientos_cheque.csv:

*   Origen: Estado de cuenta oficial del banco (formato CSV).
*   Contenido Principal: Todos los movimientos de la cuenta (cargos y abonos).
*   Estructura: Columnas con información como Fecha, Hora, Descripcion, Cargo/Abono, Importe, Referencia, Concepto, Clave de Rastreo, Nombre Ordenante, Banco Participante. Los nombres y la estructura de las columnas difieren del archivo del bot.

Proceso Detallado de Conciliación:

1.  **Análisis y Mapeo de Columnas:** Examina ambos archivos para identificar las columnas que contienen información comparable, aunque se llamen diferente. Ejemplos clave:
    *   \`Monto\` (Bot) vs. \`Importe\` (Banco, filtrando por Abonos '+')
    *   \`Fecha de operación\` (Bot) vs. \`Fecha\` (Banco) - Considera formatos diferentes y posible desfase de 1 día.
    *   \`Hora de operación\` (Bot) vs. \`Hora\` (Banco) - Considera formatos diferentes y ventana de tolerancia (ej. +/- 15 min).
    *   \`Clave de Rastreo\` (Bot) vs. \`Clave de Rastreo\` (Banco) - Prioridad alta si no es \"No disponible\".
    *   \`Número de referencia\` (Bot) vs. \`Referencia\` (Banco)
    *   \`Número de folio\` (Bot) vs. \`Referencia\` o parte de \`Descripcion\`/\`Concepto\` (Banco)
    *   \`Concepto\` (Bot) vs. \`Concepto\` / \`Descripcion\` (Banco)
    *   \`Nombre\` (Bot) vs. \`Nombre Ordenante\` (Banco) - Considera coincidencia parcial/fuzzy.

2.  **Estrategia de Coincidencia (Matching):** Para cada registro del archivo \`Bot_Finanzas.csv\`, intenta encontrar una contraparte *única y plausible* en los abonos (+) del archivo \`movimientos_cheque.csv\`, utilizando los siguientes criterios en orden de prioridad:
    *   **Coincidencia Exacta por Identificador Único:** Prioriza si \`Clave de Rastreo\` (no \"No disponible\") es idéntica, verificando \`Importe\`/\`Monto\` igual/muy similar y \`Fecha\` misma/cercana (±1 día).
    *   **Coincidencia por Combinación Fuerte:** Sin clave o sin coincidencia, busca registros que coincidan simultáneamente en \`Importe\`/\`Monto\` (exacto), \`Fecha\` (exacta/adyacente), \`Hora\` (cercana si disponible) Y al menos uno de los siguientes que ayuden a desambiguar: \`Número de referencia\`/\`Referencia\`, \`Folio\`, \`Nombre\`/\`Nombre Ordenante\` (parcial/total).
    *   **Coincidencia por Combinación Flexible:** Si falla lo anterior, busca coincidencias por \`Importe\`/\`Monto\` y \`Fecha\`, y revisa si \`Concepto\`/\`Descripcion\` o \`Nombre Ordenante\` contienen pistas fuertes (ej., nombre alumno, nro. factura).

3.  **Manejo de Duplicados y Ambigüedades:**
    *   Si un registro del bot es duplicado de otro ya procesado (info similar) y solo hay una transacción bancaria, marca solo uno como conciliado.
    *   Si hay ambigüedad (un registro del bot podría coincidir con múltiples del banco o viceversa), prioriza la coincidencia más fuerte. Si persiste, marca como NO conciliado para revisión manual.

Entregable (Output):

Genera un **único objeto JSON** que contenga toda la información de salida, estructurado de la siguiente manera:

\`\`\`json
{
  \"resumen\": {
    \"total_procesados\": <Número total de registros de Bot_Finanzas.csv>,
    \"total_conciliados\": <Número de movimientos conciliados>,
    \"total_no_conciliados\": <Número de movimientos NO conciliados>
  },
  \"movimientos_no_conciliados\": [
    {
      \"Nombre\": \"<Nombre del Bot_Finanzas.csv>\",
      \"Monto\": <Monto numérico del Bot_Finanzas.csv>,
      \"Fecha_operacion\": \"<Fecha de operación YYYY-MM-DD del Bot_Finanzas.csv>\",
      \"Clave_Rastreo\": \"<Clave de Rastreo del Bot_Finanzas.csv o 'No disponible'>\",
      \"Numero_referencia\": \"<Número de referencia del Bot_Finanzas.csv o 'No disponible'>\",
      \"Numero_folio\": \"<Número de folio del Bot_Finanzas.csv o 'No disponible'>\",
      \"Concepto\": \"<Concepto del Bot_Finanzas.csv o 'No disponible'>\",
      \"Nota\": \"<Breve explicación específica del posible motivo por el cual este movimiento no fue conciliado (ej., 'No se encontró coincidencia por Clave/Referencia/Monto/Fecha', 'Posible duplicado de registro conciliado X', 'Monto difiere significativamente del registro bancario Y', 'Fecha fuera del rango del estado de cuenta', 'Sin identificadores claros para buscar', 'Registro duplicado en origen').>\"
    },
    // ... (más objetos para cada movimiento no conciliado)
  ]
}
\`\`\``;

      // Reducir cantidad de tokens en prompt y respuesta para mayor eficiencia
      const prompt = {
        contents: [
          {
            role: "user",
            parts: [
              {
                inline_data: {
                  mime_type: botFileMimeType,
                  data: botFinanzasBase64
                }
              },
              {
                inline_data: {
                  mime_type: movimientosFileMimeType,
                  data: movimientosChequeBase64
                }
              },
              { text: "Por favor concilia estos dos archivos CSV de datos financieros." }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          response_mime_type: "text/plain",
          // Sin responseSchema, tal como lo solicitó el usuario
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ],
        systemInstruction: {
          parts: [
            { text: systemInstruction }
          ]
        }
      };

      try {
        // Realizar la solicitud a la API de Gemini con manejo de timeout
        console.log('Iniciando solicitud a Gemini API...');
        const geminiResponse = await fetch(geminiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(prompt),
          signal: controller.signal
        });
        
        // Limpiar el timeout ya que la solicitud se completó
        clearTimeout(timeoutId);
        console.log(`Respuesta de Gemini recibida con estado: ${geminiResponse.status}`);
        
        // Procesar la respuesta
        const data = await geminiResponse.json();
        
        if (!geminiResponse.ok) {
          console.error('Error en la respuesta de Gemini API:', data);
          return {
            statusCode: 502, // Gateway error
            body: JSON.stringify({ 
              error: 'Error en Gemini API',
              status: geminiResponse.status,
              details: data.error ? data.error.message : 'Error desconocido'
            }),
            headers: { 'Content-Type': 'application/json' }
          };
        }

        // Extraer el resultado en formato JSON
        let resultado = {};
        let processingError = '';
        
        // Manejo de la respuesta
        if (data.candidates && 
            data.candidates[0] && 
            data.candidates[0].content && 
            data.candidates[0].content.parts && 
            data.candidates[0].content.parts[0]) {
          
          // Intentar extraer el JSON de la respuesta de texto
          if (data.candidates[0].content.parts[0].text) {
            const text = data.candidates[0].content.parts[0].text;
            console.log('Respuesta recibida en formato texto, buscando JSON...');
            
            // Buscar texto JSON entre llaves {}
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              try {
                resultado = JSON.parse(jsonMatch[0]);
                console.log('Respuesta JSON extraída de texto');
              } catch (parseError) {
                console.error("Error analizando texto JSON:", parseError);
                processingError = 'Error analizando JSON extraído del texto: ' + parseError.message;
              }
            } else {
              processingError = 'No se encontró estructura JSON en la respuesta de texto';
              console.error(processingError);
              // Guardar una parte de la respuesta de texto para diagnóstico
              processingError += '. Respuesta recibida: ' + text.substring(0, 200) + '...';
            }
          } else {
            processingError = 'Formato de respuesta inesperado de Gemini API';
            console.error(processingError, data.candidates[0].content);
          }
        } else {
          processingError = 'Respuesta vacía o incompleta de Gemini API';
          console.error(processingError, data);
        }
        
        // Si no se pudo extraer el resultado, crear una respuesta de fallback
        if (!resultado.totalProcesados && (!resultado.movimientosNoConciliados || !Array.isArray(resultado.movimientosNoConciliados))) {
          console.log('Generando respuesta de fallback por datos incompletos');
          
          // Verificar si tenemos alguna información parcial que podamos utilizar
          const movimientosNoConciliados = Array.isArray(resultado.movimientosNoConciliados) ? 
                                           resultado.movimientosNoConciliados : [];
          
          resultado = {
            totalProcesados: resultado.totalProcesados || 0,
            totalConciliados: resultado.totalConciliados || 0,
            totalNoConciliados: resultado.totalNoConciliados || 0,
            movimientosNoConciliados: movimientosNoConciliados,
            error: "No se pudo procesar completamente la conciliación. Por favor verifica el formato de tus archivos CSV e intenta nuevamente." + 
                   (processingError ? ` Detalle técnico: ${processingError}` : '')
          };
        }

        // Limpiar archivos temporales después de procesarlos
        try {
          fs.unlinkSync(files.botFinanzas.filepath);
          fs.unlinkSync(files.movimientosCheque.filepath);
        } catch (cleanupError) {
          console.error('Error al limpiar archivos temporales:', cleanupError);
        }

        // Devolver la respuesta
        return {
          statusCode: 200,
          body: JSON.stringify(resultado),
          headers: { 'Content-Type': 'application/json' }
        };
      } catch (fetchError) {
        // Manejar errores de timeout u otros errores de fetch
        clearTimeout(timeoutId);
        console.error('Error en fetch a Gemini API:', fetchError);
        
        // Limpiar archivos temporales en caso de error
        try {
          fs.unlinkSync(files.botFinanzas.filepath);
          fs.unlinkSync(files.movimientosCheque.filepath);
        } catch (cleanupError) {
          console.error('Error al limpiar archivos temporales:', cleanupError);
        }
        
        if (fetchError.name === 'AbortError') {
          // Crear una respuesta útil incluso cuando ocurre un timeout
          return {
            statusCode: 200, // Enviamos un código 200 en lugar de 504 para que la interfaz lo maneje mejor
            body: JSON.stringify({ 
              error: 'Procesamiento interrumpido',
              message: 'La API de Gemini tardó más tiempo del esperado. Por favor intenta nuevamente. Este error no está relacionado con el tamaño de tus archivos.',
              totalProcesados: 0,
              totalConciliados: 0,
              totalNoConciliados: 0,
              movimientosNoConciliados: []
            }),
            headers: { 'Content-Type': 'application/json' }
          };
        }
        
        return {
          statusCode: 500,
          body: JSON.stringify({ 
            error: 'Error al procesar la solicitud',
            message: fetchError.message || 'Error desconocido',
            tipo: fetchError.name || 'Error desconocido'
          }),
          headers: { 'Content-Type': 'application/json' }
        };
      }
    } catch (formError) {
      console.error('Error procesando FormData:', formError);
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Error procesando formulario', 
          message: formError.message || 'No se pudieron procesar los archivos enviados' 
        }),
        headers: { 'Content-Type': 'application/json' }
      };
    }
  } catch (error) {
    console.error('Error en la función de Netlify:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Error interno del servidor',
        message: error.message || 'Error desconocido en el procesamiento',
        tipo: error.name || 'Error desconocido'
      }),
      headers: { 'Content-Type': 'application/json' }
    };
  }
}; 