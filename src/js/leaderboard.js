export function readLeaderboard(storage = localStorage) {
    try {
        const stored = storage.getItem('tetrisLeaderboard');
        const scores = stored ? JSON.parse(stored) : [];
        if (!Array.isArray(scores)) return [];

        return scores
            .filter(score => score && typeof score.name === 'string' && Number.isFinite(score.score))
            .map(score => ({name: score.name, score: score.score}))
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);
    } catch (error) {
        return [];
    }
}

export function writeLeaderboard(scores, storage = localStorage) {
    try {
        storage.setItem('tetrisLeaderboard', JSON.stringify(scores));
    } catch (error) {
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
