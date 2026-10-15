#!/usr/bin/env python3
"""Generate warm ambient track for Camrhia brag video. ~20s WAV."""
import wave, struct, math, os

SR    = 44100
DUR   = 20.0
N     = int(SR * DUR)
OUT   = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'audio.wav')

def note_freq(semitones_from_A4=0):
    return 440.0 * (2 ** (semitones_from_A4 / 12.0))

# D major scale relative to D3
D3  = note_freq(-19)   # D3 ~146.8 Hz
Fs3 = note_freq(-17)   # F#3
A3  = note_freq(-15)   # A3
D4  = note_freq(-7)    # D4
Fs4 = note_freq(-5)    # F#4
A4  = note_freq(-3)    # A4
B4  = note_freq(-2)    # B4
D5  = note_freq(5)     # D5

def env(t, attack=0.01, decay=0.1, sustain=0.7, release=0.3, dur=1.0):
    """ADSR envelope."""
    if t < attack:
        return t / attack
    elif t < attack + decay:
        return 1.0 - (1.0 - sustain) * (t - attack) / decay
    elif t < dur - release:
        return sustain
    elif t < dur:
        return sustain * (1.0 - (t - (dur - release)) / release)
    return 0.0

def sine(freq, t_arr, amp=1.0):
    return [amp * math.sin(2 * math.pi * freq * t) for t in t_arr]

def add_note(buf, freq, start_s, dur_s, amp=0.3, harmonics=True):
    """Add a note to the buffer with envelope and slight harmonics."""
    s0 = int(start_s * SR)
    s1 = min(len(buf), s0 + int(dur_s * SR))
    for i in range(s0, s1):
        t = (i - s0) / SR
        e = env(t, attack=0.02, decay=0.15, sustain=0.65, release=0.4, dur=dur_s)
        v  = amp * e * math.sin(2 * math.pi * freq * t)
        if harmonics:
            v += (amp * 0.25 * e * math.sin(2 * math.pi * freq * 2 * t))
            v += (amp * 0.08 * e * math.sin(2 * math.pi * freq * 3 * t))
        buf[i] = max(-1.0, min(1.0, buf[i] + v))

def add_pad(buf, freqs, start_s, dur_s, amp=0.12):
    """Soft pad chord."""
    s0 = int(start_s * SR)
    s1 = min(len(buf), s0 + int(dur_s * SR))
    for freq in freqs:
        for i in range(s0, s1):
            t = (i - s0) / SR
            e = env(t, attack=0.4, decay=0.2, sustain=0.8, release=0.8, dur=dur_s)
            v = amp * e * math.sin(2 * math.pi * freq * t)
            v += amp * 0.15 * e * math.sin(2 * math.pi * freq * 1.5 * t + 0.1)
            buf[i] = max(-1.0, min(1.0, buf[i] + v))

def add_pulse(buf, freq, start_s, end_s, rate=2.0, amp=0.08):
    """Subtle rhythmic pulse."""
    s0 = int(start_s * SR)
    s1 = int(end_s * SR)
    period = int(SR / rate)
    for i in range(s0, s1):
        beat_phase = ((i - s0) % period) / period
        beat_env = math.exp(-beat_phase * 6) * amp
        t = i / SR
        v = beat_env * math.sin(2 * math.pi * freq * t)
        buf[i] = max(-1.0, min(1.0, buf[i] + v))

def add_chime(buf, freq, start_s, amp=0.18):
    """Short sparkle chime."""
    s0 = int(start_s * SR)
    dur_s = 0.8
    s1 = min(len(buf), s0 + int(dur_s * SR))
    for i in range(s0, s1):
        t = (i - s0) / SR
        e = math.exp(-t * 8)
        v = amp * e * math.sin(2 * math.pi * freq * t)
        v += amp * 0.4 * e * math.sin(2 * math.pi * freq * 2 * t)
        buf[i] = max(-1.0, min(1.0, buf[i] + v))

def master_limiter(buf, threshold=0.85):
    peak = max(abs(x) for x in buf)
    if peak > threshold:
        scale = threshold / peak
        return [x * scale for x in buf]
    return buf

buf = [0.0] * N

# ─── Hook scene (0–2.5s): gentle piano arpeggio in D major ───────────────────
arpeggio = [D4, Fs4, A4, D5, A4, Fs4, D4]
for i, freq in enumerate(arpeggio):
    add_note(buf, freq, i * 0.32, 0.7, amp=0.28)

# ─── Reveal scene (2.5–6s): full D major chord pad + bass ──────────────────
add_pad(buf, [D3, A3, D4, Fs4], 2.5, 3.8, amp=0.10)
add_note(buf, D3, 2.5, 3.5, amp=0.15, harmonics=False)
# Pulse starts
add_pulse(buf, D3 * 2, 2.8, 6.0, rate=2.0, amp=0.06)

# Second arpeggio phrase
for i, freq in enumerate([Fs4, A4, D5, A4]):
    add_note(buf, freq, 3.0 + i * 0.4, 0.6, amp=0.22)

# ─── Feature 1 (6–9.5s): chime + sustained pad ─────────────────────────────
add_chime(buf, D5, 6.0, amp=0.20)
add_pad(buf, [D3, Fs3, A3, D4], 6.0, 3.8, amp=0.09)
add_pulse(buf, D3 * 2, 6.0, 9.5, rate=2.0, amp=0.06)
for i, freq in enumerate([A4, D5, Fs4, A4]):
    add_note(buf, freq, 6.4 + i * 0.38, 0.55, amp=0.20)

# ─── Feature 2 (9.5–13s): chime + slight lift ──────────────────────────────
add_chime(buf, A4, 9.5, amp=0.18)
add_pad(buf, [A3, D4, Fs4, A4], 9.5, 3.8, amp=0.09)
add_pulse(buf, D3 * 2, 9.5, 13.0, rate=2.0, amp=0.06)
for i, freq in enumerate([D5, A4, D5, Fs4]):
    add_note(buf, freq, 9.9 + i * 0.38, 0.55, amp=0.20)

# ─── Feature 3 (13–16.5s): chime + build ───────────────────────────────────
add_chime(buf, Fs4, 13.0, amp=0.18)
add_pad(buf, [D3, A3, D4, Fs4, A4], 13.0, 3.8, amp=0.10)
add_pulse(buf, D3 * 2, 13.0, 16.5, rate=2.5, amp=0.07)
for i, freq in enumerate([Fs4, A4, D5, A4, Fs4]):
    add_note(buf, freq, 13.3 + i * 0.34, 0.55, amp=0.21)

# ─── Outro (16.5–20s): soft swell, resolving ───────────────────────────────
add_pad(buf, [D3, Fs3, A3, D4, A4], 16.5, 4.0, amp=0.14)
for i, freq in enumerate([D4, Fs4, A4, D5]):
    add_note(buf, freq, 16.8 + i * 0.45, 1.2, amp=0.22)
# Fade tail
fade_start = int(18.5 * SR)
for i in range(fade_start, N):
    t = (i - fade_start) / (N - fade_start)
    buf[i] *= 1.0 - t

buf = master_limiter(buf, 0.88)

# Write WAV
with wave.open(OUT, 'w') as wf:
    wf.setnchannels(1)
    wf.setsampwidth(2)
    wf.setframerate(SR)
    for s in buf:
        wf.writeframes(struct.pack('<h', int(s * 32767)))

print(f"Audio written: {OUT}")
