import React, { useMemo, useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import CurvedCard from '../../components/ui/CurvedCard';
import PillButton from '../../components/ui/PillButton';
import SoftShadowContainer from '../../components/ui/SoftShadowContainer';
import NotificationDropdown from '../../components/ui/NotificationDropdown';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabaseClient';
import {
  dashboardFeed,
  collaborationAppeals,
  recommendedDevelopers,
} from '../../data/mockData';
import styles from './DashboardPage.module.css';

export default function DashboardPage() {
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

  const filteredDevelopers = useMemo(() => {
    if (!query.trim()) return recommendedDevelopers;
    if (filterType === 'projects') return [];

    const lower = query.toLowerCase();
    return recommendedDevelopers.filter((dev) => {
      if (filterType === 'name') return dev.name.toLowerCase().includes(lower);
      if (filterType === 'skills') return dev.skills.join(' ').toLowerCase().includes(lower);
      return `${dev.name} ${dev.role} ${dev.skills.join(' ')}`.toLowerCase().includes(lower);
    });
  }, [query, filterType]);

  const filteredFeed = useMemo(() => {
    if (!query.trim()) return dashboardFeed;
    if (filterType === 'name') return [];

    const lower = query.toLowerCase();
    return dashboardFeed.filter(item => {
      if (filterType === 'projects') return item.project.toLowerCase().includes(lower);
      if (filterType === 'skills') return item.tags.join(' ').toLowerCase().includes(lower);
      return `${item.project} ${item.tags.join(' ')} ${item.update}`.toLowerCase().includes(lower);
    });
  }, [query, filterType]);

  const filteredAppeals = useMemo(() => {
    if (!query.trim()) return collaborationAppeals;
    if (filterType === 'name' || filterType === 'skills') return [];

    const lower = query.toLowerCase();
    return collaborationAppeals.filter(appeal => {
      return `${appeal.title} ${appeal.detail}`.toLowerCase().includes(lower);
    });
  }, [query, filterType]);

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
            <h3>Project Feed</h3>
            <PillButton>Live</PillButton>
          </div>
          <div className={styles.stack}>
            {filteredFeed.map((item) => (
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
            {!filteredFeed.length && (
              <p className={styles.empty}>No recent project updates for this search.</p>
            )}
          </div>
        </CurvedCard>

        <div className={styles.sideColumn}>
          <CurvedCard>
            <div className={styles.sectionHeader}>
              <h3>Active Appeals</h3>
              <PillButton active>Urgent</PillButton>
            </div>
            <div className={styles.stackCompact}>
              {filteredAppeals.map((appeal) => (
                <CurvedCard key={appeal.id} tone="light" className={styles.innerCard}>
                  <p className={styles.urgency}>{appeal.urgency}</p>
                  <h4>{appeal.title}</h4>
                  <p>{appeal.detail}</p>
                  <p className={styles.deadline}>Deadline: {appeal.deadline}</p>
                </CurvedCard>
              ))}
              {!filteredAppeals.length && (
                <p className={styles.empty}>No active appeals match this search.</p>
              )}
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
