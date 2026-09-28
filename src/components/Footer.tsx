import React from 'react';
import { ShieldCheck, Lock, ExternalLink, Terminal } from 'lucide-react';

interface FooterProps {
  navigate: (route: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ navigate }) => {
  return (
    <footer className="border-t border-slate-800/80 bg-slate-950/80 relative z-10 py-10 mt-20 text-slate-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Col 1: Brand & Purpose */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-slate-100 font-semibold text-sm">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>SECURITY OPERATIONS CENTER</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Authorized incident triage, vulnerability intake, and rapid cyber defense operations.
            </p>
            <div className="flex items-center gap-2 text-slate-500 pt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Intake Gateway Active · 24/7/365 On-Call SOC</span>
            </div>
          </div>

          {/* Col 2: Incident Reporting */}
          <div className="space-y-2.5">
            <h4 className="text-slate-200 font-medium text-xs uppercase tracking-wider">Triage & Verification</h4>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => navigate('report')}
                  className="hover:text-cyan-400 transition-colors text-left"
                >
                  Submit Incident Report
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('status')}
                  className="hover:text-cyan-400 transition-colors text-left"
                >
                  Track Report with Verification Code
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('security')}
                  className="hover:text-cyan-400 transition-colors text-left"
                >
                  Responsible Disclosure Guidelines
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('privacy')}
                  className="hover:text-cyan-400 transition-colors text-left"
                >
                  Privacy & Data Retention Matrix
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Specifications & Protocols */}
          <div className="space-y-2.5">
            <h4 className="text-slate-200 font-medium text-xs uppercase tracking-wider">Standards & Directives</h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="/.well-known/security.txt"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-cyan-400 transition-colors inline-flex items-center gap-1"
                >
                  <span>RFC 9116 security.txt</span>
                  <ExternalLink className="w-3 h-3 text-slate-600" />
                </a>
              </li>
              <li>
                <span className="text-slate-400">Zero-Secret Policy: No Passwords Ingested</span>
              </li>
              <li>
                <span className="text-slate-400">Isolated Evidence Storage (Non-Public)</span>
              </li>
              <li>
                <button
                  onClick={() => navigate('login')}
                  className="hover:text-cyan-400 transition-colors text-left flex items-center gap-1"
                >
                  <Lock className="w-3 h-3" />
                  <span>Authorized Personnel Gateway</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: Verified Encryption */}
          <div className="space-y-2.5">
            <h4 className="text-slate-200 font-medium text-xs uppercase tracking-wider">PGP Fingerprint</h4>
            <div className="p-2.5 rounded border border-slate-800 bg-slate-900/60 font-mono text-[11px] text-slate-400 leading-tight break-all">
              <span className="text-cyan-400">SOC PGP KEY:</span>
              <div className="mt-1 text-slate-400 select-all">
                4A9F 8201 BE74 C259 88FA
                <br />
                0941 71EB 338C E902 447B
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              Technical metadata is never shared with third parties.
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500 text-[11px]">
          <div>
            © {new Date().getFullYear()} Authorized Security Operations Center. All rights reserved.
          </div>
          <div className="flex items-center gap-4">
            <span>Confidential & Authorized Use Only</span>
            <span>·</span>
            <span>Strict Zero-Telemetry Policy</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
