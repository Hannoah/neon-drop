import {t} from './i18n.js';

const CODE_GLYPHS = {
    ArrowLeft: '←',
    ArrowRight: '→',
    ArrowUp: '↑',
    ArrowDown: '↓',
    Space: 'Space',
    Escape: 'Esc',
    ShiftLeft: 'Shift',
    ShiftRight: 'Shift',
    ControlLeft: 'Ctrl',
    ControlRight: 'Ctrl',
};

export const UNLOCK_LABELS = {
    'frame:gold': 'Gold Frame',
    'frame:rival': 'Rival Frame',
    'frame:mint': 'Mint Frame',
    'clear:flare': 'Flare Clear',
    'clear:pulse': 'Pulse Clear',
};

export function unlockLabel(id) {
    return t(UNLOCK_LABELS[id] || id);
}

export function formatUnlocks(unlocks) {
    return (unlocks || []).map(unlockLabel).filter(Boolean).join(' · ');
}

export function codeLabel(code) {
    if (!code) return '';
    if (CODE_GLYPHS[code]) return CODE_GLYPHS[code];
    if (code.startsWith('Key')) return code.slice(3);
    if (code.startsWith('Digit')) return code.slice(5);
    return code;
}

export function bindingPhrase(codes) {
    const labels = (codes || []).map(codeLabel).filter(Boolean);
    return labels.length ? labels.join(', ') : '—';
}

export function controlLegendRows(bindings = {}) {
    return [
        {label: 'Move', keys: bindingPhrase([...(bindings.moveLeft || []), ...(bindings.moveRight || [])])},
        {label: 'Rotate', keys: bindingPhrase([
            ...(bindings.rotateCW || []),
            ...(bindings.rotateCCW || []),
            ...(bindings.rotate180 || []),
        ])},
        {label: 'Soft Drop', keys: bindingPhrase(bindings.softDrop)},
        {label: 'Hard Drop', keys: bindingPhrase(bindings.hardDrop)},
        {label: 'Hold', keys: bindingPhrase(bindings.hold)},
        {label: 'Pause', keys: bindingPhrase(bindings.pause)},
    ].map(row => ({...row, label: t(row.label)}));
}

export function msUntilNextUtcDay(now = new Date()) {
    const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
    return Math.max(0, next - now.getTime());
}

export function formatHoursLeft(ms) {
    const hours = Math.max(1, Math.ceil(Math.max(0, ms) / 3600000));
    return t('{hours}h left', {hours});
}

export function dailyCardDetail({dateKey, streak = 0, msLeft = 0} = {}) {
    const hours = formatHoursLeft(msLeft);
    if (streak > 0) return t('STREAK {streak} · {hours}', {streak, hours});
    return t('Seed {date} · {hours}', {date: dateKey, hours});
}

export function fanfareKind({rowCount = 0, tSpin = 'none', perfectClear = false, combo = 0} = {}) {
    if (perfectClear) return 'perfect';
    if (tSpin && tSpin !== 'none') return 'tspin';
    if (rowCount >= 4) return 'tetris';
    if (combo >= 5 && rowCount > 0) return 'combo';
    if (rowCount >= 1) return 'clear';
    return 'none';
}

export function formatRunGrade({grade, stars = 0, isPb = false, unlocks = []} = {}) {
    const parts = [t('Grade {grade}', {grade})];
    if (stars > 0) parts.push('★'.repeat(stars));
    if (isPb) parts.push(t('NEW PB'));
    const unlocked = formatUnlocks(unlocks);
    if (unlocked) parts.push(t('UNLOCKED {names}', {names: unlocked}));
    return parts.join(' · ');
}
