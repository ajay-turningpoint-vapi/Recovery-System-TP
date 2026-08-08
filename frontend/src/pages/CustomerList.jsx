import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import StatusBadge from '../components/StatusBadge';
import Pagination from '../components/Pagination';
import FollowupModal from '../components/FollowupModal';
import PaymentModal from '../components/PaymentModal';
import WhatsappModal from '../components/WhatsappModal';

import { Search, Eye, PlusCircle, CreditCard, MessageSquare, Filter, AlertCircle, RefreshCw, Layers, RotateCw, CheckCircle2, HelpCircle, MapPin, X } from 'lucide-react';
import api from '../services/api';

export default function CustomerList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlSalesmanCode = searchParams.get('salesman_code') || '';

  const [customers, setCustomers] = useState([]);
  const [salesmen, setSalesmen] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState(null);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [salesmanFilter, setSalesmanFilter] = useState(urlSalesmanCode);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [infiniteScroll, setInfiniteScroll] = useState(true);

  useEffect(() => {
    setSalesmanFilter(urlSalesmanCode);
  }, [urlSalesmanCode]);

  // Modals
  const [activeFollowupCustomer, setActiveFollowupCustomer] = useState(null);
  const [activePaymentCustomer, setActivePaymentCustomer] = useState(null);
  const [activeWhatsappCustomer, setActiveWhatsappCustomer] = useState(null);
  const [selectedAddressCustomer, setSelectedAddressCustomer] = useState(null);
  const [viewItemsCustomer, setViewItemsCustomer] = useState(null);
  const [erpItemsData, setErpItemsData] = useState({ loading: false, items: [] });

  const handleOpenErpItemsModal = async (cust) => {
    setViewItemsCustomer(cust);
    setErpItemsData({ loading: true, items: [] });
    try {
      const res = await api.get(`/customers/${cust.id}/items`);
      if (res.data.success) {
        setErpItemsData({ loading: false, items: res.data.items || [] });
      } else {
        setErpItemsData({ loading: false, items: [] });
      }
    } catch (err) {
      console.error('Error fetching ERP items:', err);
      setErpItemsData({ loading: false, items: [] });
    }
  };

  // Observer ref for infinite scroll sentinel
  const observerRef = useRef();

  // Debounce search input by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch registered salesmen dynamically
  const fetchSalesmen = async () => {
    try {
      const res = await api.get('/users/salesmen');
      if (res.data.success) {
        setSalesmen(res.data.data);
      }
    } catch (err) {
      console.error('Error loading salesmen list:', err);
    }
  };

  const fetchCustomers = async (isLoadMore = false) => {
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const currentPage = isLoadMore ? page : 1;
      const res = await api.get('/customers', {
        params: {
          search: debouncedSearch,
          salesman_code: salesmanFilter || undefined,
          page: currentPage,
          limit
        }
      });

      if (res.data.success) {
        if (isLoadMore && infiniteScroll) {
          setCustomers(prev => [...prev, ...res.data.data]);
        } else {
          setCustomers(res.data.data);
        }
        setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError(err.response?.data?.message || 'Failed to load customer list from server');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleSyncErp = async () => {
    setSyncing(true);
    setSyncMessage(null);
    setError(null);

    try {
      const res = await api.post('/import/mssql', {
        startDate: '2026-01-01',
        endDate: '2026-12-31'
      });
      if (res.data.success) {
        setSyncMessage(`✅ Live ERP Data Synced! Processed ${res.data.log?.total_records || 0} records.`);
        setTimeout(() => setSyncMessage(null), 4000);
        fetchCustomers(false);
        fetchSalesmen();
      }
    } catch (err) {
      console.error('Error syncing from ERP:', err);
      setError(err.response?.data?.message || 'MSSQL ERP Sync execution failed');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchSalesmen();
  }, []);

  useEffect(() => {
    setPage(1);
    fetchCustomers(false);
  }, [debouncedSearch, salesmanFilter, limit]);

  useEffect(() => {
    if (page > 1) {
      fetchCustomers(true);
    }
  }, [page]);

  // Infinite Scroll Intersection Observer Callback
  const lastElementRef = useCallback((node) => {
    if (loading || loadingMore || !infiniteScroll) return;
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && pagination && page < pagination.totalPages) {
        setPage(prevPage => prevPage + 1);
      }
    });

    if (node) observerRef.current.observe(node);
  }, [loading, loadingMore, infiniteScroll, pagination, page]);

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
        {/* Top Header & Controls */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          marginBottom: '1rem'
        }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              My Assigned Customers & Master Ledger
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
              View customer outstanding dues, track credit limits, log follow-ups, and record payment collections
            </p>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={handleSyncErp}
              disabled={syncing}
              title="Click to pull the latest live closing balance & invoices from Busy SQL ERP database"
              style={{
                backgroundColor: '#059669',
                color: '#ffffff',
                border: 'none',
                padding: '0.5rem 0.875rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                boxShadow: '0 2px 6px rgba(5, 150, 105, 0.2)'
              }}
            >
              <RotateCw size={14} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Syncing ERP...' : 'Sync ERP Data'}
            </button>

            <div style={{ position: 'relative', width: '220px' }}>
              <input
                type="text"
                placeholder="Search Customer, Code, Mobile..."
                title="Type customer name, account code, or mobile number to filter instantly"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: '100%', paddingLeft: '2.2rem' }}
              />
              <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Filter size={16} color="#64748b" />
              <select
                value={salesmanFilter}
                onChange={(e) => { setSalesmanFilter(e.target.value); setPage(1); }}
                title="Filter customer list by specific assigned Salesman / Account"
                style={{ backgroundColor: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.5rem' }}
              >
                <option value="">All Salesmen / Accounts</option>
                {salesmen.map((sm) => (
                  <option key={sm.code} value={sm.code}>
                    {sm.name} ({sm.count} Customers)
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => { setInfiniteScroll(!infiniteScroll); setPage(1); }}
              title="Toggle between auto-scrolling infinite list mode and page-by-page number buttons"
              style={{
                backgroundColor: infiniteScroll ? '#e0e7ff' : '#f1f5f9',
                color: infiniteScroll ? '#4338ca' : '#475569',
                border: '1px solid #c7d2fe',
                padding: '0.5rem 0.875rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem'
              }}
            >
              <Layers size={14} />
              {infiniteScroll ? 'Infinite Scroll: ON' : 'Paging Mode'}
            </button>
          </div>
        </div>

        {/* Layman Helper Bar */}
        <div style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '0.625rem 0.875rem',
          fontSize: '0.78rem',
          color: '#475569',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <HelpCircle size={16} color="#0284c7" />
          <span>
            <strong>How to use this page:</strong> Click on any <strong style={{ color: '#0284c7' }}>Customer Name</strong> to view their full ledger and invoice history. Use the <strong style={{ color: '#4338ca' }}>"+ Followup"</strong> button to record call notes, or <strong style={{ color: '#059669' }}>"Collection"</strong> button to record payment receipts.
          </span>
        </div>

        {/* Sync Success Banner */}
        {syncMessage && (
          <div style={{
            backgroundColor: '#d1fae5',
            color: '#047857',
            border: '1px solid #a7f3d0',
            padding: '0.75rem',
            borderRadius: '8px',
            fontSize: '0.85rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontWeight: 600
          }}>
            <CheckCircle2 size={18} /> {syncMessage}
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div style={{
            backgroundColor: '#ffe4e6',
            color: '#be123c',
            border: '1px solid #fecdd3',
            padding: '0.875rem',
            borderRadius: '8px',
            fontSize: '0.85rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={18} /> {error}
            </span>
            <button
              onClick={() => fetchCustomers(false)}
              style={{ background: 'transparent', color: '#be123c', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            >
              <RefreshCw size={14} /> Retry
            </button>
          </div>
        )}        {/* Customer Directory Table */}
        <div style={{ overflowX: 'auto' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th title="RefCode from ERP Master">Code</th>
                <th title="Customer Customer Name">Customer Name</th>
                <th title="Customer Mobile / Phone">Mobile</th>
                <th title="Assigned Sales Representative">Salesman</th>
                <th title="Original Ref Amount (₹)">Billed Amount</th>
                <th title="Total Pending Balance Amount (₹)">Outstanding</th>
                <th title="Overdue Days Past Due Date">Overdue Days</th>
                <th title="Allowed Credit Term Days">Credit Days</th>
                <th title="Maximum Credit Limit Allowed (₹)">Credit Limit</th>
                <th title="Credit Status Message">Credit Message</th>
                <th style={{ textAlign: 'center' }}>Action Buttons</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan="11" style={{ padding: '0.875rem', color: '#94a3b8' }}>
                      <div style={{ height: '16px', backgroundColor: '#e2e8f0', borderRadius: '4px', width: '80%' }}></div>
                    </td>
                  </tr>
                ))
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan="11" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                    No matching customer records found. Try clearing your search or salesman filter.
                  </td>
                </tr>
              ) : (
                customers.map((c, index) => {
                  const isLastElement = index === customers.length - 1;
                  return (
                    <tr key={c.id} ref={isLastElement ? lastElementRef : null}>
                      <td style={{ fontWeight: 700, color: '#64748b', fontSize: '0.8rem' }}>#{c.id}</td>
                      <td style={{ fontWeight: 700, color: '#0284c7' }}>
                        <button
                          onClick={() => navigate(`/customers/${c.id}`)}
                          title="Click to view full customer dashboard, invoice breakdown, and collection history"
                          style={{ background: 'transparent', color: '#0284c7', fontWeight: 700, textAlign: 'left', cursor: 'pointer' }}
                        >
                          {c.customer_name}
                        </button>
                      </td>
                      <td style={{ color: '#0f172a', fontWeight: 600 }}>{c.mobile || 'N/A'}</td>
                      <td style={{ color: '#6d28d9', fontWeight: 700 }}>
                        {c.salesman_code ? c.salesman_code.replace(/\s*\(\d{10}\)$/, '') : 'UNASSIGNED'}
                      </td>
                      <td style={{ fontWeight: 600, color: '#4f46e5' }}>₹{c.total_outstanding?.toLocaleString('en-IN')}</td>
                      <td style={{ fontWeight: 800, color: c.overdue_amount > 0 ? '#dc2626' : '#059669' }}>₹{c.overdue_amount?.toLocaleString('en-IN')}</td>
                      <td style={{ fontWeight: 800, color: c.overdue_amount > 0 ? '#dc2626' : '#059669' }}>
                        {c.overdue_amount > 0 ? c.max_overdue_label : '0 Days'}
                      </td>
                      <td style={{ color: '#475569' }}>{c.credit_days} Days</td>
                      <td style={{ color: '#475569' }}>₹{c.credit_limit?.toLocaleString('en-IN')}</td>
                      <td>
                        <span style={{
                          backgroundColor: c.overdue_amount > 0 ? '#ffe4e6' : '#e0e7ff',
                          color: c.overdue_amount > 0 ? '#be123c' : '#4338ca',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 700
                        }}>
                          {c.overdue_amount > 0 ? 'EXCEEDED CREDIT DAYS' : 'WITHIN CREDIT DAYS'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem' }}>
                          <button
                            onClick={() => navigate(`/customers/${c.id}`)}
                            title="Open full customer dashboard & ledger details"
                            style={{ backgroundColor: '#f0f9ff', color: '#0284c7', border: '1px solid #bae6fd', padding: '0.375rem 0.625rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}
                          >
                            <Eye size={14} /> View
                          </button>

                          <button
                            onClick={() => setActiveFollowupCustomer(c)}
                            title="Log a new call note, visit remarks, or next follow-up date"
                            style={{ backgroundColor: '#e0e7ff', color: '#4338ca', border: '1px solid #c7d2fe', padding: '0.375rem 0.625rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                          >
                            <PlusCircle size={14} /> Followup
                          </button>

                          <button
                            onClick={() => setActivePaymentCustomer(c)}
                            title="Record payment received (Cash, Cheque, UPI, NEFT)"
                            style={{ backgroundColor: '#d1fae5', color: '#047857', border: '1px solid #a7f3d0', padding: '0.375rem 0.625rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                          >
                            <CreditCard size={14} /> Collect
                          </button>

                          <button
                            onClick={() => setActiveWhatsappCustomer(c)}
                            title="Send instant WhatsApp payment reminder message"
                            style={{ backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #86efac', padding: '0.375rem 0.625rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                          >
                            <MessageSquare size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Loading More Indicator for Infinite Scroll */}
        {loadingMore && (
          <div style={{ textAlign: 'center', padding: '1rem', color: '#0284c7', fontSize: '0.85rem', fontWeight: 700 }}>
            ⏳ Loading more customer records from server...
          </div>
        )}

        {!infiniteScroll && (
          <Pagination pagination={pagination} onPageChange={(p) => setPage(p)} />
        )}
      </div>

      {activeFollowupCustomer && (
        <FollowupModal
          customer={activeFollowupCustomer}
          onClose={() => setActiveFollowupCustomer(null)}
          onSuccess={() => fetchCustomers(false)}
        />
      )}

      {activePaymentCustomer && (
        <PaymentModal
          customer={activePaymentCustomer}
          onClose={() => setActivePaymentCustomer(null)}
          onSuccess={() => fetchCustomers(false)}
        />
      )}

      {activeWhatsappCustomer && (
        <WhatsappModal
          customer={activeWhatsappCustomer}
          onClose={() => setActiveWhatsappCustomer(null)}
        />
      )}
      {/* Quick View ERP Line Items Breakdown Modal */}
      {viewItemsCustomer && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999999,
          padding: '1.5rem'
        }}>
          <div className="modal-content animate-fade-in" style={{ padding: '1.5rem', maxWidth: '950px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                  Pending Bill Line Items: <span style={{ color: '#0284c7' }}>{viewItemsCustomer.customer_name}</span>
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Live ERP Query (TRAN3 + TRAN2 + MASTER1) — Account Code: <strong>{viewItemsCustomer.customer_code}</strong>
                </p>
              </div>
              <button
                onClick={() => setViewItemsCustomer(null)}
                style={{ backgroundColor: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontWeight: 700, color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <div style={{ overflowX: 'auto', maxHeight: '350px', overflowY: 'auto', marginBottom: '1.25rem', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Customer Name</th>
                    <th>Bill No</th>
                    <th>Bill Date</th>
                    <th>Due Date</th>
                    <th>Item Name</th>
                    <th>Alias / Code</th>
                    <th>Unit</th>
                    <th>Qty</th>
                    <th>Rate (₹)</th>
                    <th>Discount (%)</th>
                    <th>Amount (₹)</th>
                    <th>MRP (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {erpItemsData.loading ? (
                    <tr>
                      <td colSpan="12" style={{ textAlign: 'center', padding: '2.5rem', color: '#0284c7', fontWeight: 700 }}>
                        ⏳ Running ERP SQL Query for {viewItemsCustomer.customer_name}...
                      </td>
                    </tr>
                  ) : erpItemsData.items.length === 0 ? (
                    <tr>
                      <td colSpan="12" style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>
                        No pending bill line items found in ERP for this customer account.
                      </td>
                    </tr>
                  ) : (
                    erpItemsData.items.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 700, color: '#0f172a' }}>{item.PARTY_NAME || viewItemsCustomer.customer_name}</td>
                        <td style={{ fontWeight: 800, color: '#0284c7' }}>{item.BILL_NO}</td>
                        <td style={{ color: '#64748b', fontSize: '0.8rem' }}>{item.BILL_DATE ? new Date(item.BILL_DATE).toLocaleDateString('en-IN') : 'N/A'}</td>
                        <td style={{ color: '#64748b', fontSize: '0.8rem' }}>{item.DUEDATE ? new Date(item.DUEDATE).toLocaleDateString('en-IN') : 'N/A'}</td>
                        <td style={{ fontWeight: 700, color: '#0f172a' }}>{item.ITEM_NAME || 'Standard Item'}</td>
                        <td style={{ color: '#64748b', fontSize: '0.8rem' }}>{item.ALIAS || 'N/A'}</td>
                        <td style={{ color: '#475569', fontSize: '0.8rem' }}>{item.UNIT || 'PCS'}</td>
                        <td style={{ fontWeight: 700, color: '#0284c7' }}>{item.QTY}</td>
                        <td>₹{item.RATE}</td>
                        <td style={{ color: '#dc2626', fontWeight: 600 }}>{item.DISCOUNT}%</td>
                        <td style={{ fontWeight: 800, color: '#059669' }}>₹{item.AMOUNT?.toLocaleString('en-IN')}</td>
                        <td style={{ color: '#64748b' }}>₹{item.MRP}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                onClick={() => {
                  const id = viewItemsCustomer.id;
                  setViewItemsCustomer(null);
                  navigate(`/customers/${id}`);
                }}
                style={{ backgroundColor: '#e0e7ff', color: '#4338ca', border: '1px solid #c7d2fe', padding: '0.5rem 1rem', borderRadius: '6px', fontWeight: 700, fontSize: '0.85rem' }}
              >
                Go to Full Customer Dashboard →
              </button>
              <button
                onClick={() => setViewItemsCustomer(null)}
                style={{ backgroundColor: '#4f46e5', color: '#ffffff', padding: '0.5rem 1.25rem', borderRadius: '6px', fontWeight: 700, fontSize: '0.85rem' }}
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Address Modal */}
      {selectedAddressCustomer && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" style={{ padding: '1.5rem', maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MapPin size={20} color="#0284c7" /> Location & Address Details
              </h3>
              <button onClick={() => setSelectedAddressCustomer(null)} title="Close popup window" style={{ background: 'transparent', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Customer Name</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.75rem' }}>{selectedAddressCustomer.customer_name}</div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b' }}>City</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>{selectedAddressCustomer.city || 'N/A'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b' }}>State</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>{selectedAddressCustomer.state || 'N/A'}</div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b' }}>Full Address</div>
                <div style={{ fontSize: '0.85rem', color: '#334155', marginTop: '0.2rem', whiteSpace: 'pre-wrap' }}>
                  {selectedAddressCustomer.address || 'No specific street address registered.'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSelectedAddressCustomer(null)}
                style={{ backgroundColor: '#4f46e5', color: '#ffffff', padding: '0.5rem 1.25rem', borderRadius: '6px', fontWeight: 700 }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Blocking Syncing Overlay */}
      {syncing && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(6px)', backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 999999 }}>
          <div className="modal-content animate-fade-in" style={{ padding: '2.5rem', maxWidth: '420px', textAlign: 'center', margin: 'auto' }}>
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <div style={{
                width: '64px',
                height: '64px',
                border: '4px solid #e0e7ff',
                borderTopColor: '#4f46e5',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite'
              }} />
              <RotateCw size={24} color="#4f46e5" style={{ position: 'absolute' }} className="animate-spin" />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
              Syncing ERP Data...
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.25rem', lineHeight: '1.4' }}>
              Pulling latest closing balances, customer accounts, and invoices from Busy SQL ERP. Please wait...
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#4f46e5', backgroundColor: '#f5f3ff', padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #ddd6fe' }}>
              <span>🔒 Screen locked to prevent edit conflicts</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
