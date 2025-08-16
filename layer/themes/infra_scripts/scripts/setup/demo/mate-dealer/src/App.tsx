import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './screens/Login';
import { CustomerDashboard } from './screens/CustomerDashboard';
import { DealerDashboard } from './screens/DealerDashboard';
import { AppLayout } from './components/AppLayout';
import { DebugPanel } from './components/DebugPanel';
import { useLogger } from './hooks/useLogger';
import { logger } from './services/ExternalLogger';
import { api } from './services/api';
import './styles/theme.css';

// Initialize performance monitoring
if (typeof window !== 'undefined') {
  // Log page load performance
  window.addEventListener('load', () => {
    const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (perfData) {
      logger.logPerformance('page_load', perfData.loadEventEnd - perfData.fetchStart);
      logger.logPerformance('dom_ready', perfData.domContentLoadedEventEnd - perfData.fetchStart);
      logger.logPerformance('first_paint', perfData.responseEnd - perfData.fetchStart);
    }
  });
}

interface AuthState {
  isAuthenticated: boolean;
  role: 'customer' | 'dealer' | null;
  userId: string | null;
  email: string | null;
}

function App() {
  const [auth, setAuth] = useState<AuthState>({
    isAuthenticated: false,
    role: null,
    userId: null,
    email: null
  });
  
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  
  const { logAction, measureAsync } = useLogger({ 
    componentName: 'App',
    userId: auth.userId 
  });

  // Toggle debug panel with keyboard shortcut
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Shift + D
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setShowDebugPanel(prev => !prev);
        logAction('toggle_debug_panel', { visible: !showDebugPanel });
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showDebugPanel, logAction]);

  const handleLogin = async (email: string, password: string, role: 'customer' | 'dealer') => {
    logAction('login_attempt', { email, role });
    
    try {
      // Use real API call
      const result = await measureAsync(
        async () => {
          const response = await api.login(email, password, role);
          if (response.error) {
            throw new Error(response.error);
          }
          return response.data!;
        },
        'login_api_call',
        { role }
      );

      setAuth({
        isAuthenticated: true,
        role: result.user.role as 'customer' | 'dealer',
        userId: result.user.id.toString(),
        email: result.user.email
      });

      logAction('login_success', { userId: result.user.id, role: result.user.role });
      
      // Store in session
      sessionStorage.setItem('auth', JSON.stringify({
        userId: result.user.id,
        email: result.user.email,
        role: result.user.role
      }));
      
    } catch (error) {
      logAction('login_failed', { error: (error as Error).message });
      throw error;
    }
  };

  const handleLogout = () => {
    logAction('logout', { userId: auth.userId });
    
    // Call API logout
    api.logout();
    
    setAuth({
      isAuthenticated: false,
      role: null,
      userId: null,
      email: null
    });
    
    sessionStorage.removeItem('auth');
  };

  // Restore auth from session
  useEffect(() => {
    const storedAuth = sessionStorage.getItem('auth');
    if (storedAuth) {
      try {
        const authData = JSON.parse(storedAuth);
        setAuth({
          isAuthenticated: true,
          role: authData.role,
          userId: authData.userId,
          email: authData.email
        });
        logger.info('Restored session', 'AUTH', { userId: authData.userId });
      } catch (error) {
        logger.error('Failed to restore session', 'AUTH', {}, error as Error);
      }
    }
  }, []);

  return (
    <Router>
      <div className="app">
        <Routes>
          <Route 
            path="/login" 
            element={
              auth.isAuthenticated ? 
                <Navigate to={auth.role === 'customer' ? '/customer/dashboard' : '/dealer/dashboard'} /> :
                <Login onLogin={handleLogin} />
            } 
          />
          
          <Route 
            path="/customer/*" 
            element={
              auth.isAuthenticated && auth.role === 'customer' ?
                <AppLayout role="customer" userEmail={auth.email!} onLogout={handleLogout}>
                  <Routes>
                    <Route path="dashboard" element={<CustomerDashboard />} />
                    <Route path="orders" element={<div className="placeholder-page">Orders - Coming Soon</div>} />
                    <Route path="favorites" element={<div className="placeholder-page">Favorites - Coming Soon</div>} />
                    <Route path="profile" element={<div className="placeholder-page">Profile - Coming Soon</div>} />
                    <Route index element={<Navigate to="dashboard" />} />
                  </Routes>
                </AppLayout> :
                <Navigate to="/login" />
            } 
          />
          
          <Route 
            path="/dealer/*" 
            element={
              auth.isAuthenticated && auth.role === 'dealer' ?
                <AppLayout role="dealer" userEmail={auth.email!} onLogout={handleLogout}>
                  <Routes>
                    <Route path="dashboard" element={<DealerDashboard />} />
                    <Route path="products" element={<div className="placeholder-page">Products - Coming Soon</div>} />
                    <Route path="orders" element={<div className="placeholder-page">Orders - Coming Soon</div>} />
                    <Route path="customers" element={<div className="placeholder-page">Customers - Coming Soon</div>} />
                    <Route path="analytics" element={<div className="placeholder-page">Analytics - Coming Soon</div>} />
                    <Route path="profile" element={<div className="placeholder-page">Profile - Coming Soon</div>} />
                    <Route index element={<Navigate to="dashboard" />} />
                  </Routes>
                </AppLayout> :
                <Navigate to="/login" />
            } 
          />
          
          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>

        {/* Debug Panel - Toggle with Ctrl+Shift+D */}
        <DebugPanel 
          isOpen={showDebugPanel} 
          onClose={() => setShowDebugPanel(false)} 
        />

        {/* Development mode indicator */}
        {process.env.NODE_ENV === 'development' && (
          <div style={{
            position: 'fixed',
            bottom: 10,
            right: 10,
            backgroundColor: '#3b82f6',
            color: '#fff',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            cursor: 'pointer'
          }} onClick={() => setShowDebugPanel(true)}>
            Debug (Ctrl+Shift+D)
          </div>
        )}
      </div>
    </Router>
  );
}

export default App;