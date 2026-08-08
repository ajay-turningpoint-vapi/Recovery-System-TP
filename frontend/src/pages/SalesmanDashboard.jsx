import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import SummaryCard from '../components/SummaryCard';
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
  TrendingUp
} from 'lucide-react';
import api from '../services/api';

// ─── Optimized Overdue Line Chart Component ──────────────────────────────────
function OverdueLineChart({ data, isSalesman }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  if (!data || data.length === 0) return null;

  const maxOverdue = Math.max(...data.map(d => d.overdue_amount), 1);
  const CHART_HEIGHT = 280;
  const PADDING_LEFT = 80;
  const PADDING_RIGHT = 80;
  const PADDING_BOTTOM = 75;
  const PADDING_TOP = 50;

  // Fixed minimum width per salesman to guarantee clear spacing and prevent shrinking
  const MIN_STEP_X = 140; // 140px dedicated width per salesman
  const calculatedWidth = PADDING_LEFT + (data.length - 1) * MIN_STEP_X + PADDING_RIGHT;

  // For single salesman (or very few), use at least 650px container width
  const svgWidth = isSalesman || data.length === 1
    ? 650
    : Math.max(calculatedWidth, 800);

  const totalHeight = CHART_HEIGHT + PADDING_TOP + PADDING_BOTTOM;

  const fmtINR = (v) => `₹${Number(v).toLocaleString('en-IN')}`;

  // Y-axis grid ticks
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(r => Math.round(maxOverdue * r));

  // Compute exact point coordinates
  const points = data.map((s, i) => {
    const x = isSalesman || data.length === 1
      ? PADDING_LEFT + (svgWidth - PADDING_LEFT - PADDING_RIGHT) / 2
      : PADDING_LEFT + i * MIN_STEP_X;
    const y = PADDING_TOP + CHART_HEIGHT - (s.overdue_amount / maxOverdue) * CHART_HEIGHT;
    return { x, y, val: s.overdue_amount, name: s.name, code: s.salesman_code, raw: s };
  });

  // Generate smooth SVG Bezier curve path
  const getSmoothPath = (pts) => {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x - 50} ${pts[0].y} L ${pts[0].x + 50} ${pts[0].y}`;

    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const cx = (p0.x + p1.x) / 2;
      d += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return d;
  };

  const lineD = getSmoothPath(points);
  const areaD = points.length === 1
    ? ''
    : `${lineD} L ${points[points.length - 1].x} ${PADDING_TOP + CHART_HEIGHT} L ${points[0].x} ${PADDING_TOP + CHART_HEIGHT} Z`;

  return (
    <div style={{
      overflowX: 'auto',
      width: '100%',
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      border: '1px solid #f1f5f9',
      paddingBottom: '0.75rem'
    }}>
      <svg
        width={svgWidth}
        height={totalHeight}
        style={{ display: 'block', fontFamily: 'Inter, system-ui, sans-serif', minWidth: `${svgWidth}px` }}
      >
        <defs>
          <linearGradient id="optAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.28" />
            <stop offset="70%" stopColor="#ef4444" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
          </linearGradient>

          <linearGradient id="optLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="50%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#b91c1c" />
          </linearGradient>

          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Horizontal Y-Axis Grid Lines */}
        {ticks.map((tick, idx) => {
          const y = PADDING_TOP + CHART_HEIGHT - (tick / maxOverdue) * CHART_HEIGHT;
          return (
            <g key={idx}>
              <line
                x1={PADDING_LEFT}
                y1={y}
                x2={svgWidth - PADDING_RIGHT}
                y2={y}
                stroke={idx === 0 ? '#cbd5e1' : '#f1f5f9'}
                strokeWidth={idx === 0 ? '1.5' : '1'}
                strokeDasharray={idx === 0 ? 'none' : '4 4'}
              />
              <text
                x={PADDING_LEFT - 14}
                y={y + 4}
                textAnchor="end"
                fontSize="12"
                fill="#64748b"
                fontWeight="600"
              >
                {tick >= 100000 ? `₹${(tick / 100000).toFixed(1)}L` : tick >= 1000 ? `₹${(tick / 1000).toFixed(0)}k` : `₹${tick}`}
              </text>
            </g>
          );
        })}

        {/* Gradient Area under curve */}
        {areaD && <path d={areaD} fill="url(#optAreaGrad)" />}

        {/* Smooth Curved Line */}
        <path
          d={lineD}
          fill="none"
          stroke="url(#optLineGrad)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#glow)"
        />

        {/* Active Hover Column Highlighter */}
        {hoveredIdx !== null && points[hoveredIdx] && (
          <g>
            <line
              x1={points[hoveredIdx].x}
              y1={PADDING_TOP}
              x2={points[hoveredIdx].x}
              y2={PADDING_TOP + CHART_HEIGHT}
              stroke="#ef4444"
              strokeWidth="1.5"
              strokeDasharray="3 3"
              opacity="0.6"
            />
          </g>
        )}

        {/* Interactive Data Points & Labels */}
        {points.map((p, idx) => {
          const isHovered = hoveredIdx === idx;
          const fullName = p.name || p.code;

          return (
            <g
              key={idx}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              style={{ cursor: 'pointer' }}
            >
              {/* Value Pill Badge */}
              <g transform={`translate(${p.x}, ${p.y - 20})`}>
                <rect
                  x="-46"
                  y="-14"
                  width="92"
                  height="24"
                  rx="6"
                  fill={isHovered ? '#dc2626' : '#ffffff'}
                  stroke={isHovered ? '#dc2626' : '#fca5a5'}
                  strokeWidth="1.5"
                  style={{ transition: 'all 0.2s ease' }}
                />
                <text
                  x="0"
                  y="2"
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="800"
                  fill={isHovered ? '#ffffff' : '#dc2626'}
                  style={{ transition: 'all 0.2s ease' }}
                >
                  {fmtINR(p.val)}
                </text>
              </g>

              {/* Point Node Circle */}
              <circle
                cx={p.x}
                cy={p.y}
                r={isHovered ? '8.5' : '6'}
                fill={isHovered ? '#dc2626' : '#ffffff'}
                stroke="#dc2626"
                strokeWidth={isHovered ? '3' : '2.5'}
                style={{ transition: 'all 0.2s ease' }}
              />

              {/* Invisible Hitbox for smooth hover */}
              <rect
                x={p.x - MIN_STEP_X / 2}
                y={PADDING_TOP}
                width={MIN_STEP_X}
                height={CHART_HEIGHT + PADDING_BOTTOM}
                fill="transparent"
              />

              {/* Clean X-Axis Salesman Name */}
              <text
                x={p.x}
                y={PADDING_TOP + CHART_HEIGHT + 28}
                textAnchor="middle"
                fontSize="13"
                fontWeight={isHovered ? '800' : '600'}
                fill={isHovered ? '#dc2626' : '#1e293b'}
                style={{ transition: 'all 0.2s ease' }}
              >
                {fullName}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function SalesmanDashboard() {
  const { user } = useAuth();
  const isSalesman = user?.role === 'SALESMAN';

  const [summary, setSummary] = useState(null);
  const [salesmanData, setSalesmanData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals (kept for compatibility)
  const [activeFollowupCustomer, setActiveFollowupCustomer] = useState(null);
  const [activePaymentCustomer, setActivePaymentCustomer] = useState(null);
  const [activeWhatsappCustomer, setActiveWhatsappCustomer] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [sumRes, salesmanRes] = await Promise.all([
          api.get('/dashboard/summary'),
          api.get('/dashboard/salesman-wise'),
        ]);
        if (sumRes.data.success) setSummary(sumRes.data.data);
        if (salesmanRes.data.success) setSalesmanData(salesmanRes.data.data || []);
      } catch (err) {
        console.error('Error fetching dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const fmtINR = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`;

  // Filter & sort data
  const chartData = isSalesman
    ? salesmanData.filter(s => s.salesman_code === user.salesman_code)
    : [...salesmanData].sort((a, b) => b.overdue_amount - a.overdue_amount);

  return (
    <div className="animate-fade-in">

      {/* ── 1. Summary Cards ─────────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <SummaryCard title="Total Customers"        value={summary?.totalCustomers || 0}                             icon={Users}         color="#0284c7" subtitle="Assigned Customers"     />
        <SummaryCard title="Total Invoices"         value={summary?.totalOutstandingInvoices || 0}                   icon={FileText}      color="#4f46e5" subtitle="Unpaid Invoices"        />
        <SummaryCard title="Total Outstanding"      value={fmtINR(summary?.totalOutstandingAmount)}                  icon={DollarSign}    color="#7c3aed" subtitle="Consolidated Due"        />
        <SummaryCard title="Overdue Amount"         value={fmtINR(summary?.overdueAmount)}                          icon={AlertTriangle} color="#dc2626" subtitle="Passed Due Date"        />
        <SummaryCard title="Due Today"              value={fmtINR(summary?.dueTodayAmount)}                         icon={Clock}         color="#d97706" subtitle="Action Needed Today"    />
        <SummaryCard title="Upcoming Due"           value={fmtINR(summary?.upcomingDueAmount)}                      icon={CalendarCheck} color="#059669" subtitle="Future Payments"        />
        <SummaryCard title="Follow-ups Due Today"   value={summary?.followupsDueToday || 0}                         icon={CalendarCheck} color="#dc2626" subtitle="Scheduled Tasks"        />
        <SummaryCard title="Follow-ups Pending"     value={summary?.followupsPending || 0}                          icon={Clock}         color="#7c3aed" subtitle="Pending Follow-ups"     />
      </div>

      {/* ── 2. Salesman Overdue Line Chart ──────────────────────────────── */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '14px',
        padding: '1.5rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        marginBottom: '1.5rem',
      }}>
        {/* Card header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{
            backgroundColor: '#fef2f2',
            borderRadius: '10px',
            padding: '0.6rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <TrendingUp size={22} color="#dc2626" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              {isSalesman ? 'My Overdue Trend' : 'Salesman-wise Overdue Line Chart'}
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
              {isSalesman
                ? 'Your total overdue amount passing payment due date'
                : 'Salesmen overdue amounts sorted from highest to lowest'}
            </p>
          </div>

          {/* Legend */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <div style={{ width: 14, height: 3, borderRadius: 2, backgroundColor: '#dc2626' }} />
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Overdue Amount</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
            Loading chart data...
          </div>
        ) : chartData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
            No overdue data available.
          </div>
        ) : (
          <OverdueLineChart data={chartData} isSalesman={isSalesman} />
        )}
      </div>

      {/* ── Hidden Modals (kept for compatibility) ──────────────────────── */}
      {activeFollowupCustomer && (
        <FollowupModal customer={activeFollowupCustomer} onClose={() => setActiveFollowupCustomer(null)} onSuccess={() => {}} />
      )}
      {activePaymentCustomer && (
        <PaymentModal customer={activePaymentCustomer} onClose={() => setActivePaymentCustomer(null)} onSuccess={() => {}} />
      )}
      {activeWhatsappCustomer && (
        <WhatsappModal customer={activeWhatsappCustomer} onClose={() => setActiveWhatsappCustomer(null)} />
      )}
    </div>
  );
}
