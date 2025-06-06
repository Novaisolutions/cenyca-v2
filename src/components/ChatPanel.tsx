import React, { useState } from 'react';
import Split from 'react-split';
import { ArrowLeft } from 'lucide-react';
import { ConversationListItem, MessageListItem } from '../types/database';
import SidePanel from './SidePanel';
import MessageList from './MessageList';
import WelcomePanel from './WelcomePanel';
import { VirtuosoHandle } from 'react-virtuoso';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

interface ChatPanelProps {
  conversations: ConversationListItem[];
  selectedConversation: ConversationListItem | null;
  onSelectConversation: (conversation: ConversationListItem | null) => void;
  messages: MessageListItem[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  messagesContainerRef: React.RefObject<VirtuosoHandle>;
  loadingConversations: boolean;
  hasMoreConversations: boolean;
  loadMoreConversations: () => void;
  loadMoreMessages: () => void;
  hasMoreMessages: boolean;
  loadingMessages: boolean;
  onImageClick: (url: string) => void;
}

const ChatPanel: React.FC<ChatPanelProps> = ({
  conversations,
  selectedConversation,
  onSelectConversation,
  messages,
  searchTerm,
  setSearchTerm,
  messagesContainerRef,
  loadingConversations,
  hasMoreConversations,
  loadMoreConversations,
  loadMoreMessages,
  hasMoreMessages,
  loadingMessages,
  onImageClick,
}) => {
  const [isMobileConversationView, setIsMobileConversationView] = useState(false);

  React.useEffect(() => {
    setIsMobileConversationView(!!selectedConversation);
  }, [selectedConversation]);

  const handleBack = () => {
    onSelectConversation(null);
  };

  const sidePanel = (
    <SidePanel
      displayItems={conversations}
      selectedConversationId={selectedConversation?.id || null}
      onSelectConversation={(item) => onSelectConversation(item as ConversationListItem)}
      isLoading={loadingConversations}
      hasMore={hasMoreConversations}
      onLoadMore={loadMoreConversations}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
    />
  );

  const messageView = selectedConversation ? (
    <>
      <div className="flex-grow overflow-y-auto">
        <MessageList
          containerRef={messagesContainerRef}
          messages={messages}
          onImageClick={onImageClick}
          onLoadMore={loadMoreMessages}
          hasMore={hasMoreMessages}
          isLoadingInitial={loadingMessages && messages.length === 0}
          isLoadingMore={loadingMessages && messages.length > 0}
        />
      </div>
    </>
  ) : (
    <WelcomePanel />
  );

  return (
    <div className="flex-1 flex w-full h-full bg-background">
      {/* Desktop View */}
      <div className="hidden md:flex md:w-full h-full">
        <Split
          className="flex w-full h-full"
          sizes={[30, 70]}
          minSize={350}
          gutterSize={6}
          gutterAlign="center"
          snapOffset={30}
          dragInterval={1}
          direction="horizontal"
          cursor="col-resize"
        >
          <div className="h-full overflow-y-auto">{sidePanel}</div>
          <div className="flex flex-col h-full bg-background">{messageView}</div>
        </Split>
      </div>

      {/* Mobile View */}
      <div className="md:hidden w-full h-full overflow-hidden relative">
        <AnimatePresence initial={false}>
          <motion.div
            key="list"
            className="w-full h-full absolute top-0 left-0"
            initial={{ x: '0%' }}
            animate={{ x: isMobileConversationView ? '-100%' : '0%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {sidePanel}
          </motion.div>
        </AnimatePresence>
        <AnimatePresence>
          {selectedConversation && (
            <motion.div
              key="conversation"
              className="w-full h-full absolute top-0 left-0 flex flex-col bg-background"
              initial={{ x: '100%' }}
              animate={{ x: isMobileConversationView ? '0%' : '100%' }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <header className="flex items-center p-2 border-b border-border shadow-sm">
                <button
                  onClick={handleBack}
                  className="p-2 text-muted-foreground hover:text-foreground rounded-full"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h3 className="font-semibold text-foreground ml-2 truncate">
                  {selectedConversation.nombre_contacto || selectedConversation.numero}
                </h3>
              </header>
              {messageView}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ChatPanel; 