import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Clock, MessageSquare, Database, Home, RefreshCcw } from 'lucide-react';
import { supabase } from '../supabaseClient';

// Valores constantes
const SEGUNDOS_POR_MENSAJE = 10;
const MINUTOS_POR_CAPTURA = 5;
const CAPTURAS_TOTALES = 2365;

const EstadisticasPage = () => {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
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
  
  // Detectar si es móvil
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
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
          console.error('El último ID no es un número válido:', mensajesData[0].id);
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
  
  // Función para volver a la pantalla principal
  const goToHome = () => {
    navigate('/');
  };
  
  // Función para ir a la versión móvil
  const goToMobileChat = () => {
    navigate('/chat');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50/30 to-purple-50/30 p-4 md:p-8">
      {/* Header */}
      <header className="max-w-5xl mx-auto mb-6 md:mb-8 flex justify-between items-center">
        <div className="flex items-center gap-2 md:gap-3">
          <button 
            onClick={isMobile ? goToMobileChat : goToHome}
            className="p-2 md:p-2.5 rounded-xl bg-white/80 backdrop-blur-sm hover:bg-white/90 transition-colors shadow-sm border border-white/60"
          >
            <Home className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
          </button>
          <h1 className="text-xl md:text-3xl font-bold text-gray-800">Estadísticas CENYCA</h1>
        </div>
        <button 
          onClick={handleRefresh}
          disabled={loading}
          className="p-2 md:p-2.5 rounded-xl bg-blue-50/80 backdrop-blur-sm hover:bg-blue-100/80 transition-colors shadow-sm border border-blue-100/60"
        >
          <RefreshCcw className={`w-4 h-4 md:w-5 md:h-5 text-blue-600 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      <div className="max-w-5xl mx-auto">
        {/* Estadística principal: Tiempo ahorrado */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="relative overflow-hidden backdrop-blur-sm rounded-2xl bg-gradient-to-r from-blue-500/90 to-indigo-500/90 p-5 md:p-8 mb-5 md:mb-8 text-white shadow-lg"
        >
          <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-white/5 rounded-full blur-xl"></div>
          
          <div className="relative z-10">
            <div className="flex items-center mb-2 md:mb-3">
              <Clock className="w-5 h-5 md:w-6 md:h-6 text-blue-100 mr-2" />
              <div className="text-base md:text-lg uppercase tracking-wider text-blue-100/90">Tiempo total ahorrado</div>
            </div>
            <div className="text-4xl md:text-6xl font-bold flex items-baseline mb-2 md:mb-3">
              {loading ? (
                <div className="animate-pulse h-12 md:h-16 w-32 md:w-48 bg-white/30 rounded"></div>
              ) : (
                <>
                  <span>{stats.tiempoAhorradoTotal.split('h')[0]}h</span>
                  <span className="text-2xl md:text-4xl ml-2">{stats.tiempoAhorradoTotal.split('h')[1].trim()}</span>
                </>
              )}
            </div>
            <div className="text-sm md:text-xl text-blue-100/80">
              Equivalente a {Math.round(
                (stats.tiempoAhorradoMensajes + stats.tiempoAhorradoCapturas) / 60 / 8
              )} jornadas laborales completas
            </div>
          </div>
        </motion.div>

        {/* Estadísticas secundarias */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-5 md:mb-8">
          {/* Mensajes automatizados */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="rounded-xl p-4 md:p-6 backdrop-blur-md bg-white/70 border border-white/70 shadow-[0_4px_20px_rgba(0,0,0,0.06)]"
          >
            <div className="flex items-center mb-3 md:mb-4">
              <MessageSquare className="w-4 h-4 md:w-5 md:h-5 text-blue-500 mr-2" />
              <div className="text-sm md:text-base text-gray-600">Mensajes automatizados</div>
            </div>
            {loading ? (
              <div className="animate-pulse h-8 md:h-10 w-24 md:w-32 bg-gray-200 rounded"></div>
            ) : (
              <>
                <div className="text-2xl md:text-4xl font-semibold text-gray-700 mb-1 md:mb-2">{stats.mensajesAutomatizados.toLocaleString()}</div>
                <div className="text-xs md:text-sm text-gray-500 flex flex-col md:flex-row md:justify-between">
                  <span>ID más reciente: {stats.ultimoId}</span>
                  <span>{SEGUNDOS_POR_MENSAJE} segundos ahorrados por mensaje</span>
                </div>
              </>
            )}
          </motion.div>
          
          {/* Capturas totales */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="rounded-xl p-4 md:p-6 backdrop-blur-md bg-white/70 border border-white/70 shadow-[0_4px_20px_rgba(0,0,0,0.06)]"
          >
            <div className="flex items-center mb-3 md:mb-4">
              <Database className="w-4 h-4 md:w-5 md:h-5 text-blue-500 mr-2" />
              <div className="text-sm md:text-base text-gray-600">Capturas totales</div>
            </div>
            {loading ? (
              <div className="animate-pulse h-8 md:h-10 w-24 md:w-32 bg-gray-200 rounded"></div>
            ) : (
              <>
                <div className="text-2xl md:text-4xl font-semibold text-gray-700 mb-1 md:mb-2">{stats.capturasTotales.toLocaleString()}</div>
                <div className="text-xs md:text-sm text-gray-500 flex flex-col md:flex-row md:justify-between">
                  <span>Actualizaciones periódicas</span>
                  <span>{MINUTOS_POR_CAPTURA} minutos ahorrados por captura</span>
                </div>
              </>
            )}
          </motion.div>
        </div>
        
        {/* Resumen numérico */}
        <motion.div 
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-xs md:text-sm text-gray-500 flex flex-col md:flex-row md:justify-between mt-auto p-3 md:p-4 bg-white/50 backdrop-blur-sm rounded-xl border border-white/60"
        >
          <div>Última actualización: {new Date().toLocaleTimeString()}</div>
          <div className="mt-1 md:mt-0">Actualización automática cada 5 minutos</div>
          <div className="mt-1 md:mt-0">Datos generados automáticamente por CENYCA</div>
        </motion.div>
      </div>
    </div>
  );
};

export default EstadisticasPage; 