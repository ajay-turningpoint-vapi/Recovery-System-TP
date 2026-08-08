import React, { useState, useEffect } from 'react';
import StatusBadge from '../components/StatusBadge';
import Pagination from '../components/Pagination';

import {
  Database,
  RotateCw,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import api from '../services/api';



export default function MssqlImport() {
  const [activeTab, setActiveTab] = useState('RUN_IMPORT'); // RUN_IMPORT, HISTORY

  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-12-31');

  // Import Execution State
  const [importing, setImporting] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [error, setError] = useState(null);

  // History State
  const [historyLogs, setHistoryLogs] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);

  // Import Mode
  const [importMode, setImportMode] = useState('outstanding'); // 'outstanding' | 'invoices'

  const fetchHistory = async () => {
    try {
      const res = await api.get('/import/logs', { params: { page, limit: 10 } });
      if (res.data.success) {
        setHistoryLogs(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Error fetching import logs:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'HISTORY') {
      fetchHistory();
    }
  }, [activeTab, page]);

  const handleRunImport = async () => {
    setImporting(true);
    setError(null);
    setLastResult(null);

    try {
      const res = await api.post('/import/mssql', { startDate, endDate, mode: importMode });
      if (res.data.success) {
        setLastResult(res.data);
      }
    } catch (err) {
      console.error('Error executing import:', err);
      setError(err.response?.data?.message || 'MSSQL Import Execution Failed');
    } finally {
      setImporting(false);
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
        {/* Header */}
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
              <Database size={24} color="#4f46e5" /> MSSQL ERP Live Data Sync Hub
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Direct SQL pipeline extracting customer ledgers, sales, and outstanding dues into MariaDB
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setActiveTab('RUN_IMPORT')}
              style={{
                backgroundColor: activeTab === 'RUN_IMPORT' ? '#4f46e5' : '#f1f5f9',
                color: activeTab === 'RUN_IMPORT' ? '#ffffff' : '#475569',
                border: '1px solid #cbd5e1',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '0.85rem'
              }}
            >
              Run Sync Pipeline
            </button>
            <button
              onClick={() => setActiveTab('HISTORY')}
              style={{
                backgroundColor: activeTab === 'HISTORY' ? '#7c3aed' : '#f1f5f9',
                color: activeTab === 'HISTORY' ? '#ffffff' : '#475569',
                border: '1px solid #cbd5e1',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '0.85rem'
              }}
            >
              Sync Execution Logs
            </button>
          </div>
        </div>

        {/* Tab 1: Run Import */}
        {activeTab === 'RUN_IMPORT' && (
          <div>
            <div style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '1.25rem',
              marginBottom: '1.5rem'
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem' }}>
                Incremental Sync Options & Scope Filter
              </h3>

              {/* Import Mode Selector */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div
                  onClick={() => setImportMode('outstanding')}
                  style={{
                    border: `2px solid ${importMode === 'outstanding' ? '#4f46e5' : '#e2e8f0'}`,
                    backgroundColor: importMode === 'outstanding' ? '#f0f0ff' : '#ffffff',
                    borderRadius: '8px', padding: '0.75rem', cursor: 'pointer', transition: 'all 0.15s'
                  }}
                >
                  <div style={{ fontWeight: 700, color: importMode === 'outstanding' ? '#4f46e5' : '#0f172a', fontSize: '0.9rem' }}>
                    📊 Outstanding Balance Mode
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                    Pulls customer ledger closing balances — fast, updates City/State/Email/Salesman
                  </div>
                </div>
                <div
                  onClick={() => setImportMode('invoices')}
                  style={{
                    border: `2px solid ${importMode === 'invoices' ? '#4f46e5' : '#e2e8f0'}`,
                    backgroundColor: importMode === 'invoices' ? '#f0f0ff' : '#ffffff',
                    borderRadius: '8px', padding: '0.75rem', cursor: 'pointer', transition: 'all 0.15s'
                  }}
                >
                  <div style={{ fontWeight: 700, color: importMode === 'invoices' ? '#4f46e5' : '#0f172a', fontSize: '0.9rem' }}>
                    🧾 Invoice + Line Items Mode
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                    Pulls sales vouchers with product line items (slower, use for full invoice detail)
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '0.375rem' }}>
                    Sync Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '0.375rem' }}>
                    Sync End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button
                    onClick={handleRunImport}
                    disabled={importing}
                    style={{
                      backgroundColor: '#059669',
                      color: '#ffffff',
                      border: 'none',
                      width: '100%',
                      padding: '0.625rem 1.25rem',
                      borderRadius: '6px',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)'
                    }}
                  >
                    <RotateCw size={18} className={importing ? 'animate-spin' : ''} />
                    {importing ? 'Connecting & Syncing...' : 'Execute ERP Sync Now'}
                  </button>
                </div>
              </div>
            </div>

            {/* Error Banner */}
            {error && (
              <div style={{
                backgroundColor: '#ffe4e6',
                color: '#be123c',
                border: '1px solid #fecdd3',
                padding: '1rem',
                borderRadius: '8px',
                fontSize: '0.875rem',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <AlertTriangle size={20} />
                <div>
                  <strong>Import Pipeline Failed:</strong> {error}
                </div>
              </div>
            )}

            {/* Execution Result Log Card */}
            {lastResult && (
              <div style={{
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '8px',
                padding: '1.25rem',
                marginBottom: '1.5rem'
              }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#15803d', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <CheckCircle size={20} /> MSSQL Import Executed Successfully
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ backgroundColor: '#ffffff', padding: '0.75rem', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Total Records Processed</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>{lastResult.log?.total_records?.toLocaleString('en-IN')}</div>
                  </div>
                  <div style={{ backgroundColor: '#ffffff', padding: '0.75rem', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>New Invoices Inserted</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#059669' }}>{lastResult.log?.inserted_records?.toLocaleString('en-IN')}</div>
                  </div>
                  <div style={{ backgroundColor: '#ffffff', padding: '0.75rem', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Existing Records Updated</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0284c7' }}>{lastResult.log?.updated_records?.toLocaleString('en-IN')}</div>
                  </div>
                  <div style={{ backgroundColor: '#ffffff', padding: '0.75rem', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Skipped / Errors</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#64748b' }}>{lastResult.log?.error_records || 0}</div>
                  </div>
                </div>

                <div style={{ fontSize: '0.8rem', color: '#15803d', fontWeight: 600 }}>
                  Message: {lastResult.message} | Log ID #{lastResult.log?.id}
                </div>
              </div>
            )}
          </div>
        )}


        {/* Tab 2: History Logs */}
        {activeTab === 'HISTORY' && (

          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Log ID</th>
                  <th>Sync Start Time</th>
                  <th>Sync End Time</th>
                  <th>Total Pulled</th>
                  <th>Inserted</th>
                  <th>Updated</th>
                  <th>Status</th>
                  <th>Executed By</th>
                </tr>
              </thead>
              <tbody>
                {historyLogs.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                      No import logs recorded yet.
                    </td>
                  </tr>
                ) : (
                  historyLogs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ fontWeight: 700, color: '#0284c7' }}>#{log.id}</td>
                      <td style={{ color: '#64748b', fontSize: '0.8rem' }}>{new Date(log.start_time).toLocaleString('en-IN')}</td>
                      <td style={{ color: '#64748b', fontSize: '0.8rem' }}>{log.end_time ? new Date(log.end_time).toLocaleString('en-IN') : 'Running...'}</td>
                      <td style={{ fontWeight: 800, color: '#0f172a' }}>{log.total_records?.toLocaleString('en-IN')}</td>
                      <td style={{ fontWeight: 700, color: '#059669' }}>{log.inserted_records?.toLocaleString('en-IN')}</td>
                      <td style={{ fontWeight: 700, color: '#0284c7' }}>{log.updated_records?.toLocaleString('en-IN')}</td>
                      <td>
                        <StatusBadge status={log.status} />
                      </td>
                      <td style={{ color: '#6d28d9', fontWeight: 700, fontSize: '0.8rem' }}>{log.user?.name || 'System Auto-Sync'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <Pagination pagination={pagination} onPageChange={(p) => setPage(p)} />
          </div>
        )}
      </div>
    </div>
  );
}
