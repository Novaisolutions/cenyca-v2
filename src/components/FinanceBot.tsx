import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, FileSpreadsheet, AlertCircle, BarChart, ArrowRight, RefreshCw, Download, AlertTriangle, Clock, Info, Coffee, Lock, Calendar, Copy, CheckCircle } from 'lucide-react';
import Papa from 'papaparse';
import { incrementConciliationCount, checkConciliationLimit } from '../services/statsService';

// Clave API de Gemini (en producción debe estar en el backend)
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "AIzaSyAbgZtjOrgCI-8DiUD8Jk95K-qJQCMNAeQ";

interface FinanceBotProps {
  onClose: () => void;
}

interface ConciliationResult {
  totalProcesados: number;
  totalConciliados: number;
  totalNoConciliados: number;
  movimientosNoConciliados: {
    nombre: string;
    monto: number;
    fecha: string;
    claveRastreo: string;
    numeroReferencia: string;
    numeroFolio: string;
    concepto: string;
    nota: string;
    whatsapp?: string;
  }[];
  movimientosConciliados?: {
    nombre: string;
    monto: number;
    fecha: string;
    claveRastreo: string;
    numeroReferencia: string;
    numeroFolio: string;
    concepto: string;
  }[];
  todosLosMovimientos?: {
    nombre: string;
    monto: number;
    fecha: string;
    claveRastreo: string;
    numeroReferencia: string;
    numeroFolio: string;
    concepto: string;
    estado: string;
    nota: string;
    whatsapp?: string;
  }[];
  resumenGeneral: string;
  error?: string;
}

// Función auxiliar para obtener el límite mensual de conciliaciones
const getConciliationLimitInfo = async (): Promise<{ used: number; remaining: number; isLimitReached: boolean }> => {
  try {
    const isLimitReached = await checkConciliationLimit();
    return {
      used: isLimitReached ? 10 : 5, // Valores aproximados
      remaining: isLimitReached ? 0 : 5,
      isLimitReached
    };
  } catch (error) {
    console.error('Error al obtener límite de conciliaciones:', error);
    return {
      used: 0,
      remaining: 10,
      isLimitReached: false
    };
  }
};

const FinanceBot = ({ onClose }: FinanceBotProps) => {
  const [botFinanzasFile, setBotFinanzasFile] = useState<File | null>(null);
  const [movimientosChequeFile, setMovimientosChequeFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resultado, setResultado] = useState<ConciliationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorDetail, setErrorDetail] = useState('');
  const [errorType, setErrorType] = useState<'file' | 'server' | 'timeout' | 'format' | 'limit' | ''>('');
  const [showDetailedError, setShowDetailedError] = useState(false);
  const botFileInputRef = useRef<HTMLInputElement>(null);
  const chequeFileInputRef = useRef<HTMLInputElement>(null);
  const [monthlyLimit, setMonthlyLimit] = useState({
    used: 0,
    remaining: 10,
    isLimitReached: false
  });
  const [showPaymentReminder, setShowPaymentReminder] = useState(true);
  const [daysUntilPayment, setDaysUntilPayment] = useState(5);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Verificar límite mensual al cargar el componente
  useEffect(() => {
    const checkLimit = async () => {
      try {
        const limitInfo = await getConciliationLimitInfo();
      setMonthlyLimit(limitInfo);

      // Si ya se alcanzó el límite, mostrar advertencia
      if (limitInfo.isLimitReached) {
        setErrorMessage('Has alcanzado el límite mensual de conciliaciones');
        setErrorDetail('Solo puedes realizar 10 conciliaciones por mes. El contador se reiniciará el próximo mes.');
        setErrorType('limit');
        }
      } catch (error) {
        console.error('Error al verificar límite:', error);
        // Establecer valores por defecto si hay error
        setMonthlyLimit({ used: 0, remaining: 10, isLimitReached: false });
      }
    };
    
    checkLimit();
  }, []);

  // Verificar proximidad a la fecha de pago
  useEffect(() => {
    // Cambiando la fecha de pago al día 10 de cada mes (antes era el 15)
    const checkPaymentDate = () => {
      const today = new Date();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      
      // Fecha de pago este mes (día 10)
      const paymentDate = new Date(currentYear, currentMonth, 10);
      
      // Si ya pasó el día 10, la próxima fecha de pago es el mes siguiente
      if (today.getDate() > 10) {
        paymentDate.setMonth(paymentDate.getMonth() + 1);
      }
      
      // Calcular diferencia en días
      const diffTime = paymentDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      setDaysUntilPayment(diffDays);
      setShowPaymentReminder(true);
    };
    
    checkPaymentDate();
    
    // Verificar diariamente
    const intervalId = setInterval(checkPaymentDate, 24 * 60 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, []);

  // Añadir passive event listeners para eventos touch
  useEffect(() => {
    const options = { passive: true };
    const scrollContainers = document.querySelectorAll('.overflow-y-auto');
    
    const touchStartHandler = () => {}; // Función vacía, solo para tener un listener pasivo
    const touchMoveHandler = () => {};
    
    scrollContainers.forEach(container => {
      container.addEventListener('touchstart', touchStartHandler, options);
      container.addEventListener('touchmove', touchMoveHandler, options);
    });
    
    return () => {
      scrollContainers.forEach(container => {
        container.removeEventListener('touchstart', touchStartHandler);
        container.removeEventListener('touchmove', touchMoveHandler);
      });
    };
  }, [resultado]); // Re-aplicar cuando cambie el resultado (ya que se renderizan nuevos contenedores)

  const handleBotFinanzasChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.name.endsWith('.csv')) {
        // Verificar tamaño de archivo
        if (file.size > 5 * 1024 * 1024) { // 5MB
          setErrorMessage('El archivo no debe superar los 5MB');
          setErrorDetail('');
          setErrorType('file');
          setBotFinanzasFile(null);
        } else {
          setBotFinanzasFile(file);
          setErrorMessage('');
          setErrorDetail('');
          setErrorType('');
          setShowDetailedError(false);
        }
      } else {
        setErrorMessage('El archivo debe ser de tipo CSV');
        setErrorDetail('Asegúrate de que el archivo tenga la extensión .csv');
        setErrorType('file');
        setBotFinanzasFile(null);
      }
    }
  };

  const handleMovimientosChequeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.name.endsWith('.csv')) {
        // Verificar tamaño de archivo
        if (file.size > 5 * 1024 * 1024) { // 5MB
          setErrorMessage('El archivo no debe superar los 5MB');
          setErrorDetail('');
          setErrorType('file');
          setMovimientosChequeFile(null);
        } else {
          setMovimientosChequeFile(file);
          setErrorMessage('');
          setErrorDetail('');
          setErrorType('');
          setShowDetailedError(false);
        }
      } else {
        setErrorMessage('El archivo debe ser de tipo CSV');
        setErrorDetail('Asegúrate de que el archivo tenga la extensión .csv');
        setErrorType('file');
        setMovimientosChequeFile(null);
      }
    }
  };

  const parseCSV = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors && results.errors.length > 0) {
            reject(new Error(`Error al parsear CSV: ${results.errors[0].message}`));
            return;
          }
          // Registrar las columnas disponibles para diagnóstico
          if (results.data && results.data.length > 0 && typeof results.data[0] === 'object' && results.data[0] !== null) {
            console.log("Columnas encontradas en CSV:", Object.keys(results.data[0] as object));
          }
          resolve(results.data);
        },
        error: (error) => {
          reject(error);
        }
      });
    });
  };

  const procesarConciliacion = async () => {
    try {
      // Ya no mostramos el popup de factura vencida porque el pago fue realizado
      // window.dispatchEvent(new CustomEvent('showInvoicePopup'));
      
      // Continuar con el proceso normal de conciliación
      setIsLoading(true);
      setErrorMessage('');
      setErrorDetail('');
      
      // Verificar que ambos archivos están cargados
      if (!botFinanzasFile || !movimientosChequeFile) {
        setErrorMessage('Por favor, selecciona ambos archivos CSV antes de continuar.');
        setIsLoading(false);
        return;
      }

      // Verificar límite mensual antes de proceder
      const limitInfo = await getConciliationLimitInfo();
      setMonthlyLimit(limitInfo);
      
      if (limitInfo.isLimitReached) {
        setErrorMessage('Has alcanzado el límite mensual de conciliaciones');
        setErrorDetail('Solo puedes realizar 10 conciliaciones por mes. El contador se reiniciará el próximo mes.');
        setErrorType('limit');
        setIsLoading(false);
        return;
      }

      // Incrementar el contador de conciliaciones
      const success = await incrementConciliationCount();
      
      if (!success) {
        // Si no se pudo incrementar el contador, probablemente se alcanzó el límite
        const updatedLimit = await getConciliationLimitInfo();
        setMonthlyLimit(updatedLimit);
        
        if (updatedLimit.isLimitReached) {
          setIsLoading(false);
          setErrorMessage('Has alcanzado el límite mensual de conciliaciones');
          setErrorDetail('Solo puedes realizar 10 conciliaciones por mes. El contador se reiniciará el próximo mes.');
          setErrorType('limit');
          return;
        }
      }
      
      const botData = await parseCSV(botFinanzasFile);
      const movimientosData = await parseCSV(movimientosChequeFile);
      
      console.log(`Datos de Bot (${botData.length} registros) y Movimientos (${movimientosData.length} registros) parseados`);
      
      if (!botData.length || !movimientosData.length) {
        throw new Error('Los archivos CSV no contienen datos o el formato es incorrecto');
      }
      
      const botDataString = Papa.unparse(botData);
      const movimientosDataString = Papa.unparse(movimientosData);
      
      const systemInstruction = `Eres un Asistente Financiero Inteligente, especializado en conciliación bancaria, meticuloso y eficiente.

**Objetivo Principal:** Conciliar los registros de movimientos financieros capturados por un bot de WhatsApp (archivo Bot_Finanzas.csv) con el estado de cuenta bancario oficial (archivo movimientos_cheque.csv). Tu meta es identificar qué transacciones reportadas por el bot se reflejan en el banco y cuáles no, **reportando el estado de cada transacción del bot** y explicando el motivo de la no conciliación solo para los casos correspondientes.

**Archivos de Entrada:**

*   **Bot_Finanzas.csv:**
    *   Origen: Capturas automáticas de WhatsApp.
    *   Contenido Principal: Registros de transferencias recibidas y depósitos.
    *   Estructura: Columnas con información como Nombre (del remitente/cliente asociado), Monto, Fecha+hora del mensaje (cuando se recibió el comprobante), Fecha de operación, Hora de operación, y diversos identificadores como Clave de Rastreo, Número de referencia, Número de folio, Concepto, Banco Emisor, Banco Receptor. Las columnas pueden no tener nombres estándar ni estar siempre completas.

*   **movimientos_cheque.csv:**
    *   Origen: Estado de cuenta oficial del banco (formato CSV).
    *   Contenido Principal: Todos los movimientos de la cuenta (cargos y abonos).
    *   Estructura: Columnas con información como Fecha, Hora, Descripcion, Cargo/Abono, Importe, Referencia, Concepto, Clave de Rastreo, Nombre Ordenante, Banco Participante. Los nombres y la estructura de las columnas difieren del archivo del bot.

**Proceso Detallado de Conciliación:**

1.  **Análisis y Mapeo de Columnas:** Examina ambos archivos para identificar las columnas que contienen información comparable, aunque se llamen diferente. Ejemplos clave:
    *   \`Monto\` (Bot) vs. \`Importe\` (Banco, filtrando por Abonos '+')
    *   \`Fecha de operación\` (Bot) vs. \`Fecha\` (Banco) - Considera formatos diferentes y posible desfase de 1 día.
    *   \`Hora de operación\` (Bot) vs. \`Hora\` (Banco) - Considera formatos diferentes y ventana de tolerancia (ej. +/- 15 min).
    *   \`Clave de Rastreo\` (Bot) vs. \`Clave de Rastreo\` (Banco) - Prioridad alta si no es "No disponible".
    *   \`Número de referencia\` (Bot) vs. \`Referencia\` (Banco)
    *   \`Número de folio\` (Bot) vs. \`Referencia\` o parte de \`Descripcion\`/\`Concepto\` (Banco)
    *   \`Concepto\` (Bot) vs. \`Concepto\` / \`Descripcion\` (Banco)
    *   \`Nombre\` (Bot) vs. \`Nombre Ordenante\` (Banco) - Considera coincidencia parcial/fuzzy.

2.  **Estrategia de Coincidencia (Matching):** Para cada registro del archivo \`Bot_Finanzas.csv\`, intenta encontrar una contraparte *única y plausible* en los abonos (+) del archivo \`movimientos_cheque.csv\`, utilizando los siguientes criterios en orden de prioridad:
    *   **Coincidencia Exacta por Identificador Único:** Prioriza si \`Clave de Rastreo\` (no "No disponible") es idéntica, verificando \`Importe\`/\`Monto\` igual/muy similar y \`Fecha\` misma/cercana (±1 día).
    *   **Coincidencia por Combinación Fuerte:** Sin clave o sin coincidencia, busca registros que coincidan simultáneamente en \`Importe\`/\`Monto\` (exacto), \`Fecha\` (exacta/adyacente), \`Hora\` (cercana si disponible) Y al menos uno de los siguientes que ayuden a desambiguar: \`Número de referencia\`/\`Referencia\`, \`Folio\`, \`Nombre\`/\`Nombre Ordenante\` (parcial/total).
    *   **Coincidencia por Combinación Flexible:** Si falla lo anterior, busca coincidencias por \`Importe\`/\`Monto\` y \`Fecha\`, y revisa si \`Concepto\`/\`Descripcion\` o \`Nombre Ordenante\` contienen pistas fuertes (ej., nombre alumno, nro. factura).

3.  **Manejo de Duplicados y Ambigüedades:**
    *   Si un registro del bot es duplicado de otro ya procesado (info similar) y solo hay una transacción bancaria, marca solo uno como conciliado y el otro como no conciliado (explicando que es duplicado).
    *   Si hay ambigüedad (un registro del bot podría coincidir con múltiples del banco o viceversa), prioriza la coincidencia más fuerte. Si persiste, marca como NO conciliado para revisión manual.

**Entregable (Output):**

Genera un **único objeto JSON** que contenga toda la información de salida, estructurado de la siguiente manera:

{
  "resumen": {
    "total_procesados": <Número total de registros de Bot_Finanzas.csv>,
    "total_conciliados": <Número de movimientos conciliados>,
    "total_no_conciliados": <Número de movimientos NO conciliados>
  },
  "detalle_movimientos": [
    {
      "Nombre": "<Nombre del Bot_Finanzas.csv>",
      "Monto": <Monto numérico del Bot_Finanzas.csv>,
      "Fecha_operacion": "<Fecha de operación YYYY-MM-DD del Bot_Finanzas.csv>",
      "Clave_Rastreo": "<Clave de Rastreo del Bot_Finanzas.csv o 'No disponible'>",
      "Numero_referencia": "<Número de referencia del Bot_Finanzas.csv o 'No disponible'>",
      "Numero_folio": "<Número de folio del Bot_Finanzas.csv o 'No disponible'>",
      "Concepto": "<Concepto del Bot_Finanzas.csv o 'No disponible'>",
      "Estado": "<'Conciliado' o 'No Conciliado'>",
      "Nota": "<*Solo si Estado es 'No Conciliado'*: Breve explicación específica del posible motivo por el cual este movimiento no fue conciliado (ej., 'No se encontró coincidencia por Clave/Referencia/Monto/Fecha', 'Registro duplicado en origen, original conciliado', 'Monto difiere significativamente del registro bancario Y', 'Fecha fuera del rango del estado de cuenta', 'Sin identificadores claros para buscar').>"
    }
  ]
}`;

      const requestBody = {
        contents: [
          {
            role: "user",
            parts: [
              { text: "Archivo Bot_Finanzas.csv:\n\n" + botDataString },
              { text: "Archivo movimientos_cheque.csv:\n\n" + movimientosDataString },
              { text: "Por favor concilia estos dos archivos CSV siguiendo las instrucciones." }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.05,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 60000
        },
        systemInstruction: {
          parts: [
            { text: systemInstruction }
          ]
        }
      };

      console.log('Enviando solicitud a Gemini API...');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 segundos
      
      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro-exp-03-25:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        }
      );
      
      clearTimeout(timeoutId);
      console.log(`Respuesta de Gemini recibida con estado: ${geminiResponse.status}`);
      
      if (!geminiResponse.ok) {
        const errorData = await geminiResponse.json();
        console.error('Error en la respuesta de Gemini API:', errorData);
        throw new Error(`Error en Gemini API: ${errorData.error?.message || 'Error desconocido'}`);
      }
      
      const data = await geminiResponse.json();
      
      let resultado = null;
      let processingError = '';
      
      if (data.candidates && 
          data.candidates[0] && 
          data.candidates[0].content && 
          data.candidates[0].content.parts && 
          data.candidates[0].content.parts[0]) {
        
        const text = data.candidates[0].content.parts[0].text;
        console.log('Respuesta recibida en formato texto, buscando JSON...');
        
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            resultado = JSON.parse(jsonMatch[0]);
            console.log('Respuesta JSON extraída de texto');
          } catch (parseError: any) {
            console.error("Error analizando texto JSON:", parseError);
            processingError = 'Error analizando JSON extraído del texto: ' + parseError.message;
          }
        } else {
          processingError = 'No se encontró estructura JSON en la respuesta';
          console.error(processingError, text.substring(0, 200) + '...');
        }
      } else {
        processingError = 'Formato de respuesta inesperado de Gemini API';
        console.error(processingError, data);
      }
      
      if (!resultado || !resultado.resumen || !resultado.detalle_movimientos) {
        console.log('Generando respuesta de fallback por datos incompletos');
        
        const detalleMovimientos = Array.isArray(resultado?.detalle_movimientos) ? 
                                     resultado.detalle_movimientos : [];
        
        resultado = {
          resumen: {
            total_procesados: resultado?.resumen?.total_procesados || botData.length,
            total_conciliados: resultado?.resumen?.total_conciliados || 0,
            total_no_conciliados: resultado?.resumen?.total_no_conciliados || botData.length
          },
          detalle_movimientos: detalleMovimientos.length ? detalleMovimientos : 
            botData.map(item => ({
              "Nombre": item.Nombre || "",
              "Monto": parseFloat(item.Monto) || 0,
              "Fecha_operacion": item["Fecha de operación"] || "",
              "Clave_Rastreo": item["Clave de Rastreo"] || "No disponible",
              "Numero_referencia": item["Número de referencia"] || "No disponible",
              "Numero_folio": item["Número de folio"] || "No disponible",
              "Concepto": item.Concepto || "No disponible",
              "Estado": "No Conciliado",
              "Nota": "Error en la conciliación automática"
            })),
          error: "No se pudo procesar completamente la conciliación" + 
                 (processingError ? `. Detalle técnico: ${processingError}` : '')
        };
      }
      
      // Procesar los detalles de movimientos para extraer WhatsApp
      resultado.detalle_movimientos = resultado.detalle_movimientos.map((item: any) => {
        // Extraer el número de WhatsApp si está disponible
        let whatsapp = "";
        
        // Buscar el dato original de WhatsApp en los datos de Bot_Finanzas
        try {
          // Buscar el item correspondiente en los datos originales de botData
          const matchingItem = botData.find((row: any) => {
            try {
              // Intentar comparación numérica con tolerancia
              const nombreMatch = row.Nombre?.trim() === item.Nombre?.trim();
              
              // Limpiar montos para comparación numérica
              const rowMonto = typeof row.Monto === 'number' ? row.Monto : parseFloat(String(row.Monto).replace(/,/g, '') || '0');
              const itemMonto = typeof item.Monto === 'number' ? item.Monto : parseFloat(String(item.Monto).replace(/,/g, '') || '0');
              const montoMatch = Math.abs(rowMonto - itemMonto) < 0.01;
              
              // Normalizar fechas antes de comparar
              const rowFecha = row["Fecha de operación"]?.trim() || "";
              const itemFecha = item.Fecha_operacion?.trim() || "";
              const fechaMatch = rowFecha === itemFecha;
              
              return nombreMatch && montoMatch && fechaMatch;
            } catch (e) {
              console.error("Error en comparación:", e);
              return false;
            }
          });
          
          console.log("Buscando item:", { nombre: item.Nombre, monto: item.Monto, fecha: item.Fecha_operacion });
          console.log("Item encontrado:", matchingItem ? "Sí" : "No");
          
          if (matchingItem) {
            // Listar todas las columnas del item para diagnóstico
            console.log("Columnas del item:", Object.keys(matchingItem));
            
            // Buscar la columna que contiene el WhatsApp usando una búsqueda específica
            // Lista de posibles nombres de columna para el WhatsApp
            const possibleColumns = [
              "Ws + Fecha+hora del mensaje",
              "Ws+Fecha+hora del mensaje",
              "Ws + Fecha",
              "WS"
            ];
            
            // Buscar una columna exacta primero
            let wsColumn: string | null = null;
            for (const colName of possibleColumns) {
              if (colName in matchingItem) {
                wsColumn = colName;
                break;
              }
            }
            
            // Si no encontramos una columna exacta, buscar por coincidencia parcial
            if (!wsColumn) {
              for (const key of Object.keys(matchingItem)) {
                if (key.includes("Ws") || key.includes("WS") || key.toLowerCase().includes("ws")) {
                  wsColumn = key;
                  break;
                }
              }
            }
            
            console.log("Columna de WhatsApp encontrada:", wsColumn);
            
            if (wsColumn && matchingItem[wsColumn]) {
              const wsValue = String(matchingItem[wsColumn]);
              console.log("Valor original de WS:", wsValue);
              
              // El formato esperado es similar a: "5216645487274_YYYY-02-Feb 6, 2025_11-17-20"
              // Extraer la parte antes del primer guion bajo
              const parts = wsValue.split('_');
              if (parts.length > 0) {
                // Tomar la primera parte (antes del primer guion bajo)
                let phoneNumber = parts[0];
                console.log("Número extraído (antes de limpiar):", phoneNumber);
                
                // Limpiar para asegurar que solo contiene dígitos
                phoneNumber = phoneNumber.replace(/\D/g, '');
                
                // Si comienza con "52" seguido de un "1", eliminar ese "1"
                if (phoneNumber.startsWith('52') && phoneNumber.length > 2 && phoneNumber[2] === '1') {
                  phoneNumber = '52' + phoneNumber.substring(3);
                  console.log("Número después de quitar el '1':", phoneNumber);
                }
                
                // Si no comienza con "52", agregarlo
                if (!phoneNumber.startsWith('52')) {
                  phoneNumber = '52' + phoneNumber;
                }
                
                console.log("Número final formateado:", phoneNumber);
                whatsapp = phoneNumber;
              }
            } else {
              console.log("No se encontró la columna con el número de WhatsApp");
            }
          }
        } catch (error) {
          console.error("Error procesando WhatsApp:", error);
        }
        
        return {
          ...item,
          whatsapp
        };
      });
      
      const resultadoConciliacion: ConciliationResult = {
        totalProcesados: resultado.resumen.total_procesados,
        totalConciliados: resultado.resumen.total_conciliados,
        totalNoConciliados: resultado.resumen.total_no_conciliados,
        movimientosNoConciliados: resultado.detalle_movimientos
          .filter((item: any) => item.Estado === "No Conciliado")
          .map((item: any) => ({
            nombre: item.Nombre || "",
            monto: typeof item.Monto === 'number' ? item.Monto : parseFloat(item.Monto) || 0,
            fecha: item.Fecha_operacion || "",
            claveRastreo: item.Clave_Rastreo || "No disponible",
            numeroReferencia: item.Numero_referencia || "No disponible",
            numeroFolio: item.Numero_folio || "No disponible",
            concepto: item.Concepto || "No disponible",
            nota: item.Nota || "",
            whatsapp: item.whatsapp || ""
          })),
        movimientosConciliados: resultado.detalle_movimientos
          .filter((item: any) => item.Estado === "Conciliado")
          .map((item: any) => ({
            nombre: item.Nombre || "",
            monto: typeof item.Monto === 'number' ? item.Monto : parseFloat(item.Monto) || 0,
            fecha: item.Fecha_operacion || "",
            claveRastreo: item.Clave_Rastreo || "No disponible",
            numeroReferencia: item.Numero_referencia || "No disponible",
            numeroFolio: item.Numero_folio || "No disponible",
            concepto: item.Concepto || "No disponible"
          })),
        todosLosMovimientos: resultado.detalle_movimientos.map((item: any) => ({
          nombre: item.Nombre || "",
          monto: typeof item.Monto === 'number' ? item.Monto : parseFloat(item.Monto) || 0,
          fecha: item.Fecha_operacion || "",
          claveRastreo: item.Clave_Rastreo || "No disponible",
          numeroReferencia: item.Numero_referencia || "No disponible",
          numeroFolio: item.Numero_folio || "No disponible",
          concepto: item.Concepto || "No disponible",
          estado: item.Estado || "No Conciliado",
          nota: item.Estado === "No Conciliado" ? (item.Nota || "") : "",
          whatsapp: item.whatsapp || ""
        })),
        resumenGeneral: "",
        error: resultado.error
      };
      
      if (resultado.error) {
        setErrorMessage(resultado.error.split('.')[0] || 'Error parcial en el procesamiento');
        
        const detailMatch = resultado.error.match(/Detalle técnico: (.*)/);
        if (detailMatch && detailMatch[1]) {
          setErrorDetail(detailMatch[1]);
        } else {
          setErrorDetail('Verifica el formato de tus archivos CSV e intenta nuevamente');
        }
        
        setErrorType('server');
      } else {
        setErrorMessage('');
        setErrorDetail('');
        setErrorType('');
      }
      
      setResultado(resultadoConciliacion);
    } catch (error: unknown) {
      console.error('Error procesando conciliación:', error);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          setErrorMessage('El procesamiento de los archivos tomó demasiado tiempo');
          setErrorDetail('Intenta reducir el tamaño de tus CSV dividiendo los datos en grupos más pequeños');
          setErrorType('timeout');
        } else {
          setErrorMessage('Error al procesar la conciliación');
          setErrorDetail(error.message || 'Por favor intenta de nuevo');
          setErrorType('server');
        }
      } else {
        setErrorMessage('Error al procesar la conciliación');
        setErrorDetail('Ocurrió un error inesperado. Por favor intenta de nuevo');
        setErrorType('server');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setBotFinanzasFile(null);
    setMovimientosChequeFile(null);
    setResultado(null);
    setErrorMessage('');
    setErrorDetail('');
    setErrorType('');
    setShowDetailedError(false);
    if (botFileInputRef.current) botFileInputRef.current.value = '';
    if (chequeFileInputRef.current) chequeFileInputRef.current.value = '';
  };

  const exportarResultadosCSV = () => {
    if (!resultado) return;
    
    // Permitir exportar todos los movimientos, no solo los no conciliados
    let csvContent = "Nombre,Monto,Fecha de Operación,Estado,Clave de Rastreo,Número de Referencia,Número de Folio,Concepto,Nota,WhatsApp\n";
    
    // Utilizar todos los movimientos para la exportación
    resultado.todosLosMovimientos?.forEach(item => {
      // Construir enlace de WhatsApp si el ítem no está conciliado y tiene número telefónico
      let whatsappLink = '';
      if (item.estado === 'No conciliado' && item.whatsapp) {
        whatsappLink = generarEnlaceWhatsApp(item.whatsapp, item.nombre, item.monto);
      }
      
      csvContent += `"${item.nombre}",${item.monto},"${item.fecha}","${item.estado}","${item.claveRastreo}","${item.numeroReferencia}","${item.numeroFolio}","${item.concepto}","${item.nota}","${whatsappLink}"\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'resultado_conciliacion.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderErrorIcon = () => {
    switch (errorType) {
      case 'file':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'limit':
        return <Lock className="w-5 h-5 text-purple-500" />;
      case 'server':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'timeout':
        return <Clock className="w-5 h-5 text-amber-500" />;
      case 'format':
        return <FileSpreadsheet className="w-5 h-5 text-amber-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getErrorBackgroundClass = () => {
    switch (errorType) {
      case 'file':
        return 'bg-red-50 text-red-600';
      case 'limit':
        return 'bg-purple-50 text-purple-600';
      case 'server':
      case 'timeout':
      case 'format':
        return 'bg-amber-50 text-amber-600';
      default:
        return 'bg-red-50 text-red-600';
    }
  };

  // Renderizado del mensaje de animación durante la carga
  const renderLoadingAnimation = () => {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="p-4 bg-blue-50/80 backdrop-blur-md shadow-sm rounded-xl border border-blue-100 text-center"
      >
        <motion.div
          animate={{ 
            rotate: [0, 10, 0, -10, 0],
            y: [0, -5, 0, -5, 0]
          }}
          transition={{ 
            repeat: Infinity, 
            duration: 2.5,
            ease: "easeInOut"
          }}
          className="inline-block mb-3"
        >
          <Coffee className="w-12 h-12 text-blue-500 mx-auto" />
        </motion.div>
        <h3 className="text-lg font-medium text-blue-700 mb-2">
          Ahora solo queda esperar...
        </h3>
        <p className="text-sm text-blue-600">
          Tip: Ve por un café, cuando regreses esto estará conciliado.
        </p>
      </motion.div>
    );
  };

  // Función para generar un enlace de WhatsApp con un mensaje personalizado
  const generarEnlaceWhatsApp = (telefono: string, cliente: string, monto: number) => {
    if (!telefono) return '';
    
    // Formatear el monto como una cantidad en pesos
    const montoFormateado = new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2
    }).format(monto);
    
    // Plantilla del mensaje personalizado
    const mensaje = encodeURIComponent(
      `Hola ${cliente}, esperamos te encuentres bien. Estamos revisando un pago de ${montoFormateado} ` +
      `que no hemos podido validar completamente. ¿Podrías por favor enviarnos de nuevo tu comprobante de pago? ` +
      `Esto nos ayudará a agilizar el proceso de verificación. ¡Gracias por tu colaboración!`
    );
    
    return `https://wa.me/${telefono}?text=${mensaje}`;
  };

  // Función para generar un mensaje de WhatsApp para un pago no verificado
  const generarMensajeWhatsApp = (item: any) => {
    return `Hola ${item.nombre},

Hemos detectado un pago por *$${item.monto.toFixed(2)}* con fecha *${item.fecha}* que no pudimos validar correctamente en nuestro sistema de conciliación bancaria.

*Detalles del pago:*
▸ Monto: $${item.monto.toFixed(2)}
▸ Fecha: ${item.fecha}
${item.numeroReferencia !== "No disponible" ? `▸ Referencia: ${item.numeroReferencia}` : ''}
${item.claveRastreo !== "No disponible" ? `▸ Clave de rastreo: ${item.claveRastreo}` : ''}

Para poder validar tu pago y actualizar tu estado de cuenta, te pedimos amablemente que nos reenvíes el comprobante de este pago.

Gracias por tu comprensión.`;
  };

  // Función para copiar el mensaje al portapapeles
  const copiarMensaje = (item: any, index: number) => {
    const mensaje = generarMensajeWhatsApp(item);
    navigator.clipboard.writeText(mensaje)
      .then(() => {
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
      })
      .catch(err => {
        console.error('Error al copiar el mensaje:', err);
      });
  };

  return (
    <motion.div 
      initial={{ x: -50, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -50, opacity: 0 }}
      transition={{ type: "spring", stiffness: 100 }}
      className="h-full flex flex-col p-4 bg-white/70 backdrop-blur-md relative"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart className="w-5 h-5" style={{ color: 'var(--primary)' }} />
          <h3 className="font-medium text-gray-700">Conciliación Bancaria</h3>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
        >
          <X className="w-4 h-4 text-gray-500" />
        </motion.button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {!resultado ? (
          <div className="space-y-6">
            {isLoading ? renderLoadingAnimation() : (
              <>
                {!monthlyLimit.isLimitReached && (
                  <div className="card p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>1. Carga de Archivos CSV</h4>
                      <div className="flex items-center px-2 py-1 rounded-lg" style={{ backgroundColor: 'var(--app-bg)' }}>
                        <span className="text-xs mr-1" style={{ color: 'var(--text-secondary)' }}>Disponibles:</span>
                        <span className={`text-xs font-medium ${monthlyLimit.remaining < 3 ? 'text-amber-600' : ''}`} style={{ color: monthlyLimit.remaining < 3 ? '#d97706' : 'var(--primary)' }}>
                          {monthlyLimit.remaining}/{monthlyLimit.used + monthlyLimit.remaining}
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Archivo Bot_Finanzas.csv</label>
                        <div className={`p-3 border rounded-lg flex items-center justify-between ${botFinanzasFile ? 'border-green-200 bg-green-50/30' : 'border-gray-200'}`}>
                          <div className="flex items-center gap-2">
                            <FileSpreadsheet className={`w-5 h-5 ${botFinanzasFile ? 'text-green-500' : 'text-gray-400'}`} />
                            <span className="text-sm truncate max-w-[180px]" style={{ color: 'var(--text-primary)' }}>
                              {botFinanzasFile ? botFinanzasFile.name : 'Seleccionar archivo'}
                            </span>
                          </div>
                          <input
                            type="file"
                            accept=".csv"
                            onChange={handleBotFinanzasChange}
                            className="hidden"
                            ref={botFileInputRef}
                          />
                          <button 
                            onClick={() => botFileInputRef.current?.click()}
                            className="px-3 py-1 text-xs rounded-md transition-all"
                            style={{ 
                              backgroundColor: 'rgba(var(--primary-rgb), 0.1)', 
                              color: 'var(--primary)'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(var(--primary-rgb), 0.15)'}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(var(--primary-rgb), 0.1)'}
                          >
                            Examinar
                          </button>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Archivo MovimientosCheque.csv</label>
                        <div className={`p-3 border rounded-lg flex items-center justify-between ${movimientosChequeFile ? 'border-green-200 bg-green-50/30' : 'border-gray-200'}`}>
                          <div className="flex items-center gap-2">
                            <FileSpreadsheet className={`w-5 h-5 ${movimientosChequeFile ? 'text-green-500' : 'text-gray-400'}`} />
                            <span className="text-sm truncate max-w-[180px]" style={{ color: 'var(--text-primary)' }}>
                              {movimientosChequeFile ? movimientosChequeFile.name : 'Seleccionar archivo'}
                            </span>
                          </div>
                          <input
                            type="file"
                            accept=".csv"
                            onChange={handleMovimientosChequeChange}
                            className="hidden"
                            ref={chequeFileInputRef}
                          />
                          <button 
                            onClick={() => chequeFileInputRef.current?.click()}
                            className="px-3 py-1 text-xs rounded-md transition-all"
                            style={{ 
                              backgroundColor: 'rgba(var(--primary-rgb), 0.1)', 
                              color: 'var(--primary)'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(var(--primary-rgb), 0.15)'}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(var(--primary-rgb), 0.1)'}
                          >
                            Examinar
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      <div className="flex items-center gap-1 mb-1">
                        <Info className="w-3.5 h-3.5" />
                        <span className="font-medium">Requisitos para CSV:</span>
                      </div>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Tamaño máximo: 5MB por archivo</li>
                        <li>Formato: CSV con delimitadores (comas o punto y coma)</li>
                        <li>Codificación recomendada: UTF-8</li>
                      </ul>
                    </div>
                  </div>
                )}

                {monthlyLimit.isLimitReached && (
                  <div className="p-4 rounded-lg border" style={{ backgroundColor: 'rgba(251, 191, 36, 0.08)', borderColor: 'rgba(251, 191, 36, 0.2)' }}>
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-full" style={{ backgroundColor: 'rgba(251, 191, 36, 0.15)' }}>
                        <Lock className="w-6 h-6 text-amber-600" />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-amber-800 mb-1">Límite de conciliaciones alcanzado</h4>
                        <p className="text-xs text-amber-700 mb-3">
                          Has utilizado las 10 conciliaciones disponibles para este mes. El contador se reiniciará automáticamente al inicio del próximo mes.
                        </p>
                        <div className="h-2 bg-amber-100 rounded-full overflow-hidden mb-1">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: '100%' }}
                            transition={{ duration: 0.7 }}
                            className="h-full bg-amber-500"
                          />
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-amber-700 font-medium">10/10 utilizadas</span>
                          <span className="text-amber-700">Próximo reinicio: {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {errorMessage && !isLoading && (
                  <div className={`p-3 ${getErrorBackgroundClass()} rounded-lg flex flex-col gap-2 text-sm`}>
                    <div className="flex items-center gap-2">
                      {renderErrorIcon()}
                      <div className="flex-1">
                        {errorMessage}
                        {errorDetail && (
                          <button 
                            onClick={() => setShowDetailedError(!showDetailedError)}
                            className="ml-2 text-xs underline"
                          >
                            {showDetailedError ? 'Ocultar detalles' : 'Ver detalles'}
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {showDetailedError && errorDetail && (
                      <div className="text-xs ml-7 mt-1 opacity-80">
                        {errorDetail}
                      </div>
                    )}
                  </div>
                )}
                
                {!isLoading && !monthlyLimit.isLimitReached && (
                  <div className="flex justify-center">
                    <motion.button
                      whileHover={{ scale: 1.03, y: -1 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={procesarConciliacion}
                      disabled={!botFinanzasFile || !movimientosChequeFile || isLoading || monthlyLimit.isLimitReached}
                      className="btn-primary px-5 py-2.5 rounded-xl shadow-sm flex items-center gap-2"
                      style={{
                        backgroundColor: !botFinanzasFile || !movimientosChequeFile ? '#e5e7eb' : 'var(--primary)',
                        color: !botFinanzasFile || !movimientosChequeFile ? '#9ca3af' : 'white',
                        cursor: !botFinanzasFile || !movimientosChequeFile ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <ArrowRight className="w-5 h-5" />
                      Conciliar Datos
                    </motion.button>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="card p-4">
              <h4 className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Resumen de Conciliación</h4>
              
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="p-3 rounded-lg flex flex-col items-center" style={{ backgroundColor: 'rgba(var(--primary-rgb), 0.08)' }}>
                  <span className="text-xs mb-1" style={{ color: 'var(--primary)' }}>Total Procesados</span>
                  <span className="text-xl font-semibold" style={{ color: 'var(--primary)' }}>{resultado.totalProcesados}</span>
                </div>
                <div className="p-3 rounded-lg flex flex-col items-center bg-green-50/70">
                  <span className="text-xs text-green-600 mb-1">Conciliados</span>
                  <span className="text-xl font-semibold text-green-700">{resultado.totalConciliados}</span>
                </div>
                <div className="p-3 rounded-lg flex flex-col items-center bg-amber-50/70">
                  <span className="text-xs text-amber-600 mb-1">No Conciliados</span>
                  <span className="text-xl font-semibold text-amber-700">{resultado.totalNoConciliados}</span>
                </div>
              </div>
              
              <div className="mb-2">
                <div className="flex justify-between text-xs mb-1">
                  <span style={{ color: 'var(--text-secondary)' }}>Efectividad de conciliación</span>
                  <span style={{ color: 'var(--primary)', fontWeight: 500 }}>
                    {resultado.totalProcesados > 0 
                      ? Math.round((resultado.totalConciliados / resultado.totalProcesados) * 100)
                      : 0}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--app-bg)' }}>
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ 
                      width: `${resultado.totalProcesados > 0 
                        ? (resultado.totalConciliados / resultado.totalProcesados) * 100
                        : 0}%`
                    }}
                    transition={{ duration: 1 }}
                    style={{ height: '100%', backgroundColor: 'var(--primary)' }}
                  />
                </div>
              </div>
              
              {errorMessage && (
                <div className="mt-3 rounded-lg overflow-hidden bg-amber-50">
                  <div className="p-2 flex items-start gap-2 text-xs text-amber-600">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">{errorMessage}</p>
                      {errorDetail && showDetailedError && (
                        <p className="mt-1 text-amber-500 text-[11px]">{errorDetail}</p>
                      )}
                      {errorDetail && (
                        <button 
                          onClick={() => setShowDetailedError(!showDetailedError)}
                          className="mt-1 text-[10px] underline text-amber-500"
                        >
                          {showDetailedError ? 'Ocultar detalles técnicos' : 'Ver detalles técnicos'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {resultado.totalNoConciliados > 0 && (
              <div className="card p-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Movimientos No Conciliados</h4>
                  <span className="text-xs font-medium text-amber-600">{resultado.totalNoConciliados} movimientos</span>
                </div>
                
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {resultado.movimientosNoConciliados.map((item, index) => {
                    // Usamos el número de WhatsApp que ya hemos extraído y formateado durante el procesamiento
                    // Si no está disponible, usamos un número predeterminado
                    let formattedPhone = item.whatsapp || '525512345678';
                    
                    // Verificamos una vez más si el número está correctamente formateado
                    if (formattedPhone.startsWith('52')) {
                      // Verificar si después del "52" hay un "1" y eliminarlo
                      if (formattedPhone.length > 2 && formattedPhone[2] === '1') {
                        formattedPhone = '52' + formattedPhone.substring(3);
                      }
                    } else {
                      // Si no empieza con "52", agregarlo
                      formattedPhone = '52' + formattedPhone;
                    }
                    
                    // Template de mensaje más estructurado y formal
                    const message = `
*EQUIPO DE FINANZAS*
----------------------

Hola ${item.nombre},

Hemos detectado un pago por *$${item.monto.toFixed(2)}* con fecha *${item.fecha}* que no pudimos validar correctamente en nuestro sistema de conciliación bancaria.

*Detalles del pago:*
▸ Monto: $${item.monto.toFixed(2)}
▸ Fecha: ${item.fecha}
${item.numeroReferencia !== "No disponible" ? `▸ Referencia: ${item.numeroReferencia}` : ''}
${item.claveRastreo !== "No disponible" ? `▸ Clave de rastreo: ${item.claveRastreo}` : ''}

Para poder validar tu pago y actualizar tu estado de cuenta, te pedimos amablemente que nos reenvíes el comprobante de este pago.

Gracias por tu comprensión.
                    `;
                    
                    // Codificamos el mensaje para URL
                    const encodedMessage = encodeURIComponent(message);
                    
                    // Construimos el enlace de WhatsApp
                    const whatsappLink = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
                    
                    return (
                      <motion.div 
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="p-3 rounded-lg border border-amber-100/80"
                        style={{ backgroundColor: 'rgba(251, 191, 36, 0.08)' }}
                      >
                        <div className="flex flex-col sm:flex-row justify-between items-start mb-2">
                          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{item.nombre}</span>
                          <span className="font-semibold text-amber-600">${item.monto.toFixed(2)}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                          <div className="flex items-center gap-1">
                            <span className="text-gray-500">Fecha:</span>
                            <span className="text-gray-700">{item.fecha}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-gray-500">Folio:</span>
                            <span className="text-gray-700">{item.numeroFolio || "No disponible"}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-gray-500">Referencia:</span>
                            <span className="text-gray-700">{item.numeroReferencia || "No disponible"}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-gray-500">Clave Rastreo:</span>
                            <span className="text-gray-700">{item.claveRastreo || "No disponible"}</span>
                          </div>
                          <div className="col-span-2 flex items-center gap-1">
                            <span className="text-gray-500">Concepto:</span>
                            <span className="text-gray-700">{item.concepto || "No disponible"}</span>
                          </div>
                          <div className="col-span-2 mt-2 flex gap-2 flex-wrap">
                            <a 
                              href={whatsappLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-medium bg-green-500 hover:bg-green-600 transition-colors"
                            >
                              <svg 
                                className="w-3.5 h-3.5" 
                                fill="currentColor" 
                                viewBox="0 0 24 24"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"></path>
                                <path d="M12 0C5.373 0 0 5.373 0 12c0 6.628 5.373 12 12 12 6.628 0 12-5.373 12-12 0-6.627-5.372-12-12-12zm6.24 17.205c-.273.822-.842 1.5-1.61 1.889-1.18.604-2.686.419-4.033.251-1.064-.133-2.118-.391-3.105-.857-1.376-.645-2.589-1.581-3.596-2.673-1.435-1.559-2.388-3.572-2.68-5.685-.196-1.216-.11-2.502.337-3.654.323-.844.896-1.59 1.665-2.084.39-.254.83-.375 1.271-.37.298 0 .595.057.875.17.337.135.641.36.874.646.263.32.514.649.75.985.348.503.695 1.012.976 1.553.12.23.236.499.32.76.164.507.152 1.062-.043 1.559z"></path>
                              </svg>
                              Contactar por WhatsApp
                            </a>
                            <button
                              onClick={() => copiarMensaje(item, index)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                            >
                              {copiedIndex === index ? (
                                <>
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  Copiado
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  Copiar mensaje
                                </>
                              )}
                            </button>
                          </div>
                          {item.nota && (
                            <div className="col-span-2 mt-1 pt-1 border-t border-amber-200">
                              <div className="flex items-start gap-1">
                                <AlertCircle className="w-3.5 h-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
                                <span className="text-amber-700">{item.nota}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {resultado.totalConciliados > 0 && (
              <div className="card p-4 mt-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Movimientos Conciliados</h4>
                  <span className="text-xs font-medium text-green-600">{resultado.totalConciliados} movimientos</span>
                </div>
                
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {resultado.movimientosConciliados?.map((item, index) => (
                    <motion.div 
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-3 rounded-lg border border-green-100/80"
                      style={{ backgroundColor: 'rgba(74, 222, 128, 0.08)' }}
                    >
                      <div className="flex flex-col sm:flex-row justify-between items-start mb-2">
                        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{item.nombre}</span>
                        <span className="font-semibold text-green-600">${item.monto.toFixed(2)}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                        <div className="flex items-center gap-1">
                          <span className="text-gray-500">Fecha:</span>
                          <span className="text-gray-700">{item.fecha}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-gray-500">Folio:</span>
                          <span className="text-gray-700">{item.numeroFolio || "No disponible"}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-gray-500">Referencia:</span>
                          <span className="text-gray-700">{item.numeroReferencia || "No disponible"}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-gray-500">Clave Rastreo:</span>
                          <span className="text-gray-700">{item.claveRastreo || "No disponible"}</span>
                        </div>
                        <div className="col-span-2 flex items-center gap-1">
                          <span className="text-gray-500">Concepto:</span>
                          <span className="text-gray-700">{item.concepto || "No disponible"}</span>
                        </div>
                        <div className="col-span-2 mt-1">
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-100 text-green-700 text-xs">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            Conciliado correctamente
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex justify-center mt-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={exportarResultadosCSV}
                className="btn-secondary px-5 py-2 rounded-lg flex items-center gap-2 mr-2"
              >
                <Download className="w-4 h-4" />
                Exportar CSV
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={resetForm}
                className="btn-secondary px-5 py-2 rounded-lg flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Nueva Conciliación
              </motion.button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default FinanceBot; 