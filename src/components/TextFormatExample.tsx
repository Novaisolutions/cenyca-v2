import React from 'react';

const formatWhatsAppStyle = (text: string): string => {
  if (!text) return '';
  
  // Convertir a caracteres Unicode para negrita (*texto*)
  let formatted = text.replace(/\*(.*?)\*/g, '<strong>$1</strong>');
  
  // Convertir a caracteres Unicode para cursiva (_texto_)
  formatted = formatted.replace(/_(.*?)_/g, '<em>$1</em>');
  
  // Convertir a caracteres Unicode para tachado (~texto~)
  formatted = formatted.replace(/~(.*?)~/g, '<del>$1</del>');
  
  // Convertir saltos de línea
  formatted = formatted.replace(/\n/g, '<br />');
  
  return formatted;
};

const TextFormatExample: React.FC = () => {
  const exampleText = "Formatos disponibles:\n*Texto en negrita*\n_Texto en cursiva_\n~Texto tachado~\n*_Combinaciones_ de *~estilos~*";
  
  return (
    <div 
      data-tour="formato-texto" 
      className="p-4 bg-white/80 backdrop-blur-md rounded-xl border border-blue-100 shadow-sm"
    >
      <h3 className="text-sm font-medium text-blue-600 mb-2">Formato de mensajes</h3>
      <div className="flex space-x-4">
        <div className="flex-1">
          <h4 className="text-xs font-medium text-gray-500 mb-1">Código</h4>
          <pre className="text-xs bg-gray-50 p-2 rounded-md overflow-x-auto">{exampleText}</pre>
        </div>
        <div className="flex-1">
          <h4 className="text-xs font-medium text-gray-500 mb-1">Resultado</h4>
          <div 
            className="text-sm text-gray-700 bg-blue-50/80 p-2 rounded-md"
            dangerouslySetInnerHTML={{ __html: formatWhatsAppStyle(exampleText) }}
          />
        </div>
      </div>
      <p className="mt-2 text-xs text-gray-500">Usa estos formatos en tus mensajes para darles estilo.</p>
    </div>
  );
};

export default TextFormatExample; 