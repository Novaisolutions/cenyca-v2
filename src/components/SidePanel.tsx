import React from 'react';
import { ConversationListItem } from '../types/database';
import ConversationList from './ConversationList';
import { Search } from 'lucide-react';
import QuickAccess from './QuickAccess';

interface SidePanelProps {
  displayItems: ConversationListItem[];
  selectedConversationId: string | null;
  onSelectConversation: (item: ConversationListItem) => void;
  isLoading: boolean;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onLoadMore: () => void;
  hasMore: boolean;
}

const SidePanel: React.FC<SidePanelProps> = ({
  displayItems,
  selectedConversationId,
  onSelectConversation,
  isLoading,
  searchTerm,
  onSearchChange,
  onLoadMore,
  hasMore,
}) => {
  return (
    <div className="flex flex-col h-full bg-secondary/30 border-r border-border">
      <div className="p-4 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar conversaciones..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>
      <QuickAccess />
      <div className="flex-grow overflow-y-auto">
        <ConversationList
          items={displayItems}
          selectedId={selectedConversationId}
          onSelectItem={onSelectConversation}
          isLoading={isLoading}
          hasMore={hasMore}
          onLoadMore={onLoadMore}
        />
      </div>
    </div>
  );
};

export default SidePanel; 