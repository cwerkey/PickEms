import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../api';

export default function ImportModal({ eventId, onClose, onSuccess }) {
  const [mode, setMode] = useState('json');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const JSON_EXAMPLE = JSON.stringify([
    {
      name: "Best Picture",
      nominees: [
        { name: "Oppenheimer", subtitle: "Christopher Nolan" },
        { name: "Poor Things", subtitle: "Yorgos Lanthimos" },
        { name: "Barbie", subtitle: "Greta Gerwig" }
      ]
    },
    {
      name: "Best Actor",
      nominees: [
        { name: "Cillian Murphy", subtitle: "Oppenheimer" },
        { name: "Bradley Cooper", subtitle: "Maestro" }
      ]
    }
  ], null, 2);

  const CSV_EXAMPLE = `Category,Nominee,Subtitle
Best Picture,Oppenheimer,Christopher Nolan
Best Picture,Poor Things,Yorgos Lanthimos
Best Picture,Barbie,Greta Gerwig
Best Actor,Cillian Murphy,Oppenheimer
Best Actor,Bradley Cooper,Maestro`;

  const parseCSV = (csv) => {
    const lines = csv.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const catIdx = headers.indexOf('category');
    const nomIdx = headers.indexOf('nominee');
    const subIdx = headers.indexOf('subtitle');

    if (catIdx === -1 || nomIdx === -1) throw new Error('CSV must have Category and Nominee columns');

    const catMap = {};
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim());
      const cat = cols[catIdx];
      const nom = cols[nomIdx];
      if (!cat || !nom) continue;
      if (!catMap[cat]) catMap[cat] = [];
      catMap[cat].push({ name: nom, subtitle: subIdx >= 0 ? cols[subIdx] : '' });
    }
    return Object.entries(catMap).map(([name, nominees]) => ({ name, nominees }));
  };

  const handleImport = async (replace = false) => {
    setLoading(true);
    try {
      let categories;
      if (mode === 'json') {
        categories = JSON.parse(text);
        if (!Array.isArray(categories)) throw new Error('JSON must be an array of categories');
      } else {
        categories = parseCSV(text);
      }

      if (replace) {
        await api.reimportCategories(eventId, categories);
        toast.success('Categories replaced successfully');
      } else {
        await api.importCategories(eventId, categories);
        toast.success(`Imported ${categories.length} categories`);
      }
      onSuccess();
      onClose();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card fade-in" style={{ width: '100%', maxWidth: 700, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: '1.8rem' }}>IMPORT CATEGORIES</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {['json', 'csv'].map(m => (
            <button
              key={m}
              className={`btn ${mode === m ? 'btn-primary' : 'btn-ghost'} btn-sm`}
              onClick={() => setMode(m)}
            >{m.toUpperCase()}</button>
          ))}
        </div>

        <div className="form-group">
          <label className="label">Paste your {mode.toUpperCase()} data</label>
          <textarea
            rows={14}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={mode === 'json' ? JSON_EXAMPLE : CSV_EXAMPLE}
            style={{ fontFamily: 'var(--font-mono)', fontSize: 12, resize: 'vertical' }}
          />
        </div>

        <details style={{ marginBottom: 16 }}>
          <summary style={{ cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, marginBottom: 8 }}>
            View format example
          </summary>
          <pre style={{
            background: 'var(--surface2)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', padding: 12,
            fontFamily: 'var(--font-mono)', fontSize: 11,
            color: 'var(--text-dim)', overflow: 'auto',
          }}>
            {mode === 'json' ? JSON_EXAMPLE : CSV_EXAMPLE}
          </pre>
        </details>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-ghost btn-danger-ish" onClick={() => handleImport(true)} disabled={loading}
            style={{ color: 'var(--rust)', borderColor: 'rgba(232,97,42,0.3)' }}
          >
            {loading ? 'Working...' : 'Replace All & Import'}
          </button>
          <button className="btn btn-primary" onClick={() => handleImport(false)} disabled={loading}>
            {loading ? 'Working...' : 'Add & Import'}
          </button>
        </div>
      </div>
    </div>
  );
}