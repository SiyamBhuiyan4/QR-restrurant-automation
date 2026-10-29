import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { MessageCircle, X, Send, Mic, Trash2, Play, Pause, Volume2 } from 'lucide-react';
import { api } from '../convexApi';
import { sendGuestChatToTelegramChannel } from '../services/telegramClient';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';

const GUEST_KEY = 'smartdine_guest_id';
const GUEST_CHAT_PREFIX = 'smartdine_guest_chat_';
let memoryGuestId = '';

/** Storage helper for local conversation history per table */
function getStorageKey(tableNumber) {
  return `${GUEST_CHAT_PREFIX}${tableNumber}`;
}

function loadLocalChat(tableNumber) {
  if (!tableNumber) return [];
  try {
    const raw = localStorage.getItem(getStorageKey(tableNumber));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn('[GuestChat] Failed to load local conversation from localStorage:', err);
  }
  return [];
}

function saveLocalChat(tableNumber, messages) {
  if (!tableNumber) return;
  try {
    localStorage.setItem(getStorageKey(tableNumber), JSON.stringify(messages));
  } catch (err) {
    console.warn('[GuestChat] Failed to save local conversation to localStorage:', err);
  }
}

/** Random id kept on this phone so the guest only ever sees their own conversation */
function getGuestId() {
  try {
    const saved = localStorage.getItem(GUEST_KEY);
    if (saved && /^[A-Za-z0-9_-]{12,64}$/.test(saved)) return saved;
  } catch (_) { /* storage blocked */ }
  if (!memoryGuestId) {
    const bytes = new Uint8Array(12);
    crypto.getRandomValues(bytes);
    memoryGuestId = 'g' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  try { localStorage.setItem(GUEST_KEY, memoryGuestId); } catch (_) { /* storage blocked */ }
  return memoryGuestId;
}

function timeLabel(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function errorText(err) {
  const raw = String(err?.data || err?.message || '');
  if (/wait a moment/i.test(raw)) return 'Please wait a moment before sending more messages.';
  return 'Message not sent. Check your connection and try again.';
}

/** Audio Voice Note Player for guest & staff messages */
function VoiceBubble({ audioUrl, isFromGuest }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  };

  return (
    <div className="flex items-center gap-2.5 py-1 select-none">
      <audio
        ref={audioRef}
        src={audioUrl}
        onEnded={() => setIsPlaying(false)}
        onPause={() => setIsPlaying(false)}
        onError={() => setIsPlaying(false)}
      />
      <button
        type="button"
        onClick={togglePlay}
        className={`w-8 h-8 rounded-full flex items-center justify-center transition active:scale-95 cursor-pointer shadow-sm ${
          isFromGuest ? 'bg-white text-[#FF5A26]' : 'bg-[#FF5A26] text-white'
        }`}
        aria-label={isPlaying ? 'Pause voice message' : 'Play voice message'}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4 fill-current" />
        ) : (
          <Play className="w-4 h-4 fill-current translate-x-0.5" />
        )}
      </button>
      <div className="flex-1 min-w-[130px]">
        <div className="flex items-center gap-1 h-3.5 mb-0.5">
          <div className={`w-1 h-2 rounded-full ${isPlaying ? 'bg-white animate-pulse' : 'bg-current opacity-60'}`} />
          <div className={`w-1 h-3.5 rounded-full ${isPlaying ? 'bg-white' : 'bg-current opacity-80'}`} />
          <div className={`w-1 h-1.5 rounded-full ${isPlaying ? 'bg-white animate-pulse' : 'bg-current opacity-50'}`} />
          <div className={`w-1 h-4 rounded-full ${isPlaying ? 'bg-white' : 'bg-current opacity-90'}`} />
          <div className={`w-1 h-2.5 rounded-full ${isPlaying ? 'bg-white animate-pulse' : 'bg-current opacity-70'}`} />
          <div className={`w-1 h-3.5 rounded-full ${isPlaying ? 'bg-white' : 'bg-current opacity-85'}`} />
          <div className={`w-1 h-1.5 rounded-full ${isPlaying ? 'bg-white animate-pulse' : 'bg-current opacity-40'}`} />
          <div className={`w-1 h-3 rounded-full ${isPlaying ? 'bg-white' : 'bg-current opacity-75'}`} />
        </div>
        <span className="text-[10px] font-bold opacity-80 block tracking-wide">
          {isPlaying ? 'Playing Audio…' : '🎤 Voice Note'}
        </span>
      </div>
    </div>
  );
}

/**
 * Guest chat with the restaurant. Messages go to the staff covering this table and the
 * manager; replies always show as "Management".
 * Props: tableNumber, raised (lift above the cart bar), hidden (another overlay is open).
 */
export default function GuestChat({ tableNumber, raised = false, hidden = false }) {
  const table = Number(tableNumber) || parseInt(String(tableNumber || '').replace(/\D/g, ''), 10) || 0;
  const guestId = useMemo(() => getGuestId(), []);
  const args = table > 0 ? { tableNumber: table, guestId } : 'skip';
  const data = useQuery(api.chat.guestMessages, args);
  const send = useMutation(api.chat.guestSend);
  const markRead = useMutation(api.chat.guestMarkRead);

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [localMessages, setLocalMessages] = useState(() => loadLocalChat(table));
  const endRef = useRef(null);

  // Customer Voice Recording Hook
  const {
    isRecording,
    recordingTime,
    audioBlob,
    startRecording,
    stopRecording,
    resetRecording
  } = useVoiceRecorder({ maxDuration: 30 });

  const sendVoiceOnStopRef = useRef(false);

  // Handle Voice Note Sending
  const handleSendVoiceClick = () => {
    sendVoiceOnStopRef.current = true;
    stopRecording();
  };

  useEffect(() => {
    if (audioBlob && sendVoiceOnStopRef.current) {
      sendVoiceOnStopRef.current = false;
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Data = reader.result;
        const newMsg = {
          _id: `guest_voice_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          fromGuest: true,
          text: '🎤 Voice Message',
          audioUrl: base64Data,
          isVoice: true,
          createdAt: Date.now()
        };

        const currentLocal = loadLocalChat(table);
        const updatedLocal = [...currentLocal, newMsg];
        saveLocalChat(table, updatedLocal);
        setLocalMessages(updatedLocal);
        resetRecording();

        try {
          sendGuestChatToTelegramChannel(table, '🎤 Customer sent a Voice Message from Table #' + table).catch(() => {});
        } catch (_) {}
      };
      reader.readAsDataURL(audioBlob);
    }
  }, [audioBlob, table, resetRecording]);

  // Sync local conversation cache when table changes
  useEffect(() => {
    setLocalMessages(loadLocalChat(table));
  }, [table]);

  // Merge incoming Convex messages (including management replies) into local storage
  useEffect(() => {
    if (data?.messages && data.messages.length > 0 && table > 0) {
      setLocalMessages((prevLocal) => {
        let changed = false;
        const merged = [...prevLocal];
        for (const cm of data.messages) {
          const exists = merged.some(
            (lm) =>
              lm._id === cm._id ||
              (lm.fromGuest === cm.fromGuest &&
                lm.text === cm.text &&
                Math.abs((lm.createdAt || 0) - (cm.createdAt || 0)) < 15000)
          );
          if (!exists) {
            merged.push(cm);
            changed = true;
          }
        }
        if (changed) {
          merged.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
          saveLocalChat(table, merged);
          return merged;
        }
        return prevLocal;
      });
    }
  }, [data?.messages, table]);

  // Combined messages to display
  const messages = useMemo(() => {
    const convexMsgs = data?.messages || [];
    const localMsgs = localMessages || [];

    if (!convexMsgs.length) return localMsgs;
    if (!localMsgs.length) return convexMsgs;

    const combined = [...localMsgs];
    for (const cm of convexMsgs) {
      const exists = combined.some(
        (lm) =>
          lm._id === cm._id ||
          (lm.fromGuest === cm.fromGuest &&
            lm.text === cm.text &&
            Math.abs((lm.createdAt || 0) - (cm.createdAt || 0)) < 15000)
      );
      if (!exists) {
        combined.push(cm);
      }
    }
    return combined.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  }, [data?.messages, localMessages]);

  const unread = !!data?.unread;

  // Mark read while open, and scroll to the newest message
  useEffect(() => {
    if (!open || table <= 0) return;
    if (unread && typeof markRead === 'function') {
      markRead({ tableNumber: table, guestId }).catch(() => {});
    }
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [open, messages.length, unread, table, guestId, markRead]);

  if (table <= 0) return null;

  const handleSend = async (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setError('');

    const newMsg = {
      _id: `guest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      fromGuest: true,
      text,
      createdAt: Date.now(),
    };

    // 1. Immediately store conversation locally in localStorage (`smartdine_guest_chat_<tableNumber>`)
    const currentLocal = loadLocalChat(table);
    const updatedLocal = [...currentLocal, newMsg];
    saveLocalChat(table, updatedLocal);
    setLocalMessages(updatedLocal);
    setDraft('');

    // 2. Post message to Telegram Channel formatted with table number and time
    try {
      sendGuestChatToTelegramChannel(table, text).catch((tgErr) => {
        console.warn('[GuestChat] Telegram dispatch warning:', tgErr);
      });
    } catch (tgErr) {
      console.warn('[GuestChat] Telegram dispatch exception:', tgErr);
    }

    // 3. Ensure no unhandled Convex mutation failure blocks chat submission
    try {
      if (typeof send === 'function') {
        await send({ tableNumber: table, guestId, text });
      }
    } catch (err) {
      console.warn('[GuestChat] Convex mutation failed (saved locally & dispatched to Telegram):', err);
      // Non-blocking: chat submission succeeds locally and over Telegram
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {!open && !hidden && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Message the restaurant"
          className="fixed right-4 z-40 w-12 h-12 rounded-full flame-gradient-btn text-white shadow-lg shadow-black/60 flex items-center justify-center active:scale-95 transition-all"
          style={{ bottom: `calc(${raised ? '96px' : '20px'} + env(safe-area-inset-bottom, 0px))` }}
        >
          <MessageCircle className="w-5 h-5 stroke-[2.2]" />
          {unread && (
            <span className="absolute top-0.5 right-0.5 w-3 h-3 rounded-full bg-rose-500 ring-2 ring-[#0a0a0c]" aria-label="New reply" />
          )}
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Message the restaurant"
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-[#141418] text-white border border-zinc-800 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[85vh] animate-slideUp"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            <header className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 border-b border-zinc-800">
              <div>
                <h2 className="text-base font-black tracking-tight">Message the restaurant</h2>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Table {table} • Your message goes to the staff serving your table and the manager.
                </p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800">
                <X className="w-5 h-5" />
              </button>
            </header>

            <div className="flex-1 min-h-[200px] overflow-y-auto px-4 py-3 space-y-2.5">
              {data === undefined && messages.length === 0 && <p className="text-xs text-zinc-500 text-center mt-6">Loading…</p>}
              {messages.length === 0 && data !== undefined && (
                <p className="text-xs text-zinc-500 text-center mt-6">Need something? Ask here and we'll reply right away.</p>
              )}
              {messages.map((m) => (
                <div key={m._id} className={`flex ${m.fromGuest ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
                      m.fromGuest ? 'flame-gradient-btn text-white rounded-br-md' : 'bg-zinc-800 text-zinc-100 rounded-bl-md'
                    }`}
                  >
                    {!m.fromGuest && <div className="text-[10px] font-bold text-[#FF8A5B] mb-0.5">Management</div>}
                    {m.isVoice || m.audioUrl ? (
                      <VoiceBubble audioUrl={m.audioUrl} isFromGuest={m.fromGuest} />
                    ) : (
                      <p className="whitespace-pre-wrap break-words">{m.text}</p>
                    )}
                    <div className={`text-[10px] mt-1 ${m.fromGuest ? 'text-white/75 text-right' : 'text-zinc-400'}`}>{timeLabel(m.createdAt)}</div>
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>

            <div className="border-t border-zinc-800 px-4 pt-3 pb-4">
              {error && <p className="text-[11px] text-rose-400 mb-2">{error}</p>}
              
              {isRecording ? (
                /* Live Voice Recording Bar */
                <div className="flex items-center justify-between gap-2.5 bg-rose-950/40 border border-rose-500/40 rounded-2xl px-3.5 py-2.5 animate-fadeIn">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
                    </span>
                    <span className="text-xs font-bold text-rose-300">Recording Voice…</span>
                    <span className="text-xs font-mono text-zinc-300 font-bold bg-black/40 px-2 py-0.5 rounded-md">
                      {recordingTime}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={resetRecording}
                      className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition cursor-pointer"
                      title="Cancel Recording"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleSendVoiceClick}
                      className="px-3 py-2 rounded-xl flame-gradient-btn text-white text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Voice</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Standard Message & Voice Mic Input */
                <form onSubmit={handleSend} className="flex items-center gap-2">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    maxLength={500}
                    placeholder="Type a message or tap mic…"
                    aria-label="Message"
                    className="flex-1 min-w-0 bg-[#0a0a0c] border border-zinc-800 focus:border-[#FF5A26]/60 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none"
                  />

                  {/* Customer Voice Message Button */}
                  <button
                    type="button"
                    onClick={startRecording}
                    className="shrink-0 w-11 h-11 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-[#FF5A26] border border-zinc-700/60 flex items-center justify-center transition active:scale-95 cursor-pointer"
                    title="Record and send voice message to restaurant"
                  >
                    <Mic className="w-4 h-4" />
                  </button>

                  <button
                    type="submit"
                    disabled={!draft.trim() || sending}
                    aria-label="Send"
                    className="shrink-0 w-11 h-11 rounded-xl flame-gradient-btn text-white flex items-center justify-center disabled:opacity-40 active:scale-95 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
