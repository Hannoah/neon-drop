import { test } from 'node:test';
import assert from 'node:assert/strict';

class StubOscillator {
    constructor() {
        this.type = null;
        this.frequency = {setValueAtTime() {}};
    }

    connect() {}
    start() {}
    stop() {}
}

class StubGain {
    constructor() {
        this.gain = {
            setValueAtTime: (_value, _time) => {},
            exponentialRampToValueAtTime: (_value, _time) => {},
        };
    }

    connect() {}
}

class StubAudioContext {
    constructor() {
        this.currentTime = 0;
        this.destination = {};
        this.oscillators = [];
    }

    createOscillator() {
        const oscillator = new StubOscillator();
        this.oscillators.push(oscillator);
        return oscillator;
    }

    createGain() {
        return new StubGain();
    }
}

globalThis.window = {AudioContext: StubAudioContext};

const {createAudioSystem} = await import('../../src/js/audio.js?audio-test');

function toggle(checked = true) {
    return {checked, addEventListener() {}};
}

test('drop sound uses a short triangle tone instead of a harsh sine buzz', () => {
    const system = createAudioSystem(toggle(), toggle());

    system.sounds.drop();

    assert.equal(system.audioCtx.oscillators.at(-1).type, 'triangle');
});
