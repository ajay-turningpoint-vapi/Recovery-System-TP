import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, FileText, DollarSign, AlertTriangle, ArrowRight } from 'lucide-react';
import api from '../services/api';

export default function SalesmanWiseDashboard() {
  const navigate = useNavigate();
  const [salesmanData, setSalesmanData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchSalesmanData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/dashboard/salesman-wise');
      if (res.data.success) {
        setSalesmanData(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching salesman-wise dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesmanData();
  }, []);

  const filteredSalesmen = salesmanData.filter(s => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(term) ||
      s.salesman_code.toLowerCase().includes(term) ||
      (s.mobile && s.mobile.includes(term))
    );
  });

  const totalCompanyOutstanding = salesmanData.reduce((acc, s) => acc + (s.total_outstanding || 0), 0);
  const totalCompanyOverdue = salesmanData.reduce((acc, s) => acc + (s.overdue_amount || 0), 0);
  const totalCustomersCount = salesmanData.reduce((acc, s) => acc + (s.total_customers || 0), 0);

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '2rem' }}>
      {/* Header Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Active Salesmen</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginTop: '0.25rem' }}>{salesmanData.length} Salesmen</div>
            </div>
            <div style={{ backgroundColor: '#e0f2fe', width: '44px', height: '44px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7' }}>
              <Users size={22} />
            </div>
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Company Accounts</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#4f46e5', marginTop: '0.25rem' }}>{totalCustomersCount} Customers</div>
            </div>
            <div style={{ backgroundColor: '#e0e7ff', width: '44px', height: '44px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5' }}>
              <FileText size={22} />
            </div>
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase' }}>Total Outstanding (RED)</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#dc2626', marginTop: '0.25rem' }}>₹{totalCompanyOutstanding.toLocaleString('en-IN')}</div>
            </div>
            <div style={{ backgroundColor: '#ffe4e6', width: '44px', height: '44px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
              <DollarSign size={22} />
            </div>
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#d97706', textTransform: 'uppercase' }}>Total Overdue Dues</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#d97706', marginTop: '0.25rem' }}>₹{totalCompanyOverdue.toLocaleString('en-IN')}</div>
            </div>
            <div style={{ backgroundColor: '#fef3c7', width: '44px', height: '44px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
              <AlertTriangle size={22} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Breakdown Section */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Salesman-Wise Performance Dashboard</h2>
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>Consolidated balance & collection metrics across all 18 field salesmen</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.4rem 0.75rem', width: '300px' }}>
            <Search size={16} color="#94a3b8" />
            <input
              type="text"
              placeholder="Search salesman by name/phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', fontSize: '0.85rem' }}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#4f46e5', fontWeight: 700 }}>⏳ Loading salesman-wise dashboard...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>#</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Salesman Name</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Code / Mobile</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Assigned Cust.</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Unpaid Invoices</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', fontWeight: 800, color: '#dc2626' }}>Total Outstanding</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', fontWeight: 700, color: '#d97706' }}>Overdue Amount</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Pending Follow-ups</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', fontWeight: 700, color: '#475569', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredSalesmen.map((s, idx) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.875rem 1rem', fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>{idx + 1}</td>
                    <td style={{ padding: '0.875rem 1rem', fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>{s.name}</td>
                    <td style={{ padding: '0.875rem 1rem', fontSize: '0.85rem', color: '#475569' }}>
                      <div>{s.salesman_code}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>📱 {s.mobile}</div>
                    </td>
                    <td style={{ padding: '0.875rem 1rem', fontSize: '0.85rem', fontWeight: 600, color: '#0284c7' }}>{s.total_customers} Customers</td>
                    <td style={{ padding: '0.875rem 1rem', fontSize: '0.85rem', color: '#475569' }}>{s.total_invoices} Invoices</td>
                    <td style={{ padding: '0.875rem 1rem', fontSize: '0.95rem', fontWeight: 800, color: '#dc2626' }}>₹{s.total_outstanding.toLocaleString('en-IN')}</td>
                    <td style={{ padding: '0.875rem 1rem', fontSize: '0.85rem', fontWeight: 700, color: '#d97706' }}>₹{s.overdue_amount.toLocaleString('en-IN')}</td>
                    <td style={{ padding: '0.875rem 1rem', fontSize: '0.85rem', color: '#475569' }}>
                      <span style={{ backgroundColor: s.pending_followups > 0 ? '#fef3c7' : '#f1f5f9', color: s.pending_followups > 0 ? '#d97706' : '#64748b', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 700, fontSize: '0.75rem' }}>
                        {s.pending_followups} Pending
                      </span>
                    </td>
                    <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>
                      <button
                        onClick={() => navigate(`/customers?salesman_code=${encodeURIComponent(s.salesman_code)}`)}
                        style={{ backgroundColor: '#4f46e5', color: '#ffffff', border: 'none', padding: '0.45rem 0.85rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                      >
                        View Accounts <ArrowRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
