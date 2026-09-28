import React, { useState } from 'react';
import {
  ShieldAlert,
  Search,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Bug,
  HelpCircle,
  FileWarning,
  KeyRound,
  EyeOff,
  Server,
  Radio,
  Lock,
} from 'lucide-react';

interface LandingPageProps {
  navigate: (route: string, params?: Record<string, string>) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ navigate }) => {
  const [quickReportId, setQuickReportId] = useState('');
  const [quickCode, setQuickCode] = useState('');

  const handleQuickLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickReportId.trim()) return;
    navigate('status', {
      id: quickReportId.trim().toUpperCase(),
      code: quickCode.trim().toUpperCase(),
    });
  };

  return (
    <div className="relative z-10 space-y-24 py-8 md:py-16">
      {/* Hero Section */}
      <section className="max-w-5xl mx-auto px-4 text-center space-y-6">
        {/* Subtle status indicator */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/40 border border-cyan-500/20 text-xs font-mono text-cyan-300">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
          <span>INCIDENT RESPONSE READY · 24/7 DEFENSE ON-CALL</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white leading-tight">
          SECURITY OPERATIONS CENTER
        </h1>

        <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed">
          Report a cybersecurity incident to our authorized security team.
        </p>

        {/* 3 Main Action Buttons as requested */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
          <button
            onClick={() => navigate('report')}
            className="px-6 py-3 text-sm font-semibold tracking-wide text-slate-950 bg-gradient-to-r from-cyan-400 via-sky-400 to-teal-400 hover:from-cyan-300 hover:to-sky-300 rounded-lg shadow-lg shadow-cyan-500/10 active:scale-98 transition-all flex items-center gap-2"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>REPORT AN INCIDENT</span>
          </button>

          <button
            onClick={() => navigate('status')}
            className="px-6 py-3 text-sm font-semibold tracking-wide text-cyan-300 bg-slate-900/80 hover:bg-slate-800/90 border border-cyan-500/30 hover:border-cyan-400/60 rounded-lg active:scale-98 transition-all flex items-center gap-2"
          >
            <Search className="w-4 h-4 text-cyan-400" />
            <span>CHECK REPORT STATUS</span>
          </button>

          <button
            onClick={() => navigate('security')}
            className="px-6 py-3 text-sm font-semibold tracking-wide text-slate-300 bg-slate-900/40 hover:bg-slate-800/60 border border-slate-700/60 hover:border-slate-600 rounded-lg active:scale-98 transition-all flex items-center gap-2"
          >
            <BookOpen className="w-4 h-4 text-slate-400" />
            <span>SECURITY RESOURCES</span>
          </button>
        </div>

        {/* Security Ingestion Assurance */}
        <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
            No Passwords or Keys Collected
          </span>
          <span className="text-slate-700 hidden sm:inline">·</span>
          <span className="flex items-center gap-1.5">
            <EyeOff className="w-3.5 h-3.5 text-cyan-400" />
            No Visitor IP Fingerprinting
          </span>
          <span className="text-slate-700 hidden sm:inline">·</span>
          <span className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-cyan-400" />
            Non-Public Secure Artifact Vault
          </span>
        </div>
      </section>

      {/* Three Information Cards as requested */}
      <section className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: INCIDENT RESPONSE */}
          <div className="soc-glass-card rounded-xl p-6 relative overflow-hidden group">
            <div className="w-10 h-10 rounded-lg bg-rose-950/60 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-5 group-hover:border-rose-400/60 transition-colors">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-white tracking-tight mb-2">
              INCIDENT RESPONSE
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed mb-6">
              Report suspicious activity and security incidents. Immediate containment, credential isolation, and forensic investigation for affected accounts and servers.
            </p>
            <button
              onClick={() => navigate('report')}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              <span>Initiate incident triage</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card 2: VULNERABILITY REPORTING */}
          <div className="soc-glass-card rounded-xl p-6 relative overflow-hidden group">
            <div className="w-10 h-10 rounded-lg bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-5 group-hover:border-cyan-400/60 transition-colors">
              <Bug className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-white tracking-tight mb-2">
              VULNERABILITY REPORTING
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed mb-6">
              Report security vulnerabilities responsibly. Safe harbor protection, direct communication with triage engineers, and coordinated patch deployment.
            </p>
            <button
              onClick={() => navigate('security')}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              <span>View disclosure policy</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card 3: SECURITY SUPPORT */}
          <div className="soc-glass-card rounded-xl p-6 relative overflow-hidden group">
            <div className="w-10 h-10 rounded-lg bg-sky-950/60 border border-sky-500/30 flex items-center justify-center text-sky-400 mb-5 group-hover:border-sky-400/60 transition-colors">
              <HelpCircle className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-white tracking-tight mb-2">
              SECURITY SUPPORT
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed mb-6">
              Get guidance from our security team. Phishing verification, compromise assessment assistance, and authorized emergency contact pathways.
            </p>
            <button
              onClick={() => navigate('status')}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              <span>Track existing case</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* Incident Types Supported */}
      <section className="max-w-6xl mx-auto px-4">
        <div className="soc-glass-panel rounded-2xl p-8 border border-slate-800">
          <div className="max-w-2xl mb-8">
            <h2 className="text-xl font-bold text-white tracking-tight">
              Supported Security Incident Categories
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Select the appropriate incident profile when submitting your report for rapid triage routing.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
            {[
              { title: 'Account Compromise', desc: 'Unauthorized takeovers, session hijacking' },
              { title: 'Suspicious Login', desc: 'Unexpected geo-locations or IP brute force' },
              { title: 'Phishing', desc: 'Credential harvesters and deceptive emails' },
              { title: 'Malware', desc: 'Ransomware, trojans, or suspicious payloads' },
              { title: 'Vulnerabilities', desc: 'OWASP Top 10, CORS, logic bypasses' },
              { title: 'Website Attack', desc: 'SQLi, XSS, defacement, script injection' },
              { title: 'Discord / Server', desc: 'Raid bots, token leaks, unauthorized bots' },
              { title: 'Data Exposure', desc: 'Leaked databases, misconfigured S3/buckets' },
              { title: 'Impersonation', desc: 'Fraudulent profiles, executive mimicry' },
              { title: 'DDoS Attacks', desc: 'Ingress flood, reflection attacks, outages' },
              { title: 'Other Cyber Threat', desc: 'General anomalous security incidents' },
              { title: 'Responsible Disclosure', desc: 'Authorized bug submissions with PoC' },
            ].map((cat, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800/80 hover:border-cyan-500/30 transition-all text-left"
              >
                <div className="text-xs font-semibold text-slate-200">{cat.title}</div>
                <div className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {cat.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Status Lookup Banner */}
      <section className="max-w-4xl mx-auto px-4">
        <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950 border border-cyan-500/20 shadow-xl shadow-cyan-950/20">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <Search className="w-5 h-5 text-cyan-400" />
                <span>Already Submitted a Report?</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Enter your SEC reference ID and verification code to inspect triage status, assigned team, and official findings.
              </p>
            </div>

            <form onSubmit={handleQuickLookup} className="flex flex-col sm:flex-row gap-2.5 w-full md:w-auto">
              <input
                type="text"
                value={quickReportId}
                onChange={(e) => setQuickReportId(e.target.value)}
                placeholder="e.g. SEC-2026-8F42K1"
                className="px-3.5 py-2 text-xs rounded-lg bg-slate-950 border border-slate-700 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 font-mono"
              />
              <input
                type="text"
                value={quickCode}
                onChange={(e) => setQuickCode(e.target.value)}
                placeholder="VRF Code (optional)"
                className="px-3.5 py-2 text-xs rounded-lg bg-slate-950 border border-slate-700 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 font-mono w-full sm:w-36"
              />
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg whitespace-nowrap transition-colors"
              >
                Track Status
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Response SLA Benchmarks */}
      <section className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/40">
            <div className="text-2xl font-bold font-mono text-cyan-400">P1 · &lt; 15 min</div>
            <div className="text-xs font-medium text-slate-200 mt-1">Critical Incidents</div>
            <p className="text-[11px] text-slate-400 mt-1">Immediate active containment & pager escalation</p>
          </div>
          <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/40">
            <div className="text-2xl font-bold font-mono text-cyan-400">P2 · &lt; 1 hour</div>
            <div className="text-xs font-medium text-slate-200 mt-1">High Severity</div>
            <p className="text-[11px] text-slate-400 mt-1">Phishing takedowns and perimeter isolation</p>
          </div>
          <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/40">
            <div className="text-2xl font-bold font-mono text-cyan-400">P3 · &lt; 6 hours</div>
            <div className="text-xs font-medium text-slate-200 mt-1">Medium & Low Intake</div>
            <p className="text-[11px] text-slate-400 mt-1">Vulnerability triage and remediation guidance</p>
          </div>
        </div>
      </section>
    </div>
  );
};
