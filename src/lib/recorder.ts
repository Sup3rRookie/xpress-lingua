import { Platform } from 'react-native';
import { registerPlayback, stopPlayback } from './audio';

// Record-and-compare, web implementation (MediaRecorder).
// Native recording lands with expo-av when we wrap for the stores.
let mediaRecorder: MediaRecorder | null = null;
let chunks: Blob[] = [];
let lastUrl: string | null = null;

export const recordingSupported = () =>
  Platform.OS === 'web' &&
  typeof navigator !== 'undefined' &&
  !!navigator.mediaDevices?.getUserMedia;

export async function startRecording(): Promise<boolean> {
  if (!recordingSupported()) return false;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    chunks = [];
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
    mediaRecorder.start();
    return true;
  } catch {
    return false;
  }
}

export function stopRecording(): Promise<string | null> {
  return new Promise((resolve) => {
    if (!mediaRecorder) return resolve(null);
    const rec = mediaRecorder;
    rec.onstop = () => {
      rec.stream.getTracks().forEach((t) => t.stop());
      if (lastUrl) URL.revokeObjectURL(lastUrl);
      lastUrl = URL.createObjectURL(new Blob(chunks, { type: 'audio/webm' }));
      mediaRecorder = null;
      resolve(lastUrl);
    };
    rec.stop();
  });
}

export function playUrl(url: string) {
  // Play the user's own take through the shared single-playback gate so it stops
  // any card audio and is itself stopped on the next play or screen unmount.
  stopPlayback();
  const audio = new Audio(url);
  const unregister = registerPlayback(() => {
    try {
      audio.pause();
    } catch {
      // ignore
    }
  });
  audio.onended = unregister;
  audio.onerror = unregister;
  audio.play().catch(unregister);
}
