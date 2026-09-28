import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  ShieldCheck,
  Clock,
  Users,
  MessageSquare,
  AlertCircle,
  FileText,
  Download,
  Send,
  CheckCircle2,
  RefreshCw,
  Lock,
  Radio,
  ArrowRight,
} from 'lucide-react';
import type { PublicIncidentView, IncidentStatus } from '../types/security.ts';

interface StatusPageProps {
  initialReportId?: string;
  initialCode?: string;
  navigate: (route: string) => void;
}

const STATUS_STEPS: IncidentStatus[] = [
  'RECEIVED',
  'UNDER REVIEW',
  'INVESTIGATING',
  'MITIGATION',
  'RESOLVED',
];

export const StatusPage: React.FC<StatusPageProps> = ({
  initialReportId = '',
  initialCode = '',
  navigate,
}) => {
  const [reportId, setReportId] = useState(initialReportId);
  const [verificationCode, setVerificationCode] = useState(initialCode);

  const [incident, setIncident] = useState<PublicIncidentView | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Reporter Reply to requested information
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [replySuccess, setReplySuccess] = useState<string | null>(null);
  const [replyError, setReplyError] = useState<string | null>(null);

  // Real-time WebSocket connection state
  const [wsConnected, setWsConnected] = useState(false);
  const [lastLiveUpdate, setLastLiveUpdate] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  // Auto-fetch if both query params provided
  useEffect(() => {
    if (initialReportId && initialCode) {
      performLookup(initialReportId, initialCode);
    }
  }, [initialReportId, initialCode]);

  // WebSocket Live Updates subscription
  useEffect(() => {
    if (!incident) {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      setWsConnected(false);
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    let isSubscribed = true;
    let ws: WebSocket;

    try {
      ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        if (!isSubscribed) return;
        setWsConnected(true);
        // Subscribe to this report's real-time events
        ws.send(
          JSON.stringify({
            action: 'subscribe_report',
            reportId: incident.id,
            verificationCode: verificationCode.trim().toUpperCase(),
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'incident_updated' && data.incident && data.incident.id === incident.id) {
            setIncident(data.incident);
            setLastLiveUpdate(new Date().toLocaleTimeString());
          }
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      ws.onclose = () => {
        if (isSubscribed) {
          setWsConnected(false);
        }
      };

      ws.onerror = (err) => {
        console.warn('WebSocket error, falling back to manual refresh:', err);
        setWsConnected(false);
      };
    } catch (err) {
      console.warn('Unable to initialize WebSocket connection:', err);
    }

    return () => {
      isSubscribed = false;
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [incident?.id, verificationCode]);

  const performLookup = async (idToLook: string, codeToLook: string) => {
    setLookupError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/status/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: idToLook.trim().toUpperCase(),
          verificationCode: codeToLook.trim().toUpperCase(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Report could not be found or verification code is invalid.');
      }

      setIncident(data.incident);
    } catch (err: any) {
      setLookupError(err.message || 'Error communicating with security status server.');
      setIncident(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLookupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportId.trim() || !verificationCode.trim()) {
      setLookupError('Please enter both your Report ID and Verification Code.');
      return;
    }
    performLookup(reportId, verificationCode);
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incident || !replyText.trim()) return;

    setIsSubmittingReply(true);
    setReplyError(null);
    setReplySuccess(null);

    try {
      const res = await fetch('/api/status/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: incident.id,
          verificationCode: verificationCode.trim().toUpperCase(),
          replyMessage: replyText.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit response.');
      }

      setReplySuccess('Your response has been dispatched to the investigating security analysts.');
      setReplyText('');
      // Refresh current view
      performLookup(incident.id, verificationCode);
    } catch (err: any) {
      setReplyError(err.message || 'Error submitting response.');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  // Helper to determine step position
  const getStepStatus = (step: IncidentStatus, current: IncidentStatus) => {
    const order: Record<IncidentStatus, number> = {
      RECEIVED: 0,
      'UNDER REVIEW': 1,
      INVESTIGATING: 2,
      MITIGATION: 3,
      'WAITING FOR REPORTER': 2.5,
      RESOLVED: 4,
      CLOSED: 5,
    };

    const currentOrder = order[current] ?? 0;
    const stepOrder = order[step] ?? 0;

    if (currentOrder > stepOrder) return 'completed';
    if (currentOrder === stepOrder) return 'current';
    return 'upcoming';
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 relative z-10 space-y-8">
      {/* Page Title */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 text-xs font-mono text-cyan-400 tracking-wider uppercase">
          <Search className="w-3.5 h-3.5" />
          <span>Case Verification & Status</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Incident Investigation Status
        </h1>
        <p className="text-sm text-slate-400">
          Inspect real-time triage updates, official analyst findings, and submit requested clarifications securely.
        </p>
      </div>

      {/* Lookup Form */}
      <div className="soc-glass-panel rounded-2xl p-6 border border-slate-800">
        <form onSubmit={handleLookupSubmit} className="grid grid-cols-1 sm:grid-cols-5 gap-4 items-end">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-200 uppercase tracking-wider mb-2">
              Report ID <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={reportId}
              onChange={(e) => setReportId(e.target.value)}
              placeholder="e.g. SEC-2026-8F42K1"
              className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder:text-slate-600 text-sm font-mono focus:outline-none focus:border-cyan-400 uppercase"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-200 uppercase tracking-wider mb-2">
              Verification Code <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="e.g. VRF-8921-A4"
              className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder:text-slate-600 text-sm font-mono focus:outline-none focus:border-cyan-400 uppercase"
            />
          </div>

          <div className="sm:col-span-1">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-950 bg-gradient-to-r from-cyan-400 to-sky-400 hover:from-cyan-300 hover:to-sky-300 rounded-lg shadow-sm shadow-cyan-500/20 active:scale-98 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5" />
                  <span>Inspect</span>
                </>
              )}
            </button>
          </div>
        </form>

        {lookupError && (
          <div className="mt-4 p-3 rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{lookupError}</span>
          </div>
        )}
      </div>

      {/* Case Details Card (Shown after successful lookup) */}
      {incident && (
        <div className="soc-glass-panel rounded-2xl p-6 sm:p-8 border border-slate-800 space-y-8 animate-fadeIn">
          {/* Real-time WebSocket connection indicator */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800/80 text-xs">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                {wsConnected && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                )}
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    wsConnected ? 'bg-emerald-500' : 'bg-slate-600'
                  }`}
                ></span>
              </span>
              <span className="text-slate-300 font-medium">
                {wsConnected ? 'Real-Time Live Sync Active' : 'Connecting to Live SOC Updates...'}
              </span>
              {lastLiveUpdate && (
                <span className="text-slate-500 text-[11px]">
                  (Last updated: {lastLiveUpdate})
                </span>
              )}
            </div>

            <button
              onClick={() => performLookup(incident.id, verificationCode)}
              className="text-slate-400 hover:text-cyan-400 transition-colors flex items-center gap-1 text-[11px]"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Refresh Manually</span>
            </button>
          </div>

          {/* Header & Meta */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mb-1">
                <span className="font-mono text-cyan-300 font-semibold">{incident.id}</span>
                <span>·</span>
                <span>{incident.type}</span>
                <span>·</span>
                <span
                  className={`font-semibold ${
                    incident.severity === 'Critical'
                      ? 'text-rose-400'
                      : incident.severity === 'High'
                      ? 'text-amber-400'
                      : incident.severity === 'Medium'
                      ? 'text-sky-400'
                      : 'text-slate-400'
                  }`}
                >
                  {incident.severity} Severity
                </span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                {incident.title}
              </h2>
            </div>

            <div className="sm:text-right shrink-0">
              <div className="text-[11px] text-slate-500 uppercase tracking-wider">Current Status</div>
              <div className="text-sm font-mono font-bold text-cyan-400 mt-0.5">
                {incident.status}
              </div>
            </div>
          </div>

          {/* Status Progression Tracker as required */}
          <div>
            <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-4">
              Report Status Workflow
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {STATUS_STEPS.map((step, idx) => {
                const state = getStepStatus(step, incident.status);
                const isResolvedOrClosed =
                  step === 'RESOLVED' && (incident.status === 'RESOLVED' || incident.status === 'CLOSED');

                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border text-center transition-all ${
                      isResolvedOrClosed || state === 'current'
                        ? 'bg-cyan-950/70 border-cyan-400 text-cyan-200 shadow-sm shadow-cyan-900/30'
                        : state === 'completed'
                        ? 'bg-slate-900 border-slate-700 text-slate-300'
                        : 'bg-slate-950/40 border-slate-800 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-center mb-1.5">
                      {state === 'completed' || isResolvedOrClosed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : state === 'current' ? (
                        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></div>
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-slate-700"></div>
                      )}
                    </div>
                    <div className="text-xs font-semibold font-mono tracking-tight">{step}</div>
                  </div>
                );
              })}
            </div>

            {incident.status === 'WAITING FOR REPORTER' && (
              <div className="mt-3 p-3 rounded-lg bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>Status Note: Currently awaiting requested clarification from reporter.</span>
              </div>
            )}
          </div>

          {/* Assigned Team & Last Update */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-900/70 border border-slate-800 text-xs">
            <div className="flex items-center gap-2.5">
              <Users className="w-4 h-4 text-cyan-400 shrink-0" />
              <div>
                <span className="text-slate-400 block">Assigned Team:</span>
                <span className="text-slate-100 font-semibold">{incident.assignedTeam}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
              <div>
                <span className="text-slate-400 block">Last Activity:</span>
                <span className="text-slate-100 font-mono">
                  {new Date(incident.updatedAt).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Public Official Response */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>Public Security Team Response</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-700/80 text-sm text-slate-200 leading-relaxed">
              {incident.publicResponse ? (
                <p>{incident.publicResponse}</p>
              ) : (
                <p className="text-slate-500 italic text-xs">
                  The security team is currently reviewing your report. Official findings and containment status will appear here once initial triage concludes.
                </p>
              )}
            </div>
          </div>

          {/* Requested Information & Secure Reply Box */}
          {incident.requestedInformation && (
            <div className="p-5 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-4">
              <div className="flex items-start gap-2.5 text-amber-300">
                <MessageSquare className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider">
                    Requested Information from Security Analysts
                  </h4>
                  <p className="text-sm text-slate-200 mt-1 leading-relaxed">
                    {incident.requestedInformation}
                  </p>
                </div>
              </div>

              {/* Reply Form */}
              <form onSubmit={handleReplySubmit} className="space-y-3 pt-2 border-t border-amber-900/40">
                <label className="block text-xs font-medium text-slate-300">
                  Provide Clarification or Details:
                </label>
                <textarea
                  required
                  rows={3}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Enter requested information (e.g. headers, exact time, observed responses)..."
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 placeholder:text-slate-600 text-xs focus:outline-none focus:border-amber-400"
                />

                {replyError && (
                  <div className="text-xs text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{replyError}</span>
                  </div>
                )}
                {replySuccess && (
                  <div className="text-xs text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{replySuccess}</span>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmittingReply}
                    className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSubmittingReply ? 'Transmitting...' : 'Submit Clarification'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Evidence Files List */}
          {incident.evidence && incident.evidence.length > 0 && (
            <div className="space-y-3">
              <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Attached Evidence Files ({incident.evidence.length})
              </div>
              <div className="space-y-2">
                {incident.evidence.map((ev) => (
                  <div
                    key={ev.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span className="text-slate-200 font-mono truncate">{ev.originalName}</span>
                      <span className="text-slate-500 font-mono text-[11px]">
                        ({(ev.sizeBytes / 1024).toFixed(1)} KB)
                      </span>
                    </div>

                    <a
                      href={`/api/incidents/${incident.id}/evidence/${ev.id}?code=${encodeURIComponent(
                        verificationCode.trim()
                      )}`}
                      download
                      className="px-3 py-1 rounded bg-slate-800 hover:bg-cyan-950 hover:text-cyan-300 text-slate-300 border border-slate-700 hover:border-cyan-500/40 transition-colors flex items-center gap-1 font-mono text-[11px]"
                    >
                      <Download className="w-3 h-3" />
                      <span>Download</span>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timeline of Public Case Progress */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Investigation Timeline
            </div>
            <div className="space-y-3 pl-2 border-l-2 border-slate-800">
              {incident.timeline.map((item) => (
                <div key={item.id} className="relative pl-4 space-y-0.5">
                  <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-cyan-500 border-2 border-slate-950"></div>
                  <div className="text-xs font-semibold text-slate-200">{item.title}</div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    {new Date(item.timestamp).toLocaleString()}
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed pt-0.5">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Notice: Internal Notes are never exposed */}
          <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800/80 text-[11px] text-slate-500 flex items-center gap-2">
            <Lock className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              Internal analyst forensic notes and proprietary triage playbooks are strictly restricted and protected under SOC confidentiality controls.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
