import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Trash2, Play, Pause, AlertCircle, Volume2, CheckCircle2 } from 'lucide-react';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { useCart } from '../context/CartContext';

/**
 * VoiceRecorder Component
 * 
 * Features:
 * - "Tap to Record Voice Instruction" button with mic icon
 * - Pulsing animated waveform and recording indicator with live timer (0:08 / 0:30)
 * - Built-in audio playback preview with scrubber, play/pause, and delete button
 * - Explanatory tip for customer voice customizations
 * - Synchronizes directly with CartContext or optional callbacks
 */
export default function VoiceRecorder({
  onVoiceChange,
  className = ''
}) {
  // Try using CartContext if mounted, otherwise graceful standalone fallback
  let cart = null;
  try {
    cart = useCart();
  } catch (_) {
    cart = null;
  }

  const {
    isRecording,
    recordingTime,
    audioBlob,
    audioUrl,
    error,
    startRecording,
    stopRecording,
    resetRecording
  } = useVoiceRecorder({ maxDuration: 30 });

  // Sync with CartContext or props when recording completes
  useEffect(() => {
    if (audioBlob && audioUrl) {
      if (cart?.setVoiceNote) {
        cart.setVoiceNote(audioBlob, audioUrl);
      }
      if (onVoiceChange) {
        onVoiceChange(audioBlob, audioUrl);
      }
    }
  }, [audioBlob, audioUrl, cart, onVoiceChange]);

  // Determine current active audio (either newly recorded or existing from CartContext)
  const activeUrl = audioUrl || cart?.voiceUrl || null;

  // Audio playback state
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [playbackTime, setPlaybackTime] = useState('0:00');
  const [totalDuration, setTotalDuration] = useState('0:00');

  const formatSeconds = (sec) => {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setTotalDuration(formatSeconds(audioRef.current.duration));
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      const duration = audioRef.current.duration || 1;
      setPlaybackTime(formatSeconds(current));
      setPlaybackProgress((current / duration) * 100);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setPlaybackProgress(0);
    setPlaybackTime('0:00');
  };

  const togglePlayback = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((e) => {
        console.warn('[VoiceRecorder] Audio play error:', e);
      });
    }
  };

  const handleSeek = (e) => {
    if (!audioRef.current) return;
    const seekPercent = parseFloat(e.target.value);
    const newTime = (seekPercent / 100) * (audioRef.current.duration || 0);
    audioRef.current.currentTime = newTime;
    setPlaybackProgress(seekPercent);
  };

  const handleDeleteAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
    setPlaybackProgress(0);
    resetRecording();

    if (cart?.clearVoiceNote) {
      cart.clearVoiceNote();
    }
    if (onVoiceChange) {
      onVoiceChange(null, null);
    }
  };

  return (
    <div className={`w-full bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 transition-all ${className}`}>
      
      {/* Hidden audio element for preview */}
      {activeUrl && (
        <audio
          ref={audioRef}
          src={activeUrl}
          preload="metadata"
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
        />
      )}

      {/* Header section with icon & title */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
            🎙️
          </div>
          <div>
            <h4 className="text-sm font-bold text-neutral-800">Voice Instructions</h4>
            <p className="text-[11px] text-neutral-500 font-medium">
              Record specific cooking instructions for the kitchen
            </p>
          </div>
        </div>

        {activeUrl && !isRecording && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200/80">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Audio Attached
          </span>
        )}
      </div>

      {/* Explanatory Tip Banner */}
      {!activeUrl && !isRecording && (
        <div className="mb-3.5 px-3 py-2 bg-amber-50/90 border border-amber-200/70 rounded-xl text-xs text-amber-900 flex items-start gap-2">
          <span className="text-sm shrink-0">💡</span>
          <span className="leading-snug">
            <strong>Tell the chef how you like your food:</strong> (e.g., &ldquo;extra crispy fries&rdquo;, &ldquo;dressing strictly on the side&rdquo;, &ldquo;make the curry very mild&rdquo;).
          </span>
        </div>
      )}

      {/* Error notification */}
      {error && (
        <div className="mb-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 animate-fadeIn">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="leading-tight">{error}</div>
        </div>
      )}

      {/* STATE 1: Active Recording UI */}
      {isRecording && (
        <div className="bg-rose-500/10 border border-rose-400/40 rounded-xl p-4 flex flex-col items-center justify-center gap-3 animate-pulse">
          
          {/* Animated Waveform Visualizer */}
          <div className="flex items-center justify-center gap-1 h-8">
            <span className="w-1.5 h-3 bg-rose-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-6 bg-rose-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-8 bg-rose-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            <span className="w-1.5 h-5 bg-rose-500 rounded-full animate-bounce" style={{ animationDelay: '75ms' }} />
            <span className="w-1.5 h-7 bg-rose-500 rounded-full animate-bounce" style={{ animationDelay: '225ms' }} />
            <span className="w-1.5 h-4 bg-rose-500 rounded-full animate-bounce" style={{ animationDelay: '350ms' }} />
          </div>

          {/* Pulsing indicator & Live Timer */}
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600"></span>
            </span>
            <span className="text-xs font-bold text-rose-800 tracking-wide uppercase">
              Recording Voice
            </span>
            <span className="font-mono text-xs font-bold text-rose-900 bg-rose-200/80 px-2 py-0.5 rounded-md">
              {recordingTime}
            </span>
          </div>

          {/* Stop Recording Button */}
          <button
            type="button"
            onClick={stopRecording}
            className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 transition-all active:scale-95 cursor-pointer"
          >
            <Square className="w-4 h-4 fill-current" />
            Done / Stop Recording
          </button>
        </div>
      )}

      {/* STATE 2: Recorded Audio Preview & Playback UI */}
      {!isRecording && activeUrl && (
        <div className="bg-white border border-neutral-200/90 rounded-xl p-3 shadow-2xs flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-700 flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-neutral-500" />
              Kitchen Voice Note Preview
            </span>
            <span className="text-xs font-mono font-medium text-neutral-500">
              {playbackTime} / {totalDuration}
            </span>
          </div>

          {/* Controls: Play/Pause, Scrubber & Delete */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={togglePlayback}
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-white transition active:scale-95 shrink-0 shadow-xs cursor-pointer ${
                isPlaying ? 'bg-amber-600 hover:bg-amber-700' : 'bg-neutral-900 hover:bg-neutral-800'
              }`}
              title={isPlaying ? 'Pause' : 'Play audio preview'}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current translate-x-0.5" />
              )}
            </button>

            {/* Audio Scrubber Range */}
            <input
              type="range"
              min="0"
              max="100"
              step="0.5"
              value={playbackProgress}
              onChange={handleSeek}
              aria-label="Seek audio preview"
              className="flex-1 h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-amber-500 hover:accent-amber-600"
            />

            {/* Delete / Re-record Button */}
            <button
              type="button"
              onClick={handleDeleteAudio}
              className="p-2 rounded-xl text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition active:scale-95 shrink-0 cursor-pointer"
              title="Delete and re-record"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STATE 3: Idle - Tap/Hold to Record Button */}
      {!isRecording && !activeUrl && (
        <button
          type="button"
          onClick={startRecording}
          className="w-full py-3 px-4 rounded-xl bg-white hover:bg-amber-50 active:bg-amber-100 text-amber-700 border-2 border-dashed border-amber-300/80 hover:border-amber-400 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-2xs transition-all active:scale-98 cursor-pointer group"
        >
          <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
            <Mic className="w-4 h-4" />
          </div>
          <span>Tap to Record Voice Instruction</span>
        </button>
      )}

    </div>
  );
}
