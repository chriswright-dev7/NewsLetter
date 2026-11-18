import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';
import { useAuth } from '../../auth/AuthContext';
import { ArticleBody, TierBadge, formatDate } from '../ui';

const EMPTY_FORM = {
  title: '',
  slug: '',
  excerpt: '',
  body: '',
  author: '',
  category: '',
  coverImageUrl: '',
  requiredTier: 1,
  status: 'draft',
  publishedAt: '',
};

// ISO -> <input type="datetime-local"> value in local time
const toLocalInput = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function ArticlesTab({ notify }) {
  const { tiers, plans } = useAuth();
  const [articles, setArticles] = useState(null);
  const [loadError, setLoadError] = useState(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');

  const [editing, setEditing] = useState(null); // null = closed, {} = new, article = edit
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);

  const load = () =>
    api.admin
      .listArticles()
      .then((list) => {
        setArticles(list);
        setLoadError(null);
      })
      .catch((err) => setLoadError(err.message));

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (articles ?? []).filter((a) => {
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (tierFilter !== 'all' && a.required_tier !== Number(tierFilter)) return false;
      return !q || [a.title, a.author, a.category, a.slug].some((v) => v?.toLowerCase().includes(q));
    });
  }, [articles, search, statusFilter, tierFilter]);

  if (loadError) return <div className="state-msg"><h2>Couldn't load articles</h2><p className="muted">{loadError}</p></div>;
  if (!articles) return <div className="state-msg">Loading articles…</div>;

  const published = articles.filter((a) => a.status === 'published').length;
  const drafts = articles.length - published;

  const openEditor = (a) => {
    setPreview(false);
    if (!a) {
      setForm(EMPTY_FORM);
      setEditing({});
      return;
    }
    setForm({
      title: a.title || '',
      slug: a.slug || '',
      excerpt: a.excerpt || '',
      body: a.body || '',
      author: a.author || '',
      category: a.category || '',
      coverImageUrl: a.cover_image_url || '',
      requiredTier: a.required_tier,
      status: a.status,
      publishedAt: toLocalInput(a.published_at),
    });
    setEditing(a);
  };

  const onField = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: name === 'requiredTier' ? Number(value) : value }));
  };

  const save = async (e) => {
    e.preventDefault();
    const payload = { ...form, publishedAt: form.publishedAt ? new Date(form.publishedAt).toISOString() : '' };
    try {
      setSaving(true);
      if (editing.id) await api.admin.updateArticle(editing.id, payload);
      else await api.admin.createArticle(payload);
      notify(editing.id ? 'Article updated' : 'Article created');
      setEditing(null);
      await load();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (a) => {
    const next = a.status === 'published' ? 'draft' : 'published';
    try {
      await api.admin.updateArticle(a.id, { status: next });
      notify(next === 'published' ? `Published “${a.title}”` : `Moved “${a.title}” to drafts`);
      await load();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const remove = async (a) => {
    if (!window.confirm(`Delete "${a.title}"? This cannot be undone.`)) return;
    try {
      await api.admin.deleteArticle(a.id);
      notify('Article deleted');
      await load();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const readableBy = plans.filter((p) => p.access_tier >= Number(form.requiredTier)).map((p) => p.name);

  return (
    <>
      <div className="admin-head">
        <div>
          <h1 className="page-title">Articles</h1>
          <p className="muted small">
            {articles.length} total · {published} published · {drafts} {drafts === 1 ? 'draft' : 'drafts'}
          </p>
        </div>
        <button type="button" className="btn" onClick={() => openEditor(null)}>New article</button>
      </div>

      <div className="admin-filters">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title, author, category…"
          aria-label="Search articles"
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Status">
          <option value="all">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Drafts</option>
        </select>
        <select value={tierFilter} onChange={(e) => setTierFilter(e.target.value)} aria-label="Tier">
          <option value="all">All tiers</option>
          {tiers.map((t) => <option key={t.level} value={t.level}>{t.name}</option>)}
        </select>
      </div>

      <div className="table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Tier</th>
              <th>Status</th>
              <th>Published</th>
              <th>Author</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.id}>
                <td>
                  <div className="admin-title">{a.title}</div>
                  <div className="admin-sub"><code>/{a.slug}</code>{a.category && <> · {a.category}</>}</div>
                </td>
                <td><TierBadge level={a.required_tier} name={a.required_tier_name} small /></td>
                <td><span className={`status status--${a.status}`}>{a.status === 'published' ? 'Published' : 'Draft'}</span></td>
                <td className="nowrap">{formatDate(a.published_at, { month: 'short', day: 'numeric', year: 'numeric' }) || '—'}</td>
                <td>{a.author || '—'}</td>
                <td className="admin-actions">
                  <button type="button" onClick={() => openEditor(a)}>Edit</button>
                  <button type="button" onClick={() => togglePublish(a)}>{a.status === 'published' ? 'Unpublish' : 'Publish'}</button>
                  <Link to={`/articles/${a.slug}`}>View</Link>
                  <button type="button" className="danger" onClick={() => remove(a)}>Delete</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="muted empty-row">No articles match these filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={editing.id ? 'Edit article' : 'New article'}>
          <form className="modal" onSubmit={save}>
            <div className="modal-head">
              <h2>{editing.id ? 'Edit article' : 'New article'}</h2>
              <button type="button" className="modal-close" onClick={() => setEditing(null)} aria-label="Close">×</button>
            </div>

            <div className="modal-body">
              <div className="field-grid">
                <label className="span-2">Title *
                  <input name="title" value={form.title} onChange={onField} required />
                </label>
                <label>Slug
                  <input name="slug" value={form.slug} onChange={onField} placeholder="generated from title" className="mono" />
                </label>
                <label>Category
                  <input name="category" value={form.category} onChange={onField} />
                </label>
                <label>Author
                  <input name="author" value={form.author} onChange={onField} />
                </label>
                <label>Cover image URL
                  <input name="coverImageUrl" value={form.coverImageUrl} onChange={onField} />
                </label>
                <label>Required tier
                  <select name="requiredTier" value={form.requiredTier} onChange={onField}>
                    {tiers.map((t) => <option key={t.level} value={t.level}>{t.name} — {t.description}</option>)}
                  </select>
                  <span className="hint">
                    {Number(form.requiredTier) === 0
                      ? 'Anyone can read it, no login needed.'
                      : `Readable by: ${readableBy.join(', ') || 'no active plan yet'}`}
                  </span>
                </label>
                <div className="field-pair">
                  <label>Status
                    <select name="status" value={form.status} onChange={onField}>
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                    </select>
                  </label>
                  <label>Publish date
                    <input type="datetime-local" name="publishedAt" value={form.publishedAt} onChange={onField} />
                  </label>
                </div>
                <label className="span-2">Excerpt <span className="hint-inline">shown to everyone, including locked readers</span>
                  <textarea name="excerpt" value={form.excerpt} onChange={onField} rows={2} />
                </label>
              </div>

              <div className="body-editor">
                <div className="body-editor-head">
                  <span>Body <span className="hint-inline">blank line between paragraphs, “## ” for headings</span></span>
                  <div className="seg">
                    <button type="button" className={!preview ? 'on' : ''} onClick={() => setPreview(false)}>Write</button>
                    <button type="button" className={preview ? 'on' : ''} onClick={() => setPreview(true)}>Preview</button>
                  </div>
                </div>
                {preview ? (
                  <div className="body-preview">
                    <h1 className="article-title">{form.title || 'Untitled'}</h1>
                    {form.excerpt && <p className="article-dek">{form.excerpt}</p>}
                    <ArticleBody body={form.body} />
                  </div>
                ) : (
                  <textarea name="body" value={form.body} onChange={onField} rows={14} className="mono" />
                )}
              </div>
            </div>

            <div className="modal-foot">
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
              <button type="submit" className="btn" disabled={saving}>
                {saving ? 'Saving…' : editing.id ? 'Save changes' : 'Create article'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
