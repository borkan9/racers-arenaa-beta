let audioContext: AudioContext | null = null;

/** Start the audio context directly from the driver's tap to satisfy mobile autoplay rules. */
export function primeCountdownAudio(): void {
  if (typeof window === "undefined") return;
  const AudioContextConstructor = window.AudioContext;
  if (!AudioContextConstructor) return;

  try {
    audioContext ??= new AudioContextConstructor();
    if (audioContext.state === "suspended") void audioContext.resume();
  } catch {
    // Keep the countdown usable on browsers that don't provide Web Audio.
  }
}

export function playCountdownBeep(isStart: boolean): void {
  if (!audioContext || audioContext.state !== "running") return;

  const now = audioContext.currentTime;
  const duration = isStart ? 0.62 : 0.14;
  const gain = audioContext.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(isStart ? 0.19 : 0.13, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  gain.connect(audioContext.destination);

  const frequencies = isStart ? [440, 554] : [880];
  for (const frequency of frequencies) {
    const oscillator = audioContext.createOscillator();
    oscillator.type = isStart ? "sawtooth" : "triangle";
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.connect(gain);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }
}
