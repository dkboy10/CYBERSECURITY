import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar.tsx';
import { Footer } from './components/Footer.tsx';
import { BackgroundNetwork } from './components/BackgroundNetwork.tsx';
import { LandingPage } from './pages/LandingPage.tsx';
import { ReportIncidentPage } from './pages/ReportIncidentPage.tsx';
import { StatusPage } from './pages/StatusPage.tsx';
import { SecurityPolicyPage } from './pages/SecurityPolicyPage.tsx';
import { PrivacyPage } from './pages/PrivacyPage.tsx';
import { AdminLoginPage } from './pages/AdminLoginPage.tsx';
import { AdminDashboard } from './pages/AdminDashboard.tsx';
import type { AnalystUser } from './types/security.ts';

export default function App() {
  const [currentRoute, setCurrentRoute] = useState<string>('home');
  const [routeParams, setRouteParams] = useState<Record<string, string>>({});
  const [currentUser, setCurrentUser] = useState<AnalystUser | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // Sync route from URL pathname on initial load and popstate
  useEffect(() => {
    const handleUrlChange = () => {
      const pathname = window.location.pathname;
      const searchParams = new URLSearchParams(window.location.search);
      const params: Record<string, string> = {};
      searchParams.forEach((val, key) => {
        params[key] = val;
      });
      setRouteParams(params);

      if (pathname === '/report') {
        setCurrentRoute('report');
      } else if (pathname === '/status') {
        setCurrentRoute('status');
      } else if (pathname === '/security') {
        setCurrentRoute('security');
      } else if (pathname === '/privacy') {
        setCurrentRoute('privacy');
      } else if (pathname === '/admin/login') {
        setCurrentRoute('login');
      } else if (pathname.startsWith('/admin')) {
        setCurrentRoute('admin');
      } else {
        setCurrentRoute('home');
      }
    };

    handleUrlChange();
    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, []);

  // Check existing analyst session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/admin/me');
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setCurrentUser(data.user);
          }
        }
      } catch (e) {
        console.warn('Session check failed:', e);
      } finally {
        setIsAuthChecking(false);
      }
    };

    checkSession();
  }, []);

  const navigate = (route: string, params?: Record<string, string>) => {
    setCurrentRoute(route);
    setRouteParams(params || {});

    // Update browser URL
    let path = '/';
    if (route === 'report') path = '/report';
    else if (route === 'status') path = '/status';
    else if (route === 'security') path = '/security';
    else if (route === 'privacy') path = '/privacy';
    else if (route === 'login') path = '/admin/login';
    else if (route === 'admin') path = '/admin';

    let queryString = '';
    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams(params);
      queryString = `?${searchParams.toString()}`;
    }

    window.history.pushState({}, '', `${path}${queryString}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch (e) {
      console.error('Logout request failed:', e);
    }
    setCurrentUser(null);
    navigate('home');
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-slate-950 text-slate-100 overflow-x-hidden soc-grid-bg">
      {/* Subtle animated network particles in background */}
      <BackgroundNetwork />

      {/* Radial soft cyan ambient glow */}
      <div className="fixed inset-0 pointer-events-none soc-radial-glow z-0" aria-hidden="true" />

      {/* Top Navbar adhering to Top Bar Contract */}
      <Navbar
        currentRoute={currentRoute}
        navigate={navigate}
        isAdminLoggedIn={!!currentUser}
        onAdminLogout={handleLogout}
      />

      {/* Main Viewport Container */}
      <main className="flex-1 relative z-10">
        {currentRoute === 'home' && <LandingPage navigate={navigate} />}

        {currentRoute === 'report' && <ReportIncidentPage navigate={navigate} />}

        {currentRoute === 'status' && (
          <StatusPage
            initialReportId={routeParams.id || ''}
            initialCode={routeParams.code || ''}
            navigate={navigate}
          />
        )}

        {currentRoute === 'security' && <SecurityPolicyPage navigate={navigate} />}

        {currentRoute === 'privacy' && <PrivacyPage navigate={navigate} />}

        {currentRoute === 'login' && (
          <AdminLoginPage
            onLoginSuccess={(user) => {
              setCurrentUser(user);
              navigate('admin');
            }}
            navigate={navigate}
          />
        )}

        {currentRoute === 'admin' && (
          currentUser ? (
            <AdminDashboard
              currentUser={currentUser}
              onLogout={handleLogout}
              navigate={navigate}
            />
          ) : (
            <AdminLoginPage
              onLoginSuccess={(user) => {
                setCurrentUser(user);
                navigate('admin');
              }}
              navigate={navigate}
            />
          )
        )}
      </main>

      {/* Professional Cybersecurity Footer */}
      <Footer navigate={navigate} />
    </div>
  );
}
