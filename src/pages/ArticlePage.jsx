import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../auth/AuthContext';
import Paywall from '../components/Paywall';
import { ArticleBody, TierBadge, formatDate } from '../components/ui';

export default function ArticlePage() {
  const { slug } = useParams();
  const { user } = useAuth();
  const [state, setState] = useState({ loading: true });

  useEffect(() => {
    let alive = true;
    setState({ loading: true });
    api
      .getArticle(slug)
      .then((d) => alive && setState({ loading: false, ...d }))
      .catch((e) => alive && setState({ loading: false, error: e }));
    window.scrollTo(0, 0);
    return () => {
      alive = false;
    };
  }, [slug, user?.email]);

  if (state.loading) return <div className="container state-msg">Loading…</div>;
  if (state.error) {
    return (
      <div className="container state-msg">
        <h2>{state.error.status === 404 ? 'Article not found' : 'Something went wrong'}</h2>
        <p className="muted">{state.error.message}</p>
        <Link to="/">← Back to latest</Link>
      </div>
    );
  }

  const { article, locked, viewer, upgradePlans } = state;

  return (
    <article className="container article">
      <Link to="/" className="back-link">← Latest</Link>
      <header className="article-header">
        <div className="card-meta">
          {article.category && <span className="card-category">{article.category}</span>}
          <TierBadge level={article.required_tier} name={article.required_tier_name} small />
          {article.status === 'draft' && <span className="draft-flag">Draft preview</span>}
        </div>
        <h1 className="article-title">{article.title}</h1>
        {article.excerpt && <p className="article-dek">{article.excerpt}</p>}
        <p className="article-byline">
          By <strong>{article.author}</strong>
          {article.published_at && <> · {formatDate(article.published_at)}</>}
        </p>
      </header>

      {article.cover_image_url && <img className="article-cover" src={article.cover_image_url} alt="" />}

      {locked ? (
        <>
          {/* The server never sends a locked body, so the fade shows placeholder lines only. */}
          <div className="locked-preview" aria-hidden="true">
            <span /><span /><span /><span />
          </div>
          <Paywall article={article} viewer={viewer} upgradePlans={upgradePlans} />
        </>
      ) : (
        <ArticleBody body={article.body} />
      )}
    </article>
  );
}
