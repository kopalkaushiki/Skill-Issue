import React, { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import CurvedCard from '../../components/ui/CurvedCard';
import PillButton from '../../components/ui/PillButton';
import { collaborationAppeals, projectDetail, recommendedDevelopers } from '../../data/mockData';
import styles from './ProjectDetailPage.module.css';

export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const [milestones, setMilestones] = useState(projectDetail.milestones);
  const [posts, setPosts] = useState(projectDetail.posts);
  const [newMilestone, setNewMilestone] = useState({ title: '', deadline: '', progress: 0 });
  const [newPost, setNewPost] = useState({ title: '', description: '', tags: '', deadline: '', urgency: 'Medium' });

  const displayProject = useMemo(
    () => ({ ...projectDetail, id: projectId || projectDetail.id }),
    [projectId]
  );

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

  const addPost = () => {
    if (!newPost.title.trim() || !newPost.description.trim()) return;

    setPosts((prev) => [
      {
        id: `post-${prev.length + 1}`,
        title: newPost.title.trim(),
        description: newPost.description.trim(),
        tags: newPost.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        deadline: newPost.deadline || 'TBD',
        urgency: newPost.urgency,
      },
      ...prev,
    ]);

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
          <PillButton active>{displayProject.id}</PillButton>
        </>
      )}
    >
      <section className={styles.grid}>
        <CurvedCard tone="teal" className={styles.overviewCard}>
          <p className={styles.kicker}>Project Overview</p>
          <h2>{displayProject.title}</h2>
          <p>{displayProject.description}</p>
          <div className={styles.tags}>
            {displayProject.requiredSkills.map((skill) => (
              <span key={skill}>{skill}</span>
            ))}
          </div>
          <div className={styles.leader}>
            <strong>{displayProject.leader.name}</strong>
            <span>{displayProject.leader.role}</span>
            <p>{displayProject.leader.bio}</p>
          </div>
        </CurvedCard>

        <CurvedCard>
          <h3>GitHub Integration</h3>
          <a href={displayProject.repository} target="_blank" rel="noreferrer" className={styles.repoLink}>
            {displayProject.repository}
          </a>
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
            {displayProject.timeline.map((item) => (
              <div key={item.id} className={styles.timelineItem}>
                <div className={styles.dot} />
                <div>
                  <p>{item.label}</p>
                  <span>{item.date}</span>
                </div>
              </div>
            ))}
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
            {posts.map((post) => (
              <CurvedCard key={post.id} tone="light" className={styles.innerCard}>
                <h4>{post.title}</h4>
                <p>{post.description}</p>
                <div className={styles.tags}>
                  {post.tags.map((tag) => (
                    <span key={`${post.id}-${tag}`}>{tag}</span>
                  ))}
                </div>
                <p className={styles.inlineMeta}>Urgency: {post.urgency} · Deadline: {post.deadline}</p>
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
