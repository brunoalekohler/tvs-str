/**
 * Web Audio API based industrial sound synthesizer.
 * Provides rich, professional, low-to-mid frequency broadcast chimes.
 * No external audio files needed; runs natively, reliably and smoothly.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Ensures audio context is active upon first user interaction
 */
export function unlockAudio(): boolean {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    return true;
  } catch (e) {
    console.warn('Could not unlock audio:', e);
    return false;
  }
}

/**
 * Professional, Warm Industrial Alert Chime (Non-acute / non-screechy)
 * Uses deep, resonant tones (A3, C#4, E4, A4) with sine & triangle harmonics,
 * sounding like an authoritative corporate / airport / modern facility priority broadcast chime.
 */
export function playEventAlertAlarm(durationMs: number = 8000): () => void {
  try {
    const ctx = getAudioContext();
    const startTime = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.75, startTime);
    masterGain.connect(ctx.destination);

    const activeNodes: OscillatorNode[] = [];

    // Chime cadence: 4-note warm chime repeating every 2.4 seconds
    // Notes: A3 (220Hz), E4 (329.6Hz), C#4 (277.2Hz), A3 (220Hz) - Warm, rich, authoritative
    const melody = [
      { freq: 220.0, offset: 0.0, duration: 0.55 },   // A3 (warm fundamental)
      { freq: 277.18, offset: 0.22, duration: 0.55 }, // C#4
      { freq: 329.63, offset: 0.44, duration: 0.65 }, // E4
      { freq: 440.0, offset: 0.70, duration: 0.95 },  // A4 (resonant anchor)
    ];

    const cyclePeriod = 2.2; // Repeat chime cycle every 2.2 seconds
    const totalCycles = Math.ceil(durationMs / 1000 / cyclePeriod);

    for (let cycle = 0; cycle < totalCycles; cycle++) {
      const cycleStart = startTime + cycle * cyclePeriod;

      melody.forEach((note) => {
        const noteStart = cycleStart + note.offset;
        if (noteStart >= startTime + durationMs / 1000) return;

        // 1. Primary warm tone (Sine)
        const oscPrimary = ctx.createOscillator();
        const gainPrimary = ctx.createGain();
        oscPrimary.type = 'sine';
        oscPrimary.frequency.setValueAtTime(note.freq, noteStart);

        // Smooth attack to avoid click, gentle natural exponential bell decay
        gainPrimary.gain.setValueAtTime(0.001, noteStart);
        gainPrimary.gain.linearRampToValueAtTime(0.65, noteStart + 0.03);
        gainPrimary.gain.exponentialRampToValueAtTime(0.001, noteStart + note.duration);

        oscPrimary.connect(gainPrimary);
        gainPrimary.connect(masterGain);
        oscPrimary.start(noteStart);
        oscPrimary.stop(noteStart + note.duration + 0.05);
        activeNodes.push(oscPrimary);

        // 2. Body resonance tone (Triangle, warm octave body)
        const oscBody = ctx.createOscillator();
        const gainBody = ctx.createGain();
        oscBody.type = 'triangle';
        // Sub-body one octave lower for warmth and richness
        oscBody.frequency.setValueAtTime(note.freq * 0.5, noteStart);

        gainBody.gain.setValueAtTime(0.001, noteStart);
        gainBody.gain.linearRampToValueAtTime(0.35, noteStart + 0.04);
        gainBody.gain.exponentialRampToValueAtTime(0.001, noteStart + note.duration);

        oscBody.connect(gainBody);
        gainBody.connect(masterGain);
        oscBody.start(noteStart);
        oscBody.stop(noteStart + note.duration + 0.05);
        activeNodes.push(oscBody);
      });
    }

    // Return stop function for immediate muting or dialog closing
    return () => {
      try {
        masterGain.gain.setValueAtTime(masterGain.gain.value, ctx.currentTime);
        masterGain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.15);
        setTimeout(() => {
          activeNodes.forEach((node) => {
            try {
              node.stop();
            } catch {}
          });
        }, 180);
      } catch {}
    };
  } catch (err) {
    console.error('Audio playback error:', err);
    return () => {};
  }
}

/**
 * Pleasant melodic announcement chime for shift start (warm C-Major triad)
 */
export function playShiftAnnouncementChime(): void {
  try {
    const ctx = getAudioContext();
    const t = ctx.currentTime;
    // Warm lower register notes: C4 (261.6Hz), E4 (329.6Hz), G4 (392.0Hz)
    const notes = [261.63, 329.63, 392.0, 523.25];

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const noteStart = t + idx * 0.25;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteStart);

      gain.gain.setValueAtTime(0.001, noteStart);
      gain.gain.linearRampToValueAtTime(0.45, noteStart + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 1.2);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(noteStart);
      osc.stop(noteStart + 1.3);
    });
  } catch (err) {
    console.error('Shift chime error:', err);
  }
}
