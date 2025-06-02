import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Sheet, Send, Loader, AlertCircle, CheckSquare, Square, MessageSquare, Trash2 } from 'lucide-react';

interface SheetsAssistantProps {
  onClose: () => void;
}

// Tipo para mensajes de conversación
interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sheetsRead?: Array<{
    spreadsheetId: string;
    sheetName: string;
    rowCount: number;
  }>;
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
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
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

    // Agregar la pregunta del usuario a la conversación
    const userMessage: ConversationMessage = {
      role: 'user',
      content: query,
      timestamp: new Date()
    };
    setConversation([...conversation, userMessage]);

    // Obtener nombres de las hojas seleccionadas para logs/mensajes
    const selectedSheetNames = sheetOptions
        .filter(option => selectedSheetIds.includes(option.id))
        .map(option => option.name)
        .join(', ');
    console.log(`Enviando consulta: "${query}" para Hojas: [${selectedSheetNames}] (IDs: ${selectedSheetIds.join(', ')})`);

    try {
      // Preparar el historial de conversación para enviar (sin el mensaje actual)
      const conversationHistory = conversation.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Llamar a la Netlify Function con el array de IDs y el historial
      const backendResponse = await fetch('/.netlify/functions/sheets-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Enviar el array de IDs y el historial de conversación
        body: JSON.stringify({ 
          sheetIds: selectedSheetIds, 
          userQuery: query,
          conversationHistory: conversationHistory
        }), 
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

      // Agregar la respuesta del asistente a la conversación
      const assistantMessage: ConversationMessage = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        sheetsRead: data.sheetsRead
      };
      setConversation(prev => [...prev, assistantMessage]);
      setQuery(''); // Limpiar el input

    } catch (err: any) {
      console.error("Error en handleQuery:", err);
      setError(err.message || 'Ocurrió un error inesperado al procesar la consulta.');
    } finally {
      setIsLoading(false);
    }
  };

  // Función para limpiar la conversación
  const clearConversation = () => {
    setConversation([]);
    setQuery('');
    setError('');
  };

  // Función para obtener el nombre de la hoja por ID
  const getSheetNameById = (id: string) => {
    const sheet = sheetOptions.find(option => option.id === id);
    return sheet ? sheet.name : 'Desconocido';
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
      <div className="flex items-center justify-between mb-4">
        <motion.div
          initial={{ y: -5, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-2"
        >
          <Sheet className="w-4 h-4 text-indigo-500/80" />
          <h3 className="font-medium text-gray-700/90 text-sm tracking-wide">Asistente Sheets</h3>
        </motion.div>
        <div className="flex items-center gap-2">
          {conversation.length > 0 && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={clearConversation}
              className="px-2 py-1 text-xs rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              Limpiar
            </motion.button>
          )}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-full bg-white/50 backdrop-blur-sm border border-white/40 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-3 h-3" />
          </motion.button>
        </div>
      </div>

      {/* Cuerpo Principal */}
      <div className="flex-1 flex flex-col overflow-hidden space-y-3">
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
                <span className="truncate text-xs">{option.name}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Área de Conversación */}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex-1 overflow-y-auto p-4 rounded-xl bg-white/50 backdrop-blur-sm border border-white/50 shadow-inner"
        >
          {error && (
            <div className="text-center text-red-600/90 mb-4">
              <AlertCircle className="w-5 h-5 mx-auto mb-2" />
              <p className="text-xs font-medium">Error:</p>
              <p className="text-xs">{error}</p>
            </div>
          )}
          
          {conversation.length === 0 && !error ? (
            <div className="text-gray-400/80 text-xs text-center">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p>Selecciona una o más hojas y haz una pregunta sobre los datos.</p>
              <p className="mt-2 text-[10px]">Se leerán todas las pestañas de los archivos seleccionados.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {conversation.map((msg, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] rounded-lg p-3 ${
                    msg.role === 'user' 
                      ? 'bg-indigo-500 text-white' 
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    <p className="text-xs whitespace-pre-wrap">{msg.content}</p>
                    {msg.sheetsRead && msg.sheetsRead.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-200 text-[10px] opacity-70">
                        <p className="font-medium mb-1">Hojas leídas:</p>
                        {msg.sheetsRead.map((sheet, idx) => (
                          <p key={idx}>• {sheet.sheetName} ({sheet.rowCount} filas)</p>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-gray-100 rounded-lg p-3 flex items-center gap-2">
                    <Loader className="w-4 h-4 animate-spin text-indigo-500" />
                    <span className="text-xs text-gray-600">Analizando datos...</span>
                  </div>
                </motion.div>
              )}
            </div>
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
            placeholder="Ej: ¿Cuál es el total de montos en junio?"
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