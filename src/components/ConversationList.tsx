import React from 'react';
import { Virtuoso } from 'react-virtuoso';
import { ConversationListItem } from '../types/database';
import ConversationListItemComponent from './ConversationListItem';
import { Loader2 } from 'lucide-react';

interface ConversationListProps {
  items: ConversationListItem[];
  selectedId: string | null;
  onSelectItem: (item: ConversationListItem) => void;
  isLoading: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
}

const ConversationList: React.FC<ConversationListProps> = ({
  items,
  selectedId,
  onSelectItem,
  isLoading,
  onLoadMore = () => {},
}) => {
  if (isLoading && items.length === 0) {
    return (
      <div className="flex justify-center items-center h-full p-8">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        No se encontraron conversaciones.
      </div>
    );
  }

  return (
    <Virtuoso
      style={{ height: '100%' }}
      data={items}
      endReached={onLoadMore}
      components={{
        Footer: () =>
          isLoading ? (
            <div className="p-4 flex justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : null,
      }}
      itemContent={(index, item) => {
        return (
          <ConversationListItemComponent
            item={item}
            isSelected={selectedId === item.id}
            onSelect={() => onSelectItem(item)}
          />
        );
      }}
    />
  );
};

export default ConversationList; 