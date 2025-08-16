import React from 'react';
import { Navigation, MobileNavigation } from './Navigation';

interface AppLayoutProps {
  children: React.ReactNode;
  role: 'customer' | 'dealer';
  userEmail: string;
  onLogout: () => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children, role, userEmail, onLogout }) => {
  const [isMobile, setIsMobile] = React.useState(window.innerWidth <= 768);

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="app-layout">
      {isMobile ? (
        <MobileNavigation role={role} userEmail={userEmail} onLogout={onLogout} />
      ) : (
        <Navigation role={role} userEmail={userEmail} onLogout={onLogout} />
      )}
      
      <div className={`app-content ${isMobile ? 'mobile' : ''}`}>
        {children}
      </div>
    </div>
  );
};