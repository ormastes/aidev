/**
 * Example Login Page Component
 * 
 * This can be used as a template for login pages in AI Dev Portal, GUI Selector, etc.
 */

import React, { useState } from 'react';

export interface LoginPageProps {
  onLogin: (credentials: LoginCredentials) => Promise<LoginResult>;
  appName?: string;
  logoUrl?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResult {
  success: boolean;
  message?: string;
}

export const LoginPage: React.FC<LoginPageProps> = ({ 
  onLogin, 
  appName = 'AI Dev Platform',
  logoUrl 
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await onLogin({
        username,
        password,
        rememberMe
      });

      if (!result.success) {
        setError(result.message || 'Login failed');
      }
    } catch (err) {
      setError('An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.loginBox}>
        {logoUrl && (
          <img src={logoUrl} alt={appName} style={styles.logo} />
        )}
        
        <h1 style={styles.title}>{appName}</h1>
        <p style={styles.subtitle}>Sign in to continue</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          {error && (
            <div style={styles.error}>
              {error}
            </div>
          )}

          <div style={styles.inputGroup}>
            <label htmlFor="username" style={styles.label}>
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={styles.input}
              placeholder="Enter your username"
              required
              autoFocus
            />
          </div>

          <div style={styles.inputGroup}>
            <label htmlFor="password" style={styles.label}>
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              placeholder="Enter your password"
              required
            />
          </div>

          <div style={styles.checkboxGroup}>
            <input
              id="rememberMe"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              style={styles.checkbox}
            />
            <label htmlFor="rememberMe" style={styles.checkboxLabel}>
              Remember me
            </label>
          </div>

          <button
            type="submit"
            style={styles.button}
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={styles.footer}>
          <p style={styles.hint}>
            Default credentials (dev only):<br />
            Username: <code>admin</code><br />
            Password: <code>aidev2024</code>
          </p>
        </div>
      </div>
    </div>
  );
};

// Styles
const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5'
  },
  loginBox: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    width: '100%',
    maxWidth: '400px'
  },
  logo: {
    display: 'block',
    margin: '0 auto',
    height: '60px',
    marginBottom: '1rem'
  },
  title: {
    textAlign: 'center',
    marginBottom: '0.5rem',
    color: '#333',
    fontSize: '1.75rem'
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: '2rem',
    color: '#666'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  label: {
    fontWeight: '500',
    color: '#333'
  },
  input: {
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '1rem',
    outline: 'none',
    transition: 'border-color 0.2s'
  },
  checkboxGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  checkbox: {
    width: '18px',
    height: '18px'
  },
  checkboxLabel: {
    color: '#666'
  },
  button: {
    padding: '0.75rem',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '1rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    marginTop: '0.5rem'
  },
  error: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
    padding: '0.75rem',
    borderRadius: '4px',
    border: '1px solid #f5c6cb'
  },
  footer: {
    marginTop: '2rem',
    paddingTop: '1rem',
    borderTop: '1px solid #eee'
  },
  hint: {
    textAlign: 'center',
    color: '#666',
    fontSize: '0.875rem',
    lineHeight: '1.5'
  }
};

export default LoginPage;