import { motion } from 'framer-motion';
import { X, BarChart3, TrendingUp, Clock, Zap } from 'lucide-react';
import AutomationStatsCard from './AutomationStats';

interface StatsOnlyAssistantProps {
  onClose: () => void;
}

const StatsOnlyAssistant = ({ onClose }: StatsOnlyAssistantProps) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="h-full flex flex-col p-5 bg-gradient-to-br from-blue-50/30 via-indigo-50/20 to-white/80 backdrop-blur-sm"
    >
      <div className="flex items-center justify-between mb-5">
        <motion.div 
          initial={{ y: -5, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-2"
        >
          <TrendingUp className="w-4 h-4 text-blue-500/80" />
          <h3 className="font-medium text-gray-700/90 text-sm tracking-wide">Estadísticas</h3>
        </motion.div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded-full bg-white/50 backdrop-blur-sm border border-white/40 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-3 h-3" />
        </motion.button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6 pr-1">
        {/* Tiempo ahorrado principal */}
        <motion.div 
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="relative overflow-hidden backdrop-blur-sm rounded-2xl bg-gradient-to-r from-blue-500/90 to-indigo-500/90 p-5 text-white shadow-lg"
        >
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-white/5 rounded-full blur-xl"></div>
          
          <div className="relative z-10">
            <div className="text-xs uppercase tracking-wider text-blue-100/90 mb-1">Tiempo ahorrado</div>
            <div className="text-3xl font-bold flex items-baseline">
              <span>78h</span>
              <span className="text-xl ml-1">55m</span>
            </div>
          </div>
        </motion.div>

        {/* Métricas principales */}
        <div className="grid grid-cols-3 gap-3">
          <motion.div 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="rounded-xl p-3 backdrop-blur-md bg-white/60 border border-white/70 shadow-[0_4px_15px_rgba(0,0,0,0.05)]"
          >
            <div className="flex flex-col h-full">
              <div className="text-xs text-gray-500/80 mb-1">Mensajes</div>
              <div className="text-2xl font-semibold text-gray-700">4025</div>
              <div className="text-[10px] text-gray-400 mt-auto">17s por mensaje</div>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="rounded-xl p-3 backdrop-blur-md bg-white/60 border border-white/70 shadow-[0_4px_15px_rgba(0,0,0,0.05)]"
          >
            <div className="flex flex-col h-full">
              <div className="text-xs text-gray-500/80 mb-1">Capturas</div>
              <div className="text-2xl font-semibold text-gray-700">719</div>
              <div className="text-[10px] text-gray-400 mt-auto">5min por captura</div>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="rounded-xl p-3 backdrop-blur-md bg-white/60 border border-white/70 shadow-[0_4px_15px_rgba(0,0,0,0.05)]"
          >
            <div className="flex flex-col h-full justify-between">
              <div className="text-xs text-gray-500/80 mb-1">Conciliaciones</div>
              <div className="text-2xl font-semibold text-gray-700">0</div>
              <div className="flex items-center justify-between">
                <div className="text-[10px] text-gray-400">75min por conciliación</div>
                <div className="text-[10px] text-blue-500 font-medium">0/3</div>
              </div>
            </div>
          </motion.div>
        </div>
        
        {/* Barra de automatización */}
        <motion.div 
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="px-1"
        >
          <div className="flex justify-between items-center text-xs mb-1.5">
            <div className="text-gray-500 flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-blue-400" />
              <span>Automatización</span>
            </div>
            <div className="text-blue-500 font-medium">0%</div>
          </div>
          <div className="h-1 bg-gray-100/80 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: "0%" }}
              transition={{ delay: 0.7, duration: 1 }}
              className="h-full bg-gradient-to-r from-blue-400 to-indigo-500"
            />
          </div>
        </motion.div>
        
        {/* Distribución de tiempo */}
        <motion.div 
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="rounded-xl backdrop-blur-md bg-white/50 border border-white/60 p-4 shadow-[0_4px_15px_rgba(0,0,0,0.02)]"
        >
          <div className="flex items-center gap-1.5 text-sm text-gray-600 mb-4">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs font-medium">Distribución de Tiempo</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <div className="h-1.5 rounded-full overflow-hidden bg-blue-100/50">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: "65%" }}
                  transition={{ delay: 0.8, duration: 1 }}
                  className="absolute top-0 left-0 h-full bg-blue-400"
                />
              </div>
              <div className="flex justify-between mt-1 items-center">
                <span className="text-xs text-gray-500">Operación</span>
                <span className="text-sm font-semibold text-blue-600">65%</span>
              </div>
            </div>
            
            <div className="relative">
              <div className="h-1.5 rounded-full overflow-hidden bg-indigo-100/50">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: "35%" }}
                  transition={{ delay: 0.9, duration: 1 }}
                  className="absolute top-0 left-0 h-full bg-indigo-400"
                />
              </div>
              <div className="flex justify-between mt-1 items-center">
                <span className="text-xs text-gray-500">Administración</span>
                <span className="text-sm font-semibold text-indigo-600">35%</span>
              </div>
            </div>
          </div>
        </motion.div>
        
        {/* Indicadores de rendimiento */}
        <motion.div 
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="rounded-xl backdrop-blur-md bg-white/50 border border-white/60 p-4 shadow-[0_4px_15px_rgba(0,0,0,0.02)]"
        >
          <div className="flex items-center gap-1.5 text-sm text-gray-600 mb-4">
            <BarChart3 className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs font-medium">Indicadores de Rendimiento</span>
          </div>
          
          <div className="space-y-3">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs text-gray-500">Eficiencia</span>
                <span className="text-xs font-medium text-blue-500">93%</span>
              </div>
              <div className="relative h-1 rounded-full overflow-hidden bg-gray-100/70">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: "93%" }}
                  transition={{ delay: 0.9, duration: 1 }}
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-300 to-blue-500"
                />
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs text-gray-500">Precisión</span>
                <span className="text-xs font-medium text-indigo-500">87%</span>
              </div>
              <div className="relative h-1 rounded-full overflow-hidden bg-gray-100/70">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: "87%" }}
                  transition={{ delay: 1, duration: 1 }}
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-300 to-indigo-500"
                />
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs text-gray-500">Satisfacción</span>
                <span className="text-xs font-medium text-green-500">95%</span>
              </div>
              <div className="relative h-1 rounded-full overflow-hidden bg-gray-100/70">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: "95%" }}
                  transition={{ delay: 1.1, duration: 1 }}
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-300 to-green-500"
                />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default StatsOnlyAssistant; 