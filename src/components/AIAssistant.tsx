import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Send, Bot, Loader, Brain, Database } from 'lucide-react';
import AutomationStatsCard from './AutomationStats';
import { getDatabaseContext, getContextBasedOnQuery, sendMessageToGemini } from '../services/aiService';

interface AIAssistantProps {
  onClose: () => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
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

const AIAssistant = ({ onClose }: AIAssistantProps) => {
  const [aiMessage, setAiMessage] = useState('');
  const [aiChat, setAiChat] = useState<ChatMessage[]>([
    { role: 'assistant', content: '¡Hola! Soy Gemini 1.5 Flash. ¿En qué puedo ayudarte con el análisis de tus conversaciones?' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [databaseContext, setDatabaseContext] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [processingStage, setProcessingStage] = useState<
    'idle' | 'analyzing' | 'searching' | 'generating'
  >('idle');

  // Cargar contexto básico al iniciar
  useEffect(() => {
    const loadContext = async () => {
      try {
        setStatusMessage('Cargando contexto inicial...');
        setIsLoading(true);
        // Obtenemos solo el contexto básico inicial
        const context = await getDatabaseContext();
        setDatabaseContext(context);
      } catch (error) {
        console.error("Error cargando contexto:", error);
      } finally {
        setIsLoading(false);
        setStatusMessage('');
      }
    };
    
    loadContext();
  }, []);

  const handleAISubmit = async () => {
    if (!aiMessage.trim() || isLoading) return;
    
    // Mensaje del usuario
    const userMessage = { role: 'user' as const, content: aiMessage };
    
    // Añadir mensaje del usuario al chat
    setAiChat(prevChat => [...prevChat, userMessage]);
    setAiMessage('');
    setIsLoading(true);
    
    // Comenzar proceso
    setProcessingStage('analyzing');
    setStatusMessage('Analizando tu consulta...');
    
    // Pequeña pausa para mostrar el estado de análisis
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Mensaje de carga con indicación de etapa
    setAiChat(prevChat => [...prevChat, { 
      role: 'assistant', 
      content: 'Analizando información relevante para tu consulta...'
    }]);
    
    try {
      // Etapa de búsqueda
      setProcessingStage('searching');
      setStatusMessage('Buscando datos relevantes...');
      
      // Obtener contexto específico para esta consulta
      let specificContext = databaseContext;
      
      // Si es una consulta que necesita contexto específico, lo obtenemos
      if (requiresSpecificContext(userMessage.content)) {
        specificContext = await getContextBasedOnQuery(userMessage.content);
      }
      
      // Pequeña pausa para mostrar el estado de búsqueda
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Actualizar mensaje de carga
      setAiChat(prevChat => [
        ...prevChat.slice(0, -1), 
        { role: 'assistant', content: 'Consultando datos específicos para tu pregunta...' }
      ]);
      
      // Etapa de generación
      setProcessingStage('generating');
      setStatusMessage('Generando respuesta inteligente...');
      
      // Enviar mensajes para contexto reciente
      const recentMessages = [
        ...aiChat.filter(msg => msg.role === 'user').slice(-4),
        userMessage
      ];
      
      // Obtener respuesta de Gemini
      const response = await sendMessageToGemini(recentMessages, specificContext);
      
      // Actualizar el chat con la respuesta real
      setAiChat(prevChat => [
        ...prevChat.slice(0, -1), // Eliminar el mensaje de carga
        { role: 'assistant', content: response }
      ]);
    } catch (error) {
      console.error("Error en la respuesta de IA:", error);
      // Actualizar con mensaje de error
      setAiChat(prevChat => [
        ...prevChat.slice(0, -1),
        { role: 'assistant', content: 'Lo siento, ocurrió un error al procesar tu solicitud. Por favor intenta de nuevo.' }
      ]);
    } finally {
      setIsLoading(false);
      setStatusMessage('');
      setProcessingStage('idle');
    }
  };

  // Función para determinar si una consulta requiere contexto específico
  const requiresSpecificContext = (query: string): boolean => {
    const query_lower = query.toLowerCase();
    
    // Consultas que no necesitan contexto específico (simples, generales o de ayuda)
    if (query_lower.includes('hola') || 
        query_lower.includes('ayuda') || 
        query_lower.includes('qué puedes hacer') ||
        query_lower.length < 15) {
      return false;
    }
    
    // Consultas específicas que sí necesitan contexto personalizado
    const specificTerms = [
      'busca', 'encuentra', 'muestra', 'dime', 'cuántos', 'quién', 'cuándo',
      'mensaje', 'conversación', 'contacto', 'cliente', 'número', 'estadísticas',
      'leído', 'no leído', 'último', 'reciente', 'antiguo', 'fecha'
    ];
    
    return specificTerms.some(term => query_lower.includes(term));
  };

  // Función para renderizar el ícono según la etapa de procesamiento
  const renderProcessingIcon = () => {
    switch (processingStage) {
      case 'analyzing':
        return <Brain className="w-4 h-4 text-blue-500 animate-pulse" />;
      case 'searching':
        return <Database className="w-4 h-4 text-blue-500 animate-pulse" />;
      case 'generating':
        return <Loader className="w-4 h-4 text-blue-500 animate-spin" />;
      default:
        return <Loader className="w-4 h-4 text-blue-500 animate-spin" />;
    }
  };

  return (
    <motion.div 
      data-tour="asistente-ai"
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: "spring", stiffness: 100 }}
      className="h-full flex flex-col p-4 bg-white/60 backdrop-blur-md"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-blue-600" />
          <h3 className="font-medium text-gray-700">Gemini Flash</h3>
          {isLoading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-1"
            >
              {renderProcessingIcon()}
              <span className="text-xs text-blue-500">{statusMessage}</span>
            </motion.div>
          )}
        </div>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
        >
          <X className="w-4 h-4 text-gray-500" />
        </motion.button>
      </div>

      {/* Estadísticas de Automatización */}
      <div className="mb-6">
        <AutomationStatsCard />
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {aiChat.map((msg, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              type: "spring", 
              stiffness: 100,
              // Hacer que los mensajes más recientes aparezcan más rápido
              duration: Math.max(0.2, 0.5 - (aiChat.length - idx) * 0.05)
            }}
            className={`flex ${msg.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2 shadow-sm backdrop-blur-md ${
                msg.role === 'assistant'
                  ? 'bg-white/80 border border-gray-100 rounded-tl-none'
                  : 'bg-blue-50/80 border border-blue-100 rounded-tr-none'
              }`}
            >
              <p className="text-sm text-gray-700" dangerouslySetInnerHTML={{ __html: formatWhatsAppStyle(msg.content) }} />
              {msg.role === 'assistant' && idx === aiChat.length - 1 && isLoading && processingStage === 'generating' && (
                <div className="mt-1 flex justify-end">
                  <span className="text-xs text-blue-400 animate-pulse">
                    Generando respuesta...
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-4">
        {/* Barra de estado para consultas largas */}
        {isLoading && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-2 w-full h-1 bg-gray-100 rounded-full overflow-hidden"
          >
            <motion.div 
              className="h-full bg-blue-500"
              initial={{ width: "0%" }}
              animate={{ 
                width: processingStage === 'analyzing' ? "30%" : 
                       processingStage === 'searching' ? "60%" : 
                       processingStage === 'generating' ? "90%" : "0%"
              }}
              transition={{ duration: 0.5 }}
            />
          </motion.div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={aiMessage}
            onChange={(e) => setAiMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAISubmit()}
            placeholder="Consulta sobre tus conversaciones..."
            disabled={isLoading}
            className={`flex-1 px-4 py-2 rounded-xl bg-white/80 backdrop-blur-md border border-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm transition-all duration-200 text-gray-700 placeholder-gray-400 shadow-sm ${isLoading ? 'opacity-70' : ''}`}
          />
          <motion.button
            whileHover={{ scale: 1.05, y: -1 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleAISubmit}
            disabled={isLoading}
            className={`p-2 rounded-xl bg-blue-400 backdrop-blur-md border border-blue-300 text-white hover:bg-blue-500 transition-all shadow-sm ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isLoading ? 
              renderProcessingIcon() : 
              <Send className="w-4 h-4" />
            }
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default AIAssistant; 