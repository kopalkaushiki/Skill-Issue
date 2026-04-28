import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabaseClient';
import styles from './NotificationDropdown.module.css';

export default function NotificationDropdown() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const loadNotifications = async () => {
    if (!user) {
      setNotifications([]);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('notifications')
      .select('id, type, created_at, is_read, metadata')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && data) setNotifications(data);
    setLoading(false);
  };

  const handleToggle = () => {
    setOpen((v) => !v);
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    if (!open) return;

    // Mark as read when opening.
    (async () => {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      await loadNotifications();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user?.id]);

  return (
    <div className={styles.container} ref={dropdownRef}>
      <button 
        className={styles.bellButton} 
        onClick={handleToggle}
        aria-label="Notifications"
      >
        <span className={styles.bellIcon}>🔔</span>
        {unreadCount > 0 && <span className={styles.badge}>{unreadCount}</span>}
      </button>

      {open && (
        <div className={styles.dropdown}>
          <div className={styles.header}>
            <h4>Notifications</h4>
          </div>
          <div className={styles.list}>
            {loading && <div className={styles.item}>Loading…</div>}
            {!loading && !notifications.length && <div className={styles.item}>No notifications.</div>}

            {notifications.map((note) => {
              const label = note.type === 'application_accepted'
                ? 'Your application was accepted'
                : note.type === 'application_rejected'
                  ? 'Your application was rejected'
                  : note.type === 'new_application'
                    ? 'New application received on your request'
                  : note.type === 'message_received'
                    ? (note.metadata?.message_preview
                      ? `New message: ${note.metadata.message_preview}`
                      : 'You received a new message')
                  : note.type;

              return (
                <div
                  key={note.id}
                  className={`${styles.item} ${!note.is_read ? styles.unread : ''}`}
                >
                  <div className={styles.icon}>
                    {note.type === 'application_accepted' && '🎉'}
                    {note.type === 'application_rejected' && '⚠️'}
                    {note.type === 'new_application' && '📝'}
                    {note.type === 'message_received' && '💬'}
                    {note.type !== 'application_accepted' && note.type !== 'application_rejected' && note.type !== 'message_received' && note.type !== 'new_application' && '🔔'}
                  </div>
                  <div className={styles.content}>
                    <p>{label}</p>
                    <span className={styles.time}>{note.created_at ? 'Just now' : ''}</span>
                  </div>
                  {!note.is_read && <div className={styles.unreadDot} />}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
