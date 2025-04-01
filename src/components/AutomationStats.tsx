import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ClockIcon, MessageSquare, Database, Calculator } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getAutomationStats } from '../services/statsService';

// Función para formatear minutos a formato horas:minutos
const formatTimeToHoursMinutes = (totalMinutes: number): string => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  return `${hours}h ${minutes}m`;
};

const AutomationStatsCard = () => {
  const [stats, setStats] = useState({
    total: 0,
    automated: 0,
    pending: 0,
    totalMessages: 0,
    totalConciliations: 0,
    totalDataCaptures: 0,
    timeSaved: 0,
    read: 0,
    unread: 0,
    sent: 0,
    received: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        const basicStats = await getAutomationStats();
        
        // Obtener estadísticas adicionales directamente de Supabase
        const { count: unreadCount } = await supabase
          .from('mensajes')
          .select('*', { count: 'exact', head: true })
          .eq('leido', false);
          
        const { count: readCount } = await supabase
          .from('mensajes')
          .select('*', { count: 'exact', head: true })
          .eq('leido', true);
          
        const { count: sentCount } = await supabase
          .from('mensajes')
          .select('*', { count: 'exact', head: true })
          .eq('tipo', 'enviado');
          
        const { count: receivedCount } = await supabase
          .from('mensajes')
          .select('*', { count: 'exact', head: true })
          .eq('tipo', 'recibido');
        
        setStats({
          ...basicStats,
          read: readCount || 0,
          unread: unreadCount || 0,
          sent: sentCount || 0,
          received: receivedCount || 0
        });
      } catch (error) {
        console.error('Error cargando estadísticas:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadStats();
  }, []);

  // Convertimos el tiempo ahorrado a formato legible
  const formattedTimeSaved = formatTimeToHoursMinutes(stats.timeSaved);

  // Calculamos el porcentaje de automatización (fallback a 0 si no existe)
  const automationPercentage = stats.savingsPercentage || Math.round((stats.automated / (stats.total || 1)) * 100);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="p-3 sm:p-4 md:p-5 rounded-xl bg-white/80 backdrop-blur-sm shadow-sm border border-gray-100"
    >
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h3 className="font-medium text-sm sm:text-base text-gray-800">Automatización</h3>
        <ClockIcon className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500" />
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-24 sm:h-28 md:h-32">
          <div className="animate-pulse w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-indigo-200"></div>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4 md:space-y-5">
          {/* Tiempo ahorrado total */}
          <div className="bg-gradient-to-r from-indigo-500 to-blue-600 rounded-lg p-3 sm:p-4 text-white">
            <div className="text-xs font-medium uppercase tracking-wider mb-1 opacity-80">
              Tiempo ahorrado
            </div>
            <div className="text-lg sm:text-xl md:text-2xl font-bold">{formattedTimeSaved}</div>
          </div>
          
          {/* Métricas principales */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
            <div className="bg-gray-50 p-2 sm:p-3 rounded-lg">
              <div className="flex items-center gap-1 sm:gap-2 mb-1">
                <MessageSquare className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-600" />
                <span className="text-xs text-gray-500">Mensajes</span>
              </div>
              <div className="text-base sm:text-lg font-semibold text-gray-800">{stats.totalMessages}</div>
              <div className="text-xs text-gray-500 mt-0.5 sm:mt-1">17s por mensaje</div>
            </div>
            
            <div className="bg-gray-50 p-2 sm:p-3 rounded-lg">
              <div className="flex items-center gap-1 sm:gap-2 mb-1">
                <Database className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-purple-600" />
                <span className="text-xs text-gray-500">Capturas</span>
              </div>
              <div className="text-base sm:text-lg font-semibold text-gray-800">{stats.totalDataCaptures}</div>
              <div className="text-xs text-gray-500 mt-0.5 sm:mt-1">6min por captura</div>
            </div>
            
            <div className="bg-gray-50 p-2 sm:p-3 rounded-lg">
              <div className="flex items-center gap-1 sm:gap-2 mb-1">
                <Calculator className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-green-600" />
                <span className="text-xs text-gray-500">Conciliaciones</span>
              </div>
              <div className="text-base sm:text-lg font-semibold text-gray-800">{stats.totalConciliations}</div>
              <div className="text-xs text-gray-500 mt-0.5 sm:mt-1">75min por conciliación</div>
            </div>
          </div>
          
          {/* Barra de progreso */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Automatización</span>
              <span>{automationPercentage}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${automationPercentage}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full bg-indigo-500 rounded-full"
              />
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default AutomationStatsCard; 