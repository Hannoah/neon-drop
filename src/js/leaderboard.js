export const LEADERBOARD_GENERATION = 3;
export const LEADERBOARD_KEY = 'tetrisLeaderboard';
export const DEFAULT_LEADERBOARD_MODE = 'marathon';

function sanitizeScores(scores) {
    if (!Array.isArray(scores)) return [];
    return scores
        .filter(score => score && typeof score.name === 'string' && Number.isFinite(score.score))
        .map(score => ({name: score.name, score: score.score}))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
}

function persistBoards(storage, boards) {
    storage.setItem(LEADERBOARD_KEY, JSON.stringify({
        generation: LEADERBOARD_GENERATION,
        boards,
    }));
}

function readBoards(storage) {
    const stored = storage.getItem(LEADERBOARD_KEY);
    if (!stored) return {ok: true, boards: {}};
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed)
        || !parsed
        || parsed.generation !== LEADERBOARD_GENERATION
        || !parsed.boards
        || typeof parsed.boards !== 'object'
        || Array.isArray(parsed.boards)) {
        return {ok: false, boards: {}};
    }
    return {ok: true, boards: parsed.boards};
}

export function readLeaderboard(storage = localStorage, mode = DEFAULT_LEADERBOARD_MODE) {
    try {
        const {ok, boards} = readBoards(storage);
        if (!ok) {
            persistBoards(storage, {});
            return [];
        }
        return sanitizeScores(boards[mode]);
    } catch {
        return [];
    }
}

export function writeLeaderboard(scores, storage = localStorage, mode = DEFAULT_LEADERBOARD_MODE) {
    try {
        let boards = {};
        try {
            const current = readBoards(storage);
            if (current.ok) boards = {...current.boards};
        } catch {
            boards = {};
        }
        boards[mode] = sanitizeScores(scores);
        persistBoards(storage, boards);
    } catch {
        // Storage can be unavailable in private browsing or restricted contexts.
    }
}

export function renderLeaderboard(element, scores) {
    element.replaceChildren();
    if (scores.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'lb-row';
        empty.textContent = 'No records yet';
        element.appendChild(empty);
        return;
    }

    scores.forEach((score, index) => {
        const row = document.createElement('div');
        row.className = 'lb-row';

        const rank = document.createElement('span');
        rank.className = 'lb-rank';
        rank.textContent = String(index + 1).padStart(2, '0');

        const name = document.createElement('span');
        name.className = 'lb-name';
        name.textContent = score.name;

        const points = document.createElement('span');
        points.className = 'lb-score';
        points.textContent = String(score.score);

        row.append(rank, name, points);
        element.appendChild(row);
    });
}
