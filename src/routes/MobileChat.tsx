import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, RefreshCcw, Phone, BarChart2 } from 'lucide-react';
import { useChatData } from '../hooks/useChatData';
import ChatPanel from '../components/ChatPanel';
import ImageModal from '../components/ImageModal';

const MobileChat = () => {
  const navigate = useNavigate();
  const { 
    selectedConversation,
    messages,
    searchTerm,
    filteredConversations,
    isSearchingMessages,
    messagesContainerRef,
    setSelectedConversation,
    setSearchTerm,
    loadConversations,
    loadMessages
  } = useChatData();

  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Función para actualizar (más simple ahora)
  const handleRefresh = () => {
    loadConversations();
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
    }
  };

  // Función para abrir imagen modal
  const handleImageClick = (url: string) => {
    setSelectedImage(url);
  };

  // Función para cerrar imagen modal
  const handleCloseImage = () => {
    setSelectedImage(null);
  };

  // Función para volver a la pantalla principal
  const goToHome = () => {
    navigate('/');
  };
  
  // Función para ir a la página de estadísticas
  const goToStats = () => {
    navigate('/estadisticas');
  };

  return (
    <div className="h-[100vh] w-full flex flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button 
            onClick={goToHome}
            className="p-2 rounded-lg bg-blue-50 text-blue-600"
          >
            <Home size={20} />
          </button>
          <h1 className="text-xl font-semibold text-gray-800">Mensajes</h1>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleRefresh}
            className="p-2 rounded-lg bg-blue-50 text-blue-600"
          >
            <RefreshCcw size={20} />
          </button>
          <button 
            onClick={goToStats}
            className="p-2 rounded-lg bg-blue-50 text-blue-600"
            title="Ver estadísticas"
          >
            <BarChart2 size={20} />
          </button>
          <a 
            href="tel:+34000000000"
            className="p-2 rounded-lg bg-green-50 text-green-600"
          >
            <Phone size={20} />
          </a>
        </div>
      </header>
      
      {/* Panel principal de chat */}
      <div className="flex-1 overflow-hidden">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="h-full"
        >
          <ChatPanel
            conversations={filteredConversations}
            selectedConversation={selectedConversation}
            messages={messages}
            searchTerm={searchTerm}
            splitMode={false}
            messagesContainerRef={messagesContainerRef}
            onSearchChange={setSearchTerm}
            onRefresh={handleRefresh}
            onSplitModeToggle={() => {}}
            onSelectConversation={setSelectedConversation}
            onImageClick={handleImageClick}
            isSearchingMessages={isSearchingMessages}
            isMobile={true}
          />
        </motion.div>
      </div>
      
      {/* Modal de imagen */}
      {selectedImage && (
        <ImageModal
          imageUrl={selectedImage}
          onClose={handleCloseImage}
        />
      )}
    </div>
  );
};

export default MobileChat; 