'use client';

import { useAuth } from '@/features/auth/contexts/auth-context';
import { useEffect, useState } from 'react';

interface Notification {
  id: string;
  channel: string;
  eventType: string;
  subject?: string;
  body?: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

  useEffect(() => {
    if (!token) return;

    fetch(`${apiUrl}/notifications/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((json: { data?: Notification[] }) => {
        setNotifications(json.data ?? []);
      })
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  }, [token, apiUrl]);

  const markAsRead = async (notificationId: string) => {
    if (!token) return;

    try {
      await fetch(`${apiUrl}/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n)),
      );
    } catch {
      // ignore
    }
  };

  const markAllAsRead = async () => {
    if (!token) return;

    try {
      await fetch(`${apiUrl}/notifications/me/read-all`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      // ignore
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (loading) {
    return (
      <main className="notifications-page">
        <h1>Notifications</h1>
        <div className="loading-skeleton">Loading notifications...</div>
      </main>
    );
  }

  return (
    <main className="notifications-page">
      <div className="notifications-header">
        <h1>
          Notifications
          {unreadCount > 0 && (
            <span className="unread-badge">{unreadCount}</span>
          )}
        </h1>
        {unreadCount > 0 && (
          <button className="mark-all-read-btn" onClick={markAllAsRead}>
            Mark all as read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="empty-state">
          <p>No notifications yet.</p>
        </div>
      ) : (
        <div className="notification-list">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`notification-item ${notification.isRead ? 'read' : 'unread'}`}
              onClick={() => {
                if (!notification.isRead) markAsRead(notification.id);
              }}
            >
              <div className="notification-icon">
                {notification.eventType.includes('booking') && '📅'}
                {notification.eventType.includes('record') && '📋'}
                {notification.eventType.includes('consent') && '📝'}
                {!notification.eventType.includes('booking') &&
                  !notification.eventType.includes('record') &&
                  !notification.eventType.includes('consent') &&
                  '🔔'}
              </div>
              <div className="notification-body">
                {notification.subject && <h3>{notification.subject}</h3>}
                <p>{notification.body ?? notification.eventType}</p>
                <time>{new Date(notification.createdAt).toLocaleString()}</time>
              </div>
              {!notification.isRead && <span className="unread-dot" />}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
