import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import ImportModal from '../components/ImportModal';

export default function AdminEvent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // ── MoC restriction flag ─────────────────────────────────────
  // Master of Ceremony can: enter correct answers, lock events
  // Cannot: edit categories/nominees, manage participants, import,
  //         unlock events, or access the JSON editor
  const isMoC = user?.role === 'moc';

  // ── State ────────────────────────────────────────────────────
  const [event, setEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Tab state — MoC always starts on (and is locked to) 'answers'
  const [tab, setTab] = useState('answers');

  // Import modal visibility
  const [showImport, setShowImport] = useState(false);

  // JSON editor modal state
  const [showJsonEditor, setShowJsonEditor] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState('');

  // Category inline editing
  // editingCategory: { id, name } | null
  const [editingCategory, setEditingCategory] = useState(null);
  const [newCatName, setNewCatName] = useState('');

  // Nominee inline editing
  // editingNominee: { id, name, subtitle } | null
  const [editingNominee, setEditingNominee] = useState(null);

  // Which category has the "add nominee" form open (by category id)
  const [addingNomineeFor, setAddingNomineeFor] = useState(null);
  const [newNominee, setNewNominee] = useState({ name: '', subtitle: '' });

  // ── Data loading ─────────────────────────────────────────────
  const load = useCallback(async () => {
    try {
      // MoC doesn't need participants/users — skip those fetches
      const fetches = [api.getEvent(id)];
      if (!isMoC) {
        fetches.push(api.getParticipants(id));
        fetches.push(api.getUsers());
      }
      const [ev, parts, users] = await Promise.all(fetches);
      setEvent(ev);
      if (parts) setParticipants(parts);
      if (users) setAllUsers(users);
    } catch (e) {
      // If event not found or permission error, go back to admin
      toast.error(e.message);
      navigate('/admin');
    } finally {
      setLoading(false);
    }
  }, [id, isMoC]);

  useEffect(() => { load(); }, [load]);

  // ── Lock / Unlock ────────────────────────────────────────────
  // MoC can lock but NOT unlock — enforced both here and on server
  const handleToggleLock = async () => {
    if (isMoC && event.is_locked) {
      // Should not be reachable via UI but guard anyway
      toast.error('MoC cannot unlock events');
      return;
    }
    try {
      await api.updateEvent(id, { is_locked: event.is_locked ? 0 : 1 });
      toast.success(event.is_locked ? 'Event unlocked' : 'Event locked');
      load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  // ── Correct Answers ──────────────────────────────────────────
  // Clicking a nominee sets it as the winner; clicking again clears it
  const handleSetAnswer = async (categoryId, nomineeId) => {
    try {
      await api.setAnswer(categoryId, nomineeId || null);
      load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  // ── Category CRUD (admin only) ───────────────────────────────

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      await api.addCategory(id, newCatName.trim());
      setNewCatName('');
      load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleUpdateCategory = async (catId) => {
    if (!editingCategory?.name?.trim()) return;
    try {
      await api.updateCategory(catId, { name: editingCategory.name });
      setEditingCategory(null);
      load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleDeleteCategory = async (catId) => {
    // Warn: deleting a category also removes all its nominees and user picks
    if (!confirm('Delete this category and all its nominees? This will also remove any picks made for this category.')) return;
    try {
      await api.deleteCategory(catId);
      load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  // ── Nominee CRUD (admin only) ────────────────────────────────

  const handleAddNominee = async (e) => {
    e.preventDefault();
    if (!newNominee.name.trim()) return;
    try {
      await api.addNominee(addingNomineeFor, newNominee);
      setNewNominee({ name: '', subtitle: '' });
      setAddingNomineeFor(null);
      load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleUpdateNominee = async (nomId) => {
    if (!editingNominee?.name?.trim()) return;
    try {
      await api.updateNominee(nomId, {
        name: editingNominee.name,
        subtitle: editingNominee.subtitle,
      });
      setEditingNominee(null);
      load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleDeleteNominee = async (nomId) => {
    try {
      await api.deleteNominee(nomId);
      load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  // ── JSON Export / Editor (admin only) ───────────────────────
  // Exports current categories+nominees as JSON into an editable textarea
  // User can edit and save back — useful for bulk corrections

  const handleExportJson = () => {
    if (!event?.categories) return;
    const data = event.categories.map(cat => ({
      name: cat.name,
      nominees: cat.nominees.map(n => ({
        name: n.name,
        subtitle: n.subtitle || '',
      })),
    }));
    setJsonText(JSON.stringify(data, null, 2));
    setJsonError('');
    setShowJsonEditor(true);
  };

  const handleJsonEditorSave = async (replace) => {
    try {
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed)) throw new Error('Must be a JSON array');
      if (replace) {
        await api.reimportCategories(id, parsed);
        toast.success('Categories replaced successfully');
      } else {
        await api.importCategories(id, parsed);
        toast.success('Categories imported successfully');
      }
      setShowJsonEditor(false);
      load();
    } catch (e) {
      // Show parse/validation errors inline in the modal
      setJsonError(e.message);
    }
  };

  // ── Participant management (admin only) ──────────────────────

  const handleAddParticipant = async (userId) => {
    try {
      await api.addParticipant(id, userId);
      load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleRemoveParticipant = async (userId) => {
    try {
      await api.removeParticipant(id, userId);
      load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  // ── Loading / not found states ───────────────────────────────
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
      <div style={{ color: 'var(--text-muted)' }}>Loading event...</div>
    </div>
  );

  if (!event) return null;

  // ── Derived values ───────────────────────────────────────────
  const answeredCount = event.categories?.filter(c => c.correct_nominee_id).length || 0;
  const participantIds = new Set(participants.map(p => p.id));
  const nonParticipants = allUsers.filter(u => !participantIds.has(u.id));

  // Tabs — MoC only sees 'answers'; admin sees all three
  const tabs = [
    { key: 'answers', label: 'CORRECT ANSWERS' },
    ...(!isMoC ? [
      { key: 'edit', label: 'EDIT CATEGORIES' },
      { key: 'participants', label: 'PARTICIPANTS' },
    ] : []),
  ];

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="page">

      {/* ── Page Header ── */}
      <div className="page-header">
        <div>
          {/* Back button navigates to admin dashboard */}
          <button
            onClick={() => navigate('/admin')}
            style={{
              background: 'none', border: 'none',
              color: 'var(--text-muted)', cursor: 'pointer',
              marginBottom: 6, fontSize: 13,
            }}
          >
            ← Back to Admin
          </button>
          <h1 className="page-title">{event.name}</h1>
        </div>

        {/* ── Action buttons ── */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>

          {/* Import and JSON editor — admin only */}
          {!isMoC && (
            <>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowImport(true)}
              >
                📥 Import
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={handleExportJson}
              >
                📤 JSON Editor
              </button>
            </>
          )}

          {/* Lock button:
              - Admin: toggles lock/unlock
              - MoC: can only lock (button hidden when already locked) */}
          {!isMoC ? (
            <button
              className="btn btn-sm"
              style={{
                background: event.is_locked ? 'rgba(34,201,122,0.1)' : 'rgba(232,97,42,0.1)',
                color: event.is_locked ? 'var(--green)' : 'var(--rust)',
                border: `1px solid ${event.is_locked ? 'rgba(34,201,122,0.3)' : 'rgba(232,97,42,0.3)'}`,
              }}
              onClick={handleToggleLock}
            >
              {event.is_locked ? '🔓 Unlock Picks' : '🔒 Lock Picks'}
            </button>
          ) : (
            // MoC view: show lock button only if not yet locked
            event.is_locked ? (
              <span className="badge badge-muted">🔒 Locked</span>
            ) : (
              <button
                className="btn btn-sm"
                style={{
                  background: 'rgba(232,97,42,0.1)',
                  color: 'var(--rust)',
                  border: '1px solid rgba(232,97,42,0.3)',
                }}
                onClick={handleToggleLock}
              >
                🔒 Lock Picks
              </button>
            )
          )}
        </div>
      </div>

      {/* ── Stats badges ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <span className="badge badge-blue">
          {event.categories?.length || 0} categories
        </span>
        <span className="badge badge-green">
          {answeredCount} answered
        </span>
        {/* Participant count — admin only */}
        {!isMoC && (
          <span className="badge badge-muted">
            {participants.length} participants
          </span>
        )}
        {event.is_locked && (
          <span className="badge badge-muted">🔒 Locked</span>
        )}
      </div>

      {/* ── Tab navigation ── */}
      <div style={{
        display: 'flex', gap: 4,
        borderBottom: '1px solid var(--border)',
        marginBottom: 20,
      }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              background: 'none', border: 'none',
              padding: '10px 16px',
              color: tab === t.key ? 'var(--blue)' : 'var(--text-muted)',
              fontFamily: 'var(--font-display)',
              fontSize: '0.95rem', letterSpacing: '0.05em',
              borderBottom: `2px solid ${tab === t.key ? 'var(--blue)' : 'transparent'}`,
              cursor: 'pointer', transition: 'all 0.2s',
              marginBottom: -1, whiteSpace: 'nowrap',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════
          TAB: CORRECT ANSWERS
          Available to both admin and MoC
          Click a nominee to mark as winner; click again to clear
      ════════════════════════════════════════════════════════ */}
      {tab === 'answers' && (
        <div className="card">
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
            Click the winning nominee to mark it correct. Click again to clear.
          </p>

          {!event.categories?.length && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>
              {isMoC
                ? 'No categories set up for this event yet.'
                : 'No categories yet — use Import or the Edit Categories tab.'}
            </div>
          )}

          {event.categories?.map(cat => (
            <div key={cat.id} style={{ marginBottom: 16 }}>
              {/* Category name + answered indicator */}
              <div style={{
                display: 'flex', alignItems: 'center',
                gap: 8, marginBottom: 8,
              }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dim)' }}>
                  {cat.name}
                </span>
                {cat.correct_nominee_id && (
                  <span className="badge badge-green" style={{ fontSize: 11 }}>
                    ✓ Answered
                  </span>
                )}
              </div>

              {/* Nominee buttons — selected one glows green */}
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
                      {isSelected && '★ '}
                      {nom.name}
                      {nom.subtitle && (
                        <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>
                          — {nom.subtitle}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          TAB: EDIT CATEGORIES
          Admin only — hidden from MoC
          Inline editing for category names and nominees
      ════════════════════════════════════════════════════════ */}
      {tab === 'edit' && !isMoC && (
        <div className="card">

          {/* Add new category form */}
          <form
            onSubmit={handleAddCategory}
            style={{ display: 'flex', gap: 8, marginBottom: 20 }}
          >
            <input
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              placeholder="New category name..."
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn btn-primary btn-sm">
              + Add Category
            </button>
          </form>

          {!event.categories?.length && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>
              No categories yet. Add one above or use Import.
            </div>
          )}

          {/* Category list */}
          {event.categories?.map(cat => (
            <div
              key={cat.id}
              style={{
                background: 'var(--surface2)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '12px 14px',
                marginBottom: 10,
              }}
            >
              {/* ── Category header row ── */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                {editingCategory?.id === cat.id ? (
                  // Inline edit mode for category name
                  <>
                    <input
                      value={editingCategory.name}
                      onChange={e => setEditingCategory(c => ({ ...c, name: e.target.value }))}
                      style={{ flex: 1, fontSize: 14, padding: '5px 10px' }}
                      autoFocus
                      // Save on Enter, cancel on Escape
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleUpdateCategory(cat.id);
                        if (e.key === 'Escape') setEditingCategory(null);
                      }}
                    />
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleUpdateCategory(cat.id)}
                    >
                      Save
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setEditingCategory(null)}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  // Display mode for category name
                  <>
                    <span style={{ flex: 1, fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>
                      {cat.name}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {cat.nominees.length} nominees
                    </span>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setEditingCategory({ id: cat.id, name: cat.name })}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDeleteCategory(cat.id)}
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>

              {/* ── Nominees list ── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, paddingLeft: 8 }}>
                {cat.nominees.map(nom => (
                  <div key={nom.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {editingNominee?.id === nom.id ? (
                      // Inline edit mode for nominee
                      <>
                        <input
                          value={editingNominee.name}
                          onChange={e => setEditingNominee(n => ({ ...n, name: e.target.value }))}
                          placeholder="Name"
                          style={{ flex: 2, fontSize: 13, padding: '4px 8px' }}
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleUpdateNominee(nom.id);
                            if (e.key === 'Escape') setEditingNominee(null);
                          }}
                        />
                        <input
                          value={editingNominee.subtitle}
                          onChange={e => setEditingNominee(n => ({ ...n, subtitle: e.target.value }))}
                          placeholder="Subtitle (optional)"
                          style={{ flex: 2, fontSize: 13, padding: '4px 8px' }}
                        />
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleUpdateNominee(nom.id)}
                        >
                          Save
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setEditingNominee(null)}
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      // Display mode for nominee
                      <>
                        <span style={{ flex: 1, fontSize: 13, color: 'var(--text-dim)' }}>
                          {nom.name}
                          {nom.subtitle && (
                            <span style={{ color: 'var(--text-muted)' }}>
                              {' '}— {nom.subtitle}
                            </span>
                          )}
                        </span>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: 11 }}
                          onClick={() => setEditingNominee({
                            id: nom.id,
                            name: nom.name,
                            subtitle: nom.subtitle || '',
                          })}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          style={{ fontSize: 11 }}
                          onClick={() => handleDeleteNominee(nom.id)}
                        >
                          ✕
                        </button>
                      </>
                    )}
                  </div>
                ))}

                {/* ── Add nominee inline form ── */}
                {addingNomineeFor === cat.id ? (
                  <form
                    onSubmit={handleAddNominee}
                    style={{ display: 'flex', gap: 6, marginTop: 6 }}
                  >
                    <input
                      value={newNominee.name}
                      onChange={e => setNewNominee(n => ({ ...n, name: e.target.value }))}
                      placeholder="Nominee name"
                      style={{ flex: 2, fontSize: 13, padding: '4px 8px' }}
                      autoFocus
                      required
                    />
                    <input
                      value={newNominee.subtitle}
                      onChange={e => setNewNominee(n => ({ ...n, subtitle: e.target.value }))}
                      placeholder="Subtitle (optional)"
                      style={{ flex: 2, fontSize: 13, padding: '4px 8px' }}
                    />
                    <button type="submit" className="btn btn-primary btn-sm">
                      Add
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setAddingNomineeFor(null)}
                    >
                      ✕
                    </button>
                  </form>
                ) : (
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ alignSelf: 'flex-start', marginTop: 6, fontSize: 12 }}
                    onClick={() => {
                      setAddingNomineeFor(cat.id);
                      setNewNominee({ name: '', subtitle: '' });
                    }}
                  >
                    + Add Nominee
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          TAB: PARTICIPANTS
          Admin only — hidden from MoC
          Manage who is included in this specific event
      ════════════════════════════════════════════════════════ */}
      {tab === 'participants' && !isMoC && (
        <div className="card">
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
            Manage who participates in this event. Users can also join/leave
            from the events page while the event is open.
          </p>

          {/* Current participants — shown as removable chips */}
          <label className="label">Current Participants</label>
          <div style={{
            display: 'flex', flexWrap: 'wrap',
            gap: 8, marginBottom: 24, minHeight: 36,
          }}>
            {participants.length === 0 && (
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                No participants yet
              </span>
            )}
            {participants.map(p => (
              <div
                key={p.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'rgba(34,201,122,0.08)',
                  border: '1px solid rgba(34,201,122,0.3)',
                  borderRadius: 20, padding: '5px 12px', fontSize: 13,
                }}
              >
                <span style={{ color: 'var(--text)' }}>{p.display_name}</span>
                <button
                  onClick={() => handleRemoveParticipant(p.id)}
                  style={{
                    background: 'none', border: 'none',
                    color: 'var(--text-muted)', cursor: 'pointer',
                    fontSize: 14, lineHeight: 1, padding: '0 2px',
                  }}
                  title={`Remove ${p.display_name}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {/* Add participants — users not yet in this event */}
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
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              All users are participating in this event.
            </p>
          )}
        </div>
      )}

      {/* ── Import Modal ── */}
      {showImport && !isMoC && (
        <ImportModal
          eventId={id}
          onClose={() => setShowImport(false)}
          onSuccess={load}
        />
      )}

      {/* ── JSON Editor Modal ── */}
      {showJsonEditor && !isMoC && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}
          // Click backdrop to close
          onClick={e => e.target === e.currentTarget && setShowJsonEditor(false)}
        >
          <div
            className="card fade-in"
            style={{ width: '100%', maxWidth: 720, maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: 16,
            }}>
              <h2 style={{ fontSize: '1.5rem' }}>JSON EDITOR</h2>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowJsonEditor(false)}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
              Edit the JSON below. <strong>Replace All</strong> overwrites existing categories. <strong>Add</strong> appends without removing existing ones.
            </p>
