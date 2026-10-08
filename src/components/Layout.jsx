import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { useLocation } from 'react-router-dom';

import Header from './Header';
import Sidebar from './Sidebar';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const sidebarRef = useRef(null);
  const location = useLocation();

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  const openSidebar = useCallback(() => {
    setSidebarOpen(true);
  }, []);

  // Close the drawer after navigation, including browser back/forward.
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname, location.search]);

  // Desktop uses a permanently visible sidebar.
  useEffect(() => {
    const desktopQuery = window.matchMedia('(min-width: 1024px)');

    const handleBreakpoint = () => {
      if (desktopQuery.matches) {
        setSidebarOpen(false);
      }
    };

    handleBreakpoint();
    desktopQuery.addEventListener('change', handleBreakpoint);

    return () => {
      desktopQuery.removeEventListener('change', handleBreakpoint);
    };
  }, []);

  useEffect(() => {
    if (!sidebarOpen) return undefined;

    const panel = sidebarRef.current;

    if (!panel) return undefined;

    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = 'hidden';

    const getFocusableElements = () =>
      Array.from(panel.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
        (element) => element.getClientRects().length > 0
      );

    const focusFrame = window.requestAnimationFrame(() => {
      const closeButton = panel.querySelector('[data-sidebar-close]');
      (closeButton || panel).focus();
    });

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeSidebar();
        return;
      }

      if (event.key !== 'Tab') return;

      const elements = getFocusableElements();

      if (!elements.length) {
        event.preventDefault();
        panel.focus();
        return;
      }

      const first = elements[0];
      const last = elements[elements.length - 1];
      const current = document.activeElement;
      const outsidePanel = !panel.contains(current);

      if (event.shiftKey) {
        if (current === first || current === panel || outsidePanel) {
          event.preventDefault();
          last.focus();
        }
      } else if (current === last || current === panel || outsidePanel) {
        event.preventDefault();
        first.focus();
      }
    };

    // Keep programmatic keyboard focus within the open drawer.
    const handleFocusIn = (event) => {
      if (!panel.contains(event.target)) {
        const first = getFocusableElements()[0];
        (first || panel).focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('focusin', handleFocusIn);

    return () => {
      window.cancelAnimationFrame(focusFrame);

      document.body.style.overflow = previousOverflow;

      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('focusin', handleFocusIn);

      if (
        previouslyFocused instanceof HTMLElement &&
        previouslyFocused.isConnected &&
        previouslyFocused.getClientRects().length > 0
      ) {
        previouslyFocused.focus();
      }
    };
  }, [sidebarOpen, closeSidebar]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased selection:bg-indigo-100 selection:text-indigo-900">
      <Sidebar
        open={sidebarOpen}
        onClose={closeSidebar}
        panelRef={sidebarRef}
      />

      {/* Hide background content from screen readers while drawer is open. */}
      <div aria-hidden={sidebarOpen ? true : undefined}>
        <a
          href="#page-content"
          className="sr-only fixed left-4 top-4 z-[70] rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white focus:not-sr-only"
        >
          Skip to page content
        </a>

        <Header
          onOpenSidebar={openSidebar}
          sidebarOpen={sidebarOpen}
        />

        <div
          id="page-content"
          tabIndex={-1}
          className="min-h-screen min-w-0 pt-16 outline-none lg:pl-72 lg:pt-20"
        >
          <div className="mx-auto w-full min-w-0">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Layout;