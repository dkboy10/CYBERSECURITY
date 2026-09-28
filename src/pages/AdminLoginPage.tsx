import React, { useState } from 'react';
import {
  Lock,
  ShieldAlert,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Terminal,
  ShieldCheck,
} from 'lucide-react';
import type { AnalystUser } from '../types/security.ts';

interface AdminLoginPageProps {
  onLoginSuccess: (user: AnalystUser) => void;
  navigate: (route: string) => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({ onLoginSuccess, navigate }) => {
  const [username, setUsername] = useState('CYBERSECURITY');
  const [password, setPassword] = useState('00000');
  const [mfaCode, setMfaCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lockoutRemaining, setLockoutRemaining] = useState<number | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password,
          mfaCode: mfaCode.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.lockoutRemainingSeconds) {
          setLockoutRemaining(data.lockoutRemainingSeconds);
        }
        throw new Error(data.error || 'Authentication rejected. Verify credentials.');
      }

      onLoginSuccess(data.user);
      navigate('admin');
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const setDemoCredentials = (role: 'lead' | 'triage') => {
    if (role === 'lead') {
      setUsername('CYBERSECURITY');
      setPassword('00000');
    } else {
      setUsername('dkboykgc');
      setPassword('dkanddk');
    }
    setMfaCode('123456');
    setErrorMessage(null);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16 relative z-10 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 mx-auto shadow-lg shadow-cyan-950/50">
          <Lock className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Security Operations Center
        </h1>
        <p className="text-xs text-slate-400">
          Authorized Security-Team Authentication Gateway
        </p>
      </div>

      <div className="soc-glass-panel rounded-2xl p-6 sm:p-8 border border-slate-800 space-y-6">
        {errorMessage && (
          <div className="p-3.5 rounded-lg bg-rose-950/50 border border-rose-500/50 text-rose-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <div>
              <span>{errorMessage}</span>
              {lockoutRemaining && (
                <div className="font-mono text-[11px] mt-1 text-rose-200">
                  Account locked for: {lockoutRemaining} seconds
                </div>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-200 uppercase tracking-wider mb-1.5">
              Analyst Identifier / Email
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="analyst@soc.internal"
              className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-cyan-400 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-200 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-cyan-400 font-mono pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* MFA Token */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-200 uppercase tracking-wider">
                MFA Token (Optional / Demo)
              </label>
              <span className="text-[11px] text-cyan-400 font-mono">6-digit TOTP</span>
            </div>
            <input
              type="text"
              maxLength={6}
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value)}
              placeholder="e.g. 123456"
              className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-cyan-400 font-mono tracking-widest"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-950 bg-gradient-to-r from-cyan-400 to-sky-400 hover:from-cyan-300 hover:to-sky-300 rounded-lg shadow-sm shadow-cyan-500/20 active:scale-98 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <KeyRound className="w-3.5 h-3.5" />
                <span>Authenticate Session</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Credentials for Authorized Evaluators */}
        <div className="pt-4 border-t border-slate-800 space-y-2">
          <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
            Authorized Demo Credentials:
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => setDemoCredentials('lead')}
              className="p-2 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-left transition-colors"
            >
              <div className="font-semibold text-cyan-300 text-[11px]">Tier 3 Lead</div>
              <div className="text-[10px] text-slate-400 truncate">analyst@soc.internal</div>
            </button>
            <button
              type="button"
              onClick={() => setDemoCredentials('triage')}
              className="p-2 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-left transition-colors"
            >
              <div className="font-semibold text-cyan-300 text-[11px]">Tier 1 Triage</div>
              <div className="text-[10px] text-slate-400 truncate">analyst-triage@...</div>
            </button>
          </div>
        </div>

        {/* Security Controls Assurance */}
        <div className="pt-2 text-[11px] text-slate-500 space-y-1">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3 h-3 text-cyan-400" />
            <span>Scrypt Hash · HTTP-Only Cookies · 15m Lockout Rule</span>
          </div>
          <p>
            Unauthorized access attempts are audited and logged with client provenance.
          </p>
        </div>
      </div>
    </div>
  );
};
