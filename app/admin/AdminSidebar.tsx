/**
 * Admin Sidebar - Notion-style
 * Desktop: fixed sidebar 224px. Mobile: hamburger + drawer
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Publishing admin pages removed in Movement A; repopulated when admin is rebuilt (Movement B/C).
const navItems: { href: string; label: string; icon: string }[] = [];

function NavIcon({ d }: { d: string }) {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
    </svg>
  );
}

function SidebarContent({ pathname, onClose }: { pathname: string; onClose: () => void }) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">管理后台</h2>
      </div>
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2 rounded-[var(--radius)] text-sm transition-colors ${
                active ? 'bg-[var(--hover)] text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)] hover:bg-[var(--hover)]'
              }`}
            >
              <NavIcon d={item.icon} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export default function AdminSidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* Mobile hamburger */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-[var(--radius)] bg-[var(--bg-sidebar)] border border-border shadow-sm hover:bg-[var(--hover)]"
        aria-label="打开菜单"
      >
        <svg className="w-5 h-5 text-[var(--text-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-[var(--sidebar-width)] shrink-0 flex-col fixed left-0 top-0 bottom-0 bg-[var(--bg-sidebar)] border-r border-border">
        <SidebarContent pathname={pathname} onClose={() => setOpen(false)} />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setOpen(false)} aria-hidden />
          <aside className="fixed left-0 top-0 bottom-0 w-[min(280px,85vw)] bg-[var(--bg-sidebar)] border-r border-border z-50 lg:hidden shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">管理后台</h2>
              <button type="button" onClick={() => setOpen(false)} className="p-1.5 rounded-[var(--radius)] hover:bg-[var(--hover)] text-[var(--text-secondary)]">×</button>
            </div>
            <nav className="p-2 space-y-0.5">
              {navItems.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-[var(--radius)] text-sm ${active ? 'bg-[var(--hover)] font-medium' : 'hover:bg-[var(--hover)]'}`}
                  >
                    <NavIcon d={item.icon} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </aside>
        </>
      )}

      {/* Spacer for fixed desktop sidebar */}
      <div className="hidden lg:block w-[var(--sidebar-width)] shrink-0" />
    </>
  );
}
