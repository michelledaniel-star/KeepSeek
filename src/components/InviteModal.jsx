import React, { useState, useEffect } from 'react';

export default function InviteModal({ slug, keeperName, onClose }) {
  const inviteLink = `${window.location.origin}/s/${slug}`;
  const [email, setEmail] = useState('');
  const [note, setNote] = useState(
    `Hi,\n\nI'd like to share my family keepsake collection with you on KeepSeek — a place where I'm preserving the stories behind the things that matter most to our family.\n\nClick the link below to view my collection:\n${inviteLink}\n\nLove,\n${keeperName}`
  );
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState('');

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const handleSend = async () => {
    if (!email) {
      setSendError('Please enter a recipient email address.');
      return;
    }

    setSending(true);
    setSendError('');

    try {
      const response = await fetch('/api/send-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          keeperName,
          inviteLink,
          message: note,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invitation.');
      }

      setSent(true);
    } catch (err) {
      console.error('Send invite error:', err);
      setSendError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black bg-opacity-40" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg p-8 shadow-xl">

        <div className="flex items-start justify-between mb-6">
          <h2 className="text-2xl font-heading italic tracking-[0.05em]">Send Invitation</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-black text-xl leading-none mt-1">×</button>
        </div>

        {sent ? (
          <div className="text-center py-8">
            <p className="text-lg font-heading italic tracking-[0.05em] mb-2">Invitation sent.</p>
            <p className="text-sm text-gray-500 mb-6" style={{ fontFamily: 'Lora, serif' }}>
              {email} will receive an email with a link to your collection.
            </p>
            <button
              onClick={onClose}
              className="px-8 py-3 bg-black text-white text-sm"
              style={{ fontFamily: 'Roboto, sans-serif' }}
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="mb-5">
              <label className="block text-xs uppercase tracking-widest text-gray-400 mb-1" style={{ fontFamily: 'Roboto, sans-serif' }}>
                Recipient Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setSendError(''); }}
                placeholder="family@example.com"
                className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:border-black"
                style={{ fontFamily: 'Lora, serif' }}
              />
            </div>

            <div className="mb-6">
              <label className="block text-xs uppercase tracking-widest text-gray-400 mb-1" style={{ fontFamily: 'Roboto, sans-serif' }}>
                Message
              </label>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:border-black resize-none"
                style={{ fontFamily: 'Lora, serif' }}
              />
            </div>

            {sendError && (
              <p className="text-sm text-red-500 mb-4" style={{ fontFamily: 'Roboto, sans-serif' }}>{sendError}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleSend}
                disabled={sending}
                className="flex-1 py-3 bg-black text-white text-sm hover:bg-gray-800 transition-colors disabled:bg-gray-300"
                style={{ fontFamily: 'Roboto, sans-serif' }}
              >
                {sending ? 'Sending...' : 'Send Invitation'}
              </button>
              <button
                onClick={onClose}
                className="px-6 py-3 border border-gray-300 text-sm hover:border-black transition-colors"
                style={{ fontFamily: 'Roboto, sans-serif' }}
              >
                Cancel
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
