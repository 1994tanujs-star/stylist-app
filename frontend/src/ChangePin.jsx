import { useState } from 'react';
import { api } from './api';

export default function ChangePin({ onClose }) {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (newPin !== confirmPin) return setError('New PINs do not match');
    if (!/^\d{4,6}$/.test(newPin)) return setError('PIN must be 4–6 digits');
    setSaving(true);
    try {
      await api.changePin(currentPin, newPin);
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const field = (label, value, setter) => (
    <label className="block text-sm">
      {label}
      <input
        type="password"
        inputMode="numeric"
        value={value}
        onChange={(e) => setter(e.target.value)}
        maxLength={6}
        className="w-full border rounded-lg px-2 py-2 mt-1 tracking-widest"
      />
    </label>
  );

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl p-5 w-full max-w-sm space-y-3 max-h-[90vh] overflow-y-auto">
        <h3 className="font-semibold">Change PIN</h3>
        {done ? (
          <>
            <p className="text-sm text-gray-600">Your PIN has been updated.</p>
            <button onClick={onClose} className="w-full py-2 rounded-xl bg-(--color-ink) text-white font-medium">
              Done
            </button>
          </>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            {field('Current PIN', currentPin, setCurrentPin)}
            {field('New PIN (4–6 digits)', newPin, setNewPin)}
            {field('Confirm new PIN', confirmPin, setConfirmPin)}
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose} className="flex-1 py-2 rounded-xl bg-gray-100 font-medium">
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2 rounded-xl bg-(--color-ink) text-white font-medium disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
