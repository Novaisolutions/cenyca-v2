import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, FileSpreadsheet, AlertCircle, BarChart, ArrowRight, RefreshCw, Download, AlertTriangle, Clock, Info } from 'lucide-react';
import Papa from 'papaparse';
import { incrementConciliationCount } from '../services/statsService';

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
  }[];
  resumenGeneral: string;
  error?: string;
}

// Función para dar formato tipo WhatsApp a los textos
const formatWhatsAppStyle = (text: string): string => {
  if (!text) return '';
  
  // Convertir a caracteres Unicode para negrita (*texto*)
  let formatted = text.replace(/\*(.*?)\*/g, '<strong>$1</strong>');
  
  // Convertir a caracteres Unicode para cursiva (_texto_)
  formatted = formatted.replace(/_(.*?)_/g, '<em>$1</em>');
  
  // Convertir a caracteres Unicode para tachado (~texto~)
  formatted = formatted.replace(/~(.*?)~/g, '<del>$1</del>');
  
  // Convertir saltos de línea
  formatted = formatted.replace(/\n/g, '<br />');
  
  return formatted;
};

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
      // Incrementar el contador de conciliaciones
      await incrementConciliationCount();
      
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
      data-tour="bot-finanzas"
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      className="h-full overflow-hidden flex flex-col"
    >
      <div className="flex items-center justify-between p-4 border-b border-blue-100">
        <h3 className="text-md font-medium text-blue-800">Conciliación Bancaria <span className="text-xs text-indigo-500">(Beta)</span></h3>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          className="p-1 rounded-md text-blue-400 hover:text-blue-600 hover:bg-blue-50"
        >
          <X className="w-5 h-5" />
        </motion.button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        {!resultado ? (
          <div className="max-w-xl mx-auto">
            <div className="bg-white/80 backdrop-blur-md shadow-sm rounded-xl border border-gray-100 p-5 mb-5">
              <h4 className="text-base font-medium text-gray-700 mb-3">Archivos de Conciliación</h4>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    Bot Finanzas (CSV)
                  </label>
                  <div className="flex flex-col md:flex-row gap-2">
                    <div className="flex-1 truncate bg-white rounded-lg border border-blue-200 p-2 text-sm text-gray-500">
                      {botFinanzasFile ? botFinanzasFile.name : 'Ningún archivo seleccionado'}
                    </div>
                    <button 
                      onClick={() => botFileInputRef.current?.click()}
                      className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-sm font-medium transition-all duration-200"
                    >
                      Seleccionar
                    </button>
                    <input 
                      ref={botFileInputRef}
                      type="file" 
                      accept=".csv" 
                      onChange={handleBotFinanzasChange} 
                      className="hidden" 
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Capturas de WhatsApp de pagos recibidos (CSV)</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    Estado de Cuenta (CSV)
                  </label>
                  <div className="flex flex-col md:flex-row gap-2">
                    <div className="flex-1 truncate bg-white rounded-lg border border-blue-200 p-2 text-sm text-gray-500">
                      {movimientosChequeFile ? movimientosChequeFile.name : 'Ningún archivo seleccionado'}
                    </div>
                    <button 
                      onClick={() => chequeFileInputRef.current?.click()}
                      className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-sm font-medium transition-all duration-200"
                    >
                      Seleccionar
                    </button>
                    <input 
                      ref={chequeFileInputRef}
                      type="file" 
                      accept=".csv" 
                      onChange={handleMovimientosChequeChange} 
                      className="hidden" 
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Exportación de movimientos bancarios (CSV)</p>
                </div>
              </div>
              
              {errorType === 'file' && (
                <div className="mt-3 rounded-lg overflow-hidden bg-amber-50">
                  <div className="p-2 flex items-start gap-2 text-xs text-amber-600">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">{errorMessage}</p>
                      {errorDetail && (
                        <p className="mt-1 text-amber-500 text-[11px]" dangerouslySetInnerHTML={{ __html: formatWhatsAppStyle(errorDetail) }} />
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              <div className="mt-5 flex justify-center">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={procesarConciliacion}
                  disabled={isLoading || !botFinanzasFile || !movimientosChequeFile}
                  className={`
                    px-5 py-2.5 rounded-xl shadow-sm 
                    ${(!botFinanzasFile || !movimientosChequeFile) 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'bg-blue-600 text-white hover:bg-blue-700'}
                    flex items-center gap-2
                    transition-all duration-200
                  `}
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
            
            <div className="p-4 bg-white/80 backdrop-blur-md shadow-sm rounded-xl border border-gray-100">
              <div className="flex items-center gap-2 mb-3 text-gray-700">
                <Info className="w-4 h-4 text-blue-500" />
                <h4 className="text-sm font-medium">Instrucciones</h4>
              </div>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-blue-500 font-semibold">1.</span>
                  <span>Carga el archivo CSV exportado del Bot de Finanzas que contiene los mensajes capturados de WhatsApp.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-blue-500 font-semibold">2.</span>
                  <span>Carga el archivo CSV exportado del estado de cuenta bancario que contiene los movimientos oficiales.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-blue-500 font-semibold">3.</span>
                  <span>Presiona "Conciliar Datos" para iniciar el proceso de análisis automático.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-blue-500 font-semibold">4.</span>
                  <span>El sistema identificará qué pagos reportados por WhatsApp están reflejados en el banco y cuáles no.</span>
                </li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-5">
            <div className="p-4 bg-white/80 backdrop-blur-md shadow-sm rounded-xl border border-gray-100">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-2">
                <h4 className="text-sm font-medium text-gray-700">Resumen de Conciliación</h4>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                  <span>Procesamiento completado</span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-blue-50/50 rounded-lg p-3">
                  <div className="text-xs text-gray-500 mb-1">Total procesados</div>
                  <div className="text-lg font-semibold text-gray-800">{resultado.totalProcesados}</div>
                </div>
                
                <div className="bg-green-50/50 rounded-lg p-3">
                  <div className="text-xs text-gray-500 mb-1">Conciliados</div>
                  <div className="text-lg font-semibold text-green-600">{resultado.totalConciliados}</div>
                </div>
                
                <div className="bg-amber-50/50 rounded-lg p-3">
                  <div className="text-xs text-gray-500 mb-1">No conciliados</div>
                  <div className="text-lg font-semibold text-amber-600">{resultado.totalNoConciliados}</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="text-gray-600">Efectividad de conciliación</span>
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
                        <p className="mt-1 text-amber-500 text-[11px]" dangerouslySetInnerHTML={{ __html: formatWhatsAppStyle(errorDetail) }} />
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
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-3 gap-2">
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
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-2 gap-y-1 text-xs">
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
                              <span 
                                className="text-amber-700"
                                dangerouslySetInnerHTML={{ __html: formatWhatsAppStyle(item.nota) }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex justify-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={resetForm}
                className="px-5 py-2.5 rounded-xl shadow-sm bg-blue-100 text-blue-600 hover:bg-blue-200 flex items-center gap-2"
              >
                <RefreshCw className="w-5 h-5" />
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