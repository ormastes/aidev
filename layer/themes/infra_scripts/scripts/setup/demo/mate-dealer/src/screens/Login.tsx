import React, { useState } from 'react';
import { useLogger } from '../hooks/useLogger';

interface LoginProps {
  onLogin: (email: string, password: string, role: 'customer' | 'dealer') => Promise<void>;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [role, setRole] = useState<'customer' | 'dealer'>('customer');
  const [email, setEmail] = useState('demo@example.com');
  const [password, setPassword] = useState('demo123');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { logAction, logError } = useLogger({ componentName: 'Login' });

  const handleRoleChange = (newRole: 'customer' | 'dealer') => {
    setRole(newRole);
    logAction('role_selection_changed', { from: role, to: newRole });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await onLogin(email, password, role);
    } catch (err) {
      const errorMessage = (err as Error).message || 'Login failed';
      setError(errorMessage);
      logError('Login failed', err as Error, { email, role });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">Mate Dealer</h1>
        <p className="login-subtitle">Connect with the best mate dealers in your area</p>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="role-selector">
            <label className="role-option">
              <input
                type="radio"
                name="role"
                value="customer"
                checked={role === 'customer'}
                onChange={() => handleRoleChange('customer')}
                disabled={isLoading}
              />
              <span className="role-label">
                <span className="role-title">Customer</span>
                <span className="role-description">Find and buy mate products</span>
              </span>
            </label>
            
            <label className="role-option">
              <input
                type="radio"
                name="role"
                value="dealer"
                checked={role === 'dealer'}
                onChange={() => handleRoleChange('dealer')}
                disabled={isLoading}
              />
              <span className="role-label">
                <span className="role-title">Dealer</span>
                <span className="role-description">Manage your mate business</span>
              </span>
            </label>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              name="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                logAction('email_input_changed', { length: e.target.value.length });
              }}
              placeholder="Enter your email"
              required
              disabled={isLoading}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              name="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                logAction('password_input_changed', { length: e.target.value.length });
              }}
              placeholder="Enter your password"
              required
              disabled={isLoading}
              className="form-input"
            />
          </div>

          {error && (
            <div className="error-message" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="submit-button"
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>

          <div className="demo-hint">
            <p>Demo credentials:</p>
            <p>Email: demo@example.com</p>
            <p>Password: demo123</p>
          </div>
        </form>
      </div>
    </div>
  );
};