import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolveLanguage, getLanguage, setLanguage, t, translations} from '../../src/js/i18n.js';
import {scenarioCopy, applyTranslations, setText, translateEvent} from '../../src/js/ui.js';
import {SCENARIO_STAGES} from '../../src/js/scenario.js';

test('language follows saved choice then the ordered browser preferences', () => {
    assert.equal(resolveLanguage(undefined, ['ko-KR']), 'ko');
    assert.equal(resolveLanguage('en', ['ko-KR']), 'en');
    assert.equal(resolveLanguage('ko', ['en-US']), 'ko');
    assert.equal(resolveLanguage('invalid', ['fr-FR', 'en-GB', 'ko-KR']), 'en');
    assert.equal(resolveLanguage(undefined, ['fr-FR', 'ko-KR', 'en']), 'ko');
    assert.equal(resolveLanguage(undefined, ['fr-FR']), 'en');
});

test('translations interpolate parameters and preserve source fallback', () => {
    assert.equal(getLanguage(), 'en');
    assert.equal(t('LEVEL {level}', {level: 3}, 'ko'), '레벨 3');
    assert.equal(t('Unknown {value}', {value: 0}, 'ko'), 'Unknown 0');
    assert.equal(t('Unknown {missing}', {}, 'ko'), 'Unknown {missing}');
    setLanguage('ko');
    assert.equal(t('Settings'), '설정');
    setLanguage('invalid');
    assert.equal(getLanguage(), 'en');
});

test('all Korean translations preserve the source placeholders', () => {
    const placeholders = value => [...new Set(value.match(/\{\w+\}/g) || [])].sort();
    for (const [source, translated] of Object.entries(translations.ko)) {
        assert.deepEqual(placeholders(translated), placeholders(source), source);
    }
});

test('campaign copy renders translated names, objectives and modifiers', () => {
    setLanguage('ko');
    const copy = scenarioCopy(SCENARIO_STAGES[1]);
    assert.equal(copy.name, '속도의 관문');
    assert.equal(copy.objective, '제한 시간 안에 15줄을 지우세요.');
    assert.equal(copy.modifier, '빠른 낙하 속도 · 제한 시간 02:30.');
    assert.equal(scenarioCopy(SCENARIO_STAGES[3]).modifier, '블록을 고정할 때마다 상대가 1회 행동합니다.');
    setLanguage('en');
    assert.equal(scenarioCopy(SCENARIO_STAGES[3]).modifier, 'One opponent turn per lock.');
});

test('setText remembers parameters so static translation refreshes dynamic text', () => {
    setLanguage('en');
    const element = {dataset: {}, textContent: '', setAttribute(name, value) { this[name] = value; }};
    setText(element, 'LEVEL {level}', {level: 3});
    assert.equal(element.textContent, 'LEVEL 3');
    setLanguage('ko');
    const root = {querySelectorAll(selector) { return selector === '[data-i18n]' ? [element] : []; }};
    applyTranslations(root);
    assert.equal(element.textContent, '레벨 3');
    setLanguage('en');
});

test('event messages translate fragments while retaining counters and proper names', () => {
    setLanguage('ko');
    assert.equal(translateEvent('TETRIS · B2B x2 · COMBO x3'), '테트리스 · 백투백 x2 · 콤보 x3');
    assert.equal(translateEvent('INTERFERENCE +2 · LEVEL 4'), '방해 줄 +2 · 레벨 4');
    assert.equal(translateEvent('BYTE'), 'BYTE');
    setLanguage('en');
});

test('all explicit HTML and JavaScript translation keys have Korean entries', async () => {
    const html = await readFile(new URL('../../index.html', import.meta.url), 'utf8');
    for (const [, key] of html.matchAll(/data-i18n(?:-aria-label|-placeholder)?="([^"]+)"/g)) {
        assert.ok(Object.hasOwn(translations.ko, key), key);
    }
    for (const file of ['tetris.js', 'src/js/ui.js', 'src/js/juice.js', 'src/js/leaderboard.js']) {
        const source = await readFile(new URL(`../../${file}`, import.meta.url), 'utf8');
        for (const [, literal] of source.matchAll(/\bt\('([^']+)'/g)) {
            const key = literal.replaceAll('\\n', '\n');
            assert.ok(Object.hasOwn(translations.ko, key), `${file}: ${key}`);
        }
    }
});
