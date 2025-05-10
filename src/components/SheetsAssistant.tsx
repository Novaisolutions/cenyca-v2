import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Sheet, Send, Loader, AlertCircle, CheckSquare, Square } from 'lucide-react';

interface SheetsAssistantProps {
  onClose: () => void;
}

// Opciones para el selector de hojas
const sheetOptions = [
  { name: 'Bot Finanzas Otay', id: '1aEaURED9v_5qQofM-i5DzRnJ7CG61tiKFhUq4Z_0bqY' },
  { name: 'Bot Finanzas Palmas', id: '1QhpV3roUhkTEjRfAT8jui19ymunMnq87tUgO_Hb6nR0' },
  { name: 'Bot Finanzas Casa Blanca', id: '1ZdT8jF8iQMKYsibGIlk9sANTcz1A4pCKyyobY2DiXK8' },
  { name: 'Bot Finanzas Tecate', id: '1QzEWM5R-A3yiSam4a_H46y3mKeg20rFfU4rUFp5xFwc' },
  { name: 'Bot Finanzas Ensenada', id: '1MeyoW1bZh5tXsHeb8rXgh-R2KiUuz6tsfYWPQUoBzNI' },
];

const SheetsAssistant = ({ onClose }: SheetsAssistantProps) => {
  // Estado para IDs de hojas seleccionadas (array)
  const [selectedSheetIds, setSelectedSheetIds] = useState<string[]>([sheetOptions[0].id]); 
  const [query, setQuery] = useState<string>('');
  const [response, setResponse] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Manejador para cambiar la selección de hojas
  const handleSheetSelectionChange = (sheetId: string) => {
    setSelectedSheetIds(prevSelected =>
      prevSelected.includes(sheetId)
        ? prevSelected.filter(id => id !== sheetId) // Deseleccionar si ya está
        : [...prevSelected, sheetId] // Seleccionar si no está
    );
  };

  const handleQuery = async () => {
    // Validar que al menos una hoja esté seleccionada
    if (selectedSheetIds.length === 0) {
      setError('Por favor, selecciona al menos una hoja de cálculo.');
      return;
    }
    if (!query.trim() || isLoading) return;

    setIsLoading(true);
    setError('');
    setResponse('');

    // Obtener nombres de las hojas seleccionadas para logs/mensajes
    const selectedSheetNames = sheetOptions
        .filter(option => selectedSheetIds.includes(option.id))
        .map(option => option.name)
        .join(', ');
    console.log(`Enviando consulta: "${query}" para Hojas: [${selectedSheetNames}] (IDs: ${selectedSheetIds.join(', ')})`);

    try {
      // Llamar a la Netlify Function con el array de IDs
      const backendResponse = await fetch('/.netlify/functions/sheets-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Enviar el array de IDs
        body: JSON.stringify({ sheetIds: selectedSheetIds, userQuery: query }), 
      });

      console.log("Respuesta del backend recibida, estado:", backendResponse.status);

      if (!backendResponse.ok) {
        let errorData = { error: 'Error desconocido del servidor', details: 'No se pudo obtener detalle' };
        try {
          errorData = await backendResponse.json();
          console.error("Error data del backend:", errorData);
        } catch (parseError) {
          console.error("No se pudo parsear el JSON del error del backend.");
          errorData.details = await backendResponse.text();
        }
        throw new Error(errorData.details || errorData.error || `Error ${backendResponse.status}`);
      }

      const data = await backendResponse.json();
      console.log("Datos de respuesta del backend:", data);
      setResponse(data.response);

    } catch (err: any) {
      console.error("Error en handleQuery:", err);
      setError(err.message || 'Ocurrió un error inesperado al procesar la consulta.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="h-full flex flex-col p-5 bg-gradient-to-br from-blue-50/30 via-indigo-50/20 to-white/80 backdrop-blur-sm"
    >
      {/* Encabezado */}
      <div className="flex items-center justify-between mb-5">
        <motion.div
          initial={{ y: -5, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-2"
        >
          <Sheet className="w-4 h-4 text-indigo-500/80" />
          <h3 className="font-medium text-gray-700/90 text-sm tracking-wide">Asistente Sheets</h3>
        </motion.div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded-full bg-white/50 backdrop-blur-sm border border-white/40 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-3 h-3" />
        </motion.button>
      </div>

      {/* Cuerpo Principal */}
      <div className="flex-1 flex flex-col overflow-hidden space-y-4">
        {/* Selector de Hojas (Checkboxes) */}
        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
          <label className="block text-xs font-medium text-gray-600/80 mb-2">
            Seleccionar Hojas de Cálculo (una o más)
          </label>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {sheetOptions.map(option => (
              <motion.button
                key={option.id}
                onClick={() => handleSheetSelectionChange(option.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-all duration-150 w-full 
                  ${selectedSheetIds.includes(option.id)
                    ? 'bg-indigo-50/80 border border-indigo-200/70 text-indigo-700 shadow-sm'
                    : 'bg-white/60 border border-white/70 text-gray-600 hover:bg-white/80'}
                `}
                whileTap={{ scale: 0.97 }}
              >
                {selectedSheetIds.includes(option.id) ? (
                  <CheckSquare className="w-4 h-4 flex-shrink-0 text-indigo-500" />
                ) : (
                  <Square className="w-4 h-4 flex-shrink-0 text-gray-300" />
                )}
                <span className="truncate">{option.name}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Área de Respuesta */}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex-1 overflow-y-auto p-4 rounded-xl bg-white/50 backdrop-blur-sm border border-white/50 shadow-inner min-h-[150px] text-sm text-gray-700/90 flex items-center justify-center"
        >
          {isLoading ? (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-2 text-indigo-500"
            >
              <Loader className="w-5 h-5 animate-spin" />
              <span className="text-xs">Consultando asistente...</span>
            </motion.div>
          ) : error ? (
            <div className="text-center text-red-600/90">
              <AlertCircle className="w-6 h-6 mx-auto mb-2" />
              <p className="text-xs font-medium">Error:</p>
              <p className="text-xs">{error}</p>
            </div>
          ) : response ? (
            <p className="whitespace-pre-wrap">{response}</p>
          ) : (
            <p className="text-gray-400/80 text-xs text-center">
              Selecciona una o más hojas, escribe tu consulta y presiona "Consultar".
            </p>
          )}
        </motion.div>

        {/* Input de Consulta */}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex gap-2 items-center"
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleQuery()}
            placeholder="Ej: ¿Comparar montos Otay y Palmas este mes?"
            disabled={isLoading}
            className={`flex-1 px-4 py-2 rounded-xl bg-white/80 backdrop-blur-md border border-white/70 focus:outline-none focus:ring-2 focus:ring-indigo-300 text-sm transition-all duration-200 text-gray-700 placeholder-gray-400/70 shadow-sm ${isLoading ? 'opacity-70' : ''}`}
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleQuery}
            disabled={isLoading || !query.trim() || selectedSheetIds.length === 0}
            className={`p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 text-white hover:from-indigo-600 hover:to-blue-600 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isLoading ?
              <Loader className="w-4 h-4 animate-spin" /> :
              <Send className="w-4 h-4" />
            }
          </motion.button>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default SheetsAssistant; 