const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const root = __dirname;
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
};

function createServer() {
  return http.createServer((request, response) => {
    const pathname = request.url === '/' ? '/index.html' : request.url;
    const filePath = path.join(root, pathname);

    if (!filePath.startsWith(root) || !fs.existsSync(filePath)) {
      response.writeHead(404);
      response.end('Not found');
      return;
    }

    response.writeHead(200, {
      'Content-Type': mimeTypes[path.extname(filePath)] || 'application/octet-stream',
    });
    response.end(fs.readFileSync(filePath));
  });
}

async function openPage(browser, url) {
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error));
  await page.goto(url);
  await page.waitForLoadState('domcontentloaded');
  return { page, pageErrors };
}

async function testInputGuards(browser, url) {
  const { page, pageErrors } = await openPage(browser, url);

  await page.keyboard.press('ArrowLeft');
  assert.equal(await page.evaluate(() => player.matrix), null, 'menu input must not start gameplay');
  assert.equal(pageErrors.length, 0, 'menu input must not throw');

  await page.getByRole('button', { name: 'Start Game' }).click();
  const bgmRunning = await page.evaluate(() => isBgmRunning());
  assert.equal(bgmRunning, true, 'starting a game must start BGM when it is enabled');
  await page.evaluate(() => document.activeElement?.blur());
  await page.keyboard.press('p');
  const pausedState = await page.evaluate(() => {
    const before = {
      blocks: arena.flat().filter(Boolean).length,
      pos: { ...player.pos },
    };
    return { ...before, paused: isPaused };
  });

  assert.equal(pausedState.paused, true, 'P must pause an active game');
  await page.keyboard.press('ArrowLeft');
  const afterPauseInput = await page.evaluate(() => ({
    blocks: arena.flat().filter(Boolean).length,
    pos: { ...player.pos },
    paused: isPaused,
  }));

  assert.deepEqual(afterPauseInput.pos, pausedState.pos, 'paused input must not move the piece');
  assert.equal(afterPauseInput.blocks, pausedState.blocks, 'paused input must not merge a piece');
  assert.equal(afterPauseInput.paused, true, 'pause state must remain active');
  assert.equal(pageErrors.length, 0, 'paused input must not throw');

  await page.close();
}

async function testKeyboardModeStart(browser, url) {
  const { page, pageErrors } = await openPage(browser, url);

  await page.locator('#scenario-continue-btn').focus();
  await page.keyboard.press('Enter');
  assert.deepEqual(await page.evaluate(() => ({
    mapVisible: getComputedStyle(document.querySelector('#scenario-map-screen')).display !== 'none',
    playerMatrix: player.matrix,
  })), { mapVisible: true, playerMatrix: null },
  'Enter on the campaign card must not start quick-play');
  await page.locator('#scenario-map-back-btn').click();

  await page.locator('[data-mode-card="sprint"]').focus();
  await page.keyboard.press('Enter');

  const state = await page.evaluate(() => ({
    mode: gameMode,
    modalVisible: getComputedStyle(modalOverlay).display !== 'none',
  }));
  assert.deepEqual(state, { mode: 'sprint', modalVisible: false },
    'Enter on a mode card must start that focused mode');
  assert.equal(pageErrors.length, 0, 'keyboard mode start must not throw');
  await page.close();
}

async function testModalAccessibility(browser, url) {
  const { page, pageErrors } = await openPage(browser, url);

  const state = await page.evaluate(() => ({
    role: modalOverlay.getAttribute('role'),
    modal: modalOverlay.getAttribute('aria-modal'),
    labelledBy: modalOverlay.getAttribute('aria-labelledby'),
    gameInert: document.querySelector('#game-container').inert,
    touchInert: document.querySelector('#touch-controls').inert,
    focused: document.activeElement?.id,
  }));
  assert.deepEqual(state, {
    role: 'dialog',
    modal: 'true',
    labelledBy: 'start-screen-title',
    gameInert: true,
    touchInert: true,
    focused: 'scenario-continue-btn',
  });
  assert.equal(pageErrors.length, 0, 'opening the start dialog must not throw');
  await page.close();
}

async function testPreferencePersistence(browser, url) {
  const { page, pageErrors } = await openPage(browser, url);

  await page.locator('[data-mode-card="versus"]').click();
  await page.getByRole('button', { name: 'Start Game' }).click();
  await page.evaluate(() => {
    for (const id of ['bgm-toggle', 'sfx-toggle']) {
      const input = document.getElementById(id);
      input.checked = false;
      input.dispatchEvent(new Event('change'));
    }
  });
  await page.reload();

  const restored = await page.evaluate(() => ({
    mode: document.querySelector('#game-mode').value,
    bgm: document.querySelector('#bgm-toggle').checked,
    sfx: document.querySelector('#sfx-toggle').checked,
  }));
  assert.deepEqual(restored, { mode: 'versus', bgm: false, sfx: false },
    'mode and sound preferences must survive reloads');

  await page.evaluate(() => localStorage.setItem('neonDropPreferences', '{broken'));
  await page.reload();
  assert.equal(await page.locator('#start-screen').isVisible(), true,
    'corrupt preferences must not block the menu');
  assert.equal(pageErrors.length, 0, 'preference storage failures must not throw');
  await page.close();
}

async function testScenarioMap(browser, url) {
  const { page, pageErrors } = await openPage(browser, url);
  await page.evaluate(() => localStorage.removeItem('neonDropScenario'));
  await page.reload();

  await page.locator('#scenario-continue-btn').click();
  const initial = await page.evaluate(() => ({
    labelledBy: modalOverlay.getAttribute('aria-labelledby'),
    buttonCount: document.querySelectorAll('[data-scenario-stage]').length,
    enabled: [...document.querySelectorAll('[data-scenario-stage]')].map(button => !button.disabled),
    current: document.querySelector('[data-scenario-stage][aria-current="step"]')?.dataset.scenarioStage,
    focused: document.activeElement?.dataset.scenarioStage,
  }));
  assert.deepEqual(initial, {
    labelledBy: 'scenario-map-title',
    buttonCount: 5,
    enabled: [true, false, false, false, false],
    current: '1',
    focused: '1',
  }, 'a new campaign must open an accessible map at stage 1');

  const lockedStart = await page.evaluate(() => {
    const beforeMode = gameMode;
    const result = startScenarioStage(2);
    return { result, beforeMode, afterMode: gameMode, activeScenarioStage };
  });
  assert.equal(lockedStart.result, false, 'direct starts must not bypass campaign locks');
  assert.equal(lockedStart.afterMode, lockedStart.beforeMode, 'a rejected stage must not change game mode');
  assert.equal(lockedStart.activeScenarioStage, null, 'a rejected stage must not become active');

  await page.evaluate(() => localStorage.setItem('neonDropScenario', JSON.stringify({
    version: 1,
    unlockedStage: 3,
    results: {'1': {stars: 2, bestTimeMs: 90000}},
    upgrades: {pulse: 1, cryo: 0, firewall: 0},
    pendingRewardStage: null,
    completed: false,
  })));
  await page.reload();
  assert.equal(await page.locator('#scenario-continue-detail').innerText(), 'STAGE 03 · GLITCH');
  await page.locator('#scenario-continue-btn').click();
  assert.equal(await page.locator('[data-scenario-stage="3"]').isEnabled(), true);
  assert.equal(await page.locator('[data-scenario-stage="3"]').getAttribute('aria-current'), 'step');
  assert.equal(await page.locator('[data-scenario-stage="4"]').isDisabled(), true);
  assert.match(await page.locator('[data-scenario-stage="1"]').innerText(), /★★☆/,
    'completed stage buttons must render earned stars');
  await page.locator('[data-scenario-stage="1"]').click();
  assert.equal(await page.locator('#scenario-stage-best').innerText(), 'BEST 01:30');

  await page.locator('[data-scenario-stage="2"]').click();
  await page.locator('#scenario-play-btn').click();
  const briefing = await page.evaluate(() => ({
    labelledBy: modalOverlay.getAttribute('aria-labelledby'),
    rival: document.querySelector('#scenario-briefing-rival').textContent,
    name: document.querySelector('#scenario-briefing-name').textContent,
    objective: document.querySelector('#scenario-briefing-objective').textContent,
    modifier: document.querySelector('#scenario-briefing-modifier').textContent,
  }));
  assert.deepEqual(briefing, {
    labelledBy: 'scenario-briefing-title',
    rival: 'RUSH',
    name: 'Velocity Gate',
    objective: 'Clear 15 lines before time expires.',
    modifier: 'Faster drop speed · 02:30 limit.',
  });
  await page.locator('#scenario-briefing-back-btn').click();
  assert.equal(await page.locator('#scenario-map-screen').isVisible(), true);
  await page.locator('#scenario-play-btn').click();
  await page.locator('#scenario-stage-start-btn').click();
  const started = await page.evaluate(() => ({
    mode: gameMode,
    activeStageId: activeScenarioStage?.id,
    modalClosed: getComputedStyle(modalOverlay).display === 'none',
    playerReady: Boolean(player.matrix),
  }));
  assert.deepEqual(started, {mode: 'scenario', activeStageId: 2, modalClosed: true, playerReady: true});
  await page.evaluate(() => returnToMenu());
  assert.equal(await page.evaluate(() => activeScenarioStage), null,
    'returning to the menu must clear only the active campaign stage');

  await page.evaluate(() => localStorage.setItem('neonDropScenario', '{broken'));
  await page.reload();
  await page.locator('#scenario-continue-btn').click();
  assert.deepEqual(await page.locator('[data-scenario-stage]').evaluateAll(buttons => buttons.map(button => !button.disabled)),
    [true, false, false, false, false], 'corrupt campaign storage must fall back to a new campaign');

  const preserved = await page.evaluate(() => {
    const progress = {
      version: 1, unlockedStage: 3, results: {},
      upgrades: {pulse: 1, cryo: 0, firewall: 0}, pendingRewardStage: null, completed: false,
    };
    localStorage.setItem('neonDropScenario', JSON.stringify(progress));
    localStorage.setItem('neonDropPreferences', '{"mode":"sprint","bgm":false,"sfx":true}');
    localStorage.setItem('tetrisLeaderboard', '[{"name":"KEEP","score":77}]');
    return {
      preferences: localStorage.getItem('neonDropPreferences'),
      leaderboard: localStorage.getItem('tetrisLeaderboard'),
    };
  });
  await page.reload();
  await page.locator('#scenario-continue-btn').click();
  await page.evaluate(() => {
    window.__scenarioResetPrompt = '';
    window.confirm = message => {
      window.__scenarioResetPrompt = message;
      return false;
    };
  });
  await page.locator('#scenario-reset-btn').click();
  assert.equal(await page.evaluate(() => scenarioProgress.unlockedStage), 3,
    'cancelling New Campaign must keep progress');
  assert.equal(await page.evaluate(() => window.__scenarioResetPrompt),
    'Neon Circuit 진행도를 초기화하시겠습니까?');
  await page.evaluate(() => { window.confirm = () => true; });
  await page.locator('#scenario-reset-btn').click();
  const reset = await page.evaluate(() => ({
    progress: scenarioProgress,
    selected: selectedScenarioStageId,
    preferences: localStorage.getItem('neonDropPreferences'),
    leaderboard: localStorage.getItem('tetrisLeaderboard'),
  }));
  assert.deepEqual(reset.progress, await page.evaluate(() => createScenarioProgress()));
  assert.equal(reset.selected, 1);
  assert.equal(reset.preferences, preserved.preferences, 'New Campaign must preserve quick-play preferences');
  assert.equal(reset.leaderboard, preserved.leaderboard, 'New Campaign must preserve the leaderboard');
  assert.equal(pageErrors.length, 0, 'campaign map and briefing interactions must not throw');
  await page.close();
}

async function testAnimationFrameScheduling(browser, url) {
  const { page, pageErrors } = await openPage(browser, url);
  await page.evaluate(() => {
    const callbacks = [];
    window.__scheduledFrames = callbacks;
    window.requestAnimationFrame = callback => {
      callbacks.push(callback);
      return callbacks.length;
    };
  });

  await page.getByRole('button', { name: 'Start Game' }).click();
  await page.keyboard.press('p');
  await page.keyboard.press('p');
  await page.keyboard.press('p');
  await page.keyboard.press('p');

  const scheduledFrames = await page.evaluate(() => window.__scheduledFrames.length);
  assert.equal(scheduledFrames, 1,
    'repeated pause/resume before a frame runs must not create duplicate game loops');
  assert.equal(pageErrors.length, 0, 'animation scheduling must not throw');
  await page.close();
}

async function testExitGame(browser, url) {
  const { page, pageErrors } = await openPage(browser, url);
  const dialogs = [];
  let mainFrameNavigations = 0;
  page.on('dialog', async dialog => {
    dialogs.push(dialog.type());
    await dialog.accept();
  });
  page.on('framenavigated', frame => {
    if (frame === page.mainFrame()) mainFrameNavigations++;
  });

  await page.getByRole('button', { name: 'Start Game' }).click();
  await page.locator('#exit-game-btn').click();
  await page.waitForTimeout(100);

  assert.deepEqual(dialogs, ['confirm'], 'Exit Game must use only one confirmation dialog');
  assert.equal(mainFrameNavigations, 0, 'Exit Game must not navigate away from the game page');
  assert.equal(await page.locator('#start-screen').isVisible(), true, 'Exit Game must return to the start screen');
  assert.equal(await page.evaluate(() => player.matrix), null, 'Exit Game must reset the active piece');
  assert.equal(page.url(), url, 'Exit Game must keep the game page open');
  assert.equal(pageErrors.length, 0, 'Exit Game must not throw');
  await page.close();
}

async function testCampaignMenuExit(browser, url) {
  const { page, pageErrors } = await openPage(browser, url);

  assert.equal(await page.getByRole('button', { name: /Continue Campaign.*Neon Circuit/i }).count(), 1,
    'the initial menu must offer Continue Campaign for Neon Circuit');
  assert.equal(await page.locator('#start-screen #menu-exit-btn').getAttribute('aria-label'), 'Exit Game',
    'the initial-menu Exit Game action must use its own ID');
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'scenario-continue-btn',
    'the campaign card must receive initial dialog focus');

  await page.evaluate(() => { window.confirm = () => false; });
  await page.locator('#menu-exit-btn').click();
  assert.equal(await page.locator('#start-screen').isVisible(), true,
    'cancelling application exit must keep the menu visible');
  assert.equal(await page.locator('#exit-screen').isVisible(), false,
    'cancelling application exit must not reveal the fallback screen');

  await page.evaluate(() => {
    window.__cancelledFrames = [];
    window.requestAnimationFrame = () => 4242;
    window.cancelAnimationFrame = id => window.__cancelledFrames.push(id);
  });
  await page.getByRole('button', { name: 'Start Game' }).click();
  assert.equal(await page.evaluate(() => isBgmRunning()), true,
    'active gameplay must have running BGM before exit');
  assert.equal(await page.evaluate(() => animationFrameId), 4242,
    'active gameplay must retain the scheduled animation frame ID before exit');
  await page.evaluate(() => {
    window.confirm = () => true;
    window.__closeCount = 0;
    window.close = () => { window.__closeCount++; };
  });
  await page.evaluate(() => exitApplication());
  await page.locator('#exit-screen').waitFor({ state: 'visible' });

  assert.deepEqual(await page.evaluate(() => ({
    closeCount: window.__closeCount,
    cancelledFrames: window.__cancelledFrames,
    animationFrameId,
    bgmRunning: isBgmRunning(),
    focused: document.activeElement?.id,
  })), { closeCount: 1, cancelledFrames: [4242], animationFrameId: null, bgmRunning: false, focused: 'exit-return-btn' },
  'safe exit must stop gameplay and focus the fallback action');

  await page.locator('#exit-return-btn').click();
  assert.equal(await page.locator('#start-screen').isVisible(), true,
    'Return to Menu must restore the initial menu');
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'scenario-continue-btn',
    'Return to Menu must restore campaign-card focus');
  assert.equal(pageErrors.length, 0, 'campaign menu exit must not throw');
  await page.close();
}

async function testTerminalExitAudio(browser, url) {
  const { page, pageErrors } = await openPage(browser, url);

  await page.evaluate(() => {
    window.confirm = () => true;
    window.close = () => {};
    exitApplication();
  });
  await page.locator('#exit-screen').waitFor({ state: 'visible' });
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => isBgmRunning()), false,
    'keyboard navigation on the terminal fallback must not restart BGM');
  assert.equal(pageErrors.length, 0, 'terminal fallback keyboard navigation must not throw');
  await page.close();
}

async function testShortLandscapeMenu(browser, url) {
  const { page, pageErrors } = await openPage(browser, url);
  await page.setViewportSize({ width: 568, height: 320 });
  await page.reload();

  const initial = await page.evaluate(() => ({
    modalTop: startScreen.getBoundingClientRect().top,
    overlayScrollable: modalOverlay.scrollHeight > modalOverlay.clientHeight,
  }));
  assert.ok(initial.modalTop >= 0, 'short landscape must keep the start modal below the viewport top');
  assert.equal(initial.overlayScrollable, true, 'short landscape must make the modal overlay scrollable');

  await page.locator('#menu-exit-btn').scrollIntoViewIfNeeded();
  const exitBounds = await page.locator('#menu-exit-btn').evaluate(button => {
    const rect = button.getBoundingClientRect();
    return { top: rect.top, bottom: rect.bottom, viewportHeight: innerHeight };
  });
  assert.ok(exitBounds.top >= 0 && exitBounds.bottom <= exitBounds.viewportHeight,
    'short landscape must scroll the menu Exit action fully into view');
  assert.equal(pageErrors.length, 0, 'short landscape modal layout must not throw');
  await page.close();
}

async function testLayoutSizing(browser, url) {
  const { page, pageErrors } = await openPage(browser, url);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.reload();
  await page.getByRole('button', { name: 'Start Game' }).click();

  const single = await page.evaluate(() => {
    const container = document.querySelector('#game-container').getBoundingClientRect();
    const playerPanel = document.querySelector('#player-panel')?.getBoundingClientRect();
    const side = document.querySelector('#side-panel').getBoundingClientRect();
    return {
      display: getComputedStyle(document.querySelector('#game-container')).display,
      areas: getComputedStyle(document.querySelector('#game-container')).gridTemplateAreas,
      playerPanelExists: Boolean(playerPanel),
      playerAndRailShareRow: Boolean(playerPanel) && Math.abs(playerPanel.top - side.top) < 4,
      opponentHidden: getComputedStyle(document.querySelector('#opponent-panel')).display === 'none',
      versusCount: document.querySelectorAll('#versus-status').length,
      versusHidden: !document.querySelector('#versus-status') ||
        getComputedStyle(document.querySelector('#versus-status')).display === 'none',
      containerTop: container.top,
      containerBottom: container.bottom,
      viewportHeight: innerHeight,
      noPageScroll: document.documentElement.scrollHeight <= innerHeight,
    };
  });
  assert.equal(single.display, 'grid', 'desktop play must use the Arena HUD grid');
  assert.equal(single.playerPanelExists, true, 'the player board needs a labelled panel');
  assert.ok(single.areas.includes('player rail'), 'single-player must place the board beside its rail');
  assert.equal(single.playerAndRailShareRow, true);
  assert.equal(single.opponentHidden, true);
  assert.equal(single.versusCount, 1, 'the shared shell must include Versus status');
  assert.equal(single.versusHidden, true, 'single-player must hide Versus-only status');
  assert.ok(single.containerTop >= 0 && single.containerBottom <= single.viewportHeight);
  assert.equal(single.noPageScroll, true, '1280x720 single-player must not scroll');

  await page.evaluate(() => returnToMenu());
  await page.selectOption('#game-mode', 'versus');
  await page.getByRole('button', { name: 'Start Game' }).click();
  const versus = await page.evaluate(() => {
    const shell = document.querySelector('#game-container');
    const container = shell.getBoundingClientRect();
    const ai = document.querySelector('#opponent-board').getBoundingClientRect();
    const player = document.querySelector('#tetris').getBoundingClientRect();
    return {
      areas: getComputedStyle(shell).gridTemplateAreas,
      containerTop: container.top,
      containerBottom: container.bottom,
      viewportHeight: innerHeight,
      noPageScroll: document.documentElement.scrollHeight <= innerHeight,
      sameRow: Math.abs(ai.top - player.top) < 4,
      sameSize: Math.abs(ai.width - player.width) < 4 && Math.abs(ai.height - player.height) < 4,
      aiLabel: document.querySelector('#opponent-panel .board-label')?.textContent.trim(),
      playerLabel: document.querySelector('#player-panel .board-label')?.textContent.trim(),
      versusVisible: Boolean(document.querySelector('#versus-status')) &&
        getComputedStyle(document.querySelector('#versus-status')).display !== 'none',
    };
  });

  assert.ok(versus.areas.includes('opponent versus player rail'));
  assert.ok(versus.containerTop >= 0 && versus.containerBottom <= versus.viewportHeight,
    `1280x720 Versus must fit inside the viewport: ${JSON.stringify(versus)}`);
  assert.equal(versus.noPageScroll, true, '1280x720 Versus must not scroll');
  assert.equal(versus.sameRow, true, 'AI and Player boards must share a row');
  assert.equal(versus.sameSize, true, 'AI and Player boards must have equal visual size');
  assert.equal(versus.aiLabel, 'AI RIVAL');
  assert.equal(versus.playerLabel, 'YOU');
  assert.equal(versus.versusVisible, true);
  assert.equal(pageErrors.length, 0, 'layout measurement must not throw');
  await page.close();
}

async function testResponsiveLayout(browser, url) {
  const { page, pageErrors } = await openPage(browser, url);
  await page.setViewportSize({ width: 360, height: 704 });
  await page.reload();

  const singlePlayerLayout = await page.evaluate(() => {
    const container = document.querySelector('#game-container');
    const board = document.querySelector('#tetris').getBoundingClientRect();
    const side = document.querySelector('#side-panel').getBoundingClientRect();
    return {
      direction: getComputedStyle(container).flexDirection,
      boardTop: board.top,
      boardBottom: board.bottom,
      sideTop: side.top,
      scrollable: getComputedStyle(document.body).overflowY,
      documentHeight: document.documentElement.scrollHeight,
      viewportHeight: innerHeight,
    };
  });
  assert.equal(singlePlayerLayout.direction, 'row', 'mobile grid keeps its default flex-direction for compatibility');
  assert.ok(singlePlayerLayout.sideTop >= singlePlayerLayout.boardBottom,
    'mobile 1P must place secondary panels below the board');
  assert.equal(singlePlayerLayout.scrollable, 'auto', 'mobile layouts must be scrollable when content needs it');
  assert.ok(singlePlayerLayout.documentHeight >= singlePlayerLayout.viewportHeight, 'mobile 1P must keep content in normal scroll flow');

  await page.selectOption('#game-mode', 'versus');
  await page.getByRole('button', { name: 'Start Game' }).click();
  const versusLayout = await page.evaluate(() => {
    const container = document.querySelector('#game-container');
    const board = document.querySelector('#tetris').getBoundingClientRect();
    const opponent = document.querySelector('#opponent-board').getBoundingClientRect();
    const side = document.querySelector('#side-panel').getBoundingClientRect();
    return {
      active: container.classList.contains('versus-active'),
      display: getComputedStyle(container).display,
      columns: getComputedStyle(container).gridTemplateColumns.split(' ').filter(Boolean).length,
      direction: getComputedStyle(container).flexDirection,
      boardsShareRow: Math.abs(board.top - opponent.top) < 20,
      boardsShareSize: Math.abs(board.height - opponent.height) < 8,
      sideBelowBoards: side.top > Math.max(board.bottom, opponent.bottom),
    };
  });
  assert.equal(versusLayout.active, true, 'Versus must activate its responsive layout class');
  assert.equal(versusLayout.display, 'grid', 'Versus must use a two-column board grid');
  assert.equal(versusLayout.columns, 2, 'Versus must allocate one column per board');
  assert.equal(versusLayout.boardsShareRow, true, 'mobile 2P boards must share a horizontal row');
  assert.equal(versusLayout.boardsShareSize, true, 'mobile 2P boards must have the same visual size');
  assert.equal(versusLayout.sideBelowBoards, true, 'mobile 2P stats must move below both boards');

  await page.setViewportSize({ width: 900, height: 1400 });
  await page.reload();
  const portraitLayout = await page.evaluate(() => {
    const container = document.querySelector('#game-container');
    const board = document.querySelector('#tetris').getBoundingClientRect();
    const side = document.querySelector('#side-panel').getBoundingClientRect();
    return {
      portrait: matchMedia('(orientation: portrait)').matches,
      direction: getComputedStyle(container).flexDirection,
      boardTop: board.top,
      boardBottom: board.bottom,
      sideTop: side.top,
      boardWidth: board.width,
      documentHeight: document.documentElement.scrollHeight,
      viewportHeight: innerHeight,
    };
  });
  assert.equal(portraitLayout.portrait, true, 'the regression viewport must be portrait');
  assert.equal(portraitLayout.direction, 'row', 'portrait grid keeps its default flex-direction for compatibility');
  assert.ok(portraitLayout.sideTop >= portraitLayout.boardBottom, 'portrait 1P must keep panels below the board');
  assert.ok(portraitLayout.boardWidth >= 240, 'large portrait layouts must keep the board readable');
  assert.ok(portraitLayout.documentHeight >= portraitLayout.viewportHeight, 'portrait layouts must retain normal scroll flow');

  await page.setViewportSize({ width: 672, height: 1404 });
  await page.reload();
  const widePortraitLayout = await page.evaluate(() => ({
    boardWidth: document.querySelector('#tetris').getBoundingClientRect().width,
    viewportWidth: innerWidth,
  }));
  assert.equal(widePortraitLayout.viewportWidth, 672);
  assert.ok(widePortraitLayout.boardWidth >= 200, 'medium portrait layouts must not use the tiny mobile scale');
  assert.equal(pageErrors.length, 0, 'responsive layout must not throw');
  await page.close();
}

async function testGameRules(browser, url) {
  const { page, pageErrors } = await openPage(browser, url);
  await page.getByRole('button', { name: 'Start Game' }).click();

  const topRowResult = await page.evaluate(() => {
    arena.forEach(row => row.fill(0));
    player.lines = 0;
    player.score = 0;
    arena[0].fill(1);
    arenaSweep();
    return {
      cleared: player.lines,
      topRowEmpty: arena[0].every(value => value === 0),
    };
  });
  assert.equal(topRowResult.cleared, 1, 'the top row must be clearable');
  assert.equal(topRowResult.topRowEmpty, true, 'the cleared top row must be empty');

  const holdCollision = await page.evaluate(() => {
    arena.forEach(row => row.fill(0));
    player.matrix = createPiece('D');
    player.hold = createPiece('S');
    player.canHold = true;
    player.pos = { x: 4, y: 0 };
    for (let y = 0; y < 4; y++) arena[y][5] = 8;
    playerHold();
    return { gameOver: isGameOver, y: player.pos.y };
  });
  assert.equal(holdCollision.gameOver, true, 'a held piece colliding at spawn must end the game');
  assert.equal(holdCollision.y, 0, 'a colliding held piece must not move above the board');
  assert.equal(pageErrors.length, 0, 'game-rule operations must not throw');

  await page.close();

  const { page: versusPage, pageErrors: versusPageErrors } = await openPage(browser, url);
  await versusPage.selectOption('#game-mode', 'versus');
  await versusPage.getByRole('button', { name: 'Start Game' }).click();
  const versusHoldCollision = await versusPage.evaluate(() => {
    arena.forEach(row => row.fill(0));
    isGameOver = false;
    opponent.gameOver = false;
    matchEventLog = [];
    player.matrix = createPiece('D');
    player.hold = createPiece('S');
    player.canHold = true;
    player.pos = { x: 4, y: 0 };
    for (let y = 0; y < 4; y++) arena[y][5] = 8;
    playerHold();
    return {
      gameOver: isGameOver,
      opponentGameOver: opponent.gameOver,
      title: gameOverTitleElement.innerText,
      event: matchEventLog.at(-1)?.type,
    };
  });
  assert.deepEqual(versusHoldCollision, {
    gameOver: true,
    opponentGameOver: true,
    title: 'You Lose!',
    event: 'match-lose',
  }, 'a Versus Hold spawn collision must end the match as a player loss');
  assert.equal(versusPageErrors.length, 0, 'Versus Hold collision must not throw');

  const marathonGarbage = await versusPage.evaluate(() => {
    const originalRandom = Math.random;
    try {
      gameMode = 'marathon';
      arena.forEach(row => row.fill(0));
      arena[19].fill(1);
      player.lines = 0;
      player.score = 0;
      player.level = 3;
      Math.random = () => 0.99;
      arenaSweep();
      return arena.flat().filter(Boolean).length;
    } finally {
      Math.random = originalRandom;
    }
  });
  assert.equal(marathonGarbage, 0, 'Marathon line clears must not add undocumented garbage');

  const sprintGarbage = await versusPage.evaluate(() => {
    const originalRandom = Math.random;
    try {
      gameMode = 'sprint';
      arena.forEach(row => row.fill(0));
      arena[19].fill(1);
      player.lines = 0;
      player.score = 0;
      player.level = 3;
      Math.random = () => 0.99;
      arenaSweep();
      return arena.flat().filter(Boolean).length;
    } finally {
      Math.random = originalRandom;
    }
  });
  assert.equal(sprintGarbage, 0, 'Sprint line clears must not add undocumented garbage');

  await versusPage.close();
}

async function testStateReset(browser, url) {
  const { page, pageErrors } = await openPage(browser, url);
  await page.getByRole('button', { name: 'Start Game' }).click();
  await page.evaluate(() => {
    player.hold = createPiece('S');
    player.lockTimer = 123;
    combo = 3;
    comboTimer = 1000;
    flashingLines = [{ y: 1, time: 10 }];
  });
  await page.keyboard.press('p');
  await page.getByRole('button', { name: 'Quit to Menu' }).click();
  await page.getByRole('button', { name: 'Start Game' }).click();

  const state = await page.evaluate(() => ({
    hold: player.hold,
    lockTimer: player.lockTimer,
    combo,
    comboTimer,
    flashingLines: flashingLines.length,
  }));
  assert.equal(state.hold, null, 'new games must clear the held piece');
  assert.equal(state.lockTimer, 0, 'new games must clear the lock timer');
  assert.equal(state.combo, 0, 'new games must clear combo state');
  assert.equal(state.comboTimer, 0, 'new games must clear combo timer');
  assert.equal(state.flashingLines, 0, 'new games must clear visual effects');
  assert.equal(pageErrors.length, 0, 'state reset must not throw');

  await page.close();
}

async function testLeaderboardSafety(browser, url) {
  const { page, pageErrors } = await openPage(browser, url);

  await page.evaluate(() => localStorage.setItem('tetrisLeaderboard', '{broken'));
  await page.reload();
  assert.equal(pageErrors.length, 0, 'corrupt leaderboard data must not crash the page');
  assert.equal(await page.locator('#leaderboard').textContent(), 'No records yet');

  await page.evaluate(() => localStorage.setItem(
    'tetrisLeaderboard',
    JSON.stringify([{ name: '<b>name</b>', score: 100 }]),
  ));
  await page.reload();
  const leaderboard = await page.locator('#leaderboard').evaluate(element => ({
    html: element.innerHTML,
    text: element.textContent,
  }));
  assert.equal(leaderboard.html.includes('<b>name</b>'), false, 'nickname must not be interpreted as HTML');
  assert.equal(leaderboard.text.includes('<b>name</b>'), true, 'nickname must remain visible as text');

  await page.close();
}

async function testScoreSave(browser, url) {
  const { page, pageErrors } = await openPage(browser, url);
  await page.getByRole('button', { name: 'Start Game' }).click();
  await page.evaluate(() => {
    player.score = 321;
    showHighScoreModal();
  });
  await page.fill('#nickname', 'AI_Agent');
  await page.getByRole('button', { name: 'Save Score' }).click();

  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('tetrisLeaderboard')));
  assert.deepEqual(saved[0], { name: 'AI_Agent', score: 321 });
  assert.equal(await page.locator('#start-screen').isVisible(), true, 'saving a score returns to the menu');
  assert.equal(pageErrors.length, 0, 'score saving must not throw');
  await page.close();
}

async function testGameplayEnhancements(browser, url) {
  const { page, pageErrors } = await openPage(browser, url);

  await page.getByRole('button', { name: 'Start Game' }).click();
  const hardDropShake = await page.evaluate(() => {
    arena.forEach(row => row.fill(0));
    player.matrix = createPiece('D');
    player.pos = {x: 5, y: 0};
    shakeTime = 0;
    playerHardDrop();
    return shakeTime;
  });
  assert.equal(hardDropShake, 0, 'placing one block must not shake the board');
  await page.evaluate(() => returnToMenu());

  assert.equal(await page.locator('#game-mode').count(), 1, 'the start screen must expose a game mode selector');
  assert.equal(await page.locator('#game-mode').inputValue(), 'marathon');
  assert.equal(
    await page.locator('#game-mode option[value="versus"]').innerText(),
    '2P · Versus AI',
    'the Versus option must clearly identify the 2P mode',
  );

  const audio = await page.evaluate(() => ({
    name: themeMelodyName,
    notes: themeMelody.length,
  }));
  assert.equal(audio.name, 'Neon Circuit', 'the game must use the new BGM theme');
  assert.equal(audio.notes, 24, 'the new BGM must use a compact loop');

  const bag = await page.evaluate(() => {
    pieceBag = [];
    return Array.from({ length: 7 }, () => nextPieceType());
  });
  assert.equal(new Set(bag).size, 7, 'each 7-bag must contain every piece once');

  const scoring = await page.evaluate(() => {
    player.score = 0;
    player.level = 1;
    combo = 0;
    backToBackActive = false;
    scoreLines(4, false);
    return {
      score: player.score,
      backToBack: backToBackActive,
      event: lastEventMessage,
    };
  });
  assert.equal(scoring.score, 800, 'a Quad Clear must award 800 points at level 1');
  assert.equal(scoring.backToBack, true, 'a Quad Clear must enable Back-to-back');
  assert.equal(scoring.event, 'QUAD CLEAR', 'a Quad Clear must expose an event message');

  const pivot = await page.evaluate(() => {
    player.score = 0;
    player.level = 1;
    combo = 0;
    backToBackActive = false;
    scoreLines(2, true);
    return {
      score: player.score,
      event: lastEventMessage,
    };
  });
  assert.equal(pivot.score, 1200, 'a Pivot double must award 1200 points at level 1');
  assert.equal(pivot.event, 'PIVOT DOUBLE', 'a Pivot double must expose an event message');

  const pivotNoLine = await page.evaluate(() => {
    const previousMode = gameMode;
    gameMode = 'versus';
    opponent.pendingGarbage = 0;
    player.score = 0;
    player.level = 1;
    combo = 3;
    backToBackActive = false;
    scoreLines(0, true);
    const result = {
      pendingGarbage: opponent.pendingGarbage,
      directAttack: calculateGarbageAttack(0, true, false, 0),
    };
    gameMode = previousMode;
    return result;
  });
  assert.equal(pivotNoLine.pendingGarbage, 0, 'a zero-line Pivot must not send combo garbage');
  assert.equal(pivotNoLine.directAttack, 0, 'a zero-line Pivot has no base garbage attack');

  await page.selectOption('#game-mode', 'sprint');
  await page.getByRole('button', { name: 'Start Game' }).click();
  const sprint = await page.evaluate(() => {
    player.lines = 40;
    return checkSprintCompletion();
  });
  assert.equal(sprint, true, 'Sprint must complete at 40 lines');
  assert.equal(await page.locator('#game-over-title').innerText(), 'Sprint Complete!');
  assert.equal(pageErrors.length, 0, 'gameplay enhancements must not throw');

  await page.close();
}

async function testVersusMode(browser, url) {
  const { page, pageErrors } = await openPage(browser, url);

  assert.equal(await page.locator('#game-mode option[value="versus"]').count(), 1);
  assert.equal(await page.locator('#opponent-panel').isVisible(), false);

  const rules = await page.evaluate(() => {
    const board = createMatrix(12, 20);
    addGarbageLines(board, 2, () => 0.25);
    const garbageShape = board.slice(-2).map(row => ({
      filled: row.filter(value => value === 8).length,
      holes: row.filter(value => value === 0).length,
    }));
    const attackTable = [
      calculateGarbageAttack(1, false, false, 1),
      calculateGarbageAttack(2, false, false, 1),
      calculateGarbageAttack(3, false, false, 1),
      calculateGarbageAttack(4, false, false, 1),
      calculateGarbageAttack(2, true, false, 1),
      calculateGarbageAttack(4, false, true, 3),
    ];
    opponent.arena.forEach(row => row.fill(0));
    opponent.arena[19].fill(8);
    opponent.arena[19][11] = 0;
    opponent.matrix = createPiece('D');
    opponent.pos = { x: 5, y: 0 };
    const before = JSON.stringify(opponent.arena);
    const move = chooseOpponentMove(opponent.matrix, opponent.arena);
    return { garbageShape, attackTable, before, after: JSON.stringify(opponent.arena), move };
  });

  assert.deepEqual(rules.garbageShape, [
    { filled: 11, holes: 1 },
    { filled: 11, holes: 1 },
  ]);
  assert.deepEqual(rules.attackTable, [0, 1, 2, 4, 4, 7]);
  assert.equal(rules.before, rules.after, 'AI search must not mutate the live board');
  assert.ok(Number.isInteger(rules.move.x));
  assert.ok(Number.isInteger(rules.move.rotation));

  await page.selectOption('#game-mode', 'versus');
  await page.getByRole('button', { name: 'Start Game' }).click();
  const match = await page.evaluate(() => ({
    mode: gameMode,
    opponentReady: Boolean(opponent.matrix && opponent.next),
    independentBags: pieceBag !== opponent.pieceBag,
    opponentX: opponent.pos.x,
    expectedOpponentX: (VERSUS_WIDTH / 2 | 0) - (opponent.matrix[0].length / 2 | 0),
    event: matchEventLog.at(-1),
  }));
  assert.equal(match.mode, 'versus');
  assert.equal(await page.locator('#opponent-panel').isVisible(), true);
  assert.equal(match.opponentReady, true);
  assert.equal(match.independentBags, true, 'player and AI must own independent bags');
  assert.equal(match.opponentX, match.expectedOpponentX, 'the AI must spawn centered on its board');
  assert.equal(match.event.type, 'match-start');

  const pressureHud = await page.evaluate(() => {
    opponent.pendingGarbage = 5;
    playerPendingGarbage = 3;
    update(performance.now());
    return {
      aiText: document.querySelector('#opponent-garbage').textContent,
      playerText: document.querySelector('#player-garbage').textContent,
      aiMeter: document.querySelector('#opponent-garbage-meter').style.width,
      playerMeter: document.querySelector('#player-garbage-meter').style.width,
    };
  });
  assert.deepEqual(pressureHud, {
    aiText: 'AI INCOMING 05',
    playerText: 'YOU INCOMING 03',
    aiMeter: '25%',
    playerMeter: '15%',
  }, 'Versus pressure must be readable as text and a visual meter');
  await page.evaluate(() => {
    opponent.pendingGarbage = 0;
    playerPendingGarbage = 0;
  });

  const flow = await page.evaluate(() => {
    queueGarbageForOpponent(4);
    const pendingBefore = opponent.pendingGarbage;
    runOpponentTurn();
    return {
      pendingBefore,
      pendingAfter: opponent.pendingGarbage,
      opponentBoard: opponent.arena.flat().filter(Boolean).length,
    };
  });
  assert.equal(flow.pendingBefore, 4);
  assert.equal(flow.pendingAfter, 0);
  assert.ok(flow.opponentBoard > 0, 'AI turn must place a piece');

  const incoming = await page.evaluate(() => {
    arena.forEach(row => row.fill(0));
    playerPendingGarbage = 2;
    player.next = createPiece('D');
    playerReset();
    return {
      pending: playerPendingGarbage,
      garbageRows: arena.slice(-2).map(row => row.filter(value => value === 8).length),
      receivedEvent: matchEventLog.at(-1),
    };
  });
  assert.equal(incoming.pending, 0);
  assert.deepEqual(incoming.garbageRows, [11, 11], 'AI attacks must become player garbage');
  assert.equal(incoming.receivedEvent.type, 'garbage-received');

  const topOut = await page.evaluate(() => {
    arena.forEach(row => row.fill(0));
    arena[0][0] = 1;
    isGameOver = false;
    opponent.gameOver = false;
    playerPendingGarbage = 1;
    player.next = createPiece('D');
    playerReset();
    return {gameOver: isGameOver, pending: playerPendingGarbage};
  });
  assert.equal(topOut.gameOver, true, 'garbage that pushes blocks off the top must end the match');
  assert.equal(topOut.pending, 0, 'overflowed garbage must still be consumed');
  assert.equal(await page.locator('#game-over-title').innerText(), 'You Lose!');

  await page.evaluate(() => {
    isGameOver = false;
    opponent.gameOver = false;
    endVersusMatch('You Win!', 'match-win');
  });
  assert.equal(await page.locator('#game-over-title').innerText(), 'You Win!');
  assert.equal(pageErrors.length, 0);
  await page.close();
}

async function testUsabilityUI(browser, url) {
  const { page, pageErrors } = await openPage(browser, url);

  assert.equal(await page.locator('[data-mode-card="marathon"]').count(), 1,
    'the start screen must explain Marathon with a selectable mode card');
  assert.equal(await page.locator('[data-mode-card="sprint"]').count(), 1,
    'the start screen must explain Sprint with a selectable mode card');
  assert.equal(await page.locator('[data-mode-card="versus"]').count(), 1,
    'the start screen must explain Versus with a selectable mode card');
  await page.getByRole('button', { name: /Sprint.*40 lines/i }).click();
  assert.equal(await page.locator('#game-mode').inputValue(), 'sprint',
    'selecting a mode card must update the game mode');
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('#mode').innerText(), 'Mode: Sprint',
    'Enter must start the selected mode from the menu');

  assert.equal(await page.locator('#game-help').evaluate(element => element.open), false,
    'control help must be collapsed until a player asks for it');
  await page.locator('#game-help summary').click();
  assert.equal(await page.locator('#game-help').evaluate(element => element.open), true,
    'control help must be available as a disclosure');

  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.locator('#touch-controls').isVisible(), true,
    'mobile games must expose touch controls');
  assert.equal(await page.locator('#touch-left').getAttribute('aria-label'), 'Move left');
  const before = await page.evaluate(() => ({ ...player.pos }));
  await page.locator('#touch-left').click();
  const after = await page.evaluate(() => ({ ...player.pos }));
  assert.equal(after.x, before.x - 1, 'touch controls must use the same movement as keyboard input');
  assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('#game-container')).zoom), '1',
    'mobile layout must not depend on CSS zoom');

  await page.evaluate(() => showHighScoreModal());
  await page.getByRole('button', { name: 'Main Menu' }).click();
  assert.equal(await page.locator('#start-screen').isVisible(), true,
    'Main Menu must return in-app to the start screen');
  assert.equal(page.url(), url, 'Main Menu must not navigate away from the game');
  assert.equal(pageErrors.length, 0, 'usability interactions must not throw');
  await page.close();
}

(async () => {
  const server = createServer();
  const browser = await chromium.launch({ headless: true });

  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address();
    const url = `http://127.0.0.1:${port}/index.html`;

    await testInputGuards(browser, url);
    await testKeyboardModeStart(browser, url);
    await testCampaignMenuExit(browser, url);
    await testTerminalExitAudio(browser, url);
    await testShortLandscapeMenu(browser, url);
    await testModalAccessibility(browser, url);
    await testPreferencePersistence(browser, url);
    await testScenarioMap(browser, url);
    await testAnimationFrameScheduling(browser, url);
    await testExitGame(browser, url);
    await testLayoutSizing(browser, url);
    await testResponsiveLayout(browser, url);
    await testGameRules(browser, url);
    await testStateReset(browser, url);
    await testLeaderboardSafety(browser, url);
    await testScoreSave(browser, url);
    await testGameplayEnhancements(browser, url);
    await testVersusMode(browser, url);
    await testUsabilityUI(browser, url);
    console.log('All Neon Drop tests passed.');
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
