import { memo } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Check, CheckCheck, Maximize2 } from 'lucide-react';
import DOMPurify from 'dompurify';
import { MessageListItem } from '../types/database';
import { cn } from '../lib/utils';

// Helper functions moved inside or used directly by MessageItem
const isValidMediaUrl = (url?: string | null): boolean => {
    return !!url && url.trim() !== '' && !url.includes('Media');
};

const formatWhatsAppText = (text: string): string => {
    if (!text) return '';
    const sanitizedText = text
      .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
      .replace(/_(.*?)_/g, '<em>$1</em>')
      .replace(/~(.*?)~/g, '<del>$1</del>')
      .replace(/\n/g, '<br/>');
    return DOMPurify.sanitize(sanitizedText);
};

const getImageAltText = (msg: MessageListItem): string => {
    if (msg.mensaje && msg.mensaje.trim().length > 0) return msg.mensaje;
    if (msg.tipo === 'entrada') return 'Imagen recibida';
    return 'Imagen enviada';
};

interface MessageItemProps {
    message: MessageListItem;
    onImageClick: (url: string) => void;
}

const MessageItem = memo(({ message, onImageClick }: MessageItemProps) => {
    const isIncoming = message.tipo === 'entrada';

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, type: 'spring', stiffness: 200, damping: 25 }}
            className={cn('flex w-full my-1', isIncoming ? 'justify-start' : 'justify-end')}
        >
            <div
                className={cn(
                    'max-w-[75%] rounded-2xl px-3.5 py-2.5 shadow-sm flex flex-col',
                    isIncoming
                        ? 'bg-secondary text-secondary-foreground rounded-bl-md'
                        : 'bg-primary text-primary-foreground rounded-br-md'
                )}
            >
                {message.media_url && (
                    <div
                        className="relative cursor-pointer mb-2"
                        onClick={() => onImageClick(message.media_url!)}
                    >
                        <img
                            src={message.media_url}
                            alt={message.mensaje || 'Imagen adjunta'}
                            loading="lazy"
                            className="rounded-lg max-w-xs object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity rounded-lg">
                            <Maximize2 className="w-6 h-6 text-white" />
                        </div>
                    </div>
                )}
                {message.mensaje && (
                    <div
                        className="break-words"
                        dangerouslySetInnerHTML={{ __html: formatWhatsAppText(message.mensaje) }}
                    />
                )}
                <div
                    className={cn(
                        'flex items-center gap-1.5 mt-1.5 text-xs self-end',
                        isIncoming ? 'text-muted-foreground' : 'text-primary-foreground/70'
                    )}
                >
                    <span>{format(new Date(message.fecha), 'HH:mm')}</span>
                    {!isIncoming && (
                        message.leido ? (
                            <CheckCheck className="w-4 h-4" />
                        ) : (
                            <Check className="w-4 h-4" />
                        )
                    )}
                </div>
            </div>
        </motion.div>
    );
});

MessageItem.displayName = 'MessageItem';
export default MessageItem; 