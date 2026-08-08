import React, { useState } from 'react';
import { X, Calendar, Clock, DollarSign, AlertCircle } from 'lucide-react';
import api from '../services/api';

export default function FollowupModal({ customer, invoices = [], onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    customer_id: customer?.id || '',
    invoice_id: invoices.length > 0 ? invoices[0].id : '',
    followup_date: new Date().toISOString().split('T')[0],
    followup_time: '10:30 AM',
    followup_type: 'Phone Call',
    status: 'Pending',
    expected_payment_date: '',
    expected_payment_amount: '',
    promise_to_pay_date: '',
    promise_to_pay_amount: '',
    remark: '',
    next_followup_date: '',
    next_followup_time: '10:00 AM',
    priority: 'Medium',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.post('/followups', formData);
      if (res.data.success) {
        onSuccess && onSuccess(res.data.followup);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to record follow-up');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content animate-fade-in" style={{ padding: '1.5rem', backgroundColor: '#ffffff', color: '#0f172a' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
              Add Daily Follow-Up
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Customer: <strong style={{ color: '#0284c7' }}>{customer?.customer_name}</strong> ({customer?.customer_code})
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', color: '#64748b' }}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{ backgroundColor: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e', border: '1px solid rgba(244, 63, 94, 0.3)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {invoices.length > 0 && (
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '0.375rem' }}>
                Select Invoice (Optional)
              </label>
              <select
                value={formData.invoice_id}
                onChange={(e) => setFormData({ ...formData, invoice_id: e.target.value })}
                style={{ width: '100%' }}
              >
                <option value="">All Outstanding Invoices (Consolidated)</option>
                {invoices.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoice_number} - Due: ₹{inv.outstanding_amount?.toLocaleString('en-IN')} (Due: {new Date(inv.due_date).toLocaleDateString('en-IN')})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '0.375rem' }}>
              Follow-up Type
            </label>
            <select
              value={formData.followup_type}
              onChange={(e) => setFormData({ ...formData, followup_type: e.target.value })}
              style={{ width: '100%' }}
            >
              <option value="Phone Call">Phone Call</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="Visit">Visit</option>
              <option value="Email">Email</option>
              <option value="Payment Commitment">Payment Commitment</option>
              <option value="Payment Received">Payment Received</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '0.375rem' }}>
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              style={{ width: '100%' }}
            >
              <option value="Pending">Pending</option>
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
              Follow-up Date
            </label>
            <input
              type="date"
              value={formData.followup_date}
              onChange={(e) => setFormData({ ...formData, followup_date: e.target.value })}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '0.375rem' }}>
              Follow-up Time
            </label>
            <input
              type="text"
              placeholder="e.g. 11:30 AM"
              value={formData.followup_time}
              onChange={(e) => setFormData({ ...formData, followup_time: e.target.value })}
              style={{ width: '100%' }}
            />
          </div>

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

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '0.375rem' }}>
              Next Follow-up Date
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
              Priority
            </label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              style={{ width: '100%' }}
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Urgent">Urgent</option>
            </select>
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '0.375rem' }}>
              Follow-up Remark / Discussion Notes
            </label>
            <textarea
              rows={3}
              placeholder="Enter detailed conversation remark..."
              value={formData.remark}
              onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>

          <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
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
              style={{ backgroundColor: '#6366f1', color: '#ffffff', padding: '0.625rem 1.25rem', borderRadius: '6px', fontWeight: 600 }}
            >
              {loading ? 'Saving...' : 'Save Follow-Up'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
