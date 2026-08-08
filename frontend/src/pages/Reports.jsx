import React, { useState, useEffect } from 'react';
import StatusBadge from '../components/StatusBadge';

import { BarChart3, Download, Printer, Filter } from 'lucide-react';
import api from '../services/api';

export default function Reports() {
  const [activeReport, setActiveReport] = useState('OUTSTANDING'); // OUTSTANDING, COLLECTION, OVERDUE, FOLLOWUPS
  const [data, setData] = useState(null);
  const [salesmen, setSalesmen] = useState([]);
  const [salesmanFilter, setSalesmanFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Fetch registered salesmen list
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

  const fetchReportData = async () => {
    setLoading(true);
    try {
      let endpoint = '/reports/outstanding';
      if (activeReport === 'COLLECTION') endpoint = '/reports/collections';
      else if (activeReport === 'OVERDUE') endpoint = '/reports/overdue';
      else if (activeReport === 'FOLLOWUPS') endpoint = '/reports/followups';

      const res = await api.get(endpoint, {
        params: { salesmanCode: salesmanFilter || undefined }
      });
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error('Error loading report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesmen();
  }, []);

  useEffect(() => {
    fetchReportData();
  }, [activeReport, salesmanFilter]);

  const handleExportCSV = () => {
    let endpoint = '/api/reports/outstanding?format=csv';
    if (activeReport === 'COLLECTION') endpoint = '/api/reports/collections?format=csv';
    else if (activeReport === 'OVERDUE') endpoint = '/api/reports/overdue?format=csv';
    else if (activeReport === 'FOLLOWUPS') endpoint = '/api/reports/followups?format=csv';

    const token = localStorage.getItem('token');
    const filterParam = salesmanFilter ? `&salesmanCode=${salesmanFilter}` : '';
    window.open(`${endpoint}${filterParam}&token=${token}`, '_blank');
  };

  const handlePrint = () => {
    window.print();
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
        {/* Header & Controls */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          marginBottom: '1.25rem',
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: '0.75rem'
        }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart3 size={24} color="#7c3aed" /> Executive Reports & Analytics
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Consolidated outstanding, aging buckets, salesman recovery performance, and follow-up trails
            </p>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Filter size={16} color="#64748b" />
              <select
                value={salesmanFilter}
                onChange={(e) => setSalesmanFilter(e.target.value)}
                style={{ backgroundColor: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.5rem' }}
              >
                <option value="">All Salesmen / Accounts</option>
                {salesmen.map((sm) => (
                  <option key={sm.code} value={sm.code}>
                    {sm.name} ({sm.count})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleExportCSV}
              style={{
                backgroundColor: '#059669',
                color: '#ffffff',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                boxShadow: '0 2px 4px rgba(5, 150, 105, 0.2)'
              }}
            >
              <Download size={16} /> Export CSV / Excel
            </button>

            <button
              onClick={handlePrint}
              style={{
                backgroundColor: '#f1f5f9',
                color: '#0f172a',
                border: '1px solid #cbd5e1',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem'
              }}
            >
              <Printer size={16} /> Print Report
            </button>
          </div>
        </div>

        {/* Report Selector Tabs */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <button
            onClick={() => setActiveReport('OUTSTANDING')}
            style={{
              backgroundColor: activeReport === 'OUTSTANDING' ? '#4f46e5' : '#f1f5f9',
              color: activeReport === 'OUTSTANDING' ? '#ffffff' : '#475569',
              border: '1px solid #cbd5e1',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              fontWeight: 700,
              fontSize: '0.85rem'
            }}
          >
            Customer Outstanding Report
          </button>
          <button
            onClick={() => setActiveReport('COLLECTION')}
            style={{
              backgroundColor: activeReport === 'COLLECTION' ? '#0284c7' : '#f1f5f9',
              color: activeReport === 'COLLECTION' ? '#ffffff' : '#475569',
              border: '1px solid #cbd5e1',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              fontWeight: 700,
              fontSize: '0.85rem'
            }}
          >
            Salesman Collection Report
          </button>
          <button
            onClick={() => setActiveReport('OVERDUE')}
            style={{
              backgroundColor: activeReport === 'OVERDUE' ? '#dc2626' : '#f1f5f9',
              color: activeReport === 'OVERDUE' ? '#ffffff' : '#475569',
              border: '1px solid #cbd5e1',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              fontWeight: 700,
              fontSize: '0.85rem'
            }}
          >
            Overdue Aging Buckets Report
          </button>
          <button
            onClick={() => setActiveReport('FOLLOWUPS')}
            style={{
              backgroundColor: activeReport === 'FOLLOWUPS' ? '#7c3aed' : '#f1f5f9',
              color: activeReport === 'FOLLOWUPS' ? '#ffffff' : '#475569',
              border: '1px solid #cbd5e1',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              fontWeight: 700,
              fontSize: '0.85rem'
            }}
          >
            Follow-Up Activity Report
          </button>
        </div>

        {/* Report 1: Customer Outstanding */}
        {activeReport === 'OUTSTANDING' && (
          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Customer Name & Code</th>
                  <th>Salesman Code</th>
                  <th>Mobile</th>
                  <th>Invoice Count</th>
                  <th>Total Outstanding</th>
                  <th>Overdue Amount</th>
                  <th>Credit Limit</th>
                  <th>Credit Days</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                      Loading report...
                    </td>
                  </tr>
                ) : Array.isArray(data) && data.length > 0 ? (
                  data.map((row, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 700, color: '#0284c7' }}>
                        {row.customerName} ({row.customerCode})
                      </td>
                      <td style={{ color: '#6d28d9', fontWeight: 700 }}>{row.salesmanCode}</td>
                      <td style={{ color: '#0f172a', fontWeight: 600 }}>{row.mobile || 'N/A'}</td>
                      <td>{row.invoiceCount}</td>
                      <td style={{ fontWeight: 800, color: row.totalOutstanding > 0 ? '#0f172a' : '#059669' }}>
                        ₹{row.totalOutstanding?.toLocaleString('en-IN')}
                      </td>
                      <td style={{ fontWeight: 700, color: row.overdueAmount > 0 ? '#dc2626' : '#64748b' }}>
                        ₹{row.overdueAmount?.toLocaleString('en-IN')}
                      </td>
                      <td style={{ color: '#475569' }}>₹{row.creditLimit?.toLocaleString('en-IN')}</td>
                      <td style={{ color: '#475569' }}>{row.creditDays} Days</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                      No data available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Report 2: Salesman Collection */}
        {activeReport === 'COLLECTION' && (
          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Salesman Name</th>
                  <th>Code</th>
                  <th>Assigned Customers</th>
                  <th>Total Outstanding</th>
                  <th>Total Collection Recovered</th>
                  <th>Total Follow-ups</th>
                  <th>Payment Commitments</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                      Loading report...
                    </td>
                  </tr>
                ) : Array.isArray(data) && data.length > 0 ? (
                  data.map((row, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 700, color: '#0f172a' }}>{row.salesmanName}</td>
                      <td style={{ color: '#6d28d9', fontWeight: 700 }}>{row.salesmanCode}</td>
                      <td>{row.customerCount} Customers</td>
                      <td style={{ fontWeight: 800, color: '#dc2626' }}>₹{row.totalOutstanding?.toLocaleString('en-IN')}</td>
                      <td style={{ fontWeight: 800, color: '#059669' }}>₹{row.totalCollection?.toLocaleString('en-IN')}</td>
                      <td style={{ fontWeight: 700, color: '#0284c7' }}>{row.followupCount} Logs</td>
                      <td style={{ fontWeight: 700, color: '#d97706' }}>₹{row.paymentCommitments?.toLocaleString('en-IN')}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                      No data available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Report 3: Overdue Aging Buckets */}
        {activeReport === 'OVERDUE' && data?.agingBuckets && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {Object.entries(data.agingBuckets).map(([bucket, list]) => (
              <div key={bucket} style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#dc2626' }}>
                    Aging Category: {bucket} ({list.length} Invoices)
                  </h3>
                  <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem' }}>
                    Subtotal: ₹{(data.totals[bucket] || 0).toLocaleString('en-IN')}
                  </span>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Invoice No</th>
                        <th>Invoice Date</th>
                        <th>Due Date</th>
                        <th>Days Overdue</th>
                        <th>Customer Name</th>
                        <th>Salesman</th>
                        <th>Outstanding Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.length === 0 ? (
                        <tr>
                          <td colSpan="7" style={{ textAlign: 'center', color: '#94a3b8', padding: '0.75rem' }}>
                            No invoices in this bucket.
                          </td>
                        </tr>
                      ) : (
                        list.map((inv, i) => (
                          <tr key={i}>
                            <td style={{ fontWeight: 700, color: '#0284c7' }}>{inv.invoiceNumber}</td>
                            <td style={{ color: '#64748b', fontSize: '0.8rem' }}>{new Date(inv.invoiceDate).toLocaleDateString('en-IN')}</td>
                            <td style={{ color: '#64748b', fontSize: '0.8rem' }}>{new Date(inv.dueDate).toLocaleDateString('en-IN')}</td>
                            <td style={{ fontWeight: 700, color: '#dc2626' }}>{inv.daysOverdue} Days</td>
                            <td style={{ fontWeight: 600, color: '#0f172a' }}>{inv.customerName}</td>
                            <td style={{ color: '#6d28d9', fontWeight: 700 }}>{inv.salesmanCode}</td>
                            <td style={{ fontWeight: 800, color: '#0f172a' }}>₹{inv.outstandingAmount?.toLocaleString('en-IN')}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Report 4: Follow-up Activity */}
        {activeReport === 'FOLLOWUPS' && (
          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Follow-up Date</th>
                  <th>Salesman / User</th>
                  <th>Customer Name & Code</th>
                  <th>Type</th>
                  <th>Discussion Remark</th>
                  <th>Expected Payment</th>
                  <th>Next Follow-up</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                      Loading report...
                    </td>
                  </tr>
                ) : Array.isArray(data) && data.length > 0 ? (
                  data.map((f) => (
                    <tr key={f.id}>
                      <td style={{ color: '#64748b', fontSize: '0.8rem' }}>
                        {new Date(f.followupDate).toLocaleDateString('en-IN')}
                      </td>
                      <td style={{ color: '#0f172a', fontWeight: 600 }}>{f.salesmanName}</td>
                      <td style={{ fontWeight: 700, color: '#0284c7' }}>
                        {f.customerName} ({f.customerCode})
                      </td>
                      <td style={{ fontWeight: 600, color: '#0284c7' }}>{f.followupType}</td>
                      <td style={{ color: '#475569', fontSize: '0.8rem', maxWidth: '280px', whiteSpace: 'pre-wrap' }}>{f.remark}</td>
                      <td style={{ color: '#059669', fontWeight: 600 }}>
                        {f.expectedPaymentAmount ? `₹${f.expectedPaymentAmount.toLocaleString('en-IN')}` : 'N/A'}
                      </td>
                      <td style={{ color: '#d97706', fontWeight: 600 }}>
                        {f.nextFollowupDate ? new Date(f.nextFollowupDate).toLocaleDateString('en-IN') : 'None'}
                      </td>
                      <td>
                        <StatusBadge status={f.status} />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                      No data available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
