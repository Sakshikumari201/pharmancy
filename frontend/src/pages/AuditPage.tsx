import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { auditService } from '../services/auditService';
import { AuditLog, PaginationMeta } from '../types';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { Pagination } from '../components/common/Pagination';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import {
  ShieldAlert,
  Search,
  Code2,
  Calendar,
  UserCheck,
  Activity,
  FileJson
} from 'lucide-react';

export const AuditPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('');

  // Selected Log for JSON view
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    loadAuditLogs(1);
  }, [actionFilter, entityTypeFilter]);

  const loadAuditLogs = async (page: number = pagination.page) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await auditService.getAuditLogs({
        action: actionFilter || undefined,
        entityType: entityTypeFilter || undefined,
        page,
        limit: 15
      });
      setLogs(res.items);
      setPagination(res.pagination);
    } catch (err: any) {
      setError(err.message || 'Failed to load audit records');
    } finally {
      setIsLoading(false);
    }
  };

  const getActionBadge = (action: string) => {
    if (action.includes('AUTH')) return <Badge variant="purple" size="sm">{action}</Badge>;
    if (action.includes('SALE')) return <Badge variant="info" size="sm">{action}</Badge>;
    if (action.includes('ADJUST') || action.includes('BLOCK')) return <Badge variant="warning" size="sm">{action}</Badge>;
    if (action.includes('PURCHASE')) return <Badge variant="success" size="sm">{action}</Badge>;
    return <Badge variant="neutral" size="sm">{action}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900 border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-emerald-400" />
              Regulatory System Audit Trail
            </h1>
            <Badge variant="purple" size="sm">
              {pagination.total} Logged Events
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Immutable tracking of logins, sales dispatch, batch quarantine holds, and stock adjustments.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 px-3 text-xs text-white focus:border-emerald-500 focus:outline-none"
          >
            <option value="">All Actions</option>
            <option value="AUTH_LOGIN">AUTH_LOGIN</option>
            <option value="SALE_CREATED">SALE_CREATED</option>
            <option value="STOCK_ADJUSTED">STOCK_ADJUSTED</option>
            <option value="PURCHASE_RECEIVED">PURCHASE_RECEIVED</option>
            <option value="BATCH_BLOCKED">BATCH_BLOCKED</option>
            <option value="MEDICINE_CREATED">MEDICINE_CREATED</option>
          </select>
        </div>

        <div>
          <select
            value={entityTypeFilter}
            onChange={(e) => setEntityTypeFilter(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 px-3 text-xs text-white focus:border-emerald-500 focus:outline-none"
          >
            <option value="">All Entity Types</option>
            <option value="Sale">Sale</option>
            <option value="Batch">Batch</option>
            <option value="StockAdjustment">StockAdjustment</option>
            <option value="Purchase">Purchase</option>
            <option value="Medicine">Medicine</option>
            <option value="User">User</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs">
          {error}
        </div>
      )}

      {/* Audit Log Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden shadow-xl">
        {isLoading ? (
          <LoadingSpinner message="Scanning audit log streams..." fullHeight />
        ) : logs.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider font-bold">
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Entity Type</th>
                    <th className="py-3 px-4">User Attribution</th>
                    <th className="py-3 px-4">IP Address</th>
                    <th className="py-3 px-4 text-center">Payload</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {logs.map((log) => (
                    <tr key={log.id} className="text-slate-200 hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                        {new Date(log.createdAt).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </td>
                      <td className="py-3 px-4">{getActionBadge(log.action)}</td>
                      <td className="py-3 px-4 font-mono text-slate-300">{log.entityType}</td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-white block">{log.user?.name || 'System / Auto'}</span>
                        {log.user?.email && (
                          <span className="text-[10px] text-slate-400 font-mono">{log.user.email}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                        {log.ipAddress || '127.0.0.1'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {log.details ? (
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-[11px]"
                          >
                            <Code2 className="h-3 w-3" />
                            Details
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-600">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination pagination={pagination} onPageChange={(p) => loadAuditLogs(p)} />
          </>
        ) : (
          <EmptyState
            icon={ShieldAlert}
            title="No audit logs found"
            description="Operational actions will automatically generate immutable audit entries."
          />
        )}
      </div>

      {/* JSON Viewer Modal */}
      <Modal
        isOpen={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        title="Audit Event Payload Details"
        subtitle={`Action: ${selectedLog?.action} (${selectedLog?.entityType})`}
        maxWidth="lg"
      >
        {selectedLog && (
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px]">
              <div>
                <span className="text-slate-500 block">Event ID:</span>
                <span className="font-mono text-slate-300">{selectedLog.id}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Entity ID:</span>
                <span className="font-mono text-slate-300">{selectedLog.entityId || 'N/A'}</span>
              </div>
            </div>

            <div>
              <span className="text-slate-400 font-bold block mb-1">Raw JSON Payload</span>
              <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 font-mono text-xs overflow-x-auto max-h-[350px]">
                {(() => {
                  try {
                    return JSON.stringify(JSON.parse(selectedLog.details || '{}'), null, 2);
                  } catch {
                    return selectedLog.details;
                  }
                })()}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
