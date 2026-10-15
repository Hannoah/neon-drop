import {resolveLanguage} from './i18n.js';

export const DEFAULT_TIMING = {das: 167, arr: 33, lockDelay: 500};

export const CLASSIC_BINDINGS = {
    moveLeft: ['ArrowLeft'],
    moveRight: ['ArrowRight'],
    softDrop: ['ArrowDown'],
    hardDrop: ['Space'],
    rotateCW: ['ArrowUp'],
    rotateCCW: [],
    rotate180: ['KeyA'],
    hold: ['KeyC'],
    pause: ['KeyP', 'Escape'],
    quit: ['KeyQ'],
};

export const GUIDELINE_BINDINGS = {
    moveLeft: ['ArrowLeft'],
    moveRight: ['ArrowRight'],
    softDrop: ['ArrowDown'],
    hardDrop: ['Space'],
    rotateCW: ['KeyX', 'ArrowUp'],
    rotateCCW: ['KeyZ'],
    rotate180: ['KeyA'],
    hold: ['KeyC'],
    pause: ['KeyP', 'Escape'],
    quit: ['KeyQ'],
};

export const DEFAULT_SETTINGS = {
    version: 2,
    language: 'en',
    mode: 'marathon',
    bgm: true,
    sfx: true,
    preset: 'classic',
    bindings: structuredClone(CLASSIC_BINDINGS),
    timing: {...DEFAULT_TIMING},
};

const BINDING_ACTIONS = Object.keys(CLASSIC_BINDINGS);

function cloneBindings(bindings) {
    return Object.fromEntries(
        BINDING_ACTIONS.map(action => [action, Array.isArray(bindings[action])
            ? bindings[action].filter(code => typeof code === 'string' && code.length > 0)
            : [...CLASSIC_BINDINGS[action]]]),
    );
}

function usedBindingCodes(bindings) {
    return new Set(BINDING_ACTIONS.flatMap(action => bindings[action] ?? []));
}

function ensureDefault180(bindings) {
    if (bindings.rotate180.length > 0) return bindings;
    if (usedBindingCodes(bindings).has('KeyA')) return bindings;
    bindings.rotate180 = ['KeyA'];
    return bindings;
}

export function clampTiming(timing) {
    const source = timing ?? {};
    const das = Number(source.das);
    const arr = Number(source.arr);
    const lockDelay = Number(source.lockDelay);
    return {
        das: Math.min(400, Math.max(50, Number.isFinite(das) ? das : DEFAULT_TIMING.das)),
        arr: Math.min(100, Math.max(0, Number.isFinite(arr) ? arr : DEFAULT_TIMING.arr)),
        lockDelay: Math.min(1000, Math.max(100, Number.isFinite(lockDelay) ? lockDelay : DEFAULT_TIMING.lockDelay)),
    };
}

export function normalizeSettings(raw) {
    const input = raw && typeof raw === 'object' ? raw : {};
    const isV2 = input.version === 2;

    const preset = isV2 && (input.preset === 'guideline' || input.preset === 'custom')
        ? input.preset
        : 'classic';

    let bindings;
    if (isV2 && input.bindings && typeof input.bindings === 'object') {
        bindings = cloneBindings({...CLASSIC_BINDINGS, ...input.bindings});
    } else if (preset === 'guideline') {
        bindings = cloneBindings(GUIDELINE_BINDINGS);
    } else {
        bindings = cloneBindings(CLASSIC_BINDINGS);
    }
    bindings = ensureDefault180(bindings);

    return {
        version: 2,
        language: resolveLanguage(input.language),
        mode: typeof input.mode === 'string' ? input.mode : DEFAULT_SETTINGS.mode,
        bgm: typeof input.bgm === 'boolean' ? input.bgm : DEFAULT_SETTINGS.bgm,
        sfx: typeof input.sfx === 'boolean' ? input.sfx : DEFAULT_SETTINGS.sfx,
        preset,
        bindings,
        timing: clampTiming(isV2 ? input.timing : DEFAULT_TIMING),
    };
}

export function applyPreset(settings, preset) {
    const next = normalizeSettings(settings);
    if (preset === 'guideline') {
        next.preset = 'guideline';
        next.bindings = cloneBindings(GUIDELINE_BINDINGS);
    } else {
        next.preset = 'classic';
        next.bindings = cloneBindings(CLASSIC_BINDINGS);
    }
    return next;
}

export function assignBinding(settings, action, code) {
    if (!BINDING_ACTIONS.includes(action)) {
        return normalizeSettings(settings);
    }

    const next = normalizeSettings(settings);
    next.preset = 'custom';
    next.bindings = cloneBindings(next.bindings);

    const oldKeys = [...next.bindings[action]];
    const other = BINDING_ACTIONS.find(
        candidate => candidate !== action && next.bindings[candidate].includes(code),
    );

    next.bindings[action] = [code];
    if (other) {
        next.bindings[other] = oldKeys;
    }

    for (const candidate of BINDING_ACTIONS) {
        if (candidate === action || candidate === other) continue;
        next.bindings[candidate] = next.bindings[candidate].filter(key => key !== code);
    }

    return next;
}
