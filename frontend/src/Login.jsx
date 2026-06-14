import { useState, useEffect } from 'react';
import { api } from './api';

export default function Login({ onLogin }) {
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.getUsers().then(setUsers).catch(() => {});
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const user = await api.login(selected.id, passcode);
      onLogin(user);
    } catch (err) {
      setError('Incorrect passcode');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-(--color-cream) p-6">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-8">
        <h1 className="text-2xl font-semibold mb-1 text-center">Daily Stylist</h1>
        <p className="text-sm text-center text-gray-500 mb-6">Who's getting ready today?</p>

        {!selected ? (
          <div className="space-y-3">
            {users.map((u) => (
              <button
                key={u.id}
                onClick={() => setSelected(u)}
                className="w-full py-3 rounded-xl bg-(--color-blush) hover:bg-(--color-sage) transition font-medium"
              >
                {u.name}
              </button>
            ))}
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <p className="text-center text-gray-700">Hi {selected.name}, enter your PIN</p>
            <input
              type="password"
              inputMode="numeric"
              autoFocus
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              className="w-full text-center text-2xl tracking-widest border rounded-xl py-3"
              maxLength={6}
            />
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <button type="submit" className="w-full py-3 rounded-xl bg-(--color-ink) text-white font-medium">
              Enter
            </button>
            <button
              type="button"
              onClick={() => {
                setSelected(null);
                setPasscode('');
                setError('');
              }}
              className="w-full text-sm text-gray-400"
            >
              Back
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
