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
  assert.equal(await page.evaluate(() => {
    const stage = SCENARIO_STAGES.find(candidate => candidate.id === 2);
    return document.querySelector('#scenario-briefing-objective').textContent.includes(String(stage.lineGoal))
      && document.querySelector('#scenario-briefing-modifier').textContent.includes(formatElapsedTime(stage.timeLimitMs));
  }), true, 'stage 2 briefing copy must use its scenario definition values');
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
    localStorage.setItem('tetrisLeaderboard', JSON.stringify({
      generation: 2,
      scores: [{name: 'KEEP', score: 77}],
    }));
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
  const resetFailureBefore = await page.evaluate(() => {
    window.confirm = () => true;
    window.__scenarioSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = () => { throw new Error('storage full'); };
    return {
      progress: JSON.stringify(scenarioProgress),
      stored: localStorage.getItem('neonDropScenario'),
      selected: selectedScenarioStageId,
      map: document.querySelector('#scenario-map-screen').style.display,
    };
  });
  let resetFailure;
  try {
    await page.locator('#scenario-reset-btn').click();
    resetFailure = await page.evaluate(() => {
      const error = document.querySelector('#scenario-reset-error');
      return {
        progress: JSON.stringify(scenarioProgress),
        stored: localStorage.getItem('neonDropScenario'),
        selected: selectedScenarioStageId,
        map: document.querySelector('#scenario-map-screen').style.display,
        error: error?.textContent ?? null,
        ariaLive: error?.getAttribute('aria-live') ?? null,
      };
    });
  } finally {
    await page.evaluate(() => {
      Storage.prototype.setItem = window.__scenarioSetItem;
      delete window.__scenarioSetItem;
    });
  }
  assert.deepEqual(resetFailure, {
    ...resetFailureBefore,
    error: 'New Campaign could not be saved. Check browser storage and try again.',
    ariaLive: 'polite',
  }, 'a failed New Campaign save must preserve memory, storage, selection, and the current map');

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

  await page.reload();
  assert.equal(await page.locator('#scenario-continue-detail').innerText(), 'STAGE 01 · BYTE',
    'confirmed New Campaign progress must survive reload');
  await page.locator('#scenario-continue-btn').click();
  assert.deepEqual(await page.locator('[data-scenario-stage]').evaluateAll(buttons => buttons.map(button => !button.disabled)),
    [true, false, false, false, false], 'reloaded reset progress must still unlock stage 1 only');
  assert.equal(await page.evaluate(() => localStorage.getItem('neonDropPreferences')), preserved.preferences);
  assert.equal(await page.evaluate(() => localStorage.getItem('tetrisLeaderboard')), preserved.leaderboard);
  assert.equal(pageErrors.length, 0, 'campaign map and briefing interactions must not throw');
  await page.close();
}

async function testScenarioMapNavigation(browser, url) {
  const { page, pageErrors } = await openPage(browser, url);
  await page.evaluate(() => localStorage.setItem('neonDropScenario', JSON.stringify({
    version: 1, unlockedStage: 3, results: {},
    upgrades: {pulse: 0, cryo: 0, firewall: 0}, pendingRewardStage: null, completed: false,
  })));
  await page.reload();
  await page.locator('#scenario-continue-btn').click();
  await page.locator('[data-scenario-stage="1"]').click();
  await page.locator('#scenario-map-back-btn').click();
  await page.locator('#scenario-continue-btn').click();
  assert.equal(await page.locator('[data-scenario-stage="3"]').getAttribute('aria-current'), 'step',
    'Continue must return to the highest unlocked stage');
  assert.equal(await page.evaluate(() => document.activeElement?.dataset.scenarioStage), '3',
    'Continue must focus the highest unlocked stage');

  await page.evaluate(() => localStorage.removeItem('neonDropScenario'));
  await page.setViewportSize({width: 360, height: 640});
  await page.reload();
  await page.locator('#scenario-continue-btn').click();
  const mapScroll = await page.locator('#scenario-map-screen').evaluate(element => ({
    overflowY: getComputedStyle(element).overflowY,
    scrollHeight: element.scrollHeight,
    clientHeight: element.clientHeight,
  }));
  assert.equal(mapScroll.overflowY, 'auto', 'portrait campaign maps must provide their own vertical scroll');
  assert.ok(mapScroll.scrollHeight > mapScroll.clientHeight, 'portrait campaign map content must overflow into scrolling');

  await page.evaluate(() => { window.confirm = () => false; });
  for (const selector of ['#scenario-reset-btn', '#scenario-play-btn']) {
    const action = page.locator(selector);
    await action.scrollIntoViewIfNeeded();
    const bounds = await action.evaluate(element => {
      const rect = element.getBoundingClientRect();
      return {top: rect.top, bottom: rect.bottom, viewportHeight: innerHeight};
    });
    assert.ok(bounds.top >= 0 && bounds.bottom <= bounds.viewportHeight,
      `${selector} must scroll fully into the portrait viewport`);
    await action.click();
  }
  assert.equal(await page.locator('#scenario-briefing-screen').isVisible(), true);
  await page.locator('#scenario-briefing-back-btn').click();
  const menuAction = page.locator('#scenario-map-back-btn');
  await menuAction.scrollIntoViewIfNeeded();
  const menuBounds = await menuAction.evaluate(element => {
    const rect = element.getBoundingClientRect();
    return {top: rect.top, bottom: rect.bottom, viewportHeight: innerHeight};
  });
  assert.ok(menuBounds.top >= 0 && menuBounds.bottom <= menuBounds.viewportHeight,
    'Main Menu must scroll fully into the portrait viewport');
  await menuAction.click();
  assert.equal(await page.locator('#start-screen').isVisible(), true);
  assert.equal(pageErrors.length, 0, 'portrait campaign navigation must not throw');
  await page.close();
}

async function testScenarioResponsivePolish(browser, url) {
  const { page, pageErrors } = await openPage(browser, url);
  await page.setViewportSize({width: 1280, height: 720});
  await page.evaluate(() => localStorage.removeItem('neonDropScenario'));
  await page.reload();
  await page.locator('#scenario-continue-btn').click();

  const desktop = await page.evaluate(() => {
    const map = document.querySelector('#scenario-map-screen').getBoundingClientRect();
    const stages = [...document.querySelectorAll('[data-scenario-stage]')];
    const stageTops = stages.map(button => button.getBoundingClientRect().top);
    const actions = ['#scenario-play-btn', '#scenario-map-back-btn', '#scenario-reset-btn']
      .map(selector => {
        const element = document.querySelector(selector);
        const rect = element.getBoundingClientRect();
        return {selector, top: rect.top, bottom: rect.bottom, visible: element.checkVisibility()};
      });
    return {
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
      map: {top: map.top, bottom: map.bottom},
      stageTops,
      routeConnector: getComputedStyle(document.querySelector('#scenario-stage-list')).backgroundImage,
      actions,
      current: document.querySelector('[data-scenario-stage][aria-current="step"]')?.dataset.scenarioStage,
      lockedDisabled: document.querySelector('[data-scenario-stage="2"]')?.disabled,
      lockedOpacity: getComputedStyle(document.querySelector('[data-scenario-stage="2"]')).opacity,
    };
  });
  assert.ok(desktop.scrollWidth <= 1280 && desktop.scrollHeight <= 720,
    `1280x720 campaign map must not scroll the document: ${JSON.stringify(desktop)}`);
  assert.ok(desktop.map.top >= 0 && desktop.map.bottom <= 720,
    `campaign map must fit the desktop viewport: ${JSON.stringify(desktop.map)}`);
  assert.ok(Math.max(...desktop.stageTops) - Math.min(...desktop.stageTops) <= 4,
    'all five desktop stages must share one route row');
  assert.match(desktop.routeConnector, /linear-gradient/,
    'the campaign stages must have a visible connecting route');
  assert.ok(desktop.actions.every(action => action.visible && action.top >= 0 && action.bottom <= 720),
    `campaign map actions must remain in the viewport: ${JSON.stringify(desktop.actions)}`);
  assert.equal(desktop.current, '1', 'the selected stage must expose aria-current=step');
  assert.equal(desktop.lockedDisabled, true, 'locked stages must remain natively disabled');
  assert.equal(desktop.lockedOpacity, '1', 'locked stage backgrounds must hide the connector line');

  await page.locator('[data-scenario-stage="1"]').focus();
  assert.notEqual(await page.locator('[data-scenario-stage="1"]').evaluate(element =>
    getComputedStyle(element).outlineWidth), '0px', 'keyboard focus must have a visible outline');

  await page.emulateMedia({reducedMotion: 'reduce'});
  const reducedMotion = await page.evaluate(() => ({
    modalAnimationName: getComputedStyle(document.querySelector('#scenario-map-screen')).animationName,
    modalAnimationDuration: getComputedStyle(document.querySelector('#scenario-map-screen')).animationDuration,
    campaignGlow: getComputedStyle(document.querySelector('#scenario-continue-btn')).boxShadow,
    garbageTransition: getComputedStyle(document.querySelector('#player-garbage-meter')).transitionDuration,
  }));
  assert.deepEqual(reducedMotion, {
    modalAnimationName: 'none', modalAnimationDuration: '0s',
    campaignGlow: 'none', garbageTransition: '0s',
  }, 'reduced motion must remove campaign modal animation/glow and garbage meter transitions');
  assert.equal(pageErrors.length, 0, 'desktop campaign layout must not throw page errors');
  await page.close();

  const context = await browser.newContext({
    viewport: {width: 390, height: 844},
    hasTouch: true,
    isMobile: true,
  });
  const mobilePage = await context.newPage();
  const mobileErrors = [];
  mobilePage.on('pageerror', error => mobileErrors.push(error));
  await mobilePage.goto(url);
  await mobilePage.evaluate(() => localStorage.removeItem('neonDropScenario'));
  await mobilePage.reload();
  await mobilePage.locator('#scenario-continue-btn').click();

  const mobile = await mobilePage.evaluate(() => {
    const map = document.querySelector('#scenario-map-screen');
    const tops = [...document.querySelectorAll('[data-scenario-stage]')]
      .map(button => button.getBoundingClientRect().top);
    return {
      coarse: matchMedia('(pointer: coarse)').matches,
      tops,
      scrollHeight: map.scrollHeight,
      clientHeight: map.clientHeight,
      overflowY: getComputedStyle(map).overflowY,
    };
  });
  assert.equal(mobile.coarse, true, 'mobile regression context must exercise coarse-pointer CSS');
  assert.ok(mobile.tops.every((top, index) => index === 0 || top > mobile.tops[index - 1]),
    `mobile stage nodes must stack in one column: ${JSON.stringify(mobile.tops)}`);
  assert.equal(mobile.overflowY, 'auto', 'mobile campaign overflow must stay inside the modal');
  assert.ok(mobile.scrollHeight > mobile.clientHeight,
    'mobile campaign actions must overflow into the modal scroll region');

  const lastAction = mobilePage.locator('#scenario-reset-btn');
  await lastAction.scrollIntoViewIfNeeded();
  const lastActionRect = await lastAction.evaluate(element => {
    const rect = element.getBoundingClientRect();
    return {top: rect.top, bottom: rect.bottom, viewportHeight: innerHeight};
  });
  assert.ok(lastActionRect.top >= 0 && lastActionRect.bottom <= lastActionRect.viewportHeight,
    `the last map action must scroll fully into view: ${JSON.stringify(lastActionRect)}`);

  await mobilePage.locator('#scenario-play-btn').scrollIntoViewIfNeeded();
  await mobilePage.locator('#scenario-play-btn').click();
  await mobilePage.locator('#scenario-stage-start-btn').scrollIntoViewIfNeeded();
  await mobilePage.locator('#scenario-stage-start-btn').click();
  const mobileGame = await mobilePage.evaluate(() => {
    const objective = document.querySelector('#scenario-objective');
    const rect = objective.getBoundingClientRect();
    const header = document.querySelector('#arena-header').getBoundingClientRect();
    return {
      objectiveVisible: objective.checkVisibility(),
      objectiveText: objective.textContent,
      objectiveInsideHeader: rect.left >= header.left && rect.right <= header.right
        && rect.top >= header.top && rect.bottom <= header.bottom,
      touchControlsVisible: document.querySelector('#touch-controls').checkVisibility(),
    };
  });
  assert.deepEqual(mobileGame, {
    objectiveVisible: true,
    objectiveText: 'OBJECTIVE 0 / 8',
    objectiveInsideHeader: true,
    touchControlsVisible: true,
  }, 'mobile campaign gameplay must keep the objective and touch controls usable');
  assert.equal(mobileErrors.length, 0, 'mobile campaign layout must not throw page errors');
  await context.close();
}

async function testScenarioLineStages(browser, url) {
  const { page, pageErrors } = await openPage(browser, url);
  await page.evaluate(() => localStorage.removeItem('neonDropScenario'));
  await page.reload();

  await page.locator('#scenario-continue-btn').click();
  await page.locator('#scenario-play-btn').click();
  await page.locator('#scenario-stage-start-btn').click();
  assert.deepEqual(await page.evaluate(() => ({
    stage: activeScenarioStage?.id,
    objective: document.querySelector('#scenario-objective')?.textContent,
    objectiveVisible: document.querySelector('#scenario-objective')?.hidden === false,
  })), {
    stage: 1, objective: 'OBJECTIVE 0 / 8', objectiveVisible: true,
  },
  'stage 1 must start through briefing with a visible line objective');

  const resultContract = await page.evaluate(() => {
    const firstCompletion = completeScenarioStage();
    const completionDetail = document.querySelector('#scenario-result-detail').textContent;
    elapsedTime = 999999;
    const repeatedCompletion = completeScenarioStage();
    const completionUnchanged = document.querySelector('#scenario-result-detail').textContent === completionDetail;
    startScenarioStage(1);
    const firstFailure = failScenarioStage('FIRST FAILURE');
    const repeatedFailure = failScenarioStage('SECOND FAILURE');
    return {
      firstCompletion, repeatedCompletion, completionUnchanged,
      firstFailure, repeatedFailure,
      failureTitle: document.querySelector('#scenario-result-title').textContent,
    };
  });
  assert.deepEqual(resultContract, {
    firstCompletion: true, repeatedCompletion: false, completionUnchanged: true,
    firstFailure: true, repeatedFailure: false, failureTitle: 'FIRST FAILURE',
  }, 'scenario result functions must resolve once and reject later rewrites');
  assert.equal(await page.getByRole('img', {name: '0 of 3 stars'}).count(), 1,
    'the empty Task 4 rating must have accessible image semantics');
  await page.locator('#scenario-retry-btn').click();

  const progressBefore = await page.evaluate(() => JSON.stringify(scenarioProgress));
  const completed = await page.evaluate(() => {
    player.lines = 7;
    scoreLines(1, false);
    const detail = document.querySelector('#scenario-result-detail').textContent;
    elapsedTime = 999999;
    const repeated = completeScenarioStage();
    return {
      lines: player.lines,
      resolved: scenarioResolved,
      title: document.querySelector('#scenario-result-title')?.textContent,
      detail: document.querySelector('#scenario-result-detail')?.textContent,
      objective: document.querySelector('#scenario-objective')?.textContent,
      resultVisible: document.querySelector('#scenario-result-screen')?.style.display !== 'none',
      focused: document.activeElement?.id,
      progress: JSON.stringify(scenarioProgress),
      repeated,
      detailUnchanged: document.querySelector('#scenario-result-detail').textContent === detail,
    };
  });
  assert.equal(completed.lines, 8);
  assert.equal(completed.resolved, true);
  assert.equal(completed.title, 'STAGE CLEAR');
  assert.match(completed.detail, /Boot Sequence.*00:00/);
  assert.equal(completed.objective, 'OBJECTIVE 8 / 8');
  assert.equal(completed.resultVisible, true);
  assert.equal(completed.focused, 'scenario-retry-btn');
  assert.equal(completed.repeated, false, 'a resolved stage must reject repeated completion');
  assert.equal(completed.detailUnchanged, true, 'repeated completion must not rewrite result content');
  assert.equal(completed.progress, progressBefore,
    'Task 4 completion must not unlock, rate, or persist a result');

  await page.locator('#scenario-retry-btn').click();
  assert.deepEqual(await page.evaluate(() => ({
    stage: activeScenarioStage?.id,
    lines: player.lines,
    boardBlocks: arena.flat().filter(Boolean).length,
    playerReady: Boolean(player.matrix),
    resultHidden: document.querySelector('#scenario-result-screen').style.display === 'none',
    resolved: scenarioResolved,
    progress: JSON.stringify(scenarioProgress),
  })), {
    stage: 1, lines: 0, boardBlocks: 0, playerReady: true,
    resultHidden: true, resolved: false, progress: progressBefore,
  }, 'Retry Stage must restart the same clean stage without changing campaign progress');

  const timeout = await page.evaluate(() => {
    scenarioProgress.unlockedStage = 3;
    startScenarioStage(2);
    const progress = JSON.stringify(scenarioProgress);
    elapsedTime = 149999;
    updateScenarioState(0);
    const beforeLimit = scenarioResolved;
    elapsedTime = 150000;
    updateScenarioState(0);
    return {
      beforeLimit,
      resolved: scenarioResolved,
      title: document.querySelector('#scenario-result-title').textContent,
      progressUnchanged: JSON.stringify(scenarioProgress) === progress,
    };
  });
  assert.deepEqual(timeout, {
    beforeLimit: false, resolved: true, title: 'Time Up!', progressUnchanged: true,
  }, 'stage 2 must fail only when its exact time limit is reached');

  const ramp = await page.evaluate(() => {
    startScenarioStage(2);
    player.lines = 9;
    scoreLines(1, false);
    const scenarioLevel2 = dropInterval;
    scenarioProgress.upgrades.cryo = 1;
    startScenarioStage(1);
    const cryoLevel1 = dropInterval;
    scenarioProgress.upgrades.cryo = 0;
    gameMode = 'marathon';
    activeScenarioStage = null;
    resetGameState();
    player.lines = 9;
    scoreLines(1, false);
    return {scenarioLevel2, cryoLevel1, marathonLevel2: dropInterval};
  });
  assert.deepEqual(ramp, {scenarioLevel2: 840, cryoLevel1: 1100, marathonLevel2: 900},
    'scenario ramps and Cryo must apply only in campaign while Marathon keeps its normal step');

  const hazard = await page.evaluate(() => {
    window.requestAnimationFrame = () => 777;
    window.cancelAnimationFrame = () => {};
    gameMode = 'scenario';
    startScenarioStage(3);
    const interval = scenarioHazardTimer;
    const hazardFrameTime = performance.now() + interval;
    update(hazardFrameTime);
    const createdByUpdate = {event: lastEventMessage, timer: eventMessageTimer};
    update(hazardFrameTime + 500);
    const decayedByNextUpdate = {event: lastEventMessage, timer: eventMessageTimer};
    startScenarioStage(3);
    isPaused = true;
    updateScenarioState(1000);
    const paused = {timer: scenarioHazardTimer, pending: playerPendingGarbage};
    isPaused = false;
    scenarioHazardTimer = 1000;
    updateScenarioState(1250);
    const queued = {
      timer: scenarioHazardTimer,
      pending: playerPendingGarbage,
      event: lastEventMessage,
      eventTimer: eventMessageTimer,
    };
    player.next = createPiece('D');
    playerReset();
    const applied = {
      pending: playerPendingGarbage,
      garbageLines: arena.slice(-1)[0].filter(value => value === 8).length,
    };
    startScenarioStage(3);
    scenarioHazardTimer = 1000;
    updateScenarioState(90000);
    const hugeDelta = {timer: scenarioHazardTimer, pending: playerPendingGarbage};
    gameMode = 'marathon';
    playerPendingGarbage = 0;
    queueGarbageForPlayer(1);
    return {
      interval, createdByUpdate, decayedByNextUpdate, paused, queued, applied, hugeDelta,
      marathonPending: playerPendingGarbage,
    };
  });
  assert.deepEqual(hazard, {
    interval: 30000,
    createdByUpdate: {event: 'INTERFERENCE +1', timer: 2000},
    decayedByNextUpdate: {event: 'INTERFERENCE +1', timer: 1500},
    paused: {timer: 30000, pending: 0},
    queued: {timer: 29750, pending: 1, event: 'INTERFERENCE +1', eventTimer: 2000},
    applied: {pending: 0, garbageLines: 11},
    hugeDelta: {timer: 1000, pending: 3},
    marathonPending: 0,
  }, 'stage 3 interference must queue once, pause cleanly, cap huge catch-up at 3 waves');

  const overload = await page.evaluate(() => {
    gameMode = 'scenario';
    startScenarioStage(3);
    const progress = JSON.stringify(scenarioProgress);
    arena[0][0] = 1;
    playerPendingGarbage = 1;
    player.next = createPiece('D');
    playerReset();
    return {
      title: document.querySelector('#scenario-result-title').textContent,
      gameOverVisible: document.querySelector('#game-over-screen').style.display !== 'none',
      highScoreVisible: document.querySelector('#high-score-input-group').offsetParent !== null,
      progress,
    };
  });
  assert.equal(overload.title, 'SYSTEM OVERLOAD');
  assert.equal(overload.gameOverVisible, false,
    'campaign overload must not open the leaderboard game-over screen');
  assert.equal(overload.highScoreVisible, false,
    'campaign overload must not expose leaderboard input');

  await page.locator('#scenario-retry-btn').click();
  const holdOverload = await page.evaluate(() => {
    arena.forEach(row => row.fill(0));
    player.matrix = createPiece('D');
    player.hold = createPiece('S');
    player.canHold = true;
    player.pos = {x: 4, y: 0};
    for (let y = 0; y < 4; y++) arena[y][5] = 8;
    playerHold();
    return {
      title: document.querySelector('#scenario-result-title').textContent,
      resultVisible: document.querySelector('#scenario-result-screen').style.display !== 'none',
      gameOverVisible: document.querySelector('#game-over-screen').style.display !== 'none',
    };
  });
  assert.deepEqual(holdOverload, {
    title: 'SYSTEM OVERLOAD', resultVisible: true, gameOverVisible: false,
  }, 'a campaign Hold spawn collision must use the scenario failure result');

  await page.locator('#scenario-result-map-btn').click();
  assert.deepEqual(await page.evaluate(() => ({
    mapVisible: document.querySelector('#scenario-map-screen').style.display !== 'none',
    rewardVisible: document.querySelector('#scenario-reward-screen').style.display !== 'none',
    selected: selectedScenarioStageId,
    active: activeScenarioStage,
    progress: JSON.stringify(scenarioProgress),
  })), {
    mapVisible: false, rewardVisible: true, selected: 3, active: null, progress: overload.progress,
  }, 'Campaign Map must route an earlier pending reward without changing progress');

  await page.locator('#scenario-reward-options button').first().click();
  await page.evaluate(() => {
    scenarioProgress.upgrades.pulse = 0;
    writeScenarioProgress();
  });

  await page.locator('#scenario-map-back-btn').click();
  await page.getByRole('button', {name: 'Start Game'}).click();
  assert.equal(await page.locator('#scenario-objective').isHidden(), true,
    'quick play must hide the campaign objective');
  assert.equal(pageErrors.length, 0, 'campaign line stages must not throw page errors');
  await page.close();
}

async function testScenarioRewards(browser, url) {
  const { page, pageErrors } = await openPage(browser, url);
  await page.evaluate(() => localStorage.removeItem('neonDropScenario'));
  await page.reload();

  const invalidTimes = await page.evaluate(() => [Infinity, NaN, -1].map(time => {
    scenarioProgress = createScenarioProgress();
    writeScenarioProgress();
    startScenarioStage(1);
    elapsedTime = time;
    const resultScreen = document.querySelector('#scenario-result-screen');
    const rewardButton = document.querySelector('#scenario-reward-open-btn');
    document.querySelector('#scenario-result-title').textContent = 'SENTINEL TITLE';
    document.querySelector('#scenario-result-stars').textContent = '☆';
    document.querySelector('#scenario-result-stars').setAttribute('aria-label', 'sentinel stars');
    document.querySelector('#scenario-result-detail').textContent = 'SENTINEL DETAIL';
    resultScreen.style.display = 'none';
    rewardButton.style.display = 'none';
    const progress = JSON.stringify(scenarioProgress);
    const stored = localStorage.getItem('neonDropScenario');
    const ui = JSON.stringify({
      title: document.querySelector('#scenario-result-title').textContent,
      stars: document.querySelector('#scenario-result-stars').textContent,
      label: document.querySelector('#scenario-result-stars').getAttribute('aria-label'),
      detail: document.querySelector('#scenario-result-detail').textContent,
      resultDisplay: resultScreen.style.display,
      rewardDisplay: rewardButton.style.display,
    });
    const completed = completeScenarioStage();
    return {
      completed,
      progressUnchanged: JSON.stringify(scenarioProgress) === progress,
      storedUnchanged: localStorage.getItem('neonDropScenario') === stored,
      uiUnchanged: JSON.stringify({
        title: document.querySelector('#scenario-result-title').textContent,
        stars: document.querySelector('#scenario-result-stars').textContent,
        label: document.querySelector('#scenario-result-stars').getAttribute('aria-label'),
        detail: document.querySelector('#scenario-result-detail').textContent,
        resultDisplay: resultScreen.style.display,
        rewardDisplay: rewardButton.style.display,
      }) === ui,
      resolved: scenarioResolved,
    };
  }));
  assert.deepEqual(invalidTimes, Array.from({length: 3}, () => ({
    completed: false,
    progressUnchanged: true,
    storedUnchanged: true,
    uiUnchanged: true,
    resolved: false,
  })), 'invalid elapsed times must be rejected before completion mutates state, storage, or result UI');

  const firstWin = await page.evaluate(() => {
    startScenarioStage(1);
    elapsedTime = 70000;
    const completed = completeScenarioStage();
    return {
      completed,
      progress: scenarioProgress,
      stored: JSON.parse(localStorage.getItem('neonDropScenario')),
    };
  });
  const expectedFirstProgress = {
    version: 1,
    unlockedStage: 2,
    results: {'1': {stars: 3, bestTimeMs: 70000}},
    upgrades: {pulse: 0, cryo: 0, firewall: 0},
    pendingRewardStage: 1,
    completed: false,
  };
  assert.equal(firstWin.completed, true);
  assert.deepEqual(firstWin.progress, expectedFirstProgress);
  assert.deepEqual(firstWin.stored, expectedFirstProgress,
    'successful progress must be persisted before result UI assertions');
  assert.deepEqual(await page.evaluate(() => ({
    visible: document.querySelector('#scenario-result-screen').style.display !== 'none',
    title: document.querySelector('#scenario-result-title').textContent,
    stars: document.querySelector('#scenario-result-stars').textContent,
    starLabel: document.querySelector('#scenario-result-stars').getAttribute('aria-label'),
    detail: document.querySelector('#scenario-result-detail').textContent,
    rewardVisible: document.querySelector('#scenario-reward-open-btn').style.display !== 'none',
  })), {
    visible: true,
    title: 'STAGE CLEAR',
    stars: '★★★',
    starLabel: '3 of 3 stars',
    detail: 'Boot Sequence · TIME 01:10',
    rewardVisible: true,
  });

  const duplicate = await page.evaluate(() => {
    const stored = localStorage.getItem('neonDropScenario');
    document.querySelector('#scenario-result-detail').textContent = 'SENTINEL';
    return {
      completed: completeScenarioStage(),
      storedUnchanged: localStorage.getItem('neonDropScenario') === stored,
      detail: document.querySelector('#scenario-result-detail').textContent,
    };
  });
  assert.deepEqual(duplicate, {completed: false, storedUnchanged: true, detail: 'SENTINEL'},
    'duplicate completion must not persist or rewrite the result');

  await page.locator('#scenario-reward-open-btn').click();
  assert.deepEqual(await page.locator('#scenario-reward-options button').evaluateAll(buttons => buttons.map(button => ({
    text: button.textContent,
    stack: button.dataset.stack,
  }))), [
    {text: 'Pulse Amp\n+20% score and +1 AI attack per stack\nCURRENT 0 / 4', stack: '0'},
    {text: 'Cryo Field\n+10% drop interval per stack, max +30%\nCURRENT 0 / 4', stack: '0'},
    {text: 'Firewall\nBlock one garbage application per stack\nCURRENT 0 / 4', stack: '0'},
  ], 'a pending reward must render exactly the three native upgrade buttons and stacks');
  await page.locator('#scenario-reward-options button').first().click();
  assert.deepEqual(await page.evaluate(() => ({
    pulse: scenarioProgress.upgrades.pulse,
    pending: scenarioProgress.pendingRewardStage,
    unlocked: scenarioProgress.unlockedStage,
    selected: selectedScenarioStageId,
    stored: JSON.parse(localStorage.getItem('neonDropScenario')),
  })), {
    pulse: 1,
    pending: null,
    unlocked: 2,
    selected: 2,
    stored: {...expectedFirstProgress, upgrades: {pulse: 1, cryo: 0, firewall: 0}, pendingRewardStage: null},
  });
  await page.reload();
  assert.deepEqual(await page.evaluate(() => ({
    pulse: scenarioProgress.upgrades.pulse,
    pending: scenarioProgress.pendingRewardStage,
  })), {pulse: 1, pending: null});
  const replayedRewardedStage = await page.evaluate(() => {
    startScenarioStage(1);
    elapsedTime = 100000;
    const completed = completeScenarioStage();
    return {
      completed,
      result: scenarioProgress.results[1],
      upgrades: scenarioProgress.upgrades,
      pending: scenarioProgress.pendingRewardStage,
      rewardVisible: document.querySelector('#scenario-reward-open-btn').style.display !== 'none',
    };
  });
  assert.deepEqual(replayedRewardedStage, {
    completed: true,
    result: {stars: 3, bestTimeMs: 70000},
    upgrades: {pulse: 1, cryo: 0, firewall: 0},
    pending: null,
    rewardVisible: false,
  }, 'replaying a rewarded stage must not create another reward or change upgrades');
  await page.evaluate(() => showStartScreen());
  await page.locator('#scenario-continue-btn').click();
  assert.equal(await page.locator('[data-scenario-stage="2"]').getAttribute('aria-current'), 'step');

  await page.evaluate(() => localStorage.setItem('neonDropScenario', JSON.stringify({
    version: 1,
    unlockedStage: 2,
    results: {'1': {stars: 3, bestTimeMs: 70000}},
    upgrades: {pulse: 0, cryo: 0, firewall: 0},
    pendingRewardStage: 1,
    completed: false,
  })));
  await page.reload();
  assert.equal(await page.locator('#scenario-continue-detail').innerText(), 'UPGRADE READY · STAGE 01');
  await page.locator('#scenario-continue-btn').click();
  assert.deepEqual(await page.evaluate(() => ({
    rewardVisible: document.querySelector('#scenario-reward-screen').style.display !== 'none',
    mapVisible: document.querySelector('#scenario-map-screen').style.display !== 'none',
    focused: document.activeElement === document.querySelector('#scenario-reward-options button'),
  })), {rewardVisible: true, mapVisible: false, focused: true});
  const guardedReward = await page.evaluate(() => {
    const before = JSON.stringify(scenarioProgress);
    const invalid = chooseScenarioUpgrade('invalid');
    const invalidUnchanged = JSON.stringify(scenarioProgress) === before;
    showScenarioMap();
    const routed = document.querySelector('#scenario-reward-screen').style.display !== 'none'
      && document.querySelector('#scenario-map-screen').style.display === 'none';
    const chosen = chooseScenarioUpgrade('cryo');
    const repeated = chooseScenarioUpgrade('firewall');
    return {invalid, invalidUnchanged, routed, chosen, repeated, progress: scenarioProgress};
  });
  assert.deepEqual(guardedReward, {
    invalid: false,
    invalidUnchanged: true,
    routed: true,
    chosen: true,
    repeated: false,
    progress: {
      version: 1,
      unlockedStage: 2,
      results: {'1': {stars: 3, bestTimeMs: 70000}},
      upgrades: {pulse: 0, cryo: 1, firewall: 0},
      pendingRewardStage: null,
      completed: false,
    },
  }, 'pending rewards must be validated, unavoidable, and selectable only once');

  const failedCompletionSave = await page.evaluate(() => {
    scenarioProgress = createScenarioProgress();
    writeScenarioProgress();
    startScenarioStage(1);
    elapsedTime = 70000;
    const progress = JSON.stringify(scenarioProgress);
    const stored = localStorage.getItem('neonDropScenario');
    const originalSetItem = Storage.prototype.setItem;
    let completed;
    try {
      Storage.prototype.setItem = () => { throw new Error('storage full'); };
      completed = completeScenarioStage();
    } finally {
      Storage.prototype.setItem = originalSetItem;
    }
    return {
      completed,
      progressUnchanged: JSON.stringify(scenarioProgress) === progress,
      storedUnchanged: localStorage.getItem('neonDropScenario') === stored,
      resolved: scenarioResolved,
      gameOver: isGameOver,
      title: document.querySelector('#scenario-result-title').textContent,
      detail: document.querySelector('#scenario-result-detail').textContent,
      starLabel: document.querySelector('#scenario-result-stars').getAttribute('aria-label'),
      retryVisible: document.querySelector('#scenario-retry-btn').style.display !== 'none',
      mapVisible: document.querySelector('#scenario-result-map-btn').style.display !== 'none',
      rewardVisible: document.querySelector('#scenario-reward-open-btn').style.display !== 'none',
    };
  });
  assert.deepEqual(failedCompletionSave, {
    completed: false,
    progressUnchanged: true,
    storedUnchanged: true,
    resolved: true,
    gameOver: true,
    title: 'SAVE FAILED',
    detail: 'Progress could not be saved. Check browser storage and retry.',
    starLabel: '0 of 3 stars',
    retryVisible: true,
    mapVisible: false,
    rewardVisible: false,
  }, 'a failed completion save must stop safely without publishing candidate progress or success UI');

  const failedRewardSave = await page.evaluate(() => {
    scenarioProgress = {
      version: 1, unlockedStage: 2, results: {'1': {stars: 3, bestTimeMs: 70000}},
      upgrades: {pulse: 1, cryo: 0, firewall: 0}, pendingRewardStage: 1, completed: false,
    };
    writeScenarioProgress();
    showScenarioReward();
    const progress = JSON.stringify(scenarioProgress);
    const stored = localStorage.getItem('neonDropScenario');
    const originalSetItem = Storage.prototype.setItem;
    let chosen;
    try {
      Storage.prototype.setItem = () => { throw new Error('storage full'); };
      chosen = chooseScenarioUpgrade('cryo');
    } finally {
      Storage.prototype.setItem = originalSetItem;
    }
    const error = document.querySelector('#scenario-reward-error');
    return {
      chosen,
      progressUnchanged: JSON.stringify(scenarioProgress) === progress,
      storedUnchanged: localStorage.getItem('neonDropScenario') === stored,
      pending: scenarioProgress.pendingRewardStage,
      cryo: scenarioProgress.upgrades.cryo,
      rewardVisible: document.querySelector('#scenario-reward-screen').style.display !== 'none',
      error: error?.textContent ?? null,
      ariaLive: error?.getAttribute('aria-live') ?? null,
    };
  });
  assert.deepEqual(failedRewardSave, {
    chosen: false,
    progressUnchanged: true,
    storedUnchanged: true,
    pending: 1,
    cryo: 0,
    rewardVisible: true,
    error: 'Progress could not be saved. Try again.',
    ariaLive: 'polite',
  }, 'a failed reward save must retain the pending choice and show an accessible retryable error');

  const maxedUpgrade = await page.evaluate(() => {
    scenarioProgress = {
      version: 1, unlockedStage: 2, results: {'1': {stars: 3, bestTimeMs: 70000}},
      upgrades: {pulse: 4, cryo: 0, firewall: 0}, pendingRewardStage: 1, completed: false,
    };
    writeScenarioProgress();
    showScenarioReward();
    const buttons = [...document.querySelectorAll('#scenario-reward-options button')];
    const rendered = buttons.map(button => ({
      id: button.dataset.scenarioUpgrade,
      disabled: button.disabled,
      text: button.textContent,
    }));
    const pulse = chooseScenarioUpgrade('pulse');
    const pendingAfterPulse = scenarioProgress.pendingRewardStage;
    const cryo = chooseScenarioUpgrade('cryo');
    return {
      rendered,
      pulse,
      pendingAfterPulse,
      cryo,
      upgrades: scenarioProgress.upgrades,
      pending: scenarioProgress.pendingRewardStage,
    };
  });
  assert.deepEqual(maxedUpgrade, {
    rendered: [
      {id: 'pulse', disabled: true, text: 'Pulse Amp\n+20% score and +1 AI attack per stack\nMAX'},
      {id: 'cryo', disabled: false, text: 'Cryo Field\n+10% drop interval per stack, max +30%\nCURRENT 0 / 4'},
      {id: 'firewall', disabled: false, text: 'Firewall\nBlock one garbage application per stack\nCURRENT 0 / 4'},
    ],
    pulse: false,
    pendingAfterPulse: 1,
    cryo: true,
    upgrades: {pulse: 4, cryo: 1, firewall: 0},
    pending: null,
  }, 'maxed upgrades must be disabled and must not consume a pending reward');

  const merged = await page.evaluate(() => {
    scenarioProgress = {
      version: 1, unlockedStage: 5, results: {'1': {stars: 3, bestTimeMs: 70000}},
      upgrades: {pulse: 1, cryo: 1, firewall: 0}, pendingRewardStage: null, completed: false,
    };
    startScenarioStage(1);
    elapsedTime = 100000;
    completeScenarioStage();
    const slower = {...scenarioProgress.results[1]};
    startScenarioStage(1);
    elapsedTime = 60000;
    completeScenarioStage();
    return {slower, faster: scenarioProgress.results[1], unlocked: scenarioProgress.unlockedStage};
  });
  assert.deepEqual(merged, {
    slower: {stars: 3, bestTimeMs: 70000},
    faster: {stars: 3, bestTimeMs: 60000},
    unlocked: 5,
  }, 'replays must merge best stars and time without reducing unlocked progress');

  const stickyCompletion = await page.evaluate(() => {
    scenarioProgress.completed = true;
    scenarioProgress.pendingRewardStage = null;
    writeScenarioProgress();
    startScenarioStage(1);
    elapsedTime = 100000;
    completeScenarioStage();
    return {
      completed: scenarioProgress.completed,
      pending: scenarioProgress.pendingRewardStage,
      upgrades: scenarioProgress.upgrades,
    };
  });
  assert.deepEqual(stickyCompletion, {
    completed: true,
    pending: null,
    upgrades: {pulse: 1, cryo: 1, firewall: 0},
  }, 'replaying an earlier stage after becoming champion must keep completion without farming rewards');

  const failed = await page.evaluate(() => {
    scenarioProgress.upgrades.firewall = 2;
    scenarioProgress.pendingRewardStage = 1;
    writeScenarioProgress();
    startScenarioStage(1);
    const progress = JSON.stringify(scenarioProgress);
    const stored = localStorage.getItem('neonDropScenario');
    const result = failScenarioStage('SYSTEM OVERLOAD');
    return {
      result,
      progressUnchanged: JSON.stringify(scenarioProgress) === progress,
      storedUnchanged: localStorage.getItem('neonDropScenario') === stored,
      label: document.querySelector('#scenario-result-stars').getAttribute('aria-label'),
      rewardVisible: document.querySelector('#scenario-reward-open-btn').style.display !== 'none',
    };
  });
  assert.deepEqual(failed, {
    result: true,
    progressUnchanged: true,
    storedUnchanged: true,
    label: '0 of 3 stars',
    rewardVisible: false,
  });
  await page.locator('#scenario-retry-btn').click();
  assert.deepEqual(await page.evaluate(() => ({
    stage: activeScenarioStage.id,
    firewall: scenarioProgress.upgrades.firewall,
    pending: scenarioProgress.pendingRewardStage,
    resolved: scenarioResolved,
  })), {stage: 1, firewall: 2, pending: 1, resolved: false},
  'Retry must cleanly replay the same stage without consuming a pending reward');

  await page.evaluate(() => {
    scenarioProgress = {
      version: 1, unlockedStage: 5, results: {},
      upgrades: {pulse: 0, cryo: 0, firewall: 0}, pendingRewardStage: null, completed: false,
    };
    writeScenarioProgress();
    startScenarioStage(5);
    elapsedTime = 200000;
    completeScenarioStage();
  });
  assert.deepEqual(await page.evaluate(() => ({
    result: scenarioProgress.results[5],
    unlocked: scenarioProgress.unlockedStage,
    completed: scenarioProgress.completed,
    pending: scenarioProgress.pendingRewardStage,
    rewardVisible: document.querySelector('#scenario-reward-open-btn').style.display !== 'none',
  })), {
    result: {stars: 3, bestTimeMs: 200000},
    unlocked: 5,
    completed: true,
    pending: null,
    rewardVisible: false,
  });
  await page.locator('#scenario-result-map-btn').click();
  assert.equal(await page.locator('#scenario-map-screen').isVisible(), true);
  await page.locator('#scenario-map-back-btn').click();
  assert.equal(await page.locator('#scenario-continue-detail').innerText(), 'CHAMPION · 5/5 STAGES');
  assert.equal(pageErrors.length, 0, 'campaign rewards and results must not throw page errors');
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
    JSON.stringify({
      generation: 2,
      scores: [{ name: '<b>name</b>', score: 100 }],
    }),
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
  assert.equal(saved.generation, 2);
  assert.deepEqual(saved.scores[0], { name: 'AI_Agent', score: 321 });
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

async function testScenarioRivalsAndUpgrades(browser, url) {
  const { page, pageErrors } = await openPage(browser, url);
  await page.evaluate(() => {
    scenarioProgress = {
      version: 1, unlockedStage: 5, results: {},
      upgrades: {pulse: 0, cryo: 0, firewall: 0}, pendingRewardStage: null, completed: false,
    };
    window.requestAnimationFrame = () => 8181;
    window.cancelAnimationFrame = () => {};
  });

  const stage4 = await page.evaluate(() => {
    const started = startScenarioStage(4);
    const matchStart = matchEventLog[0];
    startScenarioStage(1);
    const lineStageEvents = matchEventLog.length;
    startScenarioStage(4);
    return {
      started,
      matchStart,
      lineStageEvents,
      scenarioOpponent: hasScenarioOpponent(),
      opponentActive: opponentPlayActive(),
      opponentReady: Boolean(opponent.matrix && opponent.next),
      opponentX: opponent.pos.x,
      expectedX: (VERSUS_WIDTH / 2 | 0) - (opponent.matrix[0].length / 2 | 0),
      panelVisible: getComputedStyle(document.querySelector('#opponent-panel')).display !== 'none',
      layoutActive: document.querySelector('#game-container').classList.contains('versus-active'),
      garbageActive: playerGarbageActive(),
    };
  });
  assert.deepEqual(stage4, {
    started: true, matchStart: {type: 'match-start'}, lineStageEvents: 0,
    scenarioOpponent: true, opponentActive: true, opponentReady: true,
    opponentX: stage4.expectedX, expectedX: stage4.expectedX,
    panelVisible: true, layoutActive: true, garbageActive: true,
  }, 'stage 4 must reuse the centered visible opponent board and competitive garbage flow');

  const scenarioQueue = await page.evaluate(() => {
    matchEventLog = [];
    opponent.pendingGarbage = 0;
    queueGarbageForOpponent(2);
    const scenario = {pending: opponent.pendingGarbage, event: matchEventLog.at(-1)};
    scenarioProgress.upgrades.pulse = 2;
    opponent.pendingGarbage = MAX_PENDING_GARBAGE - 1;
    queueGarbageForOpponent(5);
    const capped = opponent.pendingGarbage;
    scenarioProgress.upgrades.pulse = 0;
    gameMode = 'marathon';
    opponent.pendingGarbage = 0;
    matchEventLog = [];
    queueGarbageForOpponent(2);
    return {scenario, capped, marathon: {pending: opponent.pendingGarbage, events: matchEventLog.length}};
  });
  assert.deepEqual(scenarioQueue, {
    scenario: {pending: 2, event: {type: 'attack-sent', from: 'player', amount: 2}},
    capped: 20,
    marathon: {pending: 0, events: 0},
  }, 'scenario rivals must receive and record player attacks while Marathon ignores them');

  const opponentTurns = await page.evaluate(() => {
    startScenarioStage(4);
    const stage4Turns = runOpponentTurnsAfterLock();
    startScenarioStage(5);
    const stage5Turns = runOpponentTurnsAfterLock();
    gameMode = 'versus';
    activeScenarioStage = null;
    isGameOver = false;
    resetGameState();
    const quickTurns = runOpponentTurnsAfterLock();
    scenarioProgress.unlockedStage = 5;
    startScenarioStage(5);
    scenarioResolved = true;
    const resolvedTurns = runOpponentTurnsAfterLock();
    scenarioResolved = false;
    isGameOver = true;
    const gameOverTurns = runOpponentTurnsAfterLock();
    isGameOver = false;
    opponent.gameOver = true;
    const opponentOverTurns = runOpponentTurnsAfterLock();
    startScenarioStage(4);
    opponent.matrix = null;
    const missingPieceTurns = runOpponentTurnsAfterLock();
    return {
      stage4Turns, stage5Turns, quickTurns, resolvedTurns, gameOverTurns,
      opponentOverTurns, missingPieceTurns,
    };
  });
  assert.deepEqual(opponentTurns, {
    stage4Turns: 1, stage5Turns: 2, quickTurns: 1,
    resolvedTurns: 0, gameOverTurns: 0, opponentOverTurns: 0, missingPieceTurns: 0,
  }, 'post-lock AI turns must follow the mode and stop after any terminal state');

  const lockIntegration = await page.evaluate(() => {
    startScenarioStage(5);
    opponent.pieceBag = ['A', 'B', 'C', 'D'];
    const before = opponent.pieceBag.length;
    player.matrix = createPiece('D');
    player.pos = {x: 5, y: 18};
    lockCurrentPiece();
    return {before, after: opponent.pieceBag.length};
  });
  assert.deepEqual(lockIntegration, {before: 4, after: 2},
    'locking a player piece in stage 5 must execute both configured AI turns');

  const scenarioResults = await page.evaluate(() => {
    startScenarioStage(4);
    const progressBefore = JSON.stringify(scenarioProgress);
    endVersusMatch('You Win!', 'match-win');
    const win = {
      title: document.querySelector('#scenario-result-title').textContent,
      opponentGameOver: opponent.gameOver,
      event: matchEventLog.at(-1)?.type,
      progressUnchanged: JSON.stringify(scenarioProgress) === progressBefore,
      stars: document.querySelector('#scenario-result-stars').textContent,
    };
    const eventsAfterWin = matchEventLog.length;
    endVersusMatch('You Lose!', 'match-lose');
    win.once = matchEventLog.length === eventsAfterWin;

    startScenarioStage(4);
    endVersusMatch('You Lose!', 'match-lose');
    const loss = {
      title: document.querySelector('#scenario-result-title').textContent,
      scenarioVisible: document.querySelector('#scenario-result-screen').style.display !== 'none',
      gameOverVisible: document.querySelector('#game-over-screen').style.display !== 'none',
      highScoreVisible: document.querySelector('#high-score-input-group').offsetParent !== null,
      event: matchEventLog.at(-1)?.type,
    };
    return {win, loss};
  });
  assert.deepEqual(scenarioResults, {
    win: {
      title: 'STAGE CLEAR', opponentGameOver: true, event: 'match-win',
      progressUnchanged: false, stars: '★★★', once: true,
    },
    loss: {
      title: 'You Lose!', scenarioVisible: true, gameOverVisible: false,
      highScoreVisible: false, event: 'match-lose',
    },
  }, 'scenario rival results must persist wins without exposing leaderboard input');

  const pulse = await page.evaluate(() => {
    scenarioProgress.upgrades = {pulse: 2, cryo: 0, firewall: 0};
    startScenarioStage(4);
    player.score = 0;
    player.level = 1;
    combo = 0;
    backToBackActive = false;
    opponent.pendingGarbage = 0;
    scoreLines(2, false);
    const positive = {score: player.score, pending: opponent.pendingGarbage};
    opponent.pendingGarbage = 0;
    combo = 0;
    backToBackActive = false;
    scoreLines(1, false);
    const zeroAttack = opponent.pendingGarbage;

    gameMode = 'marathon';
    activeScenarioStage = null;
    player.score = 0;
    player.level = 1;
    combo = 0;
    backToBackActive = false;
    scoreLines(2, false);
    const marathonScore = player.score;

    gameMode = 'versus';
    resetGameState();
    player.score = 0;
    player.level = 1;
    combo = 0;
    backToBackActive = false;
    opponent.pendingGarbage = 0;
    scoreLines(2, false);
    return {positive, zeroAttack, marathonScore, versusScore: player.score, versusAttack: opponent.pendingGarbage};
  });
  assert.deepEqual(pulse, {
    positive: {score: 420, pending: 3}, zeroAttack: 0,
    marathonScore: 300, versusScore: 300, versusAttack: 1,
  }, 'Pulse must multiply scenario scoring and boost only positive attacks');

  const firewall = await page.evaluate(() => {
    scenarioProgress.upgrades = {pulse: 0, cryo: 0, firewall: 2};
    startScenarioStage(4);
    const initial = firewallCharges;
    const before = JSON.stringify(arena);
    queueGarbageForPlayer(5);
    playerReset();
    const first = {
      charges: firewallCharges, pending: playerPendingGarbage,
      unchanged: JSON.stringify(arena) === before,
      event: lastEventMessage, timer: eventMessageTimer,
      hud: document.querySelector('#player-garbage').textContent,
    };
    queueGarbageForPlayer(3);
    playerReset();
    const second = {charges: firewallCharges, pending: playerPendingGarbage, unchanged: JSON.stringify(arena) === before};
    queueGarbageForPlayer(2);
    playerReset();
    const third = {
      charges: firewallCharges, pending: playerPendingGarbage,
      garbageRows: arena.slice(-2).map(row => row.filter(value => value === 8).length),
    };
    startScenarioStage(4);
    return {initial, first, second, third, retryCharges: firewallCharges};
  });
  assert.deepEqual(firewall, {
    initial: 2,
    first: {charges: 1, pending: 0, unchanged: true, event: 'FIREWALL BLOCK', timer: 2000, hud: 'YOU INCOMING 00'},
    second: {charges: 0, pending: 0, unchanged: true},
    third: {charges: 0, pending: 0, garbageRows: [11, 11]},
    retryCharges: 2,
  }, 'Firewall must block whole incoming batches and reset from saved stacks on retry');

  const terminalRouting = await page.evaluate(() => {
    scenarioProgress.upgrades.firewall = 0;
    startScenarioStage(4);
    arena[0][0] = 1;
    playerPendingGarbage = 1;
    player.next = createPiece('D');
    playerReset();
    const overflow = {
      title: document.querySelector('#scenario-result-title').textContent,
      events: matchEventLog.filter(event => event.type === 'match-lose').length,
    };
    playerReset();
    overflow.eventsAfterRepeat = matchEventLog.filter(event => event.type === 'match-lose').length;

    startScenarioStage(4);
    arena.forEach(row => row.fill(0));
    player.matrix = createPiece('D');
    player.hold = createPiece('S');
    player.canHold = true;
    player.pos = {x: 4, y: 0};
    for (let y = 0; y < 4; y++) arena[y][5] = 8;
    playerHold();
    const hold = {
      title: document.querySelector('#scenario-result-title').textContent,
      events: matchEventLog.filter(event => event.type === 'match-lose').length,
      scenarioVisible: document.querySelector('#scenario-result-screen').style.display !== 'none',
      gameOverVisible: document.querySelector('#game-over-screen').style.display !== 'none',
    };
    playerHold();
    hold.eventsAfterRepeat = matchEventLog.filter(event => event.type === 'match-lose').length;
    return {overflow, hold};
  });
  assert.deepEqual(terminalRouting, {
    overflow: {title: 'SYSTEM OVERLOAD', events: 1, eventsAfterRepeat: 1},
    hold: {title: 'You Lose!', events: 1, scenarioVisible: true, gameOverVisible: false, eventsAfterRepeat: 1},
  }, 'scenario rival overflow and Hold top-out must fail once through the scenario result');

  assert.equal(pageErrors.length, 0, 'scenario rivals and upgrades must not throw page errors');
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
    await testScenarioMapNavigation(browser, url);
    await testScenarioResponsivePolish(browser, url);
    await testScenarioRewards(browser, url);
    await testScenarioLineStages(browser, url);
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
    await testScenarioRivalsAndUpgrades(browser, url);
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
