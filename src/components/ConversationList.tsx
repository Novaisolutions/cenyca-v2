import { motion } from 'framer-motion';
import { Conversacion } from '../types/database';

interface ConversationListProps {
  conversations: Conversacion[];
  selectedId: number | null;
  onSelectConversation: (conversation: Conversacion) => void;
  onRefresh: () => void;
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

const ConversationList = ({ conversations, selectedId, onSelectConversation, onRefresh }: ConversationListProps) => {
  // Solo seleccionar la conversación al hacer clic, sin marcar como leída todavía
  const handleConversationClick = (conversation: Conversacion) => {
    onSelectConversation(conversation);
  };

  // Este efecto se maneja ahora en App.tsx cuando cambia la conversación seleccionada

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex-1 overflow-y-auto space-y-3 pr-1"
    >
      {conversations.map((conv) => (
        <motion.div
          key={conv.id}
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleConversationClick(conv)}
          className={`p-3 rounded-xl cursor-pointer transition-all backdrop-blur-md shadow-sm ${
            selectedId === conv.id
              ? 'bg-blue-100/60 border border-blue-200 shadow-md'
              : 'bg-white/60 border border-blue-50 hover:bg-blue-50/60 hover:shadow-md'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-400 flex items-center justify-center text-white font-medium shadow-md">
              {conv.nombre_contacto?.[0] || '#'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="font-medium truncate text-gray-700">
                  {conv.nombre_contacto || conv.numero}
                </p>
                {conv.tiene_no_leidos && (
                  <motion.span 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="px-2 py-0.5 text-xs bg-green-100 text-green-600 rounded-full backdrop-blur-sm"
                  >
                    {conv.no_leidos_count}
                  </motion.span>
                )}
              </div>
              <p className="text-sm text-gray-500 truncate" dangerouslySetInnerHTML={{ __html: formatWhatsAppStyle(conv.ultimo_mensaje_resumen || 'Sin mensajes') }} />
            </div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
};

export default ConversationList; 