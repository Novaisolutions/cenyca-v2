import { RefObject, useEffect, useRef, useState, useCallback, memo, useMemo, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Split from 'react-split';
import { Search, RefreshCcw, SplitSquareHorizontal, FileSpreadsheet, ArrowLeft, Loader2, ChevronDown } from 'lucide-react';
import { Menu, Transition } from '@headlessui/react';
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

// Componente para el encabezado de conversación (extraído para evitar re-renders)
const ConversationHeader = memo(({ 
  conversation, 
  onBack
}: { 
  conversation: Conversacion, 
  onBack: () => void 
}) => {
  return (
    <div className="flex items-center gap-3 mb-4">
      <button
        onClick={onBack}
        className="p-2 rounded-xl bg-white/60 backdrop-blur-md hover:bg-blue-50 border border-blue-100 transition-all shadow-sm"
      >
        <ArrowLeft className="w-4 h-4 text-blue-500" />
      </button>
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-400 flex items-center justify-center text-white font-medium shadow-md">
        {conversation.nombre_contacto?.[0] || '#'}
      </div>
      <h2 className="font-medium text-gray-700">
        {conversation.nombre_contacto || conversation.numero}
      </h2>
    </div>
  );
});

ConversationHeader.displayName = 'ConversationHeader';

// Componente para la barra de búsqueda (extraído para evitar re-renders)
const SearchBar = memo(({ 
  searchTerm, 
  onSearchChange, 
  isSearchingMessages 
}: { 
  searchTerm: string, 
  onSearchChange: (value: string) => void, 
  isSearchingMessages: boolean 
}) => {
  // Estado interno para implementar debounce
  const [inputValue, setInputValue] = useState(searchTerm);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Efecto para sincronizar el estado interno con la prop
  useEffect(() => {
    setInputValue(searchTerm);
  }, [searchTerm]);

  // Manejar cambios con debounce
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    // Limpiar temporizador anterior
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Establecer un nuevo temporizador (300ms de delay)
    debounceTimerRef.current = setTimeout(() => {
      onSearchChange(value);
    }, 300);
  }, [onSearchChange]);

  // Limpiar temporizador al desmontar
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 w-4 h-4" />
      <input
        type="text"
        placeholder="Buscar por nombre, número o contenido..."
        className="w-full pl-9 pr-10 py-2 rounded-xl bg-white/60 backdrop-blur-md border border-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm transition-all duration-200 text-gray-700 placeholder-gray-400 shadow-sm"
        value={inputValue}
        onChange={handleChange}
      />
      {isSearchingMessages && (
        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 animate-spin" />
      )}
    </div>
  );
});

SearchBar.displayName = 'SearchBar';

// Lista de enlaces de Google Sheets
const googleSheetsLinks = [
  { name: 'General', url: 'https://docs.google.com/spreadsheets/d/1D9FjqSgWiG9NlYFKwxypYs0u4sF2qM9YOTJ1LKDitco/edit?gid=203833951#gid=203833951' },
  { name: 'Bot Finanzas Otay', url: 'https://docs.google.com/spreadsheets/d/1aEaURED9v_5qQofM-i5DzRnJ7CG61tiKFhUq4Z_0bqY' },
  { name: 'Bot Finanzas Palmas', url: 'https://docs.google.com/spreadsheets/d/1QhpV3roUhkTEjRfAT8jui19ymunMnq87tUgO_Hb6nR0' },
  { name: 'Bot Finanzas Casa Blanca', url: 'https://docs.google.com/spreadsheets/d/1ZdT8jF8iQMKYsibGIlk9sANTcz1A4pCKyyobY2DiXK8' },
  { name: 'Bot Finanzas Tecate', url: 'https://docs.google.com/spreadsheets/d/1QzEWM5R-A3yiSam4a_H46y3mKeg20rFfU4rUFp5xFwc' },
  { name: 'Bot Finanzas Ensenada', url: 'https://docs.google.com/spreadsheets/d/1MeyoW1bZh5tXsHeb8rXgh-R2KiUuz6tsfYWPQUoBzNI' }
];

// Componente para los botones de acción (actualizado con menú desplegable)
const ActionButtons = memo(({ 
  onRefresh, 
  onSplitModeToggle, 
}: { 
  onRefresh: () => void, 
  onSplitModeToggle: () => void, 
}) => {
  return (
    <div className="flex gap-2">
      <button
        onClick={onRefresh}
        className="p-2 rounded-xl bg-white/60 backdrop-blur-md hover:bg-blue-50 border border-blue-100 transition-all shadow-sm"
        title="Actualizar"
        aria-label="Actualizar conversaciones"
      >
        <RefreshCcw className="w-4 h-4 text-blue-500" />
      </button>
      <button
        onClick={onSplitModeToggle}
        className="p-2 rounded-xl bg-white/60 backdrop-blur-md hover:bg-blue-50 border border-blue-100 transition-all shadow-sm"
        title="Cambiar vista"
        aria-label="Cambiar modo de visualización"
      >
        <SplitSquareHorizontal className="w-4 h-4 text-blue-500" />
      </button>

      {/* Menú desplegable para Google Sheets */}
      <Menu as="div" className="relative inline-block text-left">
        <div>
          <Menu.Button className="inline-flex justify-center w-full p-2 rounded-xl bg-white/60 backdrop-blur-md hover:bg-blue-50 border border-blue-100 transition-all shadow-sm text-sm font-medium text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75" title="Google Sheets">
            <FileSpreadsheet className="w-4 h-4 text-blue-500" aria-hidden="true" />
            <ChevronDown className="w-4 h-4 text-blue-500 ml-1 -mr-1" aria-hidden="true" />
          </Menu.Button>
        </div>
        <Transition
          as={Fragment}
          enter="transition ease-out duration-100"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <Menu.Items className="absolute right-0 w-56 mt-2 origin-top-right bg-white divide-y divide-gray-100 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
            <div className="px-1 py-1 ">
              {googleSheetsLinks.map((link) => (
                <Menu.Item key={link.name}>
                  {({ active }) => (
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${
                        active ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
                      } group flex rounded-md items-center w-full px-2 py-2 text-sm`}
                    >
                      {link.name}
                    </a>
                  )}
                </Menu.Item>
              ))}
            </div>
          </Menu.Items>
        </Transition>
      </Menu>
    </div>
  );
});

ActionButtons.displayName = 'ActionButtons';

// Componente principal optimizado
const ChatPanel = memo(({
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
  // Auto-refresh con useCallback para que no cambie en cada render
  const handleAutoRefresh = useCallback(() => {
    onRefresh();
  }, [onRefresh]);
  
  // Auto-refresh cada 5 minutos 
  useEffect(() => {
    const intervalId = setInterval(handleAutoRefresh, 5 * 60 * 1000); 
    return () => clearInterval(intervalId);
  }, [handleAutoRefresh]);

  // Memoizar el callback para seleccionar conversación nula
  const handleBackToList = useCallback(() => {
    onSelectConversation(null);
  }, [onSelectConversation]);
  
  // Renderizado de la bandeja de entrada móvil (memoizado)
  const mobileInbox = useMemo(() => {
    if (!isMobile) return null;
    
    return (
      <div className="h-full flex flex-col">
        <div className="p-2 border-b border-blue-100">
          <div className="flex items-center justify-between gap-2 mb-2">
            <SearchBar 
              searchTerm={searchTerm} 
              onSearchChange={onSearchChange} 
              isSearchingMessages={isSearchingMessages} 
            />
            <button
              onClick={onRefresh}
              className="p-1.5 rounded-xl bg-white/60 backdrop-blur-md hover:bg-blue-50 border border-blue-100 transition-all shadow-sm"
              title="Actualizar"
            >
              <RefreshCcw className="w-4 h-4 text-blue-500" />
            </button>
          </div>
          
          <h2 className="font-medium text-lg text-gray-700 mb-3 pl-1">Bandeja de entrada</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ConversationList 
            conversations={conversations} 
            selectedId={null} 
            onSelectConversation={onSelectConversation}
            onRefresh={onRefresh}
          />
          
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
      </div>
    );
  }, [isMobile, searchTerm, onSearchChange, isSearchingMessages, onRefresh, conversations, onSelectConversation]);

  // Renderizado de la conversación móvil (memoizado)
  const mobileConversation = useMemo(() => {
    if (!isMobile || !selectedConversation) return null;
    
    return (
      <div className="h-full w-full flex flex-col">
        <div className="p-2 border-b border-blue-100 bg-white/80">
          <div className="flex items-center gap-2">
            <button
              onClick={handleBackToList}
              className="p-1.5 rounded-xl bg-white/80 hover:bg-blue-50 border border-blue-100 shadow-sm"
            >
              <ArrowLeft className="w-4 h-4 text-blue-500" />
            </button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-400 flex items-center justify-center text-white font-medium shadow-md">
              {selectedConversation.nombre_contacto?.[0] || '#'}
            </div>
            <h2 className="font-medium text-gray-700">
              {selectedConversation.nombre_contacto || selectedConversation.numero}
            </h2>
          </div>
        </div>
        
        <div 
          className="flex-1 overflow-auto w-full"
          style={{ height: 'calc(100% - 56px)' }}
          ref={messagesContainerRef}
        >
          {messages && messages.length > 0 ? (
            <MessageList 
              messages={messages} 
              onImageClick={onImageClick} 
              containerRef={messagesContainerRef} 
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              No hay mensajes en esta conversación
            </div>
          )}
        </div>
      </div>
    );
  }, [isMobile, selectedConversation, handleBackToList, messages, onImageClick, messagesContainerRef]);

  // Renderizado de la vista de escritorio (Split) (memoizado)
  const splitView = useMemo(() => {
    if (isMobile || !splitMode) return null;
    
    return (
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
            <div className="flex-1 overflow-auto" ref={messagesContainerRef}>
              <MessageList 
                messages={messages} 
                onImageClick={onImageClick} 
                containerRef={messagesContainerRef} 
              />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            Selecciona una conversación
          </div>
        )}
      </Split>
    );
  }, [isMobile, splitMode, conversations, selectedConversation, onSelectConversation, onRefresh, messages, onImageClick, messagesContainerRef]);

  // Renderizado de la vista normal de escritorio (memoizado)
  const normalView = useMemo(() => {
    if (isMobile || splitMode) return null;
    
    return (
      <div className="h-[calc(100vh-8rem)] overflow-hidden">
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
            <ConversationHeader 
              conversation={selectedConversation} 
              onBack={handleBackToList} 
            />
            <div className="flex-1 overflow-auto" ref={messagesContainerRef}>
              <MessageList 
                messages={messages} 
                onImageClick={onImageClick} 
                containerRef={messagesContainerRef} 
              />
            </div>
          </div>
        )}
      </div>
    );
  }, [isMobile, splitMode, selectedConversation, conversations, onSelectConversation, onRefresh, handleBackToList, messages, onImageClick, messagesContainerRef]);

  // Renderizado para dispositivos móviles
  if (isMobile) {
    return (
      <div className="h-full w-full bg-white">
        {selectedConversation ? mobileConversation : mobileInbox}
      </div>
    );
  }

  // Renderizado para escritorio
  return (
    <div 
      className="h-full flex flex-col bg-transparent backdrop-blur-md p-4"
      style={{ minHeight: '500px' }} // Altura mínima para evitar saltos en el layout
    >
      <div className="flex items-center justify-between gap-4 mb-4">
        <SearchBar 
          searchTerm={searchTerm} 
          onSearchChange={onSearchChange} 
          isSearchingMessages={isSearchingMessages} 
        />
        <ActionButtons 
          onRefresh={onRefresh} 
          onSplitModeToggle={onSplitModeToggle} 
        />
      </div>

      {/* Contenedor con altura mínima para evitar cambios de layout */}
      <div className="flex-1 overflow-hidden" style={{ minHeight: '400px' }}>
        {splitMode ? splitView : normalView}
      </div>
      
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
  );
});

ChatPanel.displayName = 'ChatPanel';

export default ChatPanel; 