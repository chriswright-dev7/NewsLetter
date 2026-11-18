// Reader-facing article endpoints. Locked article bodies never leave the server.
import express from 'express';
import { articles, plans } from '../store.js';
import { TIERS, tierName } from '../tiers.js';

const router = express.Router();

const isLive = (a) =>
  a.status === 'published' && (!a.published_at || new Date(a.published_at) <= new Date());

const byDateDesc = (a, b) =>
  new Date(b.published_at || 0) - new Date(a.published_at || 0) || b.id - a.id;

const decorate = (a, viewer) => ({
  ...a,
  required_tier_name: tierName(a.required_tier),
  locked: a.required_tier > viewer.tier,
});

// Plans readers can sign up for, cheapest-tier first.
export const activePlans = () =>
  plans
    .all()
    .filter((p) => p.is_active)
    .map((p) => ({ ...p, access_tier_name: tierName(p.access_tier) }))
    .sort((a, b) => a.access_tier - b.access_tier || a.price - b.price);

router.get('/meta', (req, res) => {
  res.json({ tiers: TIERS, plans: activePlans(), viewer: req.viewer });
});

router.get('/', (req, res) => {
  const list = articles
    .all()
    .filter(isLive)
    .sort(byDateDesc)
    .map(({ body, ...a }) => decorate(a, req.viewer));
  res.json({ viewer: req.viewer, articles: list });
});

router.get('/:slug', (req, res) => {
  const found = articles.find((a) => a.slug === req.params.slug);
  // Drafts and scheduled posts are visible to admins only (preview).
  if (!found || (!isLive(found) && !req.viewer.isAdmin)) {
    return res.status(404).json({ message: 'Article not found' });
  }

  const article = decorate(found, req.viewer);
  if (article.locked) {
    const { body, ...teaser } = article;
    return res.status(403).json({
      message: `This article requires a ${article.required_tier_name} subscription`,
      code: 'TIER_REQUIRED',
      viewer: req.viewer,
      article: teaser,
      upgradePlans: activePlans().filter((p) => p.access_tier >= article.required_tier),
    });
  }
  res.json({ viewer: req.viewer, article });
});

export default router;
