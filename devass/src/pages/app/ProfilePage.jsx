import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import CurvedCard from '../../components/ui/CurvedCard';
import SoftShadowContainer from '../../components/ui/SoftShadowContainer';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabaseClient';
import styles from './ProfilePage.module.css';

function normalizeStringArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

const DEVELOPER_ROLES = [
  'Frontend Developer',
  'Backend Developer',
  'Fullstack Developer',
  'Mobile Developer',
  'DevOps Engineer',
  'Data Engineer',
  'ML/AI Engineer',
  'Other',
];

const AVAILABILITY_OPTIONS = [
  'Available now',
  'Available part-time',
  'Available on weekends',
  'Not available',
];

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [logoutLoading, setLogoutLoading] = useState(false);
  const [logoutError, setLogoutError] = useState('');

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState('');

  const [myProjects, setMyProjects] = useState([]);
  const [myProjectsLoading, setMyProjectsLoading] = useState(true);
  const [myProjectsError, setMyProjectsError] = useState('');

  const [editing, setEditing] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState('');

  const [form, setForm] = useState({
    full_name: '',
    phone_number: '',
    developer_role: '',
    techStackText: '',
    bio: '',
    availability: '',
  });

  const panelItems = [
    { label: 'All Projects', to: '/projects' },
    { label: 'Edit Profile', action: 'edit' },
    { label: 'My Home', to: '/dashboard' },
    { label: 'Settings' },
    { label: 'Messages' },
  ];

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

  useEffect(() => {
    if (!sidebarOpen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [sidebarOpen]);

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
  const headline = useMemo(() => profile?.headline || profile?.bio || '', [profile]);
  const phoneNumber = useMemo(() => profile?.phone_number || '', [profile]);
  const bioText = useMemo(() => profile?.bio || '', [profile]);
  const location = useMemo(() => profile?.location || '', [profile]);

  const techStack = useMemo(
    () =>
      normalizeStringArray(
        profile?.tech_stack || profile?.techStack || profile?.techstack || null
      ),
    [profile]
  );

  const pastProjects = useMemo(() => {
    const list = profile?.past_projects;
    return Array.isArray(list) ? list : [];
  }, [profile]);

  const activeProjects = useMemo(() => {
    const list = profile?.active_projects;
    return Array.isArray(list) ? list : [];
  }, [profile]);

  const avatarText = useMemo(() => {
    return String(displayName)
      .split(' ')
      .filter(Boolean)
      .map((chunk) => chunk[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }, [displayName]);

  const startEditing = () => {
    setSaveError('');
    setSaveLoading(false);
    setForm({
      full_name: profile?.full_name || '',
      phone_number: profile?.phone_number || '',
      developer_role: profile?.developer_role || 'Fullstack Developer',
      techStackText: normalizeStringArray(
        profile?.tech_stack || profile?.techStack || profile?.techstack || null
      ).join(', '),
      bio: profile?.bio || '',
      availability: profile?.availability || 'Available now',
    });
    setEditing(true);
    setSidebarOpen(false);
  };

  const cancelEditing = () => {
    setEditing(false);
    setSaveError('');
  };

  const handleSave = async () => {
    if (!user) return;
    setSaveLoading(true);
    setSaveError('');

    const fullNameTrim = form.full_name.trim();
    const phoneTrim = form.phone_number.trim();
    const bioTrim = form.bio.trim();
    const techStackArray = normalizeStringArray(form.techStackText);

    if (!fullNameTrim) {
      setSaveError('Full name is required.');
      setSaveLoading(false);
      return;
    }
    if (!form.developer_role) {
      setSaveError('Developer role is required.');
      setSaveLoading(false);
      return;
    }
    if (!form.availability) {
      setSaveError('Availability is required.');
      setSaveLoading(false);
      return;
    }
    if (!techStackArray.length) {
      setSaveError('Please add at least one tech stack item.');
      setSaveLoading(false);
      return;
    }
    if (bioTrim.length > 500) {
      setSaveError('Bio must be 500 characters or less.');
      setSaveLoading(false);
      return;
    }

    const payload = {
      id: user.id,
      full_name: fullNameTrim,
      phone_number: phoneTrim || null,
      developer_role: form.developer_role,
      tech_stack: techStackArray,
      bio: bioTrim || null,
      availability: form.availability,
    };

    const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
    if (error) {
      setSaveError(error.message || 'Failed to save profile.');
      setSaveLoading(false);
      return;
    }

    const { data: updated, error: reloadError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!reloadError && updated) setProfile(updated);

    setEditing(false);
    setSaveLoading(false);
  };

  const handleLogout = async () => {
    setLogoutLoading(true);
    setLogoutError('');
    const { error } = await supabase.auth.signOut();
    setLogoutLoading(false);

    if (error) {
      setLogoutError('Failed to logout. Please try again.');
      return;
    }

    navigate('/login', { replace: true });
  };

  if (authLoading || profileLoading) {
    return (
      <AppLayout title="Hi, Developer">
        <SoftShadowContainer>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontWeight: 700 }}>Loading your profile…</p>
        </SoftShadowContainer>
      </AppLayout>
    );
  }

  if (profileError) {
    return (
      <AppLayout title="Hi, Developer">
        <SoftShadowContainer>
          <p style={{ margin: 0, color: 'var(--error)', fontWeight: 700 }}>{profileError}</p>
        </SoftShadowContainer>
      </AppLayout>
    );
  }

  if (!profile) {
    return (
      <AppLayout title="Hi, Developer">
        <SoftShadowContainer>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontWeight: 700 }}>
              No profile found for this account.
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate('/onboarding')}
              style={{ width: 'fit-content' }}
            >
              Set up your profile
            </button>
          </div>
        </SoftShadowContainer>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Hi, Developer">
      <SoftShadowContainer>
        <button
          type="button"
          className={styles.mobileSidebarToggle}
          aria-label="Open profile menu"
          onClick={() => setSidebarOpen(true)}
        >
          ☰
        </button>

        {sidebarOpen && (
          <div
            className={styles.sideScrim}
            role="button"
            tabIndex={0}
            aria-label="Close profile menu"
            onClick={() => setSidebarOpen(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') setSidebarOpen(false);
            }}
          />
        )}

        <div className={styles.layout}>
          <aside className={`${styles.sidePanel} ${sidebarOpen ? styles.sidePanelOpen : ''}`}>
            <div className={styles.panelBrand}>
              <div className={styles.panelAvatar}>{avatarText}</div>
              <div>
                <p className={styles.panelName}>{displayName}</p>
                <p className={styles.panelRole}>{role}</p>
              </div>
            </div>

            <nav className={styles.panelMenu}>
              {panelItems.map((item) => (
                item.to ? (
                  <NavLink
                    key={item.label}
                    to={item.to}
                    className={({ isActive }) =>
                      `${styles.menuItem} ${isActive ? styles.menuItemActive : ''}`
                    }
                    onClick={() => setSidebarOpen(false)}
                  >
                    {item.label}
                  </NavLink>
                ) : (
                  <button
                    key={item.label}
                    type="button"
                    className={styles.menuItem}
                    onClick={() => {
                      setSidebarOpen(false);
                      if (item.action === 'edit') startEditing();
                    }}
                  >
                    {item.label}
                  </button>
                )
              ))}
            </nav>

            <div className={styles.logoutWrap}>
              <button
                type="button"
                className={styles.logoutButton}
                onClick={handleLogout}
                disabled={logoutLoading}
              >
                {logoutLoading ? 'Logging out…' : 'Logout'}
              </button>
              {logoutError && <p className={styles.logoutError}>{logoutError}</p>}
            </div>
          </aside>

          <div>
            <CurvedCard tone="teal" className={styles.headerCard}>
              <div className={styles.avatar}>{avatarText}</div>
              <div>
                <h2>{displayName}</h2>
                <p className={styles.role}>{role}</p>
                <p className={styles.headline}>{headline}</p>
              </div>
              <div className={styles.availability}>{availability}</div>
            </CurvedCard>

            {editing ? (
              <section className={styles.grid}>
                <CurvedCard>
                  <h3>Edit Profile</h3>
                  {saveError && (
                    <div className="alert alert-error" role="alert" style={{ marginTop: 10, marginBottom: 14 }}>
                      {saveError}
                    </div>
                  )}

                  <div className="form-group" style={{ marginTop: 14 }}>
                    <label className="form-label" htmlFor="full_name">Full name</label>
                    <input
                      id="full_name"
                      type="text"
                      className="form-input"
                      value={form.full_name}
                      onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                      autoFocus
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="phone_number">Phone number</label>
                    <input
                      id="phone_number"
                      type="text"
                      className="form-input"
                      value={form.phone_number}
                      onChange={(e) => setForm((f) => ({ ...f, phone_number: e.target.value }))}
                      placeholder="Optional"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="developer_role">Developer role</label>
                    <select
                      id="developer_role"
                      className="form-select"
                      value={form.developer_role}
                      onChange={(e) => setForm((f) => ({ ...f, developer_role: e.target.value }))}
                    >
                      {DEVELOPER_ROLES.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="availability">Availability</label>
                    <select
                      id="availability"
                      className="form-select"
                      value={form.availability}
                      onChange={(e) => setForm((f) => ({ ...f, availability: e.target.value }))}
                    >
                      {AVAILABILITY_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </CurvedCard>

                <CurvedCard>
                  <h3>Tech Stack & Bio</h3>

                  <div className="form-group" style={{ marginTop: 14 }}>
                    <label className="form-label" htmlFor="techStackText">Tech Stack (comma separated)</label>
                    <input
                      id="techStackText"
                      type="text"
                      className="form-input"
                      value={form.techStackText}
                      onChange={(e) => setForm((f) => ({ ...f, techStackText: e.target.value }))}
                      placeholder="e.g. React, TypeScript, FastAPI"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="bio">Bio</label>
                    <textarea
                      id="bio"
                      className="form-textarea"
                      value={form.bio}
                      onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                      rows={6}
                      placeholder="Optional"
                    />
                    <div className="char-count" style={{ color: form.bio.length > 500 ? 'var(--error)' : undefined }}>
                      {form.bio.length} / 500
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={cancelEditing}
                      disabled={saveLoading}
                      style={{ width: 'auto', flex: 1 }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleSave}
                      disabled={saveLoading}
                      style={{ width: 'auto', flex: 1 }}
                    >
                      {saveLoading ? 'Saving…' : 'Save changes'}
                    </button>
                  </div>
                </CurvedCard>
              </section>
            ) : (
              <>
                <section className={styles.grid}>
                  <CurvedCard>
                    <h3>About</h3>
                    <p className={styles.meta} style={{ marginTop: 6 }}>
                      {bioText || 'No bio yet.'}
                    </p>
                  </CurvedCard>

                  <CurvedCard>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
                      <h3 style={{ margin: 0 }}>My Projects</h3>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ width: 'auto', padding: '6px 10px' }}
                        onClick={() => navigate('/projects')}
                      >
                        View all
                      </button>
                    </div>
                    {myProjectsError && <p className={styles.meta} style={{ color: 'var(--error)', marginTop: 8 }}>{myProjectsError}</p>}
                    {myProjectsLoading ? (
                      <p className={styles.meta} style={{ marginTop: 8 }}>Loading…</p>
                    ) : (
                      <>
                        {!myProjects.length ? (
                          <p className={styles.meta} style={{ marginTop: 8 }}>No projects yet.</p>
                        ) : (
                          <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
                            {myProjects.slice(0, 3).map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                className="btn btn-ghost"
                                style={{
                                  width: '100%',
                                  textAlign: 'left',
                                  padding: 12,
                                  borderRadius: 14,
                                  border: '1px solid rgba(255,255,255,0.10)',
                                  background: 'rgba(0,0,0,0.18)',
                                }}
                                onClick={() => navigate(`/projects/${p.id}`)}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                                  <strong>{p.title}</strong>
                                  <span className={styles.meta}>{p.progress_stage || ''}</span>
                                </div>
                                <p className={styles.meta} style={{ marginTop: 6 }}>
                                  {p.overview}
                                </p>
                                <div className={styles.tags} style={{ marginTop: 8 }}>
                                  {(p.tech_stack || []).slice(0, 3).map((t) => <span key={`${p.id}-tech-${t}`}>{t}</span>)}
                                  {(p.help_needed || []).slice(0, 3).map((t) => <span key={`${p.id}-help-${t}`}>{t}</span>)}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </CurvedCard>

                  <CurvedCard>
                    <h3>Tech Stack</h3>
                    <div className={styles.tags}>
                      {techStack.length ? (
                        techStack.map((item) => <span key={item}>{item}</span>)
                      ) : (
                        <span>No tech stack set</span>
                      )}
                    </div>
                    <p className={styles.meta}>{location}</p>
                  </CurvedCard>

                  <CurvedCard>
                    <h3>Contact</h3>
                    <p className={styles.meta} style={{ marginTop: 6 }}>
                      {phoneNumber || 'No phone number set.'}
                    </p>
                  </CurvedCard>
                </section>
              </>
            )}
          </div>
        </div>
      </SoftShadowContainer>
    </AppLayout>
  );
}
