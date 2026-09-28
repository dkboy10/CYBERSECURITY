import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  Lock,
  Mail,
  Copy,
  Check,
  ExternalLink,
  Terminal,
  FileText,
  BadgeCheck,
} from 'lucide-react';

interface SecurityPolicyPageProps {
  navigate: (route: string) => void;
}

export const SecurityPolicyPage: React.FC<SecurityPolicyPageProps> = ({ navigate }) => {
  const [copiedKey, setCopiedKey] = useState(false);

  const pgpKey = `-----BEGIN PGP PUBLIC KEY BLOCK-----
Version: OpenPGP v2.0.18
Comment: Authorized SOC Public Ingestion Key

mQENBGY6rW8BCADKqYtG9e...[Authorized Security Key]...
Subkey Fingerprint: 4A9F 8201 BE74 C259 88FA 0941 71EB 338C E902 447B
UID: SOC Security Vulnerability Desk <security@soc.internal>
-----END PGP PUBLIC KEY BLOCK-----`;

  const copyKey = () => {
    navigator.clipboard.writeText(pgpKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 relative z-10 space-y-10">
      {/* Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 text-xs font-mono text-cyan-400 tracking-wider uppercase">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Operational Security Standards</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Security Policy & Responsible Disclosure
        </h1>
        <p className="text-sm text-slate-400 leading-relaxed">
          Guidelines for researchers, incident responders, and partners working collaboratively with our cybersecurity team.
        </p>
      </div>

      {/* Responsible Disclosure Section */}
      <section className="soc-glass-panel rounded-2xl p-6 sm:p-8 border border-slate-800 space-y-4">
        <div className="flex items-center gap-2.5 text-cyan-400">
          <BadgeCheck className="w-5 h-5" />
          <h2 className="text-lg font-bold text-white tracking-tight">Responsible Disclosure</h2>
        </div>
        <p className="text-sm text-slate-200 leading-relaxed">
          Please report security vulnerabilities responsibly. Do not access, modify, download, or disclose data belonging to other users.
        </p>
        <p className="text-xs text-slate-400 leading-relaxed">
          We deeply value the contributions of independent cybersecurity professionals and ethical researchers. If you identify a potential security flaw in any authorized scope, we ask that you allow our security team a reasonable period to review, triage, and remediate the issue prior to public disclosure.
        </p>
      </section>

      {/* Authorized Testing Section */}
      <section className="soc-glass-panel rounded-2xl p-6 sm:p-8 border border-slate-800 space-y-4">
        <div className="flex items-center gap-2.5 text-cyan-400">
          <Lock className="w-5 h-5" />
          <h2 className="text-lg font-bold text-white tracking-tight">Authorized Testing</h2>
        </div>
        <p className="text-sm text-slate-200 leading-relaxed">
          Only perform security testing when you have explicit authorization from the system owner.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-2">
            <span className="text-emerald-400 font-semibold uppercase tracking-wider block">
              In-Scope Activities:
            </span>
            <ul className="space-y-1.5 text-slate-300 list-disc list-inside">
              <li>Authentication & authorization bypass analysis</li>
              <li>Injection vulnerabilities (SQLi, SSRF, XSS)</li>
              <li>Insecure direct object reference (IDOR) tests</li>
              <li>API logic errors and access validation flaws</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-2">
            <span className="text-rose-400 font-semibold uppercase tracking-wider block">
              Strictly Out-of-Scope (Prohibited):
            </span>
            <ul className="space-y-1.5 text-slate-300 list-disc list-inside">
              <li>Denial of Service (DoS / DDoS) volumetric floods</li>
              <li>Physical intrusion against data centers or offices</li>
              <li>Social engineering, phishing, or spear-phishing employees</li>
              <li>Destruction, alteration, or corruption of customer data</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Safe Harbor Statement */}
      <section className="p-5 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 text-xs text-slate-300 space-y-2">
        <h3 className="font-semibold text-cyan-300 uppercase tracking-wider">
          Legal Safe Harbor Commitment
        </h3>
        <p className="leading-relaxed">
          If you conduct vulnerability research in good faith and in strict accordance with this policy, we consider your actions authorized, will not initiate or pursue legal action against you, and will work cooperatively to validate and remediate your findings.
        </p>
      </section>

      {/* Emergency Contact & RFC 9116 */}
      <section className="soc-glass-panel rounded-2xl p-6 sm:p-8 border border-slate-800 space-y-6">
        <div className="flex items-center gap-2.5 text-cyan-400">
          <Mail className="w-5 h-5" />
          <h2 className="text-lg font-bold text-white tracking-tight">Emergency Contact & Escalation</h2>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed">
          For critical incidents requiring immediate SOC containment, use the following operational contact endpoints:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
            <div className="text-slate-500 uppercase tracking-wider font-sans text-[11px]">Primary Incident Intake</div>
            <div className="text-cyan-300 font-semibold">https://ais-dev...run.app/report</div>
            <div className="text-slate-400 text-[11px] font-sans">Automated P1-P3 triage router</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
            <div className="text-slate-500 uppercase tracking-wider font-sans text-[11px]">RFC 9116 security.txt</div>
            <div className="text-cyan-300 font-semibold">/.well-known/security.txt</div>
            <div className="text-slate-400 text-[11px] font-sans">Canonical machine-readable manifest</div>
          </div>
        </div>

        {/* PGP Public Key Block */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300 uppercase tracking-wider">
              PGP Public Key for Encrypted Communications
            </span>
            <button
              onClick={copyKey}
              className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors text-[11px]"
            >
              {copiedKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey ? 'Copied' : 'Copy Key'}</span>
            </button>
          </div>

          <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 font-mono overflow-x-auto">
            {pgpKey}
          </pre>
        </div>
      </section>
    </div>
  );
};
