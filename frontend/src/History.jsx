import { useState, useEffect } from 'react';
import { api } from './api';
import FlatLay from './FlatLay';
import WornOutfitsTab from './WornOutfits';

function formatDate(d) {
  if (!d) return '';
  const date = new Date(d);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function LooksTab({ user }) {
  const [looks, setLooks] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .getLookHistory(user.id)
      .then(setLooks)
      .catch((e) => setError(e.message));
  }, [user.id]);

  if (error) return <p className="text-center text-red-500 py-10">{error}</p>;
  if (!looks) return <p className="text-center text-gray-400 py-10">Loading…</p>;
  if (looks.length === 0) return <p className="text-center text-gray-500 py-10">No looks generated yet.</p>;

  const statusLabel = {
    loved: 'Loved ♥',
    not_for_me: 'Not for me',
    shown: 'Shown',
    regenerated: 'Regenerated',
  };

  return (
    <div className="space-y-6">
      {looks.map(({ look, items }) => (
        <div key={look.id} className="bg-white rounded-2xl shadow-sm p-3">
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="font-medium">{formatDate(look.date)}</span>
            <span className="text-gray-400">{statusLabel[look.status] || look.status}</span>
          </div>
          {items.length > 0 ? (
            <FlatLay items={items} layout={look.layout} />
          ) : (
            <p className="text-sm text-gray-400">No items</p>
          )}
          {look.rationale && <p className="text-xs text-gray-500 mt-2">{look.rationale}</p>}
        </div>
      ))}
    </div>
  );
}

function CurrentSummaryCard({ user }) {
  const [summary, setSummary] = useState(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .getPreferenceSummary(user.id)
      .then((d) => setSummary(d.preference_summary || ''))
      .catch((e) => setError(e.message));
  }, [user.id]);

  const startEdit = () => {
    setDraft(summary);
    setEditing(true);
  };

  const save = () => {
    setSaving(true);
    api
      .updatePreferenceSummary(user.id, draft)
      .then(() => {
        setSummary(draft);
        setEditing(false);
      })
      .catch((e) => setError(e.message))
      .finally(() => setSaving(false));
  };

  if (error) return <p className="text-center text-red-500 py-10">{error}</p>;
  if (summary === null) return <p className="text-center text-gray-400 py-10">Loading…</p>;

  return (
    <div className="bg-white rounded-2xl shadow-sm p-3">
      <div className="flex items-center justify-between mb-1 text-xs text-gray-400">
        <span>Your style profile summary</span>
        {!editing && (
          <button onClick={startEdit} className="text-(--color-ink) font-medium">
            Edit
          </button>
        )}
      </div>
      {editing ? (
        <div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={4}
            className="w-full text-sm border border-gray-200 rounded-xl p-2 mb-2 focus:outline-none focus:ring-1 focus:ring-(--color-ink)"
          />
          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={saving}
              className="flex-1 py-2 rounded-xl bg-(--color-ink) text-white text-sm font-medium disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={() => setEditing(false)}
              disabled={saving}
              className="flex-1 py-2 rounded-xl bg-gray-100 text-sm font-medium disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm">
          {summary || 'No summary yet — this builds up after you give feedback on a few looks. You can also write your own.'}
        </p>
      )}
    </div>
  );
}

function PreferencesTab({ user }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .getPreferenceHistory(user.id)
      .then(setRows)
      .catch((e) => setError(e.message));
  }, [user.id]);

  return (
    <div className="space-y-3">
      <CurrentSummaryCard user={user} />

      {error && <p className="text-center text-red-500 py-10">{error}</p>}
      {!error && rows && rows.length > 0 && (
        <>
          <h3 className="text-sm font-medium text-gray-500 pt-2">How this has evolved</h3>
          {rows.map((row) => (
            <div key={row.id} className="bg-white rounded-2xl shadow-sm p-3">
              <div className="flex items-center justify-between mb-1 text-xs text-gray-400">
                <span>{formatDate(row.created_at)}</span>
                <span>based on {row.based_on_signal_count} feedback{row.based_on_signal_count === 1 ? '' : 's'}</span>
              </div>
              <p className="text-sm">{row.summary}</p>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

export default function History({ user }) {
  const [sub, setSub] = useState('looks');

  return (
    <div className="px-4 pb-24 pt-2">
      <h2 className="text-lg font-semibold mb-3">History</h2>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setSub('looks')}
          className={`flex-1 py-2 rounded-xl text-sm font-medium ${sub === 'looks' ? 'bg-(--color-ink) text-white' : 'bg-white text-gray-500'}`}
        >
          Past Looks
        </button>
        <button
          onClick={() => setSub('preferences')}
          className={`flex-1 py-2 rounded-xl text-sm font-medium ${sub === 'preferences' ? 'bg-(--color-ink) text-white' : 'bg-white text-gray-500'}`}
        >
          Preferences
        </button>
        <button
          onClick={() => setSub('worn')}
          className={`flex-1 py-2 rounded-xl text-sm font-medium ${sub === 'worn' ? 'bg-(--color-ink) text-white' : 'bg-white text-gray-500'}`}
        >
          Worn Outfits
        </button>
      </div>

      {sub === 'looks' && <LooksTab user={user} />}
      {sub === 'preferences' && <PreferencesTab user={user} />}
      {sub === 'worn' && <WornOutfitsTab user={user} />}
    </div>
  );
}
