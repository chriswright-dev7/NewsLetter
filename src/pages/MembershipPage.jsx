import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { TierBadge, formatPlanPrice } from '../components/ui';

export default function MembershipPage() {
  const { tiers, plans, viewer, user } = useAuth();

  return (
    <div className="container membership">
      <h1 className="page-title">Membership</h1>
      <p className="muted lead">
        Every plan unlocks a tier. Higher tiers include everything below them.
      </p>

      <ol className="tier-ladder">
        {tiers.map((t) => {
          const tierPlans = plans.filter((p) => Number(p.access_tier) === t.level);
          const current = viewer?.tier === t.level;
          return (
            <li key={t.level} className={`tier-step${current ? ' tier-step--current' : ''}`}>
              <div className="tier-step-head">
                <TierBadge level={t.level} name={t.name} />
                {current && <span className="current-flag">Your access</span>}
              </div>
              <p className="tier-step-desc">{t.description}</p>
              {t.level === 0 ? (
                <p className="tier-step-plans muted">No account needed.</p>
              ) : tierPlans.length ? (
                <ul className="tier-step-plans">
                  {tierPlans.map((p) => (
                    <li key={p.id}>
                      <Link to={user ? `/account?plan=${p.id}` : `/signup?plan=${p.id}`}>
                        <strong>{p.name}</strong> <span>{formatPlanPrice(p)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="tier-step-plans muted">No plan currently unlocks this tier.</p>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
