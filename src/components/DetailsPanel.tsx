import { motion } from 'framer-motion';
import { X, User } from 'lucide-react';
import { Conversacion, Mensaje } from '../types/database';

interface DetailsPanelProps {
  conversation: Conversacion | null;
  messages: Mensaje[];
  onClose: () => void;
  onImageClick: (url: string) => void;
}

// Comprobar si una URL de media es válida (no vacía y no es solo la palabra "Media")
const isValidMediaUrl = (url?: string | null): boolean => {
  return !!url && url.trim() !== '' && url !== 'Media' && !url.includes('Media');
};

const DetailsPanel = ({ conversation, messages, onClose, onImageClick }: DetailsPanelProps) => {
  return (
    <motion.div 
      initial={{ x: 50, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 50, opacity: 0 }}
      transition={{ type: "spring", stiffness: 100 }}
      className="h-full p-4 bg-white/60 backdrop-blur-md flex flex-col"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-gray-700">Detalles</h3>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
        >
          <X className="w-4 h-4 text-gray-500" />
        </motion.button>
      </div>
      
      {conversation ? (
        <div className="space-y-4 overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl bg-white/80 backdrop-blur-md border border-blue-100 shadow-sm"
          >
            <h4 className="font-medium mb-3 flex items-center gap-2 text-gray-700">
              <User className="w-4 h-4 text-blue-500" />
              Información de contacto
            </h4>
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-gray-500">Nombre:</span>{' '}
                <span className="text-gray-700">{conversation.nombre_contacto || 'No especificado'}</span>
              </p>
              <p>
                <span className="text-gray-500">Número:</span>{' '}
                <span className="text-gray-700">{conversation.numero}</span>
              </p>
              <p>
                <span className="text-gray-500">Estado:</span>{' '}
                <span className="text-gray-700">{conversation.status}</span>
              </p>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-4 rounded-xl bg-white/80 backdrop-blur-md border border-blue-100 shadow-sm"
          >
            <h4 className="font-medium mb-3 flex items-center gap-2 text-gray-700">
              Archivos compartidos
            </h4>
            <div className="space-y-2">
              {messages
                .filter((msg) => isValidMediaUrl(msg.media_url))
                .map((msg) => (
                  <motion.div
                    key={msg.id}
                    whileHover={{ scale: 1.02, y: -1 }}
                    className="p-2 rounded-lg bg-blue-50/80 backdrop-blur-md border border-blue-100 flex items-center gap-2 cursor-pointer shadow-sm hover:shadow-md transition-all"
                    onClick={() => msg.media_url && onImageClick(msg.media_url)}
                  >
                    <img 
                      src={msg.media_url || ''} 
                      alt=""
                      className="w-8 h-8 rounded object-cover shadow-sm"
                    />
                    <span className="text-sm truncate flex-1 text-gray-600">
                      {msg.media_url?.split('/').pop()}
                    </span>
                  </motion.div>
                ))}
              
              {messages.filter(msg => isValidMediaUrl(msg.media_url)).length === 0 && (
                <p className="text-sm text-gray-400 text-center py-2">
                  No hay archivos compartidos
                </p>
              )}
            </div>
          </motion.div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-full text-gray-400">
          Selecciona una conversación para ver detalles
        </div>
      )}
    </motion.div>
  );
};

export default DetailsPanel; 