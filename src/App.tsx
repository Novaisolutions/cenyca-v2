import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import AIAssistant from './components/AIAssistant';
import FinanceBot from './components/FinanceBot';
import ImageModal from './components/ImageModal';
import ChatPanel from './components/ChatPanel';
import { TourProvider, useTour } from './lib/TourContext';
import AppTour, { TourButton } from './components/AppTour';
import TextFormatExample from './components/TextFormatExample';

// Componente wrapper para acceder al contexto del tour
const AppContent = () => {
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [showAI, setShowAI] = useState(true);
  const [splitMode, setSplitMode] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [assistantMode, setAssistantMode] = useState<'chat' | 'finance'>('chat');
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [messageContentConversations, setMessageContentConversations] = useState([]);
  const [isSearchingMessages, setIsSearchingMessages] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  const { showFormatExample } = useTour();
  
  // Detectar si el dispositivo es móvil
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Cargar conversaciones al inicio
  useEffect(() => {
    // Simulamos cargar conversaciones desde la base de datos
    setConversations([
      {
        id: 1,
        nombre_contacto: 'Juan Pérez',
        numero: '+5215512345678',
        ultimo_mensaje_resumen: 'Hola, ¿cómo estás?',
        tiene_no_leidos: true,
        no_leidos_count: 3
      },
      {
        id: 2,
        nombre_contacto: 'María González',
        numero: '+5215587654321',
        ultimo_mensaje_resumen: '¿Ya recibiste el pago?',
        tiene_no_leidos: false,
        no_leidos_count: 0
      }
    ]);
  }, []);

  // Cargar mensajes cuando se selecciona una conversación
  useEffect(() => {
    if (currentConversation) {
      // Simulamos cargar mensajes desde la base de datos
      setMessages([
        {
          id: 1,
          conversacion_id: currentConversation.id,
          mensaje: 'Hola, *necesito* información sobre el _curso_ de ~programación~.',
          tipo: 'entrada',
          fecha: new Date(2023, 3, 28, 10, 30),
          leido: true
        },
        {
          id: 2,
          conversacion_id: currentConversation.id,
          mensaje: 'Claro, el curso comienza el próximo lunes. ¿Te interesa inscribirte?',
          tipo: 'salida',
          fecha: new Date(2023, 3, 28, 10, 32),
          leido: true
        },
        {
          id: 3,
          conversacion_id: currentConversation.id,
          mensaje: 'Sí, ¿cuál es el costo?',
          tipo: 'entrada',
          fecha: new Date(),
          leido: false
        }
      ]);
    }
  }, [currentConversation]);

  // Filtrar conversaciones por término de búsqueda
  const filteredConversations = conversations.filter(conv => 
    conv.nombre_contacto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.numero?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    messageContentConversations.some(mc => mc.id === conv.id)
  );

  // Manejar búsqueda en contenido de mensajes
  useEffect(() => {
    if (searchTerm.length >= 3) {
      setIsSearchingMessages(true);
      
      // Simulamos búsqueda en el contenido de los mensajes
      setTimeout(() => {
        setMessageContentConversations(
          searchTerm.includes('pago') 
            ? [{ id: 2 }] 
            : []
        );
        setIsSearchingMessages(false);
      }, 1000);
    } else {
      setMessageContentConversations([]);
    }
  }, [conversations, searchTerm, messageContentConversations]);

  return (
    <>
      <div className="h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-4 p-1">
        <div className="h-full rounded-2xl overflow-hidden bg-white/70 backdrop-blur-xl border border-white/60 shadow-lg">
          {/* Panel principal */}
          <AnimatePresence mode="wait">
            <ChatPanel
              conversations={filteredConversations}
              currentConversation={currentConversation}
              setCurrentConversation={setCurrentConversation}
              messages={messages}
              setMessages={setMessages}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              isSearchingMessages={isSearchingMessages}
              isMobile={isMobile}
              messagesContainerRef={messagesContainerRef}
              onImageClick={setSelectedImage}
              splitMode={splitMode}
              setSplitMode={setSplitMode}
              showAI={showAI}
              setShowAI={setShowAI}
              assistantMode={assistantMode}
              setAssistantMode={setAssistantMode}
            />
          </AnimatePresence>

          {/* Asistente IA / FinanceBot */}
          <AnimatePresence mode="wait">
            {showAI && (
              assistantMode === 'chat' ? (
                <AIAssistant key="ai" onClose={() => setShowAI(false)} />
              ) : (
                <FinanceBot key="finance" onClose={() => setShowAI(false)} />
              )
            )}
          </AnimatePresence>
        </div>

        {/* Modal de imágenes */}
        <ImageModal imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />
      </div>
      
      {/* Ejemplo de formato de texto (mostrado solo durante el tour) */}
      {showFormatExample && (
        <div className="fixed bottom-20 right-4 z-50 w-80">
          <TextFormatExample />
        </div>
      )}
    </>
  );
};

function App() {
  return (
    <TourProvider>
      <AppContent />
      <AppTour />
      <TourButton />
    </TourProvider>
  );
}

export default App;