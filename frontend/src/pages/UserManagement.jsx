import React, { useState, useEffect } from 'react';
import StatusBadge from '../components/StatusBadge';
import { UserCog, PlusCircle, X, Pencil } from 'lucide-react';
import api from '../services/api';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editUser, setEditUser] = useState(null);

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    role: 'SALESMAN',
    salesman_code: '',
    mobile: '',
    email: '',
  });

  const [editFormData, setEditFormData] = useState({ mobile: '', email: '', salesman_code: '', name: '', status: 'ACTIVE' });
  const [error, setError] = useState(null);
  const [editError, setEditError] = useState(null);

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

  const openEditModal = (user) => {
    setEditUser(user);
    setEditFormData({
      name: user.name || '',
      mobile: user.mobile || '',
      email: user.email || '',
      salesman_code: user.salesman_code || '',
      status: user.status || 'ACTIVE',
    });
    setEditError(null);
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    setEditError(null);
    try {
      const res = await api.put(`/users/${editUser.id}`, editFormData);
      if (res.data.success) {
        setEditUser(null);
        fetchUsers();
      }
    } catch (err) {
      setEditError(err.response?.data?.message || 'Failed to update user');
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '1.25rem',
        marginBottom: '1.5rem',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.25rem',
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: '0.75rem'
        }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UserCog size={24} color="#4f46e5" /> User & Salesmen Management
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Create salesman accounts, assign salesman codes, and manage role-based permissions
            </p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              backgroundColor: '#4f46e5',
              color: '#ffffff',
              padding: '0.625rem 1.25rem',
              borderRadius: '8px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
            }}
          >
            <PlusCircle size={18} /> Create New User / Salesman
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Full Name</th>
                <th>Username</th>
                <th>Role</th>
                <th>Salesman Code (ERP)</th>
                <th>📱 Mobile Number</th>
               
                <th>Status</th>
                <th>Actions</th>
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
                users.map((u) => {
                  // Parse bracketed salesman string if present: e.g. "JIGNESH (7567034004)"
                  let cleanName = u.name || '';
                  let extractedMobile = u.mobile || '';
                  if (cleanName.includes('(') && cleanName.includes(')')) {
                    const match = cleanName.match(/^(.*?)\s*\((\d{10})\)$/);
                    if (match) {
                      cleanName = match[1].trim();
                      if (!extractedMobile) extractedMobile = match[2];
                    }
                  }

                  return (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 700, color: '#0f172a' }}>{cleanName}</td>
                      <td style={{ color: '#0284c7', fontWeight: 600 }}>{u.username}</td>
                      <td>
                        <span style={{
                          backgroundColor: u.role === 'ADMIN' ? '#e0e7ff' : '#e0f2fe',
                          color: u.role === 'ADMIN' ? '#4338ca' : '#0369a1',
                          border: u.role === 'ADMIN' ? '1px solid #c7d2fe' : '1px solid #bae6fd',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 700
                        }}>
                          {u.role}
                        </span>
                      </td>
                      <td style={{ color: '#6d28d9', fontWeight: 700 }}>
                        {u.salesman_code ? u.salesman_code.replace(/\s*\(\d{10}\)$/, '') : <span style={{color:'#94a3b8',fontSize:'0.75rem'}}>Not set</span>}
                      </td>
                      <td style={{ color: extractedMobile ? '#0f172a' : '#f59e0b', fontWeight: extractedMobile ? 600 : 600 }}>
                        {extractedMobile || '⚠️ Not set — click Edit'}
                      </td>
                   
                    <td>
                      <StatusBadge status={u.status} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          onClick={() => openEditModal(u)}
                          title="Edit mobile, email & salesman code"
                          style={{
                            backgroundColor: '#e0e7ff',
                            color: '#4338ca',
                            border: '1px solid #c7d2fe',
                            padding: '0.3rem 0.6rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            display: 'flex', alignItems: 'center', gap: '0.25rem'
                          }}
                        >
                          <Pencil size={12} /> Edit
                        </button>
                        <button
                          onClick={() => toggleUserStatus(u)}
                          style={{
                            backgroundColor: u.status === 'ACTIVE' ? '#ffe4e6' : '#d1fae5',
                            color: u.status === 'ACTIVE' ? '#be123c' : '#047857',
                            border: u.status === 'ACTIVE' ? '1px solid #fecdd3' : '1px solid #a7f3d0',
                            padding: '0.3rem 0.6rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 700
                          }}
                        >
                          {u.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" style={{ padding: '1.5rem', maxWidth: '520px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', pb: '0.75rem' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                Create New User Account
              </h2>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'transparent', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            {error && (
              <div style={{ backgroundColor: '#ffe4e6', color: '#be123c', border: '1px solid #fecdd3', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1rem' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleCreateUser} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '0.375rem' }}>
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
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '0.375rem' }}>
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
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '0.375rem' }}>
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
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '0.375rem' }}>
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
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '0.375rem' }}>
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
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '0.375rem' }}>
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

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '0.375rem' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="salesman@company.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{ backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '0.625rem 1.25rem', borderRadius: '6px', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ backgroundColor: '#4f46e5', color: '#ffffff', padding: '0.625rem 1.25rem', borderRadius: '6px', fontWeight: 700 }}
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editUser && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" style={{ padding: '1.5rem', maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>Edit User</h2>
                <p style={{ fontSize: '0.78rem', color: '#64748b' }}>Update contact details for <strong>{editUser.username}</strong></p>
              </div>
              <button onClick={() => setEditUser(null)} style={{ background: 'transparent', color: '#64748b' }}><X size={20} /></button>
            </div>

            {editError && (
              <div style={{ backgroundColor: '#ffe4e6', color: '#be123c', border: '1px solid #fecdd3', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1rem' }}>
                {editError}
              </div>
            )}

            <form onSubmit={handleEditUser} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '0.375rem' }}>Full Name</label>
                <input type="text" value={editFormData.name} onChange={e => setEditFormData({ ...editFormData, name: e.target.value })} style={{ width: '100%' }} placeholder="Full Name" />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '0.375rem' }}>Salesman Code (ERP)</label>
                <input type="text" value={editFormData.salesman_code} onChange={e => setEditFormData({ ...editFormData, salesman_code: e.target.value })} style={{ width: '100%' }} placeholder="e.g. ASHVINI" />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '0.375rem' }}>📱 Mobile Number (for WhatsApp)</label>
                <input type="text" value={editFormData.mobile} onChange={e => setEditFormData({ ...editFormData, mobile: e.target.value })} style={{ width: '100%' }} placeholder="9876543210" />
                <p style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.25rem' }}>WhatsApp messages will be sent FROM this number</p>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '0.375rem' }}>📧 Email Address</label>
                <input type="email" value={editFormData.email} onChange={e => setEditFormData({ ...editFormData, email: e.target.value })} style={{ width: '100%' }} placeholder="salesman@company.com" />
              </div>
              <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setEditUser(null)} style={{ backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '0.625rem 1.25rem', borderRadius: '6px', fontWeight: 600 }}>Cancel</button>
                <button type="submit" style={{ backgroundColor: '#4f46e5', color: '#ffffff', padding: '0.625rem 1.25rem', borderRadius: '6px', fontWeight: 700 }}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
