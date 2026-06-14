import { useState, useEffect, useRef } from 'react';
import { api } from './api';

const CATEGORIES = ['top', 'bottom', 'dress', 'outerwear', 'shoes', 'bag', 'belt', 'hat', 'scarf', 'jewelry'];
const FORMALITIES = ['casual', 'work', 'occasion'];

export default function Wardrobe({ user }) {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('');
  const [pending, setPending] = useState(null); // { photo_url, tags, editingItemId? }
  const [tagging, setTagging] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const photoForItemId = useRef(null);

  const load = () => {
    api.getWardrobe(user.id, filter ? { category: filter } : {}).then(setItems).catch(() => {});
  };

  useEffect(load, [user.id, filter]);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setTagging(true);
    setError('');
    try {
      const result = await api.tagPhoto(file);
      setPending({ photo_url: result.photo_url, tags: result.tags, editingItemId: photoForItemId.current });
    } catch (err) {
      setError('Could not analyze photo: ' + err.message);
    } finally {
      setTagging(false);
      photoForItemId.current = null;
      e.target.value = '';
    }
  };

  const savePending = async () => {
    const { photo_url, tags, editingItemId } = pending;
    if (editingItemId) {
      await api.updateItem(editingItemId, { photo_url, ...tags, needs_photo: 0 });
    } else {
      await api.createItem({ ownerId: user.id, photo_url, ...tags });
    }
    setPending(null);
    load();
  };

  const updateTag = (key, value) => {
    setPending((p) => ({ ...p, tags: { ...p.tags, [key]: value } }));
  };

  const addPhotoToItem = (itemId) => {
    photoForItemId.current = itemId;
    fileInputRef.current.click();
  };

  const removeItem = async (id) => {
    if (!confirm('Remove this item from your wardrobe?')) return;
    await api.deleteItem(id);
    load();
  };

  return (
    <div className="px-4 pb-24 pt-2">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Wardrobe</h2>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="text-sm border rounded-lg px-2 py-1 bg-white"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        className="hidden"
      />

      <button
        onClick={() => {
          photoForItemId.current = null;
          fileInputRef.current.click();
        }}
        className="w-full py-3 mb-4 rounded-xl bg-(--color-ink) text-white font-medium"
        disabled={tagging}
      >
        {tagging ? 'Analyzing photo…' : '+ Add item (photo)'}
      </button>

      {error && <p className="text-red-500 text-sm mb-2">{error}</p>}

      {items.length === 0 ? (
        <p className="text-center text-gray-400 mt-12">No items yet. Add your first one above.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {items.map((item) => (
            <div key={item.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="aspect-square bg-(--color-cream) flex items-center justify-center">
                {item.photo_url ? (
                  <img src={item.photo_url} alt={item.name} className="object-cover w-full h-full" />
                ) : (
                  <button
                    onClick={() => addPhotoToItem(item.id)}
                    className="text-xs text-gray-400 underline p-4 text-center"
                  >
                    Needs photo — tap to add
                  </button>
                )}
              </div>
              <div className="p-2">
                <p className="text-sm font-medium truncate">{item.name}</p>
                <p className="text-xs text-gray-400 capitalize">{item.category} · {item.colors}</p>
                <button onClick={() => removeItem(item.id)} className="text-xs text-red-400 mt-1">
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {pending && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm space-y-3">
            <img src={pending.photo_url} alt="" className="w-full aspect-square object-cover rounded-xl" />
            <h3 className="font-semibold">Confirm details</h3>
            <label className="block text-sm">
              Name
              <input
                value={pending.tags.name || ''}
                onChange={(e) => updateTag('name', e.target.value)}
                className="w-full border rounded-lg px-2 py-1 mt-1"
              />
            </label>
            <label className="block text-sm">
              Category
              <select
                value={pending.tags.category}
                onChange={(e) => updateTag('category', e.target.value)}
                className="w-full border rounded-lg px-2 py-1 mt-1"
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="block text-sm">
              Colors
              <input
                value={pending.tags.colors || ''}
                onChange={(e) => updateTag('colors', e.target.value)}
                className="w-full border rounded-lg px-2 py-1 mt-1"
              />
            </label>
            <label className="block text-sm">
              Pattern
              <input
                value={pending.tags.pattern || ''}
                onChange={(e) => updateTag('pattern', e.target.value)}
                className="w-full border rounded-lg px-2 py-1 mt-1"
              />
            </label>
            <label className="block text-sm">
              Fabric
              <input
                value={pending.tags.fabric || ''}
                onChange={(e) => updateTag('fabric', e.target.value)}
                className="w-full border rounded-lg px-2 py-1 mt-1"
              />
            </label>
            <label className="block text-sm">
              Formality
              <select
                value={pending.tags.formality}
                onChange={(e) => updateTag('formality', e.target.value)}
                className="w-full border rounded-lg px-2 py-1 mt-1"
              >
                {FORMALITIES.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </label>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setPending(null)} className="flex-1 py-2 rounded-xl bg-gray-100">
                Cancel
              </button>
              <button onClick={savePending} className="flex-1 py-2 rounded-xl bg-(--color-ink) text-white">
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
