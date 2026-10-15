const AudioContextClass = window.AudioContext || window.webkitAudioContext;
const audioCtx = AudioContextClass ? new AudioContextClass() : null;

function playSound(freq, type, duration, volume = 0.1) {
    if (!audioCtx) return;

    try {
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + duration);
    } catch {
        // audio context closed or suspended
    }
}

// Legacy exports kept for test compatibility
export const themeMelodyName = 'Neon Circuit';
export const themeMelody = [
    {f: 261.63, d: 0.18}, {f: 329.63, d: 0.18}, {f: 392.00, d: 0.18}, {f: 523.25, d: 0.32},
    {f: 493.88, d: 0.18}, {f: 392.00, d: 0.18}, {f: 329.63, d: 0.18}, {f: 293.66, d: 0.32},
    {f: 261.63, d: 0.18}, {f: 329.63, d: 0.18}, {f: 440.00, d: 0.18}, {f: 523.25, d: 0.32},
    {f: 587.33, d: 0.18}, {f: 523.25, d: 0.18}, {f: 440.00, d: 0.18}, {f: 392.00, d: 0.32},
    {f: 349.23, d: 0.18}, {f: 392.00, d: 0.18}, {f: 493.88, d: 0.18}, {f: 659.25, d: 0.32},
    {f: 587.33, d: 0.18}, {f: 493.88, d: 0.18}, {f: 392.00, d: 0.18}, {f: 329.63, d: 0.32},
];

// Note frequencies
const N = {
    A1: 55.00, As1: 58.27, B1: 61.74,
    C2: 65.41, Cs2: 69.30, D2: 73.42, Ds2: 77.78, E2: 82.41, F2: 87.31, Fs2: 92.50, G2: 98.00, Gs2: 103.83, A2: 110.00, As2: 116.54, B2: 123.47,
    C3: 130.81, Cs3: 138.59, D3: 146.83, Ds3: 155.56, E3: 164.81, F3: 174.61, Fs3: 185.00, G3: 196.00, Gs3: 207.65, A3: 220.00, As3: 233.08, B3: 246.94,
    C4: 261.63, Cs4: 277.18, D4: 293.66, Ds4: 311.13, E4: 329.63, F4: 349.23, Fs4: 369.99, G4: 392.00, Gs4: 415.30, A4: 440.00, As4: 466.16, B4: 493.88,
    C5: 523.25, Cs5: 554.37, D5: 587.33, Ds5: 622.25, E5: 659.25, F5: 698.46, Fs5: 739.99, G5: 783.99, Gs5: 830.61, A5: 880.00,
};

// Korobeiniki (Classic Tetris Type A) - 128 eighth-note steps (~185ms per step)
const KOROBEINIKI_MELODY = [
    {s: 0, f: N.E5, d: 2}, {s: 2, f: N.B4, d: 1}, {s: 3, f: N.C5, d: 1},
    {s: 4, f: N.D5, d: 2}, {s: 6, f: N.C5, d: 1}, {s: 7, f: N.B4, d: 1},
    {s: 8, f: N.A4, d: 2}, {s: 10, f: N.A4, d: 1}, {s: 11, f: N.C5, d: 1},
    {s: 12, f: N.E5, d: 2}, {s: 14, f: N.D5, d: 1}, {s: 15, f: N.C5, d: 1},
    {s: 16, f: N.B4, d: 3}, {s: 19, f: N.C5, d: 1}, {s: 20, f: N.D5, d: 2}, {s: 22, f: N.E5, d: 2},
    {s: 24, f: N.C5, d: 2}, {s: 26, f: N.A4, d: 2}, {s: 28, f: N.A4, d: 4},
    {s: 32, f: N.D5, d: 3}, {s: 35, f: N.F5, d: 1}, {s: 36, f: N.A5, d: 2},
    {s: 38, f: N.G5, d: 1}, {s: 39, f: N.F5, d: 1},
    {s: 40, f: N.E5, d: 3}, {s: 43, f: N.C5, d: 1}, {s: 44, f: N.E5, d: 2},
    {s: 46, f: N.D5, d: 1}, {s: 47, f: N.C5, d: 1},
    {s: 48, f: N.B4, d: 2}, {s: 50, f: N.B4, d: 1}, {s: 51, f: N.C5, d: 1},
    {s: 52, f: N.D5, d: 2}, {s: 54, f: N.E5, d: 2},
    {s: 56, f: N.C5, d: 2}, {s: 58, f: N.A4, d: 2}, {s: 60, f: N.A4, d: 4},
    {s: 64, f: N.E4, d: 4}, {s: 68, f: N.C4, d: 4},
    {s: 72, f: N.D4, d: 4}, {s: 76, f: N.B3, d: 4},
    {s: 80, f: N.C4, d: 4}, {s: 84, f: N.A3, d: 4},
    {s: 88, f: N.Gs3, d: 4}, {s: 92, f: N.B3, d: 4},
    {s: 96, f: N.E4, d: 4}, {s: 100, f: N.C4, d: 4},
    {s: 104, f: N.D4, d: 4}, {s: 108, f: N.B3, d: 4},
    {s: 112, f: N.C4, d: 2}, {s: 114, f: N.E4, d: 2}, {s: 116, f: N.A4, d: 4},
    {s: 120, f: N.Gs4, d: 8}
];

const KOROBEINIKI_BASS = [
    {s: 0, f: N.E2}, {s: 2, f: N.B2}, {s: 4, f: N.E3}, {s: 6, f: N.B2},
    {s: 8, f: N.A2}, {s: 10, f: N.E3}, {s: 12, f: N.A2}, {s: 14, f: N.E3},
    {s: 16, f: N.Gs2}, {s: 18, f: N.E2}, {s: 20, f: N.B2}, {s: 22, f: N.E3},
    {s: 24, f: N.A2}, {s: 26, f: N.E3}, {s: 28, f: N.A2}, {s: 30, f: N.E2},
    {s: 32, f: N.D3}, {s: 34, f: N.A2}, {s: 36, f: N.F3}, {s: 38, f: N.A2},
    {s: 40, f: N.C3}, {s: 42, f: N.A2}, {s: 44, f: N.E3}, {s: 46, f: N.A2},
    {s: 48, f: N.E2}, {s: 50, f: N.B2}, {s: 52, f: N.E3}, {s: 54, f: N.Gs2},
    {s: 56, f: N.A2}, {s: 58, f: N.E3}, {s: 60, f: N.A2}, {s: 62, f: N.A2},
    {s: 64, f: N.A2}, {s: 66, f: N.E3}, {s: 68, f: N.A2}, {s: 70, f: N.E3},
    {s: 72, f: N.G2}, {s: 74, f: N.D3}, {s: 76, f: N.G2}, {s: 78, f: N.D3},
    {s: 80, f: N.F2}, {s: 82, f: N.C3}, {s: 84, f: N.F2}, {s: 86, f: N.C3},
    {s: 88, f: N.E2}, {s: 90, f: N.B2}, {s: 92, f: N.E3}, {s: 94, f: N.Gs2},
    {s: 96, f: N.A2}, {s: 98, f: N.E3}, {s: 100, f: N.A2}, {s: 102, f: N.E3},
    {s: 104, f: N.G2}, {s: 106, f: N.D3}, {s: 108, f: N.G2}, {s: 110, f: N.D3},
    {s: 112, f: N.F2}, {s: 114, f: N.C3}, {s: 116, f: N.A2}, {s: 118, f: N.E3},
    {s: 120, f: N.E2}, {s: 122, f: N.B2}, {s: 124, f: N.E3}, {s: 126, f: N.E2}
];

const kMelodyMap = new Map();
KOROBEINIKI_MELODY.forEach(m => kMelodyMap.set(m.s, m));
const kBassMap = new Map();
KOROBEINIKI_BASS.forEach(b => kBassMap.set(b.s, b));

// Cyber Pulse track (Fast synthwave bass + lead) - 64 sixteenth-note steps (~115ms per step)
const CYBER_BASS = [
    N.D2, N.D2, N.D3, N.D2, N.F2, N.D2, N.A2, N.D2,
    N.C2, N.C2, N.C3, N.C2, N.E2, N.C2, N.G2, N.C2,
    N.As1, N.As1, N.As2, N.As1, N.D2, N.As1, N.F2, N.As1,
    N.A1, N.A1, N.A2, N.A1, N.Cs2, N.A1, N.E2, N.A1,
    N.D2, N.D2, N.D3, N.D2, N.F2, N.D2, N.A2, N.D2,
    N.C2, N.C2, N.C3, N.C2, N.E2, N.C2, N.G2, N.C2,
    N.As1, N.As1, N.As2, N.As1, N.D2, N.As1, N.F2, N.As1,
    N.A1, N.A1, N.A2, N.A1, N.Cs2, N.A1, N.E2, N.A1
];
const CYBER_LEAD = [
    N.D4, N.F4, N.A4, N.D5, N.A4, N.F4, N.D4, N.F4,
    N.C4, N.E4, N.G4, N.C5, N.G4, N.E4, N.C4, N.E4,
    N.As3, N.D4, N.F4, N.As4, N.F4, N.D4, N.As3, N.D4,
    N.A3, N.Cs4, N.E4, N.A4, N.E4, N.Cs4, N.A3, N.Cs4,
    N.D5, N.A4, N.F4, N.D4, N.F4, N.A4, N.D5, N.F5,
    N.E5, N.C5, N.G4, N.E4, N.G4, N.C5, N.E5, N.G5,
    N.F5, N.D5, N.As4, N.F4, N.As4, N.D5, N.F5, N.As5,
    N.A5, N.E5, N.Cs5, N.A4, N.Cs5, N.E5, N.A5, N.A5
];

export function createAudioSystem(bgmToggle, sfxToggle, trackSelect = null) {
    let currentTrack = 'korobeiniki';
    let stepIndex = 0;
    let bgmInterval = null;

    function playKorobeinikiStep() {
        const step = stepIndex % 128;

        const mel = kMelodyMap.get(step);
        if (mel) {
            playSound(mel.f, 'square', mel.d * 0.18, 0.046);
        }

        const bass = kBassMap.get(step);
        if (bass) {
            playSound(bass.f, 'triangle', 0.17, 0.052);
        }

        // Offbeat accompaniment pulse on 2nd and 4th beats
        if (step % 4 === 2) {
            const chordNote = (step < 64) ? (step % 8 === 2 ? N.E4 : N.C4) : N.A3;
            playSound(chordNote, 'triangle', 0.11, 0.022);
        }

        stepIndex++;
    }

    function playCyberStep() {
        const step = stepIndex % 64;
        const bassFreq = CYBER_BASS[step];
        const leadFreq = CYBER_LEAD[step];

        playSound(bassFreq, 'sawtooth', 0.09, 0.038);
        if (step % 2 === 0) {
            playSound(leadFreq, 'square', 0.18, 0.042);
        }

        stepIndex++;
    }

    function playCircuitStep() {
        const note = themeMelody[stepIndex % themeMelody.length];
        playSound(note.f, 'triangle', note.d, 0.045);
        stepIndex++;
    }

    function startBGM() {
        if (bgmInterval || !bgmToggle.checked) return;

        stepIndex = 0;
        if (currentTrack === 'cyber') {
            bgmInterval = setInterval(() => {
                if (!bgmToggle.checked) { stopBGM(); return; }
                playCyberStep();
            }, 115);
        } else if (currentTrack === 'circuit') {
            bgmInterval = setInterval(() => {
                if (!bgmToggle.checked) { stopBGM(); return; }
                playCircuitStep();
            }, 250);
        } else {
            // Default: Korobeiniki
            bgmInterval = setInterval(() => {
                if (!bgmToggle.checked) { stopBGM(); return; }
                playKorobeinikiStep();
            }, 185);
        }
    }

    function stopBGM() {
        if (bgmInterval) {
            clearInterval(bgmInterval);
            bgmInterval = null;
        }
    }

    function setBgmTrack(track) {
        if (!track || track === currentTrack) return;
        currentTrack = track;
        if (trackSelect && trackSelect.value !== track) {
            trackSelect.value = track;
        }
        if (bgmInterval) {
            stopBGM();
            startBGM();
        }
    }

    function getBgmTrack() {
        return currentTrack;
    }

    if (trackSelect) {
        trackSelect.addEventListener('change', () => {
            setBgmTrack(trackSelect.value);
        });
    }

    const sounds = {
        move: () => sfxToggle.checked && playSound(200, 'square', 0.05),
        rotate: () => sfxToggle.checked && playSound(300, 'triangle', 0.05),
        drop: () => sfxToggle.checked && playSound(130, 'triangle', 0.06, 0.06),
        hardDrop: () => {
            if (!sfxToggle.checked) return;
            playSound(75, 'square', 0.07, 0.09);
            setTimeout(() => playSound(150, 'triangle', 0.08, 0.07), 35);
        },
        clear: (rows = 1) => {
            if (!sfxToggle.checked) return;
            const n = Math.max(1, Math.min(4, rows));
            const base = 360 + n * 70;
            playSound(base, n >= 3 ? 'triangle' : 'square', 0.09 + n * 0.02, 0.08);
            setTimeout(() => playSound(base + 180, 'square', 0.08 + n * 0.02, 0.07), 90);
            if (n >= 3) setTimeout(() => playSound(base + 320, 'triangle', 0.12, 0.06), 180);
        },
        fanfare: (kind = 'clear', extra = {}) => {
            if (!sfxToggle.checked || kind === 'none' || kind === 'clear') return;
            if (kind === 'perfect') {
                playSound(523.25, 'triangle', 0.12, 0.09);
                setTimeout(() => playSound(659.25, 'triangle', 0.12, 0.08), 70);
                setTimeout(() => playSound(783.99, 'triangle', 0.18, 0.08), 140);
                return;
            }
            if (kind === 'tetris') {
                playSound(392, 'square', 0.1, 0.08);
                setTimeout(() => playSound(523.25, 'triangle', 0.12, 0.08), 80);
                setTimeout(() => playSound(784, 'triangle', 0.16, 0.07), 160);
                return;
            }
            if (kind === 'tspin') {
                playSound(440, 'triangle', 0.08, 0.08);
                setTimeout(() => playSound(554.37, 'square', 0.1, 0.07), 70);
                return;
            }
            if (kind === 'combo') {
                const count = typeof extra === 'number' ? extra : (extra?.combo ?? 1);
                const scale = [440, 493.88, 554.37, 659.25, 739.99, 880, 987.77, 1108.73, 1318.51];
                const baseFreq = scale[Math.min(scale.length - 1, Math.max(0, count - 1))];
                playSound(baseFreq, 'square', 0.08, 0.07);
                setTimeout(() => playSound(baseFreq * 1.5, 'triangle', 0.1, 0.06), 60);
            }
        },
        unlock: () => {
            if (!sfxToggle.checked) return;
            playSound(659.25, 'triangle', 0.1, 0.08);
            setTimeout(() => playSound(880, 'triangle', 0.14, 0.07), 90);
        },
        stinger: () => {
            if (!sfxToggle.checked) return;
            playSound(520, 'triangle', 0.08, 0.07);
            setTimeout(() => playSound(780, 'triangle', 0.1, 0.06), 70);
        },
        gameOver: () => {
            stopBGM();
            if (sfxToggle.checked) {
                playSound(300, 'sawtooth', 0.3);
                setTimeout(() => playSound(200, 'sawtooth', 0.5), 300);
            }
        },
        levelUp: () => {
            if (!sfxToggle.checked) return;
            playSound(440, 'triangle', 0.08, 0.08);
            setTimeout(() => playSound(554.37, 'triangle', 0.08, 0.08), 80);
            setTimeout(() => playSound(659.25, 'triangle', 0.14, 0.07), 160);
        },
        restart: () => {
            if (!sfxToggle.checked) return;
            playSound(440, 'triangle', 0.06, 0.08);
            setTimeout(() => playSound(880, 'triangle', 0.08, 0.07), 50);
        }
    };

    bgmToggle.addEventListener('change', () => {
        if (bgmToggle.checked) {
            startBGM();
        } else {
            stopBGM();
        }
    });

    const isBGMRunning = () => bgmInterval !== null;

    return {audioCtx, startBGM, stopBGM, isBGMRunning, setBgmTrack, getBgmTrack, sounds};
}
