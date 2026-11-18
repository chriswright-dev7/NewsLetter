// The logged-in reader's own account: profile, password and plan.
// Plan changes are simulated: there is no payment step in this prototype.
import express from 'express';
import { plans, sessions, users } from '../store.js';
import { hashPassword, verifyPassword } from '../passwords.js';
import { publicUser, requireUser, viewerFor } from '../access.js';

const router = express.Router();
router.use(requireUser);

const reply = (res, user) => res.json({ user: publicUser(user), viewer: viewerFor(user) });

router.put('/profile', (req, res) => {
  const { firstName, lastName } = req.body || {};
  if (!String(firstName || '').trim()) return res.status(400).json({ message: 'First name is required' });
  reply(res, users.update(req.user.id, { firstName: String(firstName).trim(), lastName: String(lastName || '').trim() }));
});

router.put('/password', (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!verifyPassword(currentPassword, req.user.passwordHash)) {
    return res.status(400).json({ message: 'Current password is incorrect' });
  }
  if (String(newPassword || '').length < 8) {
    return res.status(400).json({ message: 'New password must be at least 8 characters' });
  }
  users.update(req.user.id, { passwordHash: hashPassword(newPassword) });
  // Sign out everywhere, including this session.
  sessions.removeForUser(req.user.id);
  res.json({ message: 'Password changed. Please log in again.' });
});

// { planId } to subscribe or switch; { planId: null } to cancel.
router.put('/plan', (req, res) => {
  const { planId } = req.body || {};
  if (planId === null || planId === '') {
    return reply(res, users.update(req.user.id, { planId: null, planStartedAt: null }));
  }
  const plan = plans.byId(planId);
  if (!plan || !plan.is_active) return res.status(400).json({ message: 'That plan is not available' });
  if (plan.id === req.user.planId) return reply(res, req.user);

  const isTrial = Number(plan.price) === 0;
  if (isTrial && req.user.trialUsedAt) {
    return res.status(400).json({ message: 'You have already used your free trial' });
  }
  const startedAt = new Date().toISOString();
  reply(res, users.update(req.user.id, {
    planId: plan.id,
    planStartedAt: startedAt,
    ...(isTrial ? { trialUsedAt: startedAt } : {}),
  }));
});

export default router;
