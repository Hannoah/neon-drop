import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('provides an npm start command for launching the game', async () => {
    const packageJson = JSON.parse(await readFile(new URL('../../package.json', import.meta.url)));

    assert.equal(typeof packageJson.scripts?.start, 'string');
    assert.ok(packageJson.scripts.start.length > 0);
});

test('declares native dialog semantics for the game overlay', async () => {
    const html = await readFile(new URL('../../index.html', import.meta.url), 'utf8');

    assert.match(html, /id="modal-overlay"[^>]*role="dialog"[^>]*aria-modal="true"/);
});

test('shows touch controls for coarse pointers', async () => {
    const css = await readFile(new URL('../../src/css/shell.css', import.meta.url), 'utf8');

    assert.match(css, /@media \(max-width: 760px\), \(orientation: portrait\), \(pointer: coarse\)/);
});

test('declares Concrete Arcade shell tokens and Board Center layout', async () => {
    const html = await readFile(new URL('../../index.html', import.meta.url), 'utf8');
    const css = await readFile(new URL('../../src/css/shell.css', import.meta.url), 'utf8');

    assert.match(html, /family=Syne/);
    assert.match(html, /href="src\/css\/shell\.css"/);
    assert.match(css, /--bg:\s*#121212/);
    assert.match(css, /--accent:\s*#ff6a3d/);
    assert.match(html, /id="start-game-btn"[^>]*>Play /);
    assert.match(html, /id="play-mode-hint"/);
    assert.match(html, /id="first-run-nudge"/);
    assert.match(html, /id="unlock-toast"/);
    assert.match(html, /id="pause-controls"/);
    assert.match(html, /id="touch-180"/);
    assert.match(css, /grid-template-areas:[\s\S]*preview player rail/);
    assert.match(html, /rel="icon"[^>]*href="favicon\.svg"/);
    assert.match(css, /#player-panel \.board-stage\.clear-punch \{/);
    assert.doesNotMatch(css, /#game-container\.clear-punch \{ animation: clearPunch/);
});

test('ships a Concrete Arcade favicon asset', async () => {
    const svg = await readFile(new URL('../../favicon.svg', import.meta.url), 'utf8');
    assert.match(svg, /viewBox="0 0 32 32"/);
    assert.match(svg, /#ff6a3d/i);
    assert.match(svg, /#121212/);
});
