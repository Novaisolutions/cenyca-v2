import { useEffect, useState, useRef, useMemo } from 'react';
import Split from 'react-split';
import { motion } from 'framer-motion';
import { Conversacion, Mensaje } from './types/database';
import { 
  Brain,
  PanelLeft,
  PanelRight,
  BarChart,
  Menu as MenuIcon
} from 'lucide-react';
import {
  fetchConversations,
  fetchMessages,
  subscribeToConversations,
  subscribeToMessages,
  updateMessagesReadStatus,
  searchConversationsByMessageContent
} from './services/conversationService';
import AIAssistant from './components/AIAssistant';
import FinanceBot from './components/FinanceBot';
import DetailsPanel from './components/DetailsPanel';
import ImageModal from './components/ImageModal';
import ChatPanel from './components/ChatPanel';

function App() {
  const [conversations, setConversations] = useState<Conversacion[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversacion | null>(null);
  const [messages, setMessages] = useState<Mensaje[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDetails, setShowDetails] = useState(true);
  const [showAI, setShowAI] = useState(true);
  const [splitMode, setSplitMode] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<'chat' | 'assistant' | 'finance'>('chat');
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [columnSizes, setColumnSizes] = useState([20, 60, 20]);
  const [messageContentConversations, setMessageContentConversations] = useState<Conversacion[]>([]);
  const [isSearchingMessages, setIsSearchingMessages] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Resolver advertencias de event listeners no pasivos
  useEffect(() => {
    // Añadimos event listeners pasivos a todos los elementos scroll
    const addPassiveListeners = () => {
      // Encontrar todos los contenedores con scroll
      const scrollContainers = document.querySelectorAll('.overflow-y-auto, .overflow-auto, .split-wrapper');
      
      // Opciones para event listeners pasivos
      const options = { passive: true };
      
      // Funciones dummy para registrar como listeners
      const touchStartHandler = () => {};
      const touchMoveHandler = () => {};
      const wheelHandler = () => {};
      
      // Añadir event listeners pasivos a cada contenedor
      scrollContainers.forEach(container => {
        container.addEventListener('touchstart', touchStartHandler, options);
        container.addEventListener('touchmove', touchMoveHandler, options);
        container.addEventListener('wheel', wheelHandler, options);
      });
      
      // Sobreescribir el método addEventListener para los gutters de Split.js
      const originalAddEventListener = HTMLElement.prototype.addEventListener;
      HTMLElement.prototype.addEventListener = function(type, listener, options) {
        // Si es un evento touch en un elemento gutter de Split, forzar passive: true
        if ((type === 'touchstart' || type === 'touchmove') && 
            this.classList && 
            (this.classList.contains('gutter-horizontal') || this.classList.contains('gutter-vertical'))) {
          const newOptions = options || {};
          if (typeof newOptions === 'object') {
            newOptions.passive = true;
          } else {
            // Si options no es un objeto, convertirlo a uno
            return originalAddEventListener.call(this, type, listener, { passive: true });
          }
          return originalAddEventListener.call(this, type, listener, newOptions);
        }
        return originalAddEventListener.call(this, type, listener, options);
      };
      
      // Limpiar
      return () => {
        scrollContainers.forEach(container => {
          container.removeEventListener('touchstart', touchStartHandler);
          container.removeEventListener('touchmove', touchMoveHandler);
          container.removeEventListener('wheel', wheelHandler);
        });
        
        // Restaurar el método addEventListener original
        HTMLElement.prototype.addEventListener = originalAddEventListener;
      };
    };
    
    // Ejecutar después de que el componente esté montado
    const cleanup = addPassiveListeners();
    
    return cleanup;
  }, []);

  useEffect(() => {
    loadConversations();
    
    const subscription = subscribeToConversations(loadConversations);
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
      
      if (selectedConversation.tiene_no_leidos) {
        setConversations(prevConversations => 
          prevConversations.map(conv => 
            conv.id === selectedConversation.id 
              ? { ...conv, tiene_no_leidos: false, no_leidos_count: 0 } 
              : conv
          )
        );
        
        updateMessagesReadStatus(selectedConversation.id, true)
          .then(success => {
            if (success) {
              console.log('Mensajes marcados como leídos correctamente');
            } else {
              console.error('Error al marcar mensajes como leídos, revertiendo estado local');
              loadConversations();
            }
          });
      }
      
      const subscription = subscribeToMessages(
        selectedConversation.id,
        () => loadMessages(selectedConversation.id)
      );

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [selectedConversation]);

  useEffect(() => {
    const searchTimer = setTimeout(async () => {
      if (searchTerm && searchTerm.length >= 3) {
        setIsSearchingMessages(true);
        const matchingConversations = await searchConversationsByMessageContent(searchTerm);
        setMessageContentConversations(matchingConversations);
        setIsSearchingMessages(false);
      } else {
        setMessageContentConversations([]);
      }
    }, 500); // Debounce de 500ms

    return () => clearTimeout(searchTimer);
  }, [searchTerm]);

  const loadConversations = async () => {
    const conversationsData = await fetchConversations();
    setConversations(conversationsData);
  };

  const loadMessages = async (conversationId: number) => {
    const messagesData = await fetchMessages(conversationId);
    setMessages(messagesData);
  };


  const filteredConversations = useMemo(() => {
    const filteredByBasicInfo = conversations.filter(conv => {
      const matchContactInfo = conv.nombre_contacto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conv.numero.includes(searchTerm);
      
      const matchLastMessage = conv.ultimo_mensaje_resumen?.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchContactInfo || matchLastMessage;
    });

    if (searchTerm.length < 3 || messageContentConversations.length === 0) {
      return filteredByBasicInfo;
    }

    const combinedResults = [...filteredByBasicInfo];
    
    messageContentConversations.forEach(msgConv => {
      if (!combinedResults.some(conv => conv.id === msgConv.id)) {
        combinedResults.push(msgConv);
      }
    });

    return combinedResults;
  }, [conversations, searchTerm, messageContentConversations]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 py-2 px-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Logo" className="h-8 w-8" />
          <h1 className="text-lg font-bold text-gray-800">CENYCA</h1>
        </div>
        <div className="md:hidden">
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-md text-gray-500 hover:bg-gray-100"
          >
            <MenuIcon className="h-6 w-6" />
          </button>
        </div>
      </header>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-gray-200 p-4">
          <div className="flex flex-col space-y-4">
            <button 
              onClick={() => {
                setActivePanel("chat");
                setMobileMenuOpen(false);
              }}
              className={`p-2 rounded-md ${activePanel === "chat" ? "bg-blue-100 text-blue-700" : "text-gray-700"}`}
            >
              Chat
            </button>
            <button 
              onClick={() => {
                setActivePanel("assistant");
                setMobileMenuOpen(false);
              }}
              className={`p-2 rounded-md ${activePanel === "assistant" ? "bg-blue-100 text-blue-700" : "text-gray-700"}`}
            >
              Asistente
            </button>
            <button 
              onClick={() => {
                setActivePanel("finance");
                setMobileMenuOpen(false);
              }}
              className={`p-2 rounded-md ${activePanel === "finance" ? "bg-blue-100 text-blue-700" : "text-gray-700"}`}
            >
              Conciliación
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar - solo visible en MD y superiores */}
        <div className="hidden md:block md:w-64 lg:w-72 border-r border-gray-200 bg-white overflow-y-auto">
          <div className="p-4">
            <h2 className="text-lg font-semibold mb-4">Navegación</h2>
            <nav className="space-y-2">
              <button 
                onClick={() => setActivePanel("chat")}
                className={`w-full text-left p-2 rounded-md transition ${activePanel === "chat" ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100 text-gray-700"}`}
              >
                Chat
              </button>
              <button 
                onClick={() => setActivePanel("assistant")}
                className={`w-full text-left p-2 rounded-md transition ${activePanel === "assistant" ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100 text-gray-700"}`}
              >
                Asistente IA
              </button>
              <button 
                onClick={() => setActivePanel("finance")}
                className={`w-full text-left p-2 rounded-md transition ${activePanel === "finance" ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100 text-gray-700"}`}
              >
                Conciliación Bancaria
              </button>
            </nav>
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-hidden flex">
          {/* Panel principal (chat) - siempre visible en móvil */}
          <div className={`${!isMobile || activePanel === "chat" ? "flex-1" : "hidden"} md:flex-1 flex flex-col overflow-hidden`}>
            <ChatPanel
              conversations={filteredConversations}
              selectedConversation={selectedConversation}
              messages={messages}
              searchTerm={searchTerm}
              splitMode={splitMode}
              messagesContainerRef={messagesContainerRef}
              onSearchChange={setSearchTerm}
              onRefresh={loadConversations}
              onSplitModeToggle={() => setSplitMode(!splitMode)}
              onSelectConversation={setSelectedConversation}
              onImageClick={setSelectedImage}
              isSearchingMessages={isSearchingMessages}
            />
          </div>

          {/* Panel secundario (asistente o finanzas) - oculto en móvil excepto si está activo */}
          {(!isMobile || activePanel === "assistant" || activePanel === "finance") && (
            <div className="md:w-1/2 lg:w-2/5 border-l border-gray-200 flex flex-col overflow-hidden">
              {activePanel === "assistant" && <AIAssistant />}
              {activePanel === "finance" && <FinanceBot />}
            </div>
          )}
        </div>
      </main>

      {/* Details Panel */}
      {showDetails ? (
        <DetailsPanel
          conversation={selectedConversation}
          messages={messages}
          onClose={() => setShowDetails(false)}
          onImageClick={setSelectedImage}
        />
      ) : (
        <div className="flex justify-center items-center h-full backdrop-blur-md">
          <motion.button
            whileHover={{ scale: 1.1, y: -2 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowDetails(true)}
            className="p-2 rounded-full bg-blue-100/80 backdrop-blur-md hover:bg-blue-200/80 border border-blue-200/80 transition-all shadow-sm panel-button"
          >
            <PanelRight className="w-5 h-5 text-blue-600" />
          </motion.button>
        </div>
      )}

      {/* Image Modal */}
      <ImageModal imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />
    </div>
  );
}

export default App;