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

  // ── State ────────────────────────────────────────────────────
  const [event, setEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('answers');

  // Import modal
  const [showImport, setShowImport] = useState(false);

  // JSON editor modal
  const [showJsonEditor, setShowJsonEditor] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState('');

  // Category inline editing — { id, name } | null
  const [editingCategory, setEditingCategory] = useState(null);
  const [newCatName, setNewCatName] = useState('');

  // Nominee inline editing — { id, name, subtitle } | null
  const [editingNominee, setEditingNominee] = useState(null);

  // Which category has the add-nominee form open (by category id)
  const [addingNomineeFor, setAddingNomineeFor] = useState(null);
  const [newNominee, setNewNominee] = useState({ name: '', subtitle: '' });

  // ── Per-event MoC check ──────────────────────────────────────
  // MoC is stored in event_participants.participant_role, NOT on the user account.
  // After the event loads, we check if this user's participant_role is 'moc'.
  // Admin always overrides — admins are never restricted to MoC mode.
  // Troubleshooting: if isMoC is unexpectedly true, check event_participants table
  // for this user/event combo — participant_role should be 'participant' not 'moc'.
  const isMoC = !!(
    event &&
    event.participant_role === 'moc' &&
    user?.role !== 'admin'
  );

  // ── Data loading ─────────────────────────────────────────────
  // MoC users don't need the full user list or participant management,
  // so we skip those fetches to avoid unnecessary DB queries.
  const load = useCallback(async () => {
    try {
      const fetches = [api.getEvent(id)];
      if (user?.role === 'admin') {
        fetches.push(api.getParticipants(id));
        fetches.push(api.getUsers());
      }
      const [ev, parts, users] = await Promise.all(fetches);
      setEvent(ev);
      if (parts) setParticipants(parts);
      if (users) setAllUsers(users);
    } catch (e) {
      // Likely a 403 (no access) or 404 (event not found)
      toast.error(e.message);
      navigate('/admin');
    } finally {
      setLoading(false);
    }
  }, [id, user?.role]);

  useEffect(() => { load(); }, [load]);

  // ── Lock / Unlock ────────────────────────────────────────────
  // Admin: full toggle
  // MoC: can only lock — the unlock button is hidden in the UI,
  //      and the server also enforces this restriction independently
  const handleToggleLock = async () => {
    if (isMoC && event.is_locked) {
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
  // Available to both admin and MoC.
  // Clicking an already-selected nominee passes null to clear the answer.
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
    // Warn: cascades to nominees and any picks made for this category
    if (!confirm('Delete this category and all its nominees? This will also remove any picks for this category.')) return;
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
  // Clicking "JSON Editor" exports current categories+nominees into
  // an editable textarea. User can bulk-edit and save back.
  // "Replace All" wipes existing categories first; "Add" appends.

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
      if (!Array.isArray(parsed)) throw new Error('Must be a JSON array of categories');
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
      // Shown inline in the modal so user can fix their JSON
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

  // Toggle a participant's event role between 'participant' and 'moc'
  // MoC users can: enter correct answers, lock events
  // MoC users cannot: edit categories, manage participants, unlock events
  const handleToggleMoC = async (participant) => {
    const newRole = participant.participant_role === 'moc' ? 'participant' : 'moc';
    try {
      await api.setParticipantRole(id, participant.id, newRole);
      load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  // ── Loading / not found ──────────────────────────────────────
  if (loading) return (
    <div style={{
      display: 'flex', alignItems: 'center',
      justifyContent: 'center', height: '50vh',
    }}>
      <div style={{ color: 'var(--text-muted)' }}>Loading event...</div>
    </div>
  );

  if (!event) return null;

  // ── Derived values ───────────────────────────────────────────
  const answeredCount = event.categories?.filter(c => c.correct_nominee_id).length || 0;
  const participantIds = new Set(participants.map(p => p.id));
  const nonParticipants = allUsers.filter(u => !participantIds.has(u.id));

  // Tab list — MoC only sees the answers tab
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

        {/* Action buttons — Import and JSON editor only for admin */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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

          {/* Lock button behaviour:
              Admin  → toggles lock and unlock freely
              MoC    → can only lock; button hidden once event is locked */}
          {!isMoC ? (
            <button
              className="btn btn-sm"
              style={{
                background: event.is_locked
                  ? 'rgba(34,201,122,0.1)'
                  : 'rgba(232,97,42,0.1)',
                color: event.is_locked ? 'var(--green)' : 'var(--rust)',
                border: `1px solid ${event.is_locked
                  ? 'rgba(34,201,122,0.3)'
                  : 'rgba(232,97,42,0.3)'}`,
              }}
              onClick={handleToggleLock}
            >
              {event.is_locked ? '🔓 Unlock Picks' : '🔒 Lock Picks'}
            </button>
          ) : (
            // MoC: show lock button only while unlocked; show badge once locked
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
        {/* Participant count shown to admin only */}
        {!isMoC && (
          <span className="badge badge-muted">
            {participants.length} participants
          </span>
        )}
        {event.is_locked && (
          <span className="badge badge-muted">🔒 Locked</span>
        )}
        {/* Remind MoC of their limited role on this event */}
        {isMoC && (
          <span className="badge badge-blue">🎙 You are MoC for this event</span>
        )}
      </div>

      {/* ── Tab Navigation ── */}
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
          Accessible by both admin and MoC.
          Click a nominee to set as winner; click the selected one again to clear.
          Troubleshooting: if answers aren't saving, check that the user
          is either admin or has participant_role = 'moc' in event_participants.
      ════════════════════════════════════════════════════════ */}
      {tab === 'answers' && (
        <div className="card">
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
            Click the winning nominee to mark it correct. Click again to clear.
          </p>

          {!event.categories?.length && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>
              {isMoC
                ? 'No categories have been set up for this event yet.'
                : 'No categories yet — use Import or the Edit Categories tab.'}
            </div>
          )}

          {event.categories?.map(cat => (
            <div key={cat.id} style={{ marginBottom: 16 }}>
              {/* Category label with answered indicator */}
              <div style={{
                display: 'flex', alignItems: 'center',
                gap: 8, marginBottom: 8,
              }}>
                <span style={{
                  fontSize: 13, fontWeight: 600,
                  color: 'var(--text-dim)',
                }}>
                  {cat.name}
                </span>
                {cat.correct_nominee_id && (
                  <span className="badge badge-green" style={{ fontSize: 11 }}>
                    ✓ Answered
                  </span>
                )}
              </div>

              {/* Nominee buttons */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {cat.nominees.map(nom => {
                  const isSelected = cat.correct_nominee_id === nom.id;
                  return (
                    <button
                      key={nom.id}
                      onClick={() => handleSetAnswer(cat.id, isSelected ? null : nom.id)}
                      className="btn btn-sm"
                      style={{
                        background: isSelected
                          ? 'rgba(34,201,122,0.15)'
                          : 'var(--surface2)',
                        border: `1px solid ${isSelected
                          ? 'rgba(34,201,122,0.5)'
                          : 'var(--border)'}`,
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
          Admin only — hidden from MoC.
          Supports inline rename of categories and nominees,
          adding new nominees, and deleting either.
          Enter key saves, Escape cancels in edit fields.
      ════════════════════════════════════════════════════════ */}
      {tab === 'edit' && !isMoC && (
        <div className="card">

          {/* Add new category */}
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
            <div style={{
              textAlign: 'center', color: 'var(--text-muted)', padding: 32,
            }}>
              No categories yet. Add one above or use Import.
            </div>
          )}

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
              <div style={{
                display: 'flex', alignItems: 'center',
                gap: 8, marginBottom: 10,
              }}>
                {editingCategory?.id === cat.id ? (
                  // Edit mode
                  <>
                    <input
                      value={editingCategory.name}
                      onChange={e => setEditingCategory(c => ({ ...c, name: e.target.value }))}
                      style={{ flex: 1, fontSize: 14, padding: '5px 10px' }}
                      autoFocus
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
                  // Display mode
                  <>
                    <span style={{
                      flex: 1, fontWeight: 600,
                      fontSize: 14, color: 'var(--text)',
                    }}>
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
              <div style={{
                display: 'flex', flexDirection: 'column',
                gap: 5, paddingLeft: 8,
              }}>
                {cat.nominees.map(nom => (
                  <div
                    key={nom.id}
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    {editingNominee?.id === nom.id ? (
                      // Edit mode for nominee
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
                        <span style={{
                          flex: 1, fontSize: 13,
                          color: 'var(--text-dim)',
                        }}>
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

                {/* ── Add nominee form ── */}
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
          Admin only — hidden from MoC.
          Current participants are shown as chips with:
            - A role toggle button (+ MoC / 🎙 MoC) to grant/revoke MoC
            - A ✕ button to remove them from the event entirely
          Non-participants are listed below as "+ Add" buttons.
          Troubleshooting: if MoC badge isn't appearing in the navbar,
          check event_participants.participant_role for the user/event row.
      ════════════════════════════════════════════════════════ */}
      {tab === 'participants' && !isMoC && (
        <div className="card">
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
            Manage who participates in this event. Toggle 🎙 MoC to grant a
            participant the ability to enter correct answers and lock this event.
          </p>

          {/* Current participants */}
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

            {participants.map(p => {
              const isMoCParticipant = p.participant_role === 'moc';
              return (
                <div
                  key={p.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    // Blue tint for MoC, green tint for regular participant
                    background: isMoCParticipant
                      ? 'rgba(74,158,255,0.08)'
                      : 'rgba(34,201,122,0.08)',
                    border: `1px solid ${isMoCParticipant
                      ? 'rgba(74,158,255,0.3)'
                      : 'rgba(34,201,122,0.3)'}`,
                    borderRadius: 20, padding: '5px 12px',
                    fontSize: 13, flexWrap: 'wrap',
                  }}
                >
                  <span style={{ color: 'var(--text)' }}>{p.display_name}</span>

                  {/* MoC toggle — flips participant_role between 'participant' and 'moc' */}
                  <button
                    onClick={() => handleToggleMoC(p)}
                    style={{
                      background: 'none',
                      border: `1px solid ${isMoCParticipant
                        ? 'rgba(74,158,255,0.4)'
                        : 'var(--border)'}`,
                      color: isMoCParticipant ? 'var(--blue)' : 'var(--text-muted)',
                      cursor: 'pointer', fontSize: 11, fontWeight: 600,
                      padding: '2px 7px', borderRadius: 4,
                      transition: 'all 0.15s',
                    }}
                    title={isMoCParticipant
                      ? `Remove MoC role from ${p.display_name}`
                      : `Make ${p.display_name} MoC for this event`}
                  >
                    {isMoCParticipant ? '🎙 MoC' : '+ MoC'}
                  </button>

                  {/* Remove participant entirely */}
                  <button
                    onClick={() => handleRemoveParticipant(p.id)}
                    style={{
                      background: 'none', border: 'none',
                      color: 'var(--text-muted)', cursor: 'pointer',
                      fontSize: 14, lineHeight: 1, padding: '0 2px',
                    }}
                    title={`Remove ${p.display_name} from event`}
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>

          {/* Add non-participants */}
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

      {/* ── Import Modal (admin only) ── */}
      {showImport && !isMoC && (
        <ImportModal
          eventId={id}
          onClose={() => setShowImport(false)}
          onSuccess={load}
        />
      )}

      {/* ── JSON Editor Modal (admin only) ── */}
      {showJsonEditor && !isMoC && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center',
            justifyContent: 'center', padding: 20,
          }}
          onClick={e => e.target === e.currentTarget && setShowJsonEditor(false)}
        >
          <div
            className="card fade-in"
            style={{
              width: '100%', maxWidth: 720,
              maxHeight: '90vh', overflowY: 'auto',
            }}
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
              Edit the JSON below. <strong>Replace All</strong> overwrites existing
              categories. <strong>Add</strong> appends without removing existing ones.
            </p>

            <textarea
              value={jsonText}
              onChange={e => { setJsonText(e.target.value); setJsonError(''); }}
              rows={20}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12, resize: 'vertical', marginBottom: 8,
              }}
            />

            {/* Inline JSON parse / validation error */}
            {jsonError && (
              <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 8 }}>
                ⚠ {jsonError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                className="btn btn-ghost"
                onClick={() => setShowJsonEditor(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-ghost"
                style={{ color: 'var(--rust)', borderColor: 'rgba(232,97,42,0.3)' }}
                onClick={() => handleJsonEditorSave(true)}
              >
                Replace All & Save
              </button>
              <button
                className="btn btn-primary"
                onClick={() => handleJsonEditorSave(false)}
              >
                Add & Save
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
