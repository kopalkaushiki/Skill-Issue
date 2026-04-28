import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import CurvedCard from '../../components/ui/CurvedCard';
import PillButton from '../../components/ui/PillButton';
import SoftShadowContainer from '../../components/ui/SoftShadowContainer';
import NotificationDropdown from '../../components/ui/NotificationDropdown';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabaseClient';
import styles from './DashboardPage.module.css';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profileName, setProfileName] = useState('');

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      if (data?.full_name) {
        setProfileName(data.full_name);
      }
    };
    fetchProfile();
  }, [user]);

  const displayName = profileName || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Developer';

  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  const [projectPosts, setProjectPosts] = useState([]);
  const [projectPostRoles, setProjectPostRoles] = useState([]);
  const [myPostApplications, setMyPostApplications] = useState([]);
  const [projectById, setProjectById] = useState({});
  const [profileById, setProfileById] = useState({});
  const [projectPostsLoading, setProjectPostsLoading] = useState(true);
  const [projectPostsError, setProjectPostsError] = useState('');
  const [projectPostsRefreshKey, setProjectPostsRefreshKey] = useState(0);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState('');

  useEffect(() => {
    const loadProjectPosts = async () => {
      setProjectPostsLoading(true);
      setProjectPostsError('');

      const { data: posts, error: postsError } = await supabase
        .from('project_posts')
        .select(
          'id, project_id, author_id, post_type, title, description, urgency, deadline, created_at, hackathon_name, hackathon_timeline, team_name'
        )
        .order('created_at', { ascending: false })
        .limit(12);

      if (postsError) {
        setProjectPosts([]);
        setProjectPostRoles([]);
        setMyPostApplications([]);
        setProjectPostsError(postsError.message || 'Failed to load project posts.');
        setProjectPostsLoading(false);
        return;
      }

      const nextPosts = posts || [];
      setProjectPosts(nextPosts);

      const postIds = nextPosts.map((p) => p.id);
      if (!postIds.length) {
        setProjectPostRoles([]);
        setMyPostApplications([]);
        setProjectPostsLoading(false);
        return;
      }

      const { data: rolesData, error: rolesError } = await supabase
        .from('post_roles')
        .select(
          'id, project_post_id, requested_role, skill, proficiency_level, soft_skills, number_teammates_required'
        )
        .in('project_post_id', postIds);

      if (rolesError) {
        setProjectPostRoles([]);
        setMyPostApplications([]);
        setProjectPostsLoading(false);
        return;
      }

      const nextRoles = rolesData || [];
      setProjectPostRoles(nextRoles);

      const authorIds = [...new Set(nextPosts.map((p) => p.author_id).filter(Boolean))];
      const projectIds = [...new Set(nextPosts.map((p) => p.project_id).filter(Boolean))];

      if (authorIds.length) {
        const { data: authorProfiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', authorIds);
        const profileMap = {};
        (authorProfiles || []).forEach((p) => { profileMap[p.id] = p; });
        setProfileById(profileMap);
      } else {
        setProfileById({});
      }

      if (projectIds.length) {
        const { data: projectsData } = await supabase
          .from('projects')
          .select('id, title, owner_id')
          .in('id', projectIds);
        const projectMap = {};
        (projectsData || []).forEach((p) => { projectMap[p.id] = p; });
        setProjectById(projectMap);
      } else {
        setProjectById({});
      }

      if (!user) {
        setMyPostApplications([]);
        setProjectPostsLoading(false);
        return;
      }

      const roleIds = nextRoles.map((r) => r.id);
      if (!roleIds.length) {
        setMyPostApplications([]);
        setProjectPostsLoading(false);
        return;
      }

      const { data: appsData, error: appsError } = await supabase
        .from('post_applications')
        .select('id, post_role_id, status, applicant_id')
        .eq('applicant_id', user.id)
        .in('post_role_id', roleIds);

      if (appsError) {
        setMyPostApplications([]);
      } else {
        setMyPostApplications(appsData || []);
      }

      setProjectPostsLoading(false);
    };

    loadProjectPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, projectPostsRefreshKey]);

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
        .order('full_name', { ascending: true })
        .limit(40);
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

  const applyToPost = async (post, rolesForPost) => {
    if (!user) return;
    if (!post) return;
    const existing = myPostApplications.find((a) =>
      rolesForPost.some((r) => r.id === a.post_role_id)
    );
    if (existing) return;
    const targetRole = rolesForPost[0];
    if (!targetRole) return;

    const { data: created, error } = await supabase
      .from('post_applications')
      .insert({
        post_role_id: targetRole.id,
        applicant_id: user.id,
        status: 'pending',
      });

    if (error) {
      // Surface via search UI is overkill here; just log for now.
      // The actual accept/reject notifications will come from DB updates.
      // eslint-disable-next-line no-console
      console.error(error);
      return;
    }

    if (post.author_id && post.author_id !== user.id) {
      await supabase
        .from('notifications')
        .insert({
          user_id: post.author_id,
          from_user_id: user.id,
          type: 'new_application',
          post_application_id: created?.id || null,
          is_read: false,
          metadata: {
            post_id: post.id,
            project_id: post.project_id,
            requested_role: targetRole.requested_role,
            skill: targetRole.skill,
          },
        });
    }

    setProjectPostsRefreshKey((k) => k + 1);
  };

  const filteredProjectPosts = useMemo(() => {
    if (!query.trim()) return projectPosts;
    const lower = query.toLowerCase();
    return projectPosts.filter((post) => {
      const text = `${post.title} ${post.description} ${post.hackathon_name || ''} ${post.hackathon_timeline || ''}`.toLowerCase();
      return text.includes(lower);
    });
  }, [projectPosts, query]);

  const filteredUsers = useMemo(() => {
    if (!query.trim()) return users;
    const lower = query.toLowerCase();
    return users.filter((u) =>
      `${u.full_name || ''} ${u.developer_role || ''}`.toLowerCase().includes(lower)
    );
  }, [users, query]);

  return (
    <AppLayout
      title="Dashboard"
      subtitle=""
      topActions={(
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className={styles.headerSearch}>
            <div className={styles.filterWrapper}>
              <span className={styles.filterIcon}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                </svg>
              </span>
              <select
                className={styles.filterSelect}
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                aria-label="Filter type"
              >
                <option value="all">All</option>
                <option value="skills">Skills</option>
                <option value="projects">Projects</option>
                <option value="name">Users</option>
              </select>
            </div>
            <input
              id="dev-search"
              type="search"
              className={styles.headerSearchInput}
              placeholder="Search dashboard..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <NotificationDropdown />
          <PillButton to="/publish-collaboration-request">Publish Request</PillButton>
          <PillButton to="/messages">Messages</PillButton>
          <PillButton to="/profile">My Profile</PillButton>
        </div>
      )}
    >
      <SoftShadowContainer className={styles.heroWrap}>
        <CurvedCard tone="teal" elevated className={styles.heroCard}>
          <p className={styles.heroKicker}></p>
          <h2>Welcome back, {displayName}!</h2>
          <div className={styles.heroActions}>

          </div>
        </CurvedCard>
      </SoftShadowContainer>

      <section className={styles.grid}>
        <CurvedCard className={styles.feedColumn}>
          <div className={styles.sectionHeader}>
            <h3>Project Requests</h3>
            <PillButton>Apply</PillButton>
          </div>
          <div className={styles.stackCompact}>
            {projectPostsLoading && <p className={styles.empty}>Loading requests…</p>}
            {!projectPostsLoading && projectPostsError && (
              <p className={styles.empty} style={{ color: 'var(--error)' }}>{projectPostsError}</p>
            )}
            {!projectPostsLoading && !filteredProjectPosts.length && (
              <p className={styles.empty}>No requests yet.</p>
            )}

            {!projectPostsLoading && filteredProjectPosts.map((post) => {
              const rolesForPost = projectPostRoles.filter((r) => r.project_post_id === post.id);
              const isCreator = user && post.author_id === user.id;
              const myAppForPost = user
                ? myPostApplications.find((a) => rolesForPost.some((r) => r.id === a.post_role_id))
                : null;
              const tag = post.post_type === 'hackathon_team_building' ? 'Hackathon' : 'Project';
              const projectInfo = projectById[post.project_id];
              const creatorName = profileById[post.author_id]?.full_name || 'Unknown owner';
              const heading = post.post_type === 'hackathon_team_building'
                ? (post.hackathon_name || post.title)
                : (projectInfo?.title || post.title);
              const topRole = rolesForPost[0];

              return (
                <CurvedCard key={post.id} tone="light" className={styles.innerCard}>
                  <div className={styles.devHeader}>
                    <div>
                      <h4 style={{ margin: '0 0 0.2rem' }}>{heading}</h4>
                      <p style={{ margin: 0 }}>
                        {post.post_type === 'hackathon_team_building'
                          ? post.hackathon_timeline || post.description
                          : post.description}
                      </p>
                      <p style={{ margin: '6px 0 0', fontSize: 12, opacity: 0.85 }}>
                        {`Owner/Lead: ${post.team_name || creatorName}`}
                      </p>
                      {topRole && (
                        <p style={{ margin: '4px 0 0', fontSize: 12, opacity: 0.85 }}>
                          {`Required teammate: ${topRole.requested_role} · Skill: ${topRole.skill}`}
                        </p>
                      )}
                    </div>
                    <strong>{tag}</strong>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                    {rolesForPost.slice(0, 3).map((role) => {
                      const myApp = user
                        ? myPostApplications.find((a) => a.post_role_id === role.id)
                        : null;

                      return (
                        <div key={role.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <span className={styles.tags} style={{ display: 'contents' }}>
                            <span style={{ fontSize: 12, opacity: 0.9 }}>
                              {role.requested_role} · {role.skill} ({role.proficiency_level})
                            </span>
                          </span>
                          {isCreator ? (
                            <PillButton active>Creator</PillButton>
                          ) : myApp ? (
                            <PillButton active>{`Applied (${myApp.status})`}</PillButton>
                          ) : (
                            <span style={{ fontSize: 12, opacity: 0.9 }}>Open role</span>
                          )}
                        </div>
                      );
                    })}
                    {!rolesForPost.length && <p className={styles.empty}>No role requests yet.</p>}
                  </div>
                  {!isCreator && !!rolesForPost.length && (
                    <div style={{ marginTop: 10 }}>
                      {myAppForPost ? (
                        <PillButton active>{`Applied (${myAppForPost.status})`}</PillButton>
                      ) : (
                        <PillButton active onClick={() => applyToPost(post, rolesForPost)}>
                          Apply
                        </PillButton>
                      )}
                    </div>
                  )}
                </CurvedCard>
              );
            })}
          </div>
        </CurvedCard>

        <div className={styles.sideColumn}>
          <CurvedCard>
            <div className={styles.sectionHeader}>
              <h3>Find Users</h3>
              <PillButton to="/messages">Open Inbox</PillButton>
            </div>
            {usersLoading && <p className={styles.empty}>Loading users…</p>}
            {usersError && <p className={styles.empty} style={{ color: 'var(--error)' }}>{usersError}</p>}
            <div className={styles.stackCompact}>
              {filteredUsers.slice(0, 12).map((u) => (
                <CurvedCard key={u.id} tone="light" className={styles.innerCard}>
                  <div className={styles.devHeader}>
                    <div>
                      <h4>{u.full_name || 'Unnamed user'}</h4>
                      <p>{u.developer_role || 'Developer'}</p>
                    </div>
                    <PillButton onClick={() => navigate(`/messages?userId=${u.id}`)} active>
                      Message
                    </PillButton>
                  </div>
                </CurvedCard>
              ))}
              {!usersLoading && !filteredUsers.length && (
                <p className={styles.empty}>No users found for this search.</p>
              )}
            </div>
          </CurvedCard>
        </div>
      </section>
    </AppLayout>
  );
}
