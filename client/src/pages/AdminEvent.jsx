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
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const ev = await api.getEvent(id);
      setEvent(ev);
    } catch (e) {
      toast.error(e.message);
      navigate('/admin');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleSetAnswer = async (categoryId, nomineeId) => {
    try {
      await api.setAnswer(categoryId, nomineeId || null);
      load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleToggleLock = async () => {
    try {
      await api.updateEvent(id, { is_locked: event.is_locked ? 0 : 1 });
      toast.success(event.is_locked ? 'Unlocked' : 'Locked');
      load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
      <div style={{ color: 'var(--text-muted)' }}>Loading...</div>
    </div>
  );
  if (!event) return null;

  const answeredCount = event.categories?.filter(c => c.correct_nominee_id).length || 0;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <button
            onClick={() => navigate('/admin')}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginBottom: 6, fontSize: 13 }}
          >
            ← Back to Admin
          </button>
          <h1 className="page-title">{event.name}</h1>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowImport(true)}>
            📥 Import Categories
          </button>
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
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <div className="badge badge-blue">{event.categories?.length || 0} categories</div>
        <div className="badge badge-green">{answeredCount} answered</div>
        {event.is_locked && <div className="badge badge-muted">🔒 Locked</div>}
      </div>

      {!event.categories?.length && (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
          No categories yet. Use the Import button to add them.
        </div>
      )}

      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
        Select the winning nominee for each category as results come in:
      </p>

      {event.categories?.map(cat => (
        <div key={cat.id} className="card" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--text)' }}>{cat.name}</h3>
            {cat.correct_nominee_id && (
              <span className="badge badge-green">✓ Answered</span>
            )}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
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
                  {nom.subtitle && <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>— {nom.subtitle}</span>}
                </button>
              );
            })}
            {cat.correct_nominee_id && (
              <button
                className="btn btn-sm btn-danger"
                onClick={() => handleSetAnswer(cat.id, null)}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      ))}

      {showImport && (
        <ImportModal
          eventId={id}
          onClose={() => setShowImport(false)}
          onSuccess={load}
        />
      )}
    </div>
  );
}