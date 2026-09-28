import React, { useState } from 'react';
import { Shield, ShieldAlert, Search, FileText, Lock, Menu, X } from 'lucide-react';

interface NavbarProps {
  currentRoute: string;
  navigate: (route: string) => void;
  isAdminLoggedIn?: boolean;
  onAdminLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRoute,
  navigate,
  isAdminLoggedIn,
  onAdminLogout,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNav = (route: string) => {
    navigate(route);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Single text element Brand Zone */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => handleNav('home')}
            className="flex items-center gap-2 text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 rounded"
          >
            <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:border-cyan-400/60 transition-colors">
              <Shield className="w-4 h-4" />
            </div>
            <span className="text-base font-semibold tracking-tight text-slate-100 group-hover:text-cyan-300 transition-colors whitespace-nowrap">
              Security Operations Center
            </span>
          </button>
        </div>

        {/* Zone 2: 4-6 clean text navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-300">
          <button
            onClick={() => handleNav('report')}
            className={`transition-colors hover:text-cyan-400 focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500 py-1 ${
              currentRoute === 'report' ? 'text-cyan-400 border-b-2 border-cyan-400 font-semibold' : 'text-slate-300'
            }`}
          >
            Report Incident
          </button>
          <button
            onClick={() => handleNav('status')}
            className={`transition-colors hover:text-cyan-400 focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500 py-1 ${
              currentRoute === 'status' ? 'text-cyan-400 border-b-2 border-cyan-400 font-semibold' : 'text-slate-300'
            }`}
          >
            Check Status
          </button>
          <button
            onClick={() => handleNav('security')}
            className={`transition-colors hover:text-cyan-400 focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500 py-1 ${
              currentRoute === 'security' ? 'text-cyan-400 border-b-2 border-cyan-400 font-semibold' : 'text-slate-300'
            }`}
          >
            Security Policy
          </button>
          <button
            onClick={() => handleNav('privacy')}
            className={`transition-colors hover:text-cyan-400 focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500 py-1 ${
              currentRoute === 'privacy' ? 'text-cyan-400 border-b-2 border-cyan-400 font-semibold' : 'text-slate-300'
            }`}
          >
            Privacy Notice
          </button>
          <button
            onClick={() => handleNav(isAdminLoggedIn ? 'admin' : 'login')}
            className={`transition-colors hover:text-cyan-400 focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500 py-1 flex items-center gap-1.5 ${
              currentRoute === 'admin' || currentRoute === 'login' ? 'text-cyan-400 border-b-2 border-cyan-400 font-semibold' : 'text-slate-400'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{isAdminLoggedIn ? 'SOC Console' : 'Analyst Login'}</span>
          </button>
        </nav>

        {/* Zone 3: 1-2 primary actions */}
        <div className="flex items-center gap-3">
          {isAdminLoggedIn ? (
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={() => handleNav('admin')}
                className="px-3.5 py-1.5 text-xs font-medium text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 rounded-lg hover:bg-cyan-900/40 hover:border-cyan-400/50 transition-colors whitespace-nowrap"
              >
                SOC Dashboard
              </button>
              {onAdminLogout && (
                <button
                  onClick={onAdminLogout}
                  className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors whitespace-nowrap"
                >
                  Sign Out
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={() => handleNav('report')}
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-950 bg-gradient-to-r from-cyan-400 to-sky-400 rounded-lg hover:from-cyan-300 hover:to-sky-300 transition-all shadow-sm shadow-cyan-500/20 active:scale-98 whitespace-nowrap"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Report Incident</span>
            </button>
          )}

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-400 hover:text-slate-200 focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-800 bg-slate-950/95 px-4 pt-3 pb-5 space-y-2.5">
          <button
            onClick={() => handleNav('report')}
            className="w-full text-left px-3 py-2 rounded-md text-sm font-medium text-cyan-300 bg-cyan-950/30 border border-cyan-800/40"
          >
            Report an Incident
          </button>
          <button
            onClick={() => handleNav('status')}
            className="w-full text-left px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-900"
          >
            Check Report Status
          </button>
          <button
            onClick={() => handleNav('security')}
            className="w-full text-left px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-900"
          >
            Security & Responsible Disclosure
          </button>
          <button
            onClick={() => handleNav('privacy')}
            className="w-full text-left px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-900"
          >
            Privacy Notice
          </button>
          <button
            onClick={() => handleNav(isAdminLoggedIn ? 'admin' : 'login')}
            className="w-full text-left px-3 py-2 rounded-md text-sm font-medium text-slate-400 hover:bg-slate-900 flex items-center justify-between"
          >
            <span>{isAdminLoggedIn ? 'SOC Operations Dashboard' : 'Security Team Portal'}</span>
            <Lock className="w-3.5 h-3.5" />
          </button>
          {isAdminLoggedIn && onAdminLogout && (
            <button
              onClick={() => {
                onAdminLogout();
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-md text-sm font-medium text-rose-400 hover:bg-slate-900"
            >
              Sign Out of Analyst Session
            </button>
          )}
        </div>
      )}
    </header>
  );
};
