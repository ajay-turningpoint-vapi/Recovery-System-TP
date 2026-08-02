import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Pagination from '../components/Pagination';

import { MessageSquare, FileText, CheckCircle, Clock, Edit2, Save } from 'lucide-react';
import api from '../services/api';

export default function WhatsappModule() {
  const { isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState('LOGS'); // LOGS, TEMPLATES
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Edit template state
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [editedContent, setEditedContent] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/whatsapp/logs', { params: { page, limit: 15 } });
      if (res.data.success) {
        setLogs(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Error loading WhatsApp logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await api.get('/whatsapp/templates');
      if (res.data.success) {
        setTemplates(res.data.data);
      }
    } catch (err) {
      console.error('Error loading WhatsApp templates:', err);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchTemplates();
  }, [page]);

  const handleSaveTemplate = async (id) => {
    try {
      const res = await api.put(`/whatsapp/templates/${id}`, { content: editedContent });
      if (res.data.success) {
        setEditingTemplate(null);
        fetchTemplates();
      }
    } catch (err) {
      console.error('Error saving template:', err);
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
              <MessageSquare size={24} color="#25D366" /> WhatsApp Communication Hub
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              Audit sent reminders, manage automated templates, and inspect communication logs
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setActiveTab('LOGS')}
              style={{
                backgroundColor: activeTab === 'LOGS' ? '#25D366' : '#0f172a',
                color: activeTab === 'LOGS' ? '#000000' : '#94a3b8',
                border: '1px solid #334155',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '0.85rem'
              }}
            >
              Activity Logs ({logs.length})
            </button>
            <button
              onClick={() => setActiveTab('TEMPLATES')}
              style={{
                backgroundColor: activeTab === 'TEMPLATES' ? '#6366f1' : '#0f172a',
                color: activeTab === 'TEMPLATES' ? '#ffffff' : '#94a3b8',
                border: '1px solid #334155',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '0.85rem'
              }}
            >
              Message Templates ({templates.length})
            </button>
          </div>
        </div>

        {activeTab === 'LOGS' && (
          <div>
            <div style={{ overflowX: 'auto' }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Customer Name</th>
                    <th>Mobile</th>
                    <th>Dispatched Message</th>
                    <th>Invoices Attached</th>
                    <th>Dispatched By</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                        Loading WhatsApp audit logs...
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                        No WhatsApp logs dispatched yet.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id}>
                        <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                          {new Date(log.sent_at).toLocaleString('en-IN')}
                        </td>
                        <td style={{ fontWeight: 700, color: '#38bdf8' }}>
                          {log.customer?.customer_name} ({log.customer?.customer_code})
                        </td>
                        <td style={{ color: '#f8fafc', fontWeight: 600 }}>{log.mobile}</td>
                        <td style={{ color: '#cbd5e1', fontSize: '0.8rem', maxWidth: '320px', whiteSpace: 'pre-wrap' }}>
                          {log.message}
                        </td>
                        <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                          {log.invoice_ids || 'All Outstanding'}
                        </td>
                        <td style={{ color: '#a78bfa', fontSize: '0.8rem', fontWeight: 600 }}>
                          {log.user?.name || 'System'}
                        </td>
                        <td>
                          <span style={{ backgroundColor: 'rgba(37, 211, 102, 0.2)', color: '#25D366', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700 }}>
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <Pagination pagination={pagination} onPageChange={(p) => setPage(p)} />
          </div>
        )}

        {activeTab === 'TEMPLATES' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
            {templates.map((tpl) => {
              const isEditing = editingTemplate === tpl.id;
              return (
                <div
                  key={tpl.id}
                  style={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <span style={{ fontWeight: 700, color: '#38bdf8', fontSize: '0.95rem' }}>
                        {tpl.name}
                      </span>
                      {isAdmin && !isEditing && (
                        <button
                          onClick={() => { setEditingTemplate(tpl.id); setEditedContent(tpl.content); }}
                          style={{ backgroundColor: '#334155', color: '#f8fafc', padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          <Edit2 size={14} /> Edit Template
                        </button>
                      )}
                    </div>

                    {isEditing ? (
                      <textarea
                        rows={6}
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        style={{ width: '100%', marginBottom: '1rem' }}
                      />
                    ) : (
                      <pre style={{
                        whiteSpace: 'pre-wrap',
                        fontFamily: 'sans-serif',
                        fontSize: '0.85rem',
                        color: '#cbd5e1',
                        backgroundColor: '#1e293b',
                        padding: '0.875rem',
                        borderRadius: '6px',
                        border: '1px solid #334155'
                      }}>
                        {tpl.content}
                      </pre>
                    )}
                  </div>

                  {isEditing && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                      <button
                        onClick={() => setEditingTemplate(null)}
                        style={{ backgroundColor: '#334155', color: '#f8fafc', padding: '0.4rem 0.8rem', borderRadius: '4px', fontSize: '0.8rem' }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveTemplate(tpl.id)}
                        style={{ backgroundColor: '#10b981', color: '#ffffff', padding: '0.4rem 0.8rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                      >
                        <Save size={14} /> Save Template
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
