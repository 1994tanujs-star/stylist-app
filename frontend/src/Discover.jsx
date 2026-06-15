import { useState, useEffect, useRef } from 'react';
import { api } from './api';
import FlatLay from './FlatLay';

const shopUrl = (query) => `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(query)}`;

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// Add an inspiration look: upload a screenshot, or paste a direct image link.
function AddInspiration({ onSaved }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const reset = () => {
    setOpen(false);
    setUrl('');
    setCaption('');
    setError('');
  };

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      await api.addInspirationPhoto(file, caption.trim() || undefined);
      reset();
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  };

  const handleUrl = async () => {
    if (!url.trim()) return;
    setBusy(true);
    setError('');
    try {
      await api.addInspirationUrl(url.trim(), caption.trim() || undefined);
      reset();
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (busy) {
    return <p className="text-center text-gray-400 py-4">Analyzing the look…</p>;
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full py-3 rounded-xl bg-(--color-ink) text-white font-medium"
      >
        + Add inspiration
      </button>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-3 space-y-3">
      <input
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="Optional caption — e.g. summer brunch vibe"
        className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-(--color-ink)"
      />
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
      <button
        onClick={() => fileInputRef.current.click()}
        className="w-full py-3 rounded-xl bg-(--color-blush) font-medium"
      >
        Upload a screenshot
      </button>
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <span className="flex-1 border-t" /> or paste a link <span className="flex-1 border-t" />
      </div>
      <div className="flex gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Direct image URL"
          className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-(--color-ink)"
        />
        <button
          onClick={handleUrl}
          disabled={!url.trim()}
          className="px-4 rounded-xl bg-(--color-ink) text-white text-sm font-medium disabled:opacity-50"
        >
          Analyze
        </button>
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button onClick={reset} className="w-full py-2 rounded-xl bg-gray-100 text-sm">Cancel</button>
    </div>
  );
}

// Full breakdown of a single saved inspiration look.
function Breakdown({ entry, onBack, onChanged }) {
  const [look, setLook] = useState(entry.look);
  const [owned] = useState(entry.owned);
  const [gaps] = useState(entry.gaps);
  const [vibe] = useState(entry.vibe);
  const [worn, setWorn] = useState(null);
  const [wearing, setWearing] = useState(false);
  const [error, setError] = useState('');

  const wear = async () => {
    setWearing(true);
    setError('');
    try {
      setWorn(await api.wearInspiration(look.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setWearing(false);
    }
  };

  const giveFeedback = async (status) => {
    try {
      await api.inspirationFeedback(look.id, status);
      setLook({ ...look, status });
      onChanged();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async () => {
    if (!confirm('Remove this inspiration?')) return;
    await api.deleteInspiration(look.id).catch((e) => setError(e.message));
    onChanged();
    onBack();
  };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm text-gray-500">← Board</button>

      <img src={look.photo_url} alt="" className="w-full aspect-square object-cover rounded-2xl" />
      {vibe && <p className="text-sm text-gray-600 italic">“{vibe}”</p>}
      {look.caption && <p className="text-xs text-gray-400">{look.caption}</p>}

      <div>
        <h3 className="text-sm font-semibold mb-2">In your closet ({owned.length})</h3>
        {owned.length === 0 ? (
          <p className="text-sm text-gray-400">Nothing from this look matched your wardrobe yet.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {owned.map((o, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="aspect-square bg-(--color-cream) flex items-center justify-center">
                  {o.item.photo_url ? (
                    <img src={o.item.photo_url} alt="" className="object-cover w-full h-full" />
                  ) : (
                    <span className="text-xs text-gray-400 capitalize">{o.item.category}</span>
                  )}
                </div>
                <p className="text-[11px] px-1 py-1 truncate">{o.item.name}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2">You'll need ({gaps.length})</h3>
        {gaps.length === 0 ? (
          <p className="text-sm text-gray-400">You already own everything for this look. 🎉</p>
        ) : (
          <ul className="space-y-2">
            {gaps.map((g, i) => (
              <li key={i} className="flex items-center justify-between bg-white rounded-xl shadow-sm px-3 py-2">
                <span className="text-sm">
                  {g.description}
                  <span className="text-gray-400 capitalize"> · {g.slot}</span>
                </span>
                <a
                  href={shopUrl(g.search_query)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 ml-2 px-3 py-1 rounded-full bg-(--color-blush) text-xs font-medium"
                >
                  Shop
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      {owned.length > 0 && (
        <button
          onClick={wear}
          disabled={wearing}
          className="w-full py-3 rounded-xl bg-(--color-ink) text-white font-medium disabled:opacity-50"
        >
          {wearing ? 'Styling a version…' : 'Wear a version now'}
        </button>
      )}

      {worn && worn.items.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-3 space-y-2">
          <p className="text-sm text-gray-500">{worn.look.rationale}</p>
          <FlatLay items={worn.items} layout={worn.look.layout} />
          <p className="text-xs text-gray-400">Saved to Today's Look — open that tab to refine or rate it.</p>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => giveFeedback('loved')}
          className={`flex-1 py-3 rounded-xl font-medium ${look.status === 'loved' ? 'bg-(--color-sage) ring-2 ring-(--color-ink)' : 'bg-(--color-sage)'}`}
        >
          Love this ♥
        </button>
        <button
          onClick={() => giveFeedback('not_for_me')}
          className={`flex-1 py-3 rounded-xl font-medium ${look.status === 'not_for_me' ? 'bg-(--color-blush) ring-2 ring-(--color-ink)' : 'bg-(--color-blush)'}`}
        >
          Not for me
        </button>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button onClick={remove} className="w-full py-2 text-sm text-gray-400">Remove inspiration</button>
    </div>
  );
}

export default function Discover() {
  const [board, setBoard] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [error, setError] = useState('');

  const load = () => {
    api.getInspiration().then(setBoard).catch((e) => setError(e.message));
  };

  useEffect(load, []);

  const selected = board?.find((e) => e.look.id === selectedId);

  return (
    <div className="px-4 pb-24 pt-2 space-y-3">
      <h2 className="text-lg font-semibold">Discover</h2>

      {selected ? (
        <Breakdown
          entry={selected}
          onBack={() => setSelectedId(null)}
          onChanged={load}
        />
      ) : (
        <>
          <p className="text-sm text-gray-500">
            Save a look you love and we'll show what's already in your closet and what to buy.
          </p>
          <AddInspiration onSaved={load} />

          {error && <p className="text-center text-red-500 py-6">{error}</p>}
          {!error && !board && <p className="text-center text-gray-400 py-10">Loading…</p>}
          {!error && board && board.length === 0 && (
            <p className="text-center text-gray-500 py-10 px-4">
              No inspiration saved yet. Add a screenshot from Pinterest or Instagram to get started.
            </p>
          )}
          {!error && board && board.length > 0 && (
            <div className="grid grid-cols-2 gap-3 pt-1">
              {board.map((entry) => (
                <button
                  key={entry.look.id}
                  onClick={() => setSelectedId(entry.look.id)}
                  className="text-left bg-white rounded-2xl shadow-sm overflow-hidden"
                >
                  <img src={entry.look.photo_url} alt="" className="w-full aspect-square object-cover" />
                  <div className="p-2">
                    <p className="text-xs font-medium truncate">{entry.vibe || entry.look.caption || 'Inspiration'}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {entry.owned.length} owned · {entry.gaps.length} to buy
                      {entry.look.status === 'loved' ? ' · ♥' : ''}
                    </p>
                    <p className="text-[10px] text-gray-300">{formatDate(entry.look.created_at)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
