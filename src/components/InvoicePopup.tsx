import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, AlertTriangle } from 'lucide-react';

interface InvoicePopupProps {
  onClose: () => void;
}

const InvoicePopup = ({ onClose }: InvoicePopupProps) => {
  // Estado para controlar si se muestra el popup
  const [shouldShow, setShouldShow] = useState(true);

  // Función para cerrar temporalmente el popup y configurar un temporizador para mostrarlo nuevamente
  const handleTemporaryClose = () => {
    setShouldShow(false);
    onClose();
    
    // Establecer un temporizador para volver a mostrar el popup después de 1 minuto sin importar lo que pase
    setTimeout(() => {
      setShouldShow(true);
      // Disparar un evento personalizado para notificar a App.tsx que debe mostrar el popup nuevamente
      window.dispatchEvent(new CustomEvent('showInvoicePopup'));
    }, 60000); // 60,000 ms = 1 minuto
  };

  if (!shouldShow) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden"
        >
          {/* Encabezado */}
          <div className="bg-gradient-to-r from-red-500 to-amber-500 p-4 text-white relative">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleTemporaryClose}
              className="absolute right-4 top-4 text-white/80 hover:text-white"
            >
              <X className="w-5 h-5" />
            </motion.button>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-6 h-6" />
              <h2 className="text-xl font-bold">¡Factura vencida!</h2>
            </div>
            <p className="text-sm text-white/80 mt-1">
              Tu servicio requiere atención inmediata
            </p>
          </div>
          
          {/* Contenido del popup */}
          <div className="p-5">
            <div className="space-y-4">
              <p className="text-gray-700">
                La factura de tu servicio está vencida. Para seguir disfrutando de todas las funcionalidades sin interrupciones, por favor realiza el pago lo antes posible.
              </p>
              
              <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                <p className="text-sm text-amber-700 font-medium">
                  Si ya realizaste el pago, por favor comunícate con nuestro equipo de soporte para verificar el estado de tu cuenta.
                </p>
              </div>
            </div>
          </div>
          
          {/* Footer */}
          <div className="border-t border-gray-200 p-4 flex justify-end items-center">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleTemporaryClose}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg flex items-center gap-2 text-sm font-medium"
            >
              <Check className="w-4 h-4" />
              Entendido
            </motion.button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default InvoicePopup; 