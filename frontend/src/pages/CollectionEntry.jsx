import React, { useState, useEffect } from 'react';
import StatusBadge from '../components/StatusBadge';
import Pagination from '../components/Pagination';
import PaymentModal from '../components/PaymentModal';

import { CreditCard, PlusCircle } from 'lucide-react';
import api from '../services/api';

export default function CollectionEntry() {
  const [payments, setPayments] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  // New Collection modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await api.get('/payments', { params: { page, limit: 20 } });
      if (res.data.success) {
        setPayments(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Error loading payments:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerList = async () => {
    try {
      const res = await api.get('/customers', { params: { limit: 100 } });
      if (res.data.success) {
        setCustomers(res.data.data);
        if (res.data.data.length > 0) {
          setSelectedCustomer(res.data.data[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching customers for payment:', err);
    }
  };

  useEffect(() => {
    fetchPayments();
    fetchCustomerList();
  }, [page]);

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
              <CreditCard size={24} color="#059669" /> Collection & Payment Entry
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Record customer payments, NEFT/RTGS/UPI receipts, and update outstanding balances
            </p>
          </div>

          <button
            onClick={() => setShowPaymentModal(true)}
            style={{
              backgroundColor: '#059669',
              color: '#ffffff',
              padding: '0.625rem 1.25rem',
              borderRadius: '8px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)'
            }}
          >
            <PlusCircle size={18} /> New Collection Entry
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Payment Date</th>
                <th>Customer Name & Code</th>
                <th>Invoice Allocated</th>
                <th>Amount Received</th>
                <th>Payment Mode</th>
                <th>Reference / UTR No</th>
                <th>Bank Name</th>
                <th>Remark</th>
                <th>Entered By</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                    Loading payment collection records...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                    No collection entries recorded yet.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id}>
                    <td style={{ color: '#64748b', fontSize: '0.85rem' }}>
                      {new Date(p.payment_date).toLocaleDateString('en-IN')}
                    </td>
                    <td style={{ fontWeight: 700, color: '#0284c7' }}>
                      {p.customer?.customer_name}
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{p.customer?.customer_code}</div>
                    </td>
                    <td style={{ fontWeight: 600, color: '#0f172a' }}>
                      {p.invoice?.invoice_number || 'Auto-Allocated Oldest Invoices'}
                    </td>
                    <td style={{ fontWeight: 800, color: '#059669', fontSize: '1rem' }}>
                      ₹{p.amount.toLocaleString('en-IN')}
                    </td>
                    <td style={{ fontWeight: 700, color: '#0f172a' }}>{p.payment_mode}</td>
                    <td style={{ color: '#475569', fontSize: '0.85rem' }}>{p.reference_number || 'N/A'}</td>
                    <td style={{ color: '#475569', fontSize: '0.85rem' }}>{p.bank || 'N/A'}</td>
                    <td style={{ color: '#64748b', fontSize: '0.85rem' }}>{p.remark || 'N/A'}</td>
                    <td style={{ color: '#6d28d9', fontSize: '0.85rem', fontWeight: 700 }}>{p.user?.name || 'System'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination pagination={pagination} onPageChange={(p) => setPage(p)} />
      </div>

      {showPaymentModal && (
        <PaymentModal
          customer={selectedCustomer || customers[0]}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={() => fetchPayments()}
        />
      )}
    </div>
  );
}
