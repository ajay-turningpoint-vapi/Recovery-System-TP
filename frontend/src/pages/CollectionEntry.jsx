import React, { useState, useEffect } from 'react';
import StatusBadge from '../components/StatusBadge';
import Pagination from '../components/Pagination';
import PaymentModal from '../components/PaymentModal';

import { CreditCard, PlusCircle, Search, DollarSign, Calendar, CheckCircle } from 'lucide-react';
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
              <CreditCard size={24} color="#10b981" /> Collection & Payment Entry
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              Record customer payments, NEFT/RTGS/UPI receipts, and update outstanding balances
            </p>
          </div>

          <button
            onClick={() => setShowPaymentModal(true)}
            style={{
              backgroundColor: '#10b981',
              color: '#ffffff',
              padding: '0.625rem 1.25rem',
              borderRadius: '8px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
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
                  <td colSpan="9" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                    No collection entries recorded yet.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id}>
                    <td style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                      {new Date(p.payment_date).toLocaleDateString('en-IN')}
                    </td>
                    <td style={{ fontWeight: 700, color: '#38bdf8' }}>
                      {p.customer?.customer_name}
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{p.customer?.customer_code}</div>
                    </td>
                    <td style={{ fontWeight: 600, color: '#f8fafc' }}>
                      {p.invoice?.invoice_number || 'Auto-Allocated Oldest Invoices'}
                    </td>
                    <td style={{ fontWeight: 800, color: '#34d399', fontSize: '1rem' }}>
                      ₹{p.amount.toLocaleString('en-IN')}
                    </td>
                    <td style={{ fontWeight: 700, color: '#f8fafc' }}>{p.payment_mode}</td>
                    <td style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>{p.reference_number || 'N/A'}</td>
                    <td style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>{p.bank || 'N/A'}</td>
                    <td style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{p.remark || 'N/A'}</td>
                    <td style={{ color: '#a78bfa', fontSize: '0.85rem', fontWeight: 600 }}>{p.user?.name || 'System'}</td>
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
