import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useLogger } from '../hooks/useLogger';

interface NavigationProps {
  role: 'customer' | 'dealer';
  userEmail: string;
  onLogout: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({ role, userEmail, onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logAction } = useLogger({ componentName: 'Navigation' });

  const handleNavClick = (path: string, label: string) => {
    logAction('navigation_clicked', { from: location.pathname, to: path, label });
  };

  const handleLogout = () => {
    logAction('logout_initiated', { role, email: userEmail });
    onLogout();
    navigate('/login');
  };

  const customerLinks = [
    { path: '/customer/dashboard', label: 'Find Dealers', icon: '🏪' },
    { path: '/customer/orders', label: 'My Orders', icon: '📦' },
    { path: '/customer/favorites', label: 'Favorites', icon: '❤️' },
    { path: '/customer/profile', label: 'Profile', icon: '👤' },
  ];

  const dealerLinks = [
    { path: '/dealer/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/dealer/products', label: 'Products', icon: '📦' },
    { path: '/dealer/orders', label: 'Orders', icon: '🛍️' },
    { path: '/dealer/customers', label: 'Customers', icon: '👥' },
    { path: '/dealer/analytics', label: 'Analytics', icon: '📈' },
    { path: '/dealer/profile', label: 'Profile', icon: '⚙️' },
  ];

  const links = role === 'customer' ? customerLinks : dealerLinks;

  return (
    <nav className="navigation">
      <div className="nav-header">
        <h2 className="nav-logo">🧉 Mate Dealer</h2>
        <span className="nav-role">{role === 'customer' ? 'Customer' : 'Dealer'}</span>
      </div>

      <div className="nav-links">
        {links.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className={`nav-link ${location.pathname === link.path ? 'active' : ''}`}
            onClick={() => handleNavClick(link.path, link.label)}
          >
            <span className="nav-icon">{link.icon}</span>
            <span className="nav-label">{link.label}</span>
          </Link>
        ))}
      </div>

      <div className="nav-footer">
        <div className="nav-user">
          <span className="nav-user-email">{userEmail}</span>
          <span className="nav-user-role">{role}</span>
        </div>
        <button onClick={handleLogout} className="nav-logout">
          Logout
        </button>
      </div>
    </nav>
  );
};

// Mobile navigation component
export const MobileNavigation: React.FC<NavigationProps> = ({ role, userEmail, onLogout }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const location = useLocation();
  const { logAction } = useLogger({ componentName: 'MobileNavigation' });

  const toggleMenu = () => {
    setIsOpen(!isOpen);
    logAction('mobile_menu_toggled', { isOpen: !isOpen });
  };

  return (
    <>
      <div className="mobile-nav-header">
        <h2 className="mobile-nav-logo">🧉 Mate Dealer</h2>
        <button onClick={toggleMenu} className="mobile-nav-toggle">
          <span className="hamburger-icon">☰</span>
        </button>
      </div>

      {isOpen && (
        <div className="mobile-nav-overlay" onClick={toggleMenu}>
          <div className="mobile-nav-menu" onClick={(e) => e.stopPropagation()}>
            <Navigation role={role} userEmail={userEmail} onLogout={onLogout} />
          </div>
        </div>
      )}
    </>
  );
};