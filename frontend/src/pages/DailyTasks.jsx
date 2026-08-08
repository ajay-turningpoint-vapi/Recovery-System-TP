import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StatusBadge from '../components/StatusBadge';
import QuickFollowupModal from '../components/QuickFollowupModal';

import { CalendarCheck, Filter, Eye, PlusCircle } from 'lucide-react';
import api from '../services/api';

export default function DailyTasks() {
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [salesmen, setSalesmen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('TODAY'); // TODAY, TOMORROW, OVERDUE, THIS_WEEK, COMPLETED, PENDING, CUSTOM
  const [customDate, setCustomDate] = useState('');
  const [salesmanFilter, setSalesmanFilter] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);

  // Get current user role from localStorage
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'ADMIN';

  // Fetch registered salesmen list
  const fetchSalesmen = async () => {
    try {
      const res = await api.get('/users/salesmen');
      if (res.data.success) {
        setSalesmen(res.data.data);
      }
    } catch (err) {
      console.error('Error loading salesmen list:', err);
    }
  };

  const fetchDailyTasks = async () => {
    setLoading(true);
    try {
      const res = await api.get('/followups/today', {
        params: {
          filter,
          salesman_code: salesmanFilter || undefined,
          customDate: filter === 'CUSTOM' ? customDate : undefined
        }
      });
      if (res.data.success) {
        setTasks(res.data.tasks);
      }
    } catch (err) {
      console.error('Error fetching daily tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesmen();
  }, []);

  useEffect(() => {
    fetchDailyTasks();
  }, [filter, salesmanFilter, customDate]);

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
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          marginBottom: '1.25rem'
        }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CalendarCheck size={24} color="#4f46e5" /> My Daily Follow-Up Tasks
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Action list for follow-ups, payment promises, and ERP recovery tasks
            </p>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }}>
            {/* Salesman filter — admin only */}
          {isAdmin && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Filter size={16} color="#64748b" />
              <select
                value={salesmanFilter}
                onChange={(e) => setSalesmanFilter(e.target.value)}
                style={{ backgroundColor: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.5rem' }}
              >
                <option value="">All Salesmen / Accounts</option>
                {salesmen.map((sm) => (
                  <option key={sm.code} value={sm.code}>
                    {sm.name} ({sm.count})
                  </option>
                ))}
              </select>
            </div>
          )}

            {/* Task Filter Tabs */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.375rem' }}>
              <button
                onClick={() => setFilter('TODAY')}
                style={{
                  backgroundColor: filter === 'TODAY' ? '#4f46e5' : '#f1f5f9',
                  color: filter === 'TODAY' ? '#ffffff' : '#475569',
                  border: '1px solid #cbd5e1',
                  padding: '0.4rem 0.85rem',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 700
                }}
              >
                Today's Tasks
              </button>
              <button
                onClick={() => setFilter('OVERDUE')}
                style={{
                  backgroundColor: filter === 'OVERDUE' ? '#dc2626' : '#f1f5f9',
                  color: filter === 'OVERDUE' ? '#ffffff' : '#475569',
                  border: '1px solid #cbd5e1',
                  padding: '0.4rem 0.85rem',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 700
                }}
              >
                Overdue Tasks
              </button>
              <button
                onClick={() => setFilter('TOMORROW')}
                style={{
                  backgroundColor: filter === 'TOMORROW' ? '#0284c7' : '#f1f5f9',
                  color: filter === 'TOMORROW' ? '#ffffff' : '#475569',
                  border: '1px solid #cbd5e1',
                  padding: '0.4rem 0.85rem',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 700
                }}
              >
                Tomorrow
              </button>
              <button
                onClick={() => setFilter('THIS_WEEK')}
                style={{
                  backgroundColor: filter === 'THIS_WEEK' ? '#7c3aed' : '#f1f5f9',
                  color: filter === 'THIS_WEEK' ? '#ffffff' : '#475569',
                  border: '1px solid #cbd5e1',
                  padding: '0.4rem 0.85rem',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 700
                }}
              >
                This Week
              </button>
              <button
                onClick={() => setFilter('PENDING')}
                style={{
                  backgroundColor: filter === 'PENDING' ? '#d97706' : '#f1f5f9',
                  color: filter === 'PENDING' ? '#ffffff' : '#475569',
                  border: '1px solid #cbd5e1',
                  padding: '0.4rem 0.85rem',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 700
                }}
              >
                All Pending
              </button>
              <button
                onClick={() => setFilter('COMPLETED')}
                style={{
                  backgroundColor: filter === 'COMPLETED' ? '#059669' : '#f1f5f9',
                  color: filter === 'COMPLETED' ? '#ffffff' : '#475569',
                  border: '1px solid #cbd5e1',
                  padding: '0.4rem 0.85rem',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 700
                }}
              >
                Completed
              </button>
              <button
                onClick={() => setFilter('CUSTOM')}
                style={{
                  backgroundColor: filter === 'CUSTOM' ? '#475569' : '#f1f5f9',
                  color: filter === 'CUSTOM' ? '#ffffff' : '#475569',
                  border: '1px solid #cbd5e1',
                  padding: '0.4rem 0.85rem',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 700
                }}
              >
                📅 Custom Date
              </button>
              {filter === 'CUSTOM' && (
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  style={{
                    border: '1px solid #7c3aed',
                    borderRadius: '6px',
                    padding: '0.4rem 0.6rem',
                    fontSize: '0.8rem',
                    color: '#0f172a',
                    backgroundColor: '#faf5ff'
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Task count summary */}
        {!loading && (
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.75rem', fontWeight: 600 }}>
            Showing <strong style={{ color: '#0f172a' }}>{tasks.length}</strong> task{tasks.length !== 1 ? 's' : ''}
            {filter === 'TODAY' && ' scheduled for today'}
            {filter === 'OVERDUE' && ' overdue'}
            {filter === 'TOMORROW' && ' scheduled for tomorrow'}
            {filter === 'THIS_WEEK' && ' this week'}
            {filter === 'PENDING' && ' pending'}
            {filter === 'COMPLETED' && ' completed'}
            {filter === 'CUSTOM' && customDate && ` on ${new Date(customDate).toLocaleDateString('en-IN')}`}
          </div>
        )}

        {/* Task List Table */}
        <div style={{ overflowX: 'auto' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Scheduled Date</th>
                <th>Customer Name</th>
                <th>Mobile</th>
                <th>Total Outstanding</th>
                <th>Overdue Amount</th>
                <th>Invoices</th>
                <th>Previous Remark</th>
                <th>Expected Payment</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="11" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                    Loading daily tasks...
                  </td>
                </tr>
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan="11" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                    No follow-up tasks scheduled for this view.
                  </td>
                </tr>
              ) : (
                tasks.map((t) => (
                  <tr key={t.id}>
                    <td style={{ color: '#64748b', fontSize: '0.8rem' }}>
                      {new Date(t.followup_date).toLocaleDateString('en-IN')}
                    </td>
                    <td style={{ fontWeight: 700, color: '#0284c7' }}>
                      <button
                        onClick={() => navigate(`/customers/${t.customer_id}`)}
                        style={{ background: 'transparent', color: '#0284c7', fontWeight: 700, textAlign: 'left' }}
                      >
                        {t.customer_name}
                      </button>
                      
                    </td>
                    <td style={{ color: '#0f172a', fontWeight: 600 }}>{t.mobile || 'N/A'}</td>
                    <td style={{ fontWeight: 800, color: t.total_outstanding > 0 ? '#0f172a' : '#059669' }}>
                      ₹{t.total_outstanding?.toLocaleString('en-IN')}
                    </td>
                    <td style={{ fontWeight: 700, color: t.overdue_amount > 0 ? '#dc2626' : '#64748b' }}>
                      ₹{t.overdue_amount?.toLocaleString('en-IN')}
                    </td>
                    <td>
                      <span style={{ backgroundColor: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 700 }}>
                        {t.invoice_count} Inv
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: '#475569', maxWidth: '200px', whiteSpace: 'pre-wrap' }}>
                      {t.previous_remark || t.remark || 'N/A'}
                    </td>
                    <td style={{ color: '#059669', fontWeight: 700, fontSize: '0.8rem' }}>
                      {t.expected_payment_amount ? `₹${t.expected_payment_amount.toLocaleString('en-IN')}` : 'N/A'}
                      {t.expected_payment_date && (
                        <div style={{ color: '#d97706', fontSize: '0.75rem', fontWeight: 600 }}>
                          Due: {new Date(t.expected_payment_date).toLocaleDateString('en-IN')}
                        </div>
                      )}
                    </td>
                    <td>
                      <span style={{
                        color: t.priority === 'Urgent' || t.priority === 'High' ? '#dc2626' : '#0284c7',
                        fontWeight: 800,
                        fontSize: '0.75rem',
                        textTransform: 'uppercase'
                      }}>
                        {t.priority}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={t.status} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <button
                          onClick={() => setSelectedTask(t)}
                          style={{
                            backgroundColor: '#4f46e5',
                            color: '#ffffff',
                            padding: '0.4rem 0.75rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            boxShadow: '0 2px 4px rgba(79, 70, 229, 0.2)'
                          }}
                        >
                          <PlusCircle size={14} /> Add Follow-up
                        </button>

                        <button
                          onClick={() => navigate(`/customers/${t.customer_id}`)}
                          title="Open Customer Dashboard"
                          style={{ backgroundColor: '#f0f9ff', color: '#0284c7', border: '1px solid #bae6fd', padding: '0.4rem 0.5rem', borderRadius: '4px' }}
                        >
                          <Eye size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedTask && (
        <QuickFollowupModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onSuccess={() => fetchDailyTasks()}
        />
      )}
    </div>
  );
}
