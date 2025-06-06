import { format, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { Loader2 } from 'lucide-react';
import { MessageListItem } from '../types/database';
import { memo } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import MessageItem from './MessageItem';

interface MessageListProps {
  messages: MessageListItem[];
  onImageClick: (url: string) => void;
  onLoadMore: () => void;
  hasMore: boolean;
  isLoadingInitial: boolean;
  isLoadingMore: boolean;
  containerRef: React.RefObject<VirtuosoHandle>;
}

const MessageList = memo(({ 
  messages, 
  onImageClick, 
  onLoadMore,
  hasMore,
  isLoadingInitial,
  isLoadingMore,
  containerRef,
}: MessageListProps) => {

  if (isLoadingInitial) {
    return (
      <div className="flex flex-col justify-center items-center h-full">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <span className="mt-3 text-muted-foreground">Cargando conversación...</span>
      </div>
    );
  }
  
  if (!isLoadingInitial && messages.length === 0) {
    return (
      <div className="flex justify-center items-center h-full">
        <p className="text-muted-foreground">Aún no hay mensajes.</p>
      </div>
    );
  }

  return (
    <Virtuoso
      ref={containerRef}
      style={{ height: '100%' }}
      data={messages}
      initialTopMostItemIndex={messages.length - 1}
      firstItemIndex={hasMore ? 1 : 0}
      startReached={onLoadMore}
      components={{
        Header: () => (
          hasMore ? (
            <div className="flex justify-center py-4">
              {isLoadingMore && <Loader2 className="w-6 h-6 text-primary animate-spin" />}
            </div>
          ) : (
            <div className="flex justify-center py-4">
              <span className="text-xs text-muted-foreground">Has llegado al inicio de la conversación.</span>
            </div>
          )
        ),
        Item: ({ children, ...props }) => {
          const index = props['data-item-index'];
          const message = messages[index];
          const prevMessage = messages[index - 1];

          let showDateSeparator = true;
          if (prevMessage) {
            const currentDate = new Date(message.fecha);
            const prevDate = new Date(prevMessage.fecha);
            showDateSeparator = currentDate.toDateString() !== prevDate.toDateString();
          }

          const getDateLabel = (date: Date): string => {
            if (isToday(date)) return 'Hoy';
            return format(date, 'eeee, dd MMMM', { locale: es });
          };

          return (
            <div {...props}>
              {showDateSeparator && (
                 <div className="flex justify-center my-4">
                   <span className="px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs font-semibold">
                     {getDateLabel(new Date(message.fecha))}
                   </span>
                 </div>
              )}
              {children}
            </div>
          );
        }
      }}
      itemContent={(index, message) => (
        <div className="px-4 md:px-6 lg:px-12">
          <MessageItem message={message} onImageClick={onImageClick} />
        </div>
      )}
    />
  );
});

MessageList.displayName = 'MessageList';

export default MessageList; 