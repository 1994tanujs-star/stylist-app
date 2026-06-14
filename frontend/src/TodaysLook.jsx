import { useState, useEffect } from 'react';
import { api } from './api';
import FlatLay from './FlatLay';

export default function TodaysLook({ user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const [pendingStatus, setPendingStatus] = useState(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  // On load: just show whatever look was last created. No AI call happens here.
  const loadLatest = () => {
    setLoading(true);
    setError('');
    api
      .getLatestLook(user.id)
      .then((d) => {
        setData(d.look ? d : null);
        if (d.look) setFeedbackGiven(d.look.status === 'loved' || d.look.status === 'not_for_me');
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(loadLatest, [user.id]);

  // Only this action calls the AI to generate a (new) look.
  const generate = () => {
    setGenerating(true);
    setError('');
    api
      .regenerateLook(user.id)
      .then((d) => {
        setData(d);
        setFeedbackGiven(false);
      })
      .catch((e) => setError(e.message))
      .finally(() => setGenerating(false));
  };

  const submitFeedback = (status, feedbackNote) => {
    api.sendFeedback(data.look.id, user.id, status, feedbackNote || undefined).then(() => {
      setFeedbackGiven(true);
      setPendingStatus(null);
      setNote('');
    });
  };

  if (loading) {
    return <div className="text-center py-20 text-gray-400">Loading…</div>;
  }

  if (error) {
    return (
      <div className="text-center py-20 text-red-500 px-6">
        <p>{error}</p>
        <button onClick={loadLatest} className="mt-4 underline">Try again</button>
      </div>
    );
  }

  // No look has ever been generated yet
  if (!data) {
    return (
      <div className="text-center py-20 px-6 text-gray-500">
        <p className="mb-4">No look yet. Tap below to get your first outfit suggestion.</p>
        <button
          onClick={generate}
          disabled={generating}
          className="px-6 py-3 rounded-xl bg-(--color-ink) text-white font-medium disabled:opacity-50"
        >
          {generating ? 'Styling your look…' : 'Generate my look'}
        </button>
      </div>
    );
  }

  if (data.items.length === 0) {
    return (
      <div className="text-center py-20 px-6 text-gray-500">
        <p>Add a few items to your wardrobe first, then come back here for today's look.</p>
      </div>
    );
  }

  return (
    <div className="px-4 pb-24 pt-2">
      <h2 className="text-lg font-semibold mb-1">
        {data.look.date === new Date().toISOString().slice(0, 10) ? "Today's Look" : 'Your Last Look'}
      </h2>
      <p className="text-sm text-gray-500 mb-4">{data.look.rationale}</p>

      <FlatLay items={data.items} layout={data.look.layout} />

      <div className="mt-4">
        <h3 className="text-sm font-medium text-gray-500 mb-2">In this look</h3>
        <ul className="space-y-1">
          {data.items.map((item) => (
            <li key={item.id} className="text-sm flex justify-between bg-white rounded-lg px-3 py-2 shadow-sm">
              <span>{item.name}</span>
              <span className="text-gray-400 capitalize">{item.category}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 flex flex-col gap-2">
        <button
          onClick={generate}
          disabled={generating}
          className="w-full py-3 rounded-xl bg-(--color-ink) text-white font-medium disabled:opacity-50"
        >
          {generating ? 'Styling your look…' : 'Generate another look'}
        </button>
        {!feedbackGiven ? (
          pendingStatus ? (
            <div className="flex flex-col gap-2">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a quick note on why (optional)"
                rows={2}
                autoFocus
                className="w-full text-sm border border-gray-200 rounded-xl p-2 focus:outline-none focus:ring-1 focus:ring-(--color-ink)"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => submitFeedback(pendingStatus, note.trim())}
                  className="flex-1 py-3 rounded-xl bg-(--color-ink) text-white font-medium"
                >
                  Submit
                </button>
                <button
                  onClick={() => submitFeedback(pendingStatus)}
                  className="flex-1 py-3 rounded-xl bg-gray-100 font-medium"
                >
                  Skip
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setPendingStatus('loved')}
                className="flex-1 py-3 rounded-xl bg-(--color-sage) font-medium"
              >
                Love this ♥
              </button>
              <button
                onClick={() => setPendingStatus('not_for_me')}
                className="flex-1 py-3 rounded-xl bg-(--color-blush) font-medium"
              >
                Not for me
              </button>
            </div>
          )
        ) : (
          <p className="text-center text-sm text-gray-400">Thanks for the feedback!</p>
        )}
      </div>
    </div>
  );
}
