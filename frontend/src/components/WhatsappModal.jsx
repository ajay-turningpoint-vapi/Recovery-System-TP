import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Send, CheckSquare, Square, ExternalLink } from 'lucide-react';
import api from '../services/api';

export default function WhatsappModal({ customer, invoices: initialInvoices = [], onClose }) {
  const [mobile, setMobile] = useState(customer?.mobile || '');
  const [invoices, setInvoices] = useState(initialInvoices);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState([]);
  const [templateName, setTemplateName] = useState('PAYMENT_REMINDER');
  const [customText, setCustomText] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Auto-fetch customer invoices if not passed as prop
  useEffect(() => {
    if (initialInvoices && initialInvoices.length > 0) {
      setInvoices(initialInvoices);
      setSelectedInvoiceIds(initialInvoices.map(inv => inv.id || inv.BILL_NO || inv.RefCode));
    } else if (customer?.id) {
      api.get(`/customers/${customer.id}/pending-bills`)
        .then(res => {
          const rawBills = res.data.pending_bills || res.data.bills || res.data.items || [];
          if (res.data.success && rawBills.length > 0) {
            const mapped = rawBills.map((b, idx) => ({
              id: String(b.RefCode || b.BILL_NO || b.No || idx + 1),
              invoice_number: String(b.BILL_NO || b.No || b.invoice_number || `BILL-${idx+1}`).trim(),
              outstanding_amount: b.PENDING_AMOUNT ?? b.outstanding_amount ?? b.REF_AMOUNT ?? 0,
              due_date: b.DUE_DATE || b.DueDate || b.due_date
            }));
            setInvoices(mapped);
            setSelectedInvoiceIds(mapped.map(inv => inv.id));
          } else if (customer.invoices && customer.invoices.length > 0) {
            setInvoices(customer.invoices);
            setSelectedInvoiceIds(customer.invoices.map(inv => inv.id));
          } else {
            // Fallback to fetch full customer details with MySQL invoices
            api.get(`/customers/${customer.id}`)
              .then(cRes => {
                if (cRes.data.success && cRes.data.customer?.invoices) {
                  const dbInvs = cRes.data.customer.invoices;
                  setInvoices(dbInvs);
                  setSelectedInvoiceIds(dbInvs.map(inv => inv.id));
                }
              })
              .catch(err => console.warn('Could not fetch fallback customer invoices:', err));
          }
        })
        .catch(err => {
          console.warn('Could not auto-fetch customer pending bills:', err);
          if (customer.invoices && customer.invoices.length > 0) {
            setInvoices(customer.invoices);
            setSelectedInvoiceIds(customer.invoices.map(inv => inv.id));
          }
        });
    }
  }, [customer, initialInvoices]);

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
      const amt = inv.outstanding_amount ?? inv.PENDING_AMOUNT ?? 0;
      totalAmt += amt;
      const dDate = inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-IN') : 'N/A';
      return `Bill ${inv.invoice_number || inv.BILL_NO} - ₹${amt.toLocaleString('en-IN')} - Due: ${dDate}`;
    }).join('\n');

    let template = '';
    const calcTotal = totalAmt || customer?.total_outstanding || 0;
    if (templateName === 'PAYMENT_REMINDER') {
      template = `Dear ${customer?.customer_name || 'Customer'},\n\nThis is a reminder regarding your outstanding payment of ₹${calcTotal.toLocaleString('en-IN')}.\n\nKindly arrange the payment at the earliest.\n\nRegards,\nSales Executive`;
    } else if (templateName === 'PAYMENT_DUE') {
      template = `Dear ${customer?.customer_name || 'Customer'},\n\nYour payment of ₹${calcTotal.toLocaleString('en-IN')} is due.\n\nKindly arrange the payment as per the agreed terms.\n\nRegards,\nSales Executive`;
    } else if (templateName === 'INVOICE_BREAKDOWN') {
      template = `Dear ${customer?.customer_name || 'Customer'},\n\nHere are the details of your outstanding invoices:\n\n${invLines || 'No invoices selected'}\n\nTotal Outstanding: ₹${calcTotal.toLocaleString('en-IN')}\n\nKindly process the payment at your earliest convenience.\n\nRegards,\nSales Executive`;
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
      <div className="modal-content animate-fade-in" style={{ padding: '1.5rem', maxWidth: '640px', backgroundColor: '#ffffff', color: '#0f172a' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MessageSquare size={20} color="#16a34a" /> WhatsApp Communication
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
