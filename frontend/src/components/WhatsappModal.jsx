import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Send, CheckSquare, Square, ExternalLink } from 'lucide-react';
import api from '../services/api';

export default function WhatsappModal({ customer, invoices = [], onClose }) {
  const [mobile, setMobile] = useState(customer?.mobile || '');
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState(
    invoices.map((inv) => inv.id)
  );
  const [templateName, setTemplateName] = useState('PAYMENT_REMINDER');
  const [customText, setCustomText] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const toggleInvoiceSelect = (id) => {
    if (selectedInvoiceIds.includes(id)) {
      setSelectedInvoiceIds(selectedInvoiceIds.filter((item) => item !== id));
    } else {
      setSelectedInvoiceIds([...selectedInvoiceIds, id]);
    }
  };

  const selectAllInvoices = () => {
    if (selectedInvoiceIds.length === invoices.length) {
      setSelectedInvoiceIds([]);
    } else {
      setSelectedInvoiceIds(invoices.map((inv) => inv.id));
    }
  };

  // Generate live preview text client-side
  useEffect(() => {
    const selectedInvs = invoices.filter((inv) => selectedInvoiceIds.includes(inv.id));
    let totalAmt = 0;
    const invLines = selectedInvs.map((inv) => {
      totalAmt += inv.outstanding_amount || 0;
      const dDate = inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-IN') : 'N/A';
      return `Invoice ${inv.invoice_number} - ₹${(inv.outstanding_amount || 0).toLocaleString('en-IN')} - Due: ${dDate}`;
    }).join('\n');

    let template = '';
    if (templateName === 'PAYMENT_REMINDER') {
      template = `Dear ${customer?.customer_name || 'Customer'},\n\nThis is a reminder regarding your outstanding payment of ₹${(totalAmt || customer?.total_outstanding || 0).toLocaleString('en-IN')}.\n\nKindly arrange the payment at the earliest.\n\nRegards,\nSales Executive`;
    } else if (templateName === 'PAYMENT_DUE') {
      template = `Dear ${customer?.customer_name || 'Customer'},\n\nYour payment of ₹${(totalAmt || customer?.total_outstanding || 0).toLocaleString('en-IN')} is due.\n\nKindly arrange the payment as per the agreed terms.\n\nRegards,\nSales Executive`;
    } else if (templateName === 'INVOICE_BREAKDOWN') {
      template = `Dear ${customer?.customer_name || 'Customer'},\n\nHere are the details of your outstanding invoices:\n\n${invLines || 'No invoices selected'}\n\nTotal Outstanding: ₹${totalAmt.toLocaleString('en-IN')}\n\nKindly process the payment at your earliest convenience.\n\nRegards,\nSales Executive`;
    } else {
      template = customText || `Dear ${customer?.customer_name},\n\nPayment notification...`;
    }

    setPreviewText(template);
  }, [templateName, selectedInvoiceIds, customText, customer, invoices]);

  const handleSend = async () => {
    if (!mobile) {
      setError('Mobile number is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.post('/whatsapp/send', {
        customer_id: customer.id,
        mobile,
        template_name: templateName,
        custom_text: templateName === 'CUSTOM' ? customText : undefined,
        invoice_ids: selectedInvoiceIds,
      });

      if (res.data.success) {
        const { whatsappWebUrl, whatsappMobileUrl } = res.data.data;
        // Open WhatsApp in new tab
        window.open(whatsappWebUrl || whatsappMobileUrl, '_blank');
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to trigger WhatsApp message');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content animate-fade-in" style={{ padding: '1.5rem', maxWidth: '640px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #334155', pb: '0.75rem' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MessageSquare size={20} color="#25D366" /> WhatsApp Communication
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              Customer: <strong style={{ color: '#38bdf8' }}>{customer?.customer_name}</strong> ({customer?.customer_code})
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', color: '#94a3b8' }}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{ backgroundColor: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e', border: '1px solid rgba(244, 63, 94, 0.3)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '0.375rem' }}>
              Customer Mobile Number
            </label>
            <input
              type="text"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '0.375rem' }}>
              Message Template
            </label>
            <select
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="PAYMENT_REMINDER">Payment Reminder</option>
              <option value="PAYMENT_DUE">Payment Due Notice</option>
              <option value="INVOICE_BREAKDOWN">Itemized Invoice Breakdown</option>
              <option value="CUSTOM">Custom Message</option>
            </select>
          </div>
        </div>

        {/* Invoice Multi-Selector */}
        {invoices.length > 0 && (
          <div style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '0.875rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f8fafc' }}>
                Select Invoices to Include ({selectedInvoiceIds.length}/{invoices.length})
              </span>
              <button
                type="button"
                onClick={selectAllInvoices}
                style={{ background: 'transparent', color: '#38bdf8', fontSize: '0.75rem', fontWeight: 600 }}
              >
                {selectedInvoiceIds.length === invoices.length ? 'Deselect All' : 'Select All Invoices'}
              </button>
            </div>

            <div style={{ maxHeight: '120px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              {invoices.map((inv) => {
                const isSelected = selectedInvoiceIds.includes(inv.id);
                return (
                  <div
                    key={inv.id}
                    onClick={() => toggleInvoiceSelect(inv.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.375rem 0.625rem',
                      borderRadius: '4px',
                      backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {isSelected ? <CheckSquare size={16} color="#6366f1" /> : <Square size={16} color="#64748b" />}
                      <span style={{ color: isSelected ? '#f8fafc' : '#94a3b8', fontWeight: isSelected ? 600 : 400 }}>
                        {inv.invoice_number}
                      </span>
                    </div>
                    <span style={{ color: '#34d399', fontWeight: 600 }}>
                      ₹{inv.outstanding_amount?.toLocaleString('en-IN')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {templateName === 'CUSTOM' && (
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '0.375rem' }}>
              Custom Message Body
            </label>
            <textarea
              rows={3}
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="Type customized WhatsApp message..."
              style={{ width: '100%' }}
            />
          </div>
        )}

        {/* Live Preview Box */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '0.375rem' }}>
            Generated WhatsApp Message Preview
          </label>
          <div style={{
            backgroundColor: '#0f172a',
            border: '1px solid #25D366',
            borderRadius: '8px',
            padding: '1rem',
            fontSize: '0.85rem',
            color: '#f8fafc',
            whiteSpace: 'pre-wrap',
            fontFamily: 'sans-serif'
          }}>
            {previewText}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={onClose}
            style={{ backgroundColor: '#334155', color: '#f8fafc', padding: '0.625rem 1.25rem', borderRadius: '6px', fontWeight: 600 }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={loading}
            style={{
              backgroundColor: '#25D366',
              color: '#000000',
              padding: '0.625rem 1.25rem',
              borderRadius: '6px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Send size={16} />
            {loading ? 'Generating...' : 'Open in WhatsApp'}
          </button>
        </div>
      </div>
    </div>
  );
}
