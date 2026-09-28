import React, { useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  UploadCloud,
  FileCheck,
  X,
  CheckCircle2,
  Copy,
  Info,
  Clock,
  ExternalLink,
  Lock,
} from 'lucide-react';
import type { IncidentType, Severity } from '../types/security.ts';

interface ReportIncidentPageProps {
  navigate: (route: string, params?: Record<string, string>) => void;
}

export const ReportIncidentPage: React.FC<ReportIncidentPageProps> = ({ navigate }) => {
  // Form fields
  const [incidentType, setIncidentType] = useState<IncidentType>('Account Compromise');
  const [severity, setSeverity] = useState<Severity>('Medium');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [affectedService, setAffectedService] = useState('');
  const [approximateDateTime, setApproximateDateTime] = useState('');
  const [whatHappened, setWhatHappened] = useState('');
  const [actionsTaken, setActionsTaken] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [receiveNotifications, setReceiveNotifications] = useState(true);

  // Evidence files
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Success Result State
  const [submissionResult, setSubmissionResult] = useState<{
    reportId: string;
    verificationCode: string;
    status: string;
  } | null>(null);

  const [copiedId, setCopiedId] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    if (!e.target.files) return;

    const files = Array.from(e.target.files);
    const validExtensions = ['.png', '.jpg', '.jpeg', '.pdf', '.txt', '.log', '.zip'];
    const maxSizeBytes = 25 * 1024 * 1024; // 25MB

    const newFiles: File[] = [];
    for (const file of files) {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!validExtensions.includes(ext)) {
        setFileError(`File "${file.name}" has an unsupported format. Allowed: PNG, JPG, PDF, TXT, LOG, ZIP.`);
        return;
      }
      if (file.size > maxSizeBytes) {
        setFileError(`File "${file.name}" exceeds the 25MB maximum size limit.`);
        return;
      }
      newFiles.push(file);
    }

    if (selectedFiles.length + newFiles.length > 5) {
      setFileError('You can attach a maximum of 5 evidence files per incident submission.');
      return;
    }

    setSelectedFiles((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!title.trim()) {
      setSubmitError('Please provide a concise incident title.');
      return;
    }
    if (!description.trim()) {
      setSubmitError('Please provide an incident description.');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('type', incidentType);
      formData.append('severity', severity);
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('affectedService', affectedService.trim());
      formData.append('approximateDateTime', approximateDateTime.trim());
      formData.append('whatHappened', whatHappened.trim());
      formData.append('actionsTaken', actionsTaken.trim());
      formData.append('contactEmail', contactEmail.trim());
      formData.append('receiveNotifications', String(receiveNotifications));

      selectedFiles.forEach((file) => {
        formData.append('evidence', file);
      });

      const res = await fetch('/api/incidents', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit report. Please review your inputs.');
      }

      setSubmissionResult({
        reportId: data.reportId,
        verificationCode: data.verificationCode,
        status: data.status || 'Received',
      });
    } catch (err: any) {
      setSubmitError(err.message || 'An unexpected network error occurred while submitting.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string, type: 'id' | 'code') => {
    navigator.clipboard.writeText(text);
    if (type === 'id') {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } else {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  // If successfully submitted, show clean uncompromised confirmation screen
  if (submissionResult) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 relative z-10">
        <div className="soc-glass-panel rounded-2xl p-8 border border-cyan-500/30 text-center space-y-6 shadow-2xl shadow-cyan-950/40">
          <div className="w-14 h-14 rounded-full bg-cyan-950/80 border border-cyan-400/40 flex items-center justify-center text-cyan-400 mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Your report has been submitted.
            </h2>
            <p className="text-sm text-slate-300 mt-2">
              Our authorized cybersecurity team has received your incident ingestion and queued it for immediate triage.
            </p>
          </div>

          {/* Reference Credentials Display */}
          <div className="p-6 rounded-xl bg-slate-900/90 border border-slate-700/80 text-left space-y-4 font-mono">
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wider mb-1 font-sans">
                Report ID:
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-lg font-bold text-cyan-300 tracking-wider">
                  {submissionResult.reportId}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(submissionResult.reportId, 'id')}
                  className="px-2.5 py-1 text-xs rounded bg-slate-800 text-slate-300 hover:text-cyan-300 transition-colors flex items-center gap-1 font-sans"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedId ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wider mb-1 font-sans">
                Secure Verification Code:
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-base font-semibold text-emerald-300 tracking-wider">
                  {submissionResult.verificationCode}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(submissionResult.verificationCode, 'code')}
                  className="px-2.5 py-1 text-xs rounded bg-slate-800 text-slate-300 hover:text-emerald-300 transition-colors flex items-center gap-1 font-sans"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between text-xs font-sans border-t border-slate-800">
              <span className="text-slate-400">Initial Ingestion Status:</span>
              <span className="font-semibold text-cyan-400">{submissionResult.status}</span>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-cyan-950/30 border border-cyan-800/40 text-left text-xs text-slate-300 leading-relaxed">
            <span className="font-semibold text-cyan-300">Important:</span> Keep your report ID and verification code to check the status of your case. For your protection and privacy, status verification requires both identifiers.
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button
              onClick={() =>
                navigate('status', {
                  id: submissionResult.reportId,
                  code: submissionResult.verificationCode,
                })
              }
              className="px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors"
            >
              Track Case Status Now
            </button>
            <button
              onClick={() => {
                setSubmissionResult(null);
                setTitle('');
                setDescription('');
                setWhatHappened('');
                setActionsTaken('');
                setAffectedService('');
                setSelectedFiles([]);
              }}
              className="px-6 py-2.5 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors"
            >
              Submit Another Report
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 relative z-10 space-y-8">
      {/* Page Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 text-xs font-mono text-cyan-400 tracking-wider uppercase">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Incident Submission Gateway</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Submit Cybersecurity Incident Report
        </h1>
        <p className="text-sm text-slate-400 leading-relaxed">
          Provide technical details regarding the suspected intrusion, compromise, or threat. Our incident responders will initiate triage immediately.
        </p>
      </div>

      {/* Mandatory Warning as specified */}
      <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/40 flex items-start gap-3 text-amber-200 text-xs leading-relaxed">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <strong className="font-semibold block mb-0.5 text-amber-300">
            Confidentiality & Credential Safeguard Notice:
          </strong>
          Do not upload passwords, authentication tokens, private keys, recovery codes, or other sensitive credentials. If logs or screenshots contain secrets, redact or mask them before attaching.
        </div>
      </div>

      {/* Transparent Technical Metadata Explanation */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start gap-3 text-slate-400 text-xs leading-relaxed">
        <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-slate-200 font-semibold block mb-0.5">
            Technical Metadata Transparency:
          </strong>
          We collect only the incident data and files you voluntarily provide in this form. We do not covertly harvest your IP address, browser fingerprint, canvas telemetry, or device parameters.
        </div>
      </div>

      {/* Main Submission Form */}
      <form onSubmit={handleSubmit} className="soc-glass-panel rounded-2xl p-6 sm:p-8 border border-slate-800 space-y-6">
        {submitError && (
          <div className="p-4 rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center justify-between">
            <span>{submitError}</span>
            <button
              type="button"
              onClick={() => setSubmitError(null)}
              className="text-rose-400 hover:text-rose-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Incident Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 uppercase tracking-wider mb-2">
              Incident Type <span className="text-rose-400">*</span>
            </label>
            <select
              value={incidentType}
              onChange={(e) => setIncidentType(e.target.value as IncidentType)}
              className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-cyan-400"
            >
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

          {/* Severity */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 uppercase tracking-wider mb-2">
              Estimated Severity <span className="text-rose-400">*</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['Low', 'Medium', 'High', 'Critical'] as Severity[]).map((sev) => {
                const isSelected = severity === sev;
                const colors = {
                  Low: 'border-slate-700 text-slate-300 hover:border-slate-500',
                  Medium: 'border-sky-500/40 text-sky-300 hover:border-sky-400',
                  High: 'border-amber-500/40 text-amber-300 hover:border-amber-400',
                  Critical: 'border-rose-500/50 text-rose-300 hover:border-rose-400',
                }[sev];

                const activeColors = {
                  Low: 'bg-slate-800 border-slate-400 text-white font-semibold',
                  Medium: 'bg-sky-950/80 border-sky-400 text-sky-200 font-semibold',
                  High: 'bg-amber-950/80 border-amber-400 text-amber-200 font-semibold',
                  Critical: 'bg-rose-950/90 border-rose-400 text-rose-100 font-semibold shadow-sm shadow-rose-900/40',
                }[sev];

                return (
                  <button
                    key={sev}
                    type="button"
                    onClick={() => setSeverity(sev)}
                    className={`py-2 text-xs rounded-lg border transition-all text-center ${
                      isSelected ? activeColors : colors
                    }`}
                  >
                    {sev}
                  </button>
                );
              })}
            </div>
            <div className="text-[11px] text-slate-400 mt-1.5">
              {severity === 'Critical' && 'Critical: Active data loss, root compromise, or major production outage.'}
              {severity === 'High' && 'High: Targeted attack, spear-phishing campaign, or severe service degradation.'}
              {severity === 'Medium' && 'Medium: Isolated suspicious activity, unconfirmed vulnerability, or anomaly.'}
              {severity === 'Low' && 'Low: General inquiry, minor policy violation, or informational finding.'}
            </div>
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-slate-200 uppercase tracking-wider mb-2">
            Incident Title <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            required
            maxLength={180}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Unauthorized administrative login attempt from overseas IP"
            className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder:text-slate-600 text-sm focus:outline-none focus:border-cyan-400"
          />
        </div>

        {/* Affected Service and Approximate Time */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-semibold text-slate-200 uppercase tracking-wider mb-2">
              Affected Service / Website / Server
            </label>
            <input
              type="text"
              value={affectedService}
              onChange={(e) => setAffectedService(e.target.value)}
              placeholder="e.g. auth.company.internal or Primary Discord Guild"
              className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder:text-slate-600 text-sm focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-200 uppercase tracking-wider mb-2">
              Approximate Date / Time of Incident
            </label>
            <input
              type="text"
              value={approximateDateTime}
              onChange={(e) => setApproximateDateTime(e.target.value)}
              placeholder="e.g. 2026-09-28 10:15 UTC (or Ongoing)"
              className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder:text-slate-600 text-sm focus:outline-none focus:border-cyan-400"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-200 uppercase tracking-wider mb-2">
            Incident Summary & Description <span className="text-rose-400">*</span>
          </label>
          <textarea
            required
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Provide a concise technical summary of what was observed..."
            className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder:text-slate-600 text-sm focus:outline-none focus:border-cyan-400"
          />
        </div>

        {/* What happened? */}
        <div>
          <label className="block text-xs font-semibold text-slate-200 uppercase tracking-wider mb-2">
            What happened? (Detailed Sequence of Events)
          </label>
          <textarea
            rows={3}
            value={whatHappened}
            onChange={(e) => setWhatHappened(e.target.value)}
            placeholder="Describe the chronologic timeline: what alerts fired, what anomalies were seen, what systems were accessed..."
            className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder:text-slate-600 text-sm focus:outline-none focus:border-cyan-400"
          />
        </div>

        {/* What actions have already been taken? */}
        <div>
          <label className="block text-xs font-semibold text-slate-200 uppercase tracking-wider mb-2">
            What actions have already been taken?
          </label>
          <textarea
            rows={2}
            value={actionsTaken}
            onChange={(e) => setActionsTaken(e.target.value)}
            placeholder="e.g. Account suspended, password reset, server taken offline, firewall rules updated..."
            className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder:text-slate-600 text-sm focus:outline-none focus:border-cyan-400"
          />
        </div>

        {/* Contact Email & Notifications */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-200 uppercase tracking-wider mb-1.5">
              Contact Email (Optional but Recommended)
            </label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="e.g. responder@organization.org"
              className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 placeholder:text-slate-600 text-sm focus:outline-none focus:border-cyan-400"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Used strictly for case updates and analyst requests. Never sold, disclosed, or used for marketing.
            </p>
          </div>

          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={receiveNotifications}
              onChange={(e) => setReceiveNotifications(e.target.checked)}
              className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-0"
            />
            <span className="text-xs text-slate-300">
              Notify me by email when an analyst updates status or requests additional information
            </span>
          </label>
        </div>

        {/* Optional Evidence Upload */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-slate-200 uppercase tracking-wider">
              Optional Evidence Upload
            </label>
            <span className="text-[11px] text-slate-400">
              Allowed: PNG, JPG, PDF, TXT, LOG, ZIP (Max 25MB each)
            </span>
          </div>

          <div className="border-2 border-dashed border-slate-700 hover:border-cyan-500/50 rounded-xl p-6 text-center transition-colors bg-slate-900/30">
            <UploadCloud className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
            <div className="text-xs text-slate-300">
              <label className="font-semibold text-cyan-400 hover:text-cyan-300 cursor-pointer underline mr-1">
                Choose files
                <input
                  type="file"
                  multiple
                  accept=".png,.jpg,.jpeg,.pdf,.txt,.log,.zip"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              or drag & drop sanitized evidence files here
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Stored outside public web directory with static malware heuristic checks.
            </p>
          </div>

          {fileError && (
            <div className="text-xs text-rose-400 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{fileError}</span>
            </div>
          )}

          {/* Attached Files List */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2 pt-2">
              <div className="text-xs font-medium text-slate-300">
                Attached Files ({selectedFiles.length} of 5):
              </div>
              <div className="space-y-1.5">
                {selectedFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span className="text-slate-200 truncate">{file.name}</span>
                      <span className="text-slate-400 font-mono text-[11px]">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="text-slate-400 hover:text-rose-400 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Submit Button as requested */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            Submissions are cryptographically assigned a random SEC identifier.
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-950 bg-gradient-to-r from-cyan-400 to-sky-400 hover:from-cyan-300 hover:to-sky-300 rounded-lg shadow-md shadow-cyan-500/20 active:scale-98 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                <span>Securing & Submitting...</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5" />
                <span>SUBMIT SECURE REPORT</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
