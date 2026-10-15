import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createModalManager, trapFocus } from '../../src/js/modal.js';

test('createModalManager manages overlay visibility, inert state, and focus restore', () => {
    let activeElement = {focusCalled: false, focus() { this.focusCalled = true; }, isConnected: true, offsetParent: {}};
    const modalOverlay = {style: {display: 'none'}, attributes: {}, setAttribute(k, v) { this.attributes[k] = v; }};
    const gameContainer = {inert: false};
    const touchControls = {inert: false};
    const focusTarget = {focusCalled: false, focus() { this.focusCalled = true; }};

    const manager = createModalManager({
        modalOverlay,
        gameContainer,
        touchControls,
        getActiveElement: () => activeElement,
    });

    manager.openModal('test-label', focusTarget);

    assert.equal(modalOverlay.style.display, 'flex');
    assert.equal(modalOverlay.attributes['aria-labelledby'], 'test-label');
    assert.equal(gameContainer.inert, true);
    assert.equal(touchControls.inert, true);
    assert.equal(focusTarget.focusCalled, true);
    assert.equal(manager.previousFocus, activeElement);

    manager.closeModal();

    assert.equal(modalOverlay.style.display, 'none');
    assert.equal(gameContainer.inert, false);
    assert.equal(touchControls.inert, false);
    assert.equal(activeElement.focusCalled, true);
    assert.equal(manager.previousFocus, null);
});

test('trapFocus cycles between first and last focusable element on Tab', () => {
    let firstFocused = false;
    let lastFocused = false;
    const btn1 = {disabled: false, offsetParent: {}, focus() { firstFocused = true; }};
    const btn2 = {disabled: false, offsetParent: {}, focus() { lastFocused = true; }};

    const container = {
        querySelectorAll() { return [btn1, btn2]; },
    };

    let prevented = false;
    const shiftTabEvent = {
        key: 'Tab',
        shiftKey: true,
        preventDefault() { prevented = true; },
    };

    globalThis.document = {activeElement: btn1};
    trapFocus(container, shiftTabEvent);
    assert.equal(prevented, true);
    assert.equal(lastFocused, true);

    prevented = false;
    const tabEvent = {
        key: 'Tab',
        shiftKey: false,
        preventDefault() { prevented = true; },
    };
    globalThis.document = {activeElement: btn2};
    trapFocus(container, tabEvent);
    assert.equal(prevented, true);
    assert.equal(firstFocused, true);
});
