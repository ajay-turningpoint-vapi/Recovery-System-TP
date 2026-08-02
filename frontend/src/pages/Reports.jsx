import React, { useState, useEffect } from 'react';
import StatusBadge from '../components/StatusBadge';

import { BarChart3, Download, Printer, Filter, Search, FileText } from 'lucide-react';
import api from '../services/api';

export default function Reports() {
  const [activeReport, setActiveReport] = useState('OUTSTANDING'); // OUTSTANDING, COLLECTION, OVERDUE, FOLLOWUPS
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      let endpoint = '/reports/outstanding';
      if (activeReport === 'COLLECTION') endpoint = '/reports/collections';
      else if (activeReport === 'OVERDUE') endpoint = '/reports/overdue';
      else if (activeReport === 'FOLLOWUPS') endpoint = '/reports/followups';

      const res = await api.get(endpoint);
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
    fetchReportData();
  }, [activeReport]);

  const handleExportCSV = () => {
    let endpoint = '/api/reports/outstanding?format=csv';
    if (activeReport === 'COLLECTION') endpoint = '/api/reports/collections?format=csv';
    else if (activeReport === 'OVERDUE') endpoint = '/api/reports/overdue?format=csv';
    else if (activeReport === 'FOLLOWUPS') endpoint = '/api/reports/followups?format=csv';

    const token = localStorage.getItem('token');
    window.open(`${endpoint}&token=${token}`, '_blank');
  };

  const handlePrint = () => {
    window.print();
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
        {/* Header & Controls */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          marginBottom: '1.25rem',
          borderBottom: '1px solid #334155',
          paddingBottom: '0.75rem'
        }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart3 size={24} color="#8b5cf6" /> Executive Reports & Analytics
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              Consolidated outstanding, aging buckets, salesman recovery performance, and follow-up trails
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={handleExportCSV}
              style={{
                backgroundColor: '#10b981',
                color: '#ffffff',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem'
              }}
            >
              <Download size={16} /> Export CSV / Excel
            </button>

            <button
              onClick={handlePrint}
              style={{
                backgroundColor: '#334155',
                color: '#f8fafc',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                fontWeight: 600,
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
              backgroundColor: activeReport === 'OUTSTANDING' ? '#6366f1' : '#0f172a',
              color: activeReport === 'OUTSTANDING' ? '#ffffff' : '#94a3b8',
              border: '1px solid #334155',
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
              backgroundColor: activeReport === 'COLLECTION' ? '#38bdf8' : '#0f172a',
              color: activeReport === 'COLLECTION' ? '#000000' : '#94a3b8',
              border: '1px solid #334155',
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
              backgroundColor: activeReport === 'OVERDUE' ? '#f43f5e' : '#0f172a',
              color: activeReport === 'OVERDUE' ? '#ffffff' : '#94a3b8',
              border: '1px solid #334155',
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
              backgroundColor: activeReport === 'FOLLOWUPS' ? '#8b5cf6' : '#0f172a',
              color: activeReport === 'FOLLOWUPS' ? '#ffffff' : '#94a3b8',
              border: '1px solid #334155',
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
                      <td style={{ fontWeight: 700, color: '#38bdf8' }}>
                        {row.customerName} ({row.customerCode})
                      </td>
                      <td style={{ color: '#a78bfa', fontWeight: 600 }}>{row.salesmanCode}</td>
                      <td style={{ color: '#f8fafc' }}>{row.mobile || 'N/A'}</td>
                      <td>{row.invoiceCount}</td>
                      <td style={{ fontWeight: 800, color: row.totalOutstanding > 0 ? '#f8fafc' : '#34d399' }}>
                        ₹{row.totalOutstanding?.toLocaleString('en-IN')}
                      </td>
                      <td style={{ fontWeight: 700, color: row.overdueAmount > 0 ? '#f43f5e' : '#94a3b8' }}>
                        ₹{row.overdueAmount?.toLocaleString('en-IN')}
                      </td>
                      <td style={{ color: '#cbd5e1' }}>₹{row.creditLimit?.toLocaleString('en-IN')}</td>
                      <td style={{ color: '#cbd5e1' }}>{row.creditDays} Days</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
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
                      <td style={{ fontWeight: 700, color: '#f8fafc' }}>{row.salesmanName}</td>
                      <td style={{ color: '#a78bfa', fontWeight: 600 }}>{row.salesmanCode}</td>
                      <td>{row.customerCount} Customers</td>
                      <td style={{ fontWeight: 800, color: '#f43f5e' }}>₹{row.totalOutstanding?.toLocaleString('en-IN')}</td>
                      <td style={{ fontWeight: 800, color: '#34d399' }}>₹{row.totalCollection?.toLocaleString('en-IN')}</td>
                      <td style={{ fontWeight: 600, color: '#38bdf8' }}>{row.followupCount} Logs</td>
                      <td style={{ fontWeight: 700, color: '#fbbf24' }}>₹{row.paymentCommitments?.toLocaleString('en-IN')}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
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
              <div key={bucket} style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#f43f5e' }}>
                    Aging Category: {bucket} ({list.length} Invoices)
                  </h3>
                  <span style={{ fontWeight: 800, color: '#f8fafc', fontSize: '1rem' }}>
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
                          <td colSpan="7" style={{ textAlign: 'center', color: '#64748b', padding: '0.75rem' }}>
                            No invoices in this bucket.
                          </td>
                        </tr>
                      ) : (
                        list.map((inv, i) => (
                          <tr key={i}>
                            <td style={{ fontWeight: 700, color: '#38bdf8' }}>{inv.invoiceNumber}</td>
                            <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{new Date(inv.invoiceDate).toLocaleDateString('en-IN')}</td>
                            <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{new Date(inv.dueDate).toLocaleDateString('en-IN')}</td>
                            <td style={{ fontWeight: 700, color: '#f43f5e' }}>{inv.daysOverdue} Days</td>
                            <td style={{ fontWeight: 600, color: '#f8fafc' }}>{inv.customerName}</td>
                            <td style={{ color: '#a78bfa' }}>{inv.salesmanCode}</td>
                            <td style={{ fontWeight: 800, color: '#f8fafc' }}>₹{inv.outstandingAmount?.toLocaleString('en-IN')}</td>
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
                      <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                        {new Date(f.followupDate).toLocaleDateString('en-IN')}
                      </td>
                      <td style={{ color: '#f8fafc', fontWeight: 600 }}>{f.salesmanName}</td>
                      <td style={{ fontWeight: 700, color: '#38bdf8' }}>
                        {f.customerName} ({f.customerCode})
                      </td>
                      <td style={{ fontWeight: 600, color: '#38bdf8' }}>{f.followupType}</td>
                      <td style={{ color: '#cbd5e1', fontSize: '0.8rem', maxWidth: '280px', whiteSpace: 'pre-wrap' }}>{f.remark}</td>
                      <td style={{ color: '#34d399', fontWeight: 600 }}>
                        {f.expectedPaymentAmount ? `₹${f.expectedPaymentAmount.toLocaleString('en-IN')}` : 'N/A'}
                      </td>
                      <td style={{ color: '#fbbf24' }}>
                        {f.nextFollowupDate ? new Date(f.nextFollowupDate).toLocaleDateString('en-IN') : 'None'}
                      </td>
                      <td>
                        <StatusBadge status={f.status} />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
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
