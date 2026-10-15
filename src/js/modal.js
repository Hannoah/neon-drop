export function createModalManager({
    modalOverlay,
    gameContainer,
    touchControls,
    getActiveElement = () => (typeof document !== 'undefined' ? document.activeElement : null),
} = {}) {
    let previousFocus = null;

    function openModal(labelId, focusTarget) {
        if (!modalOverlay) return;
        if (modalOverlay.style.display !== 'flex') {
            const active = getActiveElement();
            previousFocus = (typeof HTMLElement !== 'undefined' && active instanceof HTMLElement)
                ? active
                : (active && typeof active.focus === 'function' ? active : null);
        }
        modalOverlay.style.display = 'flex';
        modalOverlay.setAttribute('aria-labelledby', labelId);
        if (gameContainer) gameContainer.inert = true;
        if (touchControls) touchControls.inert = true;
        if (focusTarget && typeof focusTarget.focus === 'function') {
            focusTarget.focus({ preventScroll: true });
        }
    }

    function restorePreviousFocus() {
        const target = previousFocus;
        previousFocus = null;
        if (
            target &&
            typeof target.focus === 'function' &&
            target.isConnected !== false &&
            target.offsetParent !== null
        ) {
            target.focus();
        }
    }

    function closeModal() {
        if (!modalOverlay) return;
        modalOverlay.style.display = 'none';
        if (gameContainer) gameContainer.inert = false;
        if (touchControls) touchControls.inert = false;
        restorePreviousFocus();
    }

    return {
        openModal,
        closeModal,
        restorePreviousFocus,
        get previousFocus() { return previousFocus; },
    };
}

export function trapFocus(container, event) {
    if (event.key !== 'Tab') return;
    const nodes = [...container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )].filter(n => !n.disabled && n.offsetParent !== null);
    if (nodes.length === 0) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    const active = typeof document !== 'undefined' ? document.activeElement : null;
    if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
    } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
    }
}
