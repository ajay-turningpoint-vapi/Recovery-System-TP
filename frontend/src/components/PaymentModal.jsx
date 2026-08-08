import React, { useState } from 'react';
import { X, CreditCard, DollarSign } from 'lucide-react';
import api from '../services/api';

export default function PaymentModal({ customer, invoice, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    customer_id: customer?.id || '',
    invoice_id: invoice?.id || '',
    payment_date: new Date().toISOString().split('T')[0],
    amount: invoice?.outstanding_amount || customer?.total_outstanding || '',
    payment_mode: 'NEFT',
    reference_number: '',
    bank: '',
    remark: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.post('/payments', formData);
      if (res.data.success) {
        onSuccess && onSuccess(res.data.payment);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to record collection entry');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content animate-fade-in" style={{ padding: '1.5rem', maxWidth: '560px', backgroundColor: '#ffffff', color: '#0f172a' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CreditCard size={20} color="#059669" /> Record Payment Collection
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Customer: <strong style={{ color: '#0284c7' }}>{customer?.customer_name}</strong> {invoice ? `| Invoice: ${invoice.invoice_number}` : ''}
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

        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '0.375rem' }}>
              Collection Amount (₹) *
            </label>
            <input
              type="number"
              required
              step="0.01"
              placeholder="Enter amount..."
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              style={{ width: '100%', fontSize: '1.1rem', fontWeight: 700, color: '#34d399' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '0.375rem' }}>
              Payment Mode *
            </label>
            <select
              value={formData.payment_mode}
              onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value })}
              style={{ width: '100%' }}
            >
              <option value="NEFT">NEFT</option>
              <option value="RTGS">RTGS</option>
              <option value="IMPS">IMPS</option>
              <option value="UPI">UPI</option>
              <option value="Cheque">Cheque</option>
              <option value="Cash">Cash</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '0.375rem' }}>
              Payment Date *
            </label>
            <input
              type="date"
              required
              value={formData.payment_date}
              onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '0.375rem' }}>
              Reference / Cheque / UTR No.
            </label>
            <input
              type="text"
              placeholder="e.g. UTR9876543210"
              value={formData.reference_number}
              onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '0.375rem' }}>
              Bank Name (If applicable)
            </label>
            <input
              type="text"
              placeholder="e.g. HDFC Bank"
              value={formData.bank}
              onChange={(e) => setFormData({ ...formData, bank: e.target.value })}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '0.375rem' }}>
              Collection Remarks
            </label>
            <textarea
              rows={2}
              placeholder="Enter deposit / payment remarks..."
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
              style={{ backgroundColor: '#10b981', color: '#ffffff', padding: '0.625rem 1.25rem', borderRadius: '6px', fontWeight: 600 }}
            >
              {loading ? 'Processing...' : 'Save Collection Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
