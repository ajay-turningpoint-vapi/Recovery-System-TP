import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StatusBadge from '../components/StatusBadge';
import QuickFollowupModal from '../components/QuickFollowupModal';

import { CalendarCheck, Clock, Filter, Eye, CheckCircle, AlertTriangle, PlusCircle } from 'lucide-react';
import api from '../services/api';

export default function DailyTasks() {
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('TODAY'); // TODAY, TOMORROW, OVERDUE, THIS_WEEK, COMPLETED, PENDING, CUSTOM
  const [customDate, setCustomDate] = useState('');

  const [selectedTask, setSelectedTask] = useState(null);

  const fetchDailyTasks = async () => {
    setLoading(true);
    try {
      const res = await api.get('/followups/today', {
        params: {
          filter,
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
    fetchDailyTasks();
  }, [filter, customDate]);

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
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          marginBottom: '1.25rem'
        }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CalendarCheck size={24} color="#6366f1" /> My Daily Follow-Up Tasks
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              Action list for follow-ups, payment promises, and visits scheduled for today
            </p>
          </div>

          {/* Task Filter Tabs */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={() => setFilter('TODAY')}
              style={{
                backgroundColor: filter === 'TODAY' ? '#6366f1' : '#0f172a',
                color: filter === 'TODAY' ? '#ffffff' : '#94a3b8',
                border: '1px solid #334155',
                padding: '0.4rem 0.85rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 600
              }}
            >
              Today's Tasks
            </button>
            <button
              onClick={() => setFilter('OVERDUE')}
              style={{
                backgroundColor: filter === 'OVERDUE' ? '#f43f5e' : '#0f172a',
                color: filter === 'OVERDUE' ? '#ffffff' : '#94a3b8',
                border: '1px solid #334155',
                padding: '0.4rem 0.85rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 600
              }}
            >
              Overdue Tasks
            </button>
            <button
              onClick={() => setFilter('TOMORROW')}
              style={{
                backgroundColor: filter === 'TOMORROW' ? '#38bdf8' : '#0f172a',
                color: filter === 'TOMORROW' ? '#000000' : '#94a3b8',
                border: '1px solid #334155',
                padding: '0.4rem 0.85rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 600
              }}
            >
              Tomorrow
            </button>
            <button
              onClick={() => setFilter('THIS_WEEK')}
              style={{
                backgroundColor: filter === 'THIS_WEEK' ? '#8b5cf6' : '#0f172a',
                color: filter === 'THIS_WEEK' ? '#ffffff' : '#94a3b8',
                border: '1px solid #334155',
                padding: '0.4rem 0.85rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 600
              }}
            >
              This Week
            </button>
            <button
              onClick={() => setFilter('PENDING')}
              style={{
                backgroundColor: filter === 'PENDING' ? '#fbbf24' : '#0f172a',
                color: filter === 'PENDING' ? '#000000' : '#94a3b8',
                border: '1px solid #334155',
                padding: '0.4rem 0.85rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 600
              }}
            >
              All Pending
            </button>
            <button
              onClick={() => setFilter('COMPLETED')}
              style={{
                backgroundColor: filter === 'COMPLETED' ? '#10b981' : '#0f172a',
                color: filter === 'COMPLETED' ? '#ffffff' : '#94a3b8',
                border: '1px solid #334155',
                padding: '0.4rem 0.85rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 600
              }}
            >
              Completed
            </button>
          </div>
        </div>

        {/* Task List Table */}
        <div style={{ overflowX: 'auto' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Scheduled Date & Time</th>
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
                  <td colSpan="11" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                    No follow-up tasks scheduled for this view.
                  </td>
                </tr>
              ) : (
                tasks.map((t) => (
                  <tr key={t.id}>
                    <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                      {new Date(t.followup_date).toLocaleDateString('en-IN')} <div style={{ color: '#38bdf8' }}>{t.followup_time || ''}</div>
                    </td>
                    <td style={{ fontWeight: 700, color: '#38bdf8' }}>
                      <button
                        onClick={() => navigate(`/customers/${t.customer_id}`)}
                        style={{ background: 'transparent', color: '#38bdf8', fontWeight: 700, textAlign: 'left' }}
                      >
                        {t.customer_name}
                      </button>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{t.customer_code}</div>
                    </td>
                    <td style={{ color: '#f8fafc', fontWeight: 500 }}>{t.mobile || 'N/A'}</td>
                    <td style={{ fontWeight: 800, color: t.total_outstanding > 0 ? '#f8fafc' : '#34d399' }}>
                      ₹{t.total_outstanding.toLocaleString('en-IN')}
                    </td>
                    <td style={{ fontWeight: 700, color: t.overdue_amount > 0 ? '#f43f5e' : '#94a3b8' }}>
                      ₹{t.overdue_amount.toLocaleString('en-IN')}
                    </td>
                    <td>
                      <span style={{ backgroundColor: '#334155', color: '#f8fafc', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}>
                        {t.invoice_count} Inv
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: '#cbd5e1', maxWidth: '200px', whiteSpace: 'pre-wrap' }}>
                      {t.previous_remark || t.remark || 'N/A'}
                    </td>
                    <td style={{ color: '#34d399', fontWeight: 600, fontSize: '0.8rem' }}>
                      {t.expected_payment_amount ? `₹${t.expected_payment_amount.toLocaleString('en-IN')}` : 'N/A'}
                      {t.expected_payment_date && (
                        <div style={{ color: '#fbbf24', fontSize: '0.75rem' }}>
                          Due: {new Date(t.expected_payment_date).toLocaleDateString('en-IN')}
                        </div>
                      )}
                    </td>
                    <td>
                      <span style={{
                        color: t.priority === 'Urgent' || t.priority === 'High' ? '#f43f5e' : '#38bdf8',
                        fontWeight: 700,
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
                            backgroundColor: '#6366f1',
                            color: '#ffffff',
                            padding: '0.4rem 0.75rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                        >
                          <PlusCircle size={14} /> Add Follow-up
                        </button>

                        <button
                          onClick={() => navigate(`/customers/${t.customer_id}`)}
                          title="Open Customer Dashboard"
                          style={{ backgroundColor: '#334155', color: '#38bdf8', padding: '0.4rem 0.5rem', borderRadius: '4px' }}
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
