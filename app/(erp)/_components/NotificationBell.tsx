"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  href: string | null;
  read: boolean;
  createdAt: string;
}

export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const response = await fetch("/api/notifications");
      if (!response.ok) return;
      const data = await response.json();
      setItems(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      // Silent — the bell just stays at its last known state.
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 25000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Unread only clears once the tray has actually been opened -- not just
  // fetched in the background -- and only after a beat, so the unread
  // styling is visible for a moment rather than vanishing the instant you
  // open it.
  useEffect(() => {
    if (!open || unreadCount === 0) return;
    const timer = setTimeout(() => {
      setItems((prev) => prev.map((entry) => ({ ...entry, read: true })));
      setUnreadCount(0);
      fetch("/api/notifications/read-all", { method: "POST" }).catch(() => {});
    }, 1200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleItemClick(item: NotificationItem) {
    setOpen(false);
    if (!item.read) {
      setItems((prev) => prev.map((entry) => (entry.id === item.id ? { ...entry, read: true } : entry)));
      setUnreadCount((count) => Math.max(0, count - 1));
      fetch(`/api/notifications/${item.id}/read`, { method: "POST" }).catch(() => {});
    }
    if (item.href) router.push(item.href);
  }

  async function handleMarkAllRead() {
    setItems((prev) => prev.map((entry) => ({ ...entry, read: true })));
    setUnreadCount(0);
    fetch("/api/notifications/read-all", { method: "POST" }).catch(() => {});
  }

  return (
    <div className="notification-bell" ref={containerRef}>
      <button aria-label="Notifications" onClick={() => setOpen((value) => !value)}>
        <Bell size={16} />
        {unreadCount > 0 && <span className="notification-dot" />}
      </button>

      {open && (
        <div className="notification-panel">
          <div className="notification-panel-header">
            <strong>Notifications</strong>
            {unreadCount > 0 && <button type="button" onClick={handleMarkAllRead}>Mark all read</button>}
          </div>
          <div className="notification-panel-list">
            {items.length === 0 && <p className="notification-empty">You&apos;re all caught up.</p>}
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`notification-item${item.read ? "" : " unread"}`}
                onClick={() => handleItemClick(item)}
              >
                <span className="notification-item-dot" aria-hidden="true" />
                <span className="notification-item-body">
                  <strong>{item.title}</strong>
                  <small>{item.message}</small>
                  <time>{new Date(item.createdAt).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}</time>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
