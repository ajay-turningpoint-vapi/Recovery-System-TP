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
              <MessageSquare size={24} color="#16a34a" /> WhatsApp Communication Hub
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Audit sent reminders, manage automated templates, and inspect communication logs
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setActiveTab('LOGS')}
              style={{
                backgroundColor: activeTab === 'LOGS' ? '#16a34a' : '#f1f5f9',
                color: activeTab === 'LOGS' ? '#ffffff' : '#475569',
                border: '1px solid #cbd5e1',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '0.85rem'
              }}
            >
              Communication Audit Trail
            </button>
            <button
              onClick={() => setActiveTab('TEMPLATES')}
              style={{
                backgroundColor: activeTab === 'TEMPLATES' ? '#4f46e5' : '#f1f5f9',
                color: activeTab === 'TEMPLATES' ? '#ffffff' : '#475569',
                border: '1px solid #cbd5e1',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '0.85rem'
              }}
            >
              WhatsApp Templates
            </button>
          </div>
        </div>

        {/* Tab 1: Logs */}
        {activeTab === 'LOGS' && (
          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Sent Timestamp</th>
                  <th>Customer Name & Code</th>
                  <th>Recipient Mobile</th>
                  <th>Template Code</th>
                  <th>Message Body</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                      Loading WhatsApp logs...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                      No WhatsApp reminders sent yet.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ color: '#64748b', fontSize: '0.8rem' }}>
                        {new Date(log.sent_at).toLocaleString('en-IN')}
                      </td>
                      <td style={{ fontWeight: 700, color: '#0284c7' }}>
                        {log.customer?.customer_name} ({log.customer?.customer_code})
                      </td>
                      <td style={{ fontWeight: 600, color: '#0f172a' }}>{log.mobile}</td>
                      <td style={{ color: '#6d28d9', fontSize: '0.8rem', fontWeight: 700 }}>{log.template_code || 'MANUAL'}</td>
                      <td style={{ fontSize: '0.8rem', color: '#475569', maxWidth: '320px', whiteSpace: 'pre-wrap' }}>
                        {log.message_body}
                      </td>
                      <td>
                        <span style={{
                          backgroundColor: '#d1fae5',
                          color: '#047857',
                          border: '1px solid #a7f3d0',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: 700
                        }}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <Pagination pagination={pagination} onPageChange={(p) => setPage(p)} />
          </div>
        )}

        {/* Tab 2: Templates */}
        {activeTab === 'TEMPLATES' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
            {templates.map((tpl) => (
              <div key={tpl.id} style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)'
              }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                      {tpl.template_name}
                    </h3>
                    <span style={{ backgroundColor: '#e0e7ff', color: '#4338ca', border: '1px solid #c7d2fe', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                      {tpl.template_code}
                    </span>
                  </div>

                  {editingTemplate === tpl.id ? (
                    <textarea
                      rows={5}
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      style={{ width: '100%', fontSize: '0.85rem', marginBottom: '1rem', backgroundColor: '#ffffff', color: '#0f172a', borderColor: '#cbd5e1' }}
                    />
                  ) : (
                    <div style={{
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      padding: '0.875rem',
                      fontSize: '0.85rem',
                      color: '#334155',
                      whiteSpace: 'pre-wrap',
                      marginBottom: '1rem'
                    }}>
                      {tpl.content}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  {editingTemplate === tpl.id ? (
                    <>
                      <button
                        onClick={() => setEditingTemplate(null)}
                        style={{ backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '0.4rem 0.85rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600 }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveTemplate(tpl.id)}
                        style={{ backgroundColor: '#059669', color: '#ffffff', padding: '0.4rem 0.85rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                      >
                        <Save size={14} /> Save Template
                      </button>
                    </>
                  ) : (
                    isAdmin && (
                      <button
                        onClick={() => { setEditingTemplate(tpl.id); setEditedContent(tpl.content); }}
                        style={{ backgroundColor: '#f0f9ff', color: '#0284c7', border: '1px solid #bae6fd', padding: '0.4rem 0.85rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                      >
                        <Edit2 size={14} /> Edit Template
                      </button>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
