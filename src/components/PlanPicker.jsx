import React from 'react';
import { TierBadge, formatPlanPrice } from './ui';

// Radio-card list of plans. value = plan id, '' = no plan (when allowNone).
export default function PlanPicker({ plans, value, onChange, allowNone, currentPlanId, disabledIds = [] }) {
  return (
    <div className="plan-picker" role="radiogroup" aria-label="Plans">
      {plans.map((p) => {
        const selected = String(value) === String(p.id);
        const disabled = disabledIds.includes(p.id);
        return (
          <label key={p.id} className={`plan-card${selected ? ' plan-card--selected' : ''}${disabled ? ' plan-card--disabled' : ''}`}>
            <input
              type="radio"
              name="plan"
              value={p.id}
              checked={selected}
              disabled={disabled}
              onChange={() => onChange(p.id)}
            />
            <span className="plan-card-top">
              <span className="plan-card-name">{p.name}</span>
              {currentPlanId === p.id && <span className="current-flag">Current</span>}
            </span>
            <span className="plan-card-price">{formatPlanPrice(p)}</span>
            <TierBadge level={p.access_tier} name={p.access_tier_name} small />
            {p.description && <span className="plan-card-desc">{p.description}</span>}
          </label>
        );
      })}
      {allowNone && (
        <label className={`plan-card plan-card--none${value === '' ? ' plan-card--selected' : ''}`}>
          <input type="radio" name="plan" value="" checked={value === ''} onChange={() => onChange('')} />
          <span className="plan-card-name">Free account</span>
          <span className="plan-card-price">Public articles only</span>
        </label>
      )}
    </div>
  );
}
