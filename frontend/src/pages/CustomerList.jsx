import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StatusBadge from '../components/StatusBadge';
import Pagination from '../components/Pagination';
import FollowupModal from '../components/FollowupModal';
import PaymentModal from '../components/PaymentModal';
import WhatsappModal from '../components/WhatsappModal';

import { Search, Eye, PlusCircle, CreditCard, MessageSquare, Phone, MapPin } from 'lucide-react';
import api from '../services/api';

export default function CustomerList() {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Modals
  const [activeFollowupCustomer, setActiveFollowupCustomer] = useState(null);
  const [activePaymentCustomer, setActivePaymentCustomer] = useState(null);
  const [activeWhatsappCustomer, setActiveWhatsappCustomer] = useState(null);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/customers', {
        params: { search, page, limit: 15 }
      });
      if (res.data.success) {
        setCustomers(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [search, page]);

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
              My Assigned Customers
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              Manage master customer list, credit terms, and quick actions
            </p>
          </div>

          <div style={{ position: 'relative', width: '280px' }}>
            <input
              type="text"
              placeholder="Search Customer, Code, Mobile..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              style={{ width: '100%', paddingLeft: '2.2rem' }}
            />
            <Search size={16} color="#64748b" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Code</th>
                <th>City / State</th>
                <th>Mobile</th>
                <th>Salesman</th>
                <th>Credit Limit</th>
                <th>Credit Days</th>
                <th>Invoices</th>
                <th>Outstanding</th>
                <th>Overdue</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="11" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                    Loading customer directory...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan="11" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                    No matching customer records found.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 700, color: '#38bdf8' }}>
                      <button
                        onClick={() => navigate(`/customers/${c.id}`)}
                        style={{ background: 'transparent', color: '#38bdf8', fontWeight: 700, textAlign: 'left' }}
                      >
                        {c.customer_name}
                      </button>
                    </td>
                    <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{c.customer_code}</td>
                    <td style={{ color: '#cbd5e1', fontSize: '0.8rem' }}>{c.city}, {c.state}</td>
                    <td style={{ color: '#f8fafc', fontWeight: 500 }}>{c.mobile}</td>
                    <td style={{ color: '#a78bfa', fontWeight: 600 }}>{c.salesman_code}</td>
                    <td style={{ color: '#cbd5e1' }}>₹{c.credit_limit?.toLocaleString('en-IN')}</td>
                    <td style={{ color: '#cbd5e1' }}>{c.credit_days} Days</td>
                    <td>
                      <span style={{ backgroundColor: '#334155', color: '#f8fafc', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>
                        {c.invoice_count} Inv
                      </span>
                    </td>
                    <td style={{ fontWeight: 800, color: c.total_outstanding > 0 ? '#f8fafc' : '#34d399' }}>
                      ₹{c.total_outstanding.toLocaleString('en-IN')}
                    </td>
                    <td style={{ fontWeight: 700, color: c.overdue_amount > 0 ? '#f43f5e' : '#94a3b8' }}>
                      ₹{c.overdue_amount.toLocaleString('en-IN')}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <button
                          onClick={() => navigate(`/customers/${c.id}`)}
                          title="View Customer Dashboard"
                          style={{ backgroundColor: '#334155', color: '#38bdf8', padding: '0.375rem 0.5rem', borderRadius: '4px' }}
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => setActiveFollowupCustomer(c)}
                          title="Add Follow-up"
                          style={{ backgroundColor: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', padding: '0.375rem 0.5rem', borderRadius: '4px' }}
                        >
                          <PlusCircle size={16} />
                        </button>
                        <button
                          onClick={() => setActivePaymentCustomer(c)}
                          title="Record Collection"
                          style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#34d399', padding: '0.375rem 0.5rem', borderRadius: '4px' }}
                        >
                          <CreditCard size={16} />
                        </button>
                        <button
                          onClick={() => setActiveWhatsappCustomer(c)}
                          title="Send WhatsApp"
                          style={{ backgroundColor: 'rgba(37, 211, 102, 0.2)', color: '#25D366', padding: '0.375rem 0.5rem', borderRadius: '4px' }}
                        >
                          <MessageSquare size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination pagination={pagination} onPageChange={(p) => setPage(p)} />
      </div>

      {activeFollowupCustomer && (
        <FollowupModal
          customer={activeFollowupCustomer}
          onClose={() => setActiveFollowupCustomer(null)}
          onSuccess={() => fetchCustomers()}
        />
      )}

      {activePaymentCustomer && (
        <PaymentModal
          customer={activePaymentCustomer}
          onClose={() => setActivePaymentCustomer(null)}
          onSuccess={() => fetchCustomers()}
        />
      )}

      {activeWhatsappCustomer && (
        <WhatsappModal
          customer={activeWhatsappCustomer}
          onClose={() => setActiveWhatsappCustomer(null)}
        />
      )}
    </div>
  );
}
