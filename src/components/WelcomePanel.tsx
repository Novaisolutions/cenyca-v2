import React from 'react';
import { BotMessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';

const WelcomePanel: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <BotMessageSquare className="w-24 h-24 mb-6 text-primary/30" strokeWidth={1.5} />
      </motion.div>
      <motion.h2 
        className="text-2xl font-semibold text-foreground"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
      >
        Tu Asistente de Conversaciones
      </motion.h2>
      <motion.p 
        className="mt-2 max-w-sm text-muted-foreground"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
      >
        Selecciona una conversación del panel izquierdo para empezar a gestionar tus chats.
      </motion.p>
    </div>
  );
};

export default WelcomePanel; 