import React, { useState, useEffect } from 'react';
import StatusBadge from '../components/StatusBadge';
import { UserCog, PlusCircle, Shield, User, Phone, Mail, Edit3, X } from 'lucide-react';
import api from '../services/api';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    role: 'SALESMAN',
    salesman_code: '',
    mobile: '',
    email: '',
  });

  const [error, setError] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users');
      if (res.data.success) {
        setUsers(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await api.post('/users', formData);
      if (res.data.success) {
        setShowCreateModal(false);
        setFormData({
          username: '',
          password: '',
          name: '',
          role: 'SALESMAN',
          salesman_code: '',
          mobile: '',
          email: '',
        });
        fetchUsers();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create user');
    }
  };

  const toggleUserStatus = async (user) => {
    const newStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await api.put(`/users/${user.id}`, { status: newStatus });
      fetchUsers();
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{
        backgroundColor: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '12px',
        padding: '1.25rem',
        marginBottom: '1.5rem'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.25rem',
          borderBottom: '1px solid #334155',
          paddingBottom: '0.75rem'
        }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UserCog size={24} color="#6366f1" /> User & Salesmen Management
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              Create salesman accounts, assign salesman codes, and manage role-based permissions
            </p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              backgroundColor: '#6366f1',
              color: '#ffffff',
              padding: '0.625rem 1.25rem',
              borderRadius: '8px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)'
            }}
          >
            <PlusCircle size={18} /> Create New User / Salesman
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>User Full Name</th>
                <th>Username</th>
                <th>Role</th>
                <th>Salesman Code</th>
                <th>Mobile Number</th>
                <th>Email Address</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                    Loading users list...
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 700, color: '#f8fafc' }}>{u.name}</td>
                    <td style={{ color: '#38bdf8', fontWeight: 600 }}>{u.username}</td>
                    <td>
                      <span style={{
                        backgroundColor: u.role === 'ADMIN' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                        color: u.role === 'ADMIN' ? '#818cf8' : '#38bdf8',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 700
                      }}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ color: '#a78bfa', fontWeight: 700 }}>{u.salesman_code || 'N/A'}</td>
                    <td style={{ color: '#cbd5e1' }}>{u.mobile || 'N/A'}</td>
                    <td style={{ color: '#cbd5e1' }}>{u.email || 'N/A'}</td>
                    <td>
                      <StatusBadge status={u.status} />
                    </td>
                    <td>
                      <button
                        onClick={() => toggleUserStatus(u)}
                        style={{
                          backgroundColor: u.status === 'ACTIVE' ? 'rgba(244, 63, 94, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                          color: u.status === 'ACTIVE' ? '#f43f5e' : '#34d399',
                          padding: '0.3rem 0.6rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 700
                        }}
                      >
                        {u.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" style={{ padding: '1.5rem', maxWidth: '520px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #334155', pb: '0.75rem' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc' }}>
                Create New User Account
              </h2>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'transparent', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>

            {error && (
              <div style={{ backgroundColor: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e', border: '1px solid rgba(244, 63, 94, 0.3)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1rem' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleCreateUser} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '0.375rem' }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Patel"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '0.375rem' }}>
                  Username *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ramesh"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '0.375rem' }}>
                  Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '0.375rem' }}>
                  User Role *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  style={{ width: '100%' }}
                >
                  <option value="SALESMAN">SALESMAN</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '0.375rem' }}>
                  Salesman Code (e.g. SM-003)
                </label>
                <input
                  type="text"
                  placeholder="SM-003"
                  value={formData.salesman_code}
                  onChange={(e) => setFormData({ ...formData, salesman_code: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '0.375rem' }}>
                  Mobile Number
                </label>
                <input
                  type="text"
                  placeholder="9876543210"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{ backgroundColor: '#334155', color: '#f8fafc', padding: '0.625rem 1.25rem', borderRadius: '6px', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ backgroundColor: '#6366f1', color: '#ffffff', padding: '0.625rem 1.25rem', borderRadius: '6px', fontWeight: 600 }}
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
