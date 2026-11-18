import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { LockIcon, formatPlanPrice } from './ui';

export default function Paywall({ article, viewer, upgradePlans }) {
  const { user } = useAuth();
  const location = useLocation();
  const hasPlan = Boolean(user && viewer?.planName && !viewer.trialExpired);

  let title = 'Subscribe to read the full story';
  if (viewer?.trialExpired) title = 'Your free trial has ended';
  else if (hasPlan) title = `Your ${viewer.planName} plan doesn't include this one`;
  else if (user) title = 'Choose a plan to keep reading';

  // Logged-out readers sign up with the plan preselected; members switch plans on their account page.
  const planHref = (p) =>
    user
      ? `/account?plan=${p.id}&from=${encodeURIComponent(location.pathname)}`
      : `/signup?plan=${p.id}&from=${encodeURIComponent(location.pathname)}`;

  return (
    <aside className="paywall">
      <div className="paywall-icon"><LockIcon size={22} /></div>
      <p className="paywall-eyebrow">{article.required_tier_name} article</p>
      <h2 className="paywall-title">{title}</h2>
      <p className="paywall-copy">
        This piece is available to <strong>{article.required_tier_name}</strong> members and above.
        {hasPlan && ` You're currently on ${viewer.tierName}.`}
      </p>

      {upgradePlans.length > 0 && (
        <ul className="paywall-plans">
          {upgradePlans.map((p) => (
            <li key={p.id}>
              <Link to={planHref(p)} className="plan-option">
                <span className="plan-option-name">{p.name}</span>
                <span className="plan-option-price">{formatPlanPrice(p)}</span>
                <span className="plan-option-cta">{hasPlan ? 'Switch' : 'Choose'} →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {!user && (
        <p className="paywall-login">
          Already a member? <Link to="/login" state={{ from: location.pathname }}>Log in</Link>
        </p>
      )}
    </aside>
  );
}
