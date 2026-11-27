// Synthesizes a realistic mechanical DSLR shutter sound using the Web Audio API
// Completely standalone — zero external audio files or network requests required.

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!audioCtx && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

export function playShutterSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // 1. First mechanical click (Mirror lift / Shutter open)
  playMechanicalClick(ctx, now, 1200, 0.025, 0.4);
  playNoiseSnap(ctx, now, 0.03, 0.35);

  // 2. Second mechanical clack (Curtain close / Mirror drop ~75ms later)
  playMechanicalClick(ctx, now + 0.075, 850, 0.035, 0.5);
  playNoiseSnap(ctx, now + 0.075, 0.045, 0.4);
}

function playMechanicalClick(
  ctx: AudioContext,
  startTime: number,
  freq: number,
  duration: number,
  gainLevel: number
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, startTime);
  osc.frequency.exponentialRampToValueAtTime(150, startTime + duration);

  gain.gain.setValueAtTime(gainLevel, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration);
}

function playNoiseSnap(
  ctx: AudioContext,
  startTime: number,
  duration: number,
  gainLevel: number
) {
  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(2500, startTime);
  filter.Q.setValueAtTime(3, startTime);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(gainLevel, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  noise.start(startTime);
  noise.stop(startTime + duration);
}
