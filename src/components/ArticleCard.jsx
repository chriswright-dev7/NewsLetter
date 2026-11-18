import React from 'react';
import { Link } from 'react-router-dom';
import { TierBadge, LockIcon, formatDate } from './ui';

export default function ArticleCard({ article, featured }) {
  return (
    <article className={`card${featured ? ' card--featured' : ''}${article.locked ? ' card--locked' : ''}`}>
      <Link to={`/articles/${article.slug}`} className="card-link">
        <div className="card-meta">
          {article.category && <span className="card-category">{article.category}</span>}
          <TierBadge level={article.required_tier} name={article.required_tier_name} small />
        </div>
        <h3 className="card-title">{article.title}</h3>
        <p className="card-excerpt">{article.excerpt}</p>
        <div className="card-footer">
          <span>
            {article.author} · {formatDate(article.published_at, { month: 'short', day: 'numeric' })}
          </span>
          {article.locked ? (
            <span className="card-access card-access--locked">
              <LockIcon size={13} /> {article.required_tier_name}
            </span>
          ) : (
            <span className="card-access">Read →</span>
          )}
        </div>
      </Link>
    </article>
  );
}
