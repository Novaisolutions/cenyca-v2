import {
  ReactNode,
  useEffect,
  useState,
  cloneElement,
  isValidElement,
  ReactElement,
} from 'react';
import React from 'react';

interface ShellProps {
  children: ReactNode;
}

const Shell = ({ children }: ShellProps) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="h-screen w-full flex flex-col bg-background text-foreground overflow-hidden">
      {React.Children.map(children, (child: ReactNode) => {
        if (isValidElement(child)) {
          // Inyecta la prop isMobile a los children
          return cloneElement(child as ReactElement<any>, { isMobile });
        }
        return child;
      })}
    </div>
  );
};

export default Shell; 