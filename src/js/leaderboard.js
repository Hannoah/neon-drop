export const LEADERBOARD_GENERATION = 2;
export const LEADERBOARD_KEY = 'tetrisLeaderboard';

export function readLeaderboard(storage = localStorage) {
    try {
        const stored = storage.getItem(LEADERBOARD_KEY);
        if (!stored) return [];
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
            writeLeaderboard([], storage);
            return [];
        }
        if (!parsed || parsed.generation !== LEADERBOARD_GENERATION || !Array.isArray(parsed.scores)) {
            writeLeaderboard([], storage);
            return [];
        }
        return parsed.scores
            .filter(score => score && typeof score.name === 'string' && Number.isFinite(score.score))
            .map(score => ({name: score.name, score: score.score}))
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);
    } catch {
        return [];
    }
}

export function writeLeaderboard(scores, storage = localStorage) {
    try {
        storage.setItem(LEADERBOARD_KEY, JSON.stringify({
            generation: LEADERBOARD_GENERATION,
            scores,
        }));
    } catch {
        // Storage can be unavailable in private browsing or restricted contexts.
    }
}

export function renderLeaderboard(element, scores) {
    element.replaceChildren();
    if (scores.length === 0) {
        element.textContent = 'No records yet';
        return;
    }

    scores.forEach((score, index) => {
        const row = document.createElement('div');
        row.textContent = `${index + 1}. ${score.name}: ${score.score}`;
        element.appendChild(row);
    });
}
