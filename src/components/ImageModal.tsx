import { motion, AnimatePresence } from 'framer-motion';
import { X, Download } from 'lucide-react';

interface ImageModalProps {
  imageUrl: string | null;
  onClose: () => void;
}

// Comprobar si una URL de media es válida (no vacía y no es solo la palabra "Media")
const isValidImageUrl = (url?: string | null) => {
  return url && url.trim() !== '' && url !== 'Media' && !url.includes('Media');
};

const ImageModal = ({ imageUrl, onClose }: ImageModalProps) => {
  if (!isValidImageUrl(imageUrl)) return null;
  
  return (
    <AnimatePresence>
      {imageUrl && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-blue-900/80 backdrop-blur-md flex items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: "spring", damping: 25 }}
            className="relative max-w-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.img
              src={imageUrl}
              alt=""
              className="max-w-full max-h-[80vh] rounded-lg object-contain shadow-xl"
            />
            <div className="absolute top-4 right-4 flex gap-2">
              <motion.a
                href={imageUrl}
                download
                whileHover={{ scale: 1.1, y: -2 }}
                whileTap={{ scale: 0.9 }}
                className="p-2 rounded-full bg-white/80 hover:bg-white backdrop-blur-md transition-all shadow-sm"
                onClick={(e) => e.stopPropagation()}
              >
                <Download className="w-5 h-5 text-blue-600" />
              </motion.a>
              <motion.button
                whileHover={{ scale: 1.1, y: -2 }}
                whileTap={{ scale: 0.9 }}
                className="p-2 rounded-full bg-white/80 hover:bg-white backdrop-blur-md transition-all shadow-sm"
                onClick={onClose}
              >
                <X className="w-5 h-5 text-blue-600" />
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ImageModal; 