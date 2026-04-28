import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import GitHubInsightsSection from '../../components/profile/GitHubInsightsSection';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabaseClient';
import styles from './ProfilePage.module.css';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState('');

  const [myProjects, setMyProjects] = useState([]);
  const [myProjectsLoading, setMyProjectsLoading] = useState(true);
  const [myProjectsError, setMyProjectsError] = useState('');

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    (async () => {
      setProfileLoading(true);
      setProfileError('');

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (cancelled) return;

      if (error) {
        // Supabase returns PGRST116 for "no rows returned" on .single()
        const code = error.code || '';
        const msg = (error.message || '').toLowerCase();
        if (code === 'PGRST116' || msg.includes('0 rows') || msg.includes('no rows')) {
          setProfile(null);
        } else {
          setProfileError(error.message || 'Failed to load profile.');
          setProfile(null);
        }
      } else {
        setProfile(data);
      }

      setProfileLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      setMyProjectsLoading(true);
      setMyProjectsError('');

      const { data, error } = await supabase
        .from('projects')
        .select('id, title, overview, tech_stack, help_needed, engineer_needed, progress_stage, created_at')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (cancelled) return;

      if (error) {
        setMyProjects([]);
        setMyProjectsError(error.message || 'Failed to load projects.');
      } else {
        setMyProjects(data || []);
      }
      setMyProjectsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const displayName = useMemo(() => {
    return (
      profile?.full_name ||
      profile?.name ||
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      user?.email ||
      'Your Profile'
    );
  }, [profile, user]);

  const role = useMemo(() => {
    return profile?.developer_role || profile?.role || 'Developer';
  }, [profile]);

  const availability = useMemo(() => profile?.availability || '', [profile]);
  const bioText = useMemo(() => profile?.bio || 'No bio yet.', [profile]);

  const techStack = useMemo(
    () =>
      Array.isArray(profile?.tech_stack)
        ? profile.tech_stack.filter(Boolean)
        : [],
    [profile]
  );

  const initials = useMemo(() => {
    return String(displayName)
      .split(' ')
      .filter(Boolean)
      .map((chunk) => chunk[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }, [displayName]);

  const username = useMemo(
    () => `@${(user?.email || displayName).split('@')[0]}`,
    [displayName, user]
  );

  if (authLoading || profileLoading) {
    return (
      <AppLayout title="Profile">
        <p className={styles.info}>Loading your profile...</p>
      </AppLayout>
    );
  }

  if (profileError) {
    return (
      <AppLayout title="Profile">
        <p className={styles.error}>{profileError}</p>
      </AppLayout>
    );
  }

  if (!profile) {
    return (
      <AppLayout title="Profile">
        <p className={styles.info}>No profile found. Please finish onboarding.</p>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Profile"
      topActions={(
        <div className={styles.topActions}>
          <button type="button" className={styles.navBtn} onClick={() => navigate('/dashboard')}>Home</button>
          <button type="button" className={styles.navBtn} onClick={() => navigate('/projects')}>Projects</button>
          <button type="button" className={styles.navBtn} onClick={() => navigate('/messages')}>Messages</button>
        </div>
      )}
    >
      <div className={styles.page}>
        <section className={styles.hero}>
          <div className={styles.avatar}>{initials}</div>
          <div className={styles.heroBody}>
            <h1>{displayName}</h1>
            <p className={styles.username}>{username}</p>
            <p className={styles.role}>{role}</p>
            <div className={styles.tags}>
              {techStack.length
                ? techStack.map((item) => <span key={item}>{item}</span>)
                : <span>No tech stack set</span>}
            </div>
            <p className={styles.metaLine}>{availability || 'Availability not set'}</p>
          </div>
        </section>

        <section className={styles.stats}>
          <div className={styles.statBox}><strong>{myProjects.length}</strong><span>Projects</span></div>
          <div className={styles.statBox}><strong>{techStack.length}</strong><span>Skills</span></div>
          <div className={styles.statBox}><strong>{myProjects.filter((p) => p.progress_stage).length}</strong><span>Active</span></div>
          <div className={styles.statBox}><strong>{myProjects.filter((p) => (p.help_needed || []).length).length}</strong><span>Hiring</span></div>
        </section>

        <section className={styles.bioSection}>
          <h2>About</h2>
          <p>{bioText}</p>
          <GitHubInsightsSection
            userId={user?.id}
            initialUsername={profile?.github_username || ''}
            onProfilePatch={(patch) => setProfile((prev) => (prev ? { ...prev, ...patch } : prev))}
          />
        </section>

        <section className={styles.projectsSection}>
          <div className={styles.sectionHead}>
            <h2>Top Projects</h2>
            <button type="button" className={styles.navBtn} onClick={() => navigate('/projects')}>View All</button>
          </div>
          {myProjectsError && <p className={styles.error}>{myProjectsError}</p>}
          {myProjectsLoading && <p className={styles.info}>Loading projects...</p>}
          {!myProjectsLoading && !myProjects.length && <p className={styles.info}>No projects yet.</p>}
          <div className={styles.projectList}>
            {myProjects.slice(0, 4).map((p) => (
              <button
                key={p.id}
                type="button"
                className={styles.projectRow}
                onClick={() => navigate(`/projects/${p.id}`)}
              >
                <div className={styles.projectIcon}>{String(p.title || 'P').charAt(0).toUpperCase()}</div>
                <div className={styles.projectText}>
                  <strong>{p.title}</strong>
                  <p>{p.overview || 'No overview yet.'}</p>
                </div>
                <span className={styles.projectStage}>{p.progress_stage || 'New'}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
