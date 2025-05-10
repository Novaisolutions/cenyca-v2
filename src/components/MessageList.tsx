import { format, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';
import { CheckCheck, Maximize2 } from 'lucide-react';
import { Mensaje } from '../types/database';
import { RefObject, useEffect, memo, useMemo, useState } from 'react';
import DOMPurify from 'dompurify';
import { Virtuoso } from 'react-virtuoso';

interface MessageListProps {
  messages: Mensaje[];
  onImageClick: (url: string) => void;
  containerRef: RefObject<HTMLDivElement>;
}

// Componente para un único mensaje (extraído para mejorar el rendimiento)
const MessageItem = memo(({ 
  message, 
  onImageClick, 
  formatWhatsAppText,
  isValidMediaUrl,
  getImageAltText 
}: { 
  message: Mensaje, 
  onImageClick: (url: string) => void,
  formatWhatsAppText: (text: string) => string,
  isValidMediaUrl: (url?: string | null) => boolean,
  getImageAltText: (msg: Mensaje) => string
}) => {
  return (
    <div
      className={`flex ${message.tipo === 'entrada' ? 'justify-start' : 'justify-end'} py-1`}
    >
      <div
        className={`max-w-[80%] rounded-2xl px-3 py-2 shadow-sm ${
          message.tipo === 'entrada'
            ? 'bg-white/80 backdrop-blur-md rounded-tl-none border border-gray-100'
            : 'bg-blue-50/80 backdrop-blur-md rounded-tr-none border border-blue-100'
        }`}
      >
        {isValidMediaUrl(message.media_url) && (
          <div 
            className="relative cursor-pointer mb-2" 
            onClick={() => message.media_url && onImageClick(message.media_url)}
            role="button"
            tabIndex={0}
            aria-label={`Ver imagen en tamaño completo de ${format(new Date(message.fecha), 'dd/MM/yyyy HH:mm')}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                message.media_url && onImageClick(message.media_url);
              }
            }}
          >
            <img
              src={message.media_url || ''}
              alt={getImageAltText(message)}
              loading="lazy"
              className="rounded-lg w-full shadow-md"
              style={{ 
                maxHeight: '180px', 
                objectFit: 'cover',
                aspectRatio: '16 / 9'
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 hover:opacity-100 transition-opacity duration-200">
              <Maximize2 className="w-6 h-6 text-white drop-shadow-lg" />
            </div>
          </div>
        )}
        <p 
          className="text-gray-700 message-text break-words" 
          dangerouslySetInnerHTML={{ __html: formatWhatsAppText(message.mensaje) }}
        />
        <div className="flex items-center gap-1 mt-1 text-xs text-gray-400 justify-end">
          {format(new Date(message.fecha), 'HH:mm')}
          {message.leido && <CheckCheck className="w-3 h-3 text-blue-500 ml-1" aria-label="Mensaje leído" />}
        </div>
      </div>
    </div>
  );
});

MessageItem.displayName = 'MessageItem';

// Componente para mostrar la fecha
const DateSeparator = memo(({ dateLabel }: { dateLabel: string }) => {
  return (
    <div className="flex justify-center mb-3 mt-3">
      <span className="px-3 py-1 rounded-full bg-blue-50 backdrop-blur-sm text-xs text-blue-500 shadow-sm">
        {dateLabel}
      </span>
    </div>
  );
});

DateSeparator.displayName = 'DateSeparator';

// Componente optimizado con memo para evitar re-renders innecesarios
const MessageList = memo(({ messages, onImageClick, containerRef }: MessageListProps) => {
  // Estado para alternar entre modo virtualizado y modo clásico
  const [useVirtualization, setUseVirtualization] = useState(false); // Modo clásico por defecto
  
  // Información de diagnóstico
  useEffect(() => {
    console.log(`MessageList recibió ${messages.length} mensajes:`, messages);
  }, [messages]);
  
  // Función para obtener la etiqueta de fecha formateada (memoizada)
  const getDateLabel = useMemo(() => (date: Date): string => {
    if (isToday(date)) {
      return 'Hoy';
    } else if (isYesterday(date)) {
      return 'Ayer';
    } else {
      return format(date, 'EEEE, d MMMM', { locale: es });
    }
  }, []);

  // Formatear el texto del mensaje estilo WhatsApp (memoizada)
  const formatWhatsAppText = useMemo(() => (text: string): string => {
    if (!text) return '';
    
    // Formato de texto: negrita, cursiva, tachado, etc. y enlaces
    let formattedText = text
      // Negrita: *texto* -> <strong>texto</strong>
      .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
      // Cursiva: _texto_ -> <em>texto</em>
      .replace(/_(.*?)_/g, '<em>$1</em>')
      // Tachado: ~texto~ -> <del>texto</del>
      .replace(/~(.*?)~/g, '<del>$1</del>')
      // Monoespaciado: ```texto``` -> <code>texto</code>
      .replace(/```(.*?)```/g, '<code>$1</code>')
      // Enlaces tipo markdown: [texto](url) -> <a href="url" target="_blank" rel="noopener noreferrer">texto</a>
      .replace(/\[(.*?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">$1</a>')
      // Enlaces tipo markdown sin texto: (url) -> <a href="url" target="_blank" rel="noopener noreferrer">url</a>
      .replace(/\((https?:\/\/[^\s)]+)\)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">$1</a>')
      // Saltos de línea: \n -> <br/>
      .replace(/\n/g, '<br/>');
    
    // Sanitizar el HTML para evitar XSS, permitiendo las etiquetas necesarias
    return DOMPurify.sanitize(formattedText, {
      USE_PROFILES: { html: true },
      ALLOWED_TAGS: ['strong', 'em', 'del', 'code', 'br', 'a'],
      ALLOWED_ATTR: ['href', 'target', 'rel', 'class']
    });
  }, []);

  // Comprobar si una URL de media es válida (memoizada)
  const isValidMediaUrl = useMemo(() => (url?: string | null): boolean => {
    return !!url && url.trim() !== '' && url !== 'Media' && !url.includes('Media');
  }, []);

  // Generar alt text descriptivo para imágenes (memoizada)
  const getImageAltText = useMemo(() => (msg: Mensaje): string => {
    const sender = msg.tipo === 'entrada' ? 'Recibida' : 'Enviada';
    const date = new Date(msg.fecha);
    const formattedDate = format(date, 'dd/MM/yyyy HH:mm');
    return `Imagen ${sender} el ${formattedDate}`;
  }, []);

  // Preprocesar los mensajes y crear el arreglo para la virtualización (memoizado)
  const { virtualItems, showEmptyMessage, groupedMessagesByDate } = useMemo(() => {
    console.log("Procesando mensajes para visualización:", messages.length);
    
    if (!messages || messages.length === 0) {
      console.log("No hay mensajes para mostrar");
      return { 
        virtualItems: [], 
        showEmptyMessage: true,
        groupedMessagesByDate: {}
      };
    }

    // Agrupar mensajes por fecha
    const groupedMessages: { [key: string]: Mensaje[] } = {};
    messages.forEach((msg) => {
      try {
        const messageDate = new Date(msg.fecha);
        const dateKey = format(messageDate, 'yyyy-MM-dd');
        
        if (!groupedMessages[dateKey]) {
          groupedMessages[dateKey] = [];
        }
        
        groupedMessages[dateKey].push(msg);
      } catch (error) {
        console.error("Error al procesar mensaje:", error);
      }
    });

    // Crear un arreglo plano para la virtualización
    const virtualItems: { type: 'date' | 'message', content: string | Mensaje, id: string }[] = [];
    const sortedDates = Object.keys(groupedMessages).sort();

    sortedDates.forEach((dateKey) => {
      const messagesForDate = groupedMessages[dateKey];
      if (!messagesForDate || messagesForDate.length === 0) return;
      
      const dateLabel = getDateLabel(new Date(messagesForDate[0].fecha));
      virtualItems.push({ 
        type: 'date', 
        content: dateLabel, 
        id: `date-${dateKey}` 
      });
      
      messagesForDate.forEach((msg) => {
        virtualItems.push({ 
          type: 'message', 
          content: msg, 
          id: `msg-${msg.id}` 
        });
      });
    });

    console.log(`Preparados ${virtualItems.length} items virtualizados para mostrar`);
    return { 
      virtualItems, 
      showEmptyMessage: false,
      groupedMessagesByDate: groupedMessages
    };
  }, [messages, getDateLabel]);

  // Desplazarse al último mensaje cuando se carguen mensajes
  useEffect(() => {
    if (containerRef.current && messages.length > 0) {
      console.log("Haciendo scroll al último mensaje");
      // Usar requestAnimationFrame para scroll más suave
      requestAnimationFrame(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
      });
    }
  }, [messages.length, containerRef]);

  // Efecto de alternancia para pruebas - puede eliminarse en la versión final
  useEffect(() => {
    // Evento para alternar modos con Alt+V para pruebas
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key === 'v') {
        console.log(`Cambiando modo de visualización: ${!useVirtualization ? 'Virtualizado' : 'Clásico'}`);
        setUseVirtualization(!useVirtualization);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [useVirtualization]);

  if (showEmptyMessage) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        No hay mensajes disponibles
      </div>
    );
  }

  // Render en modo clásico (para comparación)
  if (!useVirtualization) {
    // Obtener las fechas ordenadas
    const sortedDates = Object.keys(groupedMessagesByDate).sort();
    
    return (
      <div className="h-full py-2 px-2">
        {sortedDates.map((dateKey) => {
          const messagesForDate = groupedMessagesByDate[dateKey];
          if (!messagesForDate || messagesForDate.length === 0) return null;
          
          const dateLabel = getDateLabel(new Date(messagesForDate[0].fecha));
          
          return (
            <div key={dateKey} className="mb-4">
              <div className="flex justify-center mb-3">
                <span className="px-3 py-1 rounded-full bg-blue-50 backdrop-blur-sm text-xs text-blue-500 shadow-sm">
                  {dateLabel}
                </span>
              </div>
              
              <div className="space-y-3">
                {messagesForDate.map((msg) => (
                  <MessageItem 
                    key={msg.id}
                    message={msg} 
                    onImageClick={onImageClick}
                    formatWhatsAppText={formatWhatsAppText}
                    isValidMediaUrl={isValidMediaUrl}
                    getImageAltText={getImageAltText}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Render en modo virtualizado
  return (
    <div className="h-full px-2" ref={containerRef}>
      <Virtuoso
        style={{ height: '100%' }}
        totalCount={virtualItems.length}
        initialTopMostItemIndex={virtualItems.length > 0 ? virtualItems.length - 1 : 0}
        itemContent={(index) => {
          const item = virtualItems[index];
          
          if (item.type === 'date') {
            return <DateSeparator dateLabel={item.content as string} />;
          } else {
            return (
              <MessageItem 
                message={item.content as Mensaje} 
                onImageClick={onImageClick}
                formatWhatsAppText={formatWhatsAppText}
                isValidMediaUrl={isValidMediaUrl}
                getImageAltText={getImageAltText}
              />
            );
          }
        }}
        followOutput="auto"
      />
      
      {/* Indicador de modo para pruebas */}
      <div className="fixed bottom-0 right-0 bg-black/20 text-white text-xs p-1 rounded-tl pointer-events-none">
        Modo: Virtualizado (Alt+V para cambiar)
      </div>
    </div>
  );
});

MessageList.displayName = 'MessageList';

export default MessageList; 