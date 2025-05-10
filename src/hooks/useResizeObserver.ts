import { useState, useEffect } from 'react';

type ResizeObserverSize = {
  width: number | null;
  height: number | null;
};

export const useResizeObserver = (): ResizeObserverSize => {
  const [size, setSize] = useState<ResizeObserverSize>({
    width: typeof window !== 'undefined' ? window.innerWidth : null,
    height: typeof window !== 'undefined' ? window.innerHeight : null,
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    // Función para actualizar el tamaño
    const updateSize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    // Llamada inicial
    updateSize();

    // Throttle para mejorar rendimiento
    let timeoutId: number | null = null;
    const throttledUpdateSize = () => {
      if (timeoutId) return;
      
      timeoutId = window.setTimeout(() => {
        updateSize();
        timeoutId = null;
      }, 200); // 200ms de throttle
    };

    // Escuchar cambios de tamaño
    window.addEventListener('resize', throttledUpdateSize);

    // Limpiar al desmontar
    return () => {
      window.removeEventListener('resize', throttledUpdateSize);
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  return size;
}; 