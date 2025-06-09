import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useChatData } from './hooks/useChatData';
import ChatPanel from './components/ChatPanel';
import ImageModal from './components/ImageModal';
import UpdatesPopup from './components/UpdatesPopup';
import { PanelLeft, BarChart, TrendingUp, X, Calendar, BarChart2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { VirtuosoHandle } from 'react-virtuoso';
import { Toaster } from 'sonner';

function App() {
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const {
    conversations,
    selectedConversation,
    onConversationSelected,
    messages,
    searchTerm,
    setSearchTerm,
    loadingConversations,
    hasMoreConversations,
    loadMoreConversations,
    loadMoreMessages,
    hasMoreMessages,
    loadingMessages,
  } = useChatData(virtuosoRef);

  const navigate = useNavigate();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showUpdatesPopup, setShowUpdatesPopup] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [daysUntilPayment, setDaysUntilPayment] = useState<number | null>(null);

  // Lógica para calcular días hasta el pago
  useEffect(() => {
    const checkPaymentDate = () => {
      const today = new Date();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();

      // Fecha de pago este mes (día 10)
      const paymentDate = new Date(currentYear, currentMonth, 10);

      // Si ya pasó el día 10, la próxima fecha de pago es el mes siguiente
      if (today.getDate() > 10) {
        paymentDate.setMonth(paymentDate.getMonth() + 1);
      }

      // Calcular diferencia en días
      const diffTime = paymentDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      setDaysUntilPayment(diffDays);
    };

    checkPaymentDate();

    // Verificar diariamente
    const intervalId = setInterval(checkPaymentDate, 24 * 60 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);

    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);

  useEffect(() => {
    if (isMobile) {
      navigate('/chat');
    }
  }, [isMobile, navigate]);

  useEffect(() => {
    const popupCount = parseInt(localStorage.getItem('updatesPopupCount') || '0', 10);
    if (popupCount < 10) {
      setShowUpdatesPopup(true);
    }
  }, []);

  const handleCloseUpdatesPopup = () => {
    setShowUpdatesPopup(false);
  };

  const handleImageClick = (url: string) => setSelectedImage(url);
  const handleCloseModal = () => setSelectedImage(null);

  if (isMobile) {
    return <div className="flex justify-center items-center h-screen"><p>Redirigiendo a la versión móvil...</p></div>;
  }

  return (
    <>
      <Toaster richColors position="top-center" />
      <div className="h-screen w-screen bg-background flex items-center justify-center font-sans">
        <div className="h-full w-full max-w-screen-2xl mx-auto flex flex-col">
          <main className="flex-1 flex flex-col bg-card shadow-lg rounded-b-lg overflow-hidden">
             <ChatPanel
                conversations={conversations}
                selectedConversation={selectedConversation}
                onSelectConversation={onConversationSelected}
                messages={messages}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                messagesContainerRef={virtuosoRef}
                loadingConversations={loadingConversations}
                hasMoreConversations={hasMoreConversations}
                loadMoreConversations={loadMoreConversations}
                loadMoreMessages={loadMoreMessages}
                hasMoreMessages={hasMoreMessages}
                loadingMessages={loadingMessages}
                onImageClick={handleImageClick}
              />
          </main>
        </div>
      </div>
      {selectedImage && <ImageModal imageUrl={selectedImage} onClose={handleCloseModal} />}
      {showUpdatesPopup && <UpdatesPopup onClose={handleCloseUpdatesPopup} />}
    </>
  );
}

export default App;