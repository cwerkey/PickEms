import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../api';
import ImportModal from '../components/ImportModal';

export default function AdminEvent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [showJsonEditor, setShowJsonEditor] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingNominee, setEditingNominee] = useState(null);
  const [newCatName, setNewCatName] = useState('');
  const [addingNomineeFor, setAddingNomineeFor] = useState(null);
  const [newNominee, setNewNominee] = useState({ name: '', subtitle: '' });
  const [participants, setParticipants] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [tab, setTab] = useState('answers');

  const load = useCallback(async () => {
    try {
      const [ev, parts, users] = await Promise.all([
        api.getEvent(id),
        api.getParticipants(id),
        api.getUsers(),
      ]);
      setEvent(ev);
      setParticipants(parts);
      setAllUsers(users);
    } catch (e) {
      toast.error(e.message);
      navigate('/admin');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleSetAnswer = async (categoryId, nomineeId) => {
    try { await api.setAnswer(categoryId, nomineeId || null); load(); }
    catch (e) { toast.error(e.message); }
  };

  const handleToggleLock = async () => {
    try {
      await api.updateEvent(id, { is_locked: event.is_locked ? 0 : 1 });
      toast.success(event.is_locked ? 'Unlocked' : 'Locked');
      load();
    } catch (e) { toast.error(e.message); }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try { await api.addCategory(id, newCatName.trim()); setNewCatName(''); load(); }
    catch (e) { toast.error(e.message); }
  };

  const handleUpdateCategory = async (catId) => {
    if (!editingCategory?.name?.trim()) return;
    try { await api.updateCategory(catId, { name: editingCategory.name }); setEditingCategory(null); load(); }
    catch (e) { toast.error(e.message); }
  };

  const handleDeleteCategory = async (catId) => {
    if (!confirm('Delete this category and all its nominees?')) return;
    try { await api.deleteCategory(catId); load(); }
    catch (e) { toast.error(e.message); }
  };

  const handleAddNominee = async (e) => {
    e.preventDefault();
    if (!newNominee.name.trim()) return;
    try {
      await api.addNominee(addingNomineeFor, newNominee);
      setNewNominee({ name: '', subtitle: '' });
      setAddingNomineeFor(null);
      load();
    } catch (e) { toast.error(e.message); }
  };

  const handleUpdateNominee = async (nomId) => {
    if (!editingNominee?.name?.trim()) return;
    try { await api.updateNominee(nomId, { name: editingNominee.name, subtitle: editingNominee.subtitle }); setEditingNominee(null); load(); }
    catch (e) { toast.error(e.message); }
  };

  const handleDeleteNominee = async (nomId) => {
    try { await api.deleteNominee(nomId); load(); }
    catch (e) { toast.error(e.message); }
  };

  const handleExportJson = () => {
    if (!event?.categories) return;
    const data = event.categories.map(cat => ({
      name: cat.name,
      nominees: cat.nominees.map(n => ({ name: n.name, subtitle: n.subtitle || '' })),
    }));
    setJsonText(JSON.stringify(data, null, 2));
    setJsonError('');
    setShowJsonEditor(true);
  };

  const handleJsonEditorSave = async (replace) => {
    try {
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed)) throw new Error('Must be an array');
      if (replace) { await api.reimportCategories(id, parsed); toast.success('Categories replaced'); }
      else { await api.importCategories(id, parsed); toast.success('Categories imported'); }
      setShowJsonEditor(false);
      load();
    } catch (e) { setJsonError(e.message); }
  };

  const handleAddParticipant = async (userId) => {
    try { await api.addParticipant(id, userId); load(); }
    catch (e) { toast.error(e.message); }
  };

  const handleRemoveParticipant = async (userId) => {
    try { await api.removeParticipant(id, userId); load(); }
    catch (e) { toast.error(e.message); }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
      <div style={{ color: 'var(--text-muted)' }}>Loading...</div>
    </div>
  );
  if (!event) return null;

  const participantIds = new Set(participants.map(p => p.id));
  const nonParticipants = allUsers.filter(u => !participantIds.has(u.id));
  const answeredCount = event.categories?.filter(c => c.correct_nominee_id).length || 0;

  const tabs = [
    { key: 'answers', label: 'CORRECT ANSWERS' },
    { key: 'edit', label: 'EDIT CATEGORIES' },
    { key: 'participants', label: 'PARTICIPANTS' },
  ];

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <button onClick={() => navigate('/admin')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginBottom: 6, fontSize: 13 }}>
            ← Back to Admin
          </button>
          <h1 className="page-title">{event.name}</h1>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowImport(true)}>📥 Import</button>
          <button className="btn btn-ghost btn-sm" onClick={handleExportJson}>📤 JSON Editor</button>
          <button
            className="btn btn-sm"
            style={{
              background: event.is_locked ? 'rgba(34,201,122,0.1)' : 'rgba(232,97,42,0.1)',
              color: event.is_locked ? 'var(--green)' : 'var(--rust)',
              border: `1px solid ${event.is_locked ? 'rgba(34,201,122,0.3)' : 'rgba(232,97,42,0.3)'}`,
            }}
            onClick={handleToggleLock}
          >
            {event.is_locked ? '🔓 Unlock' : '🔒 Lock Picks'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <span className="badge badge-blue">{event.categories?.length || 0} categories</span>
        <span className="badge badge-green">{answeredCount} answered</span>
        <span className="badge badge-muted">{participants.length} participants</span>
        {event.is_locked && <span className="badge badge-muted">🔒 Locked</span>}
      </div>

      {/* Tab Nav */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            background: 'none', border: 'none',
            padding: '10px 16px',
            color: tab === t.key ? 'var(--blue)' : 'var(--text-muted)',
            fontFamily: 'var(--font-display)',
            fontSize: '0.95rem', letterSpacing: '0.05em',
            borderBottom: `2px solid ${tab === t.key ? 'var(--blue)' : 'transparent'}`,
            cursor: 'pointer', transition: 'all 0.2s', marginBottom: -1,
            whiteSpace: 'nowrap',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Correct Answers ── */}
      {tab === 'answers' && (
        <div className="card">
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
            Click the winning nominee to mark it correct. Click again to clear.
          </p>
          {!event.categories?.length && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>
              No categories yet — use Import or the Edit Categories tab.
            </div>
          )}
          {event.categories?.map(cat => (
            <div key={cat.id} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 6, fontWeight: 600 }}>
                {cat.name}
                {cat.correct_nominee_id && (
                  <span className="badge badge-green" style={{ marginLeft: 8, fontSize: 11 }}>✓ Answered</span>
                )}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {cat.nominees.map(nom => {
                  const isSelected = cat.correct_nominee_id === nom.id;
                  return (
                    <button
                      key={nom.id}
                      onClick={() => handleSetAnswer(cat.id, isSelected ? null : nom.id)}
                      className="btn btn-sm"
                      style={{
                        background: isSelected ? 'rgba(34,201,122,0.15)' : 'var(--surface2)',
                        border: `1px solid ${isSelected ? 'rgba(34,201,122,0.5)' : 'var(--border)'}`,
                        color: isSelected ? 'var(--green)' : 'var(--text-dim)',
                      }}
                    >
                      {isSelected && '★ '}{nom.name}
                      {nom.subtitle && (
                        <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>— {nom.subtitle}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Tab: Edit Categories ── */}
      {tab === 'edit' && (
        <div className="card">
          {/* Add category */}
          <form onSubmit={handleAddCategory} style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <input
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              placeholder="New category name..."
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn btn-primary btn-sm">+ Add Category</button>
          </form>

          {!event.categories?.length && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>
              No categories yet. Add one above or use Import.
            </div>
          )}

          {event.categories?.map(cat => (
            <div key={cat.id} style={{
              background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', padding: '12px 14px', marginBottom: 10,
            }}>
              {/* Category header row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                {editingCategory?.id === cat.id ? (
                  <>
                    <input
                      value={editingCategory.name}
                      onChange={e => setEditingCategory(c => ({ ...c, name: e.target.value }))}
                      style={{ flex: 1, fontSize: 14, padding: '5px 10px' }}
                      autoFocus
                      onKeyDown={e => { if (e.key === 'Enter') handleUpdateCategory(cat.id); if (e.key === 'Escape') setEditingCategory(null); }}
                    />
                    <button className="btn btn-primary btn-sm" onClick={() => handleUpdateCategory(cat.id)}>Save</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditingCategory(null)}>Cancel</button>
                  </>
                ) : (
                  <>
                    <span style={{ flex: 1, fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{cat.name}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{cat.nominees.length} nominees</span>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditingCategory({ id: cat.id, name: cat.name })}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDeleteCategory(cat.id)}>Delete</button>
                  </>
                )}
              </div>

              {/* Nominees */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, paddingLeft: 8 }}>
                {cat.nominees.map(nom => (
                  <div key={nom.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {editingNominee?.id === nom.id ? (
                      <>
                        <input
                          value={editingNominee.name}
                          onChange={e => setEditingNominee(n => ({ ...n, name: e.target.value }))}
                          placeholder="Name"
                          style={{ flex: 2, fontSize: 13, padding: '4px 8px' }}
                          autoFocus
                          onKeyDown={e => { if (e.key === 'Enter') handleUpdateNominee(nom.id); if (e.key === 'Escape') setEditingNominee(null); }}
                        />
                        <input
                          value={editingNominee.subtitle}
                          onChange={e => setEditingNominee(n => ({ ...n, subtitle: e.target.value }))}
                          placeholder="Subtitle (optional)"
                          style={{ flex: 2, fontSize: 13, padding: '4px 8px' }}
                        />
                        <button className="btn btn-primary btn-sm" onClick={() => handleUpdateNominee(nom.id)}>Save</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditingNominee(null)}>✕</button>
                      </>
                    ) : (
                      <>
                        <span style={{ flex: 1, fontSize: 13, color: 'var(--text-dim)' }}>
                          {nom.name}
                          {nom.subtitle && <span style={{ color: 'var(--text-muted)' }}> — {nom.subtitle}</span>}
                        </span>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: 11 }}
                          onClick={() => setEditingNominee({ id: nom.id, name: nom.name, subtitle: nom.subtitle || '' })}
                        >Edit</button>
                        <button
                          className="btn btn-danger btn-sm"
                          style={{ fontSize: 11 }}
                          onClick={() => handleDeleteNominee(nom.id)}
                        >✕</button>
                      </>
                    )}
                  </div>
                ))}

                {/* Add nominee inline */}
                {addingNomineeFor === cat.id ? (
                  <form onSubmit={handleAddNominee} style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                    <input
                      value={newNominee.name}
                      onChange={e => setNewNominee(n => ({ ...n, name: e.target.value }))}
                      placeholder="Nominee name"
                      style={{ flex: 2, fontSize: 13, padding: '4px 8px' }}
                      autoFocus required
                    />
                    <input
                      value={newNominee.subtitle}
                      onChange={e => setNewNominee(n => ({ ...n, subtitle: e.target.value }))}
                      placeholder="Subtitle"
                      style={{ flex: 2, fontSize: 13, padding: '4px 8px' }}
                    />
                    <button type="submit" className="btn btn-primary btn-sm">Add</button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAddingNomineeFor(null)}>✕</button>
                  </form>
                ) : (
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ alignSelf: 'flex-start', marginTop: 4, fontSize: 12 }}
                    onClick={() => { setAddingNomineeFor(cat.id); setNewNominee({ name: '', subtitle: '' }); }}
                  >
                    + Add Nominee
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Tab: Participants ── */}
      {tab === 'participants' && (
        <div className="card">
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
            Manage who participates in this event. Users can also join/leave from the events page while the event is open.
          </p>

          {/* Current participants */}
          <label className="label">Current Participants</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20, minHeight: 36 }}>
            {participants.length === 0 && (
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>No participants yet</span>
            )}
            {participants.map(p => (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'rgba(34,201,122,0.08)', border: '1px solid rgba(34,201,122,0.3)',
                borderRadius: 20, padding: '5px 12px', fontSize: 13,
              }}>
                <span style={{ color: 'var(--text)' }}>{p.display_name}</span>
                <button
                  onClick={() => handleRemoveParticipant(p.id)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: '0 2px' }}
                  title="Remove"
                >✕</button>
              </div>
            ))}
          </div>

          {/* Add participants */}
          {nonParticipants.length > 0 && (
            <>
              <label className="label">Add Participants</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {nonParticipants.map(u => (
                  <button
                    key={u.id}
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleAddParticipant(u.id)}
                  >
                    + {u.display_name}
                  </button>
                ))}
              </div>
            </>
          )}

          {nonParticipants.length === 0 && participants.length > 0 && (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>All users are participating in this event.</p>
          )}
        </div>
      )}

      {/* Import Modal */}
      {showImport && (
        <ImportModal eventId={id} onClose={() => setShowImport(false)} onSuccess={load} />
      )}

      {/* JSON Editor Modal */}
      {showJsonEditor && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={e => e.target === e.currentTarget && setShowJsonEditor(false)}
        >
          <div className="card fade-in" style={{ width: '100%', maxWidth: 720, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: '1.5rem' }}>JSON EDITOR</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowJsonEditor(false)}>✕</button>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
              Edit JSON directly. "Replace All" overwrites existing categories, "Add" appends.
            </p>
            <textarea
              value={jsonText}
              onChange={e => { setJsonText(e.target.value); setJsonError(''); }}
              rows={20}
              style={{ fontFamily: 'var(--font-mono)', fontSize: 12, resize: 'vertical', marginBottom: 8 }}
            />
            {jsonError && (
              <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 8 }}>⚠ {jsonError}</div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setShowJsonEditor(false)}>Cancel</button>
              <button
                className="btn btn-ghost"
                style={{ color: 'var(--rust)', borderColor: 'rgba(232,97,42,0.3)' }}
                onClick={() => handleJsonEditorSave(true)}
              >Replace All & Save</button>
              <button className="btn btn-primary" onClick={() => handleJsonEditorSave(false)}>Add & Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
