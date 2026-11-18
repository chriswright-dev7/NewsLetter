// Admin API: articles, plans and subscribers.
import express from 'express';
import { articles, plans, sessions, users } from '../store.js';
import { publicUser, requireAdmin, viewerFor } from '../access.js';
import { TIERS, isValidTier, tierName } from '../tiers.js';

const router = express.Router();
router.use(requireAdmin);

const bad = (res, errors) => res.status(400).json({ message: errors.join('; ') });

/* ------------------------------ Articles ------------------------------ */

const slugify = (text) =>
  String(text || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 200);

const slugTaken = (slug, exceptId) => Boolean(articles.find((a) => a.slug === slug && a.id !== exceptId));

const ARTICLE_TEXT = ['title', 'excerpt', 'body', 'author', 'category'];

const normalizeArticle = (body, { partial }) => {
  const errors = [];
  const out = {};
  if (!partial || body.title !== undefined) {
    if (!String(body.title || '').trim()) errors.push('title is required');
  }
  for (const f of ARTICLE_TEXT) {
    if (body[f] !== undefined) out[f] = f === 'title' ? String(body[f]).trim() : String(body[f] ?? '');
  }
  if (body.slug !== undefined && body.slug !== '') {
    out.slug = slugify(body.slug);
    if (!out.slug) errors.push('slug must contain letters or numbers');
  }
  if (body.coverImageUrl !== undefined) out.cover_image_url = body.coverImageUrl || null;
  if (body.requiredTier !== undefined) {
    if (!isValidTier(body.requiredTier)) errors.push('requiredTier is not a valid tier');
    else out.required_tier = Number(body.requiredTier);
  }
  if (body.status !== undefined) {
    if (!['draft', 'published'].includes(body.status)) errors.push('status must be "draft" or "published"');
    else out.status = body.status;
  }
  if (body.publishedAt !== undefined) {
    if (!body.publishedAt) out.published_at = null;
    else if (Number.isNaN(Date.parse(body.publishedAt))) errors.push('publishedAt must be a date');
    else out.published_at = new Date(body.publishedAt).toISOString();
  }
  return { errors, out };
};

const withTierName = (a) => ({ ...a, required_tier_name: tierName(a.required_tier) });

router.get('/articles', (req, res) => {
  const list = articles
    .all()
    .sort((a, b) => new Date(b.published_at || b.created_at) - new Date(a.published_at || a.created_at) || b.id - a.id)
    .map(withTierName);
  res.json(list);
});

router.post('/articles', (req, res) => {
  const { errors, out } = normalizeArticle(req.body || {}, { partial: false });
  if (errors.length) return bad(res, errors);

  const article = {
    title: out.title,
    slug: out.slug || slugify(out.title) || `article-${Date.now()}`,
    excerpt: out.excerpt ?? '',
    body: out.body ?? '',
    author: out.author ?? '',
    category: out.category ?? '',
    cover_image_url: out.cover_image_url ?? null,
    required_tier: out.required_tier ?? 1,
    status: out.status ?? 'draft',
    published_at: out.published_at ?? null,
    created_by: req.user.id,
  };
  if (article.status === 'published' && !article.published_at) article.published_at = new Date().toISOString();
  if (slugTaken(article.slug)) return res.status(409).json({ message: 'An article with that slug already exists' });

  res.status(201).json({ message: 'Article created', article: withTierName(articles.create(article)) });
});

router.put('/articles/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = articles.byId(id);
  if (!existing) return res.status(404).json({ message: 'Article not found' });

  const { errors, out } = normalizeArticle(req.body || {}, { partial: true });
  if (errors.length) return bad(res, errors);
  if (!Object.keys(out).length) return bad(res, ['No fields to update']);
  if (out.slug && slugTaken(out.slug, id)) {
    return res.status(409).json({ message: 'An article with that slug already exists' });
  }
  // Publishing without a date stamps it now (keeps an existing date).
  const finalStatus = out.status ?? existing.status;
  const finalDate = 'published_at' in out ? out.published_at : existing.published_at;
  if (finalStatus === 'published' && !finalDate) out.published_at = new Date().toISOString();

  res.json({ message: 'Article updated', article: withTierName(articles.update(id, out)) });
});

router.delete('/articles/:id', (req, res) => {
  if (!articles.remove(req.params.id)) return res.status(404).json({ message: 'Article not found' });
  res.json({ message: 'Article deleted' });
});

/* -------------------------------- Plans ------------------------------- */

const UNITS = ['day', 'week', 'month', 'year'];

const normalizePlan = (body, { partial }) => {
  const errors = [];
  const out = {};
  const has = (k) => !partial || body[k] !== undefined;

  if (has('name')) {
    if (!String(body.name || '').trim()) errors.push('name is required');
    else out.name = String(body.name).trim();
  }
  if (body.description !== undefined) out.description = String(body.description || '');
  if (has('price')) {
    const price = Number(body.price);
    if (body.price === '' || body.price === undefined || !Number.isFinite(price) || price < 0) errors.push('price must be 0 or more');
    else out.price = Math.round(price * 100) / 100;
  }
  if (has('periodLength')) {
    const n = Number(body.periodLength);
    if (!Number.isInteger(n) || n < 1) errors.push('periodLength must be a whole number of at least 1');
    else out.period_length = n;
  }
  if (has('periodUnit')) {
    if (!UNITS.includes(body.periodUnit)) errors.push(`periodUnit must be one of ${UNITS.join(', ')}`);
    else out.period_unit = body.periodUnit;
  }
  if (has('accessTier')) {
    if (!isValidTier(body.accessTier) || Number(body.accessTier) === 0) errors.push('accessTier must be a paid tier (1 or higher)');
    else out.access_tier = Number(body.accessTier);
  }
  if (body.isActive !== undefined) out.is_active = Boolean(body.isActive);
  return { errors, out };
};

const subscriberCount = (planId) => users.all().filter((u) => u.planId === planId).length;

const planRow = (p) => ({ ...p, access_tier_name: tierName(p.access_tier), subscribers: subscriberCount(p.id) });

router.get('/plans', (req, res) => {
  res.json({
    tiers: TIERS,
    plans: plans.all().sort((a, b) => a.access_tier - b.access_tier || a.price - b.price).map(planRow),
  });
});

router.post('/plans', (req, res) => {
  const { errors, out } = normalizePlan(req.body || {}, { partial: false });
  if (errors.length) return bad(res, errors);
  if (plans.find((p) => p.name.toLowerCase() === out.name.toLowerCase())) {
    return res.status(409).json({ message: 'A plan with that name already exists' });
  }
  res.status(201).json({ message: 'Plan created', plan: planRow(plans.create({ is_active: true, description: '', ...out })) });
});

router.put('/plans/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!plans.byId(id)) return res.status(404).json({ message: 'Plan not found' });
  const { errors, out } = normalizePlan(req.body || {}, { partial: true });
  if (errors.length) return bad(res, errors);
  if (!Object.keys(out).length) return bad(res, ['No fields to update']);
  if (out.name && plans.find((p) => p.id !== id && p.name.toLowerCase() === out.name.toLowerCase())) {
    return res.status(409).json({ message: 'A plan with that name already exists' });
  }
  res.json({ message: 'Plan updated', plan: planRow(plans.update(id, out)) });
});

router.delete('/plans/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!plans.byId(id)) return res.status(404).json({ message: 'Plan not found' });
  const count = subscriberCount(id);
  if (count > 0) {
    return res.status(409).json({
      message: `${count} subscriber${count === 1 ? ' is' : 's are'} on this plan. Deactivate it instead, or move them first.`,
    });
  }
  plans.remove(id);
  res.json({ message: 'Plan deleted' });
});

/* ----------------------------- Subscribers ---------------------------- */

const userRow = (u) => {
  const pu = publicUser(u);
  return { ...pu, access: viewerFor(u) };
};

router.get('/users', (req, res) => {
  res.json(users.all().sort((a, b) => b.id - a.id).map(userRow));
});

// { role?, planId?, firstName?, lastName? }
router.put('/users/:id', (req, res) => {
  const id = Number(req.params.id);
  const target = users.byId(id);
  if (!target) return res.status(404).json({ message: 'User not found' });

  const body = req.body || {};
  const changes = {};
  const errors = [];

  if (body.firstName !== undefined) {
    if (!String(body.firstName).trim()) errors.push('First name is required');
    else changes.firstName = String(body.firstName).trim();
  }
  if (body.lastName !== undefined) changes.lastName = String(body.lastName || '').trim();
  if (body.role !== undefined) {
    if (!['user', 'admin'].includes(body.role)) errors.push('role must be "user" or "admin"');
    else if (id === req.user.id && body.role !== 'admin') errors.push("You can't remove your own admin role");
    else changes.role = body.role;
  }
  if (body.planId !== undefined) {
    if (body.planId === null || body.planId === '') {
      changes.planId = null;
      changes.planStartedAt = null;
    } else {
      const plan = plans.byId(body.planId);
      if (!plan) errors.push('Plan not found');
      else if (plan.id !== target.planId) {
        // Admins can assign any plan (including inactive ones); this restarts the plan period.
        changes.planId = plan.id;
        changes.planStartedAt = new Date().toISOString();
      }
    }
  }
  if (errors.length) return bad(res, errors);
  res.json({ message: 'Subscriber updated', user: userRow(users.update(id, changes)) });
});

router.delete('/users/:id', (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id) return bad(res, ["You can't delete your own account"]);
  if (!users.remove(id)) return res.status(404).json({ message: 'User not found' });
  sessions.removeForUser(id);
  res.json({ message: 'Subscriber deleted' });
});

export default router;
