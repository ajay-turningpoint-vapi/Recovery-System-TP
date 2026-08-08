import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import FollowupModal from '../components/FollowupModal';
import PaymentModal from '../components/PaymentModal';
import WhatsappModal from '../components/WhatsappModal';
import {
  ArrowLeft, Phone, Mail, MapPin, Calendar, Clock, DollarSign,
  AlertCircle, CheckCircle2, FileText, PlusCircle, CreditCard, MessageSquare, ChevronRight, ChevronDown
} from 'lucide-react';

export default function CustomerDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('INVOICES');

  // Modals
  const [showFollowupModal, setShowFollowupModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showWhatsappModal, setShowWhatsappModal] = useState(false);

  // ERP Live Pending Bills state
  const [pendingBills, setPendingBills] = useState([]);
  const [billItems, setBillItems] = useState([]);
  const [loadingPendingBills, setLoadingPendingBills] = useState(false);
  const [selectedBillModal, setSelectedBillModal] = useState(null);

  // Fetch customer details from MariaDB + live ERP pending bills in parallel
  const fetchCustomerData = async () => {
    setLoading(true);
    setLoadingPendingBills(true);
    try {
      const [custRes, billsRes, itemsRes] = await Promise.allSettled([
        api.get(`/customers/${id}`),
        api.get(`/customers/${id}/pending-bills`),
        api.get(`/customers/${id}/items`)
      ]);

      if (custRes.status === 'fulfilled' && custRes.value.data.success) {
        const custData = custRes.value.data.customer;
        const summaryData = custRes.value.data.summary;
        setCustomer({ ...custData, summary: summaryData });
      }

      if (billsRes.status === 'fulfilled' && billsRes.value.data.success) {
        setPendingBills(billsRes.value.data.pending_bills || []);
      }

      if (itemsRes.status === 'fulfilled' && itemsRes.value.data.success) {
        setBillItems(itemsRes.value.data.items || []);
      }
    } catch (err) {
      console.error('Error fetching customer data:', err);
    } finally {
      setLoading(false);
      setLoadingPendingBills(false);
    }
  };

  useEffect(() => {
    fetchCustomerData();
  }, [id]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: '#0284c7', fontWeight: 700 }}>
        ⏳ Loading customer dashboard...
      </div>
    );
  }

  if (!customer) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: '#be123c' }}>
        Customer record not found.
      </div>
    );
  }

  // ── Financial Metric Calculations Categorized by ERP Voucher Type ──
  
  // 1. Opening Balance: sum of VchType = 1 pending bills (previous FY) or OB- invoice
  const obInvoice = customer?.invoices?.find(inv => inv.invoice_number?.startsWith('OB-'));
  const erpOpeningBal = pendingBills
    .filter(b => Number(b.VchType || b.VCHTYPE || 0) === 1 || String(b.BILL_NO || '').startsWith('TVC/'))
    .reduce((sum, b) => sum + Number(b.PENDING_AMOUNT || 0), 0);
  
  const openingBalance = erpOpeningBal > 0 ? erpOpeningBal : (obInvoice ? obInvoice.outstanding_amount : (customer?.opening_balance || 0));

  // 2. Current FY Pending Bills: sum of VchType = 9 pending bills (current FY)
  const currentFyBills = pendingBills.filter(b => Number(b.VchType || b.VCHTYPE || 9) === 9 && !String(b.BILL_NO || '').startsWith('TVC/'));
  const erpCurrentBillsTotal = currentFyBills.reduce((sum, b) => sum + Number(b.PENDING_AMOUNT || 0), 0);

  // Fallbacks if pendingBills is empty
  const localNonObInvoicesTotal = (customer?.invoices || [])
    .filter(inv => !inv.invoice_number?.startsWith('OB-'))
    .reduce((sum, inv) => sum + Number(inv.outstanding_amount || 0), 0);

  const displayPendingBillsTotal = pendingBills.length > 0 ? erpCurrentBillsTotal : localNonObInvoicesTotal;
  const displayPendingBillsCount = pendingBills.length > 0 ? currentFyBills.length : (customer?.invoices || []).filter(i => !i.invoice_number?.startsWith('OB-')).length;

  // 3. Total Outstanding = Opening Balance + Current Pending Bills
  const totalOutstandingAmount = openingBalance + displayPendingBillsTotal;

  // 4. Total Overdue
  const erpOverdueTotal = pendingBills
    .filter(b => Number(b.DUE_DAYS || 0) > 0)
    .reduce((sum, b) => sum + Number(b.PENDING_AMOUNT || 0), 0);
  
  const totalOverdueAmount = erpOverdueTotal > 0
    ? erpOverdueTotal
    : (customer?.summary?.totalOverdue || 0);

  // 5. Max Overdue Days
  const erpMaxDays = pendingBills.reduce((max, b) => Math.max(max, Number(b.DUE_DAYS || 0)), 0);
  const maxOverdueDays = erpMaxDays > 0 ? erpMaxDays : (customer?.summary?.maxDaysOverdue || 0);

  return (
    <div style={{ padding: '1.5rem', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* Header Bar */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          onClick={() => navigate('/customers')}
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '0.5rem 1rem',
            fontSize: '0.875rem',
            fontWeight: 700,
            color: '#475569',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}
        >
          <ArrowLeft size={16} /> Back to Customer List
        </button>
      </div>

      {/* Customer Header Card */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
                {customer.customer_name}
              </h2>
              <StatusBadge status={customer.status} />
            </div>
            <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem' }}>
              Code: <strong style={{ color: '#0284c7' }}>{customer.customer_code}</strong> | GSTIN: <strong style={{ color: '#0f172a' }}>{customer.gstin || 'N/A'}</strong>
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            <button
              onClick={() => setShowFollowupModal(true)}
              style={{
                backgroundColor: '#4f46e5',
                color: '#ffffff',
                padding: '0.625rem 1.15rem',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 2px 6px rgba(79, 70, 229, 0.25)'
              }}
            >
              <PlusCircle size={18} /> Add Follow-Up
            </button>

            <button
              onClick={() => setShowPaymentModal(true)}
              style={{
                backgroundColor: '#059669',
                color: '#ffffff',
                padding: '0.625rem 1.15rem',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)'
              }}
            >
              <CreditCard size={18} /> Collection Entry
            </button>

            <button
              onClick={() => setShowWhatsappModal(true)}
              style={{
                backgroundColor: '#16a34a',
                color: '#ffffff',
                padding: '0.625rem 1.15rem',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 2px 6px rgba(22, 163, 74, 0.25)'
              }}
            >
              <MessageSquare size={18} /> Send WhatsApp
            </button>
          </div>
        </div>

        {/* Customer Profile Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1.25rem',
          fontSize: '0.875rem'
        }}>
          <div>
            <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block', fontWeight: 600 }}>Address & Location</span>
            <div style={{ color: '#0f172a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.2rem' }}>
              <MapPin size={16} color="#0284c7" />
              {customer.address}, {customer.city}, {customer.state}
            </div>
          </div>

          <div>
            <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block', fontWeight: 600 }}>Contact Person & Phone</span>
            <div style={{ color: '#0f172a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.2rem' }}>
              <Phone size={16} color="#059669" />
              {customer.contact_person || 'N/A'} ({customer.mobile})
            </div>
          </div>

          <div>
            <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block', fontWeight: 600 }}>Assigned Salesman</span>
            <div style={{ color: '#6d28d9', fontWeight: 700, marginTop: '0.2rem' }}>
              {pendingBills[0]?.SALESMAN || customer.salesman_code || 'UNASSIGNED'}
            </div>
          </div>

          <div>
            <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block', fontWeight: 600 }}>Credit Terms</span>
            <div style={{ color: '#0f172a', fontWeight: 700, marginTop: '0.2rem' }}>
              Limit: ₹{customer.credit_limit?.toLocaleString('en-IN')} | Credit Days: {pendingBills[0]?.CR_DAYS || customer.credit_days || 0} Days
            </div>
          </div>
        </div>
      </div>

      {/* Operator KPI Summary Bar — Crystal Clear Single-Glance View */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        {/* Card 1: Total Outstanding */}
        <div style={{
          backgroundColor: '#ffffff',
          border: '2px solid #6366f1',
          borderRadius: '12px',
          padding: '1.25rem',
          boxShadow: '0 4px 12px rgba(99, 102, 241, 0.08)'
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4338ca', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Outstanding
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#4338ca', marginTop: '0.3rem' }}>
            ₹{totalOutstandingAmount.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
            Combined balance to collect
          </div>
        </div>

        {/* Card 2: Opening Balance */}
        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid #fed7aa',
          borderRadius: '12px',
          padding: '1.25rem',
          boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#c2410c', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Opening Balance
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#ea580c', marginTop: '0.3rem' }}>
            ₹{openingBalance.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#9a3412', marginTop: '0.25rem' }}>
            Carried forward from previous years
          </div>
        </div>

        {/* Card 3: Pending Bills Total */}
        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid #bae6fd',
          borderRadius: '12px',
          padding: '1.25rem',
          boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Pending Bills ({displayPendingBillsCount})
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0284c7', marginTop: '0.3rem' }}>
            ₹{displayPendingBillsTotal.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#0369a1', marginTop: '0.25rem' }}>
            Current bill-wise outstanding
          </div>
        </div>

        {/* Card 4: Total Overdue */}
        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid #fecaca',
          borderRadius: '12px',
          padding: '1.25rem',
          boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#be123c', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Overdue
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#dc2626', marginTop: '0.3rem' }}>
            ₹{totalOverdueAmount.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#9f1239', marginTop: '0.25rem' }}>
            Max Overdue: <strong>{maxOverdueDays} Days</strong>
          </div>
        </div>
      </div>

      {/* Main Tabs Container */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        {/* Navigation Tabs (ONLY 3 CLEAN TABS) */}
        <div style={{
          display: 'flex',
          gap: '2rem',
          borderBottom: '1px solid #e2e8f0',
          marginBottom: '1.5rem'
        }}>
          <button
            onClick={() => setActiveTab('INVOICES')}
            style={{
              background: 'transparent',
              fontSize: '0.95rem',
              fontWeight: 800,
              color: activeTab === 'INVOICES' ? '#4f46e5' : '#64748b',
              borderBottom: activeTab === 'INVOICES' ? '3px solid #4f46e5' : '3px solid transparent',
              paddingBottom: '0.75rem'
            }}
          >
            📋 Pending Bills & Invoices ({displayPendingBillsCount})
          </button>

          <button
            onClick={() => setActiveTab('FOLLOWUPS')}
            style={{
              background: 'transparent',
              fontSize: '0.95rem',
              fontWeight: 800,
              color: activeTab === 'FOLLOWUPS' ? '#4f46e5' : '#64748b',
              borderBottom: activeTab === 'FOLLOWUPS' ? '3px solid #4f46e5' : '3px solid transparent',
              paddingBottom: '0.75rem'
            }}
          >
            📞 Follow-Up History ({customer.followups?.length || 0})
          </button>

          <button
            onClick={() => setActiveTab('PAYMENTS')}
            style={{
              background: 'transparent',
              fontSize: '0.95rem',
              fontWeight: 800,
              color: activeTab === 'PAYMENTS' ? '#4f46e5' : '#64748b',
              borderBottom: activeTab === 'PAYMENTS' ? '3px solid #4f46e5' : '3px solid transparent',
              paddingBottom: '0.75rem'
            }}
          >
            💳 Collection History ({customer.payments?.length || 0})
          </button>
        </div>

        {/* Tab 1: Pending Bills & Invoices */}
        {activeTab === 'INVOICES' && (
          <div>
            {/* Dedicated Opening Balance Alert Card (if opening balance exists) */}
            {openingBalance > 0 && (
              <div style={{
                backgroundColor: '#fff7ed',
                border: '1px solid #ffedd5',
                borderRadius: '8px',
                padding: '1rem 1.25rem',
                marginBottom: '1.25rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontWeight: 800, color: '#c2410c', fontSize: '0.95rem' }}>
                    📌 Previous Years' Opening Balance
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#9a3412', marginTop: '0.15rem' }}>
                    Carried forward balance prior to current financial year
                  </div>
                </div>
                <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#ea580c' }}>
                  ₹{openingBalance.toLocaleString('en-IN')}
                </div>
              </div>
            )}

            {/* Pending Bills Table */}
            {loadingPendingBills ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#0284c7', fontWeight: 700 }}>
                ⏳ Loading pending bills...
              </div>
            ) : displayPendingBillsCount === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                No pending bills or invoices found for this customer.
              </div>
            ) : pendingBills.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table className="custom-table">
                  <thead>
                    <tr style={{ backgroundColor: '#f1f5f9' }}>
                      <th style={{ padding: '0.75rem 1rem' }}>Bill Date</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Bill Number</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Original Amount</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Pending Amount</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Due Date</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Days Overdue</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Credit Status</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingBills.map((bill, idx) => {
                      const billNo = (bill.BILL_NO || '').trim();
                      const isExceeded = bill.MESSAGE === 'EXCEEDED CREDIT DAYS';

                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ color: '#64748b' }}>
                            {bill.BILL_DATE ? new Date(bill.BILL_DATE).toLocaleDateString('en-IN') : 'N/A'}
                          </td>
                          <td style={{ fontWeight: 800, color: '#0284c7', fontSize: '0.95rem' }}>
                            {billNo}
                          </td>
                          <td style={{ fontWeight: 600, color: '#4f46e5' }}>
                            ₹{Number(bill.REF_AMOUNT || 0).toLocaleString('en-IN')}
                          </td>
                          <td style={{ fontWeight: 900, color: '#dc2626', fontSize: '1rem' }}>
                            ₹{Number(bill.PENDING_AMOUNT || 0).toLocaleString('en-IN')}
                          </td>
                          <td style={{ color: '#64748b' }}>
                            {bill.DUE_DATE ? new Date(bill.DUE_DATE).toLocaleDateString('en-IN') : 'N/A'}
                          </td>
                          <td style={{ fontWeight: 800, color: bill.DUE_DAYS > 0 ? '#dc2626' : '#059669' }}>
                            {bill.DUE_DAYS > 0 ? `${bill.DUE_DAYS} Days Overdue` : 'Within Due'}
                          </td>
                          <td>
                            <span style={{
                              backgroundColor: isExceeded ? '#ffe4e6' : '#dcfce7',
                              color: isExceeded ? '#be123c' : '#15803d',
                              padding: '0.25rem 0.6rem',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 800
                            }}>
                              {isExceeded ? '⚠ EXCEEDED CREDIT DAYS' : '✓ WITHIN CREDIT DAYS'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              onClick={() => setSelectedBillModal(billNo)}
                              style={{
                                backgroundColor: '#f0f9ff',
                                color: '#0284c7',
                                border: '1px solid #bae6fd',
                                padding: '0.4rem 0.75rem',
                                borderRadius: '6px',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              View Item Details
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Fallback to MariaDB Invoices (excluding OB- rows) */
              <div style={{ overflowX: 'auto' }}>
                <table className="custom-table">
                  <thead>
                    <tr style={{ backgroundColor: '#f1f5f9' }}>
                      <th style={{ padding: '0.75rem 1rem' }}>Invoice Date</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Invoice No</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Original Amount</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Paid Amount</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Outstanding</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Due Date</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Overdue Status</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(customer?.invoices || [])
                      .filter(inv => !inv.invoice_number?.startsWith('OB-'))
                      .map((inv) => (
                        <tr key={inv.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ color: '#64748b' }}>
                            {new Date(inv.invoice_date).toLocaleDateString('en-IN')}
                          </td>
                          <td style={{ fontWeight: 800, color: '#0284c7', fontSize: '0.95rem' }}>
                            {inv.invoice_number}
                          </td>
                          <td style={{ fontWeight: 600, color: '#4f46e5' }}>
                            ₹{inv.invoice_amount?.toLocaleString('en-IN')}
                          </td>
                          <td style={{ color: '#059669', fontWeight: 600 }}>
                            ₹{inv.paid_amount?.toLocaleString('en-IN')}
                          </td>
                          <td style={{ fontWeight: 900, color: inv.outstanding_amount > 0 ? '#dc2626' : '#059669', fontSize: '1rem' }}>
                            ₹{inv.outstanding_amount?.toLocaleString('en-IN')}
                          </td>
                          <td style={{ color: '#64748b' }}>
                            {new Date(inv.due_date).toLocaleDateString('en-IN')}
                          </td>
                          <td>
                            <StatusBadge status={inv.status} />
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              onClick={() => setSelectedBillModal(inv.invoice_number)}
                              style={{
                                backgroundColor: '#f0f9ff',
                                color: '#0284c7',
                                border: '1px solid #bae6fd',
                                padding: '0.4rem 0.75rem',
                                borderRadius: '6px',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
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
                  <th>Status</th>
                  <th>Expected Payment Date</th>
                  <th>Promised Amount</th>
                  <th>Next Follow-up</th>
                  <th>Created By</th>
                  <th>Remark</th>
                </tr>
              </thead>
              <tbody>
                {!customer.followups || customer.followups.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                      No follow-up history logged for this customer yet.
                    </td>
                  </tr>
                ) : (
                  customer.followups.map((f) => (
                    <tr key={f.id}>
                      <td style={{ fontWeight: 600, color: '#0f172a' }}>
                        {new Date(f.followup_date).toLocaleDateString('en-IN')}
                      </td>
                      <td style={{ fontWeight: 700, color: '#4f46e5' }}>{f.followup_type}</td>
                      <td>
                        <StatusBadge status={f.status} />
                      </td>
                      <td style={{ color: '#059669', fontWeight: 600 }}>
                        {f.expected_payment_date ? new Date(f.expected_payment_date).toLocaleDateString('en-IN') : 'N/A'}
                      </td>
                      <td style={{ fontWeight: 800, color: '#0f172a' }}>
                        {f.expected_payment_amount ? `₹${f.expected_payment_amount.toLocaleString('en-IN')}` : 'N/A'}
                      </td>
                      <td style={{ color: '#d97706', fontWeight: 700 }}>
                        {f.next_followup_date ? new Date(f.next_followup_date).toLocaleDateString('en-IN') : 'N/A'}
                      </td>
                      <td style={{ color: '#64748b' }}>{f.user?.name || 'Admin'}</td>
                      <td style={{ fontSize: '0.85rem', color: '#475569', maxWidth: '240px' }}>{f.remark || 'N/A'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Collection History */}
        {activeTab === 'PAYMENTS' && (
          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Payment Date</th>
                  <th>Amount</th>
                  <th>Mode</th>
                  <th>Reference / Cheque No</th>
                  <th>Bank Name</th>
                  <th>Recorded By</th>
                  <th>Remark</th>
                </tr>
              </thead>
              <tbody>
                {!customer.payments || customer.payments.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                      No payment collection entries recorded yet.
                    </td>
                  </tr>
                ) : (
                  customer.payments.map((p) => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600, color: '#0f172a' }}>
                        {new Date(p.payment_date).toLocaleDateString('en-IN')}
                      </td>
                      <td style={{ fontWeight: 900, color: '#059669', fontSize: '1rem' }}>
                        ₹{p.amount?.toLocaleString('en-IN')}
                      </td>
                      <td style={{ fontWeight: 700, color: '#0284c7' }}>{p.payment_mode}</td>
                      <td style={{ color: '#475569', fontWeight: 600 }}>{p.reference_number || 'N/A'}</td>
                      <td style={{ color: '#64748b' }}>{p.bank || 'N/A'}</td>
                      <td style={{ color: '#64748b' }}>{p.user?.name || 'Admin'}</td>
                      <td style={{ fontSize: '0.85rem', color: '#475569', maxWidth: '240px' }}>{p.remark || 'N/A'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {showFollowupModal && (
        <FollowupModal
          customer={customer}
          onClose={() => setShowFollowupModal(false)}
          onSuccess={fetchCustomerData}
        />
      )}

      {showPaymentModal && (
        <PaymentModal
          customer={customer}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={fetchCustomerData}
        />
      )}

      {showWhatsappModal && (
        <WhatsappModal
          customer={customer}
          onClose={() => setShowWhatsappModal(false)}
        />
      )}

      {/* Clean Line Item Breakdown Modal for Selected Bill */}
      {selectedBillModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '1rem'
        }}>
          <div
            ref={(el) => { if (el) el.scrollTop = 0; }}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              width: '95%', maxWidth: '1000px',
              maxHeight: '90vh', overflowY: 'auto',
              padding: '1.75rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                  Bill Item Breakdown: <span style={{ color: '#0284c7' }}>{selectedBillModal}</span>
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Customer: <strong>{customer.customer_name}</strong> ({customer.customer_code})
                </p>
              </div>
              <button
                onClick={() => setSelectedBillModal(null)}
                style={{
                  backgroundColor: '#f1f5f9', color: '#64748b', border: 'none',
                  borderRadius: '6px', padding: '0.375rem 0.75rem', fontWeight: 700, cursor: 'pointer'
                }}
              >
                ✕ Close
              </button>
            </div>

            {(() => {
              const matchedItems = billItems.filter(i => (i.BILL_NO || '').trim() === selectedBillModal);

              if (matchedItems.length === 0) {
                return (
                  <div style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8', fontSize: '0.9rem' }}>
                    No item breakdown records found for bill <strong>{selectedBillModal}</strong>.
                  </div>
                );
              }

              return (
                <div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#e0f2fe', textAlign: 'left' }}>
                        <th style={{ padding: '0.5rem 0.75rem', color: '#0369a1', fontWeight: 800 }}>Item Name</th>
                        <th style={{ padding: '0.5rem 0.75rem', color: '#0369a1', fontWeight: 800 }}>Alias / Code</th>
                        <th style={{ padding: '0.5rem 0.75rem', color: '#0369a1', fontWeight: 800 }}>Unit</th>
                        <th style={{ padding: '0.5rem 0.75rem', color: '#0369a1', fontWeight: 800, textAlign: 'right' }}>Qty</th>
                        <th style={{ padding: '0.5rem 0.75rem', color: '#0369a1', fontWeight: 800, textAlign: 'right' }}>Rate</th>
                        <th style={{ padding: '0.5rem 0.75rem', color: '#0369a1', fontWeight: 800, textAlign: 'right' }}>Discount</th>
                        <th style={{ padding: '0.5rem 0.75rem', color: '#0369a1', fontWeight: 800, textAlign: 'right' }}>Amount</th>
                        <th style={{ padding: '0.5rem 0.75rem', color: '#0369a1', fontWeight: 800, textAlign: 'right' }}>MRP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matchedItems.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                          <td style={{ padding: '0.5rem 0.75rem', fontWeight: 700, color: '#0f172a' }}>{item.ITEM_NAME}</td>
                          <td style={{ padding: '0.5rem 0.75rem', color: '#64748b' }}>{item.ALIAS || '—'}</td>
                          <td style={{ padding: '0.5rem 0.75rem', color: '#475569' }}>{item.UNIT || 'PCS'}</td>
                          <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', fontWeight: 700 }}>{item.QTY}</td>
                          <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: '#4f46e5' }}>₹{Number(item.RATE || 0).toLocaleString('en-IN')}</td>
                          <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: '#d97706' }}>₹{Number(item.DISCOUNT || 0).toLocaleString('en-IN')}</td>
                          <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', fontWeight: 800, color: '#059669' }}>₹{Number(item.AMOUNT || 0).toLocaleString('en-IN')}</td>
                          <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: '#94a3b8' }}>₹{Number(item.MRP || 0).toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                      <tr style={{ backgroundColor: '#dcfce7', fontWeight: 800 }}>
                        <td colSpan={6} style={{ padding: '0.6rem 0.75rem', textAlign: 'right', color: '#15803d', fontSize: '0.9rem' }}>Bill Total:</td>
                        <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', color: '#15803d', fontSize: '1rem' }}>
                          ₹{matchedItems.reduce((sum, i) => sum + Number(i.AMOUNT || 0), 0).toLocaleString('en-IN')}
                        </td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
