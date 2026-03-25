import React, { useState, useRef, useEffect } from 'react';
import styles from './NotificationDropdown.module.css';

const MOCK_NOTIFICATIONS = [
  { id: 1, type: 'message', text: 'Mina sent you a message about the HackSprint API.', read: false, time: '2m' },
  { id: 2, type: 'request', text: 'Arjun requested to join DevAssemble Core.', read: false, time: '1h' },
  { id: 3, type: 'accepted', text: 'You were accepted into FlowBoard Mobile!', read: true, time: '1d' },
];

export default function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const dropdownRef = useRef(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleToggle = () => {
    setOpen(!open);
    if (!open && unreadCount > 0) {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }
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
            {notifications.map(note => (
              <div key={note.id} className={`${styles.item} ${!note.read ? styles.unread : ''}`}>
                <div className={styles.icon}>
                  {note.type === 'message' && '💬'}
                  {note.type === 'request' && '✋'}
                  {note.type === 'accepted' && '🎉'}
                </div>
                <div className={styles.content}>
                  <p>{note.text}</p>
                  <span className={styles.time}>{note.time} ago</span>
                </div>
                {!note.read && <div className={styles.unreadDot} />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
