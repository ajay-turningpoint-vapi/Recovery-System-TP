import React, { useState, useEffect } from 'react';
import StatusBadge from '../components/StatusBadge';
import Pagination from '../components/Pagination';

import { Search, Filter, Eye, FileText, Calendar, DollarSign } from 'lucide-react';
import api from '../services/api';

export default function InvoiceOutstanding() {
  const [invoices, setInvoices] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  // Selected Invoice Detail Modal
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await api.get('/invoices', {
        params: {
          search,
          status: statusFilter || undefined,
          page,
          limit: 20
        }
      });
      if (res.data.success) {
        setInvoices(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Error fetching invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [search, statusFilter, page]);

  const viewInvoiceDetail = async (id) => {
    try {
      const res = await api.get(`/invoices/${id}`);
      if (res.data.success) {
        setSelectedInvoice(res.data.invoice);
      }
    } catch (err) {
      console.error('Error opening invoice details:', err);
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
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          marginBottom: '1.25rem'
        }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc' }}>
              Invoice / Bill Outstanding Master List
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              Track invoice dates, credit terms, days overdue, and payment status
            </p>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ position: 'relative', width: '240px' }}>
              <input
                type="text"
                placeholder="Search Inv No, Customer..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                style={{ width: '100%', paddingLeft: '2.2rem' }}
              />
              <Search size={16} color="#64748b" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Filter size={16} color="#94a3b8" />
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              >
                <option value="">All Invoice Statuses</option>
                <option value="Overdue">Overdue Invoices</option>
                <option value="Due Today">Due Today Invoices</option>
                <option value="Not Due">Not Due Invoices</option>
                <option value="Paid">Paid Invoices</option>
              </select>
            </div>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Invoice No</th>
                <th>Invoice Date</th>
                <th>Customer Name</th>
                <th>Salesman</th>
                <th>Invoice Amount</th>
                <th>Paid Amount</th>
                <th>Outstanding</th>
                <th>Due Date</th>
                <th>Overdue Status</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="11" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                    Loading invoice outstanding ledger...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan="11" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                    No matching invoices found.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td style={{ fontWeight: 700, color: '#38bdf8' }}>{inv.invoice_number}</td>
                    <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                      {new Date(inv.invoice_date).toLocaleDateString('en-IN')}
                    </td>
                    <td style={{ fontWeight: 600, color: '#f8fafc' }}>
                      {inv.customer?.customer_name} ({inv.customer?.customer_code})
                    </td>
                    <td style={{ color: '#a78bfa', fontSize: '0.8rem', fontWeight: 600 }}>{inv.salesman_code}</td>
                    <td>₹{inv.invoice_amount.toLocaleString('en-IN')}</td>
                    <td style={{ color: '#10b981' }}>₹{inv.paid_amount.toLocaleString('en-IN')}</td>
                    <td style={{ fontWeight: 800, color: inv.outstanding_amount > 0 ? '#f8fafc' : '#34d399' }}>
                      ₹{inv.outstanding_amount.toLocaleString('en-IN')}
                    </td>
                    <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                      {new Date(inv.due_date).toLocaleDateString('en-IN')}
                    </td>
                    <td style={{ fontWeight: 700, color: inv.days_overdue > 0 ? '#f43f5e' : '#34d399', fontSize: '0.8rem' }}>
                      {inv.overdue_status}
                    </td>
                    <td>
                      <StatusBadge status={inv.status} />
                    </td>
                    <td>
                      <button
                        onClick={() => viewInvoiceDetail(inv.id)}
                        style={{ backgroundColor: '#334155', color: '#38bdf8', padding: '0.375rem 0.625rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}
                      >
                        View Breakdown
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination pagination={pagination} onPageChange={(p) => setPage(p)} />
      </div>

      {/* Invoice Details Modal */}
      {selectedInvoice && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" style={{ padding: '1.5rem', maxWidth: '700px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #334155', pb: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc' }}>
                  Invoice Detail Breakdown - {selectedInvoice.invoice_number}
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  Customer: <strong style={{ color: '#38bdf8' }}>{selectedInvoice.customer?.customer_name}</strong>
                </p>
              </div>
              <button onClick={() => setSelectedInvoice(null)} style={{ background: 'transparent', color: '#94a3b8' }}>
                ✕
              </button>
            </div>

            {/* Line Items Table */}
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.5rem' }}>
              Invoice Line Items
            </h4>
            <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Item Description</th>
                    <th>HSN</th>
                    <th>Qty</th>
                    <th>Rate</th>
                    <th>Tax %</th>
                    <th>Disc %</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedInvoice.items?.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '1rem', color: '#64748b' }}>
                        No item breakdown available.
                      </td>
                    </tr>
                  ) : (
                    selectedInvoice.items?.map((item) => (
                      <tr key={item.id}>
                        <td style={{ fontWeight: 600, color: '#f8fafc' }}>{item.item_name}</td>
                        <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{item.hsn || 'N/A'}</td>
                        <td>{item.quantity} {item.unit || ''}</td>
                        <td>₹{item.rate?.toLocaleString('en-IN')}</td>
                        <td>{item.tax}%</td>
                        <td>{item.discount}%</td>
                        <td style={{ fontWeight: 700, color: '#38bdf8' }}>₹{item.amount?.toLocaleString('en-IN')}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Payment History for Invoice */}
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.5rem' }}>
              Allocated Collection History
            </h4>
            <div style={{ overflowX: 'auto', marginBottom: '1.25rem' }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Payment Date</th>
                    <th>Mode</th>
                    <th>Reference</th>
                    <th>Amount Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedInvoice.payments?.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '1rem', color: '#64748b' }}>
                        No payment collection recorded against this invoice yet.
                      </td>
                    </tr>
                  ) : (
                    selectedInvoice.payments?.map((p) => (
                      <tr key={p.id}>
                        <td style={{ color: '#94a3b8' }}>{new Date(p.payment_date).toLocaleDateString('en-IN')}</td>
                        <td style={{ fontWeight: 600, color: '#f8fafc' }}>{p.payment_mode}</td>
                        <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{p.reference_number || 'N/A'}</td>
                        <td style={{ fontWeight: 800, color: '#34d399' }}>₹{p.amount?.toLocaleString('en-IN')}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSelectedInvoice(null)}
                style={{ backgroundColor: '#6366f1', color: '#ffffff', padding: '0.5rem 1.25rem', borderRadius: '6px', fontWeight: 600 }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
