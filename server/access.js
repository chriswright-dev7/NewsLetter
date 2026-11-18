// Resolves who is reading and what tier they can access.
import { plans, sessions, users } from './store.js';
import { MAX_TIER, tierName } from './tiers.js';

export const bearer = (req) => {
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
};

const addPeriod = (iso, length, unit) => {
  const d = new Date(iso);
  const n = Number(length) || 0;
  if (unit === 'day') d.setDate(d.getDate() + n);
  else if (unit === 'week') d.setDate(d.getDate() + n * 7);
  else if (unit === 'year') d.setFullYear(d.getFullYear() + n);
  else d.setMonth(d.getMonth() + n);
  return d.toISOString();
};

// Subscription details for a user. Free (price 0) plans are trials that expire after their period.
export const subscriptionFor = (user) => {
  const plan = user?.planId ? plans.byId(user.planId) : null;
  if (!plan) return null;
  const isTrial = Number(plan.price) === 0;
  const trialEndsAt = isTrial && user.planStartedAt
    ? addPeriod(user.planStartedAt, plan.period_length, plan.period_unit)
    : null;
  return {
    planId: plan.id,
    planName: plan.name,
    accessTier: plan.access_tier,
    accessTierName: tierName(plan.access_tier),
    startedAt: user.planStartedAt,
    isTrial,
    trialEndsAt,
    expired: Boolean(trialEndsAt && new Date(trialEndsAt) < new Date()),
  };
};

export const publicUser = (u) => {
  if (!u) return null;
  const { passwordHash, ...rest } = u;
  return { ...rest, subscription: subscriptionFor(u) };
};

export const viewerFor = (user) => {
  if (!user) return { tier: 0, tierName: tierName(0), planName: null, isAdmin: false, authenticated: false };
  const sub = subscriptionFor(user);
  const isAdmin = user.role === 'admin';
  const tier = isAdmin ? MAX_TIER : sub && !sub.expired ? Number(sub.accessTier) : 0;
  return {
    tier,
    tierName: tierName(tier),
    planName: sub?.planName ?? null,
    trialExpired: Boolean(sub?.expired),
    isAdmin,
    authenticated: true,
  };
};

// Middleware: attaches req.user (or null), req.token and req.viewer. Bad tokens read as anonymous.
export const resolveViewer = (req, res, next) => {
  const token = bearer(req);
  const session = token ? sessions.get(token) : null;
  const user = session ? users.byId(session.userId) : null;
  req.token = user ? token : null;
  req.user = user || null;
  req.viewer = viewerFor(req.user);
  next();
};

export const requireUser = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Login required' });
  next();
};

export const requireAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Login required' });
  if (!req.viewer.isAdmin) return res.status(403).json({ message: 'Admin access required' });
  next();
};
