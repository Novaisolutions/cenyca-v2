import { motion } from 'framer-motion';
import { format, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';
import { CheckCheck, Maximize2 } from 'lucide-react';
import { Mensaje } from '../types/database';
import { RefObject, useEffect } from 'react';

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

interface MessageListProps {
  messages: Mensaje[];
  onImageClick: (url: string) => void;
  containerRef: RefObject<HTMLDivElement>;
}

const MessageList = ({ messages, onImageClick, containerRef }: MessageListProps) => {
  // Función para obtener la etiqueta de fecha formateada
  const getDateLabel = (date: Date): string => {
    if (isToday(date)) {
      return 'Hoy';
    } else if (isYesterday(date)) {
      return 'Ayer';
    } else {
      return format(date, 'EEEE, d MMMM', { locale: es });
    }
  };

  // Agrupar mensajes por fecha
  const groupedMessages: { [key: string]: Mensaje[] } = {};
  messages.forEach((msg) => {
    const messageDate = new Date(msg.fecha);
    const dateKey = format(messageDate, 'yyyy-MM-dd');
    
    if (!groupedMessages[dateKey]) {
      groupedMessages[dateKey] = [];
    }
    
    groupedMessages[dateKey].push(msg);
  });

  // Desplazarse al último mensaje cuando se carguen mensajes
  useEffect(() => {
    if (containerRef.current && messages.length > 0) {
      setTimeout(() => {
        containerRef.current?.scrollTo({
          top: containerRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }, 100);
    }
  }, [messages, containerRef]);

  // Comprobar si una URL de media es válida (no vacía y no es solo la palabra "Media")
  const isValidMediaUrl = (url?: string | null): boolean => {
    return !!url && url.trim() !== '' && url !== 'Media' && !url.includes('Media');
  };

  return (
    <div className="flex-1 overflow-y-auto space-y-5 pr-2" ref={containerRef}>
      {Object.keys(groupedMessages).sort().map((dateKey) => {
        const messagesForDate = groupedMessages[dateKey];
        const dateLabel = getDateLabel(new Date(messagesForDate[0].fecha));
        
        return (
          <div key={dateKey} className="space-y-4">
            <div className="flex justify-center">
              <span className="px-3 py-1 rounded-full bg-blue-50 backdrop-blur-sm text-xs text-blue-500 shadow-sm">
                {dateLabel}
              </span>
            </div>
            
            {messagesForDate.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 100 }}
                className={`flex ${msg.tipo === 'entrada' ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-2 shadow-sm ${
                    msg.tipo === 'entrada'
                      ? 'bg-white/80 backdrop-blur-md rounded-tl-none border border-gray-100'
                      : 'bg-blue-50/80 backdrop-blur-md rounded-tr-none border border-blue-100'
                  }`}
                >
                  {isValidMediaUrl(msg.media_url) && (
                    <div className="relative cursor-pointer group" onClick={() => msg.media_url && onImageClick(msg.media_url)}>
                      <img
                        src={msg.media_url || ''}
                        alt=""
                        className="rounded-lg max-w-full mb-2 transition-transform duration-200 group-hover:scale-[1.02] shadow-md"
                        style={{ maxHeight: '200px', objectFit: 'cover' }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <Maximize2 className="w-6 h-6 text-white drop-shadow-lg" />
                      </div>
                    </div>
                  )}
                  <p 
                    className="text-gray-700"
                    data-tour="formato-texto"
                    dangerouslySetInnerHTML={{ __html: formatWhatsAppStyle(msg.mensaje) }}
                  />
                  <div className="flex items-center gap-1 mt-1 text-xs text-gray-400 justify-end">
                    {format(new Date(msg.fecha), 'HH:mm')}
                    {msg.leido && <CheckCheck className="w-3 h-3 text-blue-500 ml-1" />}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        );
      })}
    </div>
  );
};

export default MessageList; 