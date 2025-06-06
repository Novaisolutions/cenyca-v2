import { motion } from 'framer-motion';
import { X, DollarSign, Clock, BarChart2, MessageSquare, Database } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';

interface StatsOnlyAssistantProps {
  onClose: () => void;
}

// Valores constantes
const SEGUNDOS_POR_MENSAJE = 10;
const MINUTOS_POR_CAPTURA = 5;
const CAPTURAS_TOTALES = 2365;

const StatsOnlyAssistant = ({ onClose }: StatsOnlyAssistantProps) => {
  // Estado para las estadísticas
  const [stats, setStats] = useState({
    mensajesAutomatizados: 0,
    capturasTotales: CAPTURAS_TOTALES,
    tiempoAhorradoTotal: '0h 0m',
    tiempoAhorradoMensajes: 0,
    tiempoAhorradoCapturas: CAPTURAS_TOTALES * MINUTOS_POR_CAPTURA,
    ultimoId: 0
  });
  
  const [loading, setLoading] = useState(true);
  const refreshIntervalRef = useRef<number | null>(null);
  
  // Función para formatear el tiempo en formato horas y minutos
  const formatearTiempo = (minutos: number): string => {
    const horas = Math.floor(minutos / 60);
    const minutosRestantes = Math.round(minutos % 60);
    return `${horas}h ${minutosRestantes}m`;
  };
  
  // Función para cargar los datos de Supabase
  const cargarEstadisticas = async () => {
    try {
      setLoading(true);
      
      // 1. Obtener el último ID de la tabla mensajes
      const { data: mensajesData, error: mensajesError } = await supabase
        .from('mensajes')
        .select('id')
        .order('id', { ascending: false })
        .limit(1);
      
      if (mensajesError) {
        console.error('Error al obtener el último ID:', mensajesError);
        setLoading(false);
        return;
      }
      
      if (mensajesData && mensajesData.length > 0) {
        const ultimoId = parseInt(mensajesData[0].id, 10);
        if (isNaN(ultimoId)) {
          console.error('El ID no es un número válido:', mensajesData[0].id);
          setLoading(false);
          return;
        }
        
        // 2. Calcular mensajes automatizados (ID / 2)
        const mensajesAutomatizados = Math.floor(ultimoId / 2);
        
        // 3. Calcular tiempo ahorrado en mensajes (segundos a minutos)
        const tiempoAhorradoMensajes = (mensajesAutomatizados * SEGUNDOS_POR_MENSAJE) / 60;
        
        // 4. Calcular tiempo total ahorrado
        const tiempoTotalMinutos = tiempoAhorradoMensajes + (CAPTURAS_TOTALES * MINUTOS_POR_CAPTURA);
        
        // 5. Actualizar el estado
        setStats({
          mensajesAutomatizados,
          capturasTotales: CAPTURAS_TOTALES,
          tiempoAhorradoTotal: formatearTiempo(tiempoTotalMinutos),
          tiempoAhorradoMensajes,
          tiempoAhorradoCapturas: CAPTURAS_TOTALES * MINUTOS_POR_CAPTURA,
          ultimoId
        });
      }
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Configurar intervalos de actualización y cargar datos iniciales
  useEffect(() => {
    // Carga inicial
    cargarEstadisticas();
    
    // Configurar intervalo para actualizar cada 5 minutos
    refreshIntervalRef.current = window.setInterval(() => {
      cargarEstadisticas();
    }, 5 * 60 * 1000); // 5 minutos
    
    // Limpiar intervalo al desmontar
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);
  
  // Función para actualización manual
  const handleRefresh = () => {
    cargarEstadisticas();
  };
  
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="h-full flex flex-col p-5 bg-gradient-to-br from-blue-50/30 via-indigo-50/20 to-white/80 backdrop-blur-sm"
    >
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-blue-500" />
          <h2 className="text-lg font-medium text-gray-700">Estadísticas de ahorro</h2>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleRefresh}
            disabled={loading}
            className="p-2 rounded-full bg-blue-50 hover:bg-blue-100 transition-colors"
            title="Actualizar estadísticas"
          >
            <BarChart2 className={`w-4 h-4 text-blue-500 ${loading ? 'animate-pulse' : ''}`} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            className="p-2 rounded-full bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </motion.button>
        </div>
      </div>

      {/* Estadística principal: Tiempo ahorrado */}
      <motion.div 
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="relative overflow-hidden backdrop-blur-sm rounded-2xl bg-gradient-to-r from-blue-500/90 to-indigo-500/90 p-6 mb-5 text-white shadow-lg"
      >
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-white/5 rounded-full blur-xl"></div>
        
        <div className="relative z-10">
          <div className="flex items-center mb-2">
            <Clock className="w-5 h-5 text-blue-100 mr-2" />
            <div className="text-sm uppercase tracking-wider text-blue-100/90">Tiempo total ahorrado</div>
          </div>
          <div className="text-4xl font-bold flex items-baseline mb-2">
            {loading ? (
              <div className="animate-pulse h-10 w-32 bg-white/30 rounded"></div>
            ) : (
              <>
                <span>{stats.tiempoAhorradoTotal.split('h')[0]}h</span>
                <span className="text-2xl ml-2">{stats.tiempoAhorradoTotal.split('h')[1].trim()}</span>
              </>
            )}
          </div>
          <div className="text-sm text-blue-100/80">
            Equivalente a {Math.round(
              (stats.tiempoAhorradoMensajes + stats.tiempoAhorradoCapturas) / 60 / 8
            )} jornadas laborales
          </div>
        </div>
      </motion.div>

      {/* Estadísticas secundarias */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        {/* Mensajes automatizados */}
        <motion.div 
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="rounded-xl p-4 backdrop-blur-md bg-white/60 border border-white/70 shadow-[0_4px_15px_rgba(0,0,0,0.05)]"
        >
          <div className="flex items-center mb-3">
            <MessageSquare className="w-4 h-4 text-blue-500 mr-2" />
            <div className="text-xs text-gray-500">Mensajes automatizados</div>
          </div>
          {loading ? (
            <div className="animate-pulse h-8 w-24 bg-gray-200 rounded"></div>
          ) : (
            <>
              <div className="text-2xl font-semibold text-gray-700 mb-1">{stats.mensajesAutomatizados.toLocaleString()}</div>
              <div className="text-xs text-gray-500 flex justify-between">
                <span>ID más reciente: {stats.ultimoId}</span>
                <span>{SEGUNDOS_POR_MENSAJE}s por mensaje</span>
              </div>
            </>
          )}
        </motion.div>
        
        {/* Capturas totales */}
        <motion.div 
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="rounded-xl p-4 backdrop-blur-md bg-white/60 border border-white/70 shadow-[0_4px_15px_rgba(0,0,0,0.05)]"
        >
          <div className="flex items-center mb-3">
            <Database className="w-4 h-4 text-blue-500 mr-2" />
            <div className="text-xs text-gray-500">Capturas totales</div>
          </div>
          {loading ? (
            <div className="animate-pulse h-8 w-24 bg-gray-200 rounded"></div>
          ) : (
            <>
              <div className="text-2xl font-semibold text-gray-700 mb-1">{stats.capturasTotales.toLocaleString()}</div>
              <div className="text-xs text-gray-500 flex justify-between">
                <span>Actualizaciones periódicas</span>
                <span>{MINUTOS_POR_CAPTURA}min por captura</span>
              </div>
            </>
          )}
        </motion.div>
      </div>
      
      {/* Resumen numérico */}
      <motion.div 
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-xs text-gray-500 flex justify-between mt-auto"
      >
        <div>Última actualización: {new Date().toLocaleTimeString()}</div>
        <div>Actualización automática cada 5 minutos</div>
      </motion.div>
    </motion.div>
  );
};

export default StatsOnlyAssistant; 