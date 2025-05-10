import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, MessageSquare, Calculator, ExternalLink, File, Star } from 'lucide-react';

interface UpdatesPopupProps {
  onClose: () => void;
}

// Lista de las nuevas funcionalidades
const newFeatures = [
  {
    title: 'Formato de mensajes mejorado',
    description: 'Ahora puedes usar *negrita*, _cursiva_, ~tachado~ y ```código``` en tus mensajes',
    icon: <MessageSquare className="w-5 h-5 text-blue-500" />
  },
  {
    title: 'Conciliación bancaria inteligente',
    description: 'Concilia automáticamente los movimientos bancarios con tus registros',
    icon: <Calculator className="w-5 h-5 text-green-500" />
  },
  {
    title: 'Estadísticas de automatización',
    description: 'Visualiza el tiempo ahorrado con mensajes automatizados, capturas de datos y conciliaciones',
    icon: <Star className="w-5 h-5 text-amber-500" />
  },
  {
    title: 'Exportación de datos',
    description: 'Exporta tus movimientos no conciliados a formato CSV',
    icon: <File className="w-5 h-5 text-indigo-500" />
  },
  {
    title: 'Visualización en Google Sheets',
    description: 'Accede directamente a tus datos en Google Sheets desde la aplicación',
    icon: <ExternalLink className="w-5 h-5 text-red-500" />
  }
];

const UpdatesPopup = ({ onClose }: UpdatesPopupProps) => {
  const [showCount, setShowCount] = useState(0);

  // Al montar el componente, comprobar cuántas veces se ha mostrado el popup
  useEffect(() => {
    const popupCount = parseInt(localStorage.getItem('updatesPopupCount') || '0', 10);
    setShowCount(popupCount);
    
    // Incrementar el contador si es menor que 10
    if (popupCount < 10) {
      localStorage.setItem('updatesPopupCount', String(popupCount + 1));
    }
  }, []);

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
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-4 text-white relative">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="absolute right-4 top-4 text-white/80 hover:text-white"
            >
              <X className="w-5 h-5" />
            </motion.button>
            <h2 className="text-xl font-bold">¡Nuevas funcionalidades!</h2>
            <p className="text-sm text-white/80 mt-1">
              Hemos añadido estas mejoras para optimizar tu experiencia
            </p>
          </div>
          
          {/* Lista de funcionalidades */}
          <div className="p-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-4">
              {newFeatures.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex gap-3 items-start p-3 bg-gray-50 rounded-lg"
                >
                  <div className="mt-0.5">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-800">{feature.title}</h3>
                    <p className="text-sm text-gray-600">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
          
          {/* Footer */}
          <div className="border-t border-gray-200 p-4 flex justify-between items-center">
            <span className="text-xs text-gray-500">
              Ventana {showCount} de 10
            </span>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
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

export default UpdatesPopup; 