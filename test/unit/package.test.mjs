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
    const html = await readFile(new URL('../../index.html', import.meta.url), 'utf8');

    assert.match(html, /@media \(max-width: 760px\), \(orientation: portrait\), \(pointer: coarse\)/);
});

test('declares Theater Ink tokens and DM Sans', async () => {
    const html = await readFile(new URL('../../index.html', import.meta.url), 'utf8');

    assert.match(html, /family=DM\+Sans/);
    assert.match(html, /--bg:\s*#0e1014/);
    assert.match(html, /--accent:\s*#5eead4/);
    assert.match(html, /id="start-game-btn"[^>]*>Play</);
    assert.match(html, /grid-template-areas:[\s\S]*preview player rail/);
});
