/**
 * Sound effect manager for the Indian Tycoon board game.
 * Uses expo-audio (the modern replacement for the deprecated expo-av).
 *
 * Generates procedural WAV tones as data URIs so we don't
 * need any bundled audio asset files.
 */
import { createAudioPlayer, AudioPlayer } from 'expo-audio';

let dicePlayer: AudioPlayer | null = null;
let tokenPlayer: AudioPlayer | null = null;

/**
 * Initialize the audio system. Safe to call multiple times.
 * With expo-audio there's no global setAudioModeAsync needed for simple playback.
 */
export function initAudio(): void {
  // No-op — expo-audio doesn't require a global init for basic playback.
}

/**
 * Play a dice-roll sound effect.
 */
export function playDiceRollSound(): void {
  try {
    if (!dicePlayer) {
      const uri = generateToneDataUri(440, 0.12);
      dicePlayer = createAudioPlayer(uri);
      dicePlayer.volume = 0.5;
    }
    dicePlayer.seekTo(0);
    dicePlayer.play();
  } catch {
    // Sound is non-critical — silently ignore errors
  }
}

/**
 * Play a token-move "hop" sound effect.
 * A quick, higher-pitched blip for each step.
 */
export function playTokenMoveSound(): void {
  try {
    if (!tokenPlayer) {
      const uri = generateToneDataUri(660, 0.06);
      tokenPlayer = createAudioPlayer(uri);
      tokenPlayer.volume = 0.35;
    }
    tokenPlayer.seekTo(0);
    tokenPlayer.play();
  } catch {
    // Silently fail
  }
}

/**
 * Clean up all loaded sounds. Call when leaving the game screen.
 */
export function unloadAllSounds(): void {
  // Not strictly necessary since we reuse a single instance,
  // but we can try to call release if it exists at runtime.
  try {
    if (dicePlayer && 'release' in dicePlayer) {
      (dicePlayer as any).release();
    }
    dicePlayer = null;

    if (tokenPlayer && 'release' in tokenPlayer) {
      (tokenPlayer as any).release();
    }
    tokenPlayer = null;
  } catch {
    // ignore
  }
}

// ── Tone Generator ──────────────────────────────────────────────────

/**
 * Generate a base64 WAV data URI containing a pure sine-wave tone.
 * This avoids needing any bundled audio assets.
 */
function generateToneDataUri(frequency: number, durationSec: number): string {
  const sampleRate = 22050;
  const numSamples = Math.floor(sampleRate * durationSec);
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = numSamples * blockAlign;
  const headerSize = 44;
  const fileSize = headerSize + dataSize;

  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, fileSize - 8, true);
  writeString(view, 8, 'WAVE');

  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);          // chunk size
  view.setUint16(20, 1, true);           // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Write sine wave samples with a quick fade-out envelope
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const envelope = 1 - (i / numSamples); // linear fade-out
    const sample = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.8;
    const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
    view.setInt16(headerSize + i * 2, intSample, true);
  }

  // Convert to base64
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return `data:audio/wav;base64,${base64}`;
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
