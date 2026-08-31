import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Menu,
  X,
  LayoutDashboard,
  Calendar,
  Layers,
  Swords,
  MessageSquare,
  Users,
  Bot,
  Library,
  FileSpreadsheet,
  LineChart,
  Settings,
  Sparkles,
} from 'lucide-react';
import NotificationBell from './notifications/NotificationBell';
import ThemeToggle from './ThemeToggle';

const NAV_LINKS = [
  { to: '/dashboard', label: 'Dashboard', preload: () => import('../pages/Dashboard') },
  { to: '/study-planner', label: 'Study Planner', preload: () => import('../pages/StudyPlanner') },
  { to: '/flashcards/review', label: 'Flashcards', preload: () => import('../pages/FlashcardReview') },
  { to: '/battle', label: 'Battle Arena', preload: () => import('../pages/BattleArena') },
  { to: '/study-group', label: 'Study Group', preload: () => import('../pages/StudyGroupChat') },
  { to: '/squads', label: 'Study Squads', preload: () => import('../pages/SquadsPage') },
  { to: '/bounties', label: 'Bounty Board', preload: () => import('../pages/BountyBoardPage') },
  { to: '/code/sandbox', label: 'Code Sandbox', preload: () => import('../pages/code/CodeSandboxPage') },
  { to: '/ai-assistant', label: 'AI Mentor Chat', preload: () => import('../pages/AiAssistant') },
  { to: '/community/decks', label: 'Community Library', preload: () => import('../pages/CommunityDecks') },
  { to: '/settings', label: 'Settings', preload: () => import('../pages/Settings') },
];

const MobileNavDrawer = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const triggerRef = useRef(null);
  const drawerRef = useRef(null);
  const closeBtnRef = useRef(null);

  // Close the drawer automatically whenever the route changes
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // Focus Trapping and Body Scroll Lock
  useEffect(() => {
    if (!isOpen) {
      document.body.style.overflow = '';
      return;
    }

    // Lock body scroll when drawer is open
    document.body.style.overflow = 'hidden';

    // Focus initial focusable element inside drawer
    const focusTimer = setTimeout(() => {
      if (closeBtnRef.current) {
        closeBtnRef.current.focus();
      }
    }, 50);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        if (triggerRef.current) triggerRef.current.focus();
        return;
      }

      if (e.key === 'Tab' && drawerRef.current) {
        const focusables = drawerRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;

        const firstElement = focusables[0];
        const lastElement = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen((prev) => {
      const nextState = !prev;
      if (!nextState && triggerRef.current) {
        triggerRef.current.focus();
      }
      return nextState;
    });
  };

  return (
    <>
      {/* Mobile Top Header Actions Bar (<= 768px visible) */}
      <div
        className="md:hidden flex items-center gap-2.5 fixed top-3 right-3 z-[60] bg-slate-900/80 p-2 rounded-2xl border border-slate-800/80 backdrop-blur-md shadow-xl"
        role="region"
        aria-label="Mobile Header Actions"
      >
        <ThemeToggle />
        <div className="bg-slate-800/80 rounded-full border border-slate-700/50 p-1">
          <NotificationBell />
        </div>
        <button
          ref={triggerRef}
          type="button"
          onClick={handleToggle}
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isOpen}
          aria-controls="mobile-drawer-panel"
          className="p-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-md transition-transform transform active:scale-95"
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Backdrop Overlay */}
      <div
        className={`mobile-drawer-overlay ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      {/* Drawer Panel Container (CSS Grid Layout) */}
      <div
        ref={drawerRef}
        id="mobile-drawer-panel"
        data-testid="mobile-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Mobile Navigation Menu"
        className={`mobile-drawer-panel ${isOpen ? 'open' : ''}`}
      >
        {/* Grid Header Section */}
        <div className="mobile-drawer-header">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-400 text-slate-950 font-bold flex items-center justify-center text-sm shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-amber-400 via-orange-300 to-amber-200 bg-clip-text text-transparent block">
                OpenPrep AI
              </span>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold block">
                Navigation
              </span>
            </div>
          </div>

          <button
            ref={closeBtnRef}
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Close navigation menu"
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Grid Main Navigation Content (Scrollable) */}
        <nav
          className="mobile-drawer-content"
          role="navigation"
          aria-label="Mobile Main Navigation"
        >
          {NAV_LINKS.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.to;

            return (
              <Link
                key={link.to}
                to={link.to}
                onMouseEnter={() => link.preload()}
                className={`flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-400 ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/10 border border-amber-500/30 text-amber-300 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Grid Footer Action Section */}
        <div className="mobile-drawer-footer">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Appearance & Settings</span>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </>
  );
};

export default MobileNavDrawer;
