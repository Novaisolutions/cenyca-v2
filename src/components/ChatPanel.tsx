import { RefObject, useEffect } from 'react';
import { motion } from 'framer-motion';
import Split from 'react-split';
import { Search, RefreshCcw, SplitSquareHorizontal, FileSpreadsheet, ArrowLeft, Loader2 } from 'lucide-react';
import { Conversacion, Mensaje } from '../types/database';
import ConversationList from './ConversationList';
import MessageList from './MessageList';

interface ChatPanelProps {
  conversations: Conversacion[];
  selectedConversation: Conversacion | null;
  messages: Mensaje[];
  searchTerm: string;
  splitMode: boolean;
  messagesContainerRef: RefObject<HTMLDivElement>;
  onSearchChange: (term: string) => void;
  onRefresh: () => void;
  onSplitModeToggle: () => void;
  onSelectConversation: (conversation: Conversacion | null) => void;
  onImageClick: (url: string) => void;
  isSearchingMessages?: boolean;
  isMobile?: boolean;
}

const ChatPanel = ({
  conversations,
  selectedConversation,
  messages,
  searchTerm,
  splitMode,
  messagesContainerRef,
  onSearchChange,
  onRefresh,
  onSplitModeToggle,
  onSelectConversation,
  onImageClick,
  isSearchingMessages = false,
  isMobile = false
}: ChatPanelProps) => {
  // Auto-refresh cada 3 minutos
  useEffect(() => {
    const intervalId = setInterval(() => {
      onRefresh();
    }, 3 * 60 * 1000); // 3 minutos en milisegundos
    
    return () => clearInterval(intervalId);
  }, [onRefresh]);
  
  // Función para abrir el enlace de Google Sheets
  const openGoogleSheets = () => {
    window.open('https://docs.google.com/spreadsheets/d/1D9FjqSgWiG9NlYFKwxypYs0u4sF2qM9YOTJ1LKDitco/edit?gid=203833951#gid=203833951', '_blank');
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col bg-transparent backdrop-blur-md"
    >
      <div className={`${isMobile ? 'p-2' : 'p-4'} border-b border-blue-100`}>
        <div className={`flex items-center justify-between gap-${isMobile ? '2' : '4'} mb-${isMobile ? '2' : '4'}`}>
          <div className="relative flex-1" data-tour="buscar-chat">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 w-4 h-4" />
            <input
              type="text"
              placeholder={isMobile ? "Buscar..." : "Buscar por nombre, número o contenido..."}
              className="w-full pl-9 pr-10 py-2 rounded-xl bg-white/60 backdrop-blur-md border border-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm transition-all duration-200 text-gray-700 placeholder-gray-400 shadow-sm"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
            />
            {isSearchingMessages && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 animate-spin" />
            )}
          </div>
          <div className={`flex gap-${isMobile ? '1' : '2'}`}>
            <motion.button
              whileHover={{ scale: 1.05, y: -1 }}
              whileTap={{ scale: 0.95 }}
              onClick={onRefresh}
              className={`p-${isMobile ? '1.5' : '2'} rounded-xl bg-white/60 backdrop-blur-md hover:bg-blue-50 border border-blue-100 transition-all shadow-sm`}
              title="Actualizar"
            >
              <RefreshCcw className="w-4 h-4 text-blue-500" />
            </motion.button>
            {!isMobile && (
              <>
                <motion.button
                  whileHover={{ scale: 1.05, y: -1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onSplitModeToggle}
                  className="p-2 rounded-xl bg-white/60 backdrop-blur-md hover:bg-blue-50 border border-blue-100 transition-all shadow-sm"
                  title="Cambiar vista"
                >
                  <SplitSquareHorizontal className="w-4 h-4 text-blue-500" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05, y: -1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={openGoogleSheets}
                  className="p-2 rounded-xl bg-white/60 backdrop-blur-md hover:bg-blue-50 border border-blue-100 transition-all shadow-sm"
                  title="Google Sheets"
                >
                  <FileSpreadsheet className="w-4 h-4 text-blue-500" />
                </motion.button>
              </>
            )}
          </div>
        </div>

        {(splitMode && !isMobile) ? (
          <Split
            sizes={[30, 70]}
            minSize={[150, 300]}
            gutterSize={8}
            className="flex h-[calc(100vh-8rem)]"
            gutterStyle={() => ({
              backgroundColor: 'rgba(219, 234, 254, 0.5)',
              cursor: 'col-resize'
            })}
          >
            <ConversationList 
              conversations={conversations} 
              selectedId={selectedConversation?.id || null} 
              onSelectConversation={onSelectConversation}
              onRefresh={onRefresh}
            />
            {selectedConversation ? (
              <div className="flex flex-col h-full">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-400 flex items-center justify-center text-white font-medium shadow-md">
                    {selectedConversation.nombre_contacto?.[0] || '#'}
                  </div>
                  <h2 className="font-medium text-gray-700">
                    {selectedConversation.nombre_contacto || selectedConversation.numero}
                  </h2>
                </div>
                <MessageList 
                  messages={messages} 
                  onImageClick={onImageClick} 
                  containerRef={messagesContainerRef} 
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                Selecciona una conversación
              </div>
            )}
          </Split>
        ) : (
          <div className={`h-[calc(100vh-${isMobile ? '5rem' : '8rem'})] overflow-hidden`}>
            {!selectedConversation ? (
              <div className="h-full overflow-y-auto">
                <ConversationList 
                  conversations={conversations} 
                  selectedId={null} 
                  onSelectConversation={onSelectConversation}
                  onRefresh={onRefresh}
                />
              </div>
            ) : (
              <div className="flex flex-col h-full">
                <div className={`flex items-center gap-3 mb-${isMobile ? '2' : '4'}`}>
                  <motion.button
                    whileHover={{ scale: 1.05, y: -1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onSelectConversation(null)}
                    className={`p-${isMobile ? '1.5' : '2'} rounded-xl bg-white/60 backdrop-blur-md hover:bg-blue-50 border border-blue-100 transition-all shadow-sm`}
                  >
                    <ArrowLeft className="w-4 h-4 text-blue-500" />
                  </motion.button>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-400 flex items-center justify-center text-white font-medium shadow-md">
                    {selectedConversation.nombre_contacto?.[0] || '#'}
                  </div>
                  <h2 className="font-medium text-gray-700">
                    {selectedConversation.nombre_contacto || selectedConversation.numero}
                  </h2>
                </div>
                <MessageList 
                  messages={messages} 
                  onImageClick={onImageClick} 
                  containerRef={messagesContainerRef} 
                />
              </div>
            )}
          </div>
        )}
        
        {searchTerm.length > 0 && conversations.length === 0 && !isSearchingMessages && (
          <div className="mt-4 text-center text-gray-500">
            No se encontraron resultados para "{searchTerm}"
          </div>
        )}
        
        {searchTerm.length >= 3 && isSearchingMessages && (
          <div className="mt-4 text-center text-blue-500 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Buscando en contenido de mensajes...
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ChatPanel; 