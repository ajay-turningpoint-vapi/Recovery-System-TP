import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SummaryCard from '../components/SummaryCard';
import StatusBadge from '../components/StatusBadge';
import FollowupModal from '../components/FollowupModal';
import PaymentModal from '../components/PaymentModal';
import WhatsappModal from '../components/WhatsappModal';

import {
  User,
  MapPin,
  Building,
  Phone,
  Mail,
  Shield,
  Clock,
  FileText,
  DollarSign,
  PlusCircle,
  CreditCard,
  MessageSquare,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import api from '../services/api';

export default function CustomerDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('INVOICES'); // INVOICES, FOLLOWUPS, PAYMENTS

  // Invoice Detail modal state
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Action Modals
  const [showFollowupModal, setShowFollowupModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showWhatsappModal, setShowWhatsappModal] = useState(false);

  const fetchCustomerDetails = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/customers/${id}`);
      if (res.data.success) {
        setCustomer(res.data.customer);
        setSummary(res.data.summary);
      }
    } catch (err) {
      console.error('Error loading customer:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerDetails();
  }, [id]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
        Loading customer dashboard details...
      </div>
    );
  }

  if (!customer) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: '#f43f5e' }}>
        Customer record not found.
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Top Navigation */}
      <button
        onClick={() => navigate('/customers')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          backgroundColor: '#1e293b',
          color: '#38bdf8',
          border: '1px solid #334155',
          padding: '0.5rem 0.875rem',
          borderRadius: '6px',
          fontSize: '0.85rem',
          fontWeight: 600,
          marginBottom: '1.25rem'
        }}
      >
        <ArrowLeft size={16} /> Back to Customer List
      </button>

      {/* 1. Customer Information Master Card */}
      <div style={{
        backgroundColor: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '12px',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)'
      }}>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '1rem',
          marginBottom: '1.25rem',
          borderBottom: '1px solid #334155',
          paddingBottom: '1rem'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc' }}>
                {customer.customer_name}
              </h2>
              <StatusBadge status={customer.status} />
            </div>
            <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginTop: '0.25rem' }}>
              Code: <strong style={{ color: '#38bdf8' }}>{customer.customer_code}</strong> | GSTIN: <strong style={{ color: '#f8fafc' }}>{customer.gstin || 'N/A'}</strong>
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            <button
              onClick={() => setShowFollowupModal(true)}
              style={{
                backgroundColor: '#6366f1',
                color: '#ffffff',
                padding: '0.625rem 1.15rem',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <PlusCircle size={18} /> Add Follow-Up
            </button>

            <button
              onClick={() => setShowPaymentModal(true)}
              style={{
                backgroundColor: '#10b981',
                color: '#ffffff',
                padding: '0.625rem 1.15rem',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <CreditCard size={18} /> Collection Entry
            </button>

            <button
              onClick={() => setShowWhatsappModal(true)}
              style={{
                backgroundColor: '#25D366',
                color: '#000000',
                padding: '0.625rem 1.15rem',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <MessageSquare size={18} /> Send WhatsApp
            </button>
          </div>
        </div>

        {/* Info Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem',
          fontSize: '0.875rem'
        }}>
          <div>
            <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>Address & Location</span>
            <div style={{ color: '#cbd5e1', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.2rem' }}>
              <MapPin size={16} color="#38bdf8" />
              {customer.address}, {customer.city}, {customer.state}
            </div>
          </div>

          <div>
            <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>Contact Person & Phone</span>
            <div style={{ color: '#cbd5e1', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.2rem' }}>
              <Phone size={16} color="#10b981" />
              {customer.contact_person || 'N/A'} ({customer.mobile})
            </div>
          </div>

          <div>
            <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>Email Address</span>
            <div style={{ color: '#cbd5e1', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.2rem' }}>
              <Mail size={16} color="#8b5cf6" />
              {customer.email || 'N/A'}
            </div>
          </div>

          <div>
            <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>Assigned Salesman</span>
            <div style={{ color: '#38bdf8', fontWeight: 700, marginTop: '0.2rem' }}>
              {customer.salesman_code || 'N/A'}
            </div>
          </div>

          <div>
            <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>Credit Terms</span>
            <div style={{ color: '#f8fafc', fontWeight: 700, marginTop: '0.2rem' }}>
              Limit: ₹{customer.credit_limit?.toLocaleString('en-IN')} | Credit Days: {customer.credit_days} Days
            </div>
          </div>
        </div>
      </div>

      {/* 2. Customer Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <SummaryCard
          title="Total Invoices"
          value={summary?.totalInvoices || 0}
          icon={FileText}
          color="#38bdf8"
        />
        <SummaryCard
          title="Total Billed"
          value={`₹${(summary?.totalInvoiceAmount || 0).toLocaleString('en-IN')}`}
          icon={DollarSign}
          color="#6366f1"
        />
        <SummaryCard
          title="Total Paid"
          value={`₹${(summary?.totalPaid || 0).toLocaleString('en-IN')}`}
          icon={CheckCircle2}
          color="#10b981"
        />
        <SummaryCard
          title="Total Outstanding"
          value={`₹${(summary?.totalOutstanding || 0).toLocaleString('en-IN')}`}
          icon={DollarSign}
          color="#8b5cf6"
        />
        <SummaryCard
          title="Total Overdue"
          value={`₹${(summary?.totalOverdue || 0).toLocaleString('en-IN')}`}
          icon={AlertCircle}
          color="#f43f5e"
        />
        <SummaryCard
          title="Max Days Overdue"
          value={`${summary?.maxDaysOverdue || 0} Days`}
          icon={Clock}
          color="#f59e0b"
        />
      </div>

      {/* 3. Customer Tabs (Invoices, Followups, Payments) */}
      <div style={{
        backgroundColor: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '12px',
        padding: '1.25rem'
      }}>
        <div style={{
          display: 'flex',
          gap: '1rem',
          borderBottom: '1px solid #334155',
          paddingBottom: '0.75rem',
          marginBottom: '1.25rem'
        }}>
          <button
            onClick={() => setActiveTab('INVOICES')}
            style={{
              background: 'transparent',
              fontSize: '0.95rem',
              fontWeight: 700,
              color: activeTab === 'INVOICES' ? '#6366f1' : '#94a3b8',
              borderBottom: activeTab === 'INVOICES' ? '2px solid #6366f1' : '2px solid transparent',
              paddingBottom: '0.5rem'
            }}
          >
            Invoice-wise Outstanding ({customer.invoices?.length || 0})
          </button>

          <button
            onClick={() => setActiveTab('FOLLOWUPS')}
            style={{
              background: 'transparent',
              fontSize: '0.95rem',
              fontWeight: 700,
              color: activeTab === 'FOLLOWUPS' ? '#6366f1' : '#94a3b8',
              borderBottom: activeTab === 'FOLLOWUPS' ? '2px solid #6366f1' : '2px solid transparent',
              paddingBottom: '0.5rem'
            }}
          >
            Follow-Up History ({customer.followups?.length || 0})
          </button>

          <button
            onClick={() => setActiveTab('PAYMENTS')}
            style={{
              background: 'transparent',
              fontSize: '0.95rem',
              fontWeight: 700,
              color: activeTab === 'PAYMENTS' ? '#6366f1' : '#94a3b8',
              borderBottom: activeTab === 'PAYMENTS' ? '2px solid #6366f1' : '2px solid transparent',
              paddingBottom: '0.5rem'
            }}
          >
            Collection History ({customer.payments?.length || 0})
          </button>
        </div>

        {/* Tab 1: Invoice-wise Outstanding */}
        {activeTab === 'INVOICES' && (
          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Invoice Date</th>
                  <th>Invoice No</th>
                  <th>Invoice Amount</th>
                  <th>Paid Amount</th>
                  <th>Outstanding</th>
                  <th>Due Date</th>
                  <th>Days Overdue</th>
                  <th>Status</th>
                  <th>Next Follow-up</th>
                  <th>Last Remark</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {customer.invoices?.length === 0 ? (
                  <tr>
                    <td colSpan="11" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                      No invoice records found for this customer.
                    </td>
                  </tr>
                ) : (
                  customer.invoices.map((inv) => (
                    <tr key={inv.id}>
                      <td style={{ color: '#94a3b8' }}>
                        {new Date(inv.invoice_date).toLocaleDateString('en-IN')}
                      </td>
                      <td style={{ fontWeight: 700, color: '#38bdf8' }}>
                        {inv.invoice_number}
                      </td>
                      <td>₹{inv.invoice_amount.toLocaleString('en-IN')}</td>
                      <td style={{ color: '#10b981' }}>₹{inv.paid_amount.toLocaleString('en-IN')}</td>
                      <td style={{ fontWeight: 800, color: inv.outstanding_amount > 0 ? '#f8fafc' : '#34d399' }}>
                        ₹{inv.outstanding_amount.toLocaleString('en-IN')}
                      </td>
                      <td style={{ color: '#94a3b8' }}>
                        {new Date(inv.due_date).toLocaleDateString('en-IN')}
                      </td>
                      <td style={{ fontWeight: 700, color: inv.days_overdue > 0 ? '#f43f5e' : '#34d399' }}>
                        {inv.overdue_status}
                      </td>
                      <td>
                        <StatusBadge status={inv.status} />
                      </td>
                      <td style={{ color: '#fbbf24', fontSize: '0.8rem', fontWeight: 600 }}>
                        {inv.next_followup_date ? new Date(inv.next_followup_date).toLocaleDateString('en-IN') : 'None'}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: '#94a3b8', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {inv.last_remark}
                      </td>
                      <td>
                        <button
                          onClick={() => setSelectedInvoice(inv)}
                          style={{
                            backgroundColor: '#334155',
                            color: '#38bdf8',
                            padding: '0.375rem 0.625rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 600
                          }}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Follow-up History */}
        {activeTab === 'FOLLOWUPS' && (
          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Follow-up Date</th>
                  <th>Type</th>
                  <th>Salesman / User</th>
                  <th>Remark / Discussion</th>
                  <th>Expected Payment</th>
                  <th>Promise Date</th>
                  <th>Next Follow-up</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {customer.followups?.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                      No follow-up history logged yet.
                    </td>
                  </tr>
                ) : (
                  customer.followups.map((f) => (
                    <tr key={f.id}>
                      <td style={{ color: '#94a3b8' }}>
                        {new Date(f.followup_date).toLocaleDateString('en-IN')} {f.followup_time || ''}
                      </td>
                      <td style={{ fontWeight: 600, color: '#38bdf8' }}>{f.followup_type}</td>
                      <td style={{ color: '#f8fafc' }}>{f.user?.name || f.salesman_code}</td>
                      <td style={{ color: '#cbd5e1', maxWidth: '300px', whiteSpace: 'pre-wrap' }}>{f.remark}</td>
                      <td style={{ color: '#34d399', fontWeight: 600 }}>
                        {f.expected_payment_amount ? `₹${f.expected_payment_amount.toLocaleString('en-IN')}` : 'N/A'}
                      </td>
                      <td style={{ color: '#fbbf24' }}>
                        {f.promise_to_pay_date ? new Date(f.promise_to_pay_date).toLocaleDateString('en-IN') : 'N/A'}
                      </td>
                      <td style={{ color: '#a78bfa' }}>
                        {f.next_followup_date ? new Date(f.next_followup_date).toLocaleDateString('en-IN') : 'None'}
                      </td>
                      <td>
                        <StatusBadge status={f.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Payments / Collection History */}
        {activeTab === 'PAYMENTS' && (
          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Payment Date</th>
                  <th>Invoice No</th>
                  <th>Amount Paid</th>
                  <th>Payment Mode</th>
                  <th>Reference / UTR</th>
                  <th>Bank</th>
                  <th>Remark</th>
                  <th>Recorded By</th>
                </tr>
              </thead>
              <tbody>
                {customer.payments?.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                      No payment collections recorded yet.
                    </td>
                  </tr>
                ) : (
                  customer.payments.map((p) => (
                    <tr key={p.id}>
                      <td style={{ color: '#94a3b8' }}>
                        {new Date(p.payment_date).toLocaleDateString('en-IN')}
                      </td>
                      <td style={{ fontWeight: 600, color: '#38bdf8' }}>
                        {p.invoice?.invoice_number || 'Consolidated Allocation'}
                      </td>
                      <td style={{ fontWeight: 800, color: '#34d399' }}>
                        ₹{p.amount.toLocaleString('en-IN')}
                      </td>
                      <td style={{ fontWeight: 600, color: '#f8fafc' }}>{p.payment_mode}</td>
                      <td style={{ color: '#94a3b8' }}>{p.reference_number || 'N/A'}</td>
                      <td style={{ color: '#94a3b8' }}>{p.bank || 'N/A'}</td>
                      <td style={{ color: '#cbd5e1' }}>{p.remark || 'N/A'}</td>
                      <td style={{ color: '#94a3b8' }}>{p.user?.name || 'System'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoice Details Modal */}
      {selectedInvoice && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" style={{ padding: '1.5rem', maxWidth: '650px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #334155', pb: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc' }}>
                  Invoice Details: {selectedInvoice.invoice_number}
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  Date: {new Date(selectedInvoice.invoice_date).toLocaleDateString('en-IN')} | Due: {new Date(selectedInvoice.due_date).toLocaleDateString('en-IN')}
                </p>
              </div>
              <button onClick={() => setSelectedInvoice(null)} style={{ background: 'transparent', color: '#94a3b8' }}>
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.25rem', backgroundColor: '#0f172a', padding: '1rem', borderRadius: '8px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Total Invoice Amount</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>
                  ₹{selectedInvoice.invoice_amount?.toLocaleString('en-IN')}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Amount Paid</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#34d399' }}>
                  ₹{selectedInvoice.paid_amount?.toLocaleString('en-IN')}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Outstanding</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f43f5e' }}>
                  ₹{selectedInvoice.outstanding_amount?.toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.5rem' }}>
              Status: <StatusBadge status={selectedInvoice.status} /> ({selectedInvoice.overdue_status})
            </h4>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button
                onClick={() => setSelectedInvoice(null)}
                style={{ backgroundColor: '#6366f1', color: '#ffffff', padding: '0.5rem 1rem', borderRadius: '6px', fontWeight: 600 }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showFollowupModal && (
        <FollowupModal
          customer={customer}
          invoices={customer.invoices}
          onClose={() => setShowFollowupModal(false)}
          onSuccess={() => fetchCustomerDetails()}
        />
      )}

      {showPaymentModal && (
        <PaymentModal
          customer={customer}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={() => fetchCustomerDetails()}
        />
      )}

      {showWhatsappModal && (
        <WhatsappModal
          customer={customer}
          invoices={customer.invoices}
          onClose={() => setShowWhatsappModal(false)}
        />
      )}
    </div>
  );
}
