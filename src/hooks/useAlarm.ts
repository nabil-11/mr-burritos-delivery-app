// ─── Ding-dong alarm loop for delivery notifications ─────────────────────────
// Uses Web Audio API — no mp3 file required.

let beepInterval: ReturnType<typeof setInterval> | null = null;
let autoStopTimer: ReturnType<typeof setTimeout> | null = null;
const AUTO_STOP_MS = 3 * 60_000; // stop automatically after 3 minutes

function playDing() {
  try {
    const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();

    const schedule = (freq: number, t: number, dur: number) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type           = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.55, t + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + dur);
    };

    const now = ctx.currentTime;
    schedule(880, now,        0.38); // high ding
    schedule(660, now + 0.24, 0.45); // low dong

    setTimeout(() => ctx.close(), 1_400);
  } catch {
    // Web Audio not available — silently skip
  }
}

/** Start repeating alarm. Call stopAlarm() to silence it. */
export function startAlarm() {
  stopAlarm(); // clear any previous alarm
  playDing();
  beepInterval  = setInterval(playDing, 2_000);
  autoStopTimer = setTimeout(stopAlarm, AUTO_STOP_MS);
}

/** Silence the alarm immediately. */
export function stopAlarm() {
  if (autoStopTimer !== null) { clearTimeout(autoStopTimer);   autoStopTimer = null; }
  if (beepInterval  !== null) { clearInterval(beepInterval);   beepInterval  = null; }
}
