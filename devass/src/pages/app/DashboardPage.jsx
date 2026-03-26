import React, { useMemo, useState } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import CurvedCard from '../../components/ui/CurvedCard';
import PillButton from '../../components/ui/PillButton';
import SoftShadowContainer from '../../components/ui/SoftShadowContainer';
import {
  dashboardFeed,
  collaborationAppeals,
  recommendedDevelopers,
} from '../../data/mockData';
import styles from './DashboardPage.module.css';

export default function DashboardPage() {
  const [query, setQuery] = useState('');

  const filteredDevelopers = useMemo(() => {
    if (!query.trim()) return recommendedDevelopers;

    const lower = query.toLowerCase();
    return recommendedDevelopers.filter((dev) =>
      `${dev.name} ${dev.role} ${dev.skills.join(' ')}`.toLowerCase().includes(lower)
    );
  }, [query]);

  return (
    <AppLayout
      title="Collaboration Dashboard"
      subtitle="Find teammates, respond to urgent appeals, and keep momentum moving."
      topActions={(
        <>
          <PillButton active>September Build</PillButton>
          <PillButton to="/projects">All Projects</PillButton>
          <PillButton to="/profile">My Profile</PillButton>
        </>
      )}
    >
      <SoftShadowContainer className={styles.heroWrap}>
        <CurvedCard tone="teal" elevated className={styles.heroCard}>
          <p className={styles.heroKicker}>Daily Focus</p>
          <h2>New component Add text</h2>
          <p>
            3 milestones are active across your teams. Check the feed for updates, and respond to urgent appeals to keep things moving.
          </p>
          <div className={styles.heroActions}>
            <PillButton to="/projects" active>Open Projects</PillButton>
            <PillButton to="/profile">Tune Skill Profile</PillButton>
          </div>
        </CurvedCard>
      </SoftShadowContainer>

      <div className={styles.searchArea}>
        <label htmlFor="dev-search">Search developers by skill</label>
        <input
          id="dev-search"
          type="search"
          className={styles.searchInput}
          placeholder="Try React, FastAPI, Terraform..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <section className={styles.grid}>
        <CurvedCard className={styles.feedColumn}>
          <div className={styles.sectionHeader}>
            <h3>Project Feed</h3>
            <PillButton>Live</PillButton>
          </div>
          <div className={styles.stack}>
            {dashboardFeed.map((item) => (
              <CurvedCard key={item.id} tone="light" className={styles.innerCard}>
                <p className={styles.time}>{item.time}</p>
                <h4>{item.project}</h4>
                <p>{item.update}</p>
                <div className={styles.tags}>
                  {item.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              </CurvedCard>
            ))}
          </div>
        </CurvedCard>

        <div className={styles.sideColumn}>
          <CurvedCard>
            <div className={styles.sectionHeader}>
              <h3>Active Appeals</h3>
              <PillButton active>Urgent</PillButton>
            </div>
            <div className={styles.stackCompact}>
              {collaborationAppeals.map((appeal) => (
                <CurvedCard key={appeal.id} tone="light" className={styles.innerCard}>
                  <p className={styles.urgency}>{appeal.urgency}</p>
                  <h4>{appeal.title}</h4>
                  <p>{appeal.detail}</p>
                  <p className={styles.deadline}>Deadline: {appeal.deadline}</p>
                </CurvedCard>
              ))}
            </div>
          </CurvedCard>

          <CurvedCard>
            <div className={styles.sectionHeader}>
              <h3>Recommended Developers</h3>
              <PillButton>Skill Match</PillButton>
            </div>
            <div className={styles.stackCompact}>
              {filteredDevelopers.map((dev) => (
                <CurvedCard key={dev.id} tone="light" className={styles.innerCard}>
                  <div className={styles.devHeader}>
                    <div>
                      <h4>{dev.name}</h4>
                      <p>{dev.role}</p>
                    </div>
                    <strong>{dev.match}%</strong>
                  </div>
                  <p className={styles.status}>{dev.status}</p>
                  <div className={styles.tags}>
                    {dev.skills.map((skill) => (
                      <span key={skill}>{skill}</span>
                    ))}
                  </div>
                </CurvedCard>
              ))}
              {!filteredDevelopers.length && (
                <p className={styles.empty}>No developer match for this search yet.</p>
              )}
            </div>
          </CurvedCard>
        </div>
      </section>
    </AppLayout>
  );
}
