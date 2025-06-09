import React from 'react';
import { Sheet } from 'lucide-react';

const links = [
  { name: 'Tecate', url: 'https://docs.google.com/spreadsheets/d/1QzEWM5R-A3yiSam4a_H46y3mKeg20rFfU4rUFp5xFwc/edit?gid=2031717958#gid=2031717958' },
  { name: 'Otay', url: 'https://docs.google.com/spreadsheets/d/1aEaURED9v_5qQofM-i5DzRnJ7CG61tiKFhUq4Z_0bqY/edit?gid=1340263073#gid=1340263073' },
  { name: 'Palmas', url: 'https://docs.google.com/spreadsheets/d/1QhpV3roUhkTEjRfAT8jui19ymunMnq87tUgO_Hb6nR0/edit?gid=0#gid=0' },
  { name: 'Casa Blanca', url: 'https://docs.google.com/spreadsheets/d/1ZdT8jF8iQMKYsibGIlk9sANTcz1A4pCKyyobY2DiXK8/edit?gid=1012164142#gid=1012164142' },
  { name: 'Ensenada', url: 'https://docs.google.com/spreadsheets/d/1MeyoW1bZh5tXsHeb8rXgh-R2KiUuz6tsfYWPQUoBzNI/edit?gid=0#gid=0' },
];

const QuickAccess: React.FC = () => {
  return (
    <div className="p-4 border-b border-border">
      <h3 className="text-sm font-semibold text-muted-foreground mb-2">Accesos a Hojas de Cálculo</h3>
      <div className="space-y-2">
        {links.map((link) => (
          <a
            key={link.name}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center p-2 rounded-md bg-background hover:bg-accent transition-colors"
          >
            <Sheet className="w-4 h-4 mr-3 text-green-600" />
            <span className="text-sm font-medium text-foreground">{link.name}</span>
          </a>
        ))}
      </div>
    </div>
  );
};

export default QuickAccess; 