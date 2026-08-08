import React, { useState } from 'react';
import { X, CheckCircle, Clock } from 'lucide-react';
import api from '../services/api';

export default function QuickFollowupModal({ task, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    status: task?.status || 'Completed',
    remark: '',
    expected_payment_amount: task?.expected_payment_amount || '',
    expected_payment_date: task?.expected_payment_date ? new Date(task.expected_payment_date).toISOString().split('T')[0] : '',
    next_followup_date: '',
    next_followup_time: '11:00 AM',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.put(`/followups/${task.id}`, formData);
      if (res.data.success) {
        onSuccess && onSuccess(res.data.followup);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update quick follow-up');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content animate-fade-in" style={{ padding: '1.5rem', maxWidth: '520px', backgroundColor: '#ffffff', color: '#0f172a' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
              Quick Action Follow-Up
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Customer: <strong style={{ color: '#0284c7' }}>{task?.customer_name}</strong> ({task?.customer_code})
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', color: '#64748b' }}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{ backgroundColor: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e', border: '1px solid rgba(244, 63, 94, 0.3)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '0.375rem' }}>
              Follow-up Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              style={{ width: '100%' }}
            >
              <option value="Completed">Completed</option>
              <option value="Payment Promised">Payment Promised</option>
              <option value="Payment Received">Payment Received</option>
              <option value="Customer Not Responding">Customer Not Responding</option>
              <option value="Dispute">Dispute</option>
              <option value="Postponed">Postponed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '0.375rem' }}>
              Follow-up Remark / Summary
            </label>
            <textarea
              rows={3}
              required
              placeholder="Enter result of discussion with customer..."
              value={formData.remark}
              onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '0.375rem' }}>
                Expected Payment Amount (₹)
              </label>
              <input
                type="number"
                placeholder="0.00"
                value={formData.expected_payment_amount}
                onChange={(e) => setFormData({ ...formData, expected_payment_amount: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '0.375rem' }}>
                Expected Payment Date
              </label>
              <input
                type="date"
                value={formData.expected_payment_date}
                onChange={(e) => setFormData({ ...formData, expected_payment_date: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '0.375rem' }}>
                Schedule Next Follow-Up Date
              </label>
              <input
                type="date"
                value={formData.next_followup_date}
                onChange={(e) => setFormData({ ...formData, next_followup_date: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '0.375rem' }}>
                Next Follow-Up Time
              </label>
              <select
                value={formData.next_followup_time}
                onChange={(e) => setFormData({ ...formData, next_followup_time: e.target.value })}
                style={{ width: '100%' }}
              >
                <option value="09:00 AM">9:00 AM</option>
                <option value="10:00 AM">10:00 AM</option>
                <option value="11:00 AM">11:00 AM</option>
                <option value="12:00 PM">12:00 PM</option>
                <option value="01:00 PM">1:00 PM</option>
                <option value="02:00 PM">2:00 PM</option>
                <option value="03:00 PM">3:00 PM</option>
                <option value="04:00 PM">4:00 PM</option>
                <option value="05:00 PM">5:00 PM</option>
                <option value="06:00 PM">6:00 PM</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ backgroundColor: '#334155', color: '#f8fafc', padding: '0.625rem 1.25rem', borderRadius: '6px', fontWeight: 600 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{ backgroundColor: '#10b981', color: '#ffffff', padding: '0.625rem 1.25rem', borderRadius: '6px', fontWeight: 600 }}
            >
              {loading ? 'Saving...' : 'Update & Complete'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
