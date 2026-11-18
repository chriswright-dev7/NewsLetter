// Browser client for the newsletter server (/api, proxied by Vite in dev).
const TOKEN = 'nl_token';

const token = {
  get: () => localStorage.getItem(TOKEN),
  set: (t) => localStorage.setItem(TOKEN, t),
  clear: () => localStorage.removeItem(TOKEN),
};

export class ApiError extends Error {
  constructor(status, data) {
    super(data?.message || `Request failed (${status})`);
    this.status = status;
    this.data = data;
  }
}

const request = async (path, { method = 'GET', body } = {}) => {
  const headers = { 'Content-Type': 'application/json' };
  const t = token.get();
  if (t) headers.Authorization = `Bearer ${t}`;
  let res;
  try {
    res = await fetch(`/api${path}`, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError(0, { message: 'Could not reach the newsletter server' });
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data);
  return data;
};

const api = {
  // ---- auth ----
  async login(email, password) {
    const data = await request('/auth/login', { method: 'POST', body: { email, password } });
    token.set(data.token);
    return data.user;
  },
  async signup(fields) {
    const data = await request('/auth/signup', { method: 'POST', body: fields });
    token.set(data.token);
    return data.user;
  },
  async logout() {
    await request('/auth/logout', { method: 'POST' }).catch(() => {});
    token.clear();
  },
  // { user, viewer } or null when logged out / session expired
  async me() {
    if (!token.get()) return null;
    try {
      return await request('/auth/me');
    } catch (err) {
      if (err.status === 401) token.clear();
      else throw err;
      return null;
    }
  },
  getDemoAccounts: () => request('/auth/demo-accounts'),
  forgetSession: () => token.clear(),

  // ---- account ----
  account: {
    updateProfile: (data) => request('/account/profile', { method: 'PUT', body: data }),
    changePassword: (data) => request('/account/password', { method: 'PUT', body: data }),
    setPlan: (planId) => request('/account/plan', { method: 'PUT', body: { planId } }),
  },

  // ---- articles ----
  getMeta: () => request('/articles/meta'),
  listArticles: () => request('/articles'),
  // Returns { viewer, article, locked, upgradePlans }
  async getArticle(slug) {
    try {
      const data = await request(`/articles/${encodeURIComponent(slug)}`);
      return { ...data, locked: false, upgradePlans: [] };
    } catch (err) {
      if (err.status === 403 && err.data?.code === 'TIER_REQUIRED') {
        const { viewer, article, upgradePlans = [] } = err.data;
        return { viewer, article, locked: true, upgradePlans };
      }
      throw err;
    }
  },

  // ---- admin ----
  admin: {
    listArticles: () => request('/admin/articles'),
    createArticle: (data) => request('/admin/articles', { method: 'POST', body: data }),
    updateArticle: (id, data) => request(`/admin/articles/${id}`, { method: 'PUT', body: data }),
    deleteArticle: (id) => request(`/admin/articles/${id}`, { method: 'DELETE' }),

    listPlans: () => request('/admin/plans'),
    createPlan: (data) => request('/admin/plans', { method: 'POST', body: data }),
    updatePlan: (id, data) => request(`/admin/plans/${id}`, { method: 'PUT', body: data }),
    deletePlan: (id) => request(`/admin/plans/${id}`, { method: 'DELETE' }),

    listUsers: () => request('/admin/users'),
    updateUser: (id, data) => request(`/admin/users/${id}`, { method: 'PUT', body: data }),
    deleteUser: (id) => request(`/admin/users/${id}`, { method: 'DELETE' }),
  },
};

export default api;
