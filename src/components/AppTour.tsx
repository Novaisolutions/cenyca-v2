import React, { useState, useEffect } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';
import { useTour } from '../lib/TourContext';
import { Button } from './ui/Button';
import { Info } from 'lucide-react';

// Definir los pasos del tour
const getTourSteps = (): Step[] => [
  {
    target: 'body',
    content: (
      <div>
        <h2 className="text-lg font-semibold text-blue-700 mb-2">¡Bienvenido a CENYCA!</h2>
        <p>Te mostraremos las principales funcionalidades de esta plataforma para que puedas sacar el máximo provecho.</p>
      </div>
    ),
    placement: 'center',
    disableBeacon: true,
  },
  {
    target: '[data-tour="conversaciones"]',
    content: (
      <div>
        <h2 className="text-lg font-semibold text-blue-700 mb-2">Lista de Conversaciones</h2>
        <p>Aquí encontrarás todas tus conversaciones de WhatsApp. Puedes buscar contactos y ver mensajes no leídos.</p>
      </div>
    ),
    disableBeacon: true,
  },
  {
    target: '[data-tour="chat"]',
    content: (
      <div>
        <h2 className="text-lg font-semibold text-blue-700 mb-2">Área de Chat</h2>
        <p>Aquí verás todos los mensajes de la conversación seleccionada. Los mensajes admiten formato tipo WhatsApp con *negrita*, _cursiva_ y ~tachado~.</p>
      </div>
    ),
    disableBeacon: true,
  },
  {
    target: '[data-tour="input-mensaje"]',
    content: (
      <div>
        <h2 className="text-lg font-semibold text-blue-700 mb-2">Envío de Mensajes</h2>
        <p>Desde aquí puedes enviar mensajes de texto y adjuntar archivos o imágenes.</p>
      </div>
    ),
    disableBeacon: true,
  },
  {
    target: '[data-tour="asistente-ai"]',
    content: (
      <div>
        <h2 className="text-lg font-semibold text-blue-700 mb-2">Asistente IA</h2>
        <p>Utiliza nuestro asistente inteligente para automatizar tareas y obtener respuestas rápidas.</p>
      </div>
    ),
    disableBeacon: true,
  },
  {
    target: '[data-tour="bot-finanzas"]',
    content: (
      <div>
        <h2 className="text-lg font-semibold text-blue-700 mb-2">Bot de Finanzas</h2>
        <p>Esta herramienta te ayuda a conciliar pagos reportados por WhatsApp con el estado de cuenta bancario.</p>
      </div>
    ),
    disableBeacon: true,
  },
  {
    target: '[data-tour="buscar-chat"]',
    content: (
      <div>
        <h2 className="text-lg font-semibold text-blue-700 mb-2">Búsqueda Avanzada</h2>
        <p>Busca conversaciones y mensajes por nombre, número o contenido específico.</p>
      </div>
    ),
    disableBeacon: true,
  },
  {
    target: '[data-tour="formato-texto"]',
    content: (
      <div>
        <h2 className="text-lg font-semibold text-blue-700 mb-2">Formato de Texto</h2>
        <p>Puedes usar formato especial en tus mensajes:</p>
        <ul className="mt-2 space-y-1">
          <li><strong>*texto*</strong> - para texto en negrita</li>
          <li><em>_texto_</em> - para texto en cursiva</li>
          <li><del>~texto~</del> - para texto tachado</li>
        </ul>
      </div>
    ),
    disableBeacon: true,
  },
  {
    target: '[data-tour="ajustes"]',
    content: (
      <div>
        <h2 className="text-lg font-semibold text-blue-700 mb-2">Ajustes</h2>
        <p>Configura tus preferencias, gestiona tu cuenta y personaliza la aplicación.</p>
      </div>
    ),
    disableBeacon: true,
  },
  {
    target: 'body',
    content: (
      <div>
        <h2 className="text-lg font-semibold text-blue-700 mb-2">¡Tour Completado!</h2>
        <p>¡Ahora estás listo para usar todas las funcionalidades de CENYCA!</p>
        <p className="mt-2 text-sm text-gray-600">Puedes reiniciar este tour en cualquier momento desde el botón de ayuda.</p>
      </div>
    ),
    placement: 'center',
    disableBeacon: true,
  },
];

const AppTour: React.FC = () => {
  const { isTourOpen, closeTour, step, setStep } = useTour();
  const [steps, setSteps] = useState<Step[]>([]);

  useEffect(() => {
    setSteps(getTourSteps());
  }, []);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, index } = data;
    
    // Actualizar el paso actual
    setStep(index);
    
    // Cerrar el tour cuando se complete
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      closeTour();
    }
  };

  return (
    <>
      <Joyride
        steps={steps}
        run={isTourOpen}
        continuous
        showProgress
        showSkipButton
        callback={handleJoyrideCallback}
        stepIndex={step}
        styles={{
          options: {
            zIndex: 10000,
            primaryColor: '#3B82F6',
            textColor: '#333',
          },
          spotlight: {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
          },
          tooltipContainer: {
            textAlign: 'left',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(8px)',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
            border: '1px solid rgba(209, 213, 219, 0.8)',
          },
          buttonNext: {
            backgroundColor: '#3B82F6',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '14px',
            padding: '8px 16px',
          },
          buttonBack: {
            color: '#64748B',
            fontSize: '14px',
            marginRight: '8px',
          },
          buttonSkip: {
            color: '#64748B',
            fontSize: '14px',
          },
        }}
        locale={{
          back: 'Anterior',
          close: 'Cerrar',
          last: 'Finalizar',
          next: 'Siguiente',
          skip: 'Omitir',
        }}
      />
    </>
  );
};

export const TourButton: React.FC = () => {
  const { runTour } = useTour();

  return (
    <Button
      onClick={runTour}
      variant="outline"
      size="icon"
      className="fixed bottom-4 right-4 z-50 bg-white/80 backdrop-blur-md rounded-full p-2 shadow-md hover:bg-blue-50 transition-all duration-200 border border-blue-100"
      title="Iniciar tour de la aplicación"
    >
      <Info className="w-5 h-5 text-blue-500" />
    </Button>
  );
};

export default AppTour; 