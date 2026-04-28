import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import CurvedCard from '../../components/ui/CurvedCard';
import PillButton from '../../components/ui/PillButton';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabaseClient';
import styles from './MessagesPage.module.css';

export default function MessagesPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState('');

  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState('');

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const selectedUserId = searchParams.get('userId') || '';
  const selectedUser = useMemo(
    () => users.find((u) => u.id === selectedUserId) || null,
    [users, selectedUserId]
  );

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setUsersLoading(true);
      setUsersError('');
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, developer_role')
        .neq('id', user.id)
        .order('full_name', { ascending: true });

      if (cancelled) return;
      if (error) {
        setUsers([]);
        setUsersError(error.message || 'Failed to load users.');
      } else {
        setUsers(data || []);
      }
      setUsersLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    if (!user || !selectedUserId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setMessagesLoading(true);
      setMessagesError('');
      const { data, error } = await supabase
        .from('direct_messages')
        .select('id, sender_id, recipient_id, content, created_at')
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${selectedUserId}),and(sender_id.eq.${selectedUserId},recipient_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (cancelled) return;
      if (error) {
        setMessages([]);
        setMessagesError(error.message || 'Failed to load messages.');
      } else {
        setMessages(data || []);
      }
      setMessagesLoading(false);
    })();
    return () => { cancelled = true; };
  }, [selectedUserId, user]);

  const sendMessage = async () => {
    if (!user || !selectedUserId) return;
    const content = draft.trim();
    if (!content) return;

    setSending(true);
    setMessagesError('');
    const { data, error } = await supabase
      .from('direct_messages')
      .insert({
        sender_id: user.id,
        recipient_id: selectedUserId,
        content,
      })
      .select('id, sender_id, recipient_id, content, created_at')
      .single();

    if (error) {
      setMessagesError(error.message || 'Failed to send message.');
      setSending(false);
      return;
    }

    setMessages((prev) => [...prev, data]);
    setDraft('');

    // Fire a notification for the recipient's bell dropdown.
    const { error: notifError } = await supabase
      .from('notifications')
      .insert({
        user_id: selectedUserId,
        from_user_id: user.id,
        type: 'message_received',
        is_read: false,
        metadata: {
          message_id: data.id,
          message_preview: content.slice(0, 120),
        },
      });

    if (notifError) {
      // Keep message sent state successful; notification failure should not block chat.
      // eslint-disable-next-line no-console
      console.error(notifError);
    }

    setSending(false);
  };

  return (
    <AppLayout
      title="Messages"
      subtitle="Chat with other developers in DevAssemble."
      topActions={(
        <>
          <PillButton to="/dashboard">Dashboard</PillButton>
          <PillButton to="/projects">Projects</PillButton>
          <PillButton to="/profile">Profile</PillButton>
        </>
      )}
    >
      <section className={styles.layout}>
        <CurvedCard>
          <h3>Users</h3>
          {usersLoading && <p className={styles.meta}>Loading users…</p>}
          {usersError && <p style={{ color: 'var(--error)' }}>{usersError}</p>}
          <div className={styles.panel}>
            {users.map((u) => (
              <button
                key={u.id}
                type="button"
                className={`${styles.userBtn} ${selectedUserId === u.id ? styles.userBtnActive : ''}`}
                onClick={() => setSearchParams({ userId: u.id })}
              >
                <strong>{u.full_name || 'Unnamed user'}</strong>
                <div className={styles.meta}>{u.developer_role || 'Developer'}</div>
              </button>
            ))}
          </div>
        </CurvedCard>

        <CurvedCard>
          <h3>{selectedUser ? `Chat with ${selectedUser.full_name || 'user'}` : 'Select a user to message'}</h3>
          {messagesError && <p style={{ color: 'var(--error)' }}>{messagesError}</p>}
          <div className={styles.messages}>
            {messagesLoading && <p className={styles.meta}>Loading messages…</p>}
            {!messagesLoading && selectedUserId && !messages.length && (
              <p className={styles.meta}>No messages yet. Say hello.</p>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`${styles.bubble} ${m.sender_id === user?.id ? styles.mine : styles.theirs}`}
              >
                {m.content}
              </div>
            ))}
          </div>
          <div className={styles.composer}>
            <input
              className={styles.input}
              placeholder={selectedUserId ? 'Type a message…' : 'Select a user first'}
              value={draft}
              disabled={!selectedUserId || sending}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') sendMessage();
              }}
            />
            <PillButton onClick={sendMessage} active>
              {sending ? 'Sending…' : 'Send'}
            </PillButton>
          </div>
        </CurvedCard>
      </section>
    </AppLayout>
  );
}

