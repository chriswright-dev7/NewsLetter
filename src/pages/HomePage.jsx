import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../auth/AuthContext';
import ArticleCard from '../components/ArticleCard';
import { TierBadge } from '../components/ui';

export default function HomePage() {
  const { user, tiers, viewer: sessionViewer } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    let alive = true;
    setData(null);
    api
      .listArticles()
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [user?.id, sessionViewer?.tier]);

  const articles = data?.articles ?? [];
  const viewer = data?.viewer;
  const unlocked = articles.filter((a) => !a.locked).length;

  const visible = useMemo(() => {
    if (filter === 'all') return articles;
    if (filter === 'unlocked') return articles.filter((a) => !a.locked);
    return articles.filter((a) => a.required_tier === Number(filter));
  }, [articles, filter]);

  if (error) {
    return (
      <div className="container state-msg">
        <h2>Couldn't load articles</h2>
        <p>{error}</p>
        <p className="muted">Is the newsletter server running? Start it with <code>npm run dev</code>.</p>
      </div>
    );
  }
  if (!data) return <div className="container state-msg">Loading the latest issue…</div>;

  const [featured, ...rest] = visible;

  return (
    <div className="container">
      <section className="access-bar">
        {viewer?.authenticated ? (
          <p>
            Reading as <TierBadge level={viewer.tier} name={viewer.tierName} small />
            {viewer.planName && <> on the <strong>{viewer.planName}</strong> plan</>}
            {viewer.trialExpired && <> (trial ended)</>} —{' '}
            <strong>{unlocked}</strong> of {articles.length} articles unlocked.
            {unlocked < articles.length && (
              <> <Link to="/account">{viewer.planName && !viewer.trialExpired ? 'Upgrade' : 'Choose a plan'} to unlock more →</Link></>
            )}
          </p>
        ) : (
          <p>
            You can read <strong>{unlocked}</strong> of {articles.length} articles for free.{' '}
            <Link to="/signup">Become a member</Link> or{' '}
            <Link to="/login">log in</Link> to unlock the rest.
          </p>
        )}
      </section>

      <div className="filters" role="tablist" aria-label="Filter articles">
        {[{ key: 'all', label: 'All' }, { key: 'unlocked', label: 'Available to me' },
          ...tiers.map((t) => ({ key: String(t.level), label: t.name }))].map((f) => (
          <button
            key={f.key}
            type="button"
            role="tab"
            aria-selected={filter === f.key}
            className={`chip${filter === f.key ? ' chip--active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="state-msg muted">No articles in this view yet.</p>
      ) : (
        <>
          {featured && <ArticleCard article={featured} featured />}
          <div className="grid">
            {rest.map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
