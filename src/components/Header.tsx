import React from 'react';
import { Inbox } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="flex items-center justify-between p-4 bg-white border-b border-gray-200 rounded-t-lg">
      <div className="flex items-center gap-3">
        <Inbox className="w-6 h-6 text-blue-500" />
        <h1 className="text-xl font-semibold text-gray-800">Inbox Cenyca</h1>
      </div>
      {/* Aquí se pueden añadir otros elementos como el avatar del usuario, etc. */}
    </header>
  );
};

export default Header; 