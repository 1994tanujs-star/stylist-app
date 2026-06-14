import { useState, useEffect, useRef } from 'react';
import { api } from './api';

const CATEGORIES = ['top', 'bottom', 'dress', 'outerwear', 'shoes', 'bag', 'belt', 'hat', 'scarf', 'jewelry'];

function formatDate(d) {
  if (!d) return '';
  const date = new Date(d);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function UploadOutfit({ user, onSaved }) {
  const [step, setStep] = useState('idle'); // idle | tagging | review | rate | saving
  const [photoUrl, setPhotoUrl] = useState(null);
  const [detected, setDetected] = useState([]);
  const [resolutions, setResolutions] = useState([]); // { mode: 'existing'|'new', existingId, tags }
  const [wardrobe, setWardrobe] = useState([]);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    api.getWardrobe(user.id).then(setWardrobe).catch(() => {});
  }, [user.id]);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setStep('tagging');
    setError('');
    try {
      const result = await api.tagOutfitPhoto(file);
      setPhotoUrl(result.photo_url);
      setDetected(result.items);
      setResolutions(result.items.map((tags) => ({ mode: 'new', existingId: null, tags })));
      setStep('review');
    } catch (err) {
      setError('Could not analyze photo: ' + err.message);
      setStep('idle');
    } finally {
      e.target.value = '';
    }
  };

  const updateResolution = (i, fields) => {
    setResolutions((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...fields } : r)));
  };

  const updateTag = (i, key, value) => {
    setResolutions((prev) => prev.map((r, idx) => (idx === i ? { ...r, tags: { ...r.tags, [key]: value } } : r)));
  };

  const reset = () => {
    setStep('idle');
    setPhotoUrl(null);
    setDetected([]);
    setResolutions([]);
    setNote('');
    setError('');
  };

  const save = async (chosenStatus, chosenNote) => {
    setStep('saving');
    setError('');
    try {
      const itemIds = [];
      for (const r of resolutions) {
        if (r.mode === 'existing') {
          itemIds.push(r.existingId);
        } else {
          const created = await api.createItem({ ownerId: user.id, photo_url: photoUrl, ...r.tags });
          itemIds.push(created.id);
        }
      }
      await api.saveWornOutfit(user.id, photoUrl, itemIds, chosenStatus, chosenNote || undefined);
      reset();
      onSaved();
    } catch (err) {
      setError(err.message);
      setStep('rate');
    }
  };

  if (step === 'idle') {
    return (
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFile}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current.click()}
          className="w-full py-3 rounded-xl bg-(--color-ink) text-white font-medium"
        >
          + Upload outfit photo
        </button>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </div>
    );
  }

  if (step === 'tagging') {
    return <p className="text-center text-gray-400 py-6">Analyzing your outfit…</p>;
  }

  if (step === 'review') {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-3 space-y-3">
        <img src={photoUrl} alt="" className="w-full aspect-square object-cover rounded-xl" />
        <h3 className="font-semibold text-sm">Found {detected.length} item{detected.length === 1 ? '' : 's'} — match to your wardrobe</h3>
        {resolutions.map((r, i) => {
          const matches = wardrobe.filter((w) => w.category === r.tags.category);
          return (
            <div key={i} className="border border-gray-200 rounded-xl p-2 space-y-2">
              <p className="text-sm font-medium">{r.tags.name} <span className="text-gray-400 capitalize">· {r.tags.category}</span></p>
              <select
                value={r.mode === 'existing' ? r.existingId : 'new'}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === 'new') updateResolution(i, { mode: 'new', existingId: null });
                  else updateResolution(i, { mode: 'existing', existingId: Number(v) });
                }}
                className="w-full border rounded-lg px-2 py-1 text-sm"
              >
                <option value="new">Add as new wardrobe item</option>
                {matches.map((m) => (
                  <option key={m.id} value={m.id}>Same as: {m.name}</option>
                ))}
              </select>
              {r.mode === 'new' && (
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={r.tags.name || ''}
                    onChange={(e) => updateTag(i, 'name', e.target.value)}
                    placeholder="Name"
                    className="border rounded-lg px-2 py-1 text-sm"
                  />
                  <select
                    value={r.tags.category}
                    onChange={(e) => updateTag(i, 'category', e.target.value)}
                    className="border rounded-lg px-2 py-1 text-sm"
                  >
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}
            </div>
          );
        })}
        <div className="flex gap-2 pt-1">
          <button onClick={reset} className="flex-1 py-2 rounded-xl bg-gray-100 text-sm">Cancel</button>
          <button onClick={() => setStep('rate')} className="flex-1 py-2 rounded-xl bg-(--color-ink) text-white text-sm">Continue</button>
        </div>
      </div>
    );
  }

  if (step === 'rate' || step === 'saving') {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-3 space-y-3">
        <p className="text-sm font-medium">How did you feel about this outfit?</p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a quick note on why (optional)"
          rows={2}
          className="w-full text-sm border border-gray-200 rounded-xl p-2 focus:outline-none focus:ring-1 focus:ring-(--color-ink)"
        />
        <div className="flex gap-2">
          <button
            onClick={() => save('loved', note.trim())}
            disabled={step === 'saving'}
            className="flex-1 py-3 rounded-xl bg-(--color-sage) font-medium disabled:opacity-50"
          >
            Loved it ♥
          </button>
          <button
            onClick={() => save('not_for_me', note.trim())}
            disabled={step === 'saving'}
            className="flex-1 py-3 rounded-xl bg-(--color-blush) font-medium disabled:opacity-50"
          >
            Not for me
          </button>
        </div>
        <button
          onClick={() => save(null, null)}
          disabled={step === 'saving'}
          className="w-full py-2 rounded-xl bg-gray-100 text-sm disabled:opacity-50"
        >
          {step === 'saving' ? 'Saving…' : 'Skip rating, just save'}
        </button>
        {error && <p className="text-red-500 text-sm">{error}</p>}
      </div>
    );
  }

  return null;
}

export default function WornOutfitsTab({ user }) {
  const [outfits, setOutfits] = useState(null);
  const [error, setError] = useState('');

  const load = () => {
    api.getWornOutfits(user.id).then(setOutfits).catch((e) => setError(e.message));
  };

  useEffect(load, [user.id]);

  const statusLabel = { loved: 'Loved ♥', not_for_me: 'Not for me' };

  return (
    <div className="space-y-3">
      <UploadOutfit user={user} onSaved={load} />

      {error && <p className="text-center text-red-500 py-10">{error}</p>}
      {!error && !outfits && <p className="text-center text-gray-400 py-10">Loading…</p>}
      {!error && outfits && outfits.length === 0 && (
        <p className="text-center text-gray-500 py-10 px-4">
          No worn outfits logged yet. Upload a photo of an outfit you've worn to start your catalog.
        </p>
      )}
      {!error && outfits && outfits.length > 0 && (
        <div className="space-y-3 pt-2">
          {outfits.map(({ outfit, items }) => (
            <div key={outfit.id} className="bg-white rounded-2xl shadow-sm p-3">
              <div className="flex items-center justify-between mb-2 text-sm">
                <span className="font-medium">{formatDate(outfit.date)}</span>
                {outfit.status && <span className="text-gray-400">{statusLabel[outfit.status] || outfit.status}</span>}
              </div>
              {outfit.photo_url && (
                <img src={outfit.photo_url} alt="" className="w-full aspect-square object-cover rounded-xl mb-2" />
              )}
              <ul className="space-y-1">
                {items.map((item) => (
                  <li key={item.id} className="text-sm flex justify-between bg-(--color-cream) rounded-lg px-3 py-2">
                    <span>{item.name}</span>
                    <span className="text-gray-400 capitalize">{item.category}</span>
                  </li>
                ))}
              </ul>
              {outfit.note && <p className="text-xs text-gray-500 mt-2">{outfit.note}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
