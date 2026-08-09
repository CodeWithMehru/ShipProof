import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { LayoutDashboard, FileBarChart, LogOut, Send, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function Layout() {
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-base flex flex-col">
      {/* ─── Top Navigation ─────────────────────────────────────── */}
      <header className="border-b border-border-subtle bg-base/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-all duration-300">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-accent">
                <path d="M21 7.5L12 3L3 7.5M21 7.5V16.5L12 21M21 7.5L12 12M3 7.5V16.5L12 21M3 7.5L12 12M12 21V12M8.5 12L11 14.5L16.5 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight text-text-primary">
              Ship<span className="text-accent">Proof</span>
            </span>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-1">
            <Link
              to="/"
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive('/')
                  ? 'text-accent bg-accent/8'
                  : 'text-text-muted hover:text-text-primary hover:bg-base-elevated'
              }`}
            >
              <Send size={15} />
              Submit
            </Link>

            {isAuthenticated && (
              <>
                <Link
                  to="/dashboard"
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    location.pathname.startsWith('/dashboard')
                      ? 'text-accent bg-accent/8'
                      : 'text-text-muted hover:text-text-primary hover:bg-base-elevated'
                  }`}
                >
                  <LayoutDashboard size={15} />
                  Dashboard
                </Link>

                {user?.role === 'organizer' && (
                  <>
                    <Link
                    to="/report"
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive('/report')
                        ? 'text-accent bg-accent/8'
                        : 'text-text-muted hover:text-text-primary hover:bg-base-elevated'
                    }`}
                  >
                    <FileBarChart size={15} />
                    Report
                  </Link>

                  <Link
                    to="/settings"
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive('/settings')
                        ? 'text-accent bg-accent/8'
                        : 'text-text-muted hover:text-text-primary hover:bg-base-elevated'
                    }`}
                  >
                    <Settings size={15} />
                    Settings
                  </Link>
                  </>
                )}
              </>
            )}

            {isAuthenticated ? (
              <button
                onClick={logout}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium text-text-dim hover:text-status-danger hover:bg-status-danger/8 transition-all duration-200 ml-2"
              >
                <LogOut size={15} />
                Sign out
              </button>
            ) : (
              <Link
                to="/login"
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ml-2 ${
                  isActive('/login')
                    ? 'text-accent bg-accent/8'
                    : 'text-text-muted hover:text-text-primary hover:bg-base-elevated'
                }`}
              >
                Judge login
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* ─── Main Content ───────────────────────────────────────── */}
      <main className="flex-1 relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-full h-full"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ─── Footer ─────────────────────────────────────────────── */}
      <footer className="border-t border-border-subtle py-6">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <p className="text-xs text-text-dim">
            ShipProof automates what can be honestly automated without violating anyone's account security, and clearly hands off to a human judge for anything it cannot prove with certainty.
          </p>
          <p className="text-xs text-text-dim mono">
            v1.0.0
          </p>
        </div>
      </footer>
    </div>
  );
}
