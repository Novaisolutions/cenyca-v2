import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { motion } from 'framer-motion';
import { ClockIcon, MessageSquare, Database, Calculator, AlertCircle, Bell, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getAutomationStats } from '../services/statsService';
import React from 'react';

// Función para formatear minutos a formato horas:minutos - Extraída fuera del componente
const formatTimeToHoursMinutes = (totalMinutes: number): string => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  return `${hours}h ${minutes}m`;
};

// Componente de tarjeta de métrica individual para evitar re-renders innecesarios
const MetricCard = memo(({ 
  icon, 
  label, 
  value, 
  subtext, 
  gradient = 'gradient-subtle',
  textColor = 'var(--text-primary)',
  iconColor = 'var(--primary)',
  secondaryColor = 'var(--text-secondary)',
  tertiaryColor = 'var(--text-light)'
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: number | string; 
  subtext: string;
  gradient?: string;
  textColor?: string;
  iconColor?: string;
  secondaryColor?: string;
  tertiaryColor?: string;
}) => {
  return (
    <div className={`${gradient} p-3 rounded-lg`}>
      <div className="flex items-center gap-2 mb-1">
        {React.cloneElement(icon as React.ReactElement<any>, { 
          className: "w-3.5 h-3.5", 
          style: { color: iconColor } 
        })}
        <span className="text-xs" style={{ color: secondaryColor }}>{label}</span>
      </div>
      <div className="text-base sm:text-lg font-semibold" style={{ color: textColor }}>{value}</div>
      <div className="text-xs mt-1" style={{ color: tertiaryColor }}>{subtext}</div>
    </div>
  );
});

MetricCard.displayName = 'MetricCard';

// Componente de conciliaciones con contador mensual
const ConciliationCard = memo(({ 
  totalConciliations, 
  monthlyRemaining, 
  monthlyLimit, 
  monthlyUsed, 
  isLimitReached 
}: { 
  totalConciliations: number; 
  monthlyRemaining: number; 
  monthlyLimit: number; 
  monthlyUsed: number; 
  isLimitReached: boolean;
}) => {
  return (
    <div className={`p-3 rounded-lg sm:col-span-2 md:col-span-1 ${isLimitReached ? 'bg-amber-50/80' : 'gradient-subtle'}`}>
      <div className="flex items-center gap-2 mb-1">
        <Calculator 
          className="w-3.5 h-3.5" 
          style={{ color: isLimitReached ? '#d97706' : 'var(--accent)' }} 
        />
        <span 
          className="text-xs" 
          style={{ color: isLimitReached ? '#b45309' : 'var(--text-secondary)' }}
        >
          Conciliaciones
        </span>
      </div>
      <div 
        className="text-base sm:text-lg font-semibold" 
        style={{ color: isLimitReached ? '#92400e' : 'var(--text-primary)' }}
      >
        {totalConciliations}
      </div>
      <div className="flex justify-between items-center mt-1">
        <div 
          className="text-xs" 
          style={{ color: isLimitReached ? '#b45309' : 'var(--text-light)' }}
        >
          75min por conciliación
        </div>
        <div 
          className="text-xs font-medium" 
          style={{ color: isLimitReached ? '#b45309' : 'var(--accent)' }}
        >
          {monthlyRemaining}/{monthlyLimit} restantes
        </div>
      </div>
      {!isLimitReached && (
        <div className="mt-2 h-1.5 bg-white/50 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${(monthlyUsed / monthlyLimit) * 100}%` }}
            transition={{ duration: 0.5 }}
            className="h-full"
            style={{ backgroundColor: 'var(--accent)' }}
          />
        </div>
      )}
    </div>
  );
});

ConciliationCard.displayName = 'ConciliationCard';

// Componente de alerta con memo
const AlertNotification = memo(({ 
  show, 
  type, 
  title, 
  message 
}: { 
  show: boolean; 
  type: 'payment' | 'limit'; 
  title: string; 
  message: string;
}) => {
  if (!show) return null;
  
  const isPrimaryAlert = type === 'payment';
  
  return (
    <motion.div 
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      className="mb-4 p-3 rounded-lg border"
      style={
        isPrimaryAlert 
          ? { backgroundColor: 'rgba(var(--primary-rgb), 0.05)', borderColor: 'rgba(var(--primary-rgb), 0.2)' }
          : { backgroundColor: 'rgba(251, 191, 36, 0.08)', borderColor: 'rgba(251, 191, 36, 0.2)' }
      }
    >
      <div className="flex items-start gap-2">
        {isPrimaryAlert 
          ? <Bell className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--primary)' }} />
          : <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
        }
        <div>
          <p 
            className="text-sm font-medium" 
            style={{ color: isPrimaryAlert ? 'var(--primary)' : '#b45309' }}
          >
            {title}
          </p>
          <p 
            className="text-xs mt-1" 
            style={{ color: isPrimaryAlert ? 'var(--text-secondary)' : '#b45309' }}
          >
            {message}
          </p>
        </div>
      </div>
    </motion.div>
  );
});

AlertNotification.displayName = 'AlertNotification';

// Componente principal
const AutomationStatsCard = memo(() => {
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
    received: 0,
    savingsPercentage: 0,
    monthlyLimit: 10,
    monthlyUsed: 0,
    monthlyRemaining: 10,
    isLimitReached: false,
    nextPaymentReminder: false
  });
  
  const [loading, setLoading] = useState(true);

  // Función para cargar estadísticas (memoizada)
  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      const basicStats = await getAutomationStats();
      
      // Crear un array de promesas para ejecutarlas en paralelo
      const [
        { count: unreadCount }, 
        { count: readCount }, 
        { count: sentCount }, 
        { count: receivedCount }
      ] = await Promise.all([
        supabase.from('mensajes').select('*', { count: 'exact', head: true }).eq('leido', false),
        supabase.from('mensajes').select('*', { count: 'exact', head: true }).eq('leido', true),
        supabase.from('mensajes').select('*', { count: 'exact', head: true }).eq('tipo', 'enviado'),
        supabase.from('mensajes').select('*', { count: 'exact', head: true }).eq('tipo', 'recibido')
      ]);
      
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
  }, []);

  // Efecto para cargar estadísticas una sola vez
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Valores memoizados
  const formattedTimeSaved = useMemo(() => formatTimeToHoursMinutes(stats.timeSaved), [stats.timeSaved]);
  const automationPercentage = useMemo(() => 
    stats.savingsPercentage || Math.round((stats.automated / (stats.total || 1)) * 100), 
    [stats.savingsPercentage, stats.automated, stats.total]
  );

  // Renderizado condicional de contenido (memoizado)
  const statsContent = useMemo(() => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-28 md:h-32">
          <div className="animate-pulse w-8 h-8 rounded-full" style={{ backgroundColor: 'rgba(var(--primary-rgb), 0.2)' }}></div>
        </div>
      );
    }
    
    return (
      <div className="space-y-4">
        {/* Tiempo ahorrado total */}
        <div className="gradient-primary rounded-lg p-4 text-white">
          <div className="text-xs font-medium uppercase tracking-wider mb-1 opacity-80">
            Tiempo ahorrado
          </div>
          <div className="text-xl sm:text-2xl font-bold">{formattedTimeSaved}</div>
        </div>
        
        {/* Métricas principales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <MetricCard 
            icon={<MessageSquare />}
            label="Mensajes"
            value={stats.totalMessages}
            subtext="17s por mensaje"
            iconColor="var(--primary)"
          />
          
          <MetricCard 
            icon={<Database />}
            label="Capturas"
            value={stats.totalDataCaptures}
            subtext="5min por captura"
            iconColor="var(--secondary)"
          />
          
          <ConciliationCard 
            totalConciliations={stats.totalConciliations}
            monthlyRemaining={stats.monthlyRemaining}
            monthlyLimit={stats.monthlyLimit}
            monthlyUsed={stats.monthlyUsed}
            isLimitReached={stats.isLimitReached}
          />
        </div>
        
        {/* Barra de progreso */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
            <span>Automatización</span>
            <span>{automationPercentage}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${automationPercentage}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full"
              style={{ backgroundColor: 'var(--primary)' }}
            />
          </div>
        </div>
      </div>
    );
  }, [
    loading, 
    stats.totalMessages, 
    stats.totalDataCaptures, 
    stats.totalConciliations, 
    stats.monthlyRemaining, 
    stats.monthlyLimit, 
    stats.monthlyUsed, 
    stats.isLimitReached, 
    formattedTimeSaved, 
    automationPercentage
  ]);

  // Alertas memoizadas
  const alerts = useMemo(() => {
    if (loading) return null;
    
    return (
      <>
        <AlertNotification 
          show={stats.nextPaymentReminder}
          type="payment"
          title="Tu día de pago está próximo"
          message="Fechas de pago del 10 al 13 de cada mes"
        />
        
        <AlertNotification 
          show={stats.isLimitReached}
          type="limit"
          title="Límite de conciliaciones alcanzado"
          message={`Has usado las ${stats.monthlyLimit} conciliaciones disponibles este mes`}
        />
      </>
    );
  }, [loading, stats.nextPaymentReminder, stats.isLimitReached, stats.monthlyLimit]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="card p-4 md:p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-sm md:text-base text-gray-800">Automatización</h3>
        <ClockIcon className="w-4 h-4 md:w-5 md:h-5 text-primary" style={{ color: 'var(--primary)' }} />
      </div>
      
      {/* Alertas y notificaciones */}
      {alerts}
      
      {/* Contenido principal */}
      {statsContent}
    </motion.div>
  );
});

AutomationStatsCard.displayName = 'AutomationStatsCard';

export default AutomationStatsCard;