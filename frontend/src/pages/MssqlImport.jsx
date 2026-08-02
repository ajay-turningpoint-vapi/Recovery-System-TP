import React, { useState, useEffect } from 'react';
import StatusBadge from '../components/StatusBadge';
import Pagination from '../components/Pagination';

import {
  Database,
  Play,
  RotateCw,
  Sliders,
  History,
  CheckCircle,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Save,
  Calendar
} from 'lucide-react';
import api from '../services/api';

export default function MssqlImport() {
  const [activeTab, setActiveTab] = useState('RUN_IMPORT'); // RUN_IMPORT, CONFIG, HISTORY

  // Import Date Filter State
  const [startDate, setStartDate] = useState('2026-06-01');
  const [endDate, setEndDate] = useState('2026-08-01');

  // Import Execution State
  const [importing, setImporting] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [error, setError] = useState(null);

  // MSSQL Configuration State
  const [config, setConfig] = useState({
    host: 'localhost',
    port: 1433,
    database_name: 'BUSY_ERP_DB',
    username: 'sa',
    password: '',
    encrypt: false,
    trust_server_certificate: true,
    import_sql: `SELECT VOU_NO, VOUCHER_DATE, PARTY, ALIAS, ADDRESS, CITY, STATE, GSTIN, MOBILE, SALESMAN, ITEM_NAME, HSN, QTY, RATE, TAX, DISC, TOTAL_AMOUNT, DUE_DATE FROM VOUCHERS WHERE VOUCHER_DATE >= @startdate@ AND VOUCHER_DATE <= @enddate@`
  });
  const [configSaved, setConfigSaved] = useState(false);

  // Import History State
  const [history, setHistory] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);

  const fetchConfig = async () => {
    try {
      const res = await api.get('/import/config');
      if (res.data.success && res.data.config) {
        setConfig(res.data.config);
      }
    } catch (err) {
      console.error('Error fetching MSSQL config:', err);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await api.get('/import/history', { params: { page, limit: 15 } });
      if (res.data.success) {
        setHistory(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Error fetching import history:', err);
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchHistory();
  }, [page]);

  const handleRunImport = async (e) => {
    e.preventDefault();
    setImporting(true);
    setError(null);
    setLastResult(null);

    try {
      const res = await api.post('/import/mssql', { startDate, endDate });
      if (res.data.success) {
        setLastResult(res.data);
        fetchHistory();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'MSSQL Import execution failed');
    } finally {
      setImporting(false);
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put('/import/config', config);
      if (res.data.success) {
        setConfigSaved(true);
        setTimeout(() => setConfigSaved(false), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update MSSQL config');
    }
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
        {/* Module Header */}
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
              <Database size={24} color="#6366f1" /> MSSQL ERP Data Import Module
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              Import vouchers, customer ledgers, salesman mappings, and invoice dues into MariaDB
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setActiveTab('RUN_IMPORT')}
              style={{
                backgroundColor: activeTab === 'RUN_IMPORT' ? '#6366f1' : '#0f172a',
                color: activeTab === 'RUN_IMPORT' ? '#ffffff' : '#94a3b8',
                border: '1px solid #334155',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '0.85rem'
              }}
            >
              Run Import
            </button>
            <button
              onClick={() => setActiveTab('CONFIG')}
              style={{
                backgroundColor: activeTab === 'CONFIG' ? '#38bdf8' : '#0f172a',
                color: activeTab === 'CONFIG' ? '#000000' : '#94a3b8',
                border: '1px solid #334155',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '0.85rem'
              }}
            >
              MSSQL Connection & SQL Query
            </button>
            <button
              onClick={() => setActiveTab('HISTORY')}
              style={{
                backgroundColor: activeTab === 'HISTORY' ? '#8b5cf6' : '#0f172a',
                color: activeTab === 'HISTORY' ? '#ffffff' : '#94a3b8',
                border: '1px solid #334155',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '0.85rem'
              }}
            >
              Import History Logs ({history.length})
            </button>
          </div>
        </div>

        {/* Tab 1: Run Import */}
        {activeTab === 'RUN_IMPORT' && (
          <div>
            {error && (
              <div style={{ backgroundColor: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e', border: '1px solid rgba(244, 63, 94, 0.3)', padding: '0.875rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleRunImport} style={{
              backgroundColor: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '1.5rem',
              maxWidth: '650px',
              marginBottom: '1.5rem'
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={18} color="#38bdf8" /> Configure Date Range Filter
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '0.375rem' }}>
                    Start Date (@startdate@)
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '0.375rem' }}>
                    End Date (@enddate@)
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{
                backgroundColor: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.2)',
                padding: '0.75rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                color: '#cbd5e1',
                marginBottom: '1.25rem'
              }}>
                ℹ️ The system will connect to MSSQL, run the configured query substituting <code>@startdate@</code> and <code>@enddate@</code>, validate invoices, update existing records, and skip duplicates.
              </div>

              <button
                type="submit"
                disabled={importing}
                style={{
                  backgroundColor: '#6366f1',
                  color: '#ffffff',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)'
                }}
              >
                <Play size={18} />
                {importing ? 'Processing MSSQL Sync...' : 'Execute MSSQL Import'}
              </button>
            </form>

            {/* Last Execution Summary Card */}
            {lastResult && (
              <div style={{
                backgroundColor: '#0f172a',
                border: '1px solid #10b981',
                borderRadius: '12px',
                padding: '1.5rem',
                maxWidth: '650px'
              }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#34d399', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle size={20} /> Import Execution Completed
                </h3>

                {lastResult.warning && (
                  <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '1rem' }}>
                    ⚠️ {lastResult.warning}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', textAlign: 'center' }}>
                  <div style={{ backgroundColor: '#1e293b', padding: '0.75rem', borderRadius: '6px' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Total Processed</span>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc' }}>
                      {lastResult.log?.total_records || 0}
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#1e293b', padding: '0.75rem', borderRadius: '6px' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Inserted Records</span>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#34d399' }}>
                      {lastResult.log?.inserted_records || 0}
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#1e293b', padding: '0.75rem', borderRadius: '6px' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Updated Records</span>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#38bdf8' }}>
                      {lastResult.log?.updated_records || 0}
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#1e293b', padding: '0.75rem', borderRadius: '6px' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Failed Records</span>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f43f5e' }}>
                      {lastResult.log?.failed_records || 0}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: MSSQL Config & Query Editor */}
        {activeTab === 'CONFIG' && (
          <form onSubmit={handleSaveConfig} style={{ maxWidth: '720px' }}>
            {configSaved && (
              <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1rem' }}>
                MSSQL connection details & import query saved securely!
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '0.375rem' }}>
                  MSSQL Server Host / IP
                </label>
                <input
                  type="text"
                  required
                  value={config.host}
                  onChange={(e) => setConfig({ ...config, host: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '0.375rem' }}>
                  Port
                </label>
                <input
                  type="number"
                  required
                  value={config.port}
                  onChange={(e) => setConfig({ ...config, port: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '0.375rem' }}>
                  ERP Database Name
                </label>
                <input
                  type="text"
                  required
                  value={config.database_name}
                  onChange={(e) => setConfig({ ...config, database_name: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '0.375rem' }}>
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={config.username}
                  onChange={(e) => setConfig({ ...config, username: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '0.375rem' }}>
                  Password (Encrypted in env/storage)
                </label>
                <input
                  type="password"
                  value={config.password}
                  placeholder="••••••••"
                  onChange={(e) => setConfig({ ...config, password: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '0.375rem' }}>
                Configurable MSSQL SELECT Query (Must include @startdate@ and @enddate@)
              </label>
              <textarea
                rows={5}
                required
                value={config.import_sql}
                onChange={(e) => setConfig({ ...config, import_sql: e.target.value })}
                style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                style={{
                  backgroundColor: '#38bdf8',
                  color: '#000000',
                  padding: '0.625rem 1.5rem',
                  borderRadius: '6px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <Save size={16} /> Save Configuration
              </button>
            </div>
          </form>
        )}

        {/* Tab 3: Import History */}
        {activeTab === 'HISTORY' && (
          <div>
            <div style={{ overflowX: 'auto' }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Execution ID</th>
                    <th>Started At</th>
                    <th>Completed At</th>
                    <th>Total Records</th>
                    <th>Inserted</th>
                    <th>Updated</th>
                    <th>Failed</th>
                    <th>Status</th>
                    <th>Log Details</th>
                  </tr>
                </thead>
                <tbody>
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                        No import history recorded yet.
                      </td>
                    </tr>
                  ) : (
                    history.map((log) => (
                      <tr key={log.id}>
                        <td style={{ fontWeight: 700, color: '#38bdf8' }}>#{log.id}</td>
                        <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                          {new Date(log.started_at).toLocaleString('en-IN')}
                        </td>
                        <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                          {log.completed_at ? new Date(log.completed_at).toLocaleString('en-IN') : 'In Progress'}
                        </td>
                        <td style={{ fontWeight: 700, color: '#f8fafc' }}>{log.total_records}</td>
                        <td style={{ color: '#34d399', fontWeight: 600 }}>{log.inserted_records}</td>
                        <td style={{ color: '#38bdf8', fontWeight: 600 }}>{log.updated_records}</td>
                        <td style={{ color: '#f43f5e', fontWeight: 600 }}>{log.failed_records}</td>
                        <td>
                          <StatusBadge status={log.status} />
                        </td>
                        <td style={{ color: '#cbd5e1', fontSize: '0.8rem', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {log.error_message || 'Completed cleanly'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <Pagination pagination={pagination} onPageChange={(p) => setPage(p)} />
          </div>
        )}
      </div>
    </div>
  );
}
