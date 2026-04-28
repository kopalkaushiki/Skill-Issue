import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabaseClient';
import styles from './ProjectDetailPage.module.css';

export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const { user } = useAuth();

  const [project, setProject] = useState(null);
  const [projectLoading, setProjectLoading] = useState(true);
  const [projectError, setProjectError] = useState('');

  const [posts, setPosts] = useState([]);
  const [postRoles, setPostRoles] = useState([]);
  const [applications, setApplications] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [postsError, setPostsError] = useState('');
  const [postsRefreshKey, setPostsRefreshKey] = useState(0);
  const [actionError, setActionError] = useState('');


  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;

    (async () => {
      setProjectLoading(true);
      setProjectError('');

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (cancelled) return;

      if (error) {
        setProject(null);
        setProjectError(error.message || 'Failed to load project.');
      } else {
        setProject(data);
      }
      setProjectLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;

    (async () => {
      setPostsLoading(true);
      setPostsError('');

      const { data, error } = await supabase
        .from('project_posts')
        .select(
          'id, project_id, author_id, title, description, tags, urgency, deadline, created_at, post_type, hackathon_name, hackathon_timeline, team_name'
        )
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (cancelled) return;

      if (error) {
        setPosts([]);
        setPostRoles([]);
        setApplications([]);
        setPostsError(error.message || 'Failed to load project posts.');
        setPostsLoading(false);
        return;
      }

      const nextPosts = data || [];
      setPosts(nextPosts);

      const postIds = nextPosts.map((p) => p.id);
      if (!postIds.length) {
        setPostRoles([]);
        setApplications([]);
        setPostsLoading(false);
        return;
      }

      const { data: rolesData, error: rolesError } = await supabase
        .from('post_roles')
        .select(
          'id, project_post_id, requested_role, skill, proficiency_level, soft_skills, number_teammates_required'
        )
        .in('project_post_id', postIds);

      if (cancelled) return;

      if (rolesError) {
        setPostRoles([]);
      } else {
        setPostRoles(rolesData || []);
      }

      if (!user) {
        setApplications([]);
        setPostsLoading(false);
        return;
      }

      const roleIds = (rolesData || []).map((r) => r.id);
      if (!roleIds.length) {
        setApplications([]);
        setPostsLoading(false);
        return;
      }

      const { data: appsData, error: appsError } = await supabase
        .from('post_applications')
        .select('id, post_role_id, applicant_id, status')
        .in('post_role_id', roleIds);

      if (cancelled) return;

      if (appsError) {
        setApplications([]);
      } else {
        setApplications(appsData || []);
      }

      setPostsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [projectId, user?.id, postsRefreshKey]);

  const displayProject = useMemo(() => {
    if (!projectId) return null;
    if (!project) return { id: projectId };
    return project;
  }, [project, projectId]);

  const applyToRole = async (postRoleId) => {
    if (!user) return;

    setActionError('');
    const { error } = await supabase
      .from('post_applications')
      .insert({
        post_role_id: postRoleId,
        applicant_id: user.id,
        status: 'pending',
      });

    if (error) {
      setActionError(error.message || 'Failed to apply for this role.');
      return;
    }

    setPostsRefreshKey((k) => k + 1);
  };

  const decideApplication = async (applicationId, nextStatus) => {
    if (!user) return;
    if (nextStatus !== 'accepted' && nextStatus !== 'rejected') return;

    const application = applications.find((a) => a.id === applicationId);
    if (!application) return;

    const role = postRoles.find((r) => r.id === application.post_role_id);
    const post = role ? posts.find((p) => p.id === role.project_post_id) : null;

    if (!role || !post) return;
    if (post.author_id !== user.id) return;

    setActionError('');

    const { error: updateError } = await supabase
      .from('post_applications')
      .update({ status: nextStatus })
      .eq('id', applicationId);

    if (updateError) {
      setActionError(updateError.message || 'Failed to update application.');
      return;
    }

    // Create a notification for the applicant.
    const { error: notifError } = await supabase
      .from('notifications')
      .insert({
        user_id: application.applicant_id,
        from_user_id: user.id,
        type: nextStatus === 'accepted' ? 'application_accepted' : 'application_rejected',
        post_application_id: applicationId,
        is_read: false,
        metadata: {
          project_id: projectId,
          post_id: post.id,
          post_role_id: role.id,
        },
      });

    if (notifError) {
      setActionError(notifError.message || 'Application updated, but notifications failed.');
    }

    setPostsRefreshKey((k) => k + 1);
  };

  return (
    <AppLayout
      title="Project"
      subtitle=""
      topActions={(
        <div className={styles.topActions}>
          <a href="/dashboard" className={styles.navBtn}>Home</a>
          <a href="/projects" className={styles.navBtn}>Projects</a>
          <a href="/profile" className={styles.navBtn}>Profile</a>
        </div>
      )}
    >
      <section className={styles.hero}>
        <div className={styles.projectIcon}>
          {String(displayProject?.title || 'P').charAt(0).toUpperCase()}
        </div>
        <div>
          <h1>{projectLoading ? 'Loading...' : (displayProject?.title || 'Untitled project')}</h1>
          {projectError && <p style={{ color: 'var(--error)' }}>{projectError}</p>}
          <p className={styles.subtitle}>{displayProject?.overview || 'No project summary yet.'}</p>
          <div className={styles.metaRow}>
            <span>Stage: {displayProject?.progress_stage || 'New'}</span>
            <span>Need: {displayProject?.engineer_needed || 'Generalists'}</span>
            <span>ID: {(displayProject?.id || '').slice(0, 8)}</span>
          </div>
          <div className={styles.tags}>
            {(displayProject?.tech_stack || []).map((skill) => <span key={skill}>{skill}</span>)}
          </div>
        </div>
      </section>

      <section className={styles.contentGrid}>
        <aside className={styles.sidePanel}>
          <div className={styles.panelBlock}>
            <h3>Project Links</h3>
            <p className={styles.meta}>Add GitHub/demo links in next iteration.</p>
          </div>
          <div className={styles.panelBlock}>
            <h3>Team</h3>
            <div className={styles.teamRow}>
              <div className={styles.memberAvatar}>
                {String(user?.email || 'U').charAt(0).toUpperCase()}
              </div>
              <div>
                <strong>{user?.email?.split('@')[0] || 'Owner'}</strong>
                <p className={styles.meta}>Project Owner</p>
              </div>
            </div>
          </div>
        </aside>

        <main className={styles.mainPanel}>
          <section className={styles.block}>
            <h3>What this project solves</h3>
            <p>{displayProject?.overview || 'No detailed description yet.'}</p>
            {!!(displayProject?.help_needed || []).length && (
              <>
                <h4>Where help is needed</h4>
                <div className={styles.tags}>
                  {(displayProject.help_needed || []).map((item) => <span key={item}>{item}</span>)}
                </div>
              </>
            )}
          </section>

          <section className={styles.block}>
            <h3>Collaboration Requests</h3>
            <div className={styles.rowActions} style={{ marginBottom: 10 }}>
              <a href="/publish-collaboration-request" className={styles.navBtn}>Publish Collaboration Request</a>
            </div>
            {actionError && <p style={{ color: 'var(--error)' }}>{actionError}</p>}
            {postsLoading && <p className={styles.inlineMeta}>Loading posts…</p>}
            {!postsLoading && !posts.length && <p className={styles.inlineMeta}>No posts yet.</p>}
            {posts.map((post) => {
              const isCreator = user && post.author_id === user.id;
              const rolesForPost = postRoles.filter((r) => r.project_post_id === post.id);
              const postTypeLabel = post.post_type === 'hackathon_team_building' ? 'Hackathon' : 'Project';

              return (
                <div key={post.id} className={styles.postRow}>
                  <div className={styles.postHeader}>
                    <h4 style={{ margin: 0 }}>{post.title}</h4>
                    <span className={styles.meta}>{postTypeLabel}</span>
                  </div>
                  <p style={{ marginTop: 8 }}>
                    {post.post_type === 'hackathon_team_building'
                      ? post.hackathon_timeline || post.description
                      : post.description}
                  </p>
                  <p className={styles.inlineMeta}>
                    Urgency: {post.urgency} · Deadline: {post.deadline || 'TBD'}
                  </p>
                  <div className={styles.roleViewList}>
                    {!rolesForPost.length && <p className={styles.inlineMeta}>No role requests.</p>}
                    {rolesForPost.map((role) => {
                      const myApp = user
                        ? applications.find((a) => a.applicant_id === user.id && a.post_role_id === role.id)
                        : null;
                      const roleApps = isCreator
                        ? applications.filter((a) => a.post_role_id === role.id)
                        : [];

                      return (
                        <div key={role.id} className={styles.roleViewCard}>
                          <div className={styles.roleViewHeader}>
                            <div>
                              <strong>{role.requested_role}</strong>
                              <p className={styles.meta} style={{ marginTop: 6 }}>
                                {role.skill} · {role.proficiency_level} · Need {role.number_teammates_required}
                              </p>
                              {!!(role.soft_skills || []).length && (
                                <div className={styles.tags} style={{ marginTop: 8 }}>
                                  {(role.soft_skills || []).map((s) => (
                                    <span key={`${role.id}-soft-${s}`}>{s}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          {isCreator ? (
                            <div className={styles.creatorApps}>
                              {roleApps.length ? (
                                <div className={styles.appList}>
                                  {roleApps.map((app) => (
                                    <div key={app.id} className={styles.appRow}>
                                      <span className={styles.meta}>
                                        Applicant: {app.applicant_id.slice(0, 6)}… ({app.status})
                                      </span>
                                      {app.status === 'pending' ? (
                                        <div className={styles.rowActions}>
                                          <button
                                            type="button"
                                            className={styles.primaryBtn}
                                            onClick={() => decideApplication(app.id, 'accepted')}
                                          >
                                            Accept
                                          </button>
                                          <button
                                            type="button"
                                            className={styles.secondaryBtn}
                                            onClick={() => decideApplication(app.id, 'rejected')}
                                          >
                                            Reject
                                          </button>
                                        </div>
                                      ) : (
                                        <span className={styles.meta}>{app.status}</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className={styles.inlineMeta}>No applications yet.</p>
                              )}
                            </div>
                          ) : (
                            <div className={styles.rowActions}>
                              {myApp ? (
                                <span className={styles.meta}>{`Applied (${myApp.status})`}</span>
                              ) : (
                                <button
                                  type="button"
                                  className={styles.primaryBtn}
                                  onClick={() => applyToRole(role.id)}
                                >
                                  Apply
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </section>
        </main>
      </section>
    </AppLayout>
  );
}
