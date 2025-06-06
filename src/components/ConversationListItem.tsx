import React from 'react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { ConversationListItem as Conversation } from '../types/database';
import { cn } from '../lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from './ui/Avatar';

interface ConversationListItemProps {
  item: Conversation;
  isSelected: boolean;
  onSelect: () => void;
}

const ConversationListItem: React.FC<ConversationListItemProps> = ({ item, isSelected, onSelect }) => {
  const getInitials = (name: string | null) => {
    if (!name) return '#';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('');
  };

  return (
    <motion.div
      layout
      animate={{ opacity: 1, y: 0 }}
      initial={{ opacity: 0, y: 5 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      onClick={onSelect}
      className={cn(
        'flex items-center p-3 cursor-pointer border-l-2 transition-colors duration-150',
        isSelected
          ? 'bg-primary/10 border-primary'
          : 'border-transparent hover:bg-accent'
      )}
    >
      <Avatar>
        <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${item.nombre_contacto || ''}`} alt={item.nombre_contacto || ''} />
        <AvatarFallback>{getInitials(item.nombre_contacto)}</AvatarFallback>
      </Avatar>
      <div className="flex-1 ml-3 overflow-hidden">
        <div className="flex justify-between items-center">
          <p className="font-semibold text-sm text-foreground truncate">
            {item.nombre_contacto}
          </p>
          <p className="text-xs text-muted-foreground flex-shrink-0">
            {formatDistanceToNow(new Date(item.updated_at), { addSuffix: true, locale: es })}
          </p>
        </div>
        <div className="flex justify-between items-start mt-1">
          <p className="text-xs text-muted-foreground truncate pr-2">
            {item.ultimo_mensaje_resumen}
          </p>
          {item.no_leidos_count && item.no_leidos_count > 0 && (
            <span className="flex-shrink-0 bg-primary text-primary-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {item.no_leidos_count}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ConversationListItem; 