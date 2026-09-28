import React from 'react';
import { ShieldCheck, EyeOff, Lock, Clock, Database, UserCheck, FileCheck } from 'lucide-react';

interface PrivacyPageProps {
  navigate: (route: string) => void;
}

export const PrivacyPage: React.FC<PrivacyPageProps> = ({ navigate }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10 relative z-10 space-y-10">
      {/* Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 text-xs font-mono text-cyan-400 tracking-wider uppercase">
          <EyeOff className="w-3.5 h-3.5" />
          <span>Data Transparency & Privacy</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Incident Reporting Privacy Policy
        </h1>
        <p className="text-sm text-slate-400 leading-relaxed">
          Comprehensive disclosure regarding our zero-fingerprinting architecture, evidence retention schedule, and data governance practices.
        </p>
      </div>

      {/* Core Privacy Assurances */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 text-center space-y-2">
          <div className="w-8 h-8 rounded-full bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto">
            <EyeOff className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">No IP Logging</h3>
          <p className="text-[11px] text-slate-400">
            Visitor IP addresses are not cataloged against incident reports.
          </p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 text-center space-y-2">
          <div className="w-8 h-8 rounded-full bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto">
            <Lock className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">Zero Secrets Intake</h3>
          <p className="text-[11px] text-slate-400">
            We never solicit or ingest passwords, private keys, or credentials.
          </p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 text-center space-y-2">
          <div className="w-8 h-8 rounded-full bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto">
            <Database className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">Isolated Evidence</h3>
          <p className="text-[11px] text-slate-400">
            Evidence files are quarantined outside public web directories.
          </p>
        </div>
      </div>

      {/* Structured Sections */}
      <div className="space-y-6">
        {/* Section 1: What information is collected */}
        <section className="soc-glass-panel rounded-2xl p-6 sm:p-8 border border-slate-800 space-y-3">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-cyan-400" />
            <span>1. What Information is Collected</span>
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            When you submit an incident report, we collect only the explicit information you provide in the submission form:
          </p>
          <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
            <li>Incident categorization (e.g. Phishing, Account Compromise, DDoS)</li>
            <li>Incident title, narrative description, and timeline observations</li>
            <li>Affected system, domain, or community identifier</li>
            <li>Contact email address (if voluntarily provided for status updates)</li>
            <li>Optional evidence files (PNG, JPG, PDF, TXT, LOG, ZIP) voluntarily uploaded by you</li>
          </ul>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
            <strong className="text-slate-200">What is NOT collected:</strong> We do not secretly log browser canvas fingerprints, audio fingerprints, battery telemetry, or behavioral tracking identifiers. No third-party ad beacons or trackers exist on this platform.
          </div>
        </section>

        {/* Section 2: Why it is collected */}
        <section className="soc-glass-panel rounded-2xl p-6 sm:p-8 border border-slate-800 space-y-3">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>2. Why Information is Collected (Purpose of Processing)</span>
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            All submitted data is utilized exclusively for legitimate cybersecurity defense and incident remediation purposes:
          </p>
          <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
            <li>Triage and containment of active attacks and threats against protected resources</li>
            <li>Remediation of reported software vulnerabilities</li>
            <li>Coordinating defense countermeasures (e.g. domain takedowns, DNS sinkholing)</li>
            <li>Communicating investigation findings and status updates back to the reporter</li>
          </ul>
        </section>

        {/* Section 3: How long reports are retained */}
        <section className="soc-glass-panel rounded-2xl p-6 sm:p-8 border border-slate-800 space-y-3">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span>3. How Long Reports are Retained</span>
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Incident data is retained under the following schedule:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
              <span className="font-semibold text-slate-200 block">Active & Ongoing Incidents:</span>
              <span className="text-slate-400 text-[11px]">Retained for the full duration of triage, mitigation, and post-incident review.</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
              <span className="font-semibold text-slate-200 block">Resolved / Closed Records:</span>
              <span className="text-slate-400 text-[11px]">Retained for 180 days for audit and pattern correlation, then permanently sanitized.</span>
            </div>
          </div>
        </section>

        {/* Section 4: Who can access reports */}
        <section className="soc-glass-panel rounded-2xl p-6 sm:p-8 border border-slate-800 space-y-3">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-cyan-400" />
            <span>4. Who Can Access Reports</span>
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Access to submitted incident records is strictly restricted to:
          </p>
          <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
            <li>Authorized SOC Tier 1-3 Incident Responders and Triage Analysts with authenticated sessions</li>
            <li>The original reporter presenting the exact Report ID and matching Verification Code via the status portal</li>
          </ul>
          <p className="text-xs text-slate-400">
            Reports are never shared with marketing partners, data brokers, or unauthenticated third parties.
          </p>
        </section>

        {/* Section 5: How users can request information or deletion */}
        <section className="soc-glass-panel rounded-2xl p-6 sm:p-8 border border-slate-800 space-y-3">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Database className="w-4 h-4 text-cyan-400" />
            <span>5. Requesting Information or Removal of Your Report</span>
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            You may inspect your report data at any time by entering your Report ID and Verification Code on the Status page. If you wish to request the expungement, deletion, or redaction of any submitted report or evidence file, you can submit a clarification request directly within your report's status thread.
          </p>
        </section>
      </div>
    </div>
  );
};
