import React, { useState, useEffect, useRef, useCallback } from 'react';
import StatusBadge from '../components/StatusBadge';
import Pagination from '../components/Pagination';

import { Search, Filter, Eye, AlertCircle, RefreshCw, Layers, RotateCw, CheckCircle2, HelpCircle } from 'lucide-react';
import api from '../services/api';

export default function InvoiceOutstanding() {
  const [invoices, setInvoices] = useState([]);
  const [salesmen, setSalesmen] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState(null);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [salesmanFilter, setSalesmanFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [infiniteScroll, setInfiniteScroll] = useState(true);

  // Selected Invoice Detail Modal
  const [selectedInvoice, setSelectedInvoice] = useState(null);

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

  const fetchInvoices = async (isLoadMore = false) => {
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const currentPage = isLoadMore ? page : 1;
      const res = await api.get('/invoices', {
        params: {
          search: debouncedSearch,
          status: statusFilter || undefined,
          salesman_code: salesmanFilter || undefined,
          page: currentPage,
          limit
        }
      });

      if (res.data.success) {
        if (isLoadMore && infiniteScroll) {
          setInvoices(prev => [...prev, ...res.data.data]);
        } else {
          setInvoices(res.data.data);
        }
        setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Error fetching invoices:', err);
      setError(err.response?.data?.message || 'Failed to load invoice ledger from server');
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
        setSyncMessage(`✅ Live ERP Invoices Synced! Processed ${res.data.log?.total_records || 0} records.`);
        setTimeout(() => setSyncMessage(null), 4000);
        fetchInvoices(false);
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
    fetchInvoices(false);
  }, [debouncedSearch, statusFilter, salesmanFilter, limit]);

  useEffect(() => {
    if (page > 1) {
      fetchInvoices(true);
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

  const viewInvoiceDetail = async (inv) => {
    // Automatically scroll screen to top so modal pop-up is fully visible in view
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setSelectedInvoice({ ...inv, loadingItems: true, items: inv.items || [] });
    try {
      if (inv.customer_id) {
        const itemRes = await api.get(`/customers/${inv.customer_id}/items`);
        if (itemRes.data.success && itemRes.data.items) {
          const invNoClean = (inv.invoice_number || '').replace(/\s+/g, '').toUpperCase();
          const matchingItems = itemRes.data.items.filter(item => {
            const itemVouClean = (item.BILL_NO || item.VOU_NO || '').replace(/\s+/g, '').toUpperCase();
            return itemVouClean === invNoClean || itemVouClean.includes(invNoClean) || invNoClean.includes(itemVouClean);
          });
          const finalItems = matchingItems.length > 0 ? matchingItems : (itemRes.data.items.length > 0 ? itemRes.data.items : inv.items || []);
          setSelectedInvoice({ ...inv, loadingItems: false, items: finalItems });
          return;
        }
      }
      const res = await api.get(`/invoices/${inv.id}`);
      if (res.data.success && res.data.invoice) {
        setSelectedInvoice({ ...res.data.invoice, loadingItems: false });
      }
    } catch (err) {
      console.warn('Error fetching extra invoice details, showing cached invoice:', err);
      setSelectedInvoice({ ...inv, loadingItems: false });
    }
  };

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
        {/* Header Controls */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          marginBottom: '1rem'
        }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
              Invoice / Bill Outstanding Master Ledger
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Track invoice dates, due dates, paid amounts, and days overdue per bill
            </p>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={handleSyncErp}
              disabled={syncing}
              title="Click to pull latest live invoices and balances from Busy SQL ERP database"
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

            <div style={{ position: 'relative', width: '200px' }}>
              <input
                type="text"
                placeholder="Search Inv No, Customer..."
                title="Type invoice number or customer name to filter instantly"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: '100%', paddingLeft: '2.2rem' }}
              />
              <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Filter size={16} color="#64748b" />
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                title="Filter invoices by payment & overdue status"
                style={{ backgroundColor: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.5rem' }}
              >
                <option value="">All Statuses</option>
                <option value="Overdue">Overdue Invoices</option>
                <option value="Due Today">Due Today Invoices</option>
                <option value="Not Due">Not Due Invoices</option>
                <option value="Paid">Paid Invoices</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <select
                value={salesmanFilter}
                onChange={(e) => { setSalesmanFilter(e.target.value); setPage(1); }}
                title="Filter invoices by assigned Salesman / Account"
                style={{ backgroundColor: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.5rem' }}
              >
                <option value="">All Salesmen / Accounts</option>
                {salesmen.map((sm) => (
                  <option key={sm.code} value={sm.code}>
                    {sm.name} ({sm.count} Bills)
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => { setInfiniteScroll(!infiniteScroll); setPage(1); }}
              title="Toggle between infinite scrolling mode and page-by-page number buttons"
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
            <strong>How to use this page:</strong> Click <strong style={{ color: '#0284c7' }}>"View Breakdown"</strong> on any invoice row to inspect items, tax details, and payment collection history against that specific bill.
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

        {/* Error Alert Banner */}
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
              onClick={() => fetchInvoices(false)}
              style={{ background: 'transparent', color: '#be123c', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            >
              <RefreshCw size={14} /> Retry
            </button>
          </div>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th title="Official Invoice Number">Invoice No</th>
                <th title="Date when invoice was generated">Invoice Date</th>
                <th title="Customer / Party Account Name">Customer Name</th>
                <th title="Assigned Salesman / Representative">Salesman</th>
                <th title="Total Billed Invoice Amount (₹)">Invoice Amount</th>
                <th title="Amount Collected / Paid (₹)">Paid Amount</th>
                <th title="Total Pending Balance (₹)">Total Outstanding</th>
                <th title="Payment Due Date">Due Date</th>
                <th title="Days Overdue Past Terms">Overdue Days</th>
                <th title="Credit Dues Status">Status</th>
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
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan="11" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                    No matching invoices found.
                  </td>
                </tr>
              ) : (
                invoices.map((inv, index) => {
                  const isLastElement = index === invoices.length - 1;
                  return (
                    <tr key={inv.id} ref={isLastElement ? lastElementRef : null}>
                      <td style={{ fontWeight: 700, color: '#0f172a' }}>
                        <button
                          onClick={() => viewInvoiceDetail(inv)}
                          style={{ background: 'transparent', border: 'none', color: '#0284c7', fontWeight: 700, cursor: 'pointer', textAlign: 'left', padding: 0 }}
                          title="Click to view invoice detail breakdown modal"
                        >
                          {inv.invoice_number}
                        </button>
                      </td>
                      <td style={{ color: '#64748b', fontSize: '0.8rem' }}>
                        {new Date(inv.invoice_date).toLocaleDateString('en-IN')}
                      </td>
                      <td>
                        <button
                          onClick={() => navigate(`/customers/${inv.customer_id}`)}
                          style={{ background: 'transparent', border: 'none', color: '#0f172a', fontWeight: 600, cursor: 'pointer', textAlign: 'left', padding: 0 }}
                          title="Click to view customer dashboard"
                        >
                          {inv.customer?.customer_name} ({inv.customer?.customer_code})
                        </button>
                      </td>
                      <td style={{ color: '#6d28d9', fontSize: '0.8rem', fontWeight: 700 }}>
                        {inv.salesman_code ? inv.salesman_code.replace(/\s*\(\d{10}\)$/, '') : 'UNASSIGNED'}
                      </td>
                      <td>₹{inv.invoice_amount.toLocaleString('en-IN')}</td>
                      <td style={{ color: '#059669', fontWeight: 600 }}>₹{inv.paid_amount.toLocaleString('en-IN')}</td>
                      <td style={{ fontWeight: 800, color: inv.outstanding_amount > 0 ? '#0f172a' : '#059669' }}>
                        ₹{inv.outstanding_amount.toLocaleString('en-IN')}
                      </td>
                      <td style={{ color: '#64748b', fontSize: '0.8rem' }}>
                        {new Date(inv.due_date).toLocaleDateString('en-IN')}
                      </td>
                      <td style={{ fontWeight: 700, color: inv.days_overdue > 0 ? '#dc2626' : '#059669', fontSize: '0.8rem' }}>
                        {inv.overdue_status}
                      </td>
                      <td>
                        <StatusBadge status={inv.status} />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => viewInvoiceDetail(inv)}
                          title="Click to view item details, rates, tax %, and collection payment trail"
                          style={{ backgroundColor: '#f0f9ff', color: '#0284c7', border: '1px solid #bae6fd', padding: '0.375rem 0.625rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}
                        >
                          <Eye size={14} /> View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Loading More Indicator */}
        {loadingMore && (
          <div style={{ textAlign: 'center', padding: '1rem', color: '#0284c7', fontSize: '0.85rem', fontWeight: 700 }}>
            ⏳ Loading more invoice records from server...
          </div>
        )}

        {!infiniteScroll && (
          <Pagination pagination={pagination} onPageChange={(p) => setPage(p)} />
        )}
      </div>

      {/* Invoice Details Modal */}
      {selectedInvoice && (
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
          padding: '1rem',
          margin: 0
        }}>
          <div className="modal-content animate-fade-in" style={{ padding: '1.75rem', maxWidth: '1050px', width: '95%', maxHeight: '88vh', overflowY: 'auto', margin: 'auto', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.875rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                  📄 {selectedInvoice.invoice_number?.trim()}
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '0.2rem' }}>
                  Customer: <strong style={{ color: '#0284c7' }}>{selectedInvoice.customer?.customer_name}</strong>
                  {selectedInvoice.customer?.city ? ` · ${selectedInvoice.customer.city}` : ''}
                  {selectedInvoice.customer?.state ? `, ${selectedInvoice.customer.state}` : ''}
                </p>
                <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.1rem' }}>
                  Salesman: <strong>{selectedInvoice.salesman_code || '—'}</strong>
                  &nbsp;·&nbsp; Invoice Date: <strong>{new Date(selectedInvoice.invoice_date).toLocaleDateString('en-IN')}</strong>
                </p>
              </div>
              <button onClick={() => setSelectedInvoice(null)} title="Close" style={{ background: 'transparent', color: '#64748b', fontSize: '1.2rem', lineHeight: 1 }}>✕</button>
            </div>

            {/* Financial Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.875rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Invoice Amount</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginTop: '0.25rem' }}>₹{selectedInvoice.invoice_amount?.toLocaleString('en-IN')}</div>
              </div>
              <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '0.875rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Amount Received</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#059669', marginTop: '0.25rem' }}>₹{selectedInvoice.paid_amount?.toLocaleString('en-IN')}</div>
              </div>
              <div style={{ backgroundColor: selectedInvoice.outstanding_amount > 0 ? '#fff7ed' : '#f0fdf4', border: `1px solid ${selectedInvoice.outstanding_amount > 0 ? '#fed7aa' : '#bbf7d0'}`, borderRadius: '8px', padding: '0.875rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.72rem', color: selectedInvoice.outstanding_amount > 0 ? '#c2410c' : '#15803d', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Outstanding</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: selectedInvoice.outstanding_amount > 0 ? '#ea580c' : '#059669', marginTop: '0.25rem' }}>₹{selectedInvoice.outstanding_amount?.toLocaleString('en-IN')}</div>
              </div>
            </div>

            {/* Line Items Table */}
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              📦 Invoice Line Items
              {(!selectedInvoice.items || selectedInvoice.items.length === 0) && (
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 400, background: '#f1f5f9', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                  Run "Invoice + Line Items Mode" sync to load product details
                </span>
              )}
            </h4>
            <div style={{ overflowX: 'auto', maxHeight: '320px', overflowY: 'auto', marginBottom: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
              <table className="custom-table">
                <thead>
                  <tr>
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
                  {selectedInvoice.loadingItems ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: '#0284c7', fontWeight: 700 }}>
                        ⏳ Fetching live ERP line item details...
                      </td>
                    </tr>
                  ) : (!selectedInvoice.items || selectedInvoice.items.length === 0) ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b' }}>
                        No product breakdown records found for this invoice. Total ₹{selectedInvoice.invoice_amount?.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ) : (
                    selectedInvoice.items.map((item, idx) => {
                      const itemName = item.ITEM_NAME || item.item_name || 'Standard Item';
                      const alias = item.ALIAS || item.alias || '—';
                      const unit = item.UNIT || item.unit || 'PCS';
                      const qty = item.QTY ?? item.quantity ?? 1;
                      const rate = item.RATE ?? item.rate ?? 0;
                      const discount = item.DISCOUNT ?? item.discount ?? 0;
                      const amount = item.AMOUNT ?? item.amount ?? (qty * rate);
                      const mrp = item.MRP ?? item.mrp ?? '—';
                      return (
                        <tr key={idx}>
                          <td style={{ fontWeight: 700, color: '#0f172a' }}>{itemName}</td>
                          <td style={{ color: '#64748b', fontSize: '0.8rem' }}>{alias}</td>
                          <td style={{ color: '#475569', fontSize: '0.8rem' }}>{unit}</td>
                          <td style={{ fontWeight: 700, color: '#0284c7' }}>{qty}</td>
                          <td>₹{rate?.toLocaleString('en-IN')}</td>
                          <td style={{ color: discount > 0 ? '#dc2626' : '#64748b', fontWeight: 600 }}>{discount > 0 ? `${discount}%` : '0%'}</td>
                          <td style={{ fontWeight: 800, color: '#059669' }}>₹{amount?.toLocaleString('en-IN')}</td>
                          <td style={{ color: '#64748b' }}>{mrp !== '—' ? `₹${mrp}` : '—'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Payment History for Invoice */}
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
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
                      <td colSpan="4" style={{ textAlign: 'center', padding: '1rem', color: '#94a3b8' }}>
                        No payment collection recorded against this invoice yet.
                      </td>
                    </tr>
                  ) : (
                    selectedInvoice.payments?.map((p) => (
                      <tr key={p.id}>
                        <td style={{ color: '#64748b' }}>{new Date(p.payment_date).toLocaleDateString('en-IN')}</td>
                        <td style={{ fontWeight: 600, color: '#0f172a' }}>{p.payment_mode}</td>
                        <td style={{ color: '#64748b', fontSize: '0.8rem' }}>{p.reference_number || 'N/A'}</td>
                        <td style={{ fontWeight: 800, color: '#059669' }}>₹{p.amount?.toLocaleString('en-IN')}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSelectedInvoice(null)}
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
              Syncing Live ERP Invoices...
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.25rem', lineHeight: '1.4' }}>
              Extracting sales vouchers and invoice dues from Busy SQL ERP database. Please wait...
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
