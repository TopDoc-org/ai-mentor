// Generates the focus-timer cue sounds as small 16-bit PCM mono WAVs into
// public/sounds/. Royalty-free (synthesized here), no external download, tiny.
// Run once: `node tools/gen-sounds.mjs`. Re-run to regenerate.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SR = 22050; // sample rate
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'sounds');

const note = (n) => 440 * Math.pow(2, (n - 69) / 12); // MIDI note -> Hz
const NOTES = { C5: 72, E5: 76, G5: 79, C6: 84, E6: 88, G6: 91, A5: 81 };

// A mono buffer of `seconds` we can mix tones into.
function buffer(seconds) {
  return new Float32Array(Math.ceil(SR * seconds));
}

// Add a tone into buf starting at `at` seconds for `dur` seconds, with a short
// attack + exponential-ish decay envelope so there are no clicks.
function tone(buf, at, dur, freq, { type = 'sine', gain = 0.5, decay = 4 } = {}) {
  const start = Math.floor(at * SR);
  const len = Math.floor(dur * SR);
  const attack = Math.min(0.008 * SR, len * 0.2); // ~8ms fade-in
  for (let i = 0; i < len; i++) {
    const idx = start + i;
    if (idx >= buf.length) break;
    const t = i / SR;
    const phase = 2 * Math.PI * freq * t;
    let s;
    if (type === 'square') s = Math.sign(Math.sin(phase));
    else if (type === 'triangle') s = (2 / Math.PI) * Math.asin(Math.sin(phase));
    else s = Math.sin(phase);
    const env = (i < attack ? i / attack : 1) * Math.exp((-decay * i) / len);
    buf[idx] += s * gain * env;
  }
}

// Encode a Float32 mono buffer to a 16-bit PCM WAV Buffer (clamped, mild headroom).
function toWav(buf) {
  const n = buf.length;
  const bytes = Buffer.alloc(44 + n * 2);
  bytes.write('RIFF', 0);
  bytes.writeUInt32LE(36 + n * 2, 4);
  bytes.write('WAVE', 8);
  bytes.write('fmt ', 12);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20); // PCM
  bytes.writeUInt16LE(1, 22); // mono
  bytes.writeUInt32LE(SR, 24);
  bytes.writeUInt32LE(SR * 2, 28); // byte rate
  bytes.writeUInt16LE(2, 32); // block align
  bytes.writeUInt16LE(16, 34); // bits
  bytes.write('data', 36);
  bytes.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    let s = Math.max(-1, Math.min(1, buf[i] * 0.85));
    bytes.writeInt16LE((s * 32767) | 0, 44 + i * 2);
  }
  return bytes;
}

// --- start: quick rising two-note chime -----------------------------------
function startChime() {
  const b = buffer(0.45);
  tone(b, 0.0, 0.18, note(NOTES.C6), { gain: 0.5, decay: 3 });
  tone(b, 0.12, 0.30, note(NOTES.E6), { gain: 0.55, decay: 3 });
  return toWav(b);
}

// --- finish: attention alarm — repeating beep bursts ----------------------
function finishAlarm() {
  const b = buffer(1.65);
  const f = note(NOTES.A5);
  for (let k = 0; k < 4; k++) {
    const at = k * 0.4;
    tone(b, at, 0.12, f, { type: 'square', gain: 0.32, decay: 5 });
    tone(b, at + 0.15, 0.12, f * 1.5, { type: 'square', gain: 0.3, decay: 5 });
  }
  return toWav(b);
}

// --- win: ascending arpeggio flourish -------------------------------------
function winFlourish() {
  const b = buffer(0.85);
  const seq = [NOTES.C5, NOTES.E5, NOTES.G5, NOTES.C6];
  seq.forEach((nn, i) => tone(b, i * 0.11, 0.35, note(nn), { gain: 0.5, decay: 3.5 }));
  tone(b, 0.44, 0.4, note(NOTES.E6), { gain: 0.45, decay: 3 });
  return toWav(b);
}

mkdirSync(OUT, { recursive: true });
const files = { 'start.wav': startChime(), 'finish.wav': finishAlarm(), 'win.wav': winFlourish() };
for (const [name, data] of Object.entries(files)) {
  writeFileSync(join(OUT, name), data);
  console.log(`wrote ${name} (${(data.length / 1024).toFixed(1)} KB)`);
}
