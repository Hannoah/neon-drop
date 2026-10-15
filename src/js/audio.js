const AudioContextClass = window.AudioContext || window.webkitAudioContext;
const audioCtx = AudioContextClass ? new AudioContextClass() : null;

function playSound(freq, type, duration, volume = 0.1) {
    if (!audioCtx) return;

    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + duration);
}

export const themeMelodyName = 'Neon Circuit';
export const themeMelody = [
    {f: 261.63, d: 0.18}, {f: 329.63, d: 0.18}, {f: 392.00, d: 0.18}, {f: 523.25, d: 0.32},
    {f: 493.88, d: 0.18}, {f: 392.00, d: 0.18}, {f: 329.63, d: 0.18}, {f: 293.66, d: 0.32},
    {f: 261.63, d: 0.18}, {f: 329.63, d: 0.18}, {f: 440.00, d: 0.18}, {f: 523.25, d: 0.32},
    {f: 587.33, d: 0.18}, {f: 523.25, d: 0.18}, {f: 440.00, d: 0.18}, {f: 392.00, d: 0.32},
    {f: 349.23, d: 0.18}, {f: 392.00, d: 0.18}, {f: 493.88, d: 0.18}, {f: 659.25, d: 0.32},
    {f: 587.33, d: 0.18}, {f: 493.88, d: 0.18}, {f: 392.00, d: 0.18}, {f: 329.63, d: 0.32},
];

let themeIndex = 0;
let bgmInterval = null;

export function createAudioSystem(bgmToggle, sfxToggle) {
    function startBGM() {
        if (bgmInterval || !bgmToggle.checked) return;
        bgmInterval = setInterval(() => {
            if (!bgmToggle.checked) {
                stopBGM();
                return;
            }
            const note = themeMelody[themeIndex];
            playSound(note.f, 'triangle', note.d, 0.045);
            themeIndex = (themeIndex + 1) % themeMelody.length;
        }, 250);
    }

    function stopBGM() {
        clearInterval(bgmInterval);
        bgmInterval = null;
    }

    const sounds = {
        move: () => sfxToggle.checked && playSound(200, 'square', 0.05),
        rotate: () => sfxToggle.checked && playSound(300, 'triangle', 0.05),
        drop: () => sfxToggle.checked && playSound(130, 'triangle', 0.06, 0.06),
        hardDrop: () => {
            if (!sfxToggle.checked) return;
            playSound(90, 'square', 0.07, 0.08);
            setTimeout(() => playSound(160, 'triangle', 0.08, 0.06), 40);
        },
        clear: (rows = 1) => {
            if (!sfxToggle.checked) return;
            const n = Math.max(1, Math.min(4, rows));
            const base = 360 + n * 70;
            playSound(base, n >= 3 ? 'triangle' : 'square', 0.09 + n * 0.02, 0.08);
            setTimeout(() => playSound(base + 180, 'square', 0.08 + n * 0.02, 0.07), 90);
            if (n >= 3) setTimeout(() => playSound(base + 320, 'triangle', 0.12, 0.06), 180);
        },
        fanfare: (kind = 'clear') => {
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
                playSound(587.33, 'square', 0.08, 0.07);
                setTimeout(() => playSound(880, 'triangle', 0.1, 0.06), 60);
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

    return {audioCtx, startBGM, stopBGM, isBGMRunning, sounds};
}
