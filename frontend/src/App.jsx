import { useState, useEffect } from 'react';
import { api } from './api';
import Login from './Login';
import TodaysLook from './TodaysLook';
import Wardrobe from './Wardrobe';
import Discover from './Discover';
import History from './History';
import ChangePin from './ChangePin';

export default function App() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('look');
  const [showChangePin, setShowChangePin] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem('stylist_user');
    if (saved) setUser(JSON.parse(saved));
  }, []);

  const onLogin = (u) => {
    setUser(u);
    sessionStorage.setItem('stylist_user', JSON.stringify(u));
  };

  const logout = () => {
    api.logout().catch(() => {});
    setUser(null);
    sessionStorage.removeItem('stylist_user');
  };

  if (!user) return <Login onLogin={onLogin} />;

  return (
    <div className="min-h-screen bg-(--color-cream) max-w-md mx-auto">
      <header className="flex items-center justify-between px-4 py-3">
        <h1 className="font-semibold">Hi, {user.name}</h1>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowChangePin(true)} className="text-xs text-gray-400">Change PIN</button>
          <button onClick={logout} className="text-xs text-gray-400">Switch user</button>
        </div>
      </header>

      {showChangePin && <ChangePin onClose={() => setShowChangePin(false)} />}

      {tab === 'look' ? (
        <TodaysLook user={user} />
      ) : tab === 'wardrobe' ? (
        <Wardrobe user={user} />
      ) : tab === 'discover' ? (
        <Discover user={user} />
      ) : (
        <History user={user} />
      )}

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t flex pb-[env(safe-area-inset-bottom)]">
        <button
          onClick={() => setTab('look')}
          className={`flex-1 py-3 text-xs font-medium ${tab === 'look' ? 'text-(--color-ink)' : 'text-gray-400'}`}
        >
          Today's Look
        </button>
        <button
          onClick={() => setTab('wardrobe')}
          className={`flex-1 py-3 text-xs font-medium ${tab === 'wardrobe' ? 'text-(--color-ink)' : 'text-gray-400'}`}
        >
          Wardrobe
        </button>
        <button
          onClick={() => setTab('discover')}
          className={`flex-1 py-3 text-xs font-medium ${tab === 'discover' ? 'text-(--color-ink)' : 'text-gray-400'}`}
        >
          Discover
        </button>
        <button
          onClick={() => setTab('history')}
          className={`flex-1 py-3 text-xs font-medium ${tab === 'history' ? 'text-(--color-ink)' : 'text-gray-400'}`}
        >
          History
        </button>
      </nav>
    </div>
  );
}
