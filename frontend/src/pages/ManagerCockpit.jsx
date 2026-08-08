import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  AlertTriangle, ShieldAlert, CheckCircle, Clock, Users,
  PhoneCall, ShieldCheck, RefreshCw, FileText, ChevronRight
} from 'lucide-react';

export default function ManagerCockpit() {
  const [loading, setLoading] = useState(true);
  const [exceptions, setExceptions] = useState({
    brokenPromises: [],
    escalatedAccounts: [],
    disputedInvoices: [],
    summaryStats: {
      brokenPromisesCount: 0,
      escalatedCount: 0,
      disputeCount: 0,
      avgRcsScore: 88,
    },
  });

  useEffect(() => {
    fetchCockpitData();
  }, []);

  const fetchCockpitData = async () => {
    setLoading(true);
    try {
      const [fRes, cRes] = await Promise.all([
        api.get('/followups?limit=100'),
        api.get('/customers?limit=100'),
      ]);

      const followups = fRes.data?.data || [];
      const customers = cRes.data?.data || [];

      // Filter broken promises & escalations
      const now = new Date().toISOString().split('T')[0];
      const broken = followups.filter((f) => {
        if (f.promise_to_pay_date) {
          const pDate = new Date(f.promise_to_pay_date).toISOString().split('T')[0];
          return pDate < now;
        }
        return f.status === 'Payment Promised' && f.expected_payment_date && new Date(f.expected_payment_date).toISOString().split('T')[0] < now;
      });

      const escalated = customers.filter(
        (c) => c.escalation_level === 'L1' || c.escalation_level === 'L2' || c.escalation_level === 'L3' || c.escalation_level === 'L4' || c.current_status === 'OVERDUE_8_30'
      );

      const disputes = followups.filter((f) => f.status === 'Dispute');

      // Calculate avg RCS
      const totalRcs = customers.reduce((sum, c) => sum + (c.rcs_score != null ? c.rcs_score : 85), 0);
      const avgRcs = customers.length ? Math.round(totalRcs / customers.length) : 85;

      setExceptions({
        brokenPromises: broken,
        escalatedAccounts: escalated,
        disputedInvoices: disputes,
        summaryStats: {
          brokenPromisesCount: broken.length,
          escalatedCount: escalated.length,
          disputeCount: disputes.length,
          avgRcsScore: avgRcs,
        },
      });
    } catch (err) {
      console.error('Error fetching Cockpit data:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: '1.5rem' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: '1.25rem',
        borderBottom: '1px solid #e2e8f0',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <ShieldAlert size={28} color="#4f46e5" />
            <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
              Manager Cockpit
            </h1>
            <span style={{
              backgroundColor: '#e0e7ff',
              color: '#3730a3',
              fontSize: '0.75rem',
              fontWeight: 800,
              padding: '0.25rem 0.65rem',
              borderRadius: '9999px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Management By Exception
            </span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.35rem', margin: 0 }}>
            Real-time exception dashboard for broken promises, SLA escalations, and high-risk accounts.
          </p>
        </div>

        <button
          onClick={fetchCockpitData}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.6rem 1.1rem',
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            color: '#334155',
            fontWeight: 700,
            fontSize: '0.875rem',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh Cockpit
        </button>
      </div>

      {/* Top KPI Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
        gap: '1.25rem',
        marginBottom: '2rem'
      }}>
        {/* Card 1: Broken Promises */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '1.25rem',
          border: '1px solid #fecaca',
          boxShadow: '0 4px 12px rgba(239, 68, 68, 0.08)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Broken Promises Today
            </span>
            <AlertTriangle size={20} color="#ef4444" />
          </div>
          <div style={{ fontSize: '2.25rem', fontWeight: 900, color: '#0f172a', marginTop: '0.5rem' }}>
            {exceptions.summaryStats.brokenPromisesCount}
          </div>
          <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem', margin: 0 }}>
            Missed commitment dates requiring follow-up
          </p>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '4px', backgroundColor: '#ef4444' }} />
        </div>

        {/* Card 2: SLA Escalations */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '1.25rem',
          border: '1px solid #fde68a',
          boxShadow: '0 4px 12px rgba(245, 158, 11, 0.08)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              SLA Policy Escalations
            </span>
            <ShieldAlert size={20} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '2.25rem', fontWeight: 900, color: '#0f172a', marginTop: '0.5rem' }}>
            {exceptions.summaryStats.escalatedCount}
          </div>
          <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem', margin: 0 }}>
            Accounts in L1 – L4 escalation tiers
          </p>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '4px', backgroundColor: '#f59e0b' }} />
        </div>

        {/* Card 3: Active Disputes */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '1.25rem',
          border: '1px solid #bfdbfe',
          boxShadow: '0 4px 12px rgba(59, 130, 246, 0.08)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Disputed Invoices
            </span>
            <FileText size={20} color="#3b82f6" />
          </div>
          <div style={{ fontSize: '2.25rem', fontWeight: 900, color: '#0f172a', marginTop: '0.5rem' }}>
            {exceptions.summaryStats.disputeCount}
          </div>
          <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem', margin: 0 }}>
            Ledger/material disputes with accounts SLA
          </p>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '4px', backgroundColor: '#3b82f6' }} />
        </div>

        {/* Card 4: Team Avg RCS Score */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '1.25rem',
          border: '1px solid #a7f3d0',
          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.08)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Team Avg RCS Score
            </span>
            <ShieldCheck size={20} color="#10b981" />
          </div>
          <div style={{ fontSize: '2.25rem', fontWeight: 900, color: '#0f172a', marginTop: '0.5rem' }}>
            {exceptions.summaryStats.avgRcsScore} <span style={{ fontSize: '1rem', fontWeight: 500, color: '#94a3b8' }}>/ 100</span>
          </div>
          <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem', margin: 0 }}>
            Risk intelligence commitment score
          </p>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '4px', backgroundColor: '#10b981' }} />
        </div>
      </div>

      {/* Main Content Layout Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem' }}>
        {/* Left Column: Broken Commitments Queue */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={18} color="#ef4444" />
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Broken Commitments Queue
              </h3>
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>
              Immutable Promise Trail
            </span>
          </div>

          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', fontWeight: 600 }}>
              ⏳ Loading exceptions queue...
            </div>
          ) : exceptions.brokenPromises.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
              <CheckCircle size={44} color="#10b981" style={{ margin: '0 auto 0.75rem auto', display: 'block' }} />
              <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                No Broken Promises Today!
              </h4>
              <p style={{ fontSize: '0.825rem', color: '#64748b', marginTop: '0.35rem' }}>
                All customer payment commitment dates are currently on track.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {exceptions.brokenPromises.map((item) => (
                <div key={item.id} style={{
                  padding: '1rem 1.25rem',
                  borderBottom: '1px solid #f1f5f9',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '1rem'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>
                        {item.customer?.customer_name || 'Customer'}
                      </span>
                      <span style={{
                        backgroundColor: '#fee2e2',
                        color: '#991b1b',
                        fontSize: '0.65rem',
                        fontWeight: 900,
                        padding: '0.15rem 0.5rem',
                        borderRadius: '4px',
                        textTransform: 'uppercase'
                      }}>
                        Broken Promise
                      </span>
                    </div>
                    <p style={{ fontSize: '0.825rem', color: '#475569', marginTop: '0.35rem', margin: 0 }}>
                      Promised Amount: <strong style={{ color: '#0f172a' }}>₹{(item.promise_to_pay_amount || item.expected_payment_amount || 0).toLocaleString('en-IN')}</strong> · Promised Date: {item.promise_to_pay_date || item.expected_payment_date ? new Date(item.promise_to_pay_date || item.expected_payment_date).toLocaleDateString() : 'N/A'}
                    </p>
                    <p style={{ fontSize: '0.775rem', color: '#64748b', marginTop: '0.2rem', fontStyle: 'italic', margin: 0 }}>
                      Remark: "{item.remark || 'No remark entered'}"
                    </p>
                  </div>

                  <a
                    href={`tel:${item.customer?.mobile || ''}`}
                    style={{
                      padding: '0.5rem',
                      backgroundColor: '#ecfdf5',
                      color: '#059669',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textDecoration: 'none'
                    }}
                    title="Direct Call Customer"
                  >
                    <PhoneCall size={18} />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Policy Escalation Ladder */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', height: 'fit-content' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldAlert size={18} color="#4f46e5" />
            Escalation Policy Ladder (L0 – L4)
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 800 }}>
                <span style={{ color: '#334155' }}>L0: Salesperson Standard</span>
                <span style={{ color: '#64748b' }}>Before Due</span>
              </div>
              <p style={{ fontSize: '0.725rem', color: '#64748b', marginTop: '0.25rem', margin: 0 }}>
                Reminder, payment link, statement send
              </p>
            </div>

            <div style={{ padding: '0.75rem', backgroundColor: '#fffbeb', borderRadius: '8px', border: '1px solid #fde68a' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 800 }}>
                <span style={{ color: '#92400e' }}>L1: Salesman + Manager</span>
                <span style={{ color: '#d97706' }}>1–7 Days Overdue</span>
              </div>
              <p style={{ fontSize: '0.725rem', color: '#b45309', marginTop: '0.25rem', margin: 0 }}>
                Structured follow-up, reason code review
              </p>
            </div>

            <div style={{ padding: '0.75rem', backgroundColor: '#fff7ed', borderRadius: '8px', border: '1px solid #ffedd5' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 800 }}>
                <span style={{ color: '#9a3412' }}>L2: Sales Manager Action</span>
                <span style={{ color: '#ea580c' }}>8–30 Days / Broken Promise</span>
              </div>
              <p style={{ fontSize: '0.725rem', color: '#c2410c', marginTop: '0.25rem', margin: 0 }}>
                Direct manager call & approved payment plan
              </p>
            </div>

            <div style={{ padding: '0.75rem', backgroundColor: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 800 }}>
                <span style={{ color: '#991b1b' }}>L3: Business Head & Accounts</span>
                <span style={{ color: '#dc2626' }}>30+ Days / High Value</span>
              </div>
              <p style={{ fontSize: '0.725rem', color: '#b91c1c', marginTop: '0.25rem', margin: 0 }}>
                Credit hold, leadership review meeting
              </p>
            </div>

            <div style={{ padding: '0.75rem', backgroundColor: '#0f172a', borderRadius: '8px', color: '#ffffff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 800 }}>
                <span style={{ color: '#ffffff' }}>L4: Legal & Authorised Role</span>
                <span style={{ color: '#94a3b8' }}>Serious Default</span>
              </div>
              <p style={{ fontSize: '0.725rem', color: '#cbd5e1', marginTop: '0.25rem', margin: 0 }}>
                Formal notice & legal review after audit
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
