import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, User, Shield, AlertCircle, ArrowRight } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('salesman1');
  const [password, setPassword] = useState('salesman123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (u, p) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0f172a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      background: 'radial-gradient(circle at top right, #1e1b4b 0%, #0f172a 60%)'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        backgroundColor: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '16px',
        padding: '2.5rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        {/* Logo & Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '56px',
            height: '56px',
            backgroundColor: '#6366f1',
            borderRadius: '14px',
            color: '#ffffff',
            fontWeight: 800,
            fontSize: '1.5rem',
            marginBottom: '1rem',
            boxShadow: '0 8px 20px rgba(99, 102, 241, 0.4)'
          }}>
            TP
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
            Recovery TP Management
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginTop: '0.25rem' }}>
            Payment Collection & ERP Follow-up Portal
          </p>
        </div>

        {error && (
          <div style={{
            backgroundColor: 'rgba(244, 63, 94, 0.15)',
            color: '#f43f5e',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            padding: '0.875rem',
            borderRadius: '8px',
            fontSize: '0.875rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '0.375rem' }}>
              Username
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                style={{ width: '100%', paddingLeft: '2.5rem' }}
              />
              <User size={18} color="#64748b" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '0.375rem' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                style={{ width: '100%', paddingLeft: '2.5rem' }}
              />
              <Lock size={18} color="#64748b" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              backgroundColor: '#6366f1',
              color: '#ffffff',
              padding: '0.875rem',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              marginTop: '0.5rem',
              boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)'
            }}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
            <ArrowRight size={18} />
          </button>
        </form>

        {/* Quick Demo Login Switcher */}
        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #334155' }}>
          <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textAlign: 'center', marginBottom: '0.75rem' }}>
            DEMO QUICK LOGINS
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => quickLogin('salesman1', 'salesman123')}
              style={{
                backgroundColor: username === 'salesman1' ? 'rgba(56, 189, 248, 0.2)' : '#0f172a',
                color: username === 'salesman1' ? '#38bdf8' : '#94a3b8',
                border: '1px solid #334155',
                padding: '0.5rem',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 600
              }}
            >
              Salesman 1
            </button>
            <button
              type="button"
              onClick={() => quickLogin('salesman2', 'salesman123')}
              style={{
                backgroundColor: username === 'salesman2' ? 'rgba(56, 189, 248, 0.2)' : '#0f172a',
                color: username === 'salesman2' ? '#38bdf8' : '#94a3b8',
                border: '1px solid #334155',
                padding: '0.5rem',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 600
              }}
            >
              Salesman 2
            </button>
            <button
              type="button"
              onClick={() => quickLogin('admin', 'admin123')}
              style={{
                backgroundColor: username === 'admin' ? 'rgba(99, 102, 241, 0.2)' : '#0f172a',
                color: username === 'admin' ? '#818cf8' : '#94a3b8',
                border: '1px solid #334155',
                padding: '0.5rem',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 600
              }}
            >
              Admin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
