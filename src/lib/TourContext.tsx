import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface TourContextType {
  isTourOpen: boolean;
  openTour: () => void;
  closeTour: () => void;
  runTour: () => void;
  step: number;
  setStep: (step: number) => void;
  tourCompleted: boolean;
  showFormatExample: boolean;
  setShowFormatExample: (show: boolean) => void;
}

const TourContext = createContext<TourContextType | null>(null);

export const useTour = () => {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTour debe ser usado dentro de un TourProvider');
  }
  return context;
};

interface TourProviderProps {
  children: ReactNode;
}

export const TourProvider: React.FC<TourProviderProps> = ({ children }) => {
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [tourCompleted, setTourCompleted] = useState(false);
  const [tourViewCount, setTourViewCount] = useState(0);
  const [showFormatExample, setShowFormatExample] = useState(false);

  // Cargar el estado del tour desde localStorage
  useEffect(() => {
    const storedTourCompleted = localStorage.getItem('tourCompleted');
    const storedTourViewCount = localStorage.getItem('tourViewCount');
    
    if (storedTourCompleted) {
      setTourCompleted(JSON.parse(storedTourCompleted));
    }
    
    if (storedTourViewCount) {
      setTourViewCount(parseInt(storedTourViewCount, 10));
    }
    
    // Si el usuario no ha visto el tour completo 10 veces, mostrarlo automáticamente
    if (!storedTourCompleted && (!storedTourViewCount || parseInt(storedTourViewCount, 10) < 10)) {
      setIsTourOpen(true);
    }
  }, []);

  // Mostrar/ocultar ejemplo de formato basado en el paso actual
  useEffect(() => {
    // Si el paso es el de formato de texto (índice 7 en nuestro array de pasos), mostrar el ejemplo
    if (step === 7 && isTourOpen) {
      setShowFormatExample(true);
    } else {
      setShowFormatExample(false);
    }
  }, [step, isTourOpen]);

  // Guardar el estado del tour en localStorage
  useEffect(() => {
    localStorage.setItem('tourCompleted', JSON.stringify(tourCompleted));
    localStorage.setItem('tourViewCount', tourViewCount.toString());
  }, [tourCompleted, tourViewCount]);

  const openTour = () => {
    setIsTourOpen(true);
    setStep(0);
  };

  const closeTour = () => {
    setIsTourOpen(false);
    setTourCompleted(true);
    setTourViewCount(prev => prev + 1);
  };

  const runTour = () => {
    setTourCompleted(false);
    setIsTourOpen(true);
    setStep(0);
  };

  return (
    <TourContext.Provider
      value={{
        isTourOpen,
        openTour,
        closeTour,
        runTour,
        step,
        setStep,
        tourCompleted,
        showFormatExample,
        setShowFormatExample
      }}
    >
      {children}
    </TourContext.Provider>
  );
}; 