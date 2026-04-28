import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import CurvedCard from '../../components/ui/CurvedCard';
import PillButton from '../../components/ui/PillButton';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabaseClient';
import styles from './ProjectsPage.module.css';

function parseCsv(value) {
  if (!value) return [];
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function formatDate(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return '';
  }
}

export default function ProjectsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [tab, setTab] = useState('my'); // my | all
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [projects, setProjects] = useState([]);

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createForm, setCreateForm] = useState({
    title: '',
    overview: '',
    techStackText: '',
    helpNeededText: '',
    engineerNeeded: '',
    progressStage: '',
  });

  const canCreate = useMemo(() => {
    if (!createForm.title.trim()) return false;
    if (!createForm.overview.trim()) return false;
    return true;
  }, [createForm.title, createForm.overview]);

  const loadProjects = async (nextTab) => {
    if (!user) return;
    setLoading(true);
    setError('');

    const base = supabase
      .from('projects')
      .select('id, owner_id, title, overview, tech_stack, help_needed, engineer_needed, progress_stage, created_at');

    const query = nextTab === 'my'
      ? base.eq('owner_id', user.id).order('created_at', { ascending: false })
      : base.order('created_at', { ascending: false });

    const { data, error: qError } = await query;
    if (qError) {
      setError(qError.message || 'Failed to load projects.');
      setProjects([]);
      setLoading(false);
      return;
    }

    setProjects(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadProjects(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, user?.id]);

  const createProject = async () => {
    if (!user || !canCreate) return;
    setCreating(true);
    setCreateError('');

    const payload = {
      owner_id: user.id,
      title: createForm.title.trim(),
      overview: createForm.overview.trim(),
      tech_stack: parseCsv(createForm.techStackText),
      help_needed: parseCsv(createForm.helpNeededText),
      engineer_needed: createForm.engineerNeeded.trim(),
      progress_stage: createForm.progressStage.trim(),
    };

    const { data, error: insError } = await supabase
      .from('projects')
      .insert(payload)
      .select('id')
      .single();

    if (insError) {
      setCreateError(insError.message || 'Failed to create project.');
      setCreating(false);
      return;
    }

    setCreateForm({
      title: '',
      overview: '',
      techStackText: '',
      helpNeededText: '',
      engineerNeeded: '',
      progressStage: '',
    });
    setCreating(false);

    if (tab === 'my') {
      loadProjects('my');
    } else {
      // If you create while browsing all, switch to "my" so you can immediately see it.
      setTab('my');
    }

    if (data?.id) navigate(`/projects/${data.id}`);
  };

  return (
    <AppLayout
      title="All Projects"
      subtitle="Create your projects, find projects to join, and publish what help you need."
      topActions={(
        <>
          <PillButton to="/dashboard">Dashboard</PillButton>
          <PillButton to="/profile">Profile</PillButton>
          <PillButton to="/publish-collaboration-request">Publish Request</PillButton>
          <PillButton active>All Projects</PillButton>
        </>
      )}
    >
      <div className={styles.toolbar}>
        <div className={styles.tabs}>
          <PillButton active={tab === 'my'} onClick={() => setTab('my')}>My Projects</PillButton>
          <PillButton active={tab === 'all'} onClick={() => setTab('all')}>All Projects</PillButton>
        </div>
      </div>

      <section className={styles.grid}>
        <div className={styles.left}>
          <CurvedCard>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
              <h3 style={{ margin: 0 }}>{tab === 'my' ? 'My Projects' : 'All Projects'}</h3>
              <span className={styles.meta}>{loading ? 'Loading…' : `${projects.length} total`}</span>
            </div>
            {error && <p style={{ color: 'var(--error)' }}>{error}</p>}
            {!loading && !projects.length && (
              <p className={styles.empty}>
                {tab === 'my'
                  ? 'No projects yet. Create one on the right.'
                  : 'No projects found yet.'}
              </p>
            )}

            <div className={styles.stack} style={{ marginTop: 12 }}>
              {projects.map((p) => (
                <CurvedCard
                  key={p.id}
                  tone="light"
                  className={styles.innerCard}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/projects/${p.id}`)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                    <h4 style={{ margin: 0 }}>{p.title}</h4>
                    <span className={styles.meta}>{formatDate(p.created_at)}</span>
                  </div>
                  <p style={{ marginTop: 8 }}>{p.overview}</p>
                  {!!(p.progress_stage || p.engineer_needed) && (
                    <p className={styles.meta} style={{ marginTop: 8 }}>
                      {p.progress_stage ? `Stage: ${p.progress_stage}` : ''}
                      {p.progress_stage && p.engineer_needed ? ' · ' : ''}
                      {p.engineer_needed ? `Engineer: ${p.engineer_needed}` : ''}
                    </p>
                  )}
                  {!!(p.tech_stack?.length || p.help_needed?.length) && (
                    <div className={styles.tags}>
                      {(p.tech_stack || []).slice(0, 4).map((t) => <span key={`${p.id}-tech-${t}`}>{t}</span>)}
                      {(p.help_needed || []).slice(0, 4).map((t) => <span key={`${p.id}-help-${t}`}>{t}</span>)}
                    </div>
                  )}
                </CurvedCard>
              ))}
            </div>
          </CurvedCard>
        </div>

        <div className={styles.right}>
          <CurvedCard>
            <h3>Create a Project (My Project)</h3>
            {createError && <p style={{ color: 'var(--error)' }}>{createError}</p>}

            <input
              className={styles.input}
              placeholder="Project title"
              value={createForm.title}
              onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
            />
            <textarea
              className={styles.textarea}
              placeholder="Overview of the project"
              value={createForm.overview}
              onChange={(e) => setCreateForm((f) => ({ ...f, overview: e.target.value }))}
            />

            <div className={styles.formRow}>
              <input
                className={styles.input}
                placeholder="Tech stack needed (comma separated)"
                value={createForm.techStackText}
                onChange={(e) => setCreateForm((f) => ({ ...f, techStackText: e.target.value }))}
              />
              <input
                className={styles.input}
                placeholder="Progress stage (e.g., Ideation, MVP, Beta)"
                value={createForm.progressStage}
                onChange={(e) => setCreateForm((f) => ({ ...f, progressStage: e.target.value }))}
              />
            </div>

            <div className={styles.formRow}>
              <input
                className={styles.input}
                placeholder="Where help is needed (comma separated)"
                value={createForm.helpNeededText}
                onChange={(e) => setCreateForm((f) => ({ ...f, helpNeededText: e.target.value }))}
              />
              <input
                className={styles.input}
                placeholder="What kind of engineer needed (for search)"
                value={createForm.engineerNeeded}
                onChange={(e) => setCreateForm((f) => ({ ...f, engineerNeeded: e.target.value }))}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <PillButton onClick={createProject} active disabled={!canCreate || creating}>
                {creating ? 'Creating…' : 'Create Project'}
              </PillButton>
            </div>

            <p className={styles.meta} style={{ marginTop: 10 }}>
              This saves the project to Supabase (not hard-coded). “My Projects” are projects you own.
            </p>
          </CurvedCard>
        </div>
      </section>
    </AppLayout>
  );
}

