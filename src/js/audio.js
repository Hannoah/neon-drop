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
        clear: () => {
            if (!sfxToggle.checked) return;
            playSound(400, 'square', 0.1);
            setTimeout(() => playSound(600, 'square', 0.1), 100);
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
