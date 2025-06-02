import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useChatData } from './hooks/useChatData';
import ChatPanel from './components/ChatPanel';
import ImageModal from './components/ImageModal';
import UpdatesPopup from './components/UpdatesPopup';
import InvoicePopup from './components/InvoicePopup';
import FinanceBot from './components/FinanceBot';
import StatsOnlyAssistant from './components/StatsOnlyAssistant';
import SheetsAssistant from './components/SheetsAssistant';
import { PanelLeft, BarChart, TrendingUp, X, Calendar, Sheet, BarChart2 } from 'lucide-react';
import Split from 'react-split';
import { useNavigate } from 'react-router-dom';

// Componente para el recordatorio de pago
const PaymentReminderBadge = ({ daysUntilPayment }: { daysUntilPayment: number }) => {
  // Función para determinar colores según los días restantes
  const getColorScheme = () => {
    if (daysUntilPayment <= 2) {
      return {
        bg: 'from-red-500/90 to-red-600/80',
        text: 'text-white',
        dot: 'bg-white',
        icon: 'text-red-100'
      };
    } else if (daysUntilPayment <= 5) {
      return {
        bg: 'from-orange-500/90 to-orange-600/80',
        text: 'text-white',
        dot: 'bg-white',
        icon: 'text-orange-100'
      };
    } else {
      return {
        bg: 'from-amber-500/90 to-amber-600/80',
        text: 'text-white',
        dot: 'bg-white',
        icon: 'text-amber-100'
      };
    }
  };

  const colors = getColorScheme();

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
    >
      <div className={`flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${colors.bg} shadow-lg backdrop-blur-md border border-white/20 ${colors.text} text-sm font-medium`}>
        <Calendar className={`w-4 h-4 ${colors.icon}`} />
        <div className={`w-2 h-2 rounded-full ${colors.dot} animate-pulse`} />
        <span>
          {daysUntilPayment === 0 
            ? "¡Hoy es día de pago!" 
            : daysUntilPayment === 1 
              ? "¡Mañana es día de pago!" 
              : `${daysUntilPayment} días para fecha de pago`}
        </span>
      </div>
    </motion.div>
  );
};

function App() {
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
  } = useChatData();

  const navigate = useNavigate();
  const [showAI, setShowAI] = useState(true);
  const [splitMode, setSplitMode] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [assistantMode, setAssistantMode] = useState<'stats' | 'finance' | 'sheets'>('stats');
  const [columnSizes, setColumnSizes] = useState([30, 70]);
  const [showUpdatesPopup, setShowUpdatesPopup] = useState(false);
  const [showInvoicePopup, setShowInvoicePopup] = useState(false);
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

    setShowInvoicePopup(false);
    localStorage.setItem('invoicePopupState', JSON.stringify({ show: false }));

    const handleShowInvoicePopup = () => {
      console.log('Popup de factura solicitado pero no mostrado - pago realizado');
    };
    
    window.addEventListener('showInvoicePopup', handleShowInvoicePopup);
    
    return () => {
      window.removeEventListener('showInvoicePopup', handleShowInvoicePopup);
    };
  }, []);

  const handleCloseUpdatesPopup = () => {
    setShowUpdatesPopup(false);
  };

  const handleCloseInvoicePopup = () => {
    setShowInvoicePopup(false);
  };

  // Función para ir a la página de estadísticas
  const goToStatsPage = () => {
    navigate('/estadisticas');
  };

  if (isMobile) {
    return <div className="flex justify-center items-center h-screen"><p>Redirigiendo a la versión móvil...</p></div>;
  }

  // Función para renderizar el componente del asistente correcto
  const renderAssistantComponent = () => {
    switch (assistantMode) {
      case 'stats':
        return <StatsOnlyAssistant onClose={() => setShowAI(false)} />;
      case 'finance':
        return <FinanceBot onClose={() => setShowAI(false)} />;
      case 'sheets':
        return <SheetsAssistant onClose={() => setShowAI(false)} />;
      default:
        return null;
    }
  };

  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 via-indigo-50/30 to-purple-50/30 p-3 md:p-5">
      <div className="h-full rounded-2xl overflow-hidden backdrop-blur-sm border border-white/60 shadow-md" style={{ backgroundColor: 'rgba(255, 255, 255, 0.85)' }}>
        {/* Botón de estadísticas flotante */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={goToStatsPage}
          className="fixed right-6 bottom-20 z-50 p-3 rounded-full bg-blue-500 text-white shadow-lg hover:bg-blue-600 transition-colors"
          title="Ver estadísticas completas"
        >
          <BarChart2 className="w-5 h-5" />
        </motion.button>

        <Split
          sizes={columnSizes}
          minSize={[150, 300]}
          gutterSize={6}
          onDragEnd={(sizes) => setColumnSizes(sizes)}
          className="flex h-full split-wrapper"
          gutterStyle={() => ({
            backgroundColor: 'var(--gutter-background)',
            cursor: 'col-resize'
          })}
        >
              <div className="flex flex-col h-full">
            <div className="grid grid-cols-3 gap-1 p-1.5 mb-1 bg-blue-50/50 rounded-xl mx-2.5 mt-2.5 border border-blue-100/70">
                  <button 
                onClick={() => setAssistantMode('stats')}
                className={`px-2 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-all ${
                  assistantMode === 'stats' 
                        ? 'bg-white shadow-sm text-blue-600' 
                        : 'text-gray-500 hover:text-gray-700 hover:bg-blue-50/70'
                    }`}
                  >
                <TrendingUp className="w-3 h-3" />
                Estadísticas
                  </button>
                  <button 
                    onClick={() => setAssistantMode('finance')}
                className={`px-2 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-all ${
                      assistantMode === 'finance' 
                        ? 'bg-white shadow-sm text-blue-600' 
                        : 'text-gray-500 hover:text-gray-700 hover:bg-blue-50/70'
                    }`}
                  >
                <BarChart className="w-3 h-3" />
                Conciliación
              </button>
              <button 
                onClick={() => setAssistantMode('sheets')}
                className={`px-2 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-all ${
                  assistantMode === 'sheets' 
                    ? 'bg-white shadow-sm text-blue-600' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-blue-50/70'
                }`}
              >
                <Sheet className="w-3 h-3" />
                Asistente Sheets
                  </button>
                </div>
                
                  <div className="flex-1 overflow-hidden">
              {showAI ? (
                renderAssistantComponent()
            ) : (
              <div className="flex justify-center items-center h-full backdrop-blur-sm">
                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowAI(true)}
                  className="p-2.5 rounded-xl bg-blue-100/60 backdrop-blur-md hover:bg-blue-200/60 border border-blue-200/60 transition-all shadow-sm panel-button"
                >
                  <PanelLeft className="w-5 h-5 text-blue-600" />
                </motion.button>
              </div>
            )}
            </div>
          </div>

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
            isMobile={false}
          />
        </Split>
      </div>

      <ImageModal imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />

      {showUpdatesPopup && (
        <UpdatesPopup onClose={handleCloseUpdatesPopup} />
      )}

      {showInvoicePopup && (
        <InvoicePopup onClose={handleCloseInvoicePopup} />
      )}

      {/* Renderizar condicionalmente el aviso de pago */}
      {daysUntilPayment !== null && daysUntilPayment <= 10 && (
        <PaymentReminderBadge daysUntilPayment={daysUntilPayment} />
      )}
    </div>
  );
}

export default App;