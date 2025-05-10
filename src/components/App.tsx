import React, { useEffect, useState } from 'react';

const App: React.FC = () => {
  const [showUpdatesPopup, setShowUpdatesPopup] = useState(false);
  const [showInvoicePopup, setShowInvoicePopup] = useState(false);

  useEffect(() => {
    const popupCount = parseInt(localStorage.getItem('updatesPopupCount') || '0', 10);
    if (popupCount < 10) {
      setShowUpdatesPopup(true);
    }

    // Desactivar popup de factura vencida - el pago ya fue realizado
    // Se reactivará el próximo mes
    setShowInvoicePopup(false);
    localStorage.setItem('invoicePopupState', JSON.stringify({ show: false }));

    // Mantener el listener para futuras activaciones 
    const handleShowInvoicePopup = () => {
      // No mostramos el popup por ahora, ya que el pago fue realizado
      console.log('Popup de factura solicitado pero no mostrado - pago realizado');
    };
    
    window.addEventListener('showInvoicePopup', handleShowInvoicePopup);
    
    return () => {
      window.removeEventListener('showInvoicePopup', handleShowInvoicePopup);
    };
  }, []);

  return (
    <div>
      {/* Render your components here */}
    </div>
  );
};

export default App; 