"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  ClipboardList,
  Clock,
  ExternalLink,
  Headset,
  Home,
  MailQuestion,
  Menu,
  Package,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Truck,
  Undo2,
  UserCog,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { hueFor, initialsFor } from "../../../modules/shared/identity";
import { NAV_ITEMS, type NavItem } from "./nav-items";
import LogoutButton from "./LogoutButton";
import NotificationBell from "./NotificationBell";

const NAV_ICONS: Record<NavItem["icon"], LucideIcon> = {
  home: Home,
  orders: ShoppingBag,
  returns: Undo2,
  recovery: MailQuestion,
  customers: Users,
  inventory: Package,
  procurement: Truck,
  support: Headset,
  finance: Wallet,
  analytics: BarChart3,
  team: UserCog,
  attendance: Clock,
  tasks: ClipboardList,
  audit: ShieldCheck,
  settings: Settings,
};

interface ErpShellProps {
  roleLabel: string;
  name: string;
  permissions: string[];
  badges?: Record<string, number>;
  children: React.ReactNode;
}

export default function ErpShell({ roleLabel, name, permissions, badges = {}, children }: ErpShellProps) {
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);
  const visibleNavigation = NAV_ITEMS.filter((item) => {
    if (!item.permission) return true;
    const required = Array.isArray(item.permission) ? item.permission : [item.permission];
    return required.some((permission) => permissions.includes(permission));
  });

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  return (
    <main className="erp-canvas">
      <div className={`erp-backdrop ${navOpen ? "open" : ""}`} onClick={() => setNavOpen(false)} aria-hidden="true" />

      <aside className={`erp-sidebar ${navOpen ? "open" : ""}`}>
        <button className="erp-sidebar-close" aria-label="Close menu" onClick={() => setNavOpen(false)}><X size={16} /></button>
        <a className="erp-brand" href="/dashboard" aria-label="Veronica Young dashboard">
          <img src="/brand/logo-mark-white.png" alt="" className="erp-monogram" />
          <span><strong>VERONICA YOUNG</strong><small>BUSINESS SUITE</small></span>
        </a>
        <nav className="erp-nav" aria-label="Primary navigation">
          <p>Workspace</p>
          {visibleNavigation.map((item) => {
            const badgeCount = badges[item.href] ?? 0;
            const Icon = NAV_ICONS[item.icon];
            return (
              <a className={pathname === item.href ? "active" : ""} href={item.href} key={item.href}>
                <span><Icon size={16} strokeWidth={1.75} /></span>{item.label}
                {badgeCount > 0 && <em className="nav-badge">{badgeCount}</em>}
              </a>
            );
          })}
        </nav>
        <div className="erp-sidebar-foot">
          <div className="sandbox-chip"><span /> Sandbox mode</div>
          <LogoutButton />
        </div>
      </aside>

      <section className="erp-main">
        <header className="erp-topbar">
          <div>
            <button className="erp-menu-toggle" aria-label="Open menu" onClick={() => setNavOpen(true)}><Menu size={17} /></button>
            <img src="/brand/logo-mark-ink.png" alt="" className="erp-mobile-brand" />
            <span className="erp-location">Lagos showroom · Live overview</span>
          </div>
          <div className="erp-top-actions">
            <a className="erp-view-site" href="/store" target="_blank" rel="noopener noreferrer" aria-label="View site">
              <span className="erp-view-site-label">View site</span> <ExternalLink size={13} />
            </a>
            <NotificationBell />
            <div className="header-identity">
              <span className="header-avatar" style={{ background: hueFor(name) }} title={name}>{initialsFor(name)}</span>
              <div className="role-pill"><span>{roleLabel}</span>{name}</div>
            </div>
          </div>
        </header>

        <div className="erp-content">{children}</div>
      </section>
    </main>
  );
}
