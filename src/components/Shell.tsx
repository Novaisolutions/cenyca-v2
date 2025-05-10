import { ReactNode, useEffect, useState } from 'react';
import { useResizeObserver } from '../hooks/useResizeObserver';
import { useLocation } from 'react-router-dom';

interface ShellProps {
  children: ReactNode;
}

const Shell = ({ children }: ShellProps) => {
  const { width } = useResizeObserver();
  const [isMobileView, setIsMobileView] = useState(false);
  const location = useLocation();
  
  // Detecta si es vista móvil basado en el ancho de la ventana
  useEffect(() => {
    // Forzar refresco completo en cambios de ruta para evitar problemas con el estado
    window.scrollTo(0, 0);
    
    const checkMobileView = () => {
      const mobileWidth = 768; // breakpoint para móvil (md en Tailwind)
      const currentWidth = width || window.innerWidth;
      setIsMobileView(currentWidth < mobileWidth);
    };
    
    checkMobileView();
    
    // Evento para detectar cambios de orientación en dispositivos móviles
    const handleOrientationChange = () => {
      setTimeout(checkMobileView, 100);
    };
    
    window.addEventListener('orientationchange', handleOrientationChange);
    
    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, [width, location.pathname]);
  
  // Establece variables CSS personalizadas para el viewport en móviles
  useEffect(() => {
    if (isMobileView) {
      // Fix para el viewport en iOS
      const setVh = () => {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
      };
      
      setVh();
      window.addEventListener('resize', setVh);
      
      return () => {
        window.removeEventListener('resize', setVh);
      };
    }
  }, [isMobileView]);
  
  return (
    <div 
      className={`min-h-screen w-full flex flex-col bg-gradient-to-br from-blue-50 to-violet-50`}
      // Usa CSS vars para altura en móvil
      style={isMobileView ? { minHeight: 'calc(var(--vh, 1vh) * 100)' } : undefined}
      data-mobile={isMobileView ? 'true' : 'false'}
    >
      {/* Clonar los children para pasar la prop isMobile */}
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, { isMobile: isMobileView });
        }
        return child;
      })}
    </div>
  );
};

export default Shell; 