import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw, FastForward, Rewind, Volume2, VolumeX, AlertCircle } from 'lucide-react';

/**
 * AudioPlayer Component
 * 
 * Clean, high-contrast, reliable HTML5 audio player designed for kitchen tablets and monitors.
 * Features:
 * - Play / Pause toggle with large touch target
 * - Scrubbable progress bar with visual playback progress
 * - Elapsed & total duration display (mm:ss / mm:ss)
 * - Playback speed control toggle (1x, 1.25x, 1.5x)
 * - Fast seek (-5s, +5s) for quick review of customer instructions
 * - High-contrast dark mode styling for kitchen visibility
 */
export default function AudioPlayer({
  src,
  url,
  title = 'Voice Note',
  autoPlay = false,
  className = ''
}) {
  const audioSrc = src || url;
  const audioRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Available speeds as specified in requirements (1x, 1.25x)
  const speeds = [1, 1.25, 1.5];

  // Format seconds to mm:ss
  const formatTime = (timeInSeconds) => {
    if (!timeInSeconds || isNaN(timeInSeconds) || timeInSeconds < 0) return '0:00';
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  // Sync playback rate to audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Reset state when audio source changes
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setHasError(false);
    setIsLoading(Boolean(audioSrc));

    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.load();
    }
  }, [audioSrc]);

  // Audio event listeners
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || 0);
      setIsLoading(false);
      setHasError(false);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      // Fallback if duration wasn't ready at metadata
      if (!duration && audioRef.current.duration) {
        setDuration(audioRef.current.duration);
      }
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleError = () => {
    setIsLoading(false);
    setIsPlaying(false);
    setHasError(true);
  };

  // Play / Pause toggle
  const togglePlay = useCallback(async () => {
    if (!audioRef.current || hasError) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        setIsLoading(true);
        await audioRef.current.play();
        setIsPlaying(false); // Handled by onPlay / onPlaying
      }
    } catch (err) {
      console.warn('Audio playback error:', err);
      setIsPlaying(false);
      setIsLoading(false);
    }
  }, [isPlaying, hasError]);

  // Scrub progress slider
  const handleSeek = (e) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  // Seek relative (-5s / +5s)
  const seekRelative = (deltaSeconds) => {
    if (!audioRef.current) return;
    const newTime = Math.max(0, Math.min(duration || 0, audioRef.current.currentTime + deltaSeconds));
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Cycle speed (1x -> 1.25x -> 1.5x -> 1x)
  const cyclePlaybackRate = () => {
    const currentIndex = speeds.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % speeds.length;
    const nextSpeed = speeds[nextIndex];
    setPlaybackRate(nextSpeed);
  };

  // Toggle Mute
  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  // Resolve source URL: if it's relative like /uploads or uploads, allow fallback to server host
  const resolveAudioUrl = (urlStr) => {
    if (!urlStr) return '';
    if (urlStr.startsWith('http://') || urlStr.startsWith('https://') || urlStr.startsWith('blob:') || urlStr.startsWith('data:')) {
      return urlStr;
    }
    // If running in dev or deployed with backend
    const apiBase = import.meta.env?.VITE_API_URL || '';
    const cleanPath = urlStr.startsWith('/') ? urlStr : `/${urlStr}`;
    return apiBase ? `${apiBase}${cleanPath}` : cleanPath;
  };

  const finalSrc = resolveAudioUrl(audioSrc);
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!audioSrc) {
    return (
      <div className={`p-3 bg-slate-800/80 rounded-xl border border-slate-700 text-slate-400 text-xs italic ${className}`}>
        No audio instruction provided.
      </div>
    );
  }

  return (
    <div
      className={`bg-slate-900/90 border border-slate-700/70 rounded-xl p-3 shadow-lg select-none ${className}`}
      role="region"
      aria-label="Kitchen Audio Player"
    >
      {/* Hidden HTML5 Audio Element */}
      <audio
        ref={audioRef}
        src={finalSrc}
        autoPlay={autoPlay}
        preload="metadata"
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onPlay={() => {
          setIsPlaying(true);
          setIsLoading(false);
        }}
        onPause={() => setIsPlaying(false)}
        onEnded={handleEnded}
        onError={handleError}
        onWaiting={() => setIsLoading(true)}
        onPlaying={() => setIsLoading(false)}
      />

      {/* Error state */}
      {hasError ? (
        <div className="flex items-center gap-2 text-rose-400 bg-rose-950/40 border border-rose-800/60 p-2.5 rounded-lg text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="font-medium">Audio note unavailable or format not supported.</span>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {/* Top Bar: Play / Pause, Progress Slider & Duration Display */}
          <div className="flex items-center gap-2.5">
            {/* Play/Pause Button - Large Touch Target for Kitchen */}
            <button
              type="button"
              onClick={togglePlay}
              disabled={isLoading && !isPlaying}
              aria-label={isPlaying ? 'Pause voice instruction' : 'Play voice instruction'}
              className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center font-bold transition-all transform active:scale-95 cursor-pointer shadow-md ${
                isPlaying
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/25 ring-2 ring-amber-400/50'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/25 ring-2 ring-emerald-400/50'
              }`}
            >
              {isLoading && !isPlaying ? (
                <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current translate-x-0.5" />
              )}
            </button>

            {/* Scrubber & Timers */}
            <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
              <div className="flex items-center justify-between text-xs font-mono font-semibold">
                <span className="text-amber-400">{formatTime(currentTime)}</span>
                <span className="text-slate-400">{formatTime(duration)}</span>
              </div>

              {/* Custom High-Contrast Progress Bar */}
              <div className="relative w-full h-3 flex items-center">
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  step="0.1"
                  value={currentTime}
                  onChange={handleSeek}
                  aria-label="Audio scrubber"
                  className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400 hover:accent-amber-300 focus:outline-hidden"
                  style={{
                    background: `linear-gradient(to right, #f59e0b 0%, #f59e0b ${progressPercent}%, #334155 ${progressPercent}%, #334155 100%)`
                  }}
                />
              </div>
            </div>
          </div>

          {/* Bottom Controls Row: Quick Seek, Speed Toggle & Mute */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-xs">
            {/* Quick Seek Buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => seekRelative(-5)}
                className="inline-flex items-center gap-0.5 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 active:scale-95 text-[11px] font-medium transition cursor-pointer"
                title="Rewind 5 seconds"
              >
                <Rewind className="w-3 h-3" />
                <span>-5s</span>
              </button>

              <button
                type="button"
                onClick={() => seekRelative(5)}
                className="inline-flex items-center gap-0.5 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 active:scale-95 text-[11px] font-medium transition cursor-pointer"
                title="Forward 5 seconds"
              >
                <span>+5s</span>
                <FastForward className="w-3 h-3" />
              </button>

              <button
                type="button"
                onClick={() => {
                  if (audioRef.current) {
                    audioRef.current.currentTime = 0;
                    setCurrentTime(0);
                  }
                }}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 active:scale-95 transition cursor-pointer"
                title="Replay from start"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>

            {/* Right: Speed Control & Mute */}
            <div className="flex items-center gap-1.5">
              {/* Speed Control Button (1x, 1.25x, 1.5x) */}
              <button
                type="button"
                onClick={cyclePlaybackRate}
                className="px-2.5 py-0.5 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-mono font-bold text-xs tracking-tight transition active:scale-95 cursor-pointer"
                title="Toggle playback speed"
              >
                ⚡ {playbackRate}x
              </button>

              {/* Volume / Mute toggle */}
              <button
                type="button"
                onClick={toggleMute}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? (
                  <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
