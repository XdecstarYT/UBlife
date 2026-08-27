import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store/gameStore';

const TOAST_LIFETIME_MS = 4500;
const MAX_VISIBLE = 3;

interface Toast {
  id: number;
  text: string;
  expiresAt: number;
}

export function NotificationToasts() {
  const notifications = useGameStore((s) => s.notifications);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const lastSeenId = useRef(0);
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      // Don't replay a loaded save's entire notification history as toasts on mount.
      initialized.current = true;
      lastSeenId.current = notifications.length > 0 ? notifications[notifications.length - 1].id : 0;
      return;
    }

    const fresh = notifications.filter((n) => n.id > lastSeenId.current);
    if (fresh.length === 0) return;
    lastSeenId.current = notifications[notifications.length - 1].id;
    const now = Date.now();
    setToasts((prev) => [
      ...prev,
      ...fresh.map((n) => ({ id: n.id, text: n.text, expiresAt: now + TOAST_LIFETIME_MS })),
    ]);
  }, [notifications]);

  useEffect(() => {
    if (toasts.length === 0) return;
    const interval = setInterval(() => {
      const now = Date.now();
      setToasts((prev) => prev.filter((t) => t.expiresAt > now));
    }, 500);
    return () => clearInterval(interval);
  }, [toasts.length]);

  const visible = toasts.slice(-MAX_VISIBLE);
  if (visible.length === 0) return null;

  return (
    <div className="toast-stack">
      {visible.map((t) => (
        <div key={t.id} className="toast-item">
          {t.text}
        </div>
      ))}
    </div>
  );
}
