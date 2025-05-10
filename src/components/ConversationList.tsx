import { motion } from 'framer-motion';
import { useState, useEffect, RefObject, memo } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { RefreshCcw, Loader2 } from 'lucide-react';
import { Conversacion } from '../types/database';

interface ConversationListProps {
  conversations: Conversacion[];
  selectedId: number | null;
  onSelectConversation: (conversation: Conversacion) => void;
  onRefresh: () => void;
}

const ConversationList = memo(({ 
  conversations, 
  selectedId, 
  onSelectConversation, 
  onRefresh 
}: ConversationListProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await onRefresh();
    } finally {
      // Pequeña pausa antes de desactivar el loader para mejorar UX
      setTimeout(() => setIsLoading(false), 300);
    }
  };

  // Auto-refresh cada 5 minutos si la lista está visible
  useEffect(() => {
    const intervalId = setInterval(() => {
      handleRefresh();
    }, 5 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, [onRefresh]);

  // Formato de fecha mejorado
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return format(date, 'Pp', { locale: es }); // Ej: 10 ago. 2024, 14:30
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-blue-100 flex justify-end">
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="p-2 rounded-lg bg-white/80 backdrop-blur-md hover:bg-blue-50 border border-blue-100 transition-all shadow-sm flex items-center gap-1.5 text-xs text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCcw className="w-4 h-4" />
          )}
          Actualizar
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 && !isLoading && (
          <div className="p-4 text-center text-gray-500">
            No hay conversaciones.
          </div>
        )}
        
        {conversations.map((conv) => (
          <motion.div
            key={conv.id}
            onClick={() => onSelectConversation(conv)}
            className={`px-3 py-2.5 border-b border-blue-50/60 cursor-pointer transition-colors duration-150 hover:bg-blue-50/70 ${
              selectedId === conv.id ? 'bg-blue-100/80' : 'bg-transparent'
            }`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-400 flex items-center justify-center text-white text-sm font-medium shadow-sm">
                  {conv.nombre_contacto?.[0] || '#'}
                </div>
                <span className="font-medium text-gray-800 text-sm truncate max-w-[150px]">
                  {conv.nombre_contacto || conv.numero}
                </span>
              </div>
              {conv.tiene_no_leidos && (
                <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse"></span>
              )}
            </div>
            <p className="text-xs text-gray-500 truncate mb-1">
              {conv.ultimo_mensaje_resumen || 'Sin mensajes'}
            </p>
            <p className="text-xs text-gray-400 text-right">
              {formatDate(conv.updated_at)}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
});

ConversationList.displayName = 'ConversationList';

export default ConversationList; 