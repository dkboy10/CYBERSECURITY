import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  ShieldAlert,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  UserCheck,
  AlertTriangle,
  FileText,
  Download,
  Plus,
  Send,
  Lock,
  MessageSquare,
  RefreshCw,
  Radio,
  FileCode,
  Bell,
  Eye,
  X,
  ExternalLink,
} from 'lucide-react';
import type {
  Incident,
  IncidentStatus,
  IncidentType,
  Severity,
  AuditLogEntry,
  NotificationEntry,
  AnalystUser,
} from '../types/security.ts';

interface AdminDashboardProps {
  currentUser: AnalystUser | null;
  onLogout: () => void;
  navigate: (route: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  onLogout,
  navigate,
}) => {
  // Navigation Tabs: 'incidents' | 'audit' | 'notifications' | 'settings'
  const [activeTab, setActiveTab] = useState<'incidents' | 'audit' | 'notifications' | 'settings'>('incidents');

  // Incidents Data
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL');

  // Detail Modal / Triage Drawer
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  // Modal Action Forms
  const [actionType, setActionType] = useState<'status' | 'assign' | 'request_info' | 'internal_note' | 'public_response' | null>(null);
  const [statusVal, setStatusVal] = useState<IncidentStatus>('INVESTIGATING');
  const [assigneeVal, setAssigneeVal] = useState('');
  const [assignTeamVal, setAssignTeamVal] = useState('');
  const [requestInfoVal, setRequestInfoVal] = useState('');
  const [internalNoteVal, setInternalNoteVal] = useState('');
  const [publicResponseVal, setPublicResponseVal] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Audit Logs Data
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [notifications, setNotifications] = useState<NotificationEntry[]>([]);

  // Webhook Test State
  const [webhookTesting, setWebhookTesting] = useState(false);
  const [webhookResult, setWebhookResult] = useState<string | null>(null);

  // Real-time WebSocket connection
  const [wsConnected, setWsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  // Fetch initial incidents
  const fetchIncidents = async () => {
    try {
      const res = await fetch('/api/admin/incidents');
      if (res.status === 401) {
        onLogout();
        return;
      }
      const data = await res.json();
      setIncidents(data.incidents || []);
      // If modal is open, refresh selected incident
      if (selectedIncident) {
        const updated = (data.incidents || []).find((i: Incident) => i.id === selectedIncident.id);
        if (updated) setSelectedIncident(updated);
      }
    } catch (e: any) {
      setError(e.message || 'Error fetching incidents');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch('/api/admin/audit-logs');
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
      }
    } catch (e) {
      console.error('Failed to load audit logs:', e);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/admin/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (e) {
      console.error('Failed to load notifications:', e);
    }
  };

  useEffect(() => {
    fetchIncidents();
    fetchAuditLogs();
    fetchNotifications();
  }, []);

  // WebSocket for Real-time Dashboard Updates
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
        ws.send(JSON.stringify({ action: 'subscribe_admin' }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'admin_incident_update') {
            fetchIncidents();
            fetchAuditLogs();
            fetchNotifications();
          }
        } catch (e) {
          console.error('Error handling ws message:', e);
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
      };

      ws.onerror = () => {
        setWsConnected(false);
      };
    } catch (e) {
      console.warn('WebSocket connection not initialized:', e);
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  // Metric Computations
  const totalOpen = incidents.filter((i) => i.status !== 'RESOLVED' && i.status !== 'CLOSED').length;
  const criticalCount = incidents.filter((i) => i.severity === 'Critical' && i.status !== 'RESOLVED' && i.status !== 'CLOSED').length;
  const investigatingCount = incidents.filter((i) => i.status === 'INVESTIGATING').length;
  const awaitingReporterCount = incidents.filter((i) => i.status === 'WAITING FOR REPORTER').length;
  const resolvedCount = incidents.filter((i) => i.status === 'RESOLVED' || i.status === 'CLOSED').length;

  // Filtered incidents
  const filteredIncidents = incidents.filter((inc) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        inc.id.toLowerCase().includes(q) ||
        inc.title.toLowerCase().includes(q) ||
        inc.description.toLowerCase().includes(q) ||
        inc.affectedService.toLowerCase().includes(q) ||
        inc.contactEmail.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (filterSeverity !== 'ALL' && inc.severity !== filterSeverity) return false;
    if (filterStatus !== 'ALL' && inc.status !== filterStatus) return false;
    if (filterType !== 'ALL' && inc.type !== filterType) return false;
    return true;
  });

  // Action Handlers
  const handleStatusChange = async (targetStatus: IncidentStatus) => {
    if (!selectedIncident) return;
    setIsSubmittingAction(true);
    setActionFeedback(null);

    try {
      const res = await fetch(`/api/admin/incidents/${selectedIncident.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSelectedIncident(data.incident);
      setActionFeedback(`Status updated to ${targetStatus}`);
      fetchIncidents();
      fetchAuditLogs();
      setActionType(null);
    } catch (e: any) {
      setActionFeedback(e.message || 'Status update failed.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncident) return;
    setIsSubmittingAction(true);

    try {
      const res = await fetch(`/api/admin/incidents/${selectedIncident.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignedAnalyst: assigneeVal,
          assignedTeam: assignTeamVal || selectedIncident.assignedTeam,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSelectedIncident(data.incident);
      setActionFeedback('Assignment saved successfully.');
      fetchIncidents();
      fetchAuditLogs();
      setActionType(null);
    } catch (e: any) {
      setActionFeedback(e.message || 'Assignment failed.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleRequestInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncident || !requestInfoVal.trim()) return;
    setIsSubmittingAction(true);

    try {
      const res = await fetch(`/api/admin/incidents/${selectedIncident.id}/request-info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: requestInfoVal.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSelectedIncident(data.incident);
      setActionFeedback('Information request dispatched to reporter.');
      setRequestInfoVal('');
      fetchIncidents();
      fetchAuditLogs();
      fetchNotifications();
      setActionType(null);
    } catch (e: any) {
      setActionFeedback(e.message || 'Failed to dispatch request.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleInternalNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncident || !internalNoteVal.trim()) return;
    setIsSubmittingAction(true);

    try {
      const res = await fetch(`/api/admin/incidents/${selectedIncident.id}/internal-note`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: internalNoteVal.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // Append note locally and refresh
      selectedIncident.internalNotes.unshift(data.note);
      setActionFeedback('Confidential internal note recorded.');
      setInternalNoteVal('');
      fetchIncidents();
      fetchAuditLogs();
      setActionType(null);
    } catch (e: any) {
      setActionFeedback(e.message || 'Failed to save internal note.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handlePublicResponseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncident) return;
    setIsSubmittingAction(true);

    try {
      const res = await fetch(`/api/admin/incidents/${selectedIncident.id}/public-response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicResponse: publicResponseVal.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSelectedIncident(data.incident);
      setActionFeedback('Public response published.');
      fetchIncidents();
      fetchAuditLogs();
      fetchNotifications();
      setActionType(null);
    } catch (e: any) {
      setActionFeedback(e.message || 'Failed to publish response.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleTestWebhook = async () => {
    setWebhookTesting(true);
    setWebhookResult(null);
    try {
      const res = await fetch('/api/admin/test-webhook', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Webhook test failed');
      }
      setWebhookResult(data.message);
      fetchAuditLogs();
    } catch (e: any) {
      setWebhookResult(`Error: ${e.message}`);
    } finally {
      setWebhookTesting(false);
    }
  };

  const openIncidentModal = (inc: Incident) => {
    setSelectedIncident(inc);
    setStatusVal(inc.status);
    setAssigneeVal(inc.assignedAnalyst || (currentUser ? currentUser.displayName : ''));
    setAssignTeamVal(inc.assignedTeam || '');
    setPublicResponseVal(inc.publicResponse || '');
    setActionType(null);
    setActionFeedback(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10 space-y-8">
      {/* Top Header & Session Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
            <Shield className="w-3.5 h-3.5" />
            <span>OPERATIONAL SOC CONSOLE · TIER 1-3 ACCESS</span>
            <span className="text-slate-600">|</span>
            <span className="flex items-center gap-1 text-slate-400 font-sans">
              <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-400' : 'bg-slate-600'}`}></span>
              <span>{wsConnected ? 'Real-Time Sync Active' : 'Connecting WebSocket...'}</span>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-1">
            Incident Response & Operations
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
            <span className="text-slate-400 block text-[10px] uppercase">Active Analyst:</span>
            <span className="text-slate-100 font-semibold">{currentUser?.displayName || 'Lead Analyst'}</span>
          </div>
          <button
            onClick={onLogout}
            className="px-3.5 py-2 text-xs font-medium text-slate-400 hover:text-rose-400 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors"
          >
            End Session
          </button>
        </div>
      </div>

      {/* 5 KPI Metric Cards as specified */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Open Incidents</div>
          <div className="text-2xl font-bold font-mono text-slate-100 mt-1 tabular-nums">{totalOpen}</div>
          <div className="text-[10px] text-slate-500 mt-1">Unresolved intake</div>
        </div>

        <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30">
          <div className="text-[11px] font-medium text-rose-300 uppercase tracking-wider flex items-center justify-between">
            <span>Critical Incidents</span>
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
          </div>
          <div className="text-2xl font-bold font-mono text-rose-300 mt-1 tabular-nums">{criticalCount}</div>
          <div className="text-[10px] text-rose-400/80 mt-1">Immediate P1 escalation</div>
        </div>

        <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/30">
          <div className="text-[11px] font-medium text-cyan-300 uppercase tracking-wider">Under Investigation</div>
          <div className="text-2xl font-bold font-mono text-cyan-300 mt-1 tabular-nums">{investigatingCount}</div>
          <div className="text-[10px] text-cyan-400/80 mt-1">Active forensic triage</div>
        </div>

        <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30">
          <div className="text-[11px] font-medium text-amber-300 uppercase tracking-wider">Awaiting Reporter</div>
          <div className="text-2xl font-bold font-mono text-amber-300 mt-1 tabular-nums">{awaitingReporterCount}</div>
          <div className="text-[10px] text-amber-400/80 mt-1">Pending clarification</div>
        </div>

        <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 col-span-2 sm:col-span-1">
          <div className="text-[11px] font-medium text-emerald-300 uppercase tracking-wider">Resolved Cases</div>
          <div className="text-2xl font-bold font-mono text-emerald-300 mt-1 tabular-nums">{resolvedCount}</div>
          <div className="text-[10px] text-emerald-400/80 mt-1">Mitigated & closed</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 text-xs">
        <button
          onClick={() => setActiveTab('incidents')}
          className={`px-4 py-2.5 font-medium transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'incidents'
              ? 'border-cyan-400 text-cyan-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Incident Queue ({incidents.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('audit');
            fetchAuditLogs();
          }}
          className={`px-4 py-2.5 font-medium transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'audit'
              ? 'border-cyan-400 text-cyan-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileCode className="w-4 h-4" />
          <span>Immutable Audit Log ({auditLogs.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('notifications');
            fetchNotifications();
          }}
          className={`px-4 py-2.5 font-medium transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'notifications'
              ? 'border-cyan-400 text-cyan-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Dispatched Notifications ({notifications.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2.5 font-medium transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'settings'
              ? 'border-cyan-400 text-cyan-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Radio className="w-4 h-4" />
          <span>Discord & Integrations</span>
        </button>
      </div>

      {/* TAB 1: INCIDENTS TABLE */}
      {activeTab === 'incidents' && (
        <div className="space-y-4">
          {/* Search & Filter Toolbar */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div className="sm:col-span-1">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search ID, title, email, host..."
                  className="w-full pl-8 pr-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 font-mono text-xs"
                />
              </div>
            </div>

            <div>
              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-400"
              >
                <option value="ALL">All Severities</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-400"
              >
                <option value="ALL">All Statuses</option>
                <option value="RECEIVED">RECEIVED</option>
                <option value="UNDER REVIEW">UNDER REVIEW</option>
                <option value="INVESTIGATING">INVESTIGATING</option>
                <option value="MITIGATION">MITIGATION</option>
                <option value="WAITING FOR REPORTER">WAITING FOR REPORTER</option>
                <option value="RESOLVED">RESOLVED</option>
                <option value="CLOSED">CLOSED</option>
              </select>
            </div>

            <div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-400"
              >
                <option value="ALL">All Incident Types</option>
                <option value="Account Compromise">Account Compromise</option>
                <option value="Phishing">Phishing</option>
                <option value="Malware">Malware</option>
                <option value="Vulnerability">Vulnerability</option>
                <option value="Suspicious Login">Suspicious Login</option>
                <option value="Website Attack">Website Attack</option>
                <option value="Discord/Community Attack">Discord/Community Attack</option>
                <option value="Data Exposure">Data Exposure</option>
                <option value="Impersonation">Impersonation</option>
                <option value="DDoS">DDoS</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="soc-glass-panel rounded-2xl border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-medium">
                    <th className="py-3 px-4 uppercase tracking-wider font-sans">Report ID</th>
                    <th className="py-3 px-3 uppercase tracking-wider font-sans">Severity</th>
                    <th className="py-3 px-3 uppercase tracking-wider font-sans">Incident Type</th>
                    <th className="py-3 px-4 uppercase tracking-wider font-sans">Title</th>
                    <th className="py-3 px-3 uppercase tracking-wider font-sans">Status</th>
                    <th className="py-3 px-3 uppercase tracking-wider font-sans">Created</th>
                    <th className="py-3 px-4 uppercase tracking-wider font-sans">Assigned Analyst</th>
                    <th className="py-3 px-3 text-right uppercase tracking-wider font-sans">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {filteredIncidents.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500 italic">
                        No incidents matched the selected filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredIncidents.map((inc) => (
                      <tr
                        key={inc.id}
                        onClick={() => openIncidentModal(inc)}
                        className="hover:bg-slate-900/60 transition-colors cursor-pointer group"
                      >
                        <td className="py-3.5 px-4 font-mono font-semibold text-cyan-300">
                          {inc.id}
                        </td>
                        <td className="py-3.5 px-3">
                          <span
                            className={`font-semibold ${
                              inc.severity === 'Critical'
                                ? 'text-rose-400'
                                : inc.severity === 'High'
                                ? 'text-amber-400'
                                : inc.severity === 'Medium'
                                ? 'text-sky-400'
                                : 'text-slate-400'
                            }`}
                          >
                            {inc.severity}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-slate-300 font-medium">
                          {inc.type}
                        </td>
                        <td className="py-3.5 px-4 text-slate-100 max-w-xs truncate font-medium">
                          {inc.title}
                        </td>
                        <td className="py-3.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold border ${
                              inc.status === 'RESOLVED' || inc.status === 'CLOSED'
                                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                                : inc.status === 'WAITING FOR REPORTER'
                                ? 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                                : inc.status === 'INVESTIGATING'
                                ? 'bg-cyan-950/60 border-cyan-500/40 text-cyan-300'
                                : 'bg-slate-900 border-slate-700 text-slate-300'
                            }`}
                          >
                            {inc.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-slate-400 font-mono text-[11px] tabular-nums whitespace-nowrap">
                          {new Date(inc.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4 text-slate-300 truncate max-w-[140px]">
                          {inc.assignedAnalyst || <span className="text-slate-500 italic">Unassigned</span>}
                        </td>
                        <td className="py-3.5 px-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openIncidentModal(inc);
                            }}
                            className="px-2.5 py-1 text-[11px] font-medium text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/40 rounded transition-colors inline-flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Triage</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AUDIT LOG TAB */}
      {activeTab === 'audit' && (
        <div className="soc-glass-panel rounded-2xl border border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Immutable Audit Log</h2>
              <p className="text-xs text-slate-400">
                Tamper-resistant audit record of status changes, analyst assignments, evidence downloads, and communications.
              </p>
            </div>
            <button
              onClick={fetchAuditLogs}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Refresh Log</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/60 font-medium">
                  <th className="py-3 px-3 uppercase tracking-wider">Timestamp</th>
                  <th className="py-3 px-3 uppercase tracking-wider">Analyst / Actor</th>
                  <th className="py-3 px-3 uppercase tracking-wider">Action</th>
                  <th className="py-3 px-3 uppercase tracking-wider">Report ID</th>
                  <th className="py-3 px-3 uppercase tracking-wider">Transition</th>
                  <th className="py-3 px-4 uppercase tracking-wider">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-900/40 font-mono text-[11px]">
                    <td className="py-2.5 px-3 text-slate-400 tabular-nums whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-slate-200 font-sans font-medium">
                      {log.actor}
                    </td>
                    <td className="py-2.5 px-3 text-cyan-300 font-medium">
                      {log.action}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">
                      {log.reportId}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">
                      {log.previousStatus && log.newStatus ? (
                        <span>
                          {log.previousStatus} → {log.newStatus}
                        </span>
                      ) : (
                        <span>—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-slate-300 font-sans max-w-sm truncate">
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: NOTIFICATIONS LOG TAB */}
      {activeTab === 'notifications' && (
        <div className="soc-glass-panel rounded-2xl border border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Notification Dispatch Log</h2>
              <p className="text-xs text-slate-400">
                Automated email alerts queued or delivered to incident reporters. No secrets are ever transmitted.
              </p>
            </div>
            <button
              onClick={fetchNotifications}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Refresh Queue</span>
            </button>
          </div>

          <div className="space-y-3">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs italic">
                No notifications logged yet.
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-200 font-mono">{notif.recipient}</span>
                      <span>·</span>
                      <span className="uppercase text-[10px] px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800/40 text-cyan-300">
                        {notif.type}
                      </span>
                    </div>
                    <span className="font-mono text-[11px] tabular-nums">
                      {new Date(notif.timestamp).toLocaleString()}
                    </span>
                  </div>

                  <div className="font-semibold text-slate-100">{notif.subject}</div>
                  <p className="text-slate-300 text-[11px] leading-relaxed bg-slate-950 p-2.5 rounded border border-slate-800/80">
                    {notif.body}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 4: DISCORD & SETTINGS TAB */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="soc-glass-panel rounded-2xl border border-slate-800 p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <Radio className="w-5 h-5 text-cyan-400" />
                <span>Private Discord SOC Webhook Integration</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Automated escalation alerts dispatched to the authorized cybersecurity team channel when High or Critical incidents are received.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200">Webhook Configuration Status:</span>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-cyan-950 border border-cyan-500/30 text-cyan-300">
                  DISCORD_SECURITY_WEBHOOK_URL
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 font-mono text-[11px] text-slate-400">
                <div className="text-cyan-400 mb-1">// Standard Alert Template Format:</div>
                <div>🚨 **SECURITY INCIDENT**</div>
                <div>**Report:** SEC-2026-XXXXXX</div>
                <div>**Severity:** CRITICAL</div>
                <div>**Type:** Account Compromise</div>
                <div>**Status:** RECEIVED</div>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  disabled={webhookTesting}
                  onClick={handleTestWebhook}
                  className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-semibold uppercase tracking-wider text-[11px] hover:bg-cyan-400 transition-colors disabled:opacity-50"
                >
                  {webhookTesting ? 'Dispatching Test...' : 'Test Webhook Alert Delivery'}
                </button>
              </div>

              {webhookResult && (
                <div className="mt-2 text-xs text-cyan-300 p-2.5 rounded bg-cyan-950/40 border border-cyan-800/40">
                  {webhookResult}
                </div>
              )}
            </div>

            {/* RFC 9116 security.txt preview */}
            <div className="space-y-2 pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                  Live RFC 9116 Policy Endpoint
                </h3>
                <a
                  href="/.well-known/security.txt"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                >
                  <span>View /.well-known/security.txt</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INCIDENT DETAILS MODAL / TRIAGE DRAWER */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="soc-glass-panel rounded-2xl border border-slate-700/80 max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl my-auto">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mb-1">
                  <span className="font-mono text-cyan-300 font-bold text-sm">
                    {selectedIncident.id}
                  </span>
                  <span>·</span>
                  <span className="font-semibold text-slate-200">{selectedIncident.type}</span>
                  <span>·</span>
                  <span
                    className={`font-semibold ${
                      selectedIncident.severity === 'Critical'
                        ? 'text-rose-400'
                        : selectedIncident.severity === 'High'
                        ? 'text-amber-400'
                        : selectedIncident.severity === 'Medium'
                        ? 'text-sky-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {selectedIncident.severity}
                  </span>
                  <span>·</span>
                  <span className="font-mono text-[11px] text-slate-500">
                    Verification Code: {selectedIncident.verificationCode}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white tracking-tight">
                  {selectedIncident.title}
                </h2>
              </div>

              <button
                onClick={() => setSelectedIncident(null)}
                className="text-slate-400 hover:text-slate-100 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs flex-1">
              {/* Action feedback */}
              {actionFeedback && (
                <div className="p-3 rounded-lg bg-cyan-950/40 border border-cyan-500/40 text-cyan-300 text-xs flex items-center justify-between">
                  <span>{actionFeedback}</span>
                  <button onClick={() => setActionFeedback(null)} className="text-cyan-400">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Action Buttons Toolbar as required */}
              <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-slate-900 border border-slate-800">
                <button
                  onClick={() => setActionType(actionType === 'assign' ? null : 'assign')}
                  className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold uppercase tracking-wider text-[11px] transition-colors"
                >
                  [ ASSIGN ]
                </button>
                <button
                  onClick={() => setActionType(actionType === 'status' ? null : 'status')}
                  className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold uppercase tracking-wider text-[11px] transition-colors"
                >
                  [ CHANGE STATUS ]
                </button>
                <button
                  onClick={() => setActionType(actionType === 'request_info' ? null : 'request_info')}
                  className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold uppercase tracking-wider text-[11px] transition-colors"
                >
                  [ REQUEST INFORMATION ]
                </button>
                <button
                  onClick={() => setActionType(actionType === 'internal_note' ? null : 'internal_note')}
                  className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold uppercase tracking-wider text-[11px] transition-colors"
                >
                  [ ADD INTERNAL NOTE ]
                </button>
                <button
                  onClick={() => setActionType(actionType === 'public_response' ? null : 'public_response')}
                  className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 font-semibold uppercase tracking-wider text-[11px] transition-colors"
                >
                  [ UPDATE PUBLIC RESPONSE ]
                </button>
                <button
                  onClick={() => handleStatusChange('RESOLVED')}
                  className="px-3 py-1.5 rounded bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 font-semibold uppercase tracking-wider text-[11px] transition-colors ml-auto"
                >
                  [ RESOLVE ]
                </button>
              </div>

              {/* Inline Action Forms */}
              {actionType === 'status' && (
                <div className="p-4 rounded-xl bg-slate-900/90 border border-cyan-500/40 space-y-3">
                  <div className="font-semibold text-cyan-300 uppercase tracking-wider text-[11px]">
                    Transition Incident Status:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'RECEIVED',
                      'UNDER REVIEW',
                      'INVESTIGATING',
                      'MITIGATION',
                      'WAITING FOR REPORTER',
                      'RESOLVED',
                      'CLOSED',
                    ].map((st) => (
                      <button
                        key={st}
                        onClick={() => handleStatusChange(st as IncidentStatus)}
                        disabled={isSubmittingAction}
                        className={`px-3 py-1.5 rounded text-xs font-mono font-semibold border transition-all ${
                          selectedIncident.status === st
                            ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                            : 'bg-slate-950 border-slate-700 text-slate-300 hover:border-cyan-400'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {actionType === 'assign' && (
                <form onSubmit={handleAssignSubmit} className="p-4 rounded-xl bg-slate-900/90 border border-slate-700 space-y-3">
                  <div className="font-semibold text-slate-200 uppercase tracking-wider text-[11px]">
                    Assign Incident Responder:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Analyst Name:</label>
                      <input
                        type="text"
                        value={assigneeVal}
                        onChange={(e) => setAssigneeVal(e.target.value)}
                        placeholder="e.g. Lead Analyst Mercer (SOC-Tier 3)"
                        className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-700 text-slate-100 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Response Unit:</label>
                      <input
                        type="text"
                        value={assignTeamVal}
                        onChange={(e) => setAssignTeamVal(e.target.value)}
                        placeholder="e.g. Tier 3 Incident Response Unit"
                        className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-700 text-slate-100 text-xs"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="submit"
                      disabled={isSubmittingAction}
                      className="px-3 py-1.5 rounded bg-cyan-400 text-slate-950 font-semibold text-xs"
                    >
                      Save Assignment
                    </button>
                  </div>
                </form>
              )}

              {actionType === 'request_info' && (
                <form onSubmit={handleRequestInfoSubmit} className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/40 space-y-3">
                  <div className="font-semibold text-amber-300 uppercase tracking-wider text-[11px]">
                    Request Additional Information from Reporter:
                  </div>
                  <textarea
                    required
                    rows={3}
                    value={requestInfoVal}
                    onChange={(e) => setRequestInfoVal(e.target.value)}
                    placeholder="Describe specific details required (e.g. server headers, exact source IP, payload snippet)..."
                    className="w-full p-2.5 rounded bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-amber-400"
                  />
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-slate-400">
                      Moves status to WAITING FOR REPORTER and notifies reporter.
                    </span>
                    <button
                      type="submit"
                      disabled={isSubmittingAction}
                      className="px-3.5 py-1.5 rounded bg-amber-400 text-slate-950 font-semibold text-xs"
                    >
                      Dispatch Request
                    </button>
                  </div>
                </form>
              )}

              {actionType === 'internal_note' && (
                <form onSubmit={handleInternalNoteSubmit} className="p-4 rounded-xl bg-slate-900 border border-rose-500/30 space-y-3">
                  <div className="flex items-center gap-1.5 font-semibold text-rose-400 uppercase tracking-wider text-[11px]">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Confidential Internal Analyst Note (Never Visible to Reporter):</span>
                  </div>
                  <textarea
                    required
                    rows={3}
                    value={internalNoteVal}
                    onChange={(e) => setInternalNoteVal(e.target.value)}
                    placeholder="Forensic indicators, threat actor correlation, internal IP notes..."
                    className="w-full p-2.5 rounded bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-rose-400"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isSubmittingAction}
                      className="px-3.5 py-1.5 rounded bg-rose-500 text-white font-semibold text-xs"
                    >
                      Commit Confidential Note
                    </button>
                  </div>
                </form>
              )}

              {actionType === 'public_response' && (
                <form onSubmit={handlePublicResponseSubmit} className="p-4 rounded-xl bg-slate-900 border border-sky-500/40 space-y-3">
                  <div className="font-semibold text-sky-300 uppercase tracking-wider text-[11px]">
                    Update Public Response for Reporter:
                  </div>
                  <textarea
                    required
                    rows={3}
                    value={publicResponseVal}
                    onChange={(e) => setPublicResponseVal(e.target.value)}
                    placeholder="Official status message visible on the public status page..."
                    className="w-full p-2.5 rounded bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-sky-400"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isSubmittingAction}
                      className="px-3.5 py-1.5 rounded bg-sky-400 text-slate-950 font-semibold text-xs"
                    >
                      Publish to Reporter Portal
                    </button>
                  </div>
                </form>
              )}

              {/* Triage Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <div>
                  <span className="text-slate-400 text-[11px] block">Affected Service / Target:</span>
                  <span className="text-slate-100 font-semibold font-mono">{selectedIncident.affectedService}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Approximate Incident Timestamp:</span>
                  <span className="text-slate-100 font-mono">{selectedIncident.approximateDateTime}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Reporter Contact:</span>
                  <span className="text-slate-100 font-mono">
                    {selectedIncident.contactEmail || <span className="text-slate-500 italic">Anonymous Submission</span>}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Assigned Unit & Analyst:</span>
                  <span className="text-slate-100">
                    {selectedIncident.assignedAnalyst || 'Unassigned'} ({selectedIncident.assignedTeam})
                  </span>
                </div>
              </div>

              {/* Narratives */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Summary & Description:
                  </h4>
                  <p className="text-slate-200 leading-relaxed bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                    {selectedIncident.description}
                  </p>
                </div>

                {selectedIncident.whatHappened && (
                  <div>
                    <h4 className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      Sequence of Events:
                    </h4>
                    <p className="text-slate-200 leading-relaxed bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                      {selectedIncident.whatHappened}
                    </p>
                  </div>
                )}

                {selectedIncident.actionsTaken && (
                  <div>
                    <h4 className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      Actions Already Taken:
                    </h4>
                    <p className="text-slate-200 leading-relaxed bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                      {selectedIncident.actionsTaken}
                    </p>
                  </div>
                )}
              </div>

              {/* Reporter reply if any */}
              {selectedIncident.reporterResponse && (
                <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-1">
                  <div className="text-[11px] font-semibold text-amber-300 uppercase tracking-wider">
                    Reporter Response to Clarification Request:
                  </div>
                  <p className="text-slate-100 leading-relaxed">{selectedIncident.reporterResponse}</p>
                </div>
              )}

              {/* Evidence Management Section as specified */}
              <div className="space-y-2">
                <h4 className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                  Secure Evidence Vault ({selectedIncident.evidence.length} Artifacts):
                </h4>

                {selectedIncident.evidence.length === 0 ? (
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-500 italic text-[11px]">
                    No evidence artifacts were uploaded with this submission.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedIncident.evidence.map((ev) => (
                      <div
                        key={ev.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg bg-slate-900 border border-slate-800"
                      >
                        <div className="space-y-0.5 truncate">
                          <div className="font-mono text-cyan-300 font-semibold truncate">
                            {ev.originalName}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2">
                            <span>Type: {ev.mimeType}</span>
                            <span>·</span>
                            <span>Size: {(ev.sizeBytes / 1024).toFixed(1)} KB</span>
                            <span>·</span>
                            <span className="text-emerald-400 font-mono text-[10px]">
                              {ev.scanStatus}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            SHA256: {ev.sha256}
                          </div>
                        </div>

                        <a
                          href={`/api/incidents/${selectedIncident.id}/evidence/${ev.id}`}
                          download
                          className="px-3 py-1.5 rounded bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/30 text-[11px] font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors shrink-0"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>SECURE DOWNLOAD</span>
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Internal Notes Section (STRICTLY CONFIDENTIAL) */}
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-rose-400 font-semibold uppercase tracking-wider text-[11px]">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Internal Analyst Notes ({selectedIncident.internalNotes.length})</span>
                  </div>
                  <span className="text-[10px] text-slate-500">Never transmitted to reporter</span>
                </div>

                <div className="space-y-2">
                  {selectedIncident.internalNotes.length === 0 ? (
                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-500 italic text-[11px]">
                      No internal notes recorded yet. Click [ ADD INTERNAL NOTE ] above to log confidential observations.
                    </div>
                  ) : (
                    selectedIncident.internalNotes.map((note) => (
                      <div
                        key={note.id}
                        className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1"
                      >
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span className="font-semibold text-rose-300 font-sans">{note.analyst}</span>
                          <span className="font-mono text-[10px] tabular-nums">
                            {new Date(note.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-slate-200 leading-relaxed font-sans">{note.content}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Incident Timeline */}
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <h4 className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                  Operational Timeline & Actions:
                </h4>
                <div className="space-y-2.5 pl-2 border-l-2 border-slate-800">
                  {selectedIncident.timeline.map((item) => (
                    <div key={item.id} className="relative pl-4 space-y-0.5">
                      <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-cyan-400 border-2 border-slate-950"></div>
                      <div className="text-xs font-semibold text-slate-200">{item.title}</div>
                      <div className="text-[10px] text-slate-500 font-mono tabular-nums">
                        {new Date(item.timestamp).toLocaleString()}
                      </div>
                      <p className="text-slate-400 text-xs leading-relaxed">{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-950/60">
              <span className="text-[11px] text-slate-500">
                SOC Incident Management Standard Operating Procedure v2.4
              </span>
              <button
                onClick={() => setSelectedIncident(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
