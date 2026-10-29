import { useMemo, useRef, useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { Film, Plus, X, Trash2, RefreshCw, Upload, Eye, EyeOff, UtensilsCrossed, Pencil } from 'lucide-react';
import { api } from '../../convexApi';
import { getAdminToken } from '../../utils/teamSession';
import { uploadMediaToTelegram } from '../../services/telegramClient';

const EMPTY_FORM = { title: '', caption: '', videoUrl: '', posterUrl: '', telegramFileId: '', isActive: true };

/**
 * Reels: the admin's stand-alone clips for the customer Reels feed (kitchen moments, fun videos).
 * These are not linked to a dish, so customers see them without an Add to Order bar.
 * Dish reels are switched on per dish in Menu ("Show this dish's video in Reels").
 */
export default function ReelsManager({ onOpenMenu }) {
  const adminToken = getAdminToken();
  const reels = useQuery(api.reels.listAdmin, adminToken ? { adminToken } : 'skip');
  const menu = useQuery(api.menu.getMenu);
  const createReel = useMutation(api.reels.create);
  const updateReel = useMutation(api.reels.update);
  const removeReel = useMutation(api.reels.remove);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const fileRef = useRef(null);

  // Dishes whose video is in Reels (same rule the customer feed uses)
  const dishReels = useMemo(() => {
    if (!Array.isArray(menu)) return null;
    const items = menu.flatMap((cat) => cat.items || []);
    return items.filter((item) => item.makingVideoUrl && item.showInReels !== false);
  }, [menu]);

  const openNew = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (reel) => {
    setEditingId(reel._id);
    setForm({
      title: reel.title,
      caption: reel.caption || '',
      videoUrl: reel.videoUrl,
      posterUrl: reel.posterUrl || '',
      telegramFileId: reel.telegramFileId || '',
      isActive: reel.isActive
    });
    setFormError('');
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      setFormError('Choose a video file (MP4, MOV or WebM).');
      return;
    }
    setUploading(true);
    setFormError('');
    try {
      const result = await uploadMediaToTelegram(file);
      const url = result?.cdnUrl || result?.url || '';
      if (!url) throw new Error('Upload finished but no video link came back');
      setForm((prev) => ({ ...prev, videoUrl: url, telegramFileId: result?.fileId || result?.file_id || '' }));
    } catch (err) {
      setFormError(err.message || 'Video upload failed. Try again or paste a video link.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.title.trim()) return setFormError('Give the reel a title.');
    if (!form.videoUrl.trim()) return setFormError('Upload a video or paste a video link.');
    setSaving(true);
    try {
      const fields = {
        title: form.title,
        caption: form.caption,
        videoUrl: form.videoUrl,
        posterUrl: form.posterUrl || undefined,
        telegramFileId: form.telegramFileId || undefined,
        isActive: form.isActive
      };
      if (editingId) await updateReel({ adminToken, id: editingId, ...fields });
      else await createReel({ adminToken, ...fields });
      closeForm();
    } catch (err) {
      setFormError(err.data || err.message || 'Could not save the reel.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = (reel) => updateReel({ adminToken, id: reel._id, isActive: !reel.isActive }).catch(() => {});

  const handleDelete = async (id) => {
    setConfirmDeleteId(null);
    try {
      await removeReel({ adminToken, id });
    } catch (_) { /* list stays as is */ }
  };

  if (!adminToken || reels === null) {
    return (
      <div className="adm-card text-sm text-[var(--adm-warning)]">
        Your admin session expired. Sign out and sign in again to manage reels.
      </div>
    );
  }

  const loading = reels === undefined;
  const liveCount = (reels || []).filter((r) => r.isActive).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <header className="adm-card flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-[var(--adm-text)] flex items-center gap-2">
            <Film className="w-5 h-5 text-[var(--adm-primary)]" /> Reels
          </h1>
          <p className="adm-section-sub">
            What customers see when they swipe to Reels. Dish videos come with an <strong>Add to Order</strong> button;
            the fun reels you post here play in between, without one.
          </p>
        </div>
        <button type="button" onClick={showForm ? closeForm : openNew} className="adm-btn adm-btn--primary shrink-0">
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancel' : 'New fun reel'}
        </button>
      </header>

      {/* Summary */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="adm-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--adm-surface-2)' }}>
            <UtensilsCrossed className="w-5 h-5 text-[var(--adm-primary)]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-[var(--adm-text)]">
              {dishReels === null ? '…' : dishReels.length} dish {dishReels?.length === 1 ? 'reel' : 'reels'}
            </div>
            <p className="text-xs text-[var(--adm-text-muted)]">
              Turn on "Show this dish's video in Reels" when you add a dish video.
            </p>
          </div>
          {onOpenMenu && (
            <button type="button" onClick={onOpenMenu} className="adm-btn shrink-0">Menu</button>
          )}
        </div>
        <div className="adm-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--adm-surface-2)' }}>
            <Film className="w-5 h-5 text-[var(--adm-primary)]" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-[var(--adm-text)]">
              {loading ? '…' : liveCount} fun {liveCount === 1 ? 'reel' : 'reels'} live
            </div>
            <p className="text-xs text-[var(--adm-text-muted)]">Kitchen moments, behind the scenes, anything fun.</p>
          </div>
        </div>
      </div>

      {/* Create / edit form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="adm-card space-y-4">
          <h2 className="text-sm font-semibold text-[var(--adm-text)]">{editingId ? 'Edit fun reel' : 'New fun reel'}</h2>

          <div className="grid gap-4 md:grid-cols-[220px_1fr]">
            {/* Video */}
            <div>
              <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={handleUpload} />
              <div
                className="relative aspect-[9/16] w-full max-w-[220px] rounded-xl overflow-hidden flex items-center justify-center"
                style={{ background: 'var(--adm-surface-2)', border: '1px dashed var(--adm-border)' }}
              >
                {form.videoUrl ? (
                  <video src={form.videoUrl} className="w-full h-full object-cover" muted loop autoPlay playsInline />
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="flex flex-col items-center gap-2 text-xs text-[var(--adm-text-muted)] cursor-pointer p-4"
                  >
                    {uploading ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
                    <span>{uploading ? 'Uploading…' : 'Upload a vertical video'}</span>
                  </button>
                )}
                {form.videoUrl && (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="absolute bottom-2 inset-x-2 adm-btn justify-center text-xs"
                  >
                    {uploading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    {uploading ? 'Uploading…' : 'Replace video'}
                  </button>
                )}
              </div>
            </div>

            {/* Details */}
            <div className="space-y-3">
              <label className="text-xs space-y-1 block">
                <span className="text-[var(--adm-text-muted)] font-semibold">Title</span>
                <input
                  className="adm-input w-full"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Friday night in our kitchen"
                  maxLength={80}
                  required
                />
              </label>
              <label className="text-xs space-y-1 block">
                <span className="text-[var(--adm-text-muted)] font-semibold">Caption</span>
                <textarea
                  className="adm-input w-full !h-auto py-2 resize-y"
                  rows={3}
                  value={form.caption}
                  onChange={(e) => setForm({ ...form, caption: e.target.value })}
                  placeholder="A line or two for customers, hashtags welcome"
                  maxLength={600}
                />
              </label>
              <label className="text-xs space-y-1 block">
                <span className="text-[var(--adm-text-muted)] font-semibold">Or paste a video link</span>
                <input
                  className="adm-input w-full font-mono"
                  type="url"
                  value={form.videoUrl}
                  onChange={(e) => setForm({ ...form, videoUrl: e.target.value, telegramFileId: '' })}
                  placeholder="https://…/video.mp4"
                />
              </label>
              <label className="flex items-center gap-2 text-xs text-[var(--adm-text)] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                />
                Show to customers now
              </label>

              {formError && <p className="text-xs text-[var(--adm-danger)]">{formError}</p>}

              <div className="flex gap-2">
                <button type="submit" disabled={saving || uploading} className="adm-btn adm-btn--primary">
                  {saving && <RefreshCw className="w-4 h-4 animate-spin" />}
                  {editingId ? 'Save changes' : 'Post reel'}
                </button>
                <button type="button" onClick={closeForm} className="adm-btn adm-btn--ghost">Cancel</button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Reel list */}
      <section className="adm-card">
        <h2 className="text-sm font-semibold text-[var(--adm-text)] mb-3">Fun reels</h2>
        {loading ? (
          <p className="text-xs text-[var(--adm-text-muted)]">Loading reels…</p>
        ) : reels.length === 0 ? (
          <div className="text-center py-8">
            <Film className="w-8 h-8 mx-auto text-[var(--adm-text-muted)] mb-2" />
            <p className="text-sm text-[var(--adm-text)] font-medium">No fun reels yet</p>
            <p className="text-xs text-[var(--adm-text-muted)] mt-1">Post a kitchen moment and it will play between the dish reels.</p>
          </div>
        ) : (
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            {reels.map((reel) => (
              <article
                key={reel._id}
                className="rounded-xl overflow-hidden flex flex-col"
                style={{ background: 'var(--adm-surface-2)', border: '1px solid var(--adm-border)', opacity: reel.isActive ? 1 : 0.6 }}
              >
                <div className="relative aspect-[9/16] bg-black">
                  <video src={reel.videoUrl} poster={reel.posterUrl} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                  <span
                    className="absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      background: reel.isActive ? 'var(--adm-success)' : 'var(--adm-surface)',
                      color: reel.isActive ? '#fff' : 'var(--adm-text-muted)'
                    }}
                  >
                    {reel.isActive ? 'Live' : 'Hidden'}
                  </span>
                </div>
                <div className="p-2.5 flex-1 flex flex-col gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-[var(--adm-text)] truncate" title={reel.title}>{reel.title}</div>
                    {reel.caption && <div className="text-[11px] text-[var(--adm-text-muted)] line-clamp-2">{reel.caption}</div>}
                  </div>
                  {confirmDeleteId === reel._id ? (
                    <div className="mt-auto flex gap-1.5">
                      <button type="button" onClick={() => handleDelete(reel._id)} className="adm-btn flex-1 justify-center text-xs" style={{ color: 'var(--adm-danger)' }}>
                        Delete
                      </button>
                      <button type="button" onClick={() => setConfirmDeleteId(null)} className="adm-btn adm-btn--ghost flex-1 justify-center text-xs">
                        Keep
                      </button>
                    </div>
                  ) : (
                    <div className="mt-auto flex gap-1.5">
                      <button type="button" onClick={() => toggleActive(reel)} className="adm-btn flex-1 justify-center text-xs" title={reel.isActive ? 'Hide from customers' : 'Show to customers'}>
                        {reel.isActive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        {reel.isActive ? 'Hide' : 'Show'}
                      </button>
                      <button type="button" onClick={() => openEdit(reel)} className="adm-btn text-xs" aria-label="Edit reel" title="Edit">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" onClick={() => setConfirmDeleteId(reel._id)} className="adm-btn text-xs" aria-label="Delete reel" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
