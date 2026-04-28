import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabaseClient';
import styles from './PublishRequestPage.module.css';

function parseCsv(value) {
  if (!value) return [];
  return value.split(',').map((s) => s.trim()).filter(Boolean);
}

export default function PublishRequestPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [error, setError] = useState('');
  const [publishing, setPublishing] = useState(false);

  const [form, setForm] = useState({
    projectId: '',
    postType: 'hackathon_team_building',
    teamName: '',
    hackathonName: '',
    hackathonTimeline: '',
    projectOverview: '',
    urgency: 'Medium',
    deadline: '',
    roleRequests: [
      {
        requestedRole: '',
        skill: '',
        proficiencyLevel: '',
        softSkillsText: '',
        numberTeammatesRequired: 1,
      },
    ],
  });

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoadingProjects(true);
      const { data, error: qErr } = await supabase
        .from('projects')
        .select('id, title')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });
      if (cancelled) return;
      if (qErr) {
        setProjects([]);
        setError(qErr.message || 'Failed to load your projects.');
      } else {
        setProjects(data || []);
        if ((data || []).length) {
          setForm((f) => ({ ...f, projectId: f.projectId || data[0].id }));
        }
      }
      setLoadingProjects(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const canPublish = useMemo(
    () => Boolean(form.projectId),
    [form.projectId]
  );

  const publish = async () => {
    if (!user || !canPublish) return;
    setError('');
    setPublishing(true);

    const roleRequests = form.roleRequests
      .map((r) => ({
        requestedRole: (r.requestedRole || '').trim(),
        skill: (r.skill || '').trim(),
        proficiencyLevel: (r.proficiencyLevel || '').trim(),
        softSkillsText: r.softSkillsText || '',
        numberTeammatesRequired: Number(r.numberTeammatesRequired || 1),
      }))
      .filter((r) => r.requestedRole && r.skill && r.proficiencyLevel);

    if (!roleRequests.length) {
      setError('Add at least one role with required fields.');
      setPublishing(false);
      return;
    }

    const isHackathon = form.postType === 'hackathon_team_building';
    if (isHackathon && (!form.hackathonName.trim() || !form.hackathonTimeline.trim())) {
      setError('Hackathon name and timeline are required.');
      setPublishing(false);
      return;
    }
    if (!isHackathon && !form.projectOverview.trim()) {
      setError('Project overview is required.');
      setPublishing(false);
      return;
    }

    const payload = {
      project_id: form.projectId,
      author_id: user.id,
      title: isHackathon ? form.hackathonName.trim() : 'Project Building',
      description: isHackathon ? form.hackathonTimeline.trim() : form.projectOverview.trim(),
      tags: [isHackathon ? 'Hackathon' : 'Project'],
      deadline: form.deadline || null,
      urgency: form.urgency,
      post_type: form.postType,
      hackathon_name: isHackathon ? form.hackathonName.trim() : null,
      hackathon_timeline: isHackathon ? form.hackathonTimeline.trim() : null,
      team_name: isHackathon && form.teamName.trim() ? form.teamName.trim() : null,
    };

    const { data: created, error: postError } = await supabase
      .from('project_posts')
      .insert(payload)
      .select('id')
      .single();

    if (postError) {
      setError(postError.message || 'Failed to publish request.');
      setPublishing(false);
      return;
    }

    const rolesPayload = roleRequests.map((r) => ({
      project_post_id: created.id,
      requested_role: r.requestedRole,
      skill: r.skill,
      proficiency_level: r.proficiencyLevel,
      soft_skills: parseCsv(r.softSkillsText),
      number_teammates_required: Number.isFinite(r.numberTeammatesRequired) ? r.numberTeammatesRequired : 1,
    }));
    const { error: rolesError } = await supabase.from('post_roles').insert(rolesPayload);

    if (rolesError) {
      setError(rolesError.message || 'Post created, but role requests failed.');
      setPublishing(false);
      return;
    }

    setPublishing(false);
    navigate(`/projects/${form.projectId}`);
  };

  return (
    <AppLayout title="Publish Collaboration Request" subtitle="Create a request for project or hackathon roles.">
      <div className={styles.layout}>
        <section className={styles.card}>
          <h3>Create Request</h3>
          {error && <p style={{ color: 'var(--error)' }}>{error}</p>}
          {loadingProjects && <p className={styles.meta}>Loading projects...</p>}
          {!loadingProjects && !projects.length && (
            <p className={styles.meta}>You need to create a project first.</p>
          )}

          <select
            className={styles.input}
            value={form.projectId}
            onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))}
          >
            <option value="">Select project</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>

          <select
            className={styles.input}
            value={form.postType}
            onChange={(e) => setForm((f) => ({ ...f, postType: e.target.value }))}
          >
            <option value="hackathon_team_building">Hackathon Team Building</option>
            <option value="project_building">Project Building</option>
          </select>

          {form.postType === 'hackathon_team_building' ? (
            <>
              <input className={styles.input} placeholder="Team Name (optional)" value={form.teamName} onChange={(e) => setForm((f) => ({ ...f, teamName: e.target.value }))} />
              <input className={styles.input} placeholder="Hackathon Name (required)" value={form.hackathonName} onChange={(e) => setForm((f) => ({ ...f, hackathonName: e.target.value }))} />
              <textarea className={styles.textarea} placeholder="Hackathon Timeline (required)" value={form.hackathonTimeline} onChange={(e) => setForm((f) => ({ ...f, hackathonTimeline: e.target.value }))} />
            </>
          ) : (
            <textarea className={styles.textarea} placeholder="Project Overview (required)" value={form.projectOverview} onChange={(e) => setForm((f) => ({ ...f, projectOverview: e.target.value }))} />
          )}

          <div className={styles.row}>
            <input className={styles.input} type="date" value={form.deadline} onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))} />
            <select className={styles.input} value={form.urgency} onChange={(e) => setForm((f) => ({ ...f, urgency: e.target.value }))}>
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
            </select>
          </div>

          {form.roleRequests.map((r, idx) => (
            <div key={`${idx}`} className={styles.roleBlock}>
              <p className={styles.meta}>Requested teammate #{idx + 1}</p>
              <div className={styles.row}>
                <input className={styles.input} placeholder="Required teammate role" value={r.requestedRole} onChange={(e) => setForm((f) => ({ ...f, roleRequests: f.roleRequests.map((x, i) => (i === idx ? { ...x, requestedRole: e.target.value } : x)) }))} />
                <input className={styles.input} placeholder="Required skill" value={r.skill} onChange={(e) => setForm((f) => ({ ...f, roleRequests: f.roleRequests.map((x, i) => (i === idx ? { ...x, skill: e.target.value } : x)) }))} />
              </div>
              <div className={styles.row}>
                <input className={styles.input} placeholder="Proficiency level" value={r.proficiencyLevel} onChange={(e) => setForm((f) => ({ ...f, roleRequests: f.roleRequests.map((x, i) => (i === idx ? { ...x, proficiencyLevel: e.target.value } : x)) }))} />
                <input className={styles.input} type="number" min="1" placeholder="No. teammates" value={r.numberTeammatesRequired} onChange={(e) => setForm((f) => ({ ...f, roleRequests: f.roleRequests.map((x, i) => (i === idx ? { ...x, numberTeammatesRequired: e.target.value } : x)) }))} />
              </div>
            </div>
          ))}

          <div className={styles.actions}>
            <button type="button" className={styles.btnGhost} onClick={() => setForm((f) => ({ ...f, roleRequests: [...f.roleRequests, { requestedRole: '', skill: '', proficiencyLevel: '', softSkillsText: '', numberTeammatesRequired: 1 }] }))}>
              Add teammate request
            </button>
            <button type="button" className={styles.btn} disabled={!canPublish || publishing} onClick={publish}>
              {publishing ? 'Publishing...' : 'Publish Request'}
            </button>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}

