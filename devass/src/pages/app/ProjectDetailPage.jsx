import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import CurvedCard from '../../components/ui/CurvedCard';
import PillButton from '../../components/ui/PillButton';
import { collaborationAppeals, recommendedDevelopers } from '../../data/mockData';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabaseClient';
import styles from './ProjectDetailPage.module.css';

function parseCsv(value) {
  if (!value) return [];
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const { user } = useAuth();

  const [project, setProject] = useState(null);
  const [projectLoading, setProjectLoading] = useState(true);
  const [projectError, setProjectError] = useState('');

  const [milestones, setMilestones] = useState([]);
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [postsError, setPostsError] = useState('');

  const [newMilestone, setNewMilestone] = useState({ title: '', deadline: '', progress: 0 });
  const [newPost, setNewPost] = useState({ title: '', description: '', tags: '', deadline: '', urgency: 'Medium' });

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
        .select('id, title, description, tags, urgency, deadline, created_at, author_id')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (cancelled) return;

      if (error) {
        setPosts([]);
        setPostsError(error.message || 'Failed to load project posts.');
      } else {
        setPosts(data || []);
      }
      setPostsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const displayProject = useMemo(() => {
    if (!projectId) return null;
    if (!project) return { id: projectId };
    return project;
  }, [project, projectId]);

  const matchedDevelopers = useMemo(() => recommendedDevelopers.slice(0, 3), []);

  const addMilestone = () => {
    if (!newMilestone.title.trim() || !newMilestone.deadline) return;

    setMilestones((prev) => [
      ...prev,
      {
        id: `m-${prev.length + 1}`,
        title: newMilestone.title.trim(),
        deadline: newMilestone.deadline,
        progress: Number(newMilestone.progress || 0),
        status: 'Planned',
      },
    ]);
    setNewMilestone({ title: '', deadline: '', progress: 0 });
  };

  const addPost = async () => {
    if (!user || !projectId) return;
    if (!newPost.title.trim() || !newPost.description.trim()) return;

    const payload = {
      project_id: projectId,
      author_id: user.id,
      title: newPost.title.trim(),
      description: newPost.description.trim(),
      tags: parseCsv(newPost.tags),
      deadline: newPost.deadline || null,
      urgency: newPost.urgency,
    };

    const { data, error } = await supabase
      .from('project_posts')
      .insert(payload)
      .select('id, title, description, tags, urgency, deadline, created_at, author_id')
      .single();

    if (error) {
      setPostsError(error.message || 'Failed to publish post.');
      return;
    }

    setPosts((prev) => [data, ...prev]);
    setNewPost({ title: '', description: '', tags: '', deadline: '', urgency: 'Medium' });
  };

  return (
    <AppLayout
      title="Project Collaboration Room"
      subtitle="Plan milestones, attract contributors, and keep delivery visible."
      topActions={(
        <>
          <PillButton to="/dashboard">Dashboard</PillButton>
          <PillButton to="/profile">Profile</PillButton>
          <PillButton active>{displayProject?.id || 'Project'}</PillButton>
        </>
      )}
    >
      <section className={styles.grid}>
        <CurvedCard tone="teal" className={styles.overviewCard}>
          <p className={styles.kicker}>Project Overview</p>
          <h2>{projectLoading ? 'Loading…' : (displayProject?.title || 'Untitled project')}</h2>
          {projectError && <p style={{ color: 'var(--error)' }}>{projectError}</p>}
          {!!displayProject?.overview && <p>{displayProject.overview}</p>}
          <div className={styles.tags}>
            {(displayProject?.tech_stack || []).map((skill) => (
              <span key={skill}>{skill}</span>
            ))}
          </div>
          <div className={styles.leader}>
            <strong>{displayProject?.project_lead_name || 'Project lead'}</strong>
            <span>{displayProject?.project_lead_role || ''}</span>
            <p>{displayProject?.project_lead_contact || ''}</p>
          </div>
        </CurvedCard>

        <CurvedCard>
          <h3>GitHub Integration</h3>
          <p className={styles.inlineMeta}>
            Connect a repo field later (currently not stored for DB-backed projects).
          </p>
          <div className={styles.stack}>
            {milestones.map((item) => (
              <div key={item.id}>
                <div className={styles.progressMeta}>
                  <span>{item.title}</span>
                  <strong>{item.progress}%</strong>
                </div>
                <div className={styles.progressBar}>
                  <div style={{ width: `${item.progress}%` }} />
                </div>
              </div>
            ))}
          </div>
        </CurvedCard>
      </section>

      <section className={styles.grid}>
        <CurvedCard>
          <div className={styles.sectionHeader}>
            <h3>Milestones (Leader)</h3>
            <PillButton active>Add</PillButton>
          </div>
          <div className={styles.formRow}>
            <input
              className={styles.input}
              placeholder="Milestone title"
              value={newMilestone.title}
              onChange={(e) => setNewMilestone((prev) => ({ ...prev, title: e.target.value }))}
            />
            <input
              className={styles.input}
              type="date"
              value={newMilestone.deadline}
              onChange={(e) => setNewMilestone((prev) => ({ ...prev, deadline: e.target.value }))}
            />
          </div>
          <div className={styles.formRow}>
            <input
              className={styles.input}
              type="number"
              min="0"
              max="100"
              value={newMilestone.progress}
              onChange={(e) => setNewMilestone((prev) => ({ ...prev, progress: e.target.value }))}
              placeholder="Progress %"
            />
            <PillButton onClick={addMilestone} active>Add Milestone</PillButton>
          </div>

          <div className={styles.stack}>
            {milestones.map((milestone) => (
              <CurvedCard key={milestone.id} tone="light" className={styles.innerCard}>
                <h4>{milestone.title}</h4>
                <p>Deadline: {milestone.deadline}</p>
                <p>Status: {milestone.status}</p>
              </CurvedCard>
            ))}
          </div>
        </CurvedCard>

        <CurvedCard>
          <h3>Hackathon Timeline</h3>
          <div className={styles.timeline}>
            {(displayProject?.timeline || []).length === 0 ? (
              <p className={styles.inlineMeta}>No timeline entries yet (add milestones above).</p>
            ) : (
              (displayProject.timeline || []).map((item) => (
                <div key={item.id} className={styles.timelineItem}>
                  <div className={styles.dot} />
                  <div>
                    <p>{item.label}</p>
                    <span>{item.date}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <h3 className={styles.appealsHeading}>Need Help Now</h3>
          <div className={styles.stackCompact}>
            {collaborationAppeals.map((appeal) => (
              <CurvedCard key={appeal.id} tone="light" className={styles.innerCard}>
                <h4>{appeal.title}</h4>
                <p>{appeal.detail}</p>
                <p className={styles.inlineMeta}>{appeal.urgency} · {appeal.deadline}</p>
              </CurvedCard>
            ))}
          </div>
        </CurvedCard>
      </section>

      <section className={styles.grid}>
        <CurvedCard>
          <div className={styles.sectionHeader}>
            <h3>Project Posts</h3>
            <PillButton>Leader Feed</PillButton>
          </div>

          <div className={styles.formCol}>
            {postsError && <p style={{ color: 'var(--error)' }}>{postsError}</p>}
            <input
              className={styles.input}
              placeholder="Post title"
              value={newPost.title}
              onChange={(e) => setNewPost((prev) => ({ ...prev, title: e.target.value }))}
            />
            <textarea
              className={styles.textarea}
              placeholder="Describe the project need"
              value={newPost.description}
              onChange={(e) => setNewPost((prev) => ({ ...prev, description: e.target.value }))}
            />
            <div className={styles.formRow}>
              <input
                className={styles.input}
                placeholder="Tags (comma separated)"
                value={newPost.tags}
                onChange={(e) => setNewPost((prev) => ({ ...prev, tags: e.target.value }))}
              />
              <input
                className={styles.input}
                type="date"
                value={newPost.deadline}
                onChange={(e) => setNewPost((prev) => ({ ...prev, deadline: e.target.value }))}
              />
            </div>
            <div className={styles.formRow}>
              <select
                className={styles.input}
                value={newPost.urgency}
                onChange={(e) => setNewPost((prev) => ({ ...prev, urgency: e.target.value }))}
              >
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
              <PillButton onClick={addPost} active>Publish Post</PillButton>
            </div>
          </div>

          <div className={styles.stack}>
            {postsLoading && <p className={styles.inlineMeta}>Loading posts…</p>}
            {!postsLoading && !posts.length && <p className={styles.inlineMeta}>No posts yet.</p>}
            {posts.map((post) => (
              <CurvedCard key={post.id} tone="light" className={styles.innerCard}>
                <h4>{post.title}</h4>
                <p>{post.description}</p>
                <div className={styles.tags}>
                  {(post.tags || []).map((tag) => (
                    <span key={`${post.id}-${tag}`}>{tag}</span>
                  ))}
                </div>
                <p className={styles.inlineMeta}>
                  Urgency: {post.urgency} · Deadline: {post.deadline || 'TBD'}
                </p>
              </CurvedCard>
            ))}
          </div>
        </CurvedCard>

        <CurvedCard>
          <h3>Skill-Based Matching</h3>
          <div className={styles.stackCompact}>
            {matchedDevelopers.map((dev) => (
              <CurvedCard key={dev.id} tone="light" className={styles.innerCard}>
                <div className={styles.devHead}>
                  <h4>{dev.name}</h4>
                  <strong>{dev.match}%</strong>
                </div>
                <p>{dev.role}</p>
                <div className={styles.tags}>
                  {dev.skills.map((skill) => (
                    <span key={`${dev.id}-${skill}`}>{skill}</span>
                  ))}
                </div>
                <div className={styles.ctaRow}>
                  <PillButton>Show Interest</PillButton>
                  <PillButton active>Ping Direct</PillButton>
                </div>
              </CurvedCard>
            ))}
          </div>
        </CurvedCard>
      </section>
    </AppLayout>
  );
}
