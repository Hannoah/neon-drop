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
