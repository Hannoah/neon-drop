import {t, getLanguage} from './i18n.js';
import {formatElapsedTime} from './board.js';

export function applyTranslations(root = document) {
    const targets = selector => [
        ...(root.matches?.(selector) ? [root] : []),
        ...root.querySelectorAll(selector),
    ];
    for (const element of targets('[data-i18n]')) {
        element.textContent = t(element.dataset.i18n, JSON.parse(element.dataset.i18nParams || '{}'));
    }
    for (const attribute of ['aria-label', 'placeholder']) {
        for (const element of targets(`[data-i18n-${attribute}]`)) {
            element.setAttribute(attribute, t(element.getAttribute(`data-i18n-${attribute}`)));
        }
    }
    const documentElement = root.documentElement || root.ownerDocument?.documentElement;
    if (documentElement) documentElement.lang = getLanguage();
}

export function setText(element, source, params = {}) {
    element.dataset.i18n = source;
    element.dataset.i18nParams = JSON.stringify(params);
    element.textContent = t(source, params);
}

export function scenarioCopy(stage) {
    let objective = t('Clear {lines} lines.', {lines: stage.lineGoal});
    let modifier = t('Standard drop speed.');
    if (stage.id === 2) {
        objective = t('Clear {lines} lines before time expires.', {lines: stage.lineGoal});
        modifier = t('Faster drop speed · {time} limit.', {time: formatElapsedTime(stage.timeLimitMs)});
    } else if (stage.id === 3) {
        modifier = t('Interference every {seconds} seconds.', {seconds: stage.hazardIntervalMs / 1000});
    } else if (stage.id === 4 || stage.id === 5) {
        objective = t('Defeat {rival}.', {rival: stage.rival});
        modifier = stage.id === 5
            ? t('{turns} opponent turns per lock · interference every {seconds} seconds.', {turns: stage.opponentTurns, seconds: stage.hazardIntervalMs / 1000})
            : stage.opponentTurns === 1 ? t('One opponent turn per lock.')
                : t('{turns} opponent turns per lock.', {turns: stage.opponentTurns});
    }
    return {name: t(stage.name), objective, modifier};
}

export function translateEvent(message) {
    return message.split(' · ').map(fragment => {
        const patterns = [
            [/^LEVEL (\d+)$/, 'LEVEL {level}', 'level'],
            [/^COMBO RUSH x(\d+)$/, 'COMBO RUSH x{combo}', 'combo'],
            [/^COMBO x(\d+)$/, 'COMBO x{combo}', 'combo'],
            [/^B2B x(\d+)$/, 'B2B x{chain}', 'chain'],
            [/^INTERFERENCE \+(\d+)$/, 'INTERFERENCE +{waves}', 'waves'],
        ];
        for (const [pattern, source, parameter] of patterns) {
            const match = fragment.match(pattern);
            if (match) return t(source, {[parameter]: match[1]});
        }
        return t(fragment);
    }).join(' · ');
}
