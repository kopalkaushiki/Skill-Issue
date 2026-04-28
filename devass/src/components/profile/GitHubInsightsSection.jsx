import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import styles from './GitHubInsightsSection.module.css';

function sumStars(repos) {
  return (repos || []).reduce((sum, repo) => sum + (repo.stargazers_count || 0), 0);
}

function extractContributionSeries(raw) {
  if (!raw) return [];

  if (Array.isArray(raw.contributions) && raw.contributions[0]?.date) {
    return raw.contributions.map((d) => ({
      date: d.date,
      count: Number(d.count ?? d.contributionCount ?? 0),
    }));
  }

  if (Array.isArray(raw.weeks)) {
    return raw.weeks.flatMap((w) =>
      (w.contributionDays || []).map((d) => ({
        date: d.date,
        count: Number(d.contributionCount ?? d.count ?? 0),
      }))
    );
  }

  if (raw.contributionCalendar?.weeks) {
    return raw.contributionCalendar.weeks.flatMap((w) =>
      (w.contributionDays || []).map((d) => ({
        date: d.date,
        count: Number(d.contributionCount ?? d.count ?? 0),
      }))
    );
  }

  return [];
}

function buildHeatmap(days) {
  const byDate = new Map(days.map((d) => [d.date, d.count]));
  const today = new Date();
  const cols = 20;
  const grid = [];
  const weekday = today.getDay();
  const start = new Date(today);
  start.setDate(today.getDate() - (cols * 7 - 1 + weekday));

  for (let c = 0; c < cols; c += 1) {
    const col = [];
    for (let r = 0; r < 7; r += 1) {
      const current = new Date(start);
      current.setDate(start.getDate() + c * 7 + r);
      const key = current.toISOString().slice(0, 10);
      const count = byDate.get(key) || 0;
      col.push({ key, count, month: current.toLocaleString('en-US', { month: 'short' }) });
    }
    grid.push(col);
  }
  return grid;
}

async function fetchContributions(username) {
  const candidates = [
    `https://github-contributions-api.jogruber.de/v4/${username}`,
    `https://github-contributions-api.deno.dev/${username}.json`,
  ];

  for (const url of candidates) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      const series = extractContributionSeries(data);
      if (series.length) {
        const total =
          Number(data.total?.lastYear ?? data.totalContributions ?? 0)
          || series.reduce((s, d) => s + d.count, 0);
        return { total, series };
      }
    } catch (err) {
      // try next provider
    }
  }

  return { total: 0, series: [] };
}

export default function GitHubInsightsSection({ userId, initialUsername, onProfilePatch }) {
  const [inputUsername, setInputUsername] = useState(initialUsername || '');
  const [githubUsername, setGithubUsername] = useState(initialUsername || '');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [insights, setInsights] = useState(null);

  useEffect(() => {
    setInputUsername(initialUsername || '');
    setGithubUsername(initialUsername || '');
  }, [initialUsername]);

  useEffect(() => {
    if (!githubUsername) {
      setInsights(null);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const userRes = await fetch(`https://api.github.com/users/${githubUsername}`);
        if (!userRes.ok) throw new Error('GitHub profile not found.');
        const ghUser = await userRes.json();

        const reposRes = await fetch(
          `https://api.github.com/users/${githubUsername}/repos?per_page=100&sort=updated`
        );
        if (!reposRes.ok) throw new Error('Failed to load GitHub repositories.');
        const repos = await reposRes.json();

        const starsEarned = sumStars(repos);
        const topRepos = [...repos]
          .sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0))
          .slice(0, 3);

        const contributions = await fetchContributions(githubUsername);

        if (cancelled) return;
        setInsights({
          profileUrl: ghUser.html_url,
          followers: ghUser.followers || 0,
          repositories: ghUser.public_repos || 0,
          starsEarned,
          contributionsLastYear: contributions.total || 0,
          contributionSeries: contributions.series,
          topRepos,
        });
      } catch (err) {
        if (!cancelled) {
          setInsights(null);
          setError(err?.message || 'Failed to load GitHub data.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [githubUsername]);

  const heatmap = useMemo(
    () => buildHeatmap(insights?.contributionSeries || []),
    [insights?.contributionSeries]
  );

  const saveGithubUsername = async () => {
    if (!userId) return;
    const trimmed = inputUsername.trim().replace(/^@/, '');

    setSaving(true);
    setError('');
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        github_username: trimmed || null,
        github_profile_url: trimmed ? `https://github.com/${trimmed}` : null,
        github_synced_at: trimmed ? new Date().toISOString() : null,
      })
      .eq('id', userId);

    if (updateError) {
      setError(updateError.message || 'Failed to save GitHub username.');
      setSaving(false);
      return;
    }

    if (onProfilePatch) {
      onProfilePatch({
        github_username: trimmed || null,
        github_profile_url: trimmed ? `https://github.com/${trimmed}` : null,
        github_synced_at: trimmed ? new Date().toISOString() : null,
      });
    }
    setGithubUsername(trimmed);
    setSaving(false);
  };

  return (
    <section className={styles.wrap}>
      <div className={styles.headerRow}>
        <h3>GitHub</h3>
        <div className={styles.inputRow}>
          <input
            className={styles.input}
            placeholder="Enter GitHub username"
            value={inputUsername}
            onChange={(e) => setInputUsername(e.target.value)}
          />
          <button type="button" className={styles.saveBtn} onClick={saveGithubUsername} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {error && <p className={styles.error}>{error}</p>}
      {loading && <p className={styles.info}>Loading GitHub insights...</p>}
      {!loading && !githubUsername && <p className={styles.info}>Add your GitHub username to see insights.</p>}

      {!loading && insights && (
        <>
          <div className={styles.statsRow}>
            <div><strong>{insights.contributionsLastYear.toLocaleString()}</strong><span>contributions in the last year</span></div>
            <div><strong>{insights.starsEarned.toLocaleString()}</strong><span>stars earned</span></div>
            <div><strong>{insights.repositories.toLocaleString()}</strong><span>repositories</span></div>
            <div><strong>{insights.followers.toLocaleString()}</strong><span>followers</span></div>
            <a className={styles.viewBtn} href={insights.profileUrl} target="_blank" rel="noreferrer">
              View on GitHub
            </a>
          </div>

          <div className={styles.bottomGrid}>
            <div className={styles.heatmap}>
              {heatmap.map((col, ci) => (
                <div key={`col-${ci}`} className={styles.heatmapCol}>
                  {col.map((cell) => (
                    <span
                      key={cell.key}
                      className={styles.heatCell}
                      style={{
                        background:
                          cell.count > 12 ? '#166534'
                            : cell.count > 8 ? '#16a34a'
                              : cell.count > 4 ? '#4ade80'
                                : cell.count > 0 ? '#bbf7d0'
                                  : '#e5e7eb',
                      }}
                      title={`${cell.key}: ${cell.count} contributions`}
                    />
                  ))}
                </div>
              ))}
            </div>

            <div className={styles.repoList}>
              {insights.topRepos.map((repo) => (
                <a key={repo.id} href={repo.html_url} target="_blank" rel="noreferrer" className={styles.repoRow}>
                  <strong>{repo.name}</strong>
                  <p>{repo.language || 'Unknown'} · ★ {repo.stargazers_count || 0} · ⑂ {repo.forks_count || 0}</p>
                </a>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

