#!/usr/bin/env python3
"""Beat-driven audio for Camrhia v2. 116 BPM, 16s, warm minimal electronic."""
import wave, struct, math, os, random

SR   = 44100
DUR  = 16.0
N    = int(SR * DUR)
BPM  = 116
BEAT = 60.0 / BPM
OUT  = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'audio2.wav')

buf = [0.0] * N

def clamp(v, lo=-1.0, hi=1.0):
    return max(lo, min(hi, v))

# ── Oscillators ───────────────────────────────────────────────────────────────
def sine(f, t):   return math.sin(2*math.pi*f*t)
def saw(f, t):    p = (f*t) % 1.0; return 2*p - 1
def tri(f, t):    p = (f*t) % 1.0; return 1-4*abs(p-0.5)
def pulse(f, t, pw=0.5): return 1.0 if (f*t)%1.0 < pw else -1.0

def note(semi, base=220.0): return base * 2**(semi/12.0)

# ── Envelope ──────────────────────────────────────────────────────────────────
def adsr(t, a, d, s, r, dur):
    if t < 0: return 0.0
    if t < a: return t/a
    if t < a+d: return 1-(1-s)*(t-a)/d
    if t < dur-r: return s
    if t < dur: return s*(1-(t-(dur-r))/r)
    return 0.0

# ── Add note to buffer ────────────────────────────────────────────────────────
def add(start_s, dur_s, osc_fn, amp=0.2, a=0.01, d=0.06, s=0.7, r=0.15):
    s0, s1 = int(start_s*SR), min(N, int((start_s+dur_s)*SR))
    for i in range(s0, s1):
        t  = (i-s0)/SR
        e  = adsr(t, a, d, s, r, dur_s)
        v  = amp * e * osc_fn(t)
        buf[i] = clamp(buf[i]+v)

# ── Kick drum (sine thump) ────────────────────────────────────────────────────
def kick(start_s, amp=0.55):
    s0, s1 = int(start_s*SR), min(N, int((start_s+0.18)*SR))
    for i in range(s0, s1):
        t = (i-s0)/SR
        f = 60 + 200*math.exp(-t*40)
        e = math.exp(-t*18)
        v = amp * e * sine(f, t)
        buf[i] = clamp(buf[i]+v)

# ── Hi-hat ────────────────────────────────────────────────────────────────────
def hat(start_s, amp=0.08, dur=0.04):
    s0, s1 = int(start_s*SR), min(N, int((start_s+dur)*SR))
    for i in range(s0, s1):
        t = (i-s0)/SR
        e = math.exp(-t*60)
        v = amp * e * (random.random()*2-1)
        buf[i] = clamp(buf[i]+v)

# ── Snare ─────────────────────────────────────────────────────────────────────
def snare(start_s, amp=0.30):
    s0, s1 = int(start_s*SR), min(N, int((start_s+0.12)*SR))
    for i in range(s0, s1):
        t = (i-s0)/SR
        e = math.exp(-t*28)
        noise = random.random()*2-1
        tone  = sine(220, t)
        v = amp * e * (0.5*noise + 0.5*tone)
        buf[i] = clamp(buf[i]+v)

# ── Impact hit (scene cuts) ───────────────────────────────────────────────────
def impact(start_s, amp=0.45):
    s0, s1 = int(start_s*SR), min(N, int((start_s+0.25)*SR))
    for i in range(s0, s1):
        t = (i-s0)/SR
        f = 80 + 300*math.exp(-t*25)
        e = math.exp(-t*14) * (0.6 + 0.4*math.exp(-t*80))
        v = amp * e * sine(f, t)
        buf[i] = clamp(buf[i]+v)

# ── Chime sparkle ─────────────────────────────────────────────────────────────
def chime(start_s, freq=880, amp=0.16):
    dur_s = 1.0
    s0, s1 = int(start_s*SR), min(N, int((start_s+dur_s)*SR))
    for i in range(s0, s1):
        t = (i-s0)/SR
        e = math.exp(-t*6)
        v = amp * e * (sine(freq, t) + 0.35*sine(freq*2, t) + 0.12*sine(freq*3, t))
        buf[i] = clamp(buf[i]+v)

# ── Bass line ─────────────────────────────────────────────────────────────────
D2  = note(-19, 110)  # D2
A2  = note(-15, 110)  # A2 ~146.8
Fs2 = note(-17, 110)

# Scene cut times
CUTS = [1.55, 3.10, 5.17, 7.24, 9.31, 11.90]

# ─────────────────────────────────────────────────────────────────────────────
# Build the track
# ─────────────────────────────────────────────────────────────────────────────

random.seed(42)

# --- Hook 0–1.55s: soft piano arpeggio, no drums ---
arp = [note(0,440), note(4,440), note(7,440), note(12,440)]
for i, f in enumerate(arp):
    add(i*0.35, 0.6, lambda t,f=f: sine(f,t)*0.6 + sine(f*2,t)*0.2, amp=0.18, a=0.02, d=0.08, s=0.6, r=0.3)

# --- Beat grid from scene 2 onward ---
beat_start = 1.55
t = beat_start
while t < DUR - 0.05:
    beat_in_bar = round((t - beat_start) / BEAT) % 4
    if beat_in_bar == 0:
        kick(t, amp=0.50)
    elif beat_in_bar == 2:
        kick(t, amp=0.38)
        snare(t, amp=0.28)
    # hi-hats every half-beat
    hat(t, amp=0.07)
    hat(t + BEAT/2, amp=0.05)
    t += BEAT

# --- Bass: D groove from beat 2 onward ---
bass_pattern = [D2, D2, A2, D2, Fs2, D2, A2, D2]
for i in range(int((DUR - beat_start) / BEAT) + 1):
    bt = beat_start + i * BEAT
    if bt >= DUR: break
    f = bass_pattern[i % len(bass_pattern)]
    add(bt, BEAT*0.75, lambda t,f=f: tri(f,t)*0.5 + sine(f,t)*0.5, amp=0.20, a=0.01, d=0.04, s=0.75, r=0.1)

# --- Cut impacts at scene transitions ---
for ct in CUTS:
    impact(ct, amp=0.42)
    # chime on each feature cut
    if ct >= 3.10:
        chime(ct, freq=note(12,880), amp=0.14)

# --- Melodic piano phrases (Fraunces warmth) ---
# Scene 2: reveal
for i, f in enumerate([note(0,440), note(4,440), note(7,440)]):
    add(1.55 + i*0.38, 0.55, lambda t,f=f: sine(f,t)+0.2*sine(f*2,t), amp=0.16, a=0.01, d=0.07, s=0.6, r=0.25)

# Scene 3: feat1
for i, f in enumerate([note(7,440), note(9,440), note(12,440)]):
    add(3.10 + i*0.38, 0.55, lambda t,f=f: sine(f,t)+0.2*sine(f*2,t), amp=0.14, a=0.01, d=0.06, s=0.6, r=0.2)

# Scene 4: feat2
for i, f in enumerate([note(4,440), note(7,440), note(9,440)]):
    add(5.17 + i*0.38, 0.55, lambda t,f=f: sine(f,t)+0.2*sine(f*2,t), amp=0.14, a=0.01, d=0.06, s=0.6, r=0.2)

# Scene 5: feat3 - builds higher
for i, f in enumerate([note(9,440), note(12,440), note(14,440)]):
    add(7.24 + i*0.35, 0.55, lambda t,f=f: sine(f,t)+0.25*sine(f*2,t), amp=0.16, a=0.01, d=0.06, s=0.65, r=0.2)

# Scene 6: punch - big chord slam
punch_freqs = [note(0,220), note(4,220), note(7,220), note(12,220), note(7,440)]
for f in punch_freqs:
    add(9.31, 2.0, lambda t,f=f: sine(f,t)*0.5 + tri(f,t)*0.3, amp=0.12, a=0.02, d=0.12, s=0.7, r=0.8)

# Scene 7: outro - resolve, fade
for i, f in enumerate([note(0,440), note(4,440), note(7,440), note(12,440)]):
    add(11.90 + i*0.5, 1.2, lambda t,f=f: sine(f,t)+0.15*sine(f*2,t), amp=0.16, a=0.04, d=0.1, s=0.6, r=0.5)

# Final fade 14.5→16s
fade_start = int(14.5 * SR)
for i in range(fade_start, N):
    p = (i - fade_start) / (N - fade_start)
    buf[i] *= 1.0 - p

# Master limiter
peak = max(abs(x) for x in buf)
if peak > 0.88:
    buf = [x * 0.88/peak for x in buf]

# Write
with wave.open(OUT, 'w') as wf:
    wf.setnchannels(1)
    wf.setsampwidth(2)
    wf.setframerate(SR)
    for s in buf:
        wf.writeframes(struct.pack('<h', int(s*32767)))

print(f"Audio done: {OUT}")
