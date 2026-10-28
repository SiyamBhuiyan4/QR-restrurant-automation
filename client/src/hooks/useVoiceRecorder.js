import { useState, useRef, useEffect, useCallback } from 'react';

const MAX_RECORDING_SECONDS = 30;

/**
 * Format elapsed seconds and max seconds into standard "M:SS / M:SS"
 * e.g., 8 seconds -> "0:08 / 0:30"
 */
function formatRecordingTime(currentSeconds, maxSeconds = MAX_RECORDING_SECONDS) {
  const safeCurrent = Math.min(Math.max(0, Math.floor(currentSeconds)), maxSeconds);
  const curMin = Math.floor(safeCurrent / 60);
  const curSec = safeCurrent % 60;

  const maxMin = Math.floor(maxSeconds / 60);
  const maxSec = maxSeconds % 60;

  const pad = (num) => (num < 10 ? `0${num}` : `${num}`);
  return `${curMin}:${pad(curSec)} / ${maxMin}:${pad(maxSec)}`;
}

/**
 * Custom hook to record voice instructions with browser MediaRecorder API.
 * 
 * Returns:
 * {
 *   isRecording,
 *   recordingTime,    // Formatted "0:08 / 0:30"
 *   audioBlob,
 *   audioUrl,
 *   error,
 *   startRecording,
 *   stopRecording,
 *   resetRecording
 * }
 */
export function useVoiceRecorder(options = {}) {
  const maxDuration = options.maxDuration || MAX_RECORDING_SECONDS;

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(() => formatRecordingTime(0, maxDuration));
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [error, setError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioStreamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const startTimeRef = useRef(null);
  const mimeTypeRef = useRef('audio/webm');

  // Clean up timers & object URLs
  const clearTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  const stopAudioTracks = useCallback(() => {
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (_) {}
      });
      audioStreamRef.current = null;
    }
  }, []);

  const resetRecording = useCallback(() => {
    clearTimer();

    if (mediaRecorderRef.current) {
      try {
        // Detach onstop callback before stopping so it won't overwrite reset state
        mediaRecorderRef.current.onstop = null;
        if (mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      } catch (_) {}
      mediaRecorderRef.current = null;
    }

    stopAudioTracks();
    chunksRef.current = [];

    setAudioUrl((prevUrl) => {
      if (prevUrl && prevUrl.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(prevUrl);
        } catch (_) {}
      }
      return null;
    });

    setAudioBlob(null);
    setDuration(0);
    setIsRecording(false);
    setError(null);
    setRecordingTime(formatRecordingTime(0, maxDuration));
  }, [clearTimer, stopAudioTracks, maxDuration]);

  const stopRecording = useCallback(() => {
    clearTimer();

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.warn('[useVoiceRecorder] Error stopping MediaRecorder:', err);
        stopAudioTracks();
      }
    } else {
      stopAudioTracks();
    }

    setIsRecording(false);
  }, [clearTimer, stopAudioTracks]);

  const startRecording = useCallback(async () => {
    setError(null);

    // 1. Check browser feature support
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const msg = 'Microphone access is not supported by your browser or requires a secure HTTPS connection.';
      setError(msg);
      return false;
    }

    // 2. Clear any previous recording session
    if (audioUrl && audioUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(audioUrl);
      } catch (_) {}
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
    chunksRef.current = [];
    setRecordingTime(formatRecordingTime(0, maxDuration));

    try {
      // 3. Request user microphone permission with fallback for constrained mobile audio
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
      } catch (constraintErr) {
        if (
          constraintErr.name === 'OverconstrainedError' ||
          constraintErr.name === 'ConstraintNotSatisfiedError'
        ) {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } else {
          throw constraintErr;
        }
      }
      audioStreamRef.current = stream;

      // 4. Select supported mime type (prefer WebM -> OGG -> MP4/AAC)
      let selectedMimeType = '';
      if (typeof MediaRecorder !== 'undefined') {
        const types = [
          'audio/webm;codecs=opus',
          'audio/webm',
          'audio/ogg;codecs=opus',
          'audio/ogg',
          'audio/mp4',
          'audio/aac'
        ];
        for (const t of types) {
          if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) {
            selectedMimeType = t;
            break;
          }
        }
      }

      const recorderOptions = selectedMimeType ? { mimeType: selectedMimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, recorderOptions);
      mediaRecorderRef.current = mediaRecorder;

      const actualMimeType = mediaRecorder.mimeType || selectedMimeType || 'audio/webm';
      mimeTypeRef.current = actualMimeType;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        if (!chunksRef.current || chunksRef.current.length === 0) {
          setIsRecording(false);
          stopAudioTracks();
          return;
        }

        const effectiveMimeType = mediaRecorder.mimeType || mimeTypeRef.current || 'audio/webm';
        const finalBlob = new Blob(chunksRef.current, {
          type: effectiveMimeType
        });

        if (finalBlob.size === 0) {
          setIsRecording(false);
          stopAudioTracks();
          return;
        }

        // Calculate recorded duration in seconds
        const recordedSeconds = startTimeRef.current
          ? Math.round(((Date.now() - startTimeRef.current) / 1000) * 10) / 10
          : 0;

        // Determine file extension from MIME type
        const lowerMime = effectiveMimeType.toLowerCase();
        let ext = 'webm';
        if (lowerMime.includes('ogg')) ext = 'ogg';
        else if (lowerMime.includes('mp4')) ext = 'mp4';
        else if (lowerMime.includes('aac')) ext = 'm4a';
        else if (lowerMime.includes('wav')) ext = 'wav';

        // Tag blob with metadata for consumers (Telegram client, preview UI)
        finalBlob.duration = recordedSeconds;
        finalBlob.name = `voice_instruction_${Date.now()}.${ext}`;

        const finalUrl = URL.createObjectURL(finalBlob);

        setAudioBlob(finalBlob);
        setAudioUrl(finalUrl);
        setDuration(recordedSeconds);
        setIsRecording(false);
        stopAudioTracks();
      };

      mediaRecorder.onerror = (event) => {
        console.error('[useVoiceRecorder] MediaRecorder error:', event.error);
        setError('An error occurred during audio recording.');
        stopRecording();
      };

      // Start recording with 200ms chunk slices (fallback for older engines)
      try {
        mediaRecorder.start(200);
      } catch (_) {
        mediaRecorder.start();
      }

      setIsRecording(true);
      startTimeRef.current = Date.now();

      // Live timer tick
      timerIntervalRef.current = setInterval(() => {
        if (!startTimeRef.current) return;
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        setRecordingTime(formatRecordingTime(elapsed, maxDuration));

        // Auto-stop when reaching max duration limit
        if (elapsed >= maxDuration) {
          stopRecording();
        }
      }, 200);

      return true;
    } catch (err) {
      console.warn('[useVoiceRecorder] getUserMedia error:', err);
      let userFriendlyMessage = 'Failed to access microphone.';

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        userFriendlyMessage =
          'Microphone permission was denied. Please allow microphone access in your browser site settings.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        userFriendlyMessage = 'No microphone device was detected on your phone or computer.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        userFriendlyMessage = 'Your microphone is currently in use by another app or call.';
      } else if (err.name === 'SecurityError') {
        userFriendlyMessage = 'Microphone recording requires a secure connection (HTTPS).';
      }

      setError(userFriendlyMessage);
      setIsRecording(false);
      stopAudioTracks();
      clearTimer();
      return false;
    }
  }, [audioUrl, maxDuration, stopRecording, stopAudioTracks, clearTimer]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      clearTimer();
      stopAudioTracks();
      if (audioUrl && audioUrl.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(audioUrl);
        } catch (_) {}
      }
    };
  }, [clearTimer, stopAudioTracks, audioUrl]);

  return {
    isRecording,
    recordingTime,
    duration,
    audioBlob,
    audioUrl,
    error,
    startRecording,
    stopRecording,
    resetRecording
  };
}

export default useVoiceRecorder;
