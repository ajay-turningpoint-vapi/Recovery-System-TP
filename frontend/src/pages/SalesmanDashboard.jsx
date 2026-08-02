import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SummaryCard from '../components/SummaryCard';
import StatusBadge from '../components/StatusBadge';
import Pagination from '../components/Pagination';
import FollowupModal from '../components/FollowupModal';
import PaymentModal from '../components/PaymentModal';
import WhatsappModal from '../components/WhatsappModal';

import {
  Users,
  FileText,
  DollarSign,
  AlertTriangle,
  Clock,
  CalendarCheck,
  Search,
  Filter,
  ArrowUpDown,
  MessageSquare,
  PlusCircle,
  Eye,
  CreditCard
} from 'lucide-react';
import api from '../services/api';

export default function SalesmanDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [summary, setSummary] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState(null);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL'); // ALL, OVERDUE, DUE_TODAY, HAS_OUTSTANDING
  const [sortBy, setSortBy] = useState('highest_outstanding');
  const [page, setPage] = useState(1);

  // Active Modals state
  const [activeFollowupCustomer, setActiveFollowupCustomer] = useState(null);
  const [activePaymentCustomer, setActivePaymentCustomer] = useState(null);
  const [activeWhatsappCustomer, setActiveWhatsappCustomer] = useState(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [sumRes, custRes] = await Promise.all([
        api.get('/dashboard/summary'),
        api.get('/dashboard/customers', {
          params: {
            search,
            filterType: filterType === 'ALL' ? undefined : filterType,
            sortBy,
            page,
            limit: 15
          }
        })
      ]);

      if (sumRes.data.success) {
        setSummary(sumRes.data.data);
      }
      if (custRes.data.success) {
        setCustomers(custRes.data.data);
        setPagination(custRes.data.pagination);
      }
    } catch (err) {
      console.error('Error fetching dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [search, filterType, sortBy, page]);

  return (
    <div className="animate-fade-in">
      {/* 1. Summary Cards Header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <SummaryCard
          title="Total Customers"
          value={summary?.totalCustomers || 0}
          icon={Users}
          color="#38bdf8"
          subtitle="Assigned Customers"
        />
        <SummaryCard
          title="Total Invoices"
          value={summary?.totalOutstandingInvoices || 0}
          icon={FileText}
          color="#6366f1"
          subtitle="Unpaid Invoices"
        />
        <SummaryCard
          title="Total Outstanding"
          value={`₹${(summary?.totalOutstandingAmount || 0).toLocaleString('en-IN')}`}
          icon={DollarSign}
          color="#8b5cf6"
          subtitle="Consolidated Customer Due"
        />
        <SummaryCard
          title="Overdue Amount"
          value={`₹${(summary?.overdueAmount || 0).toLocaleString('en-IN')}`}
          icon={AlertTriangle}
          color="#f43f5e"
          subtitle="Passed Due Date"
        />
        <SummaryCard
          title="Due Today"
          value={`₹${(summary?.dueTodayAmount || 0).toLocaleString('en-IN')}`}
          icon={Clock}
          color="#f59e0b"
          subtitle="Action Needed Today"
        />
        <SummaryCard
          title="Upcoming Due"
          value={`₹${(summary?.upcomingDueAmount || 0).toLocaleString('en-IN')}`}
          icon={CalendarCheck}
          color="#10b981"
          subtitle="Future Payments"
        />
        <SummaryCard
          title="Follow-ups Due Today"
          value={summary?.followupsDueToday || 0}
          icon={CalendarCheck}
          color="#f43f5e"
          subtitle="Scheduled Tasks"
        />
        <SummaryCard
          title="Follow-ups Pending"
          value={summary?.followupsPending || 0}
          icon={Clock}
          color="#a78bfa"
          subtitle="Pending Follow-ups"
        />
      </div>

      {/* 2. Customer List Header & Controls */}
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
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc' }}>
              Consolidated Customer Outstanding List
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              Real-time invoice dues, last remarks, and next follow-up dates
            </p>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }}>
            {/* Search Box */}
            <div style={{ position: 'relative', width: '220px' }}>
              <input
                type="text"
                placeholder="Search Customer, Code, Mobile..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                style={{ width: '100%', paddingLeft: '2.2rem' }}
              />
              <Search size={16} color="#64748b" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
            </div>

            {/* Quick Status Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Filter size={16} color="#94a3b8" />
              <select
                value={filterType}
                onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
              >
                <option value="ALL">All Customers</option>
                <option value="OVERDUE">Overdue Customers</option>
                <option value="DUE_TODAY">Due Today Customers</option>
                <option value="HAS_OUTSTANDING">Has Outstanding</option>
              </select>
            </div>

            {/* Sorting Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ArrowUpDown size={16} color="#94a3b8" />
              <select
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
              >
                <option value="highest_outstanding">Highest Outstanding</option>
                <option value="oldest_due">Oldest Due Date</option>
                <option value="customer_name">Customer Name (A-Z)</option>
                <option value="next_followup_date">Next Follow-up Date</option>
              </select>
            </div>
          </div>
        </div>

        {/* 3. Consolidated Table */}
        <div style={{ overflowX: 'auto' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Customer Name & Code</th>
                <th>Mobile Number</th>
                <th>Invoices</th>
                <th>Total Outstanding</th>
                <th>Overdue Amount</th>
                <th>Oldest Due</th>
                <th>Last Follow-up</th>
                <th>Next Follow-up</th>
                <th>Last Remark</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                    Loading customer outstanding records...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                    No matching customer records found.
                  </td>
                </tr>
              ) : (
                customers.map((cust) => (
                  <tr key={cust.id}>
                    <td>
                      <button
                        onClick={() => navigate(`/customers/${cust.id}`)}
                        style={{
                          background: 'transparent',
                          textAlign: 'left',
                          display: 'block'
                        }}
                      >
                        <div style={{ fontWeight: 700, color: '#38bdf8', fontSize: '0.9rem' }}>
                          {cust.customer_name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          Code: {cust.customer_code}
                        </div>
                      </button>
                    </td>
                    <td style={{ fontWeight: 500, color: '#f8fafc' }}>
                      {cust.mobile || 'N/A'}
                    </td>
                    <td>
                      <span style={{
                        backgroundColor: '#334155',
                        color: '#f8fafc',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        fontWeight: 600
                      }}>
                        {cust.total_invoices} Inv
                      </span>
                    </td>
                    <td style={{ fontWeight: 800, color: cust.total_outstanding > 0 ? '#f8fafc' : '#34d399' }}>
                      ₹{cust.total_outstanding.toLocaleString('en-IN')}
                    </td>
                    <td style={{ fontWeight: 700, color: cust.overdue_amount > 0 ? '#f43f5e' : '#94a3b8' }}>
                      ₹{cust.overdue_amount.toLocaleString('en-IN')}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                      {cust.oldest_due_date ? new Date(cust.oldest_due_date).toLocaleDateString('en-IN') : 'N/A'}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                      {cust.last_followup_date ? new Date(cust.last_followup_date).toLocaleDateString('en-IN') : 'None'}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: '#fbbf24', fontWeight: 600 }}>
                      {cust.next_followup_date ? new Date(cust.next_followup_date).toLocaleDateString('en-IN') : 'Not Set'}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: '#cbd5e1', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {cust.last_followup_remark || 'N/A'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        {/* Open Customer Dashboard */}
                        <button
                          onClick={() => navigate(`/customers/${cust.id}`)}
                          title="Open Customer Dashboard"
                          style={{ backgroundColor: '#334155', color: '#38bdf8', padding: '0.375rem 0.5rem', borderRadius: '4px' }}
                        >
                          <Eye size={16} />
                        </button>

                        {/* Add Follow-up */}
                        <button
                          onClick={() => setActiveFollowupCustomer(cust)}
                          title="Add Follow-up"
                          style={{ backgroundColor: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', padding: '0.375rem 0.5rem', borderRadius: '4px' }}
                        >
                          <PlusCircle size={16} />
                        </button>

                        {/* Collection Entry */}
                        <button
                          onClick={() => setActivePaymentCustomer(cust)}
                          title="Record Collection"
                          style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#34d399', padding: '0.375rem 0.5rem', borderRadius: '4px' }}
                        >
                          <CreditCard size={16} />
                        </button>

                        {/* WhatsApp Communication */}
                        <button
                          onClick={() => setActiveWhatsappCustomer(cust)}
                          title="Send WhatsApp Reminder"
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

        {/* Pagination Controls */}
        <Pagination pagination={pagination} onPageChange={(p) => setPage(p)} />
      </div>

      {/* Dynamic Action Modals */}
      {activeFollowupCustomer && (
        <FollowupModal
          customer={activeFollowupCustomer}
          onClose={() => setActiveFollowupCustomer(null)}
          onSuccess={() => fetchDashboardData()}
        />
      )}

      {activePaymentCustomer && (
        <PaymentModal
          customer={activePaymentCustomer}
          onClose={() => setActivePaymentCustomer(null)}
          onSuccess={() => fetchDashboardData()}
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
