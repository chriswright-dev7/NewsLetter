// Content access tiers. Each plan grants one tier; each article requires a minimum tier.
// Higher tiers include everything below them.
export const TIERS = [
  { level: 0, key: 'public', name: 'Public', description: 'Free for everyone, no account needed' },
  { level: 1, key: 'basic', name: 'Basic', description: 'Weekly analysis archive' },
  { level: 2, key: 'premium', name: 'Premium', description: 'Reported features and field notes' },
  { level: 3, key: 'insider', name: 'Insider', description: 'Everything, plus monthly briefings' },
];

export const MAX_TIER = TIERS[TIERS.length - 1].level;

export const tierName = (level) => TIERS.find((t) => t.level === Number(level))?.name ?? 'Unknown';

export const isValidTier = (level) =>
  level !== '' && level !== null && Number.isInteger(Number(level)) && TIERS.some((t) => t.level === Number(level));
