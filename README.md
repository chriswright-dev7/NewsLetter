# Signal & Noise: tiered newsletter (prototype)

A self-contained newsletter site. Readers sign up for a plan, and each plan unlocks a tier of
articles. Admins manage articles, plans and subscribers. No other service needs to be running.

```
Browser ──► Vite dev server :3001 ──/api──► Newsletter server :5100 ──► data/db.json
            (React UI)                       (accounts, plans, articles)
```

## Requirements

- Node.js 22.9 or later. The server scripts use `--env-file-if-exists`.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3001. `npm run dev` starts the newsletter server (`api`) and the Vite dev
server (`web`) together. Press `Ctrl+C` to stop both.

On first run the server creates `data/db.json` with 7 mock articles, 4 plans and 5 demo accounts.

### Demo accounts (password `demo`)

| Account | Plan | Access |
|---------|------|--------|
| admin@demo.test   | none (admin role) | Everything + **Admin** page |
| trial@demo.test   | Free Trial (14 days) | Basic |
| monthly@demo.test | Monthly    | Premium |
| annual@demo.test  | Annual     | Insider |
| nosub@demo.test   | none       | Public only |

The login page has one-click buttons for each; set `SHOW_DEMO_ACCOUNTS=false` to hide them.
Logging in as the admin opens the Admin page. New readers can create their own accounts on the
sign-up page.

### Production build

```bash
npm run build   # builds the React app into dist/
npm start       # newsletter server serves the API and dist/ on http://localhost:5100
```

### Environment variables (`.env`, optional)

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `5100` | Newsletter server port. The Vite dev server proxies `/api` to it. |
| `DATA_FILE` | `data/db.json` | Where articles, plans, users and sessions are stored |
| `SESSION_DAYS` | `30` | How long a login lasts |
| `SHOW_DEMO_ACCOUNTS` | `true` | List the demo accounts on the login page |

## How access works

| Tier | Level | Default plans |
|------|-------|---------------|
| Public  | 0 | Everyone, no login |
| Basic   | 1 | Free Trial |
| Premium | 2 | Monthly, 6 Months |
| Insider | 3 | Annual. Admins always get Insider |

- Each article has a `required_tier`. A reader can open it if their plan's tier is greater than or equal to it.
- Each plan has an `access_tier`, which admins set on the **Plans** tab.
- Free plans (price 0) are trials. They expire after their period, and each account gets one trial.
- The server applies the check. A locked article's body is never sent: the server returns
  `403 TIER_REQUIRED` with the teaser and the plans that would unlock it.
- Plan changes are simulated. No payment is taken, and changes apply immediately.

## Pages

| Path | Who | What |
|------|-----|------|
| `/` | everyone | Latest articles with tier badges, lock icons and tier filters |
| `/articles/:slug` | everyone | Full article, or a paywall listing the plans that unlock it |
| `/membership` | everyone | Which plans unlock each tier; highlights the reader's current access |
| `/signup` | logged out | Choose a plan (`?plan=<id>` preselects one) and create an account |
| `/login` | logged out | Log in (plus demo account buttons) |
| `/account` | readers | Current plan, switch or cancel plan, edit profile, change password |
| `/admin` | admins | Articles, Plans and Subscribers tabs |

## Admin page (`/admin`)

**Articles**
- Search and filter by status and tier
- Create and edit with a live preview, required tier, draft/published status and publish date
- Publish, unpublish, view and delete. Admins can preview drafts at their article URL.

**Plans**
- Create and edit plans: name, description, price, billing period and the tier the plan unlocks
- Change a plan's tier straight from the table
- Deactivate a plan to hide it from new readers; existing subscribers keep their access
- A plan with subscribers can't be deleted

**Subscribers**
- Search by name or email, and filter by plan, no plan, or admins
- Assign or remove a reader's plan (this restarts its period)
- Grant or remove the admin role. You can't change your own role or delete yourself.
- Delete accounts. This also signs them out everywhere.

## Project layout

```
server/                     Express API
  index.js                  app setup; serves dist/ in production
  config.js                 reads PORT, DATA_FILE, SESSION_DAYS, SHOW_DEMO_ACCOUNTS
  tiers.js                  tier definitions
  access.js                 sessions -> user -> subscription -> viewer tier (incl. trial expiry)
  passwords.js              scrypt password hashing, session tokens
  store.js                  JSON-file storage for articles, plans, users, sessions
  routes/auth.js            /api/auth: signup, login, logout, me, demo-accounts
  routes/account.js         /api/account: profile, password, plan
  routes/articles.js        /api/articles: reader-facing list, meta, article
  routes/admin.js           /api/admin: articles, plans, users
  seed/                     mock articles, plans and demo users
src/                        React frontend (Vite)
  api/index.js              browser API client
  auth/AuthContext.jsx      current user, viewer tier, plans
  pages/                    Home, Article, Membership, Signup, Login, Account, Admin
  components/               Header, ArticleCard, Paywall, PlanPicker, shared UI
  components/admin/         ArticlesTab, PlansTab, SubscribersTab
  styles.css                all styles
data/                       runtime data (git-ignored); delete db.json to reset
```

## API

Requests are authenticated with `Authorization: Bearer <token>` (returned by signup and login).

| Method | Path | Notes |
|--------|------|-------|
| POST | /api/auth/signup | `{ firstName, lastName, email, password, planId? }` |
| POST | /api/auth/login | `{ email, password }` |
| POST | /api/auth/logout | ends the current session |
| GET  | /api/auth/me | `{ user, viewer }` |
| GET  | /api/auth/demo-accounts | demo accounts (empty if hidden) |
| PUT  | /api/account/profile | `{ firstName, lastName }` |
| PUT  | /api/account/password | `{ currentPassword, newPassword }`; signs out everywhere |
| PUT  | /api/account/plan | `{ planId }` to subscribe or switch, `{ planId: null }` to cancel |
| GET  | /api/articles | published list, with `locked` per viewer, no bodies |
| GET  | /api/articles/meta | tiers, active plans, viewer |
| GET  | /api/articles/:slug | full article, or 403 `TIER_REQUIRED` with teaser + upgrade plans |
| GET/POST | /api/admin/articles | admin only |
| PUT/DELETE | /api/admin/articles/:id | admin only |
| GET/POST | /api/admin/plans | admin only; GET includes subscriber counts |
| PUT/DELETE | /api/admin/plans/:id | admin only; DELETE refuses plans with subscribers |
| GET  | /api/admin/users | admin only |
| PUT/DELETE | /api/admin/users/:id | admin only; PUT takes `{ role?, planId?, firstName?, lastName? }` |

## Troubleshooting

- **"Can't reach the newsletter server"**: the `api` process isn't running. Start the app with
  `npm run dev`, not `vite` on its own.
- **"Port 5100 is already in use"**: another newsletter server is still running. Stop it, or set
  a different `PORT` in `.env`. The Vite proxy follows it.
- **Port 3001 already in use**: Vite switches to the next free port (e.g. 3002) and prints the URL.
- **Reset everything**: stop the server, delete `data/db.json`, and start it again.

## Prototype limitations

- Storage is a JSON file. Swap `store.js` for a database before real use.
- No payments. Choosing a paid plan activates it straight away, and paid plans don't expire.
- No email verification or password reset.
- Article bodies are plain text: paragraphs separated by blank lines, `## ` for headings.
