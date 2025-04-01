import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, FileSpreadsheet, AlertCircle, BarChart, ArrowRight, RefreshCw, Download, AlertTriangle, Clock, Info, ZapIcon } from 'lucide-react';
import Papa from 'papaparse';

// Usar la variable de entorno para la API key
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

// Comprobar que existe la clave API
if (!GEMINI_API_KEY) {
  console.error('¡ADVERTENCIA! API key de Gemini no encontrada. Configure VITE_GEMINI_API_KEY en su archivo .env');
}

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
  }[];
  resumenGeneral: string;
  error?: string;
}


const FinanceBot = ({ onClose }: FinanceBotProps) => {
  const [botFinanzasFile, setBotFinanzasFile] = useState<File | null>(null);
  const [movimientosChequeFile, setMovimientosChequeFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resultado, setResultado] = useState<ConciliationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorDetail, setErrorDetail] = useState('');
  const [errorType, setErrorType] = useState<'file' | 'server' | 'timeout' | 'format' | ''>('');
  const [showDetailedError, setShowDetailedError] = useState(false);
  const botFileInputRef = useRef<HTMLInputElement>(null);
  const chequeFileInputRef = useRef<HTMLInputElement>(null);

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
          resolve(results.data);
        },
        error: (error) => {
          reject(error);
        }
      });
    });
  };

  const procesarConciliacion = async () => {
    if (!botFinanzasFile || !movimientosChequeFile) {
      setErrorMessage('Debes cargar ambos archivos CSV');
      setErrorDetail('');
      setErrorType('file');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setErrorDetail('');
    setErrorType('');
    setShowDetailedError(false);

    try {
      const botData = await parseCSV(botFinanzasFile);
      const movimientosData = await parseCSV(movimientosChequeFile);
      
      console.log(`Datos de Bot (${botData.length} registros) y Movimientos (${movimientosData.length} registros) parseados`);
      
      if (!botData.length || !movimientosData.length) {
        throw new Error('Los archivos CSV no contienen datos o el formato es incorrecto');
      }
      
      const botDataString = Papa.unparse(botData);
      const movimientosDataString = Papa.unparse(movimientosData);
      
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

Genera un único objeto JSON con la siguiente estructura:
{
  "resumen": {
    "total_procesados": <Número total de registros de Bot_Finanzas.csv>,
    "total_conciliados": <Número de movimientos conciliados>,
    "total_no_conciliados": <Número de movimientos NO conciliados>
  },
  "movimientos_no_conciliados": [
    {
      "Nombre": "<Nombre del Bot_Finanzas.csv>",
      "Monto": <Monto numérico del Bot_Finanzas.csv>,
      "Fecha_operacion": "<Fecha de operación YYYY-MM-DD del Bot_Finanzas.csv>",
      "Clave_Rastreo": "<Clave de Rastreo del Bot_Finanzas.csv o 'No disponible'>",
      "Numero_referencia": "<Número de referencia del Bot_Finanzas.csv o 'No disponible'>",
      "Numero_folio": "<Número de folio del Bot_Finanzas.csv o 'No disponible'>",
      "Concepto": "<Concepto del Bot_Finanzas.csv o 'No disponible'>",
      "Nota": "<Breve explicación del motivo por el cual este movimiento no fue conciliado>"
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
          maxOutputTokens: 40000
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
      
      if (!resultado || !resultado.resumen || !resultado.movimientos_no_conciliados) {
        console.log('Generando respuesta de fallback por datos incompletos');
        
        const movimientosNoConciliados = Array.isArray(resultado?.movimientos_no_conciliados) ? 
                                         resultado.movimientos_no_conciliados : [];
        
        resultado = {
          resumen: {
            total_procesados: resultado?.resumen?.total_procesados || botData.length,
            total_conciliados: resultado?.resumen?.total_conciliados || 0,
            total_no_conciliados: resultado?.resumen?.total_no_conciliados || botData.length
          },
          movimientos_no_conciliados: movimientosNoConciliados.length ? movimientosNoConciliados : 
            botData.map(item => ({
              "Nombre": item.Nombre || "",
              "Monto": parseFloat(item.Monto) || 0,
              "Fecha_operacion": item["Fecha de operación"] || "",
              "Clave_Rastreo": item["Clave de Rastreo"] || "No disponible",
              "Numero_referencia": item["Número de referencia"] || "No disponible",
              "Numero_folio": item["Número de folio"] || "No disponible",
              "Concepto": item.Concepto || "No disponible",
              "Nota": "Error en la conciliación automática"
            })),
          error: "No se pudo procesar completamente la conciliación" + 
                 (processingError ? `. Detalle técnico: ${processingError}` : '')
        };
      }
      
      const resultadoConciliacion: ConciliationResult = {
        totalProcesados: resultado.resumen.total_procesados,
        totalConciliados: resultado.resumen.total_conciliados,
        totalNoConciliados: resultado.resumen.total_no_conciliados,
        movimientosNoConciliados: resultado.movimientos_no_conciliados.map((item: any) => ({
          nombre: item.Nombre || "",
          monto: typeof item.Monto === 'number' ? item.Monto : parseFloat(item.Monto) || 0,
          fecha: item.Fecha_operacion || "",
          claveRastreo: item.Clave_Rastreo || "No disponible",
          numeroReferencia: item.Numero_referencia || "No disponible",
          numeroFolio: item.Numero_folio || "No disponible",
          concepto: item.Concepto || "No disponible",
          nota: item.Nota || ""
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
    if (!resultado || !resultado.movimientosNoConciliados.length) return;
    
    let csvContent = "Nombre,Monto,Fecha de Operación,Clave de Rastreo,Número de Referencia,Número de Folio,Concepto\n";
    
    resultado.movimientosNoConciliados.forEach(item => {
      csvContent += `"${item.nombre}",${item.monto},"${item.fecha}","${item.claveRastreo}","${item.numeroReferencia}","${item.numeroFolio}","${item.concepto}"\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'movimientos_no_conciliados.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderErrorIcon = () => {
    switch (errorType) {
      case 'file':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
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
      case 'server':
      case 'timeout':
      case 'format':
        return 'bg-amber-50 text-amber-600';
      default:
        return 'bg-red-50 text-red-600';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-4xl mx-auto p-2 sm:p-4 md:p-6"
    >
      <div className="bg-white/80 backdrop-blur-sm shadow-sm rounded-xl border border-gray-100 overflow-hidden">
        <div className="p-3 sm:p-4 md:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 sm:mb-6">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Conciliación Bancaria</h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                Sube tus archivos CSV para conciliar movimientos bancarios
              </p>
              <div className="flex items-center gap-2 text-xs text-amber-600 font-semibold mt-2">
                <ZapIcon className="w-4 h-4" />
                <span>POMs (Beta): 231</span>
              </div>
            </div>
            {resultado && (
              <button
                onClick={resetForm}
                className="inline-flex items-center gap-1.5 text-xs font-medium bg-blue-50 text-blue-600 py-1.5 px-3 rounded-md hover:bg-blue-100 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Nueva Conciliación
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {!resultado ? (
              <div className="space-y-6">
                <div className="p-4 bg-white/80 backdrop-blur-md shadow-sm rounded-xl border border-gray-100">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">1. Carga de Archivos CSV</h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Archivo Bot_Finanzas.csv</label>
                      <div className={`p-3 border ${botFinanzasFile ? 'border-green-200 bg-green-50/40' : 'border-gray-200'} rounded-lg flex items-center justify-between`}>
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className={`w-5 h-5 ${botFinanzasFile ? 'text-green-500' : 'text-gray-400'}`} />
                          <span className="text-sm truncate max-w-[180px]">
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
                          className="px-3 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-md transition"
                        >
                          Examinar
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Archivo MovimientosCheque.csv</label>
                      <div className={`p-3 border ${movimientosChequeFile ? 'border-green-200 bg-green-50/40' : 'border-gray-200'} rounded-lg flex items-center justify-between`}>
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className={`w-5 h-5 ${movimientosChequeFile ? 'text-green-500' : 'text-gray-400'}`} />
                          <span className="text-sm truncate max-w-[180px]">
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
                          className="px-3 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-md transition"
                        >
                          Examinar
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-gray-500">
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
                
                {errorMessage && (
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
                
                <div className="flex justify-center">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={procesarConciliacion}
                    disabled={!botFinanzasFile || !movimientosChequeFile || isLoading}
                    className={`px-5 py-2.5 rounded-xl shadow-sm flex items-center gap-2 ${
                      !botFinanzasFile || !movimientosChequeFile || isLoading
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      <>
                        <ArrowRight className="w-5 h-5" />
                        Conciliar Datos
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="p-4 bg-white/80 backdrop-blur-md shadow-sm rounded-xl border border-gray-100">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Resumen de Conciliación</h4>
                  
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="p-3 bg-blue-50/70 rounded-lg flex flex-col items-center">
                      <span className="text-xs text-blue-600 mb-1">Total Procesados</span>
                      <span className="text-xl font-semibold text-blue-700">{resultado.totalProcesados}</span>
                    </div>
                    <div className="p-3 bg-green-50/70 rounded-lg flex flex-col items-center">
                      <span className="text-xs text-green-600 mb-1">Conciliados</span>
                      <span className="text-xl font-semibold text-green-700">{resultado.totalConciliados}</span>
                    </div>
                    <div className="p-3 bg-amber-50/70 rounded-lg flex flex-col items-center">
                      <span className="text-xs text-amber-600 mb-1">No Conciliados</span>
                      <span className="text-xl font-semibold text-amber-700">{resultado.totalNoConciliados}</span>
                    </div>
                  </div>
                  
                  <div className="mb-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-500">Efectividad de conciliación</span>
                      <span className="text-blue-600 font-medium">
                        {resultado.totalProcesados > 0 
                          ? Math.round((resultado.totalConciliados / resultado.totalProcesados) * 100)
                          : 0}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ 
                          width: `${resultado.totalProcesados > 0 
                            ? (resultado.totalConciliados / resultado.totalProcesados) * 100
                            : 0}%`
                        }}
                        transition={{ duration: 1 }}
                        className="h-full bg-blue-500"
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
                  <div className="p-4 bg-white/80 backdrop-blur-md shadow-sm rounded-xl border border-gray-100">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-sm font-medium text-gray-700">Movimientos No Conciliados</h4>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={exportarResultadosCSV}
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Exportar CSV
                      </motion.button>
                    </div>
                    
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {resultado.movimientosNoConciliados.map((item, index) => (
                        <motion.div 
                          key={index}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="p-3 bg-amber-50/50 border border-amber-100 rounded-lg"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-medium text-gray-700">{item.nombre}</span>
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
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default FinanceBot; 